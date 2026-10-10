"""A simulated kubectl shell for the Kubernetes fundamentals lab.

Models a small deterministic cluster: 1 control-plane + 2 worker nodes, the `default` and
`kube-system` namespaces, a healthy `web-frontend` Deployment and one deliberately broken pod
(`payment-api-broken-...`) stuck in CrashLoopBackOff because it is missing DATABASE_URL.

State is derived from the session `findings` (deployments created, services exposed, scale
operations, config applied, fixes, deletions), so `get`/`describe`/`logs` always reflect what
the student has done. Nothing is executed and no cluster exists — every output is canned.
"""
from __future__ import annotations

import hashlib
from typing import Any

from labs.providers.base import CommandResult

# --------------------------------------------------------------------------
# Pre-seeded cluster
# --------------------------------------------------------------------------

NODES = [
    {"name": "control-plane-1", "status": "Ready", "roles": "control-plane", "age": "42d",
     "version": "v1.29.2", "internal_ip": "192.168.50.10", "external_ip": "<none>",
     "os_image": "Ubuntu 22.04.3 LTS", "kernel": "5.15.0-91-generic", "runtime": "containerd://1.7.11"},
    {"name": "worker-1", "status": "Ready", "roles": "<none>", "age": "42d",
     "version": "v1.29.2", "internal_ip": "192.168.50.11", "external_ip": "<none>",
     "os_image": "Ubuntu 22.04.3 LTS", "kernel": "5.15.0-91-generic", "runtime": "containerd://1.7.11"},
    {"name": "worker-2", "status": "Ready", "roles": "<none>", "age": "42d",
     "version": "v1.29.2", "internal_ip": "192.168.50.12", "external_ip": "<none>",
     "os_image": "Ubuntu 22.04.3 LTS", "kernel": "5.15.0-91-generic", "runtime": "containerd://1.7.11"},
]

NAMESPACES = [
    {"name": "default", "status": "Active", "age": "42d"},
    {"name": "kube-system", "status": "Active", "age": "42d"},
    {"name": "kube-node-lease", "status": "Active", "age": "42d"},
    {"name": "kube-public", "status": "Active", "age": "42d"},
]

# System pods shown with `kubectl get pods -A` / `-n kube-system`.
KUBE_SYSTEM_PODS = [
    ("coredns-7f9c8b4d9f-abc12", "1/1", "Running", "0", "42d", "worker-1", "10.244.1.2"),
    ("coredns-7f9c8b4d9f-def34", "1/1", "Running", "0", "42d", "worker-2", "10.244.2.2"),
    ("etcd-control-plane-1", "1/1", "Running", "0", "42d", "control-plane-1", "192.168.50.10"),
    ("kube-apiserver-control-plane-1", "1/1", "Running", "0", "42d", "control-plane-1", "192.168.50.10"),
    ("kube-controller-manager-control-plane-1", "1/1", "Running", "0", "42d", "control-plane-1", "192.168.50.10"),
    ("kube-proxy-9k2lm", "1/1", "Running", "0", "42d", "worker-1", "192.168.50.11"),
    ("kube-proxy-q8xwz", "1/1", "Running", "0", "42d", "worker-2", "192.168.50.12"),
    ("kube-scheduler-control-plane-1", "1/1", "Running", "0", "42d", "control-plane-1", "192.168.50.10"),
]

# Pre-seeded healthy deployment in `default`.
SEEDED_DEPLOYMENTS = [
    {"name": "web-frontend", "image": "nginx:1.25", "replicas": 2, "age": "3d2h",
     "pods": [
         ("web-frontend-6d7b9f8c4d-abc12", "1/1", "Running", "0", "3d2h", "worker-1", "10.244.1.10"),
         ("web-frontend-6d7b9f8c4d-def34", "1/1", "Running", "0", "3d2h", "worker-2", "10.244.2.10"),
     ]},
]

# The deliberately broken pod: image pulls fine, the container exits because DATABASE_URL is unset.
BROKEN_POD_NAME = "payment-api-broken-7f8c9d2e1f-xyz99"
BROKEN_POD_LABELS = {"app": "payment-api"}
BROKEN_POD_IMAGE = "payment-api:v2.4.0"

# Workspace manifests the student can `cat` / `kubectl apply -f`.
NOTES_APP_YAML = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: notes-app
  labels:
    app: notes-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: notes-app
  template:
    metadata:
      labels:
        app: notes-app
    spec:
      containers:
      - name: notes-app
        image: notes-app:v1.0
        ports:
        - containerPort: 80
"""

APP_CONFIG_YAML = """apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: info
  FEATURE_FLAGS: "dark-mode,metrics"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
data:
  # base64: postgres://app:secret@db:5432/notes
  DATABASE_URL: cG9zdGdyZXM6Ly9hcHA6c2VjcmV0QGRiOjU0MzIvbm90ZXM=
  API_KEY: c2stbGl2ZS1mYWtlLWtleQ==
"""

PAYMENT_API_FIXED_YAML = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
  labels:
    app: payment-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: payment-api
  template:
    metadata:
      labels:
        app: payment-api
    spec:
      containers:
      - name: payment-api
        image: payment-api:v2.4.0
        ports:
        - containerPort: 8080
        envFrom:
        - secretRef:
            name: app-secret
        # The broken pod was missing DATABASE_URL; mounting the Secret fixes it.
"""

