"""Terraform for Kubernetes & Docker lab: learn HCL by writing it.

Covers the kubernetes and docker providers end to end: provider blocks and
required_providers -> namespace -> writing a Deployment + Service + ConfigMap
-> writing docker_image + docker_container (+ network, volume) -> variables.tf
and outputs.tf -> full apply + state inspection -> scaling replicas (in-place
update) -> destroy.

Every objective teaches the HCL being written: block types, arguments vs
nested blocks, references, and how the pieces connect. Uses the extended
`terraform_cli` shell (k8s scenario) with the `write` command for .tf files.

Validators are defined in this module via the shared @validator decorator.
"""
from __future__ import annotations

from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget
from labs.validators import validator


# ---------------------------------------------------------------------------
# validators (outcome-based: they read findings and written file contents)
# ---------------------------------------------------------------------------

def _files(findings):
    return findings.get("k8s_files") or {}


@validator("tfk8s_providers_ready")
def tfk8s_providers_ready(args, findings):
    missing = []
    if not findings.get("k8s_config_viewed"):
        missing.append("read main.tf (cat main.tf)")
    if not findings.get("init_done"):
        missing.append("terraform init")
    if not findings.get("validated"):
        missing.append("terraform validate")
    if not missing:
        return True, "Provider blocks reviewed; working directory initialized and validated.", None
    return False, f"Still needed: {', '.join(missing)}.", None


@validator("tfk8s_deployment_written")
def tfk8s_deployment_written(args, findings):
    content = _files(findings).get("k8s.tf", "")
    need = ['resource "kubernetes_deployment"', "replicas"]
    missing = [b for b in need if b not in content]
    if not missing:
        return True, "k8s.tf contains the Deployment with a replicas setting.", {"file": "k8s.tf"}
    return False, f"k8s.tf is missing: {', '.join(missing)}. Write it with the `write` command.", None


@validator("tfk8s_service_configmap_written")
def tfk8s_service_configmap_written(args, findings):
    content = _files(findings).get("k8s.tf", "")
    need = ['resource "kubernetes_service"', 'resource "kubernetes_config_map"', "selector"]
    missing = [b for b in need if b not in content]
    if not missing:
        return True, "Service and ConfigMap present with selector wiring.", {"file": "k8s.tf"}
    return False, f"k8s.tf is missing: {', '.join(missing)}.", None


@validator("tfk8s_docker_written")
def tfk8s_docker_written(args, findings):
    content = _files(findings).get("docker.tf", "")
    need = ['resource "docker_image"', 'resource "docker_container"']
    missing = [b for b in need if b not in content]
    if not missing:
        return True, "docker.tf defines the image and container.", {"file": "docker.tf"}
    return False, f"docker.tf is missing: {', '.join(missing)}. Write it with the `write` command.", None


@validator("tfk8s_variables_outputs_written")
def tfk8s_variables_outputs_written(args, findings):
    v = _files(findings).get("variables.tf", "")
    o = _files(findings).get("outputs.tf", "")
    missing = []
    if "variable " not in v:
        missing.append("variables.tf needs variable blocks")
    if "output " not in o:
        missing.append("outputs.tf needs output blocks")
    if not missing:
        return True, "variables.tf and outputs.tf are written.", None
    return False, " ".join(missing) + ".", None


@validator("tfk8s_applied")
def tfk8s_applied(args, findings):
    if findings.get("k8s_ever_applied"):
        resources = findings.get("k8s_applied_resources") or []
        n = len(resources) if resources else 8
        return True, f"Applied: {n} resources provisioned across Kubernetes and Docker.", {"resources": resources}
    return False, "Apply the configuration (terraform apply).", None


@validator("tfk8s_scaled")
def tfk8s_scaled(args, findings):
    replicas = int(findings.get("k8s_replicas") or 3)
    if replicas != 3 and findings.get("k8s_scale_deployed"):
        return True, f"Scaled to {replicas} replicas and deployed the in-place update.", {"replicas": replicas}
    if replicas == 3:
        return False, "Edit k8s.tf: change replicas to 5 with the `write` command, then plan + apply.", None
    return False, "Deploy the scale change: terraform plan to preview, then terraform apply.", None


@validator("tfk8s_destroyed")
def tfk8s_destroyed(args, findings):
    if findings.get("k8s_destroyed"):
        return True, "Infrastructure destroyed. Clean teardown complete.", None
    return False, "Tear everything down (terraform destroy).", None


# ---------------------------------------------------------------------------
# lab definition
# ---------------------------------------------------------------------------

