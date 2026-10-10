"""Outcome-based validators for the Kubernetes fundamentals lab.

Each validator inspects the recorded lab STATE (`findings`), not which commands were typed,
so a student can reach an objective by any valid route (e.g. `kubectl create deployment`
or `kubectl apply -f notes-app.yaml` both satisfy the deploy objective).
"""
from __future__ import annotations

from typing import Any

from labs.validators import validator


@validator("k8s_cluster_explored")
def k8s_cluster_explored(args, findings):
    if findings.get("cluster_info_viewed") and findings.get("nodes_listed"):
        return True, "You surveyed the cluster control plane and its 3 nodes.", None
    return False, "Survey the cluster first: kubectl cluster-info and kubectl get nodes.", None


@validator("k8s_deployment_created")
def k8s_deployment_created(args, findings):
    dep = findings.get("deployment_created")
    if dep:
        return True, f"Deployment {dep.get('name')} is running.", {"deployment": dep}
    return False, "No deployment has been created yet.", None


@validator("k8s_service_exposed")
def k8s_service_exposed(args, findings):
    svc = findings.get("service_exposed")
    if svc:
        detail = f"{svc.get('type')} on port {svc.get('port')}"
        if svc.get("node_port"):
            detail += f" (NodePort {svc['node_port']})"
        return True, f"Service {svc.get('name')} exposes the app: {detail}.", {"service": svc}
    return False, "The deployment is not exposed by a Service yet.", None


@validator("k8s_deployment_scaled")
def k8s_deployment_scaled(args, findings):
    scaled = findings.get("deployment_scaled") or {}
    n = int(scaled.get("replicas") or 0)
    if n >= 3:
        return True, f"Deployment {scaled.get('name')} is running {n} replicas.", {"replicas": n}
    if n:
        return False, f"Only {n} replica(s) running — scale to at least 3.", None
    return False, "The deployment has not been scaled yet.", None


@validator("k8s_config_wired")
def k8s_config_wired(args, findings):
    cm = findings.get("configmap_created")
    secret = findings.get("secret_created")
    if cm and secret:
        return True, f"ConfigMap {cm.get('name')} and Secret {secret.get('name')} are in place.", None
    missing = [m for m, v in (("ConfigMap", cm), ("Secret", secret)) if not v]
    return False, f"Still missing: {', '.join(missing)}. (kubectl apply -f app-config.yaml)", None


@validator("k8s_crashloop_diagnosed")
def k8s_crashloop_diagnosed(args, findings):
    if findings.get("crashloop_described") and findings.get("crashloop_logs_viewed"):
        return True, ("Root cause found: the payment-api container exits because DATABASE_URL "
                      "is not set. The image pulled fine — this is a config problem, not an image problem."), None
    todo = []
    if not findings.get("crashloop_described"):
        todo.append("kubectl describe pod <name>")
    if not findings.get("crashloop_logs_viewed"):
        todo.append("kubectl logs <name>")
    return False, f"Diagnose the crashing pod with: {' and '.join(todo)}.", None


@validator("k8s_crashloop_fixed")
def k8s_crashloop_fixed(args, findings):
    if findings.get("payment_api_fixed"):
        return True, "The payment-api pod is Running: DATABASE_URL now comes from the app-secret Secret.", None
    return False, ("The pod is still crashing. It needs DATABASE_URL from a Secret — "
                   "try kubectl apply -f payment-api-fixed.yaml."), None


@validator("k8s_cleanup_done")
def k8s_cleanup_done(args, findings):
    deps = findings.get("deployment_deleted") or []
    svcs = findings.get("service_deleted") or []
    if "notes-app" in deps and "notes-app" in svcs:
        return True, "Your deployment and service are cleaned up.", None
    missing = [m for m, v in (("deployment notes-app", "notes-app" in deps),
                              ("service notes-app", "notes-app" in svcs)) if not v]
    return False, f"Still to delete: {', '.join(missing)}.", None