FILES = {
    "notes-app.yaml": NOTES_APP_YAML,
    "app-config.yaml": APP_CONFIG_YAML,
    "payment-api-fixed.yaml": PAYMENT_API_FIXED_YAML,
}

_RESOURCE_ALIASES = {
    "pods": "pods", "pod": "pods", "po": "pods",
    "deployments": "deployments", "deployment": "deployments", "deploy": "deployments",
    "services": "services", "service": "services", "svc": "services",
    "nodes": "nodes", "node": "nodes", "no": "nodes",
    "namespaces": "namespaces", "namespace": "namespaces", "ns": "namespaces",
    "configmaps": "configmaps", "configmap": "configmaps", "cm": "configmaps",
    "secrets": "secrets", "secret": "secrets",
}


# --------------------------------------------------------------------------
# Deterministic helpers
# --------------------------------------------------------------------------

def _digest(text: str, n: int) -> str:
    return hashlib.md5(text.encode()).hexdigest()[:n]


def _rs_hash(deploy_name: str) -> str:
    return _digest("rs:" + deploy_name, 10)


def _pod_hash(deploy_name: str, index: int) -> str:
    return _digest(f"pod:{deploy_name}:{index}", 5)


def _node_port(svc_name: str) -> int:
    return 30000 + int(_digest("np:" + svc_name, 4), 16) % 2768


def _cluster_ip(svc_name: str) -> str:
    d = _digest("cip:" + svc_name, 4)
    return f"10.96.{int(d[:2], 16) % 250 + 2}.{int(d[2:], 16) % 250 + 2}"


def _pod_ip(index: int) -> str:
    return f"10.244.{1 + index % 2}.{10 + index // 2}"


def _pod_node(index: int) -> str:
    return "worker-1" if index % 2 == 0 else "worker-2"


# --------------------------------------------------------------------------
# State derived from findings
# --------------------------------------------------------------------------

def _deployments(findings: dict[str, Any]) -> list[dict[str, Any]]:
    """Seeded + student-created deployments, minus deleted ones."""
    result: list[dict[str, Any]] = []
    deleted = set(findings.get("deployment_deleted") or [])
    for d in SEEDED_DEPLOYMENTS:
        if d["name"] not in deleted:
            result.append(dict(d))
    for name, info in (findings.get("k8s_deployments") or {}).items():
        if name in deleted:
            continue
        replicas = int(info.get("replicas", 1))
        pods = [
            (f"{name}-{_rs_hash(name)}-{_pod_hash(name, i)}", f"{replicas}/{replicas}",
             "Running", "0", "5m", _pod_node(i), _pod_ip(i))
            for i in range(replicas)
        ]
        result.append({"name": name, "image": info.get("image", ""), "replicas": replicas,
                       "age": "5m", "pods": pods})
    return result


def _services(findings: dict[str, Any]) -> list[dict[str, Any]]:
    result = [{"name": "kubernetes", "type": "ClusterIP", "cluster_ip": "10.96.0.1",
               "external_ip": "<none>", "ports": "443/TCP", "age": "42d"}]
    deleted = set(findings.get("service_deleted") or [])
    for name, info in (findings.get("k8s_services") or {}).items():
        if name in deleted:
            continue
        result.append({
            "name": name,
            "type": info.get("type", "ClusterIP"),
            "cluster_ip": info.get("cluster_ip", _cluster_ip(name)),
            "external_ip": "<none>",
            "ports": info.get("ports", ""),
            "age": "2m",
        })
    return result


def _configmaps(findings: dict[str, Any]) -> list[str]:
    return list((findings.get("k8s_configmaps") or {}).keys())


def _secrets(findings: dict[str, Any]) -> list[str]:
    return list((findings.get("k8s_secrets") or {}).keys())


def _default_pods(findings: dict[str, Any]) -> list[tuple]:
    """All pods in the default namespace: seeded + deployment pods + the broken pod."""
    pods: list[tuple] = []
    deleted_pods = set(findings.get("pod_deleted") or [])
    for d in _deployments(findings):
        pods.extend(d["pods"])
    fixed = bool(findings.get("payment_api_fixed"))
    if BROKEN_POD_NAME not in deleted_pods:
        if fixed:
            pods.append((BROKEN_POD_NAME, "1/1", "Running", "0", "26m", "worker-1", "10.244.1.23"))
        else:
            pods.append((BROKEN_POD_NAME, "0/1", "CrashLoopBackOff", "14", "26m", "worker-1", "10.244.1.23"))
    return [p for p in pods if p[0] not in deleted_pods]


def _find_pod(name: str, findings: dict[str, Any]) -> tuple | None:
    """Exact match, then unique-prefix match (like a forgiving tab-complete)."""
    all_pods = _default_pods(findings) + KUBE_SYSTEM_PODS
    for p in all_pods:
        if p[0] == name:
            return p
    matches = [p for p in all_pods if p[0].startswith(name)]
    return matches[0] if len(matches) == 1 else None


# --------------------------------------------------------------------------
# Shell interface
# --------------------------------------------------------------------------