TERRAFORM_K8S_DOCKER_LAB = LabDefinition(
    id="terraform-k8s-docker-001",
    slug="terraform-k8s-docker",
    title="Terraform for Kubernetes & Docker",
    description=(
        "Learn Terraform HCL by writing it: kubernetes and docker providers, "
        "Namespace + Deployment + Service + ConfigMap, docker image + container "
        "with network and volume, variables.tf and outputs.tf, full apply, "
        "in-place scaling update, then destroy. Every step teaches the HCL."
    ),
    category="devops",  # type: ignore[assignment]
    difficulty="intermediate",
    estimated_minutes=60,
    shell="terraform_cli",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/iac:latest",
        workdir="/home/student/k8s-infra",
        idle_timeout_minutes=20,
        max_runtime_minutes=60,
        deny_internet_egress=True,
    ),
    targets=[LabTarget(hostname="k8s-infra", role="Terraform working directory")],
    objectives=[
        LabObjective(
            id="providers",
            label="Read the provider configuration",
            validator="tfk8s_providers_ready",
            description=(
                "cat main.tf and study the three HCL block kinds:\n"
                "  terraform { required_providers { kubernetes = { source, version }, docker = {...} } }\n"
                "    -> declares WHICH plugins init must download. `~> 2.30` = >= 2.30, < 3.0.\n"
                "  provider \"kubernetes\" { config_path = \"~/.kube/config\" }\n"
                "    -> configures the plugin: how it authenticates to the cluster.\n"
                "  provider \"docker\" { host = \"unix:///var/run/docker.sock\" }\n"
                "    -> same idea for the Docker daemon.\n"
                "  resource \"kubernetes_namespace\" \"app\" { metadata { name, labels } }\n"
                "    -> ONE managed object. Type comes from the provider; \"app\" is your label,\n"
                "       referenced elsewhere as kubernetes_namespace.app.\n"
                "Then: terraform init (downloads both providers) + terraform validate."
            ),
            hints=[
                "cat main.tf — read every comment; it explains each block.",
                "terraform init, then terraform validate.",
            ],
        ),
        LabObjective(
            id="deployment",
            label="Write the Kubernetes Deployment",
            validator="tfk8s_deployment_written",
            description=(
                "Write k8s.tf with the `write` command (end with EOF). The Deployment block:\n"
                "  resource \"kubernetes_deployment\" \"web\" {\n"
                "    metadata { name, namespace = kubernetes_namespace.app.metadata[0].name, labels }\n"
                "      -> namespace is a REFERENCE, not hardcoded: Terraform orders creation itself.\n"
                "      -> metadata[0] because the provider models metadata as a one-item list.\n"
                "    spec {\n"
                "      replicas = 3\n"
                "      selector { match_labels = { app = \"web\" } }   # which Pods belong to me\n"
                "      template {                                       # the Pod blueprint\n"
                "        metadata { labels = { app = \"web\" } }        # MUST match selector\n"
                "        spec { container { name, image, port, env_from, resources { limits, requests } } }\n"
                "      }\n"
                "    }\n"
                "  }\n"
                "Key lesson: selector.match_labels and template.metadata.labels must agree, "
                "or the Deployment manages zero Pods."
            ),
            hints=[
                "write k8s.tf — paste the Deployment HCL, end with EOF on its own line.",
                "Minimum: resource \"kubernetes_deployment\" \"web\" with replicas set.",
                "terraform validate checks your HCL structure.",
            ],
        ),
        LabObjective(
            id="service-configmap",
            label="Add the Service and ConfigMap",
            validator="tfk8s_service_configmap_written",
            description=(
                "Append to k8s.tf (write k8s.tf again with the full content):\n"
                "  resource \"kubernetes_config_map\" \"app_config\" {\n"
                "    metadata { name, namespace = kubernetes_namespace.app.metadata[0].name }\n"
                "    data = { LOG_LEVEL = \"info\" }      # plain map: keys -> string values\n"
                "  }\n"
                "  resource \"kubernetes_service\" \"web\" {\n"
                "    metadata { name, namespace = ... }\n"
                "    spec {\n"
                "      selector = { app = \"web\" }       # routes to Pods with THESE labels —\n"
                "                                         # the same labels the Deployment stamps.\n"
                "      port { port = 80  target_port = 80 }  # Service port vs container port\n"
                "      type = \"ClusterIP\"               # cluster-internal only\n"
                "    }\n"
                "  }\n"
                "And wire the ConfigMap into the Deployment with:\n"
                "  env_from { config_map_ref { name = kubernetes_config_map.app_config.metadata[0].name } }\n"
                "This is the core Kubernetes pattern: labels connect Deployment -> Pods -> Service."
            ),
            hints=[
                "write k8s.tf with Deployment + Service + ConfigMap together.",
                "The Service selector must match the Pod labels (app = \"web\").",
            ],
        ),
        LabObjective(
            id="docker",
            label="Write the Docker resources",
            validator="tfk8s_docker_written",
            description=(
                "Write docker.tf — the docker provider manages your LOCAL daemon:\n"
                "  resource \"docker_image\" \"app\" {\n"
                "    name = \"road2cissp/app:latest\"\n"
                "    build { context = \".\"  dockerfile = \"Dockerfile\"  tag = [...] }\n"
                "      -> nested build block = build the image from a Dockerfile first.\n"
                "  }\n"
                "  resource \"docker_network\" \"app_net\" { name = \"app-net\" }\n"
                "  resource \"docker_volume\" \"cache_data\" { name = \"cache-data\" }  # survives recreation\n"
                "  resource \"docker_container\" \"cache\" {\n"
                "    name = \"redis-cache\"  image = \"redis:7-alpine\"\n"
                "    ports { internal = 6379  external = 6379 }   # container -> host mapping\n"
                "    volumes { volume_name = docker_volume.cache_data.name   # reference!\n"
                "              container_path = \"/data\" }\n"
                "    networks_advanced { name = docker_network.app_net.name }\n"
                "    restart = \"unless-stopped\"\n"
                "  }\n"
                "References (docker_volume.cache_data.name) create implicit dependencies: "
                "Terraform creates the volume before the container."
            ),
            hints=[
                "write docker.tf — needs docker_image and docker_container blocks.",
                "Use references (docker_volume.cache_data.name) instead of hardcoded names.",
            ],
        ),
        LabObjective(
            id="variables-outputs",
            label="Write variables.tf and outputs.tf",
            validator="tfk8s_variables_outputs_written",
            description=(
                "variables.tf — declare inputs ONCE with types, defaults, validation:\n"
                "  variable \"replicas\" {\n"
                "    description = \"Number of web Pods\"\n"
                "    type        = number          # string | number | bool | list(...) | map(...)\n"
                "    default     = 3               # no default = Terraform prompts at plan time\n"
                "    validation { condition = var.replicas >= 1 && var.replicas <= 10\n"
                "                 error_message = \"replicas must be between 1 and 10.\" }\n"
                "  }\n"
                "  # Referenced as var.replicas anywhere in the config.\n"
                "  # Precedence: -var flag > TF_VAR_ env > terraform.tfvars > default.\n"
                "outputs.tf — expose values AFTER apply:\n"
                "  output \"service_cluster_ip\" {\n"
                "    value = kubernetes_service.web.spec[0].cluster_ip  # unknown until apply!\n"
                "  }\n"
                "  output \"web_replicas\" { value = kubernetes_deployment.web.spec[0].replicas }"
            ),
            hints=[
                "write variables.tf with at least one variable block.",
                "write outputs.tf with at least one output block.",
                "terraform validate to check both.",
            ],
        ),
        LabObjective(
            id="apply-inspect",
            label="Apply the full stack and inspect state",
            validator="tfk8s_applied",
            description=(
                "terraform plan -out=tfplan, review the 8 resources to add, then "
                "terraform apply tfplan. Watch the dependency order: namespace first, "
                "then ConfigMap/Deployment/Service, then Docker network/volume/image/container.\n"
                "Then inspect: terraform state list (the 8 managed addresses) and "
                "terraform output (namespace, service_cluster_ip, cache_container_name, web_replicas).\n"
                "Note: service_cluster_ip was UNKNOWN at plan time (computed by Kubernetes) "
                "and is only known after apply — outputs can be computed values."
            ),
            hints=[
                "terraform plan -out=tfplan — count the 8 resources.",
                "terraform apply tfplan — applies exactly the saved plan.",
                "terraform state list, then terraform output.",
            ],
        ),
        LabObjective(
            id="scale",
            label="Scale the Deployment in place",
            validator="tfk8s_scaled",
            description=(
                "Change one number and watch Terraform do an in-place update:\n"
                "  1. write k8s.tf again with replicas = 5 (full file content).\n"
                "  2. terraform plan — shows: ~ resource \"kubernetes_deployment\" \"web\"\n"
                "       ~ replicas = 3 -> 5     (the ~ means update in-place, not replace)\n"
                "     Plan: 0 to add, 1 to change, 0 to destroy.\n"
                "  3. terraform apply — only the Deployment is touched; nothing is recreated.\n"
                "This is the IaC superpower: declare the desired state, let Terraform compute "
                "the minimal diff. Try -var=\"replicas=5\" on plan to see variable override too."
            ),
            hints=[
                "write k8s.tf with replicas = 5.",
                "terraform plan — look for the ~ (update in-place) symbol.",
                "terraform apply to deploy the change.",
            ],
        ),
        LabObjective(
            id="destroy",
            label="Destroy everything",
            validator="tfk8s_destroyed",
            description=(
                "terraform destroy — tears down all 8 resources in reverse dependency order "
                "(container before volume, Service before Deployment, namespace last). "
                "Always clean up: real clusters cost real money."
            ),
            hints=[
                "terraform destroy — type yes, or -auto-approve.",
            ],
        ),
    ],
)
