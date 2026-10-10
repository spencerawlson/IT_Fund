"""Tests for the Kubernetes fundamentals lab: kubectl shell, validators and definition."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.definitions.kubernetes import K8S_FUNDAMENTALS_LAB as LAB
from labs.shells import kubectl
from labs.validators import VALIDATORS
import labs.validators_k8s  # noqa: F401  (registers k8s_* validators)

BROKEN_POD = "payment-api-broken-7f8c9d2e1f-xyz99"
V = VALIDATORS


def run(cmd, findings=None):
    return kubectl.run(LAB, cmd, dict(findings or {}))


# ---- shell interface ----

def test_prompt_and_banner():
    assert kubectl.initial_prompt(LAB).strip()
    banner = kubectl.banner(LAB)
    assert isinstance(banner, list) and len(banner) >= 2
    assert any("kubectl" in line for line in banner)


def test_help_lists_commands():
    r = run("help")
    assert "kubectl get" in r.output and "kubectl apply" in r.output


def test_unknown_command_rejected():
    r = run("rm -rf /")
    assert r.exit_code == 127 and r.findings == {}


def test_unknown_kubectl_subcommand():
    r = run("kubectl frobnicate")
    assert r.exit_code == 1


def test_clear_wipes_screen():
    r = run("clear")
    assert r.clear is True


# ---- cluster exploration ----

def test_cluster_info():
    r = run("kubectl cluster-info")
    assert "control plane is running" in r.output
    assert r.findings.get("cluster_info_viewed") is True


def test_get_nodes():
    r = run("kubectl get nodes")
    for node in ("control-plane-1", "worker-1", "worker-2"):
        assert node in r.output
    assert r.output.count("Ready") == 3
    assert r.findings.get("nodes_listed") is True


def test_get_nodes_wide():
    r = run("kubectl get nodes -o wide")
    assert "INTERNAL-IP" in r.output and "192.168.50.10" in r.output


def test_get_namespaces():
    r = run("kubectl get namespaces")
    assert "default" in r.output and "kube-system" in r.output


def test_config_get_contexts():
    r = run("kubectl config get-contexts")
    assert "lab-cluster" in r.output and "*" in r.output


def test_get_pods_shows_seeded_and_broken():
    r = run("kubectl get pods")
    assert "web-frontend" in r.output and "Running" in r.output
    assert BROKEN_POD in r.output and "CrashLoopBackOff" in r.output
    assert r.findings.get("pods_listed") is True


def test_get_pods_wide_shows_ip_and_node():
    r = run("kubectl get pods -o wide")
    assert "NODE" in r.output and "worker-1" in r.output and "10.244" in r.output


def test_get_pods_all_namespaces():
    r = run("kubectl get pods -A")
    assert "kube-system" in r.output and "coredns" in r.output and "etcd-control-plane-1" in r.output


def test_get_pod_not_found():
    r = run("kubectl get pod nope-123")
    assert r.exit_code == 1 and "NotFound" in r.output


def test_resource_aliases():
    for alias in ("po", "deploy", "svc", "no", "ns", "cm"):
        r = run(f"kubectl get {alias}")
        assert r.exit_code == 0, alias


# ---- deploy / expose / scale ----

def test_create_deployment():
    r = run("kubectl create deployment notes-app --image=notes-app:v1.0")
    assert "created" in r.output
    dep = r.findings.get("deployment_created")
    assert dep and dep["name"] == "notes-app" and dep["image"] == "notes-app:v1.0"


def test_create_deployment_requires_image():
    r = run("kubectl create deployment notes-app")
    assert r.exit_code == 1


def test_create_deployment_duplicate_rejected():
    f = run("kubectl create deployment notes-app --image=notes-app:v1.0").findings
    r = run("kubectl create deployment notes-app --image=notes-app:v1.0", f)
    assert r.exit_code == 1 and "AlreadyExists" in r.output


def test_get_deployments_reflects_state():
    f = run("kubectl create deployment notes-app --image=notes-app:v1.0").findings
    r = run("kubectl get deployments", f)
    assert "notes-app" in r.output and "web-frontend" in r.output


def test_apply_deployment_manifest():
    r = run("kubectl apply -f notes-app.yaml")
    assert "created" in r.output
    assert r.findings.get("deployment_created", {}).get("name") == "notes-app"


def test_apply_unknown_file():
    r = run("kubectl apply -f nope.yaml")
    assert r.exit_code == 1 and "no such file" in r.output


def test_expose_deployment_nodeport():
    f = run("kubectl create deployment notes-app --image=notes-app:v1.0").findings
    r = run("kubectl expose deployment notes-app --port=80 --type=NodePort", f)
    assert "exposed" in r.output
    svc = r.findings.get("service_exposed")
    assert svc and svc["name"] == "notes-app" and svc["type"] == "NodePort"
    assert 30000 <= svc["node_port"] <= 32767


def test_expose_requires_existing_deployment():
    r = run("kubectl expose deployment ghost --port=80")
    assert r.exit_code == 1 and "NotFound" in r.output


def test_get_services_reflects_state():
    f = run("kubectl create deployment notes-app --image=notes-app:v1.0").findings
    f = run("kubectl expose deployment notes-app --port=80 --type=NodePort", f).findings
    r = run("kubectl get services", f)
    assert "notes-app" in r.output and "NodePort" in r.output and "kubernetes" in r.output


def test_scale_deployment():
    f = run("kubectl create deployment notes-app --image=notes-app:v1.0").findings
    r = run("kubectl scale deployment notes-app --replicas=3", f)
    assert "scaled" in r.output
    assert r.findings.get("deployment_scaled") == {"name": "notes-app", "replicas": 3}


def test_scale_unknown_deployment():
    r = run("kubectl scale deployment ghost --replicas=3")
    assert r.exit_code == 1 and "NotFound" in r.output


def test_scaled_pods_appear():
    f = run("kubectl create deployment notes-app --image=notes-app:v1.0").findings
    f = run("kubectl scale deployment notes-app --replicas=3", f).findings
    r = run("kubectl get pods", f)
    assert r.output.count("notes-app-") == 3


def test_deterministic_output():
    a = run("kubectl get pods")
    b = run("kubectl get pods")
    assert a.output == b.output
    f = run("kubectl create deployment notes-app --image=notes-app:v1.0").findings
    c = run("kubectl get pods", f)
    d = run("kubectl get pods", f)
    assert c.output == d.output


# ---- config: configmaps and secrets ----

def test_apply_config_manifest():
    r = run("kubectl apply -f app-config.yaml")
    assert "configmap/app-config created" in r.output
    assert "secret/app-secret created" in r.output
    assert r.findings.get("configmap_created", {}).get("name") == "app-config"
    assert r.findings.get("secret_created", {}).get("name") == "app-secret"


def test_get_configmaps_and_secrets():
    f = run("kubectl apply -f app-config.yaml").findings
    assert "app-config" in run("kubectl get configmaps", f).output
    assert "app-secret" in run("kubectl get secrets", f).output
    # secret values must not leak into the listing
    assert "cG9zdGdyZXM" not in run("kubectl get secrets", f).output


def test_create_configmap_and_secret_directly():
    f = run("kubectl create configmap my-cm --from-literal=k=v").findings
    assert f.get("configmap_created", {}).get("name") == "my-cm"
    f2 = run("kubectl create secret generic my-sec --from-literal=k=v", f).findings
    assert f2.get("secret_created", {}).get("name") == "my-sec"
    assert "my-cm" in run("kubectl get cm", f2).output


# ---- troubleshooting: describe / logs / exec ----

def test_describe_broken_pod():
    r = run(f"kubectl describe pod {BROKEN_POD}")
    assert "CrashLoopBackOff" in r.output
    assert "DATABASE_URL" in r.output and "<not set>" in r.output
    assert "Back-off restarting failed container" in r.output
    assert r.findings.get("crashloop_described") is True


def test_describe_pod_prefix_match():
    r = run("kubectl describe pod payment-api-broken")
    assert "CrashLoopBackOff" in r.output


def test_describe_healthy_pod():
    r = run("kubectl describe pod web-frontend-6d7b9f8c4d-abc12")
    assert "Running" in r.output
    assert r.findings.get("crashloop_described") is not True


def test_logs_broken_pod_reveals_cause():
    r = run(f"kubectl logs {BROKEN_POD}")
    assert "FATAL" in r.output and "DATABASE_URL" in r.output
    assert r.findings.get("crashloop_logs_viewed") is True


def test_logs_healthy_pod():
    r = run("kubectl logs web-frontend-6d7b9f8c4d-abc12")
    assert r.exit_code == 0 and r.findings.get("crashloop_logs_viewed") is not True


def test_exec_in_pod():
    f = run("kubectl create deployment notes-app --image=notes-app:v1.0").findings
    f = run("kubectl scale deployment notes-app --replicas=1", f).findings
    pods = run("kubectl get pods", f).output
    pod = [line.split()[0] for line in pods.splitlines() if line.startswith("notes-app-")][0]
    r = run(f"kubectl exec -it {pod} -- env", f)
    assert "KUBERNETES_SERVICE_HOST" in r.output
    r2 = run(f"kubectl exec -it {pod} -- curl -s localhost:80", f)
    assert '"status":"ok"' in r2.output


# ---- fix the crashloop ----

def test_fix_crashloop():
    f = run("kubectl apply -f app-config.yaml").findings
    r = run("kubectl apply -f payment-api-fixed.yaml", f)
    assert "created" in r.output
    assert r.findings.get("payment_api_fixed") is True
    r2 = run("kubectl get pods", r.findings)
    line = [ln for ln in r2.output.splitlines() if BROKEN_POD in ln][0]
    assert "Running" in line and "CrashLoopBackOff" not in line


# ---- cleanup ----

def test_delete_deployment_and_service():
    f = run("kubectl create deployment notes-app --image=notes-app:v1.0").findings
    f = run("kubectl expose deployment notes-app --port=80", f).findings
    r = run("kubectl delete deployment notes-app", f)
    assert "deleted" in r.output
    assert "notes-app" in (r.findings.get("deployment_deleted") or [])
    r2 = run("kubectl delete service notes-app", r.findings)
    assert "deleted" in r2.output
    assert "notes-app" in (r2.findings.get("service_deleted") or [])
    # and they are gone from listings
    assert "notes-app" not in run("kubectl get deployments", r2.findings).output
    assert "notes-app" not in run("kubectl get services", r2.findings).output


def test_delete_unknown():
    r = run("kubectl delete deployment ghost")
    assert r.exit_code == 1 and "NotFound" in r.output


def test_cannot_delete_kubernetes_service():
    r = run("kubectl delete service kubernetes")
    assert r.exit_code == 1


# ---- validators ----

def test_validators_fail_on_empty_findings():
    for name in ("k8s_cluster_explored", "k8s_deployment_created", "k8s_service_exposed",
                 "k8s_deployment_scaled", "k8s_config_wired", "k8s_crashloop_diagnosed",
                 "k8s_crashloop_fixed", "k8s_cleanup_done"):
        passed, msg, _ = V[name]({}, {})
        assert passed is False, name


def test_validators_pass_on_correct_findings():
    cases = [
        ("k8s_cluster_explored", {"cluster_info_viewed": True, "nodes_listed": True}),
        ("k8s_deployment_created", {"deployment_created": {"name": "notes-app"}}),
        ("k8s_service_exposed", {"service_exposed": {"name": "notes-app", "type": "NodePort"}}),
        ("k8s_deployment_scaled", {"deployment_scaled": {"name": "notes-app", "replicas": 3}}),
        ("k8s_config_wired", {"configmap_created": {"name": "app-config"},
                              "secret_created": {"name": "app-secret"}}),
        ("k8s_crashloop_diagnosed", {"crashloop_described": True, "crashloop_logs_viewed": True}),
        ("k8s_crashloop_fixed", {"payment_api_fixed": True}),
        ("k8s_cleanup_done", {"deployment_deleted": ["notes-app"],
                              "service_deleted": ["notes-app"]}),
    ]
    for name, findings in cases:
        passed, msg, _ = V[name]({}, findings)
        assert passed is True, f"{name}: {msg}"


def test_scale_validator_rejects_fewer_replicas():
    passed, msg, _ = V["k8s_deployment_scaled"]({}, {"deployment_scaled": {"name": "notes-app", "replicas": 2}})
    assert passed is False


def test_diagnosis_validator_needs_both_steps():
    passed, _, _ = V["k8s_crashloop_diagnosed"]({}, {"crashloop_described": True})
    assert passed is False


# ---- lab definition ----

def test_lab_definition_loads():
    assert LAB.id == "k8s-fundamentals-001"
    assert LAB.slug == "kubernetes-fundamentals"
    assert LAB.category == "devops"
    assert LAB.difficulty == "intermediate"
    assert LAB.estimated_minutes == 50
    assert LAB.shell == "kubectl"
    assert len(LAB.objectives) == 8
    assert {t.hostname for t in LAB.targets} == {"control-plane-1", "worker-1", "worker-2"}
    for obj in LAB.objectives:
        assert obj.validator in VALIDATORS, f"unknown validator: {obj.validator}"
        assert obj.hints, f"no hints for {obj.id}"


def test_full_lab_walkthrough_passes_all_objectives():
    f: dict = {}
    f.update(run("kubectl cluster-info", f).findings)
    f.update(run("kubectl get nodes", f).findings)
    f.update(run("kubectl create deployment notes-app --image=notes-app:v1.0", f).findings)
    f.update(run("kubectl expose deployment notes-app --port=80 --type=NodePort", f).findings)
    f.update(run("kubectl scale deployment notes-app --replicas=3", f).findings)
    f.update(run("kubectl apply -f app-config.yaml", f).findings)
    f.update(run(f"kubectl describe pod {BROKEN_POD}", f).findings)
    f.update(run(f"kubectl logs {BROKEN_POD}", f).findings)
    f.update(run("kubectl apply -f payment-api-fixed.yaml", f).findings)
    f.update(run("kubectl delete deployment notes-app", f).findings)
    f.update(run("kubectl delete service notes-app", f).findings)
    for obj in LAB.objectives:
        passed, msg, _ = VALIDATORS[obj.validator]({}, f)
        assert passed is True, f"{obj.id} ({obj.validator}): {msg}"