def initial_prompt(lab) -> str:
    return "student@k8s:~$ "


def banner(lab) -> list[str]:
    return [
        "Road to CISSP - simulated Kubernetes cluster   (safe: no real cluster exists)",
        "3 nodes, namespaces default + kube-system. One pod is CrashLoopBackOff - find out why.",
        "Try: kubectl cluster-info · kubectl get nodes · kubectl get pods · kubectl get deployments",
    ]


# --------------------------------------------------------------------------
# `kubectl get`
# --------------------------------------------------------------------------

def _get_table(resource: str, findings: dict[str, Any], wide: bool, all_ns: bool) -> str:
    if resource == "nodes":
        if wide:
            head = "NAME              STATUS   ROLES           AGE   VERSION   INTERNAL-IP     EXTERNAL-IP   OS-IMAGE             KERNEL            CONTAINER-RUNTIME"
            rows = [f"{n['name']:<17} {n['status']:<8} {n['roles']:<15} {n['age']:<5} {n['version']:<9} "
                    f"{n['internal_ip']:<15} {n['external_ip']:<13} {n['os_image']:<20} {n['kernel']:<17} {n['runtime']}"
                    for n in NODES]
        else:
            head = "NAME              STATUS   ROLES           AGE   VERSION"
            rows = [f"{n['name']:<17} {n['status']:<8} {n['roles']:<15} {n['age']:<5} {n['version']}"
                    for n in NODES]
        return head + "\n" + "\n".join(rows)

    if resource == "namespaces":
        head = "NAME              STATUS   AGE"
        rows = [f"{n['name']:<17} {n['status']:<8} {n['age']}" for n in NAMESPACES]
        return head + "\n" + "\n".join(rows)

    if resource == "pods":
        lines: list[str] = []
        if all_ns:
            head = ("NAMESPACE     NAME                                         READY   STATUS             "
                    "RESTARTS   AGE" + ("   IP            NODE" if wide else ""))
            lines.append(head)
            for p in KUBE_SYSTEM_PODS:
                lines.append(_pod_row("kube-system", p, wide))
            for p in _default_pods(findings):
                lines.append(_pod_row("default", p, wide))
            return "\n".join(lines)
        head = ("NAME                                         READY   STATUS             RESTARTS   AGE"
                + ("   IP            NODE" if wide else ""))
        rows = [_pod_row(None, p, wide) for p in _default_pods(findings)]
        return head + "\n" + "\n".join(rows)

    if resource == "deployments":
        head = "NAME           READY   UP-TO-DATE   AVAILABLE   AGE"
        rows = [f"{d['name']:<14} {d['replicas']}/{d['replicas']:<6} {d['replicas']:<12} "
                f"{d['replicas']:<11} {d['age']}" for d in _deployments(findings)]
        return head + "\n" + "\n".join(rows)

    if resource == "services":
        head = "NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE"
        rows = [f"{s['name']:<12} {s['type']:<11} {s['cluster_ip']:<15} {s['external_ip']:<13} "
                f"{s['ports']:<16} {s['age']}" for s in _services(findings)]
        return head + "\n" + "\n".join(rows)

    if resource == "configmaps":
        head = "NAME         DATA   AGE"
        rows = [f"{n:<12} 2      1m" for n in _configmaps(findings)]
        return head + ("\n" + "\n".join(rows) if rows else "") + ("\nNo resources found in default namespace." if not rows else "")

    if resource == "secrets":
        head = "NAME         TYPE                                  DATA   AGE"
        rows = [f"{n:<12} Opaque                                2      1m" for n in _secrets(findings)]
        return head + ("\n" + "\n".join(rows) if rows else "") + ("\nNo resources found in default namespace." if not rows else "")

    return f'error: the server doesn\'t have a resource type "{resource}"'


def _pod_row(namespace: str | None, p: tuple, wide: bool) -> str:
    name, ready, status, restarts, age, node, ip = p
    prefix = f"{namespace:<13} " if namespace else ""
    row = f"{prefix}{name:<44} {ready:<7} {status:<18} {restarts:<10} {age}"
    return row + (f"   {ip:<13} {node}" if wide else "")


def _not_found(kind: str, name: str) -> CommandResult:
    return CommandResult(output=f'Error from server (NotFound): {kind} "{name}" not found',
                         exit_code=1)


def _parse_get(argv: list[str]) -> tuple[str | None, str | None, str, bool, bool]:
    """Returns (resource, name, output_format, all_namespaces, error)."""
    resource = None
    name = None
    out_fmt = ""
    all_ns = False
    i = 0
    positional: list[str] = []
    while i < len(argv):
        a = argv[i]
        if a in ("-o", "--output") and i + 1 < len(argv):
            out_fmt = argv[i + 1]
            i += 2
        elif a.startswith("-o="):
            out_fmt = a[3:]
            i += 1
        elif a.startswith("--output="):
            out_fmt = a[9:]
            i += 1
        elif a in ("-A", "--all-namespaces"):
            all_ns = True
            i += 1
        elif a in ("-n", "--namespace") and i + 1 < len(argv):
            i += 2  # namespace accepted; simulation stays in default
        elif a.startswith("-n"):
            i += 1
        elif a.startswith("-"):
            i += 1  # ignore other flags
        else:
            positional.append(a)
            i += 1
    if positional:
        resource = _RESOURCE_ALIASES.get(positional[0].lower())
        if len(positional) > 1:
            name = positional[1]
    return resource, name, out_fmt, all_ns, None


