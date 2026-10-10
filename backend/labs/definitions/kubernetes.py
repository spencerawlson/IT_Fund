"""Kubernetes fundamentals interactive lab. Data only; nothing here executes.

Deploy, expose, scale and configure a workload on a simulated 3-node cluster, then diagnose and
fix a CrashLoopBackOff pod and clean up. Drives the `kubectl` shell. Everything is simulated —
no real cluster exists.
"""
from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget

# Importing registers the k8s_* validators via the @validator decorator.
import labs.validators_k8s  # noqa: F401

K8S_FUNDAMENTALS_LAB = LabDefinition(
    id="k8s-fundamentals-001",
    slug="kubernetes-fundamentals",
    title="Kubernetes Fundamentals: Deploy, Expose, Scale, Troubleshoot",
    description=(
        "Get hands-on with Kubernetes on a simulated 3-node cluster: survey the control plane and "
        "nodes, deploy the notes app, expose it with a Service, scale it to 3 replicas, wire in a "
        "ConfigMap and a Secret, then play on-call engineer — diagnose a CrashLoopBackOff pod, fix "
        "it with the Secret you created, and clean up. All kubectl, all simulated, nothing to install."
    ),
    category="devops",
    difficulty="intermediate",
    estimated_minutes=50,
    shell="kubectl",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/k8s-lab:latest",
        # Kept for uniformity with the other mock labs; used only by a real provider.
        workdir="/home/student",
        idle_timeout_minutes=25,
        max_runtime_minutes=75,
        deny_internet_egress=True,
    ),
    targets=[
        LabTarget(hostname="control-plane-1", role="Kubernetes control plane"),
        LabTarget(hostname="worker-1", role="Kubernetes worker node"),
        LabTarget(hostname="worker-2", role="Kubernetes worker node"),
    ],
    objectives=[
        LabObjective(
            id="survey-cluster",
            label="Survey the cluster",
            validator="k8s_cluster_explored",
            description="Confirm the control plane is reachable and list the cluster's nodes.",
            hints=[
                "kubectl cluster-info — shows the control-plane endpoint.",
                "kubectl get nodes — 3 nodes should be Ready: 1 control-plane, 2 workers.",
            ],
        ),
        LabObjective(
            id="deploy-app",
            label="Deploy the notes app",
            validator="k8s_deployment_created",
            description="Create a Deployment running the notes-app container image.",
            hints=[
                "kubectl create deployment notes-app --image=notes-app:v1.0",
                "or: kubectl apply -f notes-app.yaml — then check with kubectl get deployments.",
            ],
        ),
        LabObjective(
            id="expose-service",
            label="Expose the app with a Service",
            validator="k8s_service_exposed",
            description="Create a Service so the deployment's pods get a stable endpoint.",
            hints=[
                "kubectl expose deployment notes-app --port=80 --type=NodePort",
                "kubectl get services — the NodePort is reachable on every node.",
            ],
        ),
        LabObjective(
            id="scale-app",
            label="Scale the app to 3 replicas",
            validator="k8s_deployment_scaled",
            description="Grow the deployment so 3 pods are running for availability.",
            hints=[
                "kubectl scale deployment notes-app --replicas=3",
                "kubectl get pods — three notes-app pods should be Running.",
            ],
        ),
        LabObjective(
            id="wire-config",
            label="Wire configuration: ConfigMap + Secret",
            validator="k8s_config_wired",
            description="Apply the manifest that provides non-secret config and a secret the app needs.",
            hints=[
                "kubectl apply -f app-config.yaml — creates the app-config ConfigMap and the app-secret Secret.",
                "Verify with kubectl get configmaps and kubectl get secrets. Never put credentials in plain text — that's what Secrets are for.",
            ],
        ),
        LabObjective(
            id="diagnose-crashloop",
            label="Diagnose the CrashLoopBackOff pod",
            validator="k8s_crashloop_diagnosed",
            description="One pod keeps crashing. Find the root cause from its events and logs.",
            hints=[
                "kubectl get pods — find the pod that is not Running.",
                "kubectl describe pod payment-api-broken-7f8c9d2e1f-xyz99 — the Events tell you the container restarts; check Environment.",
                "kubectl logs payment-api-broken-7f8c9d2e1f-xyz99 — the FATAL line names the missing piece.",
            ],
        ),
        LabObjective(
            id="fix-crashloop",
            label="Fix the crashing pod",
            validator="k8s_crashloop_fixed",
            description="The pod dies because DATABASE_URL is unset. Redeploy it with the value coming from your Secret.",
            hints=[
                "kubectl apply -f payment-api-fixed.yaml — mounts DATABASE_URL from the app-secret Secret via envFrom.",
                "kubectl get pods — the payment-api pod should be Running now.",
            ],
        ),
        LabObjective(
            id="cleanup",
            label="Clean up your resources",
            validator="k8s_cleanup_done",
            description="Delete the notes-app deployment and service you created.",
            hints=[
                "kubectl delete deployment notes-app",
                "kubectl delete service notes-app",
            ],
        ),
    ],
)