# --------------------------------------------------------------------------
# `kubectl describe` / `logs` / `exec`
# --------------------------------------------------------------------------

def _describe_pod(p: tuple, findings: dict[str, Any]) -> str:
    name, ready, status, restarts, age, node, ip = p
    broken = name == BROKEN_POD_NAME and not findings.get("payment_api_fixed")
    if broken:
        return (
            f"Name:             {name}\n"
            f"Namespace:        default\n"
            f"Priority:         0\n"
            f"Service Account:  default\n"
            f"Node:             {node}/192.168.50.12\n"
            f"Start Time:       Fri, 09 Oct 2026 18:12:04 -0400\n"
            f"Labels:           app=payment-api\n"
            f"                  pod-template-hash=7f8c9d2e1f\n"
            f"Status:           Pending\n"
            f"IP:               {ip}\n"
            f"Containers:\n"
            f"  payment-api:\n"
            f"    Container ID:\n"
            f"    Image:          {BROKEN_POD_IMAGE}\n"
            f"    Port:           8080/TCP\n"
            f"    Host Port:      0/TCP\n"
            f"    State:          Waiting\n"
            f"      Reason:       CrashLoopBackOff\n"
            f"    Last State:     Terminated\n"
            f"      Reason:       Error\n"
            f"      Exit Code:    1\n"
            f"    Ready:          False\n"
            f"    Restart Count:  {restarts}\n"
            f"    Environment:\n"
            f"      DATABASE_URL:  <not set>\n"
            f"      LOG_LEVEL:     info\n"
            f"Conditions:\n"
            f"  Type                        Status\n"
            f"  PodReadyToStartContainers    True\n"
            f"  Initialized                  True\n"
            f"  Ready                        False\n"
            f"  ContainersReady              False\n"
            f"  PodScheduled                 True\n"
            f"Events:\n"
            f"  Type     Reason     Age                    From               Message\n"
            f"  ----     ------     ----                   ----               -------\n"
            f"  Normal   Scheduled  26m                    default-scheduler  Successfully assigned default/{name} to {node}\n"
            f"  Normal   Pulled     26m                    kubelet            Successfully pulled image \"{BROKEN_POD_IMAGE}\"\n"
            f"  Normal   Created    26m                    kubelet            Created container payment-api\n"
            f"  Normal   Started    24m                    kubelet            Started container payment-api\n"
            f"  Warning  BackOff    2m12s (x37 over 26m)   kubelet            Back-off restarting failed container payment-api in pod {name}_default"
        )
    return (
        f"Name:             {name}\n"
        f"Namespace:        default\n"
        f"Priority:         0\n"
        f"Service Account:  default\n"
        f"Node:             {node}/192.168.50.11\n"
        f"Start Time:       Tue, 06 Oct 2026 09:41:22 -0400\n"
        f"Labels:           app=web-frontend\n"
        f"Status:           Running\n"
        f"IP:               {ip}\n"
        f"Containers:\n"
        f"  web-frontend:\n"
        f"    Image:          nginx:1.25\n"
        f"    Port:           80/TCP\n"
        f"    State:          Running\n"
        f"      Started:      Tue, 06 Oct 2026 09:41:30 -0400\n"
        f"    Ready:          True\n"
        f"    Restart Count:  {restarts}\n"
        f"Conditions:\n"
        f"  Type                        Status\n"
        f"  Ready                        True\n"
        f"  ContainersReady              True\n"
        f"  PodScheduled                 True\n"
        f"Events:\n"
        f"  Type    Reason     Age   From               Message\n"
        f"  ----    ------     ----  ----               -------\n"
        f"  Normal  Scheduled  {age}   default-scheduler  Successfully assigned default/{name} to {node}\n"
        f"  Normal  Pulled     {age}   kubelet            Successfully pulled image \"nginx:1.25\"\n"
        f"  Normal  Created    {age}   kubelet            Created container web-frontend\n"
        f"  Normal  Started    {age}   kubelet            Started container web-frontend"
    )


def _describe_deployment(name: str, findings: dict[str, Any]) -> CommandResult:
    for d in _deployments(findings):
        if d["name"] == name:
            return CommandResult(output=(
                f"Name:                   {name}\n"
                f"Namespace:              default\n"
                f"CreationTimestamp:      Fri, 09 Oct 2026 21:55:10 -0400\n"
                f"Labels:                 app={name}\n"
                f"Replicas:               {d['replicas']} desired | {d['replicas']} updated | "
                f"{d['replicas']} total | {d['replicas']} available | 0 unavailable\n"
                f"StrategyType:           RollingUpdate\n"
                f"Pod Template:\n"
                f"  Labels:  app={name}\n"
                f"  Containers:\n"
                f"   {name}:\n"
                f"    Image:        {d['image']}\n"
                f"    Port:         80/TCP\n"
                f"Conditions:\n"
                f"  Type           Status  Reason\n"
                f"  ----           ------  ------\n"
                f"  Available      True    MinimumReplicasAvailable\n"
                f"  Progressing    True    NewReplicaSetAvailable\n"
                f"OldReplicaSets:  <none>\n"
                f"NewReplicaSet:   {name}-{_rs_hash(name)} ({d['replicas']}/{d['replicas']} replicas created)\n"
                f"Events:          <none>"
            ), findings={"deployment_viewed": name})
    return _not_found("deployments.apps", name)


def _describe_service(name: str, findings: dict[str, Any]) -> CommandResult:
    for s in _services(findings):
        if s["name"] == name:
            return CommandResult(output=(
                f"Name:              {name}\n"
                f"Namespace:         default\n"
                f"Labels:            app={name}\n"
                f"Selector:          app={name}\n"
                f"Type:              {s['type']}\n"
                f"IP Family Policy:  SingleStack\n"
                f"IP Families:       IPv4\n"
                f"IP:                {s['cluster_ip']}\n"
                f"Port:              http  80/TCP\n"
                f"TargetPort:        80/TCP\n"
                + (f"NodePort:          http  {s.get('node_port')}/TCP\n" if s["type"] == "NodePort" else "")
                + f"Endpoints:         " + ", ".join(f"{_pod_ip(i)}:80" for i in range(3)) + "\n"
                f"Session Affinity:  None\n"
                f"Events:            <none>"
            ), findings={"service_viewed": name})
    return _not_found("services", name)


def _pod_yaml(p: tuple) -> str:
    name, ready, status, restarts, age, node, ip = p
    return (
        "apiVersion: v1\n"
        "kind: Pod\n"
        "metadata:\n"
        f"  name: {name}\n"
        "  namespace: default\n"
        "spec:\n"
        "  containers:\n"
        "  - name: app\n"
        "    image: app:latest\n"
        "status:\n"
        f"  phase: {'Running' if status == 'Running' else 'Pending'}\n"
        f"  podIP: {ip}\n"
        f"  hostIP: 192.168.50.11\n"
    )


def _logs(name: str, findings: dict[str, Any]) -> CommandResult:
    p = _find_pod(name, findings)
    if not p:
        return _not_found("pods", name)
    pod_name = p[0]
    if pod_name == BROKEN_POD_NAME and not findings.get("payment_api_fixed"):
        out = (
            "[2026-10-09T22:12:04Z] INFO  payment-api starting (v2.4.0)\n"
            "[2026-10-09T22:12:04Z] INFO  connecting to database...\n"
            "[2026-10-09T22:12:04Z] FATAL config: required environment variable DATABASE_URL is not set\n"
            "[2026-10-09T22:12:05Z] INFO  shutting down"
        )
        return CommandResult(output=out, findings={"crashloop_logs_viewed": True})
    if pod_name.startswith("notes-app"):
        return CommandResult(output=(
            "notes-app v1.0 starting\n"
            "Listening on :80\n"
            'GET /healthz 200 3ms'
        ), findings={"app_logs_viewed": True})
    return CommandResult(output=(
        '10.244.0.1 - - [09/Oct/2026:22:01:11 -0400] "GET / HTTP/1.1" 200 615 "-" "kube-probe/1.29"'
    ), findings={"app_logs_viewed": True})


def _exec(pod_name: str, inner: list[str], findings: dict[str, Any]) -> CommandResult:
    p = _find_pod(pod_name, findings)
    if not p:
        return _not_found("pods", pod_name)
    if not inner:
        return CommandResult(output="error: you must specify a command to exec", exit_code=1)
    inner_cmd = " ".join(inner)
    if inner_cmd.startswith("env"):
        return CommandResult(output=(
            "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n"
            "HOSTNAME=" + p[0] + "\n"
            "KUBERNETES_SERVICE_HOST=10.96.0.1\n"
            "KUBERNETES_SERVICE_PORT=443\n"
            "LOG_LEVEL=info"
        ))
    if inner_cmd.startswith("ls"):
        return CommandResult(output="bin\netc\nusr\nvar\napp")
    if "curl" in inner_cmd and "localhost" in inner_cmd:
        return CommandResult(output='{"status":"ok","version":"v1.0"}')
    if inner_cmd.startswith("cat /etc/hostname"):
        return CommandResult(output=p[0])
    return CommandResult(output=f"OCI runtime exec failed: exec failed: unable to start container process: "
                                f'exec: "{inner[0]}": executable file not found in $PATH', exit_code=126)


# --------------------------------------------------------------------------
# Mutating commands
# --------------------------------------------------------------------------

def _create_deployment(name: str, image: str, findings: dict[str, Any]) -> CommandResult:
    if not name:
        return CommandResult(output='error: NAME is required: kubectl create deployment NAME --image=image',
                             exit_code=1)
    if not image:
        return CommandResult(output='error: --image is required: kubectl create deployment NAME --image=image',
                             exit_code=1)
    deployments = dict(findings.get("k8s_deployments") or {})
    if any(d["name"] == name for d in SEEDED_DEPLOYMENTS) or name in deployments:
        return CommandResult(output=f'Error from server (AlreadyExists): deployments.apps "{name}" already exists',
                             exit_code=1)
    deployments[name] = {"image": image, "replicas": 1}
    return CommandResult(
        output=f'deployment.apps/{name} created',
        findings={**findings, "k8s_deployments": deployments,
                  "deployment_created": {"name": name, "image": image, "replicas": 1}},
    )


def _expose(name: str, port: str, svc_type: str, findings: dict[str, Any]) -> CommandResult:
    if not any(d["name"] == name for d in _deployments(findings)):
        return CommandResult(output=f'Error from server (NotFound): deployments.apps "{name}" not found',
                             exit_code=1)
    if not port:
        return CommandResult(output="error: --port is required: kubectl expose deployment NAME --port=80",
                             exit_code=1)
    services = dict(findings.get("k8s_services") or {})
    node_port = _node_port(name) if svc_type == "NodePort" else None
    info = {"type": svc_type, "port": port, "cluster_ip": _cluster_ip(name),
            "node_port": node_port,
            "ports": f"{port}:{node_port}/TCP" if node_port else f"{port}/TCP"}
    services[name] = info
    return CommandResult(
        output=f"service/{name} exposed",
        findings={**findings, "k8s_services": services,
                  "service_exposed": {"name": name, "port": port, "type": svc_type,
                                      "node_port": node_port, "cluster_ip": info["cluster_ip"]}},
    )


def _scale(name: str, replicas: str, findings: dict[str, Any]) -> CommandResult:
    if not any(d["name"] == name for d in _deployments(findings)):
        return CommandResult(output=f'Error from server (NotFound): deployments.apps "{name}" not found',
                             exit_code=1)
    try:
        n = int(replicas)
    except (TypeError, ValueError):
        return CommandResult(output="error: --replicas must be a number", exit_code=1)
    if n < 0:
        return CommandResult(output="error: --replicas cannot be negative", exit_code=1)
    deployments = dict(findings.get("k8s_deployments") or {})
    if name in deployments:
        deployments[name] = {**deployments[name], "replicas": n}
    return CommandResult(
        output=f"deployment.apps/{name} scaled",
        findings={**findings, "k8s_deployments": deployments,
                  "deployment_scaled": {"name": name, "replicas": n}},
    )


def _apply(filename: str, findings: dict[str, Any]) -> CommandResult:
    if filename not in FILES:
        return CommandResult(output=f'error: stat {filename}: no such file or directory '
                                    f"(workspace has: {', '.join(sorted(FILES))})", exit_code=1)
    if filename == "notes-app.yaml":
        deployments = dict(findings.get("k8s_deployments") or {})
        deployments["notes-app"] = {"image": "notes-app:v1.0", "replicas": 1}
        return CommandResult(
            output="deployment.apps/notes-app created",
            findings={**findings, "k8s_deployments": deployments,
                      "deployment_created": {"name": "notes-app", "image": "notes-app:v1.0",
                                             "replicas": 1}},
        )
    if filename == "app-config.yaml":
        configmaps = dict(findings.get("k8s_configmaps") or {})
        secrets = dict(findings.get("k8s_secrets") or {})
        configmaps["app-config"] = {"LOG_LEVEL": "info", "FEATURE_FLAGS": "dark-mode,metrics"}
        secrets["app-secret"] = {"DATABASE_URL": "***", "API_KEY": "***"}
        return CommandResult(
            output="configmap/app-config created\nsecret/app-secret created",
            findings={**findings, "k8s_configmaps": configmaps, "k8s_secrets": secrets,
                      "configmap_created": {"name": "app-config"},
                      "secret_created": {"name": "app-secret"}},
        )
    if filename == "payment-api-fixed.yaml":
        return CommandResult(
            output="deployment.apps/payment-api created",
            findings={**findings, "payment_api_fixed": True,
                      "crashloop_fixed": {"pod": BROKEN_POD_NAME, "via": "secret app-secret"}},
        )
    return CommandResult(output=f"error: {filename} contains no supported resources", exit_code=1)


def _create_configmap(argv: list[str], findings: dict[str, Any]) -> CommandResult:
    name = argv[0] if argv else ""
    if not name:
        return CommandResult(output="error: NAME is required", exit_code=1)
    configmaps = dict(findings.get("k8s_configmaps") or {})
    configmaps[name] = {"data": "from-literal"}
    return CommandResult(output=f"configmap/{name} created",
                         findings={**findings, "k8s_configmaps": configmaps,
                                   "configmap_created": {"name": name}})


def _create_secret(argv: list[str], findings: dict[str, Any]) -> CommandResult:
    # kubectl create secret generic NAME [--from-literal=k=v]
    args = [a for a in argv if a != "generic"]
    name = args[0] if args else ""
    if not name:
        return CommandResult(output="error: NAME is required", exit_code=1)
    secrets = dict(findings.get("k8s_secrets") or {})
    secrets[name] = {"data": "***"}
    return CommandResult(output=f"secret/{name} created",
                         findings={**findings, "k8s_secrets": secrets,
                                   "secret_created": {"name": name}})


def _delete(resource: str, name: str, findings: dict[str, Any]) -> CommandResult:
    if resource == "deployments":
        names = [d["name"] for d in _deployments(findings)]
        if name not in names:
            return _not_found("deployments.apps", name)
        deleted = list(findings.get("deployment_deleted") or []) + [name]
        deployments = {k: v for k, v in (findings.get("k8s_deployments") or {}).items() if k != name}
        return CommandResult(output=f'deployment.apps "{name}" deleted',
                             findings={**findings, "k8s_deployments": deployments,
                                       "deployment_deleted": deleted})
    if resource == "services":
        names = [s["name"] for s in _services(findings)]
        if name == "kubernetes":
            return CommandResult(output='Error from server (Forbidden): services "kubernetes" is a system service',
                                 exit_code=1)
        if name not in names:
            return _not_found("services", name)
        deleted = list(findings.get("service_deleted") or []) + [name]
        services = {k: v for k, v in (findings.get("k8s_services") or {}).items() if k != name}
        return CommandResult(output=f'service "{name}" deleted',
                             findings={**findings, "k8s_services": services,
                                       "service_deleted": deleted})
    if resource == "pods":
        p = _find_pod(name, findings)
        if not p:
            return _not_found("pods", name)
        deleted = list(findings.get("pod_deleted") or []) + [p[0]]
        return CommandResult(output=f'pod "{p[0]}" deleted',
                             findings={**findings, "pod_deleted": deleted})
    return CommandResult(output=f'error: unknown resource type "{resource}" for delete', exit_code=1)


# --------------------------------------------------------------------------
# Command dispatch
# --------------------------------------------------------------------------

def _cluster_info() -> CommandResult:
    return CommandResult(
        output=(
            "Kubernetes control plane is running at https://10.0.0.10:6443\n"
            "CoreDNS is running at https://10.0.0.10:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy\n"
            "\n"
            "To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'."
        ),
        findings={"cluster_info_viewed": True},
    )


def _get_contexts() -> CommandResult:
    return CommandResult(output=(
        "CURRENT   NAME          CLUSTER       AUTHINFO   NAMESPACE\n"
        "*         lab-cluster   lab-cluster   student    default"
    ))


def _flag_value(argv: list[str], *flags: str) -> str | None:
    """Find --flag=value, --flag value, or -f value for any of the given flags."""
    for i, a in enumerate(argv):
        for f in flags:
            if a == f and i + 1 < len(argv):
                return argv[i + 1]
            if a.startswith(f + "="):
                return a[len(f) + 1:]
    return None


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    raw = (command or "").strip()
    if not raw:
        return CommandResult(output="")
    if len(raw) > 512:
        return CommandResult(output="Command too long.", exit_code=1)
    parts = raw.split()
    cmd = parts[0].lower()
    argv = parts[1:]

    if cmd in ("clear", "cls"):
        return CommandResult(output="", clear=True)
    if cmd == "ls":
        return CommandResult(output="\n".join(sorted(FILES)))
    if cmd == "cat":
        if not argv:
            return CommandResult(output="cat: missing operand", exit_code=1)
        name = argv[0]
        if name in FILES:
            return CommandResult(output=FILES[name], findings={"manifest_viewed": name})
        return CommandResult(output=f"cat: {name}: No such file or directory", exit_code=1)
    if cmd in ("help", "?"):
        return CommandResult(output=(
            "Available commands (simulated kubectl - nothing really runs):\n"
            "  kubectl cluster-info                        control-plane endpoint\n"
            "  kubectl config get-contexts                 list kubeconfig contexts\n"
            "  kubectl get nodes|namespaces                cluster inventory\n"
            "  kubectl get pods|deployments|services [-o wide|yaml] [-A]\n"
            "  kubectl get configmaps|secrets\n"
            "  kubectl describe pod|deployment|service NAME\n"
            "  kubectl logs POD                            container logs\n"
            "  kubectl exec -it POD -- CMD                 run a command in a pod\n"
            "  kubectl create deployment NAME --image=IMG\n"
            "  kubectl expose deployment NAME --port=80 --type=NodePort\n"
            "  kubectl scale deployment NAME --replicas=3\n"
            "  kubectl apply -f FILE                       apply a workspace manifest\n"
            "  kubectl delete pod|deployment|service NAME\n"
            "  ls · cat FILE · help · clear"
        ))

    if cmd not in ("kubectl", "k"):
        return CommandResult(output=f"{cmd}: command not found (this lab uses `kubectl` — try `help`)",
                             exit_code=127)

    sub = argv[0].lower() if argv else ""
    rest = argv[1:]

    if sub == "cluster-info":
        return _cluster_info()
    if sub == "config":
        if len(rest) >= 1 and rest[0].lower() == "get-contexts":
            return _get_contexts()
        return CommandResult(output="error: unknown config subcommand (try: kubectl config get-contexts)",
                             exit_code=1)
    if sub == "get":
        resource, name, out_fmt, all_ns, _ = _parse_get(rest)
        if not resource:
            return CommandResult(output='error: the server doesn\'t have a resource type '
                                        f'"{rest[0] if rest else ""}"', exit_code=1)
        if resource in ("nodes", "namespaces"):
            return CommandResult(output=_get_table(resource, findings, out_fmt == "wide", all_ns),
                                 findings={**({"nodes_listed": True} if resource == "nodes"
                                              else {"namespaces_listed": True})})
        if resource == "pods" and name:
            p = _find_pod(name, findings)
            if not p:
                return _not_found("pods", name)
            if out_fmt == "yaml":
                return CommandResult(output=_pod_yaml(p))
            return CommandResult(output=_get_table("pods", findings, False, False))
        if resource == "deployments" and name:
            d = next((x for x in _deployments(findings) if x["name"] == name), None)
            if not d:
                return _not_found("deployments.apps", name)
            return CommandResult(output=_get_table("deployments", findings, False, False))
        if resource == "services" and name:
            s = next((x for x in _services(findings) if x["name"] == name), None)
            if not s:
                return _not_found("services", name)
            return CommandResult(output=_get_table("services", findings, False, False))
        table = _get_table(resource, findings, out_fmt == "wide", all_ns)
        findings_out: dict[str, Any] = {}
        if resource == "pods":
            findings_out["pods_listed"] = True
        if resource == "deployments":
            findings_out["deployments_listed"] = True
        if resource == "services":
            findings_out["services_listed"] = True
        return CommandResult(output=table, findings=findings_out)
    if sub == "describe":
        if len(rest) < 2:
            return CommandResult(output="error: describe requires TYPE and NAME", exit_code=1)
        rtype = _RESOURCE_ALIASES.get(rest[0].lower())
        name = rest[1]
        if rtype == "pods":
            p = _find_pod(name, findings)
            if not p:
                return _not_found("pods", name)
            out = _describe_pod(p, findings)
            f = {"pod_described": p[0]}
            if p[0] == BROKEN_POD_NAME:
                f["crashloop_described"] = True
            return CommandResult(output=out, findings=f)
        if rtype == "deployments":
            return _describe_deployment(name, findings)
        if rtype == "services":
            return _describe_service(name, findings)
        return CommandResult(output=f'error: the server doesn\'t have a resource type "{rest[0]}"',
                             exit_code=1)
    if sub == "logs":
        if not rest:
            return CommandResult(output="error: logs requires a pod name", exit_code=1)
        return _logs(rest[0], findings)
    if sub == "exec":
        # kubectl exec -it POD -- CMD...
        args = [a for a in rest if a not in ("-it", "-i", "-t")]
        if "--" in args:
            idx = args.index("--")
            pod, inner = args[idx - 1] if idx > 0 else "", args[idx + 1:]
        else:
            pod, inner = (args[0], args[1:]) if args else ("", [])
        if not pod:
            return CommandResult(output="error: exec requires a pod name", exit_code=1)
        return _exec(pod, inner, findings)
    if sub == "create":
        if len(rest) < 2:
            return CommandResult(output="error: create requires TYPE and NAME "
                                        "(kubectl create deployment NAME --image=IMG)", exit_code=1)
        rtype = _RESOURCE_ALIASES.get(rest[0].lower())
        if rtype == "deployments":
            image = _flag_value(rest[1:], "--image")
            return _create_deployment(rest[1], image, findings)
        if rtype == "configmaps":
            return _create_configmap(rest[1:], findings)
        if rtype == "secrets":
            return _create_secret(rest[1:], findings)
        return CommandResult(output=f"error: simulated create only supports deployment, configmap, secret "
                                    f"(not {rest[0]})", exit_code=1)
    if sub == "expose":
        if len(rest) < 2 or _RESOURCE_ALIASES.get(rest[0].lower()) != "deployments":
            return CommandResult(output="error: usage: kubectl expose deployment NAME --port=80 "
                                        "[--type=ClusterIP|NodePort|LoadBalancer]", exit_code=1)
        port = _flag_value(rest[1:], "--port")
        svc_type = _flag_value(rest[1:], "--type") or "ClusterIP"
        if svc_type not in ("ClusterIP", "NodePort", "LoadBalancer"):
            return CommandResult(output=f'error: unknown service type "{svc_type}"', exit_code=1)
        return _expose(rest[1], port, svc_type, findings)
    if sub == "scale":
        if len(rest) < 2 or _RESOURCE_ALIASES.get(rest[0].lower()) != "deployments":
            return CommandResult(output="error: usage: kubectl scale deployment NAME --replicas=N",
                                 exit_code=1)
        replicas = _flag_value(rest[1:], "--replicas")
        return _scale(rest[1], replicas, findings)
    if sub == "apply":
        filename = _flag_value(rest, "-f", "--filename")
        if not filename:
            return CommandResult(output="error: -f/--filename is required: kubectl apply -f FILE",
                                 exit_code=1)
        return _apply(filename, findings)
    if sub == "delete":
        if len(rest) < 2:
            return CommandResult(output="error: delete requires TYPE and NAME", exit_code=1)
        rtype = _RESOURCE_ALIASES.get(rest[0].lower())
        if rtype not in ("pods", "deployments", "services"):
            return CommandResult(output=f"error: simulated delete only supports pod, deployment, service "
                                        f"(not {rest[0]})", exit_code=1)
        return _delete(rtype, rest[1], findings)
    if sub == "version":
        return CommandResult(output="Client Version: v1.29.2\nKustomize Version: v5.0.4-0.20230601165947-6ce0bf390ce3\n"
                                    "Server Version: v1.29.2")
    return CommandResult(output=f'error: unknown command "{sub}" for "kubectl"', exit_code=1)
