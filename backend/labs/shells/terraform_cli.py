"""A simulated Terraform CLI for the Terraform fundamentals (IaC workflow) lab.

Models the complete core workflow deterministically: init -> validate/fmt -> plan (-out) ->
apply (with confirmation flow / -auto-approve) -> state/outputs/show inspection ->
variables (-var, terraform.tfvars, TF_VAR_ env) -> workspaces -> destroy. State is derived
from the findings already recorded, so no separate store is needed. Executes nothing and
provisions no cloud.

The scenario is a realistic webapp stack (VPC, 2 subnets, security group, EC2, S3 + versioning
= 7 resources) with one intentional misconfiguration: the security group allows SSH from
0.0.0.0/0. The student fixes it with `edit main.tf`, previews with `terraform plan`, and
deploys with `terraform apply`.

This is a separate shell from `labs/shells/terraform.py` (used by cloud-terraform-001):
that shell is tailored to a 3-resource cloud-security scan scenario, while this one models
the full CLI workflow surface for the fundamentals track.
"""
from __future__ import annotations

import shlex
from typing import Any

from labs.providers.base import CommandResult

MAIN_TF = """terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# --- Networking ---
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true

  tags = {
    Name = "road2cissp-vpc"
  }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "road2cissp-public-a"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true

  tags = {
    Name = "road2cissp-public-b"
  }
}

# --- Security ---
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Allow web traffic and admin access"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]   # <-- REVIEW: SSH open to the world
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- Compute ---
resource "aws_instance" "web" {
  ami                    = "ami-0abcd1234ef567890"
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name = "road2cissp-web"
  }
}

# --- Storage ---
resource "aws_s3_bucket" "logs" {
  bucket = "road2cissp-app-logs"
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id

  versioning_configuration {
    status = "Enabled"
  }
}
"""

VARIABLES_TF = """variable "region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type for the web server"
  type        = string
  default     = "t3.micro"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}
"""

TERRAFORM_TFVARS = """# Override variable defaults without touching the .tf files.
# Loaded automatically on plan/apply. Explicit -var flags and TF_VAR_
# environment variables take precedence over these values.
instance_type = "t3.small"
"""

OUTPUTS_TF = """output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "web_public_ip" {
  description = "Public IP of the web server"
  value       = aws_instance.web.public_ip
}

output "logs_bucket" {
  description = "Name of the logs bucket"
  value       = aws_s3_bucket.logs.bucket
}
"""

# ===========================================================================
# KUBERNETES + DOCKER SCENARIO (terraform-k8s-docker-001)
# ===========================================================================

K8S_MAIN_TF = """# =============================================================================
# main.tf -- providers + namespace. READ THIS FIRST.
# =============================================================================
# A Terraform configuration has three kinds of top-level blocks:
#
#   1. terraform { }          -- Terraform's own settings: which version you need,
#                                and which PROVIDERS (plugins) this config uses.
#   2. provider "name" { }    -- configures ONE provider plugin: credentials,
#                                endpoints, anything the plugin needs to talk to
#                                its API. One block per provider you use.
#   3. resource "type" "name" -- ONE piece of infrastructure to manage.
#        { }                   The type (e.g. kubernetes_deployment) comes from
#                                the provider; the name ("web") is YOUR label,
#                                referenced elsewhere as kubernetes_deployment.web.
#
# Terraform builds a dependency graph from your references
# (e.g. namespace = kubernetes_namespace.app.metadata[0].name) and creates
# things in the right order automatically. You never order resources by hand.

terraform {
  required_version = ">= 1.5"

  # Every provider is an address + version constraint, so `terraform init`
  # knows exactly what to download. `~> 2.30` means >= 2.30, < 3.0.
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"   # registry hostname implied
      version = "~> 2.30"
    }
    docker = {
      source  = "kreuzwerker/docker"     # community provider, not HashiCorp's
      version = "~> 3.0"
    }
  }
}

# The kubernetes provider authenticates with your cluster. config_path points
# at kubeconfig (the same file kubectl uses).
provider "kubernetes" {
  config_path = "~/.kube/config"
}

# The docker provider talks to the Docker daemon over its socket.
provider "docker" {
  host = "unix:///var/run/docker.sock"
}

# --- Namespace: a fenced-off area inside the cluster ---
# Namespaces let teams share a cluster without colliding. Everything we
# create below goes into "app" so `terraform destroy` cleans up neatly.
resource "kubernetes_namespace" "app" {
  metadata {
    name = "app"
    labels = {
      managed-by = "terraform"     # labels = searchable key/value metadata
      env        = "lab"
    }
  }
}
"""

K8S_DEPLOYMENT_TF = """# k8s.tf -- the web workload: ConfigMap + Deployment + Service.
# A Deployment keeps N identical Pods running; a Service gives them one
# stable address; a ConfigMap injects non-secret configuration.

resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    # Reference: namespace comes from the resource above, not hardcoded.
    # metadata[0] because the provider models metadata as a one-item list.
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  data = {
    LOG_LEVEL = "info"
    API_URL   = "https://api.example.internal"
  }
}

resource "kubernetes_deployment" "web" {
  metadata {
    name      = "web"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = { app = "web" }
  }
  spec {
    replicas = 3   # <-- change to 5 later to see an in-place update

    # selector tells the Deployment which Pods belong to it.
    # It MUST match the template's labels, or the Deployment adopts nothing.
    selector {
      match_labels = { app = "web" }
    }
    template {
      metadata { labels = { app = "web" } }
      spec {
        container {
          name  = "web"
          image = "nginx:1.27"
          port { container_port = 80 }
          # env_from pulls every key from the ConfigMap into the container.
          env_from {
            config_map_ref { name = kubernetes_config_map.app_config.metadata[0].name }
          }
          resources {
            limits   = { cpu = "500m", memory = "512Mi" }
            requests = { cpu = "250m", memory = "256Mi" }
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "web" {
  metadata {
    name      = "web"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  spec {
    # selector routes traffic to Pods labelled app=web -- the SAME labels
    # the Deployment stamps on its Pods. This is how the pieces connect.
    selector = { app = "web" }
    port {
      port        = 80          # the Service's port
      target_port = 80          # the container's port
    }
    type = "ClusterIP"          # reachable only inside the cluster
  }
}
"""

K8S_DOCKER_TF = """# docker.tf -- the Docker provider side: image + network + volume + container.
# The docker provider manages the LOCAL Docker daemon: build images,
# run containers, create networks and volumes -- all as Terraform resources.

resource "docker_image" "app" {
  name = "road2cissp/app:latest"
  build {
    context    = "."            # directory containing the Dockerfile
    dockerfile = "Dockerfile"
    tag        = ["road2cissp/app:latest"]
  }
}

resource "docker_network" "app_net" {
  name = "app-net"
}

resource "docker_volume" "cache_data" {
  name = "cache-data"            # survives container recreation
}

resource "docker_container" "cache" {
  name  = "redis-cache"
  image = "redis:7-alpine"
  ports {
    internal = 6379             # inside the container
    external = 6379             # on the Docker host
  }
  volumes {
    volume_name    = docker_volume.cache_data.name
    container_path = "/data"    # Redis persists here
  }
  networks_advanced {
    name = docker_network.app_net.name
  }
  restart = "unless-stopped"
}
"""

K8S_VARIABLES_TF = """# variables.tf -- declare every input once, with types and defaults.
# A variable block has: type (string/number/bool/list(...)/map(...)/object),
# an optional default (no default = Terraform will PROMPT for it), an optional
# description, and optional validation rules that fail fast on bad input.

variable "namespace" {
  description = "Kubernetes namespace for the app"
  type        = string
  default     = "app"
}

variable "replicas" {
  description = "Number of web Pods to run"
  type        = number
  default     = 3

  validation {
    condition     = var.replicas >= 1 && var.replicas <= 10
    error_message = "replicas must be between 1 and 10."
  }
}

variable "image_tag" {
  description = "Docker image tag for the app"
  type        = string
  default     = "latest"
}

variable "enable_cache" {
  description = "Whether to run the Redis cache container"
  type        = bool
  default     = true
}
"""

K8S_OUTPUTS_TF = """# outputs.tf -- expose values AFTER apply: for humans, and for OTHER
# configurations (a root module can read a child module's outputs).
# Values can reference any managed resource attribute.

output "namespace" {
  description = "The application namespace"
  value       = kubernetes_namespace.app.metadata[0].name
}

output "service_cluster_ip" {
  description = "ClusterIP of the web Service (known only after apply)"
  value       = kubernetes_service.web.spec[0].cluster_ip
}

output "cache_container_name" {
  description = "Name of the Redis container"
  value       = docker_container.cache.name
}

output "web_replicas" {
  description = "Running replica count"
  value       = kubernetes_deployment.web.spec[0].replicas
}
"""

K8S_RESOURCES = [
    'kubernetes_namespace.app',
    'kubernetes_config_map.app_config',
    'kubernetes_deployment.web',
    'kubernetes_service.web',
    'docker_image.app',
    'docker_network.app_net',
    'docker_volume.cache_data',
    'docker_container.cache',
]

K8S_RESOURCE_IDS = {
    'kubernetes_namespace.app': 'app',
    'kubernetes_config_map.app_config': 'app/app-config',
    'kubernetes_deployment.web': 'app/web',
    'kubernetes_service.web': 'app/web',
    'docker_image.app': 'sha256:9f2e8c1a4b5d6e7f80910a1b2c3d4e5f6',
    'docker_network.app_net': 'a1b2c3d4e5f6',
    'docker_volume.cache_data': 'cache-data',
    'docker_container.cache': 'redis-cache-01',
}

K8S_OUTPUTS = {
    'namespace': 'app',
    'service_cluster_ip': '10.96.42.7',
    'cache_container_name': 'redis-cache-01',
    'web_replicas': '3',
}

K8S_DEFAULT_REPLICAS = 3


RESOURCES = [
    'aws_vpc.main',
    'aws_subnet.public_a',
    'aws_subnet.public_b',
    'aws_security_group.web',
    'aws_instance.web',
    'aws_s3_bucket.logs',
    'aws_s3_bucket_versioning.logs',
]

# Deterministic simulated IDs / output values.
RESOURCE_IDS = {
    'aws_vpc.main': 'vpc-0a1b2c3d4e5f60718',
    'aws_subnet.public_a': 'subnet-0a1b2c3d4e5f60718',
    'aws_subnet.public_b': 'subnet-1b2c3d4e5f6071829',
    'aws_security_group.web': 'sg-0a1b2c3d4e5f60718',
    'aws_instance.web': 'i-0abc123def456789',
    'aws_s3_bucket.logs': 'road2cissp-app-logs',
    'aws_s3_bucket_versioning.logs': 'road2cissp-app-logs',
}

OUTPUTS = {
    'vpc_id': 'vpc-0a1b2c3d4e5f60718',
    'web_public_ip': '54.210.11.9',
    'logs_bucket': 'road2cissp-app-logs',
}

SSH_OPEN_CIDR = '0.0.0.0/0'
SSH_FIXED_CIDR = '10.0.0.0/8'


def initial_prompt(lab) -> str:
    if _scenario(lab) == "tfaws":
        return 'student@aws:~/aws-infra$ '
    if _scenario(lab) == "azure":
        return 'student@azure:~/azure-infra$ '
    if _scenario(lab) == "gcp":
        return _gcp_prompt()
    if _scenario(lab) == "proxmox":
        return _px_prompt()
    if _scenario(lab) == "k8s":
        return 'student@iac:~/k8s-infra$ '
    return 'student@iac:~/infra$ '


def banner(lab) -> list[str]:
    if _scenario(lab) == "tfaws":
        return [
            'Road to CISSP - Terraform for AWS lab   (simulated: nothing is really provisioned)',
            'You WRITE every .tf file yourself: provider -> VPC/subnets -> EC2 -> S3/IAM ->',
            'RDS -> modules -> remote state -> workspaces -> three-tier capstone. Each objective',
            'teaches the exact HCL, line by line. Use `write <file.tf> \'<hcl>\'` to create files.',
            'Try: write provider.tf \'...\' - terraform init - terraform validate - terraform plan',
        ]
    if _scenario(lab) == "azure":
        return _azure_banner()
    if _scenario(lab) == "gcp":
        return _gcp_banner()
    if _scenario(lab) == "proxmox":
        return _px_banner()
    if _scenario(lab) == "k8s":
        return [
            'Road to CISSP - Terraform for Kubernetes & Docker   (simulated: nothing is really provisioned)',
            'Learn Terraform HCL by WRITING it: providers, resources, variables, outputs.',
            'main.tf has the provider blocks and namespace - read it first with `cat main.tf`.',
            'You will write k8s.tf (Deployment/Service/ConfigMap), docker.tf (image/container),',
            'variables.tf and outputs.tf with the `write` command, then plan/apply/destroy.',
            'Try: cat main.tf - terraform init - terraform validate',
        ]
    return [
        'Road to CISSP - Terraform fundamentals lab   (simulated: nothing is really provisioned)',
        'Master the core IaC workflow: init -> validate -> plan -> apply -> inspect -> configure -> destroy.',
        'A realistic webapp stack (VPC, subnets, security group, EC2, S3) is in this directory.',
        'One security group rule is wrong: find it, fix it with `edit main.tf`, then tear it all down.',
        'Try: cat main.tf · terraform init · terraform validate · terraform plan -out=tfplan',
    ]


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _need_init() -> CommandResult:
    return CommandResult(
        output='Error: Initialization required. Please run "terraform init" first.',
        exit_code=1,
    )


def _need_apply() -> CommandResult:
    return CommandResult(
        output='Error: No state. Run "terraform apply" before inspecting state.',
        exit_code=1,
    )


def _parse(raw: str) -> list[str]:
    try:
        return shlex.split(raw)
    except ValueError:
        return raw.split()


def _extract_vars(args: list[str]) -> tuple[dict[str, str], list[str]]:
    """Pull -var key=value pairs out of an arg list. Returns (vars, remaining)."""
    variables: dict[str, str] = {}
    remaining: list[str] = []
    i = 0
    while i < len(args):
        a = args[i]
        if a.startswith('-var='):
            k, _, v = a[5:].partition('=')
            if k.strip():
                variables[k.strip()] = v.strip()
        elif a == '-var' and i + 1 < len(args):
            k, _, v = args[i + 1].partition('=')
            if k.strip():
                variables[k.strip()] = v.strip()
            i += 1
        else:
            remaining.append(a)
        i += 1
    return variables, remaining


def _has_flag(args: list[str], *names: str) -> bool:
    return any(a in names for a in args)


def _instance_type(findings: dict[str, Any], cli_vars: dict[str, str]) -> tuple[str, str | None]:
    """Resolve instance_type by precedence: -var > TF_VAR_ > terraform.tfvars > default."""
    if 'instance_type' in cli_vars:
        return cli_vars['instance_type'], '-var'
    env_vars = findings.get('variables_set') or {}
    if 'instance_type' in env_vars:
        return env_vars['instance_type'], 'TF_VAR_'
    return 't3.small', 'terraform.tfvars'


def _plan_body(findings: dict[str, Any], cli_vars: dict[str, str], for_change: bool = False) -> str:
    """Render the resource-action section of a plan."""
    itype, itype_src = _instance_type(findings, cli_vars)
    if for_change:
        return (
            '  # aws_security_group.web will be updated in-place\n'
            '  ~ resource "aws_security_group" "web" {\n'
            f'        id       = "{RESOURCE_IDS["aws_security_group.web"]}"\n'
            '      ~ ingress  = [\n'
            '          ~ {\n'
            '              ~ cidr_blocks = [\n'
            f'                  - "{SSH_OPEN_CIDR}",\n'
            f'                  + "{SSH_FIXED_CIDR}",\n'
            '                ]\n'
            '                # (4 unchanged attributes hidden)\n'
            '            },\n'
            '        ]\n'
            '      # (1 unchanged block hidden)\n'
            '    }\n'
        )
    lines = []
    for r in RESOURCES:
        rtype, rname = r.split('.', 1)
        lines.append(f'  # {r} will be created')
        lines.append(f'  + resource "{rtype}" "{rname}" {{')
        if r == 'aws_vpc.main':
            lines.append('      + cidr_block           = "10.0.0.0/16"')
            lines.append('      + enable_dns_hostnames = true')
        elif r.startswith('aws_subnet'):
            az = 'us-east-1a' if r.endswith('public_a') else 'us-east-1b'
            cidr = '10.0.1.0/24' if r.endswith('public_a') else '10.0.2.0/24'
            lines.append(f'      + availability_zone       = "{az}"')
            lines.append(f'      + cidr_block              = "{cidr}"')
        elif r == 'aws_security_group.web':
            lines.append('      + description = "Allow web traffic and admin access"')
            lines.append('      + ingress     = (2 rules: HTTP 80, SSH 22)')
        elif r == 'aws_instance.web':
            lines.append(f'      + instance_type = "{itype}"')
        elif r == 'aws_s3_bucket.logs':
            lines.append('      + bucket = "road2cissp-app-logs"')
        elif r == 'aws_s3_bucket_versioning.logs':
            lines.append('      + versioning_configuration = [{ status = "Enabled" }]')
        lines.append('    }')
        lines.append('')
    return '\n'.join(lines)


def _plan_output(findings: dict[str, Any], cli_vars: dict[str, str], out_file: str | None) -> tuple[str, dict[str, Any]]:
    """Build plan output + findings for a create plan."""
    applied = findings.get('applied') and not findings.get('destroyed')
    fixed = findings.get('misconfiguration_fixed')
    fix_deployed = findings.get('fix_deployed')

    if applied and fixed and not fix_deployed:
        body = _plan_body(findings, cli_vars, for_change=True)
        summary = 'Plan: 0 to add, 1 to change, 0 to destroy.'
    elif applied:
        no_change_findings: dict[str, Any] = {'plan_done': True}
        if cli_vars:
            merged = dict(findings.get('variables_set') or {})
            merged.update(cli_vars)
            no_change_findings['variables_set'] = merged
        return (
            'No changes. Your infrastructure matches the configuration.\n\n'
            'Terraform has compared your real infrastructure against your configuration and found no differences, '
            'so no actions are needed.',
            no_change_findings,
        )
    else:
        body = _plan_body(findings, cli_vars)
        summary = f'Plan: {len(RESOURCES)} to add, 0 to change, 0 to destroy.'

    head = (
        'Terraform used the selected providers to generate the following execution plan. Resource\n'
        'actions are indicated with the following symbols:\n'
        '  + create\n'
        '  ~ update in-place\n\n'
        'Terraform will perform the following actions:\n\n'
    )
    notes = []
    if not fixed and not applied:
        notes.append(
            f'Note: aws_security_group.web allows SSH (port 22) from {SSH_OPEN_CIDR}. '
            'Review security group rules before applying.'
        )
    if out_file:
        notes.append(f'\nSaved the plan to: {out_file}\n\nTo perform exactly these actions, run: "terraform apply \\"{out_file}\\""')
    new_findings: dict[str, Any] = {'plan_done': True}
    if out_file:
        new_findings['plan_saved'] = out_file
    if cli_vars:
        merged = dict(findings.get('variables_set') or {})
        merged.update(cli_vars)
        new_findings['variables_set'] = merged
    out = head + body + '\n' + summary
    if notes:
        out += '\n\n' + '\n'.join(notes)
    return out, new_findings


def _do_apply(findings: dict[str, Any], cli_vars: dict[str, str], via_plan: str | None) -> CommandResult:
    itype, itype_src = _instance_type(findings, cli_vars)
    lines = []
    for r in RESOURCES:
        lines.append(f'{r}: Creating...')
    lines.append('')
    for r in RESOURCES:
        lines.append(f'{r}: Creation complete after 4s [id={RESOURCE_IDS[r]}]')
    lines.append('')
    fixed = findings.get('misconfiguration_fixed')
    if fixed and findings.get('applied'):
        summary = f'Apply complete! Resources: 0 added, 1 changed, 0 destroyed.'
    else:
        summary = f'Apply complete! Resources: {len(RESOURCES)} added, 0 changed, 0 destroyed.'
    lines.append(summary)
    lines.append('')
    lines.append('Outputs:')
    lines.append('')
    for k in sorted(OUTPUTS):
        lines.append(f'{k} = "{OUTPUTS[k]}"')
    if via_plan:
        lines.insert(0, f'Applying saved plan "{via_plan}"...\n')
    new_findings: dict[str, Any] = {
        'applied': True,
        'ever_applied': True,
        'destroyed': False,
        'applied_resources': list(RESOURCES),
        'pending_apply': False,
        'plan_done': True,
    }
    if fixed:
        new_findings['fix_deployed'] = True
    if cli_vars:
        merged = dict(findings.get('variables_set') or {})
        merged.update(cli_vars)
        new_findings['variables_set'] = merged
    # instance_type actually used (for test introspection)
    new_findings['applied_instance_type'] = itype
    new_findings['applied_instance_type_source'] = itype_src
    return CommandResult(output='\n'.join(lines), findings=new_findings)


def _do_destroy(findings: dict[str, Any]) -> CommandResult:
    lines = []
    for r in reversed(RESOURCES):
        lines.append(f'{r}: Destroying... [id={RESOURCE_IDS[r]}]')
    lines.append('')
    for r in reversed(RESOURCES):
        lines.append(f'{r}: Destruction complete after 2s')
    lines.append('')
    lines.append(f'Destroy complete! Resources: {len(RESOURCES)} destroyed.')
    return CommandResult(output='\n'.join(lines), findings={
        'destroyed': True,
        'applied': False,
        'applied_resources': [],
        'pending_destroy': False,
    })


# ---------------------------------------------------------------------------
# scenario dispatch: 'aws' (terraform-fundamentals-001) or 'k8s' (terraform-k8s-docker-001)
# ---------------------------------------------------------------------------

def _scenario(lab) -> str:
    lab_id = (getattr(lab, "id", "") or "")
    if lab_id == "terraform-aws-001":
        return "tfaws"
    if lab_id == "terraform-azure-001":
        return "azure"
    if "terraform-gcp" in lab_id:
        return "gcp"
    if "proxmox" in lab_id:
        return "proxmox"
    return "k8s" if "k8s-docker" in lab_id else "aws"


def _k8s_files(findings: dict[str, Any]) -> dict[str, str]:
    return findings.get("k8s_files") or {}


def _k8s_replicas(findings: dict[str, Any]) -> int:
    return int(findings.get("k8s_replicas") or K8S_DEFAULT_REPLICAS)


def _hcl_validate(content: str, filename: str, required_blocks: dict | None = None) -> tuple[bool, str]:
    """Lightweight HCL structure check: balanced delimiters + expected blocks.

    required_blocks overrides the built-in per-filename block requirements
    (pass {} to check delimiters only -- used by scenarios that enforce
    their own semantic rules at `terraform validate` time).
    """
    stripped = "\n".join(
        line for line in content.splitlines()
        if line.strip() and not line.strip().startswith("#") and not line.strip().startswith("//")
    )
    for open_c, close_c, name in [("{", "}", "braces"), ("[", "]", "brackets"), ('"', '"', "quotes")]:
        if open_c == '"':
            # crude: even number of unescaped quotes per file
            if stripped.count('"') % 2 != 0:
                return False, f"unbalanced {name} in {filename}"
        elif stripped.count(open_c) != stripped.count(close_c):
            return False, f"unbalanced {name} in {filename}: {stripped.count(open_c)} '{open_c}' vs {stripped.count(close_c)} '{close_c}'"
    required = {
        "k8s.tf": ['resource "kubernetes_deployment"', 'resource "kubernetes_service"', 'resource "kubernetes_config_map"'],
        "docker.tf": ['resource "docker_image"', 'resource "docker_container"'],
        "variables.tf": ["variable "],
        "outputs.tf": ["output "],
        "main.tf": ['terraform {', 'provider "kubernetes"', 'provider "docker"'],
    } if required_blocks is None else required_blocks
    need = required.get(filename.split("/")[-1], [])
    missing = [b for b in need if b not in content]
    if missing:
        return False, f"{filename} is missing required block(s): {', '.join(missing)}"
    return True, "HCL structure looks valid."


def _k8s_plan_body(findings: dict[str, Any], for_change: bool = False) -> str:
    if for_change:
        rep = _k8s_replicas(findings)
        return (
            '  # kubernetes_deployment.web will be updated in-place\n'
            '  ~ resource "kubernetes_deployment" "web" {\n'
            '      ~ spec {\n'
            f'          ~ replicas = {K8S_DEFAULT_REPLICAS} -> {rep}\n'
            '            # (labels, selector, template unchanged)\n'
            '        }\n'
            '    }\n'
        )
    lines = []
    for r in K8S_RESOURCES:
        rtype, rname = r.split(".", 1)
        lines.append(f"  # {r} will be created")
        lines.append(f'  + resource "{rtype}" "{rname}" {{')
        if r == "kubernetes_namespace.app":
            lines.append('      + metadata = [{ name = "app" }]')
        elif r == "kubernetes_config_map.app_config":
            lines.append('      + data = { LOG_LEVEL = "info", API_URL = "https://api.example.internal" }')
        elif r == "kubernetes_deployment.web":
            lines.append(f'      + spec = [{{ replicas = {_k8s_replicas(findings)} }}]')
        elif r == "kubernetes_service.web":
            lines.append('      + spec = [{ type = "ClusterIP", port = 80 }]')
        elif r == "docker_image.app":
            lines.append('      + name = "road2cissp/app:latest"')
        elif r == "docker_network.app_net":
            lines.append('      + name = "app-net"')
        elif r == "docker_volume.cache_data":
            lines.append('      + name = "cache-data"')
        elif r == "docker_container.cache":
            lines.append('      + name = "redis-cache"')
            lines.append('      + image = "redis:7-alpine"')
        lines.append("    }")
        lines.append("")
    return "\n".join(lines)


def _k8s_plan_output(findings: dict[str, Any], out_file: str | None) -> tuple[str, dict[str, Any]]:
    applied = findings.get("k8s_applied") and not findings.get("k8s_destroyed")
    scaled = _k8s_replicas(findings) != K8S_DEFAULT_REPLICAS
    if applied and scaled and not findings.get("k8s_scale_deployed"):
        body = _k8s_plan_body(findings, for_change=True)
        summary = "Plan: 0 to add, 1 to change, 0 to destroy."
    elif applied:
        return (
            "No changes. Your infrastructure matches the configuration.\n\n"
            "Terraform has compared your real infrastructure against your configuration and found no differences, "
            "so no actions are needed.",
            {"k8s_plan_done": True},
        )
    else:
        body = _k8s_plan_body(findings)
        summary = f"Plan: {len(K8S_RESOURCES)} to add, 0 to change, 0 to destroy."
    head = (
        "Terraform used the selected providers to generate the following execution plan. Resource\n"
        "actions are indicated with the following symbols:\n"
        "  + create\n"
        "  ~ update in-place\n\n"
        "Terraform will perform the following actions:\n\n"
    )
    out = head + body + "\n" + summary
    new_findings: dict[str, Any] = {"k8s_plan_done": True}
    if out_file:
        new_findings["k8s_plan_saved"] = out_file
        out += f'\n\nSaved the plan to: {out_file}\n\nTo perform exactly these actions, run: "terraform apply \"{out_file}\""'
    return out, new_findings


def _k8s_do_apply(findings: dict[str, Any], via_plan: str | None) -> CommandResult:
    lines = []
    for r in K8S_RESOURCES:
        lines.append(f"{r}: Creating...")
    lines.append("")
    for r in K8S_RESOURCES:
        lines.append(f"{r}: Creation complete after 3s [id={K8S_RESOURCE_IDS[r]}]")
    lines.append("")
    if findings.get("k8s_applied") and _k8s_replicas(findings) != K8S_DEFAULT_REPLICAS:
        summary = "Apply complete! Resources: 0 added, 1 changed, 0 destroyed."
    else:
        summary = f"Apply complete! Resources: {len(K8S_RESOURCES)} added, 0 changed, 0 destroyed."
    lines.append(summary)
    lines.append("")
    lines.append("Outputs:")
    lines.append("")
    outs = dict(K8S_OUTPUTS)
    outs["web_replicas"] = str(_k8s_replicas(findings))
    for k in sorted(outs):
        lines.append(f'{k} = "{outs[k]}"')
    if via_plan:
        lines.insert(0, f'Applying saved plan "{via_plan}"...\n')
    new_findings: dict[str, Any] = {
        "k8s_applied": True,
        "k8s_ever_applied": True,
        "k8s_destroyed": False,
        "k8s_applied_resources": list(K8S_RESOURCES),
        "k8s_pending_apply": False,
        "k8s_plan_done": True,
    }
    if _k8s_replicas(findings) != K8S_DEFAULT_REPLICAS:
        new_findings["k8s_scale_deployed"] = True
    return CommandResult(output="\n".join(lines), findings=new_findings)


def _k8s_do_destroy(findings: dict[str, Any]) -> CommandResult:
    lines = []
    for r in reversed(K8S_RESOURCES):
        lines.append(f"{r}: Destroying... [id={K8S_RESOURCE_IDS[r]}]")
    lines.append("")
    for r in reversed(K8S_RESOURCES):
        lines.append(f"{r}: Destruction complete after 2s")
    lines.append("")
    lines.append(f"Destroy complete! Resources: {len(K8S_RESOURCES)} destroyed.")
    return CommandResult(output="\n".join(lines), findings={
        "k8s_destroyed": True,
        "k8s_applied": False,
        "k8s_applied_resources": [],
        "k8s_pending_destroy": False,
    })


# ---------------------------------------------------------------------------
# command implementations
# ---------------------------------------------------------------------------

def _cmd_init(findings: dict[str, Any]) -> CommandResult:
    out = (
        'Initializing the backend...\n'
        'Initializing provider plugins...\n'
        '- Finding hashicorp/aws versions matching "~> 5.0"...\n'
        '- Installing hashicorp/aws v5.31.0...\n'
        '- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)\n\n'
        'Terraform has been successfully initialized!'
    )
    return CommandResult(output=out, findings={'init_done': True})


def _cmd_validate(findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    return CommandResult(output='Success! The configuration is valid.', findings={'validated': True})


def _cmd_fmt(args: list[str]) -> CommandResult:
    files = ['main.tf', 'outputs.tf', 'variables.tf']
    if _has_flag(args, '-check'):
        return CommandResult(output='')
    if _has_flag(args, '-diff'):
        return CommandResult(output='No formatting differences.')
    return CommandResult(output='\n'.join(files), findings={'formatted': True})


def _cmd_version() -> CommandResult:
    return CommandResult(output='Terraform v1.9.0\non linux_amd64')


def _cmd_plan(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    cli_vars, rest = _extract_vars(args)
    out_file = None
    for a in rest:
        if a.startswith('-out='):
            out_file = a[5:]
        elif a == '-out' :
            out_file = 'tfplan'
    # support bare `-out tfplan` form
    for i, a in enumerate(rest):
        if a == '-out' and i + 1 < len(rest) and not rest[i + 1].startswith('-'):
            out_file = rest[i + 1]
    out, new_findings = _plan_output(findings, cli_vars, out_file)
    return CommandResult(output=out, findings=new_findings)


def _cmd_apply(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    cli_vars, rest = _extract_vars(args)
    auto = _has_flag(args, '-auto-approve')
    plan_file = next((a for a in rest if not a.startswith('-')), None)

    if plan_file:
        saved = findings.get('plan_saved')
        if saved and plan_file == saved:
            return _do_apply(findings, cli_vars, via_plan=plan_file)
        return CommandResult(
            output=f'Error: Failed to read plan file "{plan_file}": no such saved plan. Run "terraform plan -out={plan_file}" first.',
            exit_code=1,
        )
    if auto:
        return _do_apply(findings, cli_vars, via_plan=None)
    # interactive confirmation flow
    out, plan_findings = _plan_output(findings, cli_vars, None)
    out += '\n\nDo you want to perform these actions?\n  Terraform will perform the actions described above.\n  Only \'yes\' will be accepted to approve.\n\n  Enter a value: '
    plan_findings['pending_apply'] = True
    if cli_vars:
        plan_findings['pending_cli_vars'] = cli_vars
    return CommandResult(output=out, findings=plan_findings)


def _cmd_destroy(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not findings.get('applied'):
        return _need_apply()
    if _has_flag(args, '-auto-approve'):
        return _do_destroy(findings)
    body = '\n'.join(f'  - {r}' for r in RESOURCES)
    out = (
        'Terraform will perform the following actions:\n\n'
        f'{body}\n\n'
        f'Plan: 0 to add, 0 to change, {len(RESOURCES)} to destroy.\n\n'
        'Do you really want to destroy all resources?\n'
        '  Terraform will destroy all your managed infrastructure, as shown above.\n'
        '  There is no undo. Only \'yes\' will be accepted to confirm.\n\n'
        '  Enter a value: '
    )
    return CommandResult(output=out, findings={'pending_destroy': True})


def _cmd_show(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if args and not args[0].startswith('-'):
        plan_file = args[0]
        if findings.get('plan_saved') == plan_file:
            out, _ = _plan_output(findings, {}, None)
            return CommandResult(output=f'# Saved plan "{plan_file}":\n\n' + out)
        return CommandResult(output=f'Error: no saved plan "{plan_file}".', exit_code=1)
    if not findings.get('applied'):
        return CommandResult(output='No state. Run "terraform apply" first.', exit_code=1)
    lines = ['# terraform show: current state']
    for r in RESOURCES:
        lines.append(f'# {r}:')
        lines.append(f'  id = "{RESOURCE_IDS[r]}"')
    lines.append('')
    lines.append('Outputs:')
    for k in sorted(OUTPUTS):
        lines.append(f'  {k} = "{OUTPUTS[k]}"')
    return CommandResult(output='\n'.join(lines))


def _cmd_state(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if len(args) < 1:
        return CommandResult(output='Usage: terraform state <list>', exit_code=1)
    if args[0] != 'list':
        return CommandResult(output=f'Terraform has no "state {args[0]}" command in this lab.', exit_code=1)
    if not findings.get('applied'):
        return _need_apply()
    resources = findings.get('applied_resources') or RESOURCES
    return CommandResult(
        output='\n'.join(sorted(resources)),
        findings={'state_viewed': True},
    )


def _cmd_output(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not findings.get('applied'):
        return _need_apply()
    names = [a for a in args if not a.startswith('-')]
    if names:
        name = names[0]
        if name in OUTPUTS:
            return CommandResult(output=f'"{OUTPUTS[name]}"', findings={'outputs_viewed': True})
        return CommandResult(output=f'Error: output "{name}" is not defined.', exit_code=1)
    lines = [f'{k} = "{v}"' for k, v in sorted(OUTPUTS.items())]
    return CommandResult(output='\n'.join(lines), findings={'outputs_viewed': True})


def _cmd_workspace(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not args:
        return CommandResult(output='Usage: terraform workspace <list|new|select> [name]', exit_code=1)
    sub = args[0]
    workspaces = list(findings.get('workspaces') or ['default'])
    current = findings.get('workspace') or 'default'
    if sub == 'list':
        lines = [('* ' if w == current else '  ') + w for w in workspaces]
        return CommandResult(output='\n'.join(lines))
    if sub == 'new':
        if len(args) < 2:
            return CommandResult(output='Usage: terraform workspace new <name>', exit_code=1)
        name = args[1]
        if name in workspaces:
            return CommandResult(output=f'Error: workspace "{name}" already exists.', exit_code=1)
        workspaces.append(name)
        out = (
            f'Created and switched to workspace "{name}"!\n\n'
            "You're now on a new, empty workspace. Workspaces isolate their Terraform state,\n"
            'so if you run "terraform plan" Terraform will not see any existing state\n'
            'for this configuration.'
        )
        return CommandResult(output=out, findings={
            'workspaces': workspaces,
            'workspace': name,
            'workspace_created': True,
        })
    if sub in ('select', 'switch'):
        if len(args) < 2:
            return CommandResult(output='Usage: terraform workspace select <name>', exit_code=1)
        name = args[1]
        if name not in workspaces:
            return CommandResult(output=f'Error: workspace "{name}" does not exist.', exit_code=1)
        return CommandResult(output=f'Switched to workspace "{name}".', findings={'workspace': name})
    return CommandResult(output=f'Error: unknown workspace subcommand "{sub}".', exit_code=1)


def _cmd_terraform(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not args:
        return CommandResult(output='Usage: terraform <init|validate|fmt|plan|apply|destroy|show|state|output|workspace|version>', exit_code=1)
    sub = args[0]
    rest = args[1:]
    if sub == 'init':
        return _cmd_init(findings)
    if sub == 'validate':
        return _cmd_validate(findings)
    if sub == 'fmt':
        return _cmd_fmt(rest)
    if sub == 'version':
        return _cmd_version()
    if sub == 'plan':
        return _cmd_plan(rest, findings)
    if sub == 'apply':
        return _cmd_apply(rest, findings)
    if sub == 'destroy':
        return _cmd_destroy(rest, findings)
    if sub == 'show':
        return _cmd_show(rest, findings)
    if sub == 'state':
        return _cmd_state(rest, findings)
    if sub == 'output':
        return _cmd_output(rest, findings)
    if sub == 'workspace':
        return _cmd_workspace(rest, findings)
    return CommandResult(output=f'Terraform has no command named "{sub}".', exit_code=1)


def _cmd_cat(args: list[str]) -> CommandResult:
    files = {
        'main.tf': (MAIN_TF, {'config_viewed': True}),
        'variables.tf': (VARIABLES_TF, {}),
        'terraform.tfvars': (TERRAFORM_TFVARS, {}),
        'outputs.tf': (OUTPUTS_TF, {}),
    }
    if not args:
        return CommandResult(output='Usage: cat <file>', exit_code=1)
    name = args[0].split('/')[-1]
    if name in files:
        content, f = files[name]
        return CommandResult(output=content, findings=dict(f))
    return CommandResult(output=f'cat: {args[0]}: No such file or directory', exit_code=1)


def _cmd_ls(findings: dict[str, Any]) -> CommandResult:
    files = ['main.tf', 'outputs.tf', 'terraform.tfvars', 'variables.tf']
    if findings.get('init_done'):
        files += ['.terraform/', '.terraform.lock.hcl']
    if findings.get('plan_saved'):
        files.append(findings['plan_saved'])
    if findings.get('applied'):
        files.append('terraform.tfstate')
        ws = findings.get('workspace') or 'default'
        if ws != 'default':
            files.append('terraform.tfstate.d/')
    return CommandResult(output='  '.join(files))


def _cmd_edit(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not args or args[0].split('/')[-1] != 'main.tf':
        return CommandResult(
            output='Simulated editor: only main.tf has a patch available in this lab (usage: edit main.tf).',
            exit_code=1,
        )
    if findings.get('misconfiguration_fixed'):
        return CommandResult(output='main.tf already patched: SSH ingress is restricted to 10.0.0.0/8.')
    out = (
        'Simulated editor: main.tf updated.\n'
        '  ~ aws_security_group.web ingress "SSH":\n'
        f'      cidr_blocks = ["{SSH_OPEN_CIDR}"]  ->  ["{SSH_FIXED_CIDR}"]\n\n'
        'Run `terraform plan` to preview the change, then `terraform apply` to deploy it.'
    )
    return CommandResult(output=out, findings={'misconfiguration_fixed': True})


def _cmd_export(raw: str, findings: dict[str, Any]) -> CommandResult:
    # export TF_VAR_name=value
    body = raw[len('export'):].strip()
    if '=' not in body:
        return CommandResult(output=f'export: usage: export TF_VAR_<name>=<value>', exit_code=1)
    k, _, v = body.partition('=')
    k, v = k.strip(), v.strip().strip('"').strip("'")
    if not k.startswith('TF_VAR_'):
        return CommandResult(output=f'export: only TF_VAR_* variables affect Terraform in this lab.', exit_code=1)
    name = k[len('TF_VAR_'):]
    if not name:
        return CommandResult(output='export: usage: export TF_VAR_<name>=<value>', exit_code=1)
    merged = dict(findings.get('variables_set') or {})
    merged[name] = v
    return CommandResult(output='', findings={'variables_set': merged, 'env_vars_set': True})


def _cmd_env(findings: dict[str, Any]) -> CommandResult:
    variables = findings.get('variables_set') or {}
    tf_vars = [f'TF_VAR_{k}={v}' for k, v in sorted(variables.items())]
    base = ['PATH=/usr/local/bin:/usr/bin:/bin', 'HOME=/home/student']
    return CommandResult(output='\n'.join(base + tf_vars))


# ---------------------------------------------------------------------------
# k8s scenario: terraform subcommands + write
# ---------------------------------------------------------------------------

def _k8s_cmd_init(findings: dict[str, Any]) -> CommandResult:
    out = (
        "Initializing the backend...\n"
        "Initializing provider plugins...\n"
        '- Finding hashicorp/kubernetes versions matching "~> 2.30"...\n'
        "- Installing hashicorp/kubernetes v2.30.0...\n"
        "- Installed hashicorp/kubernetes v2.30.0 (signed by HashiCorp)\n"
        '- Finding kreuzwerker/docker versions matching "~> 3.0"...\n'
        "- Installing kreuzwerker/docker v3.0.2...\n"
        "- Installed kreuzwerker/docker v3.0.2 (self-signed, key ID 24E54F2145695F75)\n\n"
        "Terraform has been successfully initialized!"
    )
    return CommandResult(output=out, findings={"init_done": True, "k8s_init_done": True})


def _k8s_cmd_validate(findings: dict[str, Any]) -> CommandResult:
    if not findings.get("init_done"):
        return _need_init()
    files = _k8s_files(findings)
    # validate checks the files the student has written so far
    problems = []
    for name, content in files.items():
        ok, msg = _hcl_validate(content, name)
        if not ok:
            problems.append(f"{name}: {msg}")
    if problems:
        return CommandResult(
            output="Error: configuration invalid.\n" + "\n".join(problems),
            exit_code=1,
        )
    return CommandResult(output="Success! The configuration is valid.", findings={"validated": True})


def _k8s_cmd_plan(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get("init_done"):
        return _need_init()
    cli_vars, rest = _extract_vars(args)
    out_file = None
    for i, a in enumerate(rest):
        if a.startswith("-out="):
            out_file = a[5:]
        elif a == "-out" and i + 1 < len(rest) and not rest[i + 1].startswith("-"):
            out_file = rest[i + 1]
    if cli_vars:
        merged = dict(findings.get("variables_set") or {})
        merged.update(cli_vars)
        findings = dict(findings, variables_set=merged)
    out, new_findings = _k8s_plan_output(findings, out_file)
    return CommandResult(output=out, findings=new_findings)


def _k8s_cmd_apply(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get("init_done"):
        return _need_init()
    cli_vars, rest = _extract_vars(args)
    auto = _has_flag(args, "-auto-approve")
    plan_file = next((a for a in rest if not a.startswith("-")), None)
    if plan_file:
        saved = findings.get("k8s_plan_saved")
        if saved and plan_file == saved:
            return _k8s_do_apply(findings, via_plan=plan_file)
        return CommandResult(
            output=f'Error: Failed to read plan file "{plan_file}": no such saved plan.',
            exit_code=1,
        )
    if auto:
        return _k8s_do_apply(findings, via_plan=None)
    out, plan_findings = _k8s_plan_output(findings, None)
    out += "\n\nDo you want to perform these actions?\n  Only 'yes' will be accepted to approve.\n\n  Enter a value: "
    plan_findings["k8s_pending_apply"] = True
    return CommandResult(output=out, findings=plan_findings)


def _k8s_cmd_destroy(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get("init_done"):
        return _need_init()
    if not findings.get("k8s_applied"):
        return CommandResult(output='Error: No state. Run "terraform apply" before destroying.', exit_code=1)
    if _has_flag(args, "-auto-approve"):
        return _k8s_do_destroy(findings)
    body = "\n".join(f"  - {r}" for r in K8S_RESOURCES)
    out = (
        "Terraform will perform the following actions:\n\n"
        f"{body}\n\n"
        f"Plan: 0 to add, 0 to change, {len(K8S_RESOURCES)} to destroy.\n\n"
        "Do you really want to destroy all resources?\n"
        "  There is no undo. Only 'yes' will be accepted to confirm.\n\n"
        "  Enter a value: "
    )
    return CommandResult(output=out, findings={"k8s_pending_destroy": True})


def _k8s_cmd_show(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get("init_done"):
        return _need_init()
    if not findings.get("k8s_applied"):
        return CommandResult(output='No state. Run "terraform apply" first.', exit_code=1)
    lines = ["# terraform show: current state"]
    for r in K8S_RESOURCES:
        lines.append(f"# {r}:")
        lines.append(f'  id = "{K8S_RESOURCE_IDS[r]}"')
    lines.append("")
    lines.append("Outputs:")
    outs = dict(K8S_OUTPUTS)
    outs["web_replicas"] = str(_k8s_replicas(findings))
    for k in sorted(outs):
        lines.append(f'  {k} = "{outs[k]}"')
    return CommandResult(output="\n".join(lines))


def _k8s_cmd_state(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get("init_done"):
        return _need_init()
    if not args or args[0] != "list":
        return CommandResult(output="Usage: terraform state <list>", exit_code=1)
    if not findings.get("k8s_applied"):
        return CommandResult(output='Error: No state. Run "terraform apply" before inspecting state.', exit_code=1)
    resources = findings.get("k8s_applied_resources") or K8S_RESOURCES
    return CommandResult(output="\n".join(sorted(resources)), findings={"k8s_state_viewed": True})


def _k8s_cmd_output(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get("init_done"):
        return _need_init()
    if not findings.get("k8s_applied"):
        return CommandResult(output='Error: No state. Run "terraform apply" before inspecting outputs.', exit_code=1)
    outs = dict(K8S_OUTPUTS)
    outs["web_replicas"] = str(_k8s_replicas(findings))
    names = [a for a in args if not a.startswith("-")]
    if names:
        name = names[0]
        if name in outs:
            return CommandResult(output=f'"{outs[name]}"', findings={"k8s_outputs_viewed": True})
        return CommandResult(output=f'Error: output "{name}" is not defined.', exit_code=1)
    lines = [f'{k} = "{v}"' for k, v in sorted(outs.items())]
    return CommandResult(output="\n".join(lines), findings={"k8s_outputs_viewed": True})


def _cmd_k8s_terraform(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not args:
        return CommandResult(output="Usage: terraform <init|validate|plan|apply|destroy|show|state|output|version>", exit_code=1)
    sub = args[0]
    rest = args[1:]
    if sub == "init":
        return _k8s_cmd_init(findings)
    if sub == "validate":
        return _k8s_cmd_validate(findings)
    if sub == "plan":
        return _k8s_cmd_plan(rest, findings)
    if sub == "apply":
        return _k8s_cmd_apply(rest, findings)
    if sub == "destroy":
        return _k8s_cmd_destroy(rest, findings)
    if sub == "show":
        return _k8s_cmd_show(rest, findings)
    if sub == "state":
        return _k8s_cmd_state(rest, findings)
    if sub == "output":
        return _k8s_cmd_output(rest, findings)
    if sub == "fmt":
        return CommandResult(output="main.tf\nk8s.tf\ndocker.tf\nvariables.tf\noutputs.tf")
    if sub == "version":
        return _cmd_version()
    return CommandResult(output=f'Terraform has no command named "{sub}".', exit_code=1)


def _cmd_write(raw: str, findings: dict[str, Any]) -> CommandResult:
    """write <file> — heredoc-style: content follows on later lines, ends with EOF.

    Validates HCL structure and records the file. Detects replica changes.
    """
    lines = raw.split("\n")
    first = lines[0].strip().split()
    if len(first) < 2:
        return CommandResult(output="Usage: write <file>\n  then paste HCL lines, ending with a line containing only EOF", exit_code=1)
    filename = first[1].split("/")[-1]
    if not filename.endswith(".tf"):
        return CommandResult(output=f"write: {filename}: only .tf files can be written in this lab.", exit_code=1)
    # collect heredoc body
    body_lines = []
    for line in lines[1:]:
        if line.strip() == "EOF":
            break
        body_lines.append(line)
    else:
        return CommandResult(
            output="write: heredoc not terminated — end your content with a line containing only EOF.",
            exit_code=1,
        )
    content = "\n".join(body_lines).strip("\n")
    if not content.strip():
        return CommandResult(output=f"write: {filename}: empty content, nothing written.", exit_code=1)
    ok, msg = _hcl_validate(content, filename)
    if not ok:
        return CommandResult(output=f"write: {msg}", exit_code=1)
    files = dict(_k8s_files(findings))
    files[filename] = content
    new_findings: dict[str, Any] = {"k8s_files": files, "k8s_wrote_file": filename}
    # detect replica changes for the scaling objective
    import re as _re
    m = _re.search(r"replicas\s*=\s*(\d+)", content)
    if m and filename in ("k8s.tf", "main.tf"):
        new_findings["k8s_replicas"] = int(m.group(1))
    return CommandResult(
        output=f"Wrote {len(content.splitlines())} lines to {filename}. {msg}\nRun `terraform validate` to check it.",
        findings=new_findings,
    )


def _k8s_cmd_cat(args: list[str], findings: dict[str, Any]) -> CommandResult:
    files = _k8s_files(findings)
    starter = {"main.tf": K8S_MAIN_TF}
    if not args:
        return CommandResult(output="Usage: cat <file>", exit_code=1)
    name = args[0].split("/")[-1]
    if name in files:
        return CommandResult(output=files[name], findings={"k8s_config_viewed": True})
    if name in starter:
        return CommandResult(output=starter[name], findings={"k8s_config_viewed": True})
    return CommandResult(output=f"cat: {args[0]}: No such file or directory", exit_code=1)


def _k8s_cmd_ls(findings: dict[str, Any]) -> CommandResult:
    files = ["main.tf"] + sorted(_k8s_files(findings).keys())
    # dedupe main.tf if student overwrote it
    seen = []
    for f in files:
        if f not in seen:
            seen.append(f)
    if findings.get("init_done"):
        seen += [".terraform/", ".terraform.lock.hcl"]
    if findings.get("k8s_plan_saved"):
        seen.append(findings["k8s_plan_saved"])
    if findings.get("k8s_applied"):
        seen.append("terraform.tfstate")
    return CommandResult(output="  ".join(seen))


# ---------------------------------------------------------------------------
# GCP scenario (terraform-gcp-001): the student WRITES every .tf file.
#
# The working directory starts empty. `write <file>` accepts a heredoc:
#   write versions.tf
#   <HCL lines>
#   EOF
# (all sent as one multi-line command). Validators inspect the written HCL
# for required blocks/attributes. `terraform validate` checks HCL structure
# (balanced delimiters). Findings keys are `gcp_`-prefixed to avoid collisions
# with the aws/k8s scenarios sharing this shell.
# ---------------------------------------------------------------------------

GCP_RESOURCES = [
    'google_compute_network.main',
    'google_compute_subnetwork.public_a',
    'google_compute_subnetwork.public_b',
    'google_compute_instance.web',
    'google_storage_bucket.logs',
    'google_compute_firewall.allow_http',
    'google_compute_firewall.allow_ssh',
    'google_project_iam_binding.log_viewer',
]

GCP_RESOURCE_IDS = {
    'google_compute_network.main': 'projects/road2cissp/global/networks/road2cissp-vpc',
    'google_compute_subnetwork.public_a': 'projects/road2cissp/regions/us-central1/subnetworks/road2cissp-public-a',
    'google_compute_subnetwork.public_b': 'projects/road2cissp/regions/us-central1/subnetworks/road2cissp-public-b',
    'google_compute_instance.web': 'projects/road2cissp/zones/us-central1-a/instances/road2cissp-web',
    'google_storage_bucket.logs': 'road2cissp-app-logs',
    'google_compute_firewall.allow_http': 'projects/road2cissp/global/firewalls/allow-http',
    'google_compute_firewall.allow_ssh': 'projects/road2cissp/global/firewalls/allow-ssh',
    'google_project_iam_binding.log_viewer': 'road2cissp/roles/logging.viewer',
}

GCP_OUTPUTS = {
    'vpc_id': 'projects/road2cissp/global/networks/road2cissp-vpc',
    'web_external_ip': '34.122.18.7',
    'logs_bucket': 'road2cissp-app-logs',
}

GCP_EXPECTED_FILES = [
    'versions.tf', 'network.tf', 'compute.tf', 'storage.tf',
    'security.tf', 'variables.tf', 'outputs.tf', 'backend.tf',
]


def _gcp_files(findings: dict[str, Any]) -> dict[str, str]:
    return findings.get('gcp_files') or {}


def _gcp_ssh_fixed(findings: dict[str, Any]) -> bool:
    """True when the written allow_ssh rule no longer opens SSH to 0.0.0.0/0."""
    sec = _gcp_files(findings).get('security.tf', '')
    idx = sec.find('google_compute_firewall" "allow_ssh')
    if idx == -1:
        return False
    nxt = sec.find('\nresource ', idx + 1)
    block = sec[idx:nxt if nxt != -1 else len(sec)]
    return '0.0.0.0/0' not in block


def _gcp_prompt() -> str:
    return 'student@gcp:~/gcp-infra$ '


def _gcp_banner() -> list[str]:
    return [
        'Road to CISSP - Terraform for GCP lab   (simulated: nothing is really provisioned)',
        'You WRITE every .tf file yourself: provider -> network -> compute -> storage ->',
        'security -> variables/outputs -> remote state. Each objective teaches the exact HCL,',
        'line by line. Use `write <file>`, paste your HCL, end with EOF on its own line.',
        'Try: ls · write versions.tf · terraform init · terraform validate',
    ]


def _gcp_cmd_write(raw: str, findings: dict[str, Any]) -> CommandResult:
    """write <file> with heredoc body terminated by EOF (single multi-line command)."""
    lines = raw.split('\n')
    first = lines[0].strip().split()
    if len(first) < 2:
        return CommandResult(
            output='Usage: write <file.tf>\n  then paste HCL lines, ending with a line containing only EOF',
            exit_code=1,
        )
    filename = first[1].split('/')[-1]
    if not filename.endswith('.tf'):
        return CommandResult(output=f'write: {filename}: only .tf files can be written in this lab.', exit_code=1)
    body_lines = []
    for line in lines[1:]:
        if line.strip() == 'EOF':
            break
        body_lines.append(line)
    else:
        return CommandResult(
            output='write: heredoc not terminated - end your content with a line containing only EOF.',
            exit_code=1,
        )
    content = '\n'.join(body_lines).strip('\n')
    if not content.strip():
        return CommandResult(output=f'write: {filename}: empty content, nothing written.', exit_code=1)
    ok, msg = _hcl_validate(content, filename)
    if not ok:
        return CommandResult(output=f'write: HCL structure error: {msg}', exit_code=1)
    files = dict(_gcp_files(findings))
    files[filename] = content
    return CommandResult(
        output=f'Wrote {len(content.splitlines())} lines to {filename}. {msg}\nRun `terraform validate` to check it.',
        findings={'gcp_files': files, 'gcp_wrote_file': filename},
    )


def _gcp_cmd_cat(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not args:
        return CommandResult(output='Usage: cat <file>', exit_code=1)
    name = args[0].split('/')[-1]
    files = _gcp_files(findings)
    if name in files:
        return CommandResult(output=files[name], findings={'gcp_config_viewed': True})
    if name in GCP_EXPECTED_FILES:
        return CommandResult(
            output=f'# {name} has not been written yet.\n# Use: write {name}  (paste HCL, end with EOF)'
        )
    return CommandResult(output=f'cat: {args[0]}: No such file or directory', exit_code=1)


def _gcp_cmd_ls(findings: dict[str, Any]) -> CommandResult:
    files = sorted(_gcp_files(findings).keys())
    if not files:
        return CommandResult(output='(empty directory - no .tf files yet. Start with: write versions.tf)')
    if findings.get('init_done'):
        files += ['.terraform/', '.terraform.lock.hcl']
    if findings.get('gcp_plan_saved'):
        files.append(findings['gcp_plan_saved'])
    if findings.get('gcp_applied'):
        files.append('terraform.tfstate')
    return CommandResult(output='  '.join(files))


def _gcp_cmd_init(findings: dict[str, Any]) -> CommandResult:
    files = _gcp_files(findings)
    if 'backend.tf' in files:
        out = (
            'Initializing the backend...\n'
            'Successfully configured the backend "gcs"! Terraform will automatically\n'
            'use this backend unless the backend configuration changes.\n\n'
            'Initializing provider plugins...\n'
            '- Finding hashicorp/google versions matching "~> 5.0"...\n'
            '- Installing hashicorp/google v5.45.0...\n'
            '- Installed hashicorp/google v5.45.0 (signed by HashiCorp)\n\n'
            'Terraform has been successfully initialized!'
        )
        return CommandResult(output=out, findings={'init_done': True, 'gcp_backend_migrated': True})
    out = (
        'Initializing the backend...\n'
        'Initializing provider plugins...\n'
        '- Finding hashicorp/google versions matching "~> 5.0"...\n'
        '- Installing hashicorp/google v5.45.0...\n'
        '- Installed hashicorp/google v5.45.0 (signed by HashiCorp)\n\n'
        'Terraform has been successfully initialized!'
    )
    return CommandResult(output=out, findings={'init_done': True})


def _gcp_cmd_validate(findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    files = _gcp_files(findings)
    if not files:
        return CommandResult(
            output='Success! The configuration is valid. (No .tf files written yet - nothing to check.)',
            findings={'validated': True},
        )
    problems = []
    for name in sorted(files):
        ok, msg = _hcl_validate(files[name], name)
        if not ok:
            problems.append(f'{name}: {msg}')
    if problems:
        return CommandResult(
            output='HCL structure errors:\n' + '\n'.join(f'  - {p}' for p in problems),
            exit_code=1,
        )
    return CommandResult(
        output=f'Success! The configuration is valid. ({len(files)} .tf files checked)',
        findings={'validated': True},
    )


def _gcp_plan_body() -> str:
    lines = []
    for r in GCP_RESOURCES:
        rtype, rname = r.split('.', 1)
        lines.append(f'  # {r} will be created')
        lines.append(f'  + resource "{rtype}" "{rname}" {{')
        if r == 'google_compute_network.main':
            lines.append('      + auto_create_subnetworks = false')
            lines.append('      + name                    = "road2cissp-vpc"')
        elif r.startswith('google_compute_subnetwork'):
            cidr = '10.0.1.0/24' if r.endswith('public_a') else '10.0.2.0/24'
            lines.append(f'      + ip_cidr_range = "{cidr}"')
            lines.append('      + region        = "us-central1"')
        elif r == 'google_compute_instance.web':
            lines.append('      + machine_type = "e2-micro"')
            lines.append('      + zone         = "us-central1-a"')
        elif r == 'google_storage_bucket.logs':
            lines.append('      + location = "us-central1"')
            lines.append('      + name     = "road2cissp-app-logs"')
        elif r == 'google_compute_firewall.allow_http':
            lines.append('      + allow         = [{ ports = ["80"], protocol = "tcp" }]')
            lines.append('      + source_ranges = ["0.0.0.0/0"]')
        elif r == 'google_compute_firewall.allow_ssh':
            lines.append('      + allow         = [{ ports = ["22"], protocol = "tcp" }]')
            lines.append('      + source_ranges = ["0.0.0.0/0"]')
        elif r == 'google_project_iam_binding.log_viewer':
            lines.append('      + role    = "roles/logging.viewer"')
            lines.append('      + members = ["user:analyst@example.com"]')
        lines.append('    }')
        lines.append('')
    return '\n'.join(lines)


def _gcp_plan_output(findings: dict[str, Any], out_file: str | None) -> tuple[str, dict[str, Any]]:
    applied = findings.get('gcp_applied') and not findings.get('destroyed')
    fixed = _gcp_ssh_fixed(findings) or findings.get('gcp_misconfiguration_fixed')
    fix_deployed = findings.get('gcp_fix_deployed')

    if applied and fixed and not fix_deployed:
        body = (
            '  # google_compute_firewall.allow_ssh will be updated in-place\n'
            '  ~ resource "google_compute_firewall" "allow_ssh" {\n'
            '      ~ source_ranges = [\n'
            '          - "0.0.0.0/0",\n'
            '          + "10.0.0.0/8",\n'
            '        ]\n'
            '      # (3 unchanged attributes hidden)\n'
            '    }\n'
        )
        summary = 'Plan: 0 to add, 1 to change, 0 to destroy.'
    elif applied:
        return (
            'No changes. Your infrastructure matches the configuration.\n\n'
            'Terraform has compared your real infrastructure against your configuration and found no differences, '
            'so no actions are needed.',
            {'plan_done': True},
        )
    else:
        body = _gcp_plan_body()
        summary = f'Plan: {len(GCP_RESOURCES)} to add, 0 to change, 0 to destroy.'

    head = (
        'Terraform used the selected providers to generate the following execution plan. Resource\n'
        'actions are indicated with the following symbols:\n'
        '  + create\n'
        '  ~ update in-place\n\n'
        'Terraform will perform the following actions:\n\n'
    )
    notes = []
    if not fixed and not applied:
        notes.append(
            'Note: google_compute_firewall.allow_ssh allows SSH (port 22) from 0.0.0.0/0. '
            'Review firewall rules before applying.'
        )
    if out_file:
        notes.append(f'\nSaved the plan to: {out_file}\n\nTo perform exactly these actions, run: "terraform apply \\"{out_file}\\""')
    new_findings: dict[str, Any] = {'plan_done': True}
    if out_file:
        new_findings['gcp_plan_saved'] = out_file
    out = head + body + '\n' + summary
    if notes:
        out += '\n\n' + '\n'.join(notes)
    return out, new_findings


def _gcp_do_apply(findings: dict[str, Any], via_plan: str | None) -> CommandResult:
    lines = []
    for r in GCP_RESOURCES:
        lines.append(f'{r}: Creating...')
    lines.append('')
    for r in GCP_RESOURCES:
        lines.append(f'{r}: Creation complete after 5s [id={GCP_RESOURCE_IDS[r]}]')
    lines.append('')
    fixed = _gcp_ssh_fixed(findings) or findings.get('gcp_misconfiguration_fixed')
    if fixed and findings.get('gcp_applied'):
        summary = 'Apply complete! Resources: 0 added, 1 changed, 0 destroyed.'
    else:
        summary = f'Apply complete! Resources: {len(GCP_RESOURCES)} added, 0 changed, 0 destroyed.'
    lines.append(summary)
    lines.append('')
    lines.append('Outputs:')
    lines.append('')
    for k in sorted(GCP_OUTPUTS):
        lines.append(f'{k} = "{GCP_OUTPUTS[k]}"')
    if via_plan:
        lines.insert(0, f'Applying saved plan "{via_plan}"...\n')
    new_findings: dict[str, Any] = {
        'gcp_applied': True,
        'ever_applied': True,
        'destroyed': False,
        'applied_resources': list(GCP_RESOURCES),
        'gcp_pending_apply': False,
        'plan_done': True,
    }
    if fixed:
        new_findings['gcp_fix_deployed'] = True
        new_findings['gcp_misconfiguration_fixed'] = True
    return CommandResult(output='\n'.join(lines), findings=new_findings)


def _gcp_do_destroy(findings: dict[str, Any]) -> CommandResult:
    lines = []
    for r in reversed(GCP_RESOURCES):
        lines.append(f'{r}: Destroying... [id={GCP_RESOURCE_IDS[r]}]')
    lines.append('')
    for r in reversed(GCP_RESOURCES):
        lines.append(f'{r}: Destruction complete after 2s')
    lines.append('')
    lines.append(f'Destroy complete! Resources: {len(GCP_RESOURCES)} destroyed.')
    return CommandResult(output='\n'.join(lines), findings={
        'destroyed': True,
        'gcp_applied': False,
        'applied_resources': [],
        'gcp_pending_destroy': False,
    })


def _gcp_extract_out_file(args: list[str]) -> str | None:
    for a in args:
        if a.startswith('-out='):
            return a[5:]
    for i, a in enumerate(args):
        if a == '-out' and i + 1 < len(args) and not args[i + 1].startswith('-'):
            return args[i + 1]
    return None


def _gcp_cmd_plan(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not findings.get('validated'):
        return CommandResult(
            output='Plan: run `terraform validate` first to check your HCL for errors.',
            exit_code=1,
        )
    out_file = _gcp_extract_out_file(args)
    out, new_findings = _gcp_plan_output(findings, out_file)
    return CommandResult(output=out, findings=new_findings)


def _gcp_cmd_apply(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    rest = [a for a in args if not a.startswith('-var')]
    auto = _has_flag(args, '-auto-approve')
    plan_file = next((a for a in args if not a.startswith('-')), None)
    if plan_file:
        saved = findings.get('gcp_plan_saved')
        if saved and plan_file == saved:
            return _gcp_do_apply(findings, via_plan=plan_file)
        return CommandResult(
            output=f'Error: Failed to read plan file "{plan_file}": no such saved plan. Run "terraform plan -out={plan_file}" first.',
            exit_code=1,
        )
    if auto:
        return _gcp_do_apply(findings, via_plan=None)
    out, plan_findings = _gcp_plan_output(findings, None)
    out += '\n\nDo you want to perform these actions?\n  Terraform will perform the actions described above.\n  Only \'yes\' will be accepted to approve.\n\n  Enter a value: '
    plan_findings['gcp_pending_apply'] = True
    return CommandResult(output=out, findings=plan_findings)


def _gcp_cmd_destroy(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not findings.get('gcp_applied'):
        return _need_apply()
    if _has_flag(args, '-auto-approve'):
        return _gcp_do_destroy(findings)
    body = '\n'.join(f'  - {r}' for r in GCP_RESOURCES)
    out = (
        'Terraform will perform the following actions:\n\n'
        f'{body}\n\n'
        f'Plan: 0 to add, 0 to change, {len(GCP_RESOURCES)} to destroy.\n\n'
        'Do you really want to destroy all resources?\n'
        '  Terraform will destroy all your managed infrastructure, as shown above.\n'
        '  There is no undo. Only \'yes\' will be accepted to confirm.\n\n'
        '  Enter a value: '
    )
    return CommandResult(output=out, findings={'gcp_pending_destroy': True})


def _gcp_cmd_show(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if args and not args[0].startswith('-'):
        plan_file = args[0]
        if findings.get('gcp_plan_saved') == plan_file:
            out, _ = _gcp_plan_output(findings, None)
            return CommandResult(output=f'# Saved plan "{plan_file}":\n\n' + out)
        return CommandResult(output=f'Error: no saved plan "{plan_file}".', exit_code=1)
    if not findings.get('gcp_applied'):
        return CommandResult(output='No state. Run "terraform apply" first.', exit_code=1)
    lines = ['# terraform show: current state']
    for r in GCP_RESOURCES:
        lines.append(f'# {r}:')
        lines.append(f'  id = "{GCP_RESOURCE_IDS[r]}"')
    lines.append('')
    lines.append('Outputs:')
    for k in sorted(GCP_OUTPUTS):
        lines.append(f'  {k} = "{GCP_OUTPUTS[k]}"')
    return CommandResult(output='\n'.join(lines))


def _gcp_cmd_state(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not args or args[0] != 'list':
        return CommandResult(output='Usage: terraform state <list>', exit_code=1)
    if not findings.get('gcp_applied'):
        return _need_apply()
    resources = findings.get('applied_resources') or GCP_RESOURCES
    return CommandResult(output='\n'.join(sorted(resources)), findings={'gcp_state_viewed': True})


def _gcp_cmd_output(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not findings.get('gcp_applied'):
        return _need_apply()
    names = [a for a in args if not a.startswith('-')]
    if names:
        name = names[0]
        if name in GCP_OUTPUTS:
            return CommandResult(output=f'"{GCP_OUTPUTS[name]}"', findings={'gcp_outputs_viewed': True})
        return CommandResult(output=f'Error: output "{name}" is not defined.', exit_code=1)
    lines = [f'{k} = "{v}"' for k, v in sorted(GCP_OUTPUTS.items())]
    return CommandResult(output='\n'.join(lines), findings={'gcp_outputs_viewed': True})


def _cmd_gcp_terraform(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not args:
        return CommandResult(output='Usage: terraform <init|validate|fmt|plan|apply|destroy|show|state|output|version>', exit_code=1)
    sub = args[0]
    rest = args[1:]
    if sub == 'init':
        return _gcp_cmd_init(findings)
    if sub == 'validate':
        return _gcp_cmd_validate(findings)
    if sub == 'fmt':
        files = sorted(_gcp_files(findings).keys())
        return CommandResult(output='\n'.join(files) if files else '(no .tf files yet)')
    if sub == 'version':
        return _cmd_version()
    if sub == 'plan':
        return _gcp_cmd_plan(rest, findings)
    if sub == 'apply':
        return _gcp_cmd_apply(rest, findings)
    if sub == 'destroy':
        return _gcp_cmd_destroy(rest, findings)
    if sub == 'show':
        return _gcp_cmd_show(rest, findings)
    if sub == 'state':
        return _gcp_cmd_state(rest, findings)
    if sub == 'output':
        return _gcp_cmd_output(rest, findings)
    return CommandResult(output=f'Terraform has no command named "{sub}".', exit_code=1)


def _gcp_run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    """Entry point for the GCP scenario: mirrors run() with GCP handlers."""
    raw = (command or '').strip()
    if not raw:
        return CommandResult(output='')

    lowered_first = raw.split('\n', 1)[0].strip().lower()

    # pending interactive confirmations
    if lowered_first in ('yes', 'y') and '\n' not in raw:
        if findings.get('gcp_pending_apply'):
            return _gcp_do_apply(findings, via_plan=None)
        if findings.get('gcp_pending_destroy'):
            return _gcp_do_destroy(findings)
        return CommandResult(output='Nothing is waiting for confirmation.')

    parts = _parse(lowered_first)
    if not parts:
        return CommandResult(output='')
    cmd = parts[0]
    args = parts[1:]

    if cmd in ('clear', 'cls'):
        return CommandResult(output='', clear=True)
    if cmd in ('help', '?'):
        return CommandResult(output=(
            'Available commands (simulated - nothing is really provisioned):\n'
            '  ls / cat <file>             list written .tf files / show one\n'
            '  write <file>                write a .tf file (paste HCL, end with EOF)\n'
            '  terraform init              download the google provider, prepare the directory\n'
            '  terraform validate          HCL structure + consistency check (needs init)\n'
            '  terraform fmt               list .tf files\n'
            '  terraform plan [-out=FILE]  preview changes; -out saves the plan\n'
            '  terraform apply [plan]      create/update resources (prompts; -auto-approve skips)\n'
            '  terraform destroy           tear everything down (prompts; -auto-approve skips)\n'
            '  terraform show [plan]       show current state (or a saved plan)\n'
            '  terraform state list        list resources tracked in state\n'
            '  terraform output [name]     show output values\n'
            '  terraform version | help | clear'
        ))
    if cmd == 'ls':
        return _gcp_cmd_ls(findings)
    if cmd == 'cat':
        return _gcp_cmd_cat(args, findings)
    if cmd == 'write':
        return _gcp_cmd_write(raw, findings)
    if cmd in ('terraform', 'tf'):
        return _cmd_gcp_terraform([a for a in args], findings)
    return CommandResult(
        output=f'{parts[0]}: command not found (try `help`)',
        exit_code=127,
    )

# ---------------------------------------------------------------------------
# entry point
# ---------------------------------------------------------------------------

def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    # GCP/Proxmox scenarios have their own dispatchers (write-your-own-.tf workflow).
    # Dispatched before the length check so multi-line `write` heredocs work.
    if _scenario(lab) == 'tfaws':
        return _run_aws(lab, command, findings)
    if _scenario(lab) == 'azure':
        return _run_azure(lab, command, findings)
    if _scenario(lab) == 'gcp':
        return _gcp_run(lab, command, findings)
    if _scenario(lab) == 'proxmox':
        return _px_run(lab, command, findings)
    raw = (command or '').strip()
    if not raw:
        return CommandResult(output='')
    if len(raw) > 1024:
        return CommandResult(output='Command too long.', exit_code=1)

    lowered = raw.lower()

    # pending interactive confirmations (terraform apply / destroy prompt for 'yes')
    if lowered in ('yes', 'y'):
        if findings.get('k8s_pending_apply'):
            return _k8s_do_apply(findings, via_plan=None)
        if findings.get('k8s_pending_destroy'):
            return _k8s_do_destroy(findings)
        if findings.get('pending_apply'):
            cli_vars = findings.get('pending_cli_vars') or {}
            return _do_apply(findings, cli_vars, via_plan=None)
        if findings.get('pending_destroy'):
            return _do_destroy(findings)
        return CommandResult(output='Nothing is waiting for confirmation.')

    parts = _parse(raw)
    if not parts:
        return CommandResult(output='')
    cmd = parts[0].lower()
    args = parts[1:]

    if cmd in ('clear', 'cls'):
        return CommandResult(output='', clear=True)
    if cmd in ('help', '?'):
        if _scenario(lab) == 'k8s':
            return CommandResult(output=(
                'Available commands (simulated - nothing is really provisioned):\n'
                '  ls / cat <file>             inspect the working directory (start with cat main.tf)\n'
                '  write <file>                write a .tf file: paste HCL lines, end with a line\n'
                '                              containing only EOF\n'
                '  terraform init              download the kubernetes + docker providers\n'
                '  terraform validate          HCL structure check (needs init)\n'
                '  terraform fmt               format configuration files\n'
                '  terraform plan [-out=FILE]  preview changes; -out saves the plan\n'
                '  terraform apply [plan]      create/update resources (prompts; -auto-approve skips)\n'
                '  terraform destroy           tear everything down (prompts; -auto-approve skips)\n'
                '  terraform show              show current state\n'
                '  terraform state list        list resources tracked in state\n'
                '  terraform output [name]     show output values\n'
                '  terraform plan -var="replicas=5"   override a variable\n'
                '  export TF_VAR_<n>=<v>       set a variable via the environment\n'
                '  terraform version | help | clear'
            ))
        return CommandResult(output=(
            'Available commands (simulated - nothing is really provisioned):\n'
            '  ls / cat <file>             inspect the working directory (main.tf, variables.tf,\n'
            '                              terraform.tfvars, outputs.tf)\n'
            '  edit main.tf                fix the SSH ingress rule (simulated editor)\n'
            '  terraform init              download providers, prepare the working directory\n'
            '  terraform fmt               format configuration files\n'
            '  terraform validate          syntax + consistency check (needs init)\n'
            '  terraform plan [-out=FILE]  preview changes; -out saves the plan\n'
            '  terraform apply [plan]      create/update resources (prompts; -auto-approve skips)\n'
            '  terraform destroy           tear everything down (prompts; -auto-approve skips)\n'
            '  terraform show [plan]       show current state (or a saved plan)\n'
            '  terraform state list        list resources tracked in state\n'
            '  terraform output [name]     show output values\n'
            '  terraform workspace <list|new|select>\n'
            '                              manage workspaces (isolated state)\n'
            '  export TF_VAR_<n>=<v>       set a variable via the environment\n'
            '  env                         show environment variables\n'
            '  terraform version | help | clear'
        ))
    _sc = _scenario(lab)
    if cmd == 'ls':
        return _k8s_cmd_ls(findings) if _sc == 'k8s' else _cmd_ls(findings)
    if cmd == 'cat':
        return _k8s_cmd_cat(args, findings) if _sc == 'k8s' else _cmd_cat(args)
    if cmd == 'write':
        if _sc != 'k8s':
            return CommandResult(output='write: only available in the Kubernetes & Docker lab.', exit_code=1)
        return _cmd_write(raw, findings)
    if cmd == 'edit':
        return _cmd_edit(args, findings)
    if cmd == 'export':
        return _cmd_export(raw, findings)
    if cmd == 'env':
        return _cmd_env(findings)
    if cmd in ('terraform', 'tf'):
        if _sc == 'k8s':
            return _cmd_k8s_terraform([a for a in args], findings)
        return _cmd_terraform([a for a in args], findings)
    return CommandResult(
        output=f'{parts[0]}: command not found (this lab uses terraform file commands - try `help`)',
        exit_code=127,
    )

# ---------------------------------------------------------------------------
# Terraform for AWS lab (terraform-aws-001): student-authored HCL simulation.
#
# Unlike the fundamentals shell (fixed scenario), here the student writes every
# .tf file with `write <file> '<hcl>'`. The shell parses resource/variable/
# output/provider/data/module/backend blocks out of the written files and
# simulates init -> validate -> plan -> apply -> state/outputs against them.
# Nothing is executed and nothing is provisioned.
# ---------------------------------------------------------------------------

import hashlib as _tfa_hashlib
import re as _tfa_re

_TFA_RES_RE = _tfa_re.compile(r'resource\s+"([^"]+)"\s+"([^"]+)"')
_TFA_VAR_RE = _tfa_re.compile(r'variable\s+"([^"]+)"')
_TFA_OUT_RE = _tfa_re.compile(r'output\s+"([^"]+)"')
_TFA_PROV_RE = _tfa_re.compile(r'provider\s+"([^"]+)"')
_TFA_DATA_RE = _tfa_re.compile(r'data\s+"([^"]+)"\s+"([^"]+)"')
_TFA_MOD_RE = _tfa_re.compile(r'module\s+"([^"]+)"')
_TFA_BACKEND_RE = _tfa_re.compile(r'backend\s+"([^"]+)"')
_TFA_TF_BLOCK_RE = _tfa_re.compile(r'(^|\n)\s*terraform\s*\{')
_TFA_REQ_PROV_RE = _tfa_re.compile(r'required_providers\s*\{')

_TFA_ID_PREFIX = {
    'aws_vpc': 'vpc-',
    'aws_subnet': 'subnet-',
    'aws_instance': 'i-',
    'aws_security_group': 'sg-',
    'aws_db_instance': 'db-',
    'aws_db_subnet_group': 'dbsubnet-',
    'aws_lb': 'alb-',
    'aws_lb_target_group': 'tg-',
    'aws_lb_listener': 'lsnr-',
    'aws_launch_template': 'lt-',
    'aws_autoscaling_group': 'asg-',
    'aws_internet_gateway': 'igw-',
    'aws_route_table': 'rtb-',
    'aws_iam_role': 'role-',
    'aws_iam_policy': 'pol-',
}


def _tfa_files(findings):
    return findings.get('tfa_files') or {}


def _tfa_all_content(findings):
    return '\n'.join(_tfa_files(findings).values())


def _tfa_resources(findings):
    """All resource addresses across written .tf files, e.g. aws_vpc.main."""
    out = []
    for content in _tfa_files(findings).values():
        for rtype, rname in _TFA_RES_RE.findall(content):
            addr = f'{rtype}.{rname}'
            if addr not in out:
                out.append(addr)
    return out


def _tfa_resource_id(address):
    rtype = address.split('.')[0]
    prefix = _TFA_ID_PREFIX.get(rtype, '')
    digest = _tfa_hashlib.md5(address.encode()).hexdigest()[:8]
    return f'{prefix}{digest}' if prefix else digest


def _tfa_braces_ok(content):
    """Naive structural check: braces/brackets balance, ignoring strings/comments."""
    stripped = []
    in_str = False
    i = 0
    while i < len(content):
        c = content[i]
        if in_str:
            if c == '\\' and i + 1 < len(content):
                i += 2
                continue
            if c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == '#':
                while i < len(content) and content[i] != '\n':
                    i += 1
                continue
            else:
                stripped.append(c)
        i += 1
    s = ''.join(stripped)
    # strip /* */ comments
    s = _tfa_re.sub(r'/\*.*?\*/', '', s, flags=_tfa_re.S)
    # strip // comments
    s = _tfa_re.sub(r'//[^\n]*', '', s)
    depth_c = depth_s = 0
    for c in s:
        if c == '{':
            depth_c += 1
        elif c == '}':
            depth_c -= 1
        elif c == '[':
            depth_s += 1
        elif c == ']':
            depth_s -= 1
        if depth_c < 0 or depth_s < 0:
            return False, 'unexpected closing brace'
    if depth_c != 0:
        return False, f'unbalanced braces ({depth_c} unclosed "{{")'
    if depth_s != 0:
        return False, f'unbalanced brackets ({depth_s} unclosed "[")'
    return True, ''


def _tfa_need_init():
    return CommandResult(
        output='Error: Initialization required. Please run "terraform init" first.',
        exit_code=1,
    )


def _tfa_need_apply():
    return CommandResult(
        output='Error: No state. Run "terraform apply" before inspecting state.',
        exit_code=1,
    )


# --- file commands ----------------------------------------------------------

def _tfa_cmd_write(args, findings):
    if len(args) < 1:
        return CommandResult(output='Usage: write <file.tf> \'<hcl content>\'', exit_code=1)
    name = args[0].split('/')[-1]
    if '..' in args[0] or '/' in args[0]:
        return CommandResult(output='write: only files in the working directory (no paths).', exit_code=1)
    if not name.endswith('.tf'):
        return CommandResult(output=f'write: "{name}" is not a .tf file.', exit_code=1)
    if len(args) < 2:
        return CommandResult(
            output=f'Usage: write {name} \'<hcl content>\'\nTip: the objective description shows the HCL to write.',
            exit_code=1,
        )
    content = ' '.join(args[1:])
    files = dict(_tfa_files(findings))
    files[name] = content
    n_res = len(_TFA_RES_RE.findall(content))
    n_var = len(_TFA_VAR_RE.findall(content))
    n_out = len(_TFA_OUT_RE.findall(content))
    summary = f'Wrote {name} ({len(content)} bytes: {n_res} resource(s), {n_var} variable(s), {n_out} output(s)).'
    return CommandResult(output=summary, findings={'tfa_files': files, 'tfa_validated': False})


def _tfa_cmd_rm(args, findings):
    if len(args) < 1:
        return CommandResult(output='Usage: rm <file.tf>', exit_code=1)
    name = args[0].split('/')[-1]
    files = dict(_tfa_files(findings))
    if name not in files:
        return CommandResult(output=f'rm: {name}: No such file.', exit_code=1)
    del files[name]
    return CommandResult(output=f'Removed {name}.', findings={'tfa_files': files, 'tfa_validated': False})


def _tfa_cmd_cat(args, findings):
    files = _tfa_files(findings)
    if not args:
        return CommandResult(output='Usage: cat <file.tf>', exit_code=1)
    name = args[0].split('/')[-1]
    if name in files:
        return CommandResult(output=files[name])
    return CommandResult(output=f'cat: {args[0]}: No such file or directory', exit_code=1)


def _tfa_cmd_ls(findings):
    files = sorted(_tfa_files(findings))
    extra = []
    if findings.get('tfa_init_done'):
        extra += ['.terraform/', '.terraform.lock.hcl']
    if findings.get('tfa_plan_saved'):
        extra.append(findings['tfa_plan_saved'])
    if findings.get('tfa_applied'):
        extra.append('terraform.tfstate')
    shown = files + extra
    return CommandResult(output='  '.join(shown) if shown else '(empty directory - write your first .tf file)')


# --- terraform subcommands (AWS path) ---------------------------------------

def _tfa_init(findings):
    out = (
        'Initializing the backend...\n'
        'Initializing provider plugins...\n'
        '- Finding latest version of hashicorp/aws...\n'
        '- Installing hashicorp/aws v5.31.0...\n'
        '- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)\n\n'
        'Terraform has been successfully initialized!'
    )
    nf = {'tfa_init_done': True}
    if _TFA_BACKEND_RE.search(_tfa_all_content(findings)):
        nf['tfa_backend_configured'] = True
        out += '\n\nBackend "s3" initialized: state will be stored remotely with locking.'
    return CommandResult(output=out, findings=nf)


def _tfa_validate(findings):
    if not findings.get('tfa_init_done'):
        return _tfa_need_init()
    files = _tfa_files(findings)
    if not files:
        return CommandResult(
            output='Error: no .tf files in the working directory. Write one with `write <file.tf> \'...\'`.',
            exit_code=1,
        )
    errors = []
    warnings = []
    for name, content in sorted(files.items()):
        ok, msg = _tfa_braces_ok(content)
        if not ok:
            errors.append(f'{name}: {msg}')
    content = _tfa_all_content(findings)
    has_resources = bool(_TFA_RES_RE.search(content))
    has_provider = bool(_TFA_PROV_RE.search(content))
    if has_resources and not has_provider:
        errors.append('missing provider "aws" block: resources need a configured provider')
    if has_provider and not _TFA_REQ_PROV_RE.search(content):
        warnings.append('warning: no required_providers block — pin the AWS provider version')
    if errors:
        return CommandResult(
            output='Error: Terraform validation failed:\n' + '\n'.join(f'  - {e}' for e in errors),
            exit_code=1,
        )
    out = 'Success! The configuration is valid.'
    if warnings:
        out += '\n' + '\n'.join(warnings)
    return CommandResult(output=out, findings={'tfa_validated': True})


def _tfa_plan_body(resources, applied):
    lines = []
    for addr in resources:
        if addr in applied:
            continue
        rtype, rname = addr.split('.', 1)
        lines.append(f'  # {addr} will be created')
        lines.append(f'  + resource "{rtype}" "{rname}" {{')
        lines.append(f'      + id = "{_tfa_resource_id(addr)}"')
        lines.append('      + (attributes from your .tf files)')
        lines.append('    }')
        lines.append('')
    return '\n'.join(lines)


def _tfa_plan(args, findings):
    if not findings.get('tfa_init_done'):
        return _tfa_need_init()
    cli_vars, rest = _extract_vars(args)
    out_file = None
    for i, a in enumerate(rest):
        if a.startswith('-out='):
            out_file = a[5:]
        elif a == '-out' and i + 1 < len(rest) and not rest[i + 1].startswith('-'):
            out_file = rest[i + 1]
    resources = _tfa_resources(findings)
    if not resources:
        return CommandResult(
            output='No resources found in your .tf files. Write infrastructure first (see the objectives).',
            exit_code=1,
        )
    applied = set(findings.get('tfa_applied_resources') or [])
    to_add = [r for r in resources if r not in applied]
    head = (
        'Terraform used the selected providers to generate the following execution plan. Resource\n'
        'actions are indicated with the following symbols:\n'
        '  + create\n\n'
        'Terraform will perform the following actions:\n\n'
    )
    if not to_add:
        return CommandResult(
            output='No changes. Your infrastructure matches the configuration.',
            findings={'tfa_plan_done': True},
        )
    body = _tfa_plan_body(resources, applied)
    summary = f'Plan: {len(to_add)} to add, 0 to change, 0 to destroy.'
    out = head + body + '\n' + summary
    nf = {'tfa_plan_done': True}
    if out_file:
        nf['tfa_plan_saved'] = out_file
        out += f'\n\nSaved the plan to: {out_file}\n\nTo perform exactly these actions, run: "terraform apply \\"{out_file}\\""'
    if cli_vars:
        merged = dict(findings.get('tfa_variables_set') or {})
        merged.update(cli_vars)
        nf['tfa_variables_set'] = merged
    return CommandResult(output=out, findings=nf)


def _tfa_do_apply(findings, cli_vars, via_plan):
    resources = _tfa_resources(findings)
    applied_before = set(findings.get('tfa_applied_resources') or [])
    to_add = [r for r in resources if r not in applied_before]
    lines = []
    if via_plan:
        lines.append(f'Applying saved plan "{via_plan}"...\n')
    for addr in to_add:
        lines.append(f'{addr}: Creating...')
    lines.append('')
    for addr in to_add:
        lines.append(f'{addr}: Creation complete after 3s [id={_tfa_resource_id(addr)}]')
    lines.append('')
    lines.append(f'Apply complete! Resources: {len(to_add)} added, 0 changed, 0 destroyed.')
    all_applied = sorted(set(resources))
    nf = {
        'tfa_applied': True,
        'tfa_ever_applied': True,
        'tfa_destroyed': False,
        'tfa_applied_resources': all_applied,
        'tfa_resource_ids': {a: _tfa_resource_id(a) for a in all_applied},
        'tfa_pending_apply': False,
        'tfa_plan_done': True,
    }
    if cli_vars:
        merged = dict(findings.get('tfa_variables_set') or {})
        merged.update(cli_vars)
        nf['tfa_variables_set'] = merged
    # report defined outputs
    outs = _TFA_OUT_RE.findall(_tfa_all_content(findings))
    if outs:
        lines.append('')
        lines.append('Outputs:')
        lines.append('')
        for name in sorted(set(outs)):
            lines.append(f'{name} = <computed from your configuration>')
    return CommandResult(output='\n'.join(lines), findings=nf)


def _tfa_apply(args, findings):
    if not findings.get('tfa_init_done'):
        return _tfa_need_init()
    if not findings.get('tfa_validated'):
        return CommandResult(
            output='Error: configuration not validated. Run "terraform validate" first.',
            exit_code=1,
        )
    cli_vars, rest = _extract_vars(args)
    auto = _has_flag(args, '-auto-approve')
    plan_file = next((a for a in rest if not a.startswith('-')), None)
    if plan_file:
        saved = findings.get('tfa_plan_saved')
        if saved and plan_file == saved:
            return _tfa_do_apply(findings, cli_vars, via_plan=plan_file)
        return CommandResult(
            output=f'Error: no saved plan "{plan_file}". Run "terraform plan -out={plan_file}" first.',
            exit_code=1,
        )
    resources = _tfa_resources(findings)
    if not resources:
        return CommandResult(output='Nothing to apply: no resources defined.', exit_code=1)
    if auto:
        return _tfa_do_apply(findings, cli_vars, via_plan=None)
    to_add = len([r for r in resources if r not in set(findings.get('tfa_applied_resources') or [])])
    out = (
        f'Plan: {to_add} to add, 0 to change, 0 to destroy.\n\n'
        'Do you want to perform these actions?\n'
        "  Only 'yes' will be accepted to approve.\n\n"
        '  Enter a value: '
    )
    nf = {'tfa_pending_apply': True}
    if cli_vars:
        nf['tfa_pending_cli_vars'] = cli_vars
    return CommandResult(output=out, findings=nf)


def _tfa_do_destroy(findings):
    resources = list(reversed(findings.get('tfa_applied_resources') or []))
    lines = []
    for addr in resources:
        lines.append(f'{addr}: Destroying... [id={_tfa_resource_id(addr)}]')
    lines.append('')
    for addr in resources:
        lines.append(f'{addr}: Destruction complete after 2s')
    lines.append('')
    lines.append(f'Destroy complete! Resources: {len(resources)} destroyed.')
    return CommandResult(output='\n'.join(lines), findings={
        'tfa_destroyed': True,
        'tfa_applied': False,
        'tfa_applied_resources': [],
        'tfa_pending_destroy': False,
    })


def _tfa_destroy(args, findings):
    if not findings.get('tfa_init_done'):
        return _tfa_need_init()
    if not findings.get('tfa_applied'):
        return _tfa_need_apply()
    if _has_flag(args, '-auto-approve'):
        return _tfa_do_destroy(findings)
    resources = findings.get('tfa_applied_resources') or []
    body = '\n'.join(f'  - {r}' for r in resources)
    out = (
        'Terraform will perform the following actions:\n\n'
        f'{body}\n\n'
        f'Plan: 0 to add, 0 to change, {len(resources)} to destroy.\n\n'
        'Do you really want to destroy all resources?\n'
        "  There is no undo. Only 'yes' will be accepted to confirm.\n\n"
        '  Enter a value: '
    )
    return CommandResult(output=out, findings={'tfa_pending_destroy': True})


def _tfa_state(args, findings):
    if not findings.get('tfa_init_done'):
        return _tfa_need_init()
    if not args or args[0] != 'list':
        return CommandResult(output='Usage: terraform state <list>', exit_code=1)
    if not findings.get('tfa_applied'):
        return _tfa_need_apply()
    resources = findings.get('tfa_applied_resources') or []
    return CommandResult(output='\n'.join(sorted(resources)), findings={'tfa_state_viewed': True})


def _tfa_output(args, findings):
    if not findings.get('tfa_init_done'):
        return _tfa_need_init()
    if not findings.get('tfa_applied'):
        return _tfa_need_apply()
    outs = sorted(set(_TFA_OUT_RE.findall(_tfa_all_content(findings))))
    if not outs:
        return CommandResult(output='Warning: No outputs found in your configuration.')
    names = [a for a in args if not a.startswith('-')]
    if names:
        if names[0] in outs:
            return CommandResult(
                output=f'{names[0]} = <computed from your configuration>',
                findings={'tfa_outputs_viewed': True},
            )
        return CommandResult(output=f'Error: output "{names[0]}" is not defined.', exit_code=1)
    lines = [f'{n} = <computed from your configuration>' for n in outs]
    return CommandResult(output='\n'.join(lines), findings={'tfa_outputs_viewed': True})


def _tfa_show(args, findings):
    if not findings.get('tfa_init_done'):
        return _tfa_need_init()
    if not findings.get('tfa_applied'):
        return CommandResult(output='No state. Run "terraform apply" first.', exit_code=1)
    lines = ['# terraform show: current state']
    ids = findings.get('tfa_resource_ids') or {}
    for addr in sorted(findings.get('tfa_applied_resources') or []):
        lines.append(f'# {addr}:')
        lines.append(f'  id = "{ids.get(addr, _tfa_resource_id(addr))}"')
    return CommandResult(output='\n'.join(lines))


def _tfa_workspace(args, findings):
    if not findings.get('tfa_init_done'):
        return _tfa_need_init()
    if not args:
        return CommandResult(output='Usage: terraform workspace <list|new|select> [name]', exit_code=1)
    sub = args[0]
    workspaces = list(findings.get('tfa_workspaces') or ['default'])
    current = findings.get('tfa_workspace') or 'default'
    if sub == 'list':
        return CommandResult(output='\n'.join(('* ' if w == current else '  ') + w for w in workspaces))
    if sub == 'new':
        if len(args) < 2:
            return CommandResult(output='Usage: terraform workspace new <name>', exit_code=1)
        name = args[1]
        if name in workspaces:
            return CommandResult(output=f'Error: workspace "{name}" already exists.', exit_code=1)
        workspaces.append(name)
        return CommandResult(
            output=f'Created and switched to workspace "{name}"!\n\nWorkspaces isolate state: each workspace gets its own copy.',
            findings={'tfa_workspaces': workspaces, 'tfa_workspace': name, 'tfa_workspace_created': True},
        )
    if sub in ('select', 'switch'):
        if len(args) < 2:
            return CommandResult(output='Usage: terraform workspace select <name>', exit_code=1)
        name = args[1]
        if name not in workspaces:
            return CommandResult(output=f'Error: workspace "{name}" does not exist.', exit_code=1)
        return CommandResult(output=f'Switched to workspace "{name}".', findings={'tfa_workspace': name})
    return CommandResult(output=f'Error: unknown workspace subcommand "{sub}".', exit_code=1)


def _tfa_terraform(args, findings):
    if not args:
        return CommandResult(output='Usage: terraform <init|validate|fmt|plan|apply|destroy|show|state|output|workspace|version>', exit_code=1)
    sub, rest = args[0], args[1:]
    if sub == 'init':
        return _tfa_init(findings)
    if sub == 'validate':
        return _tfa_validate(findings)
    if sub == 'fmt':
        files = sorted(_tfa_files(findings))
        return CommandResult(output='\n'.join(files) if files else '(no .tf files)', findings={'tfa_formatted': True})
    if sub == 'version':
        return CommandResult(output='Terraform v1.9.0\non linux_amd64')
    if sub == 'plan':
        return _tfa_plan(rest, findings)
    if sub == 'apply':
        return _tfa_apply(rest, findings)
    if sub == 'destroy':
        return _tfa_destroy(rest, findings)
    if sub == 'show':
        return _tfa_show(rest, findings)
    if sub == 'state':
        return _tfa_state(rest, findings)
    if sub == 'output':
        return _tfa_output(rest, findings)
    if sub == 'workspace':
        return _tfa_workspace(rest, findings)
    return CommandResult(output=f'Terraform has no command named "{sub}".', exit_code=1)


def _tfa_help():
    return CommandResult(output=(
        'Terraform for AWS lab (simulated - nothing is really provisioned):\n'
        '  write <file.tf> \'<hcl>\'   create/overwrite a .tf file with your HCL\n'
        '  cat <file.tf> / ls / rm    review, list, delete your files\n'
        '  terraform init              download the AWS provider\n'
        '  terraform validate          structural check of YOUR .tf files\n'
        '  terraform fmt               format your files\n'
        '  terraform plan [-out=FILE]  preview what your HCL would create\n'
        '  terraform apply [plan]      create the resources (prompts; -auto-approve skips)\n'
        '  terraform destroy           tear everything down\n'
        '  terraform show              show current state\n'
        '  terraform state list        list resources tracked in state\n'
        '  terraform output [name]     show output values\n'
        '  terraform workspace <list|new|select>\n'
        '  export TF_VAR_<n>=<v>       set a variable via the environment\n'
        '  terraform version | help | clear'
    ))


def _run_aws(lab, command, findings):
    raw = (command or '').strip()
    if not raw:
        return CommandResult(output='')
    if len(raw) > 8192:
        return CommandResult(output='Command too long.', exit_code=1)

    lowered = raw.lower()
    if lowered in ('yes', 'y'):
        if findings.get('tfa_pending_apply'):
            cli_vars = findings.get('tfa_pending_cli_vars') or {}
            return _tfa_do_apply(findings, cli_vars, via_plan=None)
        if findings.get('tfa_pending_destroy'):
            return _tfa_do_destroy(findings)
        return CommandResult(output='Nothing is waiting for confirmation.')

    parts = _parse(raw)
    if not parts:
        return CommandResult(output='')
    cmd = parts[0].lower()
    args = parts[1:]

    if cmd in ('clear', 'cls'):
        return CommandResult(output='', clear=True)
    if cmd in ('help', '?'):
        return _tfa_help()
    if cmd == 'write':
        return _tfa_cmd_write(args, findings)
    if cmd == 'rm':
        return _tfa_cmd_rm(args, findings)
    if cmd == 'ls':
        return _tfa_cmd_ls(findings)
    if cmd == 'cat':
        return _tfa_cmd_cat(args, findings)
    if cmd == 'export':
        return _cmd_export(raw, findings)
    if cmd == 'env':
        return _cmd_env(findings)
    if cmd in ('terraform', 'tf'):
        return _tfa_terraform(args, findings)
    return CommandResult(
        output=f'{parts[0]}: command not found (this lab is terraform-only - try `help`)',
        exit_code=127,
    )


# ---------------------------------------------------------------------------
# Proxmox scenario (terraform-proxmox-001): the student WRITES every .tf file.
#
# The working directory starts empty. `write <file>` accepts a heredoc:
#   write versions.tf
#   <HCL lines>
#   EOF
# (all sent as one multi-line command). `write <file> --scaffold` writes the
# expert reference implementation for the current stage. Validators inspect
# the written HCL for required blocks/attributes; `terraform validate` checks
# HCL structure (balanced delimiters + required blocks per file).
#
# Stages (derived from written main.tf content):
#   empty -> vm (1 VM) -> vm+lxc (1 VM + 1 container) -> stack (2 VMs + 1 LXC)
# Findings keys are `px_`-prefixed to avoid collisions with the other
# scenarios sharing this shell.
# ---------------------------------------------------------------------------

PX_VERSIONS_TF = '# versions.tf — pins Terraform itself and every provider you use.\n#\n# WHY THIS FILE EXISTS\n# --------------------\n# `terraform init` reads THIS file to decide which provider plugins to\n# download. Without it, Terraform has no idea that the word "proxmox"\n# means the bpg/proxmox provider from the public registry.\n#\n# PROVIDER CHOICE: bpg vs telmate\n# -------------------------------\n# Two community providers exist for Proxmox VE:\n#   * bpg/proxmox  (RECOMMENDED) — actively maintained, tracks the newest\n#     Proxmox VE APIs. VM resource: proxmox_virtual_environment_vm\n#   * telmate/proxmox — the original provider. VM resource: proxmox_vm_qemu.\n#     Older tutorials use `full_clone = true`; bpg spells it `full = true`\n#     inside the clone block. Same idea, different spelling.\n# This lab uses bpg/proxmox.\n\nterraform {\n  required_version = ">= 1.5"\n\n  required_providers {\n    proxmox = {\n      source  = "bpg/proxmox"   # registry address: <host>/<namespace>/<type>\n      version = "~> 0.66"       # pessimistic: >= 0.66, < 0.67 (no surprises)\n    }\n  }\n}\n\n# The provider block configures HOW Terraform talks to your Proxmox node.\n#\n# AUTHENTICATION — three options, ranked:\n#   1. API token (BEST) — scoped, revocable, no password in state or logs.\n#      Create it at: Datacenter > Permissions > API Tokens > Add.\n#      Use a DEDICATED user (never root@pam) with only the privileges it\n#      needs, e.g. PVEVMAdmin on one pool. The token ID looks like\n#      "terraform@pam!homelab" and the secret value is shown ONCE.\n#   2. Username + password — works, but the password can leak into state.\n#   3. Ticket auth — interactive only, useless for automation.\n#\n# NEVER hardcode the token here. It lives in var.pve_api_token (sensitive),\n# fed via terraform.tfvars which you .gitignore. See variables.tf.\nprovider "proxmox" {\n  endpoint  = var.pve_endpoint   # e.g. "https://192.168.1.10:8006/"\n  api_token = var.pve_api_token  # e.g. "terraform@pam!homelab=abc123..."\n\n  # Homelab reality: Proxmox ships with a SELF-SIGNED certificate, so TLS\n  # verification fails. insecure = true skips verification.\n  # In production: install a real cert (Let\'s Encrypt via ACME in the\n  # Proxmox UI) and set insecure = false.\n  insecure = true\n\n  # Terraform needs SSH for some guest operations (waiting on cloud-init,\n  # executing remote-exec provisioners). agent = true uses your local\n  # SSH agent — no private keys in config files.\n  ssh {\n    agent    = true\n    username = "root"\n  }\n}\n'

PX_MAIN_TF_VM = '# main.tf — the infrastructure Terraform manages.\n# STAGE 1: a single VM cloned from a cloud-init template.\n#\n# HCL ANATOMY — every resource block follows this shape:\n#   resource "<PROVIDER>_<TYPE>" "<LOCAL_NAME>" {\n#     <argument> = <value>      # scalars: strings, numbers, booleans\n#     <block> { ... }          # nested blocks group related arguments\n#   }\n# The LOCAL_NAME ("docker" below) is only for YOUR config — Terraform builds\n# the address proxmox_virtual_environment_vm.docker from it. The real\n# Proxmox object is identified by vm_id.\n\nresource "proxmox_virtual_environment_vm" "docker" {\n  # ── Identity: WHERE it runs and WHAT it\'s called ──────────────\n  name      = "docker-01"     # hostname shown in the Proxmox UI\n  node_name = var.pve_node    # which cluster node runs it (default "pve")\n  vm_id     = 101             # Proxmox VMID — must be UNIQUE cluster-wide.\n                              # Convention: 1xx = VMs, 2xx = containers,\n                              # 9000+ = templates. Pick a scheme and keep it.\n\n  description = "Docker host — managed by Terraform"\n  tags        = ["terraform", "docker"]   # filterable in the Proxmox UI\n\n  # ── Clone source ──────────────────────────────────────────────\n  # Cloning a TEMPLATE beats installing from ISO: fast, identical every\n  # time, version-controlled. Build the template ONCE (Ubuntu 24.04):\n  #   1. Create a VM from the Ubuntu cloud image (qm importdisk)\n  #   2. Install qemu-guest-agent inside it (apt install qemu-guest-agent)\n  #   3. Convert: qm template 9000\n  #\n  # full = true  → FULL clone: an independent disk copy. The VM survives\n  #                even if you delete the template. Slower, uses more disk.\n  # full = false → LINKED clone: copy-on-write on the template\'s disk.\n  #                Fast and tiny — but the VM DIES with the template.\n  # RULE OF THUMB: Terraform-managed VMs are ALWAYS full clones.\n  # (telmate provider spells this `full_clone = true`.)\n  clone {\n    vm_id = var.template_vm_id   # 9000\n    full  = false                # <-- REVIEW: linked clone is wrong here\n  }\n\n  # ── Guest agent ───────────────────────────────────────────────\n  # The QEMU guest agent lets Proxmox query the guest\'s IP addresses.\n  # Terraform needs it for `terraform output` to show VM IPs and to wait\n  # for cloud-init to finish. The TEMPLATE must have qemu-guest-agent\n  # installed, or this block does nothing.\n  agent {\n    enabled = true\n  }\n\n  # ── CPU and memory ────────────────────────────────────────────\n  cpu {\n    cores = 2\n    # type defaults to "host" (passthrough). On OLDER CPUs without modern\n    # flags (e.g. Xeon X5650: no AVX), guests can fail to boot — pin it:\n    # type = "x86-64-v2-AES"\n  }\n  memory {\n    dedicated = 4096   # MB guaranteed. `floating` adds balloonable extra.\n  }\n\n  # ── Disk ──────────────────────────────────────────────────────\n  disk {\n    datastore_id = "local-lvm"  # Proxmox storage pool for the disk\n    interface    = "scsi0"      # scsi0 = first disk (virtio0 also common)\n    size         = 32           # GB — grows the cloned disk to this size\n    iothread     = true         # better I/O with virtio-scsi-single\n    discard      = "on"         # TRIM: thin provisioning reclaims space\n  }\n\n  # ── Network ───────────────────────────────────────────────────\n  network_device {\n    bridge = "vmbr0"   # Proxmox Linux bridge attached to your LAN\n    # model defaults to virtio (paravirtualized = fastest)\n  }\n\n  # ── Cloud-init ────────────────────────────────────────────────\n  # `initialization` writes an inline cloud-init config. On FIRST boot the\n  # guest configures itself: hostname, user, SSH keys, static IP.\n  # Terraform waits for cloud-init to complete before finishing apply.\n  initialization {\n    datastore_id = "local-lvm"  # where the cloud-init ISO (cidata) lives\n\n    ip_config {\n      ipv4 {\n        address = "192.168.1.101/24"  # static; use "dhcp" for DHCP\n        gateway = "192.168.1.1"\n      }\n    }\n\n    user_account {\n      username = var.vm_username\n      password = var.vm_password\n      # Better than passwords: SSH keys.\n      # keys = [var.ssh_public_key]\n    }\n  }\n\n  # Boot order: start after the node finishes booting.\n  startup {\n    order = "2"\n  }\n}\n'

PX_MAIN_TF_VM_LXC = '# main.tf — the infrastructure Terraform manages.\n# STAGE 1: a single VM cloned from a cloud-init template.\n#\n# HCL ANATOMY — every resource block follows this shape:\n#   resource "<PROVIDER>_<TYPE>" "<LOCAL_NAME>" {\n#     <argument> = <value>      # scalars: strings, numbers, booleans\n#     <block> { ... }          # nested blocks group related arguments\n#   }\n# The LOCAL_NAME ("docker" below) is only for YOUR config — Terraform builds\n# the address proxmox_virtual_environment_vm.docker from it. The real\n# Proxmox object is identified by vm_id.\n\nresource "proxmox_virtual_environment_vm" "docker" {\n  # ── Identity: WHERE it runs and WHAT it\'s called ──────────────\n  name      = "docker-01"     # hostname shown in the Proxmox UI\n  node_name = var.pve_node    # which cluster node runs it (default "pve")\n  vm_id     = 101             # Proxmox VMID — must be UNIQUE cluster-wide.\n                              # Convention: 1xx = VMs, 2xx = containers,\n                              # 9000+ = templates. Pick a scheme and keep it.\n\n  description = "Docker host — managed by Terraform"\n  tags        = ["terraform", "docker"]   # filterable in the Proxmox UI\n\n  # ── Clone source ──────────────────────────────────────────────\n  # Cloning a TEMPLATE beats installing from ISO: fast, identical every\n  # time, version-controlled. Build the template ONCE (Ubuntu 24.04):\n  #   1. Create a VM from the Ubuntu cloud image (qm importdisk)\n  #   2. Install qemu-guest-agent inside it (apt install qemu-guest-agent)\n  #   3. Convert: qm template 9000\n  #\n  # full = true  → FULL clone: an independent disk copy. The VM survives\n  #                even if you delete the template. Slower, uses more disk.\n  # full = false → LINKED clone: copy-on-write on the template\'s disk.\n  #                Fast and tiny — but the VM DIES with the template.\n  # RULE OF THUMB: Terraform-managed VMs are ALWAYS full clones.\n  # (telmate provider spells this `full_clone = true`.)\n  clone {\n    vm_id = var.template_vm_id   # 9000\n    full  = false                # <-- REVIEW: linked clone is wrong here\n  }\n\n  # ── Guest agent ───────────────────────────────────────────────\n  # The QEMU guest agent lets Proxmox query the guest\'s IP addresses.\n  # Terraform needs it for `terraform output` to show VM IPs and to wait\n  # for cloud-init to finish. The TEMPLATE must have qemu-guest-agent\n  # installed, or this block does nothing.\n  agent {\n    enabled = true\n  }\n\n  # ── CPU and memory ────────────────────────────────────────────\n  cpu {\n    cores = 2\n    # type defaults to "host" (passthrough). On OLDER CPUs without modern\n    # flags (e.g. Xeon X5650: no AVX), guests can fail to boot — pin it:\n    # type = "x86-64-v2-AES"\n  }\n  memory {\n    dedicated = 4096   # MB guaranteed. `floating` adds balloonable extra.\n  }\n\n  # ── Disk ──────────────────────────────────────────────────────\n  disk {\n    datastore_id = "local-lvm"  # Proxmox storage pool for the disk\n    interface    = "scsi0"      # scsi0 = first disk (virtio0 also common)\n    size         = 32           # GB — grows the cloned disk to this size\n    iothread     = true         # better I/O with virtio-scsi-single\n    discard      = "on"         # TRIM: thin provisioning reclaims space\n  }\n\n  # ── Network ───────────────────────────────────────────────────\n  network_device {\n    bridge = "vmbr0"   # Proxmox Linux bridge attached to your LAN\n    # model defaults to virtio (paravirtualized = fastest)\n  }\n\n  # ── Cloud-init ────────────────────────────────────────────────\n  # `initialization` writes an inline cloud-init config. On FIRST boot the\n  # guest configures itself: hostname, user, SSH keys, static IP.\n  # Terraform waits for cloud-init to complete before finishing apply.\n  initialization {\n    datastore_id = "local-lvm"  # where the cloud-init ISO (cidata) lives\n\n    ip_config {\n      ipv4 {\n        address = "192.168.1.101/24"  # static; use "dhcp" for DHCP\n        gateway = "192.168.1.1"\n      }\n    }\n\n    user_account {\n      username = var.vm_username\n      password = var.vm_password\n      # Better than passwords: SSH keys.\n      # keys = [var.ssh_public_key]\n    }\n  }\n\n  # Boot order: start after the node finishes booting.\n  startup {\n    order = "2"\n  }\n}\n\n# ── STAGE 2: LXC container ──────────────────────────────────────\n#\n# CONTAINERS vs VMs — when to use which:\n#   LXC  = OS-level virtualization, shares the host kernel. Tiny, instant\n#          boot, near-zero overhead. Perfect for single-purpose services\n#          (DNS, reverse proxy, monitoring). Cannot run another kernel\n#          (no Windows, no custom kernels).\n#   VM   = full hardware virtualization, own kernel. Use for Docker hosts,\n#          Kubernetes nodes, Windows, or strong isolation.\n#\n# The container resource mirrors the VM\'s shape: identity, cpu, memory,\n# disk, network, initialization. Two key differences:\n#   1. operating_system.template_file_id — containers boot from an OS\n#      TEMPLATE archive (not a VM template). Download once:\n#      `pveam download local debian-12-standard_12.7-1_amd64.tar.zst`\n#   2. network_interface (not network_device), and unprivileged = true\n#      maps root inside the container to an unprivileged host UID.\n\nresource "proxmox_virtual_environment_container" "pihole" {\n  node_name   = var.pve_node\n  vm_id       = 200                 # 2xx = containers, per our scheme\n  description = "Pi-hole DNS — managed by Terraform"\n  tags        = ["terraform", "dns"]\n\n  operating_system {\n    template_file_id = "local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst"\n    type             = "debian"\n  }\n\n  cpu {\n    cores = 1\n  }\n\n  memory {\n    dedicated = 512                 # MB — DNS barely sips memory\n  }\n\n  disk {\n    datastore_id = "local-lvm"\n    size         = 8               # GB\n  }\n\n  network_interface {\n    name   = "eth0"\n    bridge = "vmbr0"\n  }\n\n  initialization {\n    hostname = "pihole"\n\n    ip_config {\n      ipv4 {\n        address = "192.168.1.200/24"\n        gateway = "192.168.1.1"\n      }\n    }\n\n    user_account {\n      password = var.lxc_password\n    }\n  }\n\n  # Unprivileged: root inside the container != root on the host.\n  # Always prefer unprivileged unless you need device passthrough.\n  unprivileged = true\n\n  startup {\n    order = "1"   # DNS FIRST — everything else depends on name resolution\n  }\n}\n'

PX_MAIN_TF_STACK = '# main.tf — the infrastructure Terraform manages.\n# STAGE 1: a single VM cloned from a cloud-init template.\n#\n# HCL ANATOMY — every resource block follows this shape:\n#   resource "<PROVIDER>_<TYPE>" "<LOCAL_NAME>" {\n#     <argument> = <value>      # scalars: strings, numbers, booleans\n#     <block> { ... }          # nested blocks group related arguments\n#   }\n# The LOCAL_NAME ("docker" below) is only for YOUR config — Terraform builds\n# the address proxmox_virtual_environment_vm.docker from it. The real\n# Proxmox object is identified by vm_id.\n\nresource "proxmox_virtual_environment_vm" "docker" {\n  # ── Identity: WHERE it runs and WHAT it\'s called ──────────────\n  name      = "docker-01"     # hostname shown in the Proxmox UI\n  node_name = var.pve_node    # which cluster node runs it (default "pve")\n  vm_id     = 101             # Proxmox VMID — must be UNIQUE cluster-wide.\n                              # Convention: 1xx = VMs, 2xx = containers,\n                              # 9000+ = templates. Pick a scheme and keep it.\n\n  description = "Docker host — managed by Terraform"\n  tags        = ["terraform", "docker"]   # filterable in the Proxmox UI\n\n  # ── Clone source ──────────────────────────────────────────────\n  # Cloning a TEMPLATE beats installing from ISO: fast, identical every\n  # time, version-controlled. Build the template ONCE (Ubuntu 24.04):\n  #   1. Create a VM from the Ubuntu cloud image (qm importdisk)\n  #   2. Install qemu-guest-agent inside it (apt install qemu-guest-agent)\n  #   3. Convert: qm template 9000\n  #\n  # full = true  → FULL clone: an independent disk copy. The VM survives\n  #                even if you delete the template. Slower, uses more disk.\n  # full = false → LINKED clone: copy-on-write on the template\'s disk.\n  #                Fast and tiny — but the VM DIES with the template.\n  # RULE OF THUMB: Terraform-managed VMs are ALWAYS full clones.\n  # (telmate provider spells this `full_clone = true`.)\n  clone {\n    vm_id = var.template_vm_id   # 9000\n    full  = false                # <-- REVIEW: linked clone is wrong here\n  }\n\n  # ── Guest agent ───────────────────────────────────────────────\n  # The QEMU guest agent lets Proxmox query the guest\'s IP addresses.\n  # Terraform needs it for `terraform output` to show VM IPs and to wait\n  # for cloud-init to finish. The TEMPLATE must have qemu-guest-agent\n  # installed, or this block does nothing.\n  agent {\n    enabled = true\n  }\n\n  # ── CPU and memory ────────────────────────────────────────────\n  cpu {\n    cores = 2\n    # type defaults to "host" (passthrough). On OLDER CPUs without modern\n    # flags (e.g. Xeon X5650: no AVX), guests can fail to boot — pin it:\n    # type = "x86-64-v2-AES"\n  }\n  memory {\n    dedicated = 4096   # MB guaranteed. `floating` adds balloonable extra.\n  }\n\n  # ── Disk ──────────────────────────────────────────────────────\n  disk {\n    datastore_id = "local-lvm"  # Proxmox storage pool for the disk\n    interface    = "scsi0"      # scsi0 = first disk (virtio0 also common)\n    size         = 32           # GB — grows the cloned disk to this size\n    iothread     = true         # better I/O with virtio-scsi-single\n    discard      = "on"         # TRIM: thin provisioning reclaims space\n  }\n\n  # ── Network ───────────────────────────────────────────────────\n  network_device {\n    bridge = "vmbr0"   # Proxmox Linux bridge attached to your LAN\n    # model defaults to virtio (paravirtualized = fastest)\n  }\n\n  # ── Cloud-init ────────────────────────────────────────────────\n  # `initialization` writes an inline cloud-init config. On FIRST boot the\n  # guest configures itself: hostname, user, SSH keys, static IP.\n  # Terraform waits for cloud-init to complete before finishing apply.\n  initialization {\n    datastore_id = "local-lvm"  # where the cloud-init ISO (cidata) lives\n\n    ip_config {\n      ipv4 {\n        address = "192.168.1.101/24"  # static; use "dhcp" for DHCP\n        gateway = "192.168.1.1"\n      }\n    }\n\n    user_account {\n      username = var.vm_username\n      password = var.vm_password\n      # Better than passwords: SSH keys.\n      # keys = [var.ssh_public_key]\n    }\n  }\n\n  # Boot order: start after the node finishes booting.\n  startup {\n    order = "2"\n  }\n}\n\n# ── STAGE 2: LXC container ──────────────────────────────────────\n#\n# CONTAINERS vs VMs — when to use which:\n#   LXC  = OS-level virtualization, shares the host kernel. Tiny, instant\n#          boot, near-zero overhead. Perfect for single-purpose services\n#          (DNS, reverse proxy, monitoring). Cannot run another kernel\n#          (no Windows, no custom kernels).\n#   VM   = full hardware virtualization, own kernel. Use for Docker hosts,\n#          Kubernetes nodes, Windows, or strong isolation.\n#\n# The container resource mirrors the VM\'s shape: identity, cpu, memory,\n# disk, network, initialization. Two key differences:\n#   1. operating_system.template_file_id — containers boot from an OS\n#      TEMPLATE archive (not a VM template). Download once:\n#      `pveam download local debian-12-standard_12.7-1_amd64.tar.zst`\n#   2. network_interface (not network_device), and unprivileged = true\n#      maps root inside the container to an unprivileged host UID.\n\nresource "proxmox_virtual_environment_container" "pihole" {\n  node_name   = var.pve_node\n  vm_id       = 200                 # 2xx = containers, per our scheme\n  description = "Pi-hole DNS — managed by Terraform"\n  tags        = ["terraform", "dns"]\n\n  operating_system {\n    template_file_id = "local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst"\n    type             = "debian"\n  }\n\n  cpu {\n    cores = 1\n  }\n\n  memory {\n    dedicated = 512                 # MB — DNS barely sips memory\n  }\n\n  disk {\n    datastore_id = "local-lvm"\n    size         = 8               # GB\n  }\n\n  network_interface {\n    name   = "eth0"\n    bridge = "vmbr0"\n  }\n\n  initialization {\n    hostname = "pihole"\n\n    ip_config {\n      ipv4 {\n        address = "192.168.1.200/24"\n        gateway = "192.168.1.1"\n      }\n    }\n\n    user_account {\n      password = var.lxc_password\n    }\n  }\n\n  # Unprivileged: root inside the container != root on the host.\n  # Always prefer unprivileged unless you need device passthrough.\n  unprivileged = true\n\n  startup {\n    order = "1"   # DNS FIRST — everything else depends on name resolution\n  }\n}\n\n# ── STAGE 3: homelab stack — second VM ──────────────────────────\n#\n# A realistic homelab: docker-01 (apps), k3s-01 (Kubernetes experiments),\n# pihole (DNS). Each resource block is independent — Terraform builds a\n# dependency graph and creates them in parallel where possible.\n#\n# SCALING THIS PATTERN: for N identical nodes, don\'t copy-paste blocks —\n# use for_each:\n#   resource "proxmox_virtual_environment_vm" "k3s" {\n#     for_each  = toset(["k3s-01", "k3s-02", "k3s-03"])\n#     name      = each.key\n#     vm_id     = 102 + index(["k3s-01","k3s-02","k3s-03"], each.key)\n#     ... (rest identical)\n#   }\n# for_each gives you proxmox_virtual_environment_vm.k3s["k3s-01"] etc.\n\nresource "proxmox_virtual_environment_vm" "k3s" {\n  name      = "k3s-01"\n  node_name = var.pve_node\n  vm_id     = 102\n\n  description = "K3s playground — managed by Terraform"\n  tags        = ["terraform", "k3s"]\n\n  clone {\n    vm_id = var.template_vm_id\n    full  = true\n  }\n\n  agent {\n    enabled = true\n  }\n\n  cpu {\n    cores = 4\n  }\n\n  memory {\n    dedicated = 8192\n  }\n\n  disk {\n    datastore_id = "local-lvm"\n    interface    = "scsi0"\n    size         = 64\n    iothread     = true\n    discard      = "on"\n  }\n\n  network_device {\n    bridge = "vmbr0"\n  }\n\n  initialization {\n    datastore_id = "local-lvm"\n\n    ip_config {\n      ipv4 {\n        address = "192.168.1.102/24"\n        gateway = "192.168.1.1"\n      }\n    }\n\n    user_account {\n      username = var.vm_username\n      password = var.vm_password\n    }\n  }\n\n  startup {\n    order = "3"\n  }\n}\n'

PX_VARIABLES_TF = '# variables.tf — every value that changes between environments, or that is\n# SECRET, lives HERE. Never hardcode IPs, credentials, or node names in\n# main.tf — parameterize them.\n#\n# A variable block has four common arguments:\n#   description — ALWAYS write one. It\'s documentation AND plan-time help.\n#   type        — string, number, bool, list(string), map(string),\n#                 object({ name = string, ... }). Types catch mistakes early:\n#                 passing "abc" to a number variable fails BEFORE apply.\n#   default     — makes the variable OPTIONAL. No default = REQUIRED:\n#                 Terraform will prompt (or fail in automation).\n#   sensitive   — true HIDES the value in plan/apply output. Use for every\n#                 password, token, and key. (It still lands in state —\n#                 protect state like a secret too.)\n#   validation  — optional block: condition + error_message. Example:\n#     validation {\n#       condition     = can(cidrhost(var.subnet, 0))\n#       error_message = "Must be a valid CIDR block."\n#     }\n#\n# PRECEDENCE (lowest wins → highest wins):\n#   default < terraform.tfvars < *.auto.tfvars < TF_VAR_* env < -var flags\n# So: keep sane defaults in code, personal values in terraform.tfvars\n# (gitignored), secrets in env vars or -var on the command line.\n\nvariable "pve_endpoint" {\n  description = "Proxmox API endpoint, e.g. https://192.168.1.10:8006/"\n  type        = string\n  # No default: Terraform will prompt. In CI, set TF_VAR_pve_endpoint.\n}\n\nvariable "pve_api_token" {\n  description = "Proxmox API token (ID=value), e.g. terraform@pam!homelab=abc123"\n  type        = string\n  sensitive   = true\n}\n\nvariable "pve_node" {\n  description = "Proxmox node that runs the guests"\n  type        = string\n  default     = "pve"\n}\n\nvariable "template_vm_id" {\n  description = "VMID of the cloud-init template to clone"\n  type        = number\n  default     = 9000\n}\n\nvariable "vm_username" {\n  description = "Default user created inside VMs by cloud-init"\n  type        = string\n  default     = "student"\n}\n\nvariable "vm_password" {\n  description = "Password for the cloud-init user (prefer SSH keys in production)"\n  type        = string\n  sensitive   = true\n}\n\nvariable "lxc_password" {\n  description = "Root password for LXC containers"\n  type        = string\n  sensitive   = true\n}\n'

PX_OUTPUTS_TF = '# outputs.tf — values Terraform prints after apply and stores in state.\n# Other configs, scripts, and Ansible inventories read them via\n# `terraform output` or `terraform output -json`.\n#\n# An output block has:\n#   description — what the value is for (always write one)\n#   value       — ANY expression, usually a resource attribute:\n#                 <resource_type>.<local_name>.<attribute>\n#   sensitive   — true hides it unless explicitly requested\n#\n# THE QEMU-AGENT CATCH: the bpg provider can only report guest IPs when the\n# QEMU guest agent runs inside the VM (agent { enabled = true } in main.tf\n# AND qemu-guest-agent installed in the template). No agent → no IPs here.\n#\n# ipv4_addresses is a MAP keyed by interface name, e.g.:\n#   { lo = ["127.0.0.1"], eth0 = ["192.168.1.101"] }\n# [1] selects the second entry (eth0), [0] its first address.\n\noutput "docker_vm_ip" {\n  description = "IPv4 address of the docker-01 VM"\n  value       = proxmox_virtual_environment_vm.docker.ipv4_addresses[1][0]\n}\n\noutput "k3s_vm_ip" {\n  description = "IPv4 address of the k3s-01 VM"\n  value       = proxmox_virtual_environment_vm.k3s.ipv4_addresses[1][0]\n}\n\noutput "pihole_lxc_ip" {\n  description = "IPv4 address of the pihole container"\n  value       = proxmox_virtual_environment_container.pihole.ipv4_addresses["eth0"][0]\n}\n\noutput "vm_ids" {\n  description = "VMIDs of every guest Terraform manages"\n  value = {\n    docker = proxmox_virtual_environment_vm.docker.vm_id\n    k3s    = proxmox_virtual_environment_vm.k3s.vm_id\n    pihole = proxmox_virtual_environment_container.pihole.vm_id\n  }\n}\n'

PX_TFVARS = '# terraform.tfvars — YOUR values. Loaded automatically on every\n# plan/apply, so you don\'t retype -var flags.\n#\n# *** NEVER COMMIT THIS FILE. It holds secrets. ***\n# Add it to .gitignore on day one:\n#   echo "terraform.tfvars" >> .gitignore\n#\n# Precedence reminder: -var flags and TF_VAR_* env vars OVERRIDE these.\n\npve_endpoint  = "https://192.168.1.10:8006/"\npve_api_token = "terraform@pam!homelab=REPLACE-ME-WITH-YOUR-TOKEN"\npve_node      = "pve"\n\n# Sensitive values are better passed as env vars:\n#   export TF_VAR_vm_password=\'...\'\n#   export TF_VAR_lxc_password=\'...\'\nvm_password  = "REPLACE-ME"\nlxc_password = "REPLACE-ME"\n'

PX_EXPECTED_FILES = [
    'versions.tf', 'main.tf', 'variables.tf', 'outputs.tf', 'terraform.tfvars',
]

PX_STAGE_RESOURCES = {
    'vm': [
        'proxmox_virtual_environment_vm.docker',
    ],
    'vm+lxc': [
        'proxmox_virtual_environment_vm.docker',
        'proxmox_virtual_environment_container.pihole',
    ],
    'stack': [
        'proxmox_virtual_environment_vm.docker',
        'proxmox_virtual_environment_vm.k3s',
        'proxmox_virtual_environment_container.pihole',
    ],
}

PX_RESOURCE_IDS = {
    'proxmox_virtual_environment_vm.docker': 'pve/101',
    'proxmox_virtual_environment_vm.k3s': 'pve/102',
    'proxmox_virtual_environment_container.pihole': 'pve/200',
}

PX_OUTPUTS = {
    'docker_vm_ip': '192.168.1.101',
    'k3s_vm_ip': '192.168.1.102',
    'pihole_lxc_ip': '192.168.1.200',
}

PX_OUTPUT_STAGE = {
    'docker_vm_ip': 'vm',
    'k3s_vm_ip': 'stack',
    'pihole_lxc_ip': 'vm+lxc',
}

PX_REQUIRED_BLOCKS = {
    'versions.tf': ['terraform {', 'required_providers', 'bpg/proxmox'],
    'main.tf': ['proxmox_virtual_environment_vm'],
    'variables.tf': ['variable "'],
    'outputs.tf': ['output "'],
    'terraform.tfvars': ['='],
}


def _px_files(findings: dict[str, Any]) -> dict[str, str]:
    return findings.get('px_files') or {}


def _px_prompt() -> str:
    return 'student@homelab:~/proxmox$ '


def _px_banner() -> list[str]:
    return [
        'Road to CISSP - Terraform for Proxmox VE lab   (simulated: nothing is really provisioned)',
        'You WRITE every .tf file yourself: provider -> VM -> container -> variables -> outputs.',
        'Each objective teaches the exact HCL, line by line. Use `write <file>` (paste HCL, end',
        'with EOF) or `write <file> --scaffold` for the expert reference. `cat` shows any file.',
        'Try: ls \u00b7 write versions.tf --scaffold \u00b7 terraform init \u00b7 terraform validate',
    ]


def _px_stage(main_tf: str | None) -> str:
    """Derive the lab stage from written main.tf content."""
    import re as _re
    if not main_tf:
        return 'empty'
    vms = len(_re.findall(r'resource\s+"proxmox_virtual_environment_vm"', main_tf))
    cts = len(_re.findall(r'resource\s+"proxmox_virtual_environment_container"', main_tf))
    if vms >= 2 and cts >= 1:
        return 'stack'
    if vms >= 1 and cts >= 1:
        return 'vm+lxc'
    if vms >= 1:
        return 'vm'
    return 'empty'


def _px_clone_full(main_tf: str | None) -> bool:
    """True when every clone block requests a full clone (bpg `full` or telmate `full_clone`)."""
    import re as _re
    if not main_tf:
        return False
    blocks = _re.findall(r'clone\s*\{(.*?)\}', main_tf, _re.DOTALL)
    if not blocks:
        return False
    return all(
        _re.search(r'\bfull\s*=\s*true', b) or _re.search(r'\bfull_clone\s*=\s*true', b)
        for b in blocks
    )


def _px_scaffold(filename: str, findings: dict[str, Any]) -> str | None:
    """Expert reference content for `write <file> --scaffold`."""
    if filename == 'versions.tf':
        return PX_VERSIONS_TF
    if filename == 'variables.tf':
        return PX_VARIABLES_TF
    if filename == 'outputs.tf':
        return PX_OUTPUTS_TF
    if filename == 'terraform.tfvars':
        return PX_TFVARS
    if filename == 'main.tf':
        stage = _px_stage(_px_files(findings).get('main.tf'))
        if stage == 'empty':
            return PX_MAIN_TF_VM
        if stage == 'vm':
            return PX_MAIN_TF_VM_LXC
        return PX_MAIN_TF_STACK
    return None


def _px_hcl_validate(content: str, filename: str) -> tuple[bool, str]:
    """HCL structure check for Proxmox .tf files: balanced delimiters + required blocks."""
    stripped = '\n'.join(
        line for line in content.splitlines()
        if line.strip() and not line.strip().startswith('#') and not line.strip().startswith('//')
    )
    for open_c, close_c, name in [('{', '}', 'braces'), ('[', ']', 'brackets')]:
        if stripped.count(open_c) != stripped.count(close_c):
            return False, f"unbalanced {name} in {filename}: {stripped.count(open_c)} '{open_c}' vs {stripped.count(close_c)} '{close_c}'"
    if stripped.count('"') % 2 != 0:
        return False, f'unbalanced quotes in {filename}'
    need = PX_REQUIRED_BLOCKS.get(filename.split('/')[-1], [])
    missing = [b for b in need if b not in content]
    if missing:
        return False, f"{filename} is missing required block(s): {', '.join(missing)}"
    return True, 'HCL structure looks valid.'


def _px_record_write(filename: str, content: str, findings: dict[str, Any]) -> dict[str, Any]:
    """Store a written file and derive stage/clone findings from main.tf."""
    files = dict(_px_files(findings))
    files[filename] = content
    new_findings: dict[str, Any] = {'px_files': files, 'px_wrote_file': filename}
    if filename == 'main.tf':
        new_findings['px_stage'] = _px_stage(content)
        if _px_clone_full(content):
            new_findings['px_clone_fixed'] = True
    return new_findings


def _px_cmd_write(raw: str, findings: dict[str, Any]) -> CommandResult:
    """write <file> with heredoc body terminated by EOF, or `write <file> --scaffold`."""
    lines = raw.split('\n')
    first = lines[0].strip().split()
    if len(first) < 2:
        return CommandResult(
            output='Usage: write <file>\n  then paste HCL lines, ending with a line containing only EOF\n  or: write <file> --scaffold   (writes the expert reference)',
            exit_code=1,
        )
    filename = first[1].split('/')[-1]
    if not filename.endswith('.tf') and filename != 'terraform.tfvars':
        return CommandResult(output=f'write: {filename}: only .tf files and terraform.tfvars can be written in this lab.', exit_code=1)
    if filename not in PX_EXPECTED_FILES:
        return CommandResult(output=f'write: {filename}: not part of this lab. Expected: {", ".join(PX_EXPECTED_FILES)}', exit_code=1)
    if '--scaffold' in first:
        content = _px_scaffold(filename, findings)
        if content is None:
            return CommandResult(output=f'write: no scaffold available for {filename}.', exit_code=1)
        new_findings = _px_record_write(filename, content, findings)
        return CommandResult(
            output=f'Wrote {len(content.splitlines())} lines to {filename} (expert scaffold).\nRun `terraform validate` to check it.',
            findings=new_findings,
        )
    body_lines = []
    for line in lines[1:]:
        if line.strip() == 'EOF':
            break
        body_lines.append(line)
    else:
        return CommandResult(
            output='write: heredoc not terminated - end your content with a line containing only EOF.',
            exit_code=1,
        )
    content = '\n'.join(body_lines).strip('\n')
    if not content.strip():
        return CommandResult(output=f'write: {filename}: empty content, nothing written.', exit_code=1)
    ok, msg = _px_hcl_validate(content, filename)
    if not ok:
        return CommandResult(output=f'write: HCL structure error: {msg}', exit_code=1)
    new_findings = _px_record_write(filename, content, findings)
    return CommandResult(
        output=f'Wrote {len(content.splitlines())} lines to {filename}. {msg}\nRun `terraform validate` to check it.',
        findings=new_findings,
    )


def _px_cmd_cat(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not args:
        return CommandResult(output='Usage: cat <file>', exit_code=1)
    name = args[0].split('/')[-1]
    files = _px_files(findings)
    if name in files:
        return CommandResult(output=files[name], findings={'px_config_viewed': True})
    if name in PX_EXPECTED_FILES:
        scaffold = _px_scaffold(name, findings)
        note = (
            f'# {name} has not been written yet.\n'
            f'# Expert reference (use `write {name} --scaffold` to adopt it):\n\n'
        )
        return CommandResult(output=note + (scaffold or ''), findings={'px_config_viewed': True})
    return CommandResult(output=f'cat: {args[0]}: No such file or directory', exit_code=1)


def _px_cmd_ls(findings: dict[str, Any]) -> CommandResult:
    files = sorted(_px_files(findings).keys())
    if not files:
        return CommandResult(output='(empty directory - no .tf files yet. Start with: write versions.tf)')
    if findings.get('init_done'):
        files += ['.terraform/', '.terraform.lock.hcl']
    if findings.get('px_plan_saved'):
        files.append(findings['px_plan_saved'])
    if findings.get('px_applied') and not findings.get('destroyed'):
        files.append('terraform.tfstate')
    return CommandResult(output='  '.join(files))


def _px_cmd_edit(args: list[str], findings: dict[str, Any]) -> CommandResult:
    """edit main.tf — flip the clone block from linked to full (the clone lesson)."""
    if not args or args[0].split('/')[-1] != 'main.tf':
        return CommandResult(output='Usage: edit main.tf   (flips the clone block from linked to full)', exit_code=1)
    files = _px_files(findings)
    content = files.get('main.tf')
    if not content:
        return CommandResult(output='edit: main.tf not written yet. Write it first: write main.tf --scaffold', exit_code=1)
    if _px_clone_full(content):
        return CommandResult(output='edit: clone block already requests a full clone - nothing to change.')
    import re as _re
    def _fix_clone_block(m):
        block = m.group(0)
        fixed = _re.sub(r'\bfull\s*=\s*false', 'full = true', block, count=1)
        fixed = _re.sub(r'\bfull_clone\s*=\s*false', 'full_clone = true', fixed, count=1)
        return fixed
    # Only touch the first clone BLOCK: comments elsewhere in the file can
    # mention linked clones without being the real argument.
    new_content, n = _re.subn(r'clone\s*\{[^}]*\}', _fix_clone_block, content, count=1)
    if n == 0 or not _px_clone_full(new_content):
        if _px_clone_full(content):
            return CommandResult(output='edit: clone block already requests a full clone - nothing to change.')
        return CommandResult(output='edit: no `full = false` clone block found in main.tf.', exit_code=1)
    files = dict(files)
    files['main.tf'] = new_content
    return CommandResult(
        output='Edited main.tf: clone block now uses a FULL clone.\nRun `terraform plan` to preview the change, then `terraform apply` to deploy it.',
        findings={'px_files': files, 'px_clone_fixed': True},
    )


def _px_cmd_init(findings: dict[str, Any]) -> CommandResult:
    files = _px_files(findings)
    if 'versions.tf' not in files:
        return CommandResult(
            output='Error: no versions.tf found.\nWrite it first: write versions.tf --scaffold',
            exit_code=1,
        )
    if 'bpg/proxmox' not in files['versions.tf']:
        return CommandResult(
            output='Error: versions.tf does not declare the bpg/proxmox provider.',
            exit_code=1,
        )
    if 'provider "proxmox"' not in files['versions.tf']:
        return CommandResult(
            output='Error: versions.tf has no provider "proxmox" block (endpoint + api_token).',
            exit_code=1,
        )
    out = (
        'Initializing the backend...\n'
        'Initializing provider plugins...\n'
        '- Finding bpg/proxmox versions matching "~> 0.66"...\n'
        '- Installing bpg/proxmox v0.66.0...\n'
        '- Installed bpg/proxmox v0.66.0 (self-signed, key ID 9F2A5C4D8E1B3F07)\n\n'
        'Terraform has been successfully initialized!'
    )
    return CommandResult(output=out, findings={'init_done': True, 'px_init_done': True})


def _px_cmd_validate(findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    files = _px_files(findings)
    if 'main.tf' not in files:
        return CommandResult(output='Error: no main.tf - nothing to validate.', exit_code=1)
    problems = []
    for name, content in files.items():
        ok, msg = _px_hcl_validate(content, name)
        if not ok:
            problems.append(f'{name}: {msg}')
    if problems:
        return CommandResult(
            output='Error: configuration invalid.\n' + '\n'.join(problems),
            exit_code=1,
        )
    return CommandResult(output='Success! The configuration is valid.', findings={'validated': True})


def _px_plan_body(stage: str) -> str:
    lines = []
    for r in PX_STAGE_RESOURCES[stage]:
        rtype, rname = r.split('.', 1)
        lines.append(f'  # {r} will be created')
        lines.append(f'  + resource "{rtype}" "{rname}" {{')
        if rtype.endswith('_vm'):
            lines.append('      + agent          = [{ enabled = true }]')
            lines.append('      + clone          = [{ full = true, vm_id = 9000 }]')
            lines.append('      + cpu            = [{ cores = 2 }]')
            lines.append('      + memory         = [{ dedicated = 4096 }]')
            lines.append('      + name           = "docker-01"')
            lines.append('      + node_name      = "pve"')
            lines.append('      + vm_id          = 101')
        else:
            lines.append('      + cpu            = [{ cores = 1 }]')
            lines.append('      + memory         = [{ dedicated = 512 }]')
            lines.append('      + node_name      = "pve"')
            lines.append('      + unprivileged   = true')
            lines.append('      + vm_id          = 200')
        lines.append('    }')
        lines.append('')
    return '\n'.join(lines)


def _px_plan_output(findings: dict[str, Any], out_file: str | None) -> tuple[str, dict[str, Any]]:
    stage = _px_stage(_px_files(findings).get('main.tf'))
    applied = findings.get('px_applied') and not findings.get('destroyed')
    fixed = findings.get('px_clone_fixed')
    fix_deployed = findings.get('px_fix_deployed')

    if stage == 'empty':
        return (
            'No main.tf with Proxmox resources found. Write one first: write main.tf --scaffold',
            {},
        )
    if applied and fixed and not fix_deployed:
        body = (
            '  # proxmox_virtual_environment_vm.docker will be updated in-place\n'
            '  ~ resource "proxmox_virtual_environment_vm" "docker" {\n'
            '        id       = "101"\n'
            '      ~ clone    = [\n'
            '          ~ {\n'
            '              ~ full = false -> true\n'
            '            },\n'
            '        ]\n'
            '      # (12 unchanged attributes hidden)\n'
            '    }\n'
        )
        summary = 'Plan: 0 to add, 1 to change, 0 to destroy.'
    elif applied:
        return (
            'No changes. Your infrastructure matches the configuration.\n\n'
            'Terraform has compared your real infrastructure against your configuration and found no differences, '
            'so no actions are needed.',
            {'plan_done': True},
        )
    else:
        body = _px_plan_body(stage)
        n = len(PX_STAGE_RESOURCES[stage])
        summary = f'Plan: {n} to add, 0 to change, 0 to destroy.'

    head = (
        'Terraform used the selected providers to generate the following execution plan. Resource\n'
        'actions are indicated with the following symbols:\n'
        '  + create\n'
        '  ~ update in-place\n\n'
        'Terraform will perform the following actions:\n\n'
    )
    notes = []
    if not fixed and not applied and stage != 'empty':
        notes.append(
            'Note: proxmox_virtual_environment_vm.docker uses a LINKED clone (full = false). '
            'Linked clones depend on the template surviving - review before applying.'
        )
    if out_file:
        notes.append(f'\nSaved the plan to: {out_file}\n\nTo perform exactly these actions, run: "terraform apply \"{out_file}\""')
    new_findings: dict[str, Any] = {'plan_done': True}
    if out_file:
        new_findings['px_plan_saved'] = out_file
    out = head + body + '\n' + summary
    if notes:
        out += '\n\n' + '\n'.join(notes)
    return out, new_findings


def _px_do_apply(findings: dict[str, Any], via_plan: str | None) -> CommandResult:
    stage = _px_stage(_px_files(findings).get('main.tf'))
    resources = PX_STAGE_RESOURCES.get(stage, [])
    lines = []
    if via_plan:
        lines.append(f'Applying saved plan "{via_plan}"...\n')
    for r in resources:
        lines.append(f'{r}: Creating...')
    if resources:
        lines.append('')
    for r in resources:
        lines.append(f'{r}: Creation complete after 4s [id={PX_RESOURCE_IDS[r]}]')
    lines.append('')
    fixed = findings.get('px_clone_fixed')
    if fixed and findings.get('px_applied'):
        summary = 'Apply complete! Resources: 0 added, 1 changed, 0 destroyed.'
    else:
        summary = f'Apply complete! Resources: {len(resources)} added, 0 changed, 0 destroyed.'
    lines.append(summary)
    lines.append('')
    lines.append('Outputs:')
    lines.append('')
    order = {'vm': 0, 'vm+lxc': 1, 'stack': 2}
    for k in sorted(PX_OUTPUTS):
        if order[PX_OUTPUT_STAGE[k]] <= order[stage]:
            lines.append(f'{k} = "{PX_OUTPUTS[k]}"')
    new_findings: dict[str, Any] = {
        'px_applied': True,
        'ever_applied': True,
        'destroyed': False,
        'applied_resources': list(resources),
        'px_applied_resources': list(resources),
        'px_applied_stage': stage,
        'px_pending_apply': False,
        'plan_done': True,
    }
    if fixed:
        new_findings['px_fix_deployed'] = True
    return CommandResult(output='\n'.join(lines), findings=new_findings)


def _px_do_destroy(findings: dict[str, Any]) -> CommandResult:
    resources = findings.get('px_applied_resources') or []
    lines = []
    for r in reversed(resources):
        lines.append(f'{r}: Destroying... [id={PX_RESOURCE_IDS[r]}]')
    lines.append('')
    for r in reversed(resources):
        lines.append(f'{r}: Destruction complete after 2s')
    lines.append('')
    lines.append(f'Destroy complete! Resources: {len(resources)} destroyed.')
    return CommandResult(output='\n'.join(lines), findings={
        'destroyed': True,
        'px_applied': False,
        'px_pending_destroy': False,
        'applied_resources': [],
        'px_applied_resources': [],
    })


def _px_cmd_plan(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    cli_vars, rest = _extract_vars(args)
    out_file = None
    for a in rest:
        if a.startswith('-out='):
            out_file = a[5:]
    out, new_findings = _px_plan_output(findings, out_file)
    if cli_vars:
        new_findings['variables_set'] = True
    if out_file:
        new_findings['plan_saved'] = out_file
    return CommandResult(output=out, findings=new_findings)


def _px_cmd_apply(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    cli_vars, rest = _extract_vars(args)
    if cli_vars:
        findings = dict(findings)
        findings['variables_set'] = True
    plan_file = None
    for a in rest:
        if not a.startswith('-') and '=' not in a:
            plan_file = a
    auto = _has_flag(rest, '-auto-approve')
    stage = _px_stage(_px_files(findings).get('main.tf'))
    if stage == 'empty':
        return CommandResult(output='Nothing to apply: main.tf has no Proxmox resources.', exit_code=1)
    if auto or plan_file:
        return _px_do_apply(findings, via_plan=plan_file)
    return CommandResult(
        output='Do you want to perform these actions?\n  Terraform will perform the actions described above.\n  Only \'yes\' will be accepted to approve.\n\n  Enter a value: ',
        findings={'px_pending_apply': True, 'pending_cli_vars': cli_vars},
    )


def _px_cmd_destroy(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not findings.get('px_applied'):
        return CommandResult(output='Nothing to destroy: no resources are currently applied.', exit_code=1)
    if _has_flag(args, '-auto-approve'):
        return _px_do_destroy(findings)
    return CommandResult(
        output='Do you really want to destroy all resources?\n  Terraform will destroy all your managed infrastructure, as shown above.\n  There is no undo. Only \'yes\' will be accepted to confirm.\n\n  Enter a value: ',
        findings={'px_pending_destroy': True},
    )


def _px_cmd_show(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    plan_file = findings.get('px_plan_saved')
    if args and plan_file and args[0] == plan_file:
        out, _ = _px_plan_output(findings, plan_file)
        return CommandResult(output=out)
    resources = findings.get('px_applied_resources') or []
    if not resources:
        return CommandResult(output='No state.')
    lines = ['# terraform.tfstate (simulated)']
    for r in resources:
        lines.append(f'# {r}:')
        lines.append(f'  id = "{PX_RESOURCE_IDS[r]}"')
    lines.append('')
    lines.append('Outputs:')
    lines.append('')
    order = {'vm': 0, 'vm+lxc': 1, 'stack': 2}
    stage = _px_stage(_px_files(findings).get('main.tf'))
    for k in sorted(PX_OUTPUTS):
        if order[PX_OUTPUT_STAGE[k]] <= order[stage]:
            lines.append(f'{k} = "{PX_OUTPUTS[k]}"')
    return CommandResult(output='\n'.join(lines), findings={'state_viewed': True})


def _px_cmd_state(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not args or args[0] != 'list':
        return CommandResult(output='Usage: terraform state list', exit_code=1)
    resources = findings.get('px_applied_resources') or []
    return CommandResult(output='\n'.join(resources) or '(no resources in state)', findings={'state_viewed': True})


def _px_cmd_output(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not findings.get('px_applied'):
        return CommandResult(output='No outputs defined.', exit_code=1)
    order = {'vm': 0, 'vm+lxc': 1, 'stack': 2}
    stage = _px_stage(_px_files(findings).get('main.tf'))
    available = {k: v for k, v in PX_OUTPUTS.items() if order[PX_OUTPUT_STAGE[k]] <= order[stage]}
    if args:
        name = args[0]
        if name not in available:
            return CommandResult(output=f'Error: output "{name}" not found.', exit_code=1)
        return CommandResult(output=f'{name} = "{available[name]}"', findings={'outputs_viewed': True, 'px_outputs_viewed': True})
    lines = [f'{k} = "{v}"' for k, v in sorted(available.items())]
    return CommandResult(output='\n'.join(lines), findings={'outputs_viewed': True, 'px_outputs_viewed': True})


def _cmd_px_terraform(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not args:
        return CommandResult(output='Usage: terraform <init|validate|plan|apply|destroy|show|state|output|version>', exit_code=1)
    sub = args[0]
    rest = args[1:]
    if sub == 'init':
        return _px_cmd_init(findings)
    if sub == 'validate':
        return _px_cmd_validate(findings)
    if sub == 'plan':
        return _px_cmd_plan(rest, findings)
    if sub == 'apply':
        return _px_cmd_apply(rest, findings)
    if sub == 'destroy':
        return _px_cmd_destroy(rest, findings)
    if sub == 'show':
        return _px_cmd_show(rest, findings)
    if sub == 'state':
        return _px_cmd_state(rest, findings)
    if sub == 'output':
        return _px_cmd_output(rest, findings)
    if sub == 'fmt':
        return CommandResult(output='\n'.join(sorted(_px_files(findings).keys())) or '(no .tf files)')
    if sub == 'version':
        return _cmd_version()
    return CommandResult(output=f'Terraform has no command named "{sub}".', exit_code=1)


def _px_run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    """Entry point for the Proxmox scenario: mirrors run() with Proxmox handlers."""
    raw = (command or '').strip()
    if not raw:
        return CommandResult(output='')

    lowered_first = raw.split('\n', 1)[0].strip().lower()

    # pending interactive confirmations
    if lowered_first in ('yes', 'y') and '\n' not in raw:
        if findings.get('px_pending_apply'):
            return _px_do_apply(findings, via_plan=None)
        if findings.get('px_pending_destroy'):
            return _px_do_destroy(findings)
        return CommandResult(output='Nothing is waiting for confirmation.')

    parts = _parse(lowered_first)
    if not parts:
        return CommandResult(output='')
    cmd = parts[0]
    args = parts[1:]

    if cmd in ('clear', 'cls'):
        return CommandResult(output='', clear=True)
    if cmd in ('help', '?'):
        return CommandResult(output=(
            'Available commands (simulated - nothing is really provisioned):\n'
            '  ls / cat <file>             list .tf files / show one\n'
            '  write <file>                write a .tf file (paste HCL, end with EOF)\n'
            '  write <file> --scaffold     write the expert reference implementation\n'
            '  edit main.tf                flip the clone block: linked -> full clone\n'
            '  terraform init              download the bpg/proxmox provider\n'
            '  terraform validate          HCL structure + consistency check (needs init)\n'
            '  terraform fmt               list .tf files\n'
            '  terraform plan [-out=FILE]  preview changes; -out saves the plan\n'
            '  terraform apply [plan]      create/update resources (prompts; -auto-approve skips)\n'
            '  terraform destroy           tear everything down (prompts; -auto-approve skips)\n'
            '  terraform show              show current state\n'
            '  terraform state list        list resources tracked in state\n'
            '  terraform output [name]     show output values\n'
            '  terraform plan -var="pve_node=pve2"   override a variable\n'
            '  export TF_VAR_<n>=<v>       set a variable via the environment\n'
            '  env                         show environment variables\n'
            '  terraform version | help | clear'
        ))
    if cmd == 'ls':
        return _px_cmd_ls(findings)
    if cmd == 'cat':
        return _px_cmd_cat(args, findings)
    if cmd == 'write':
        return _px_cmd_write(raw, findings)
    if cmd == 'edit':
        return _px_cmd_edit(args, findings)
    if cmd == 'export':
        return _cmd_export(raw, findings)
    if cmd == 'env':
        return _cmd_env(findings)
    if cmd in ('terraform', 'tf'):
        return _cmd_px_terraform([a for a in args], findings)
    return CommandResult(
        output=f'{parts[0]}: command not found (try `help`)',
        exit_code=127,
    )

# ===========================================================================
# AZURE SCENARIO (terraform-azure-001)
# ===========================================================================
# The student WRITES every .tf file with the `write` heredoc workflow:
#   write main.tf
#   <HCL lines>
#   EOF
# (all sent as one multi-line command). `terraform plan` / `apply` discover
# resources by parsing the student's own HCL, so validators and the plan
# reflect what was actually written. Findings keys are `azure_`-prefixed to
# avoid collisions with the aws/k8s/gcp scenarios sharing this shell.
# Nothing is executed; nothing is provisioned.
# ===========================================================================

_AZURE_SUBSCRIPTION = "11111111-2222-3333-4444-555555555555"
_AZURE_RESOURCE_GROUP = "rg-road2cissp-lab"

# azurerm resource type -> (Azure resource-provider namespace, ARM type segment)
_AZURE_RP = {
    "azurerm_virtual_network": ("Microsoft.Network", "virtualNetworks"),
    "azurerm_subnet": ("Microsoft.Network", "subnets"),
    "azurerm_network_security_group": ("Microsoft.Network", "networkSecurityGroups"),
    "azurerm_network_interface": ("Microsoft.Network", "networkInterfaces"),
    "azurerm_linux_virtual_machine": ("Microsoft.Compute", "virtualMachines"),
    "azurerm_windows_virtual_machine": ("Microsoft.Compute", "virtualMachines"),
    "azurerm_storage_account": ("Microsoft.Storage", "storageAccounts"),
    "azurerm_mssql_server": ("Microsoft.Sql", "servers"),
    "azurerm_mssql_database": ("Microsoft.Sql", "databases"),
    "azurerm_public_ip": ("Microsoft.Network", "publicIPAddresses"),
    "azurerm_subnet_network_security_group_association": ("Microsoft.Network", "associations"),
}

_AZURE_EXPECTED_FILES = [
    "provider.tf", "main.tf", "variables.tf", "outputs.tf",
    "backend.tf", "terraform.tfvars",
]


def _azure_files(findings: dict[str, Any]) -> dict[str, str]:
    return findings.get("azure_files") or {}


def _azure_all_hcl(findings: dict[str, Any]) -> str:
    return "\n".join(_azure_files(findings).values())


def _azure_parse_blocks(hcl: str, keyword: str) -> list[tuple[str, str, str]]:
    """Parse top-level `keyword "a" "b" { ... }` blocks with brace-depth tracking.

    Returns [(first_label, second_label, body), ...]. Works for resource and
    output blocks (data blocks too).
    """
    import re as _re

    blocks: list[tuple[str, str, str]] = []
    for m in _re.finditer(keyword + r'\s+"([^"]+)"\s+"([^"]+)"\s*\{', hcl):
        depth = 1
        i = m.end()
        while i < len(hcl) and depth:
            if hcl[i] == "{":
                depth += 1
            elif hcl[i] == "}":
                depth -= 1
            i += 1
        blocks.append((m.group(1), m.group(2), hcl[m.end(): i - 1]))
    return blocks


def _azure_resources(findings: dict[str, Any]) -> list[tuple[str, str, str]]:
    """All `resource` blocks across the student's written .tf files, in order."""
    blocks: list[tuple[str, str, str]] = []
    seen: set[str] = set()
    for name in sorted(_azure_files(findings)):
        for rtype, rname, body in _azure_parse_blocks(_azure_files(findings)[name], "resource"):
            addr = rtype + "." + rname
            if addr not in seen:
                seen.add(addr)
                blocks.append((rtype, rname, body))
    return blocks


def _azure_resource_id(rtype: str, rname: str) -> str:
    sub = _AZURE_SUBSCRIPTION
    rg = _AZURE_RESOURCE_GROUP
    if rtype == "azurerm_resource_group":
        return "/subscriptions/" + sub + "/resourceGroups/" + rg
    rp, seg = _AZURE_RP.get(rtype, ("Microsoft.Resources", rtype.replace("azurerm_", "")))
    return (
        "/subscriptions/" + sub + "/resourceGroups/" + rg
        + "/providers/" + rp + "/" + seg + "/" + rname
    )


def _azure_block_arg(body: str, arg: str) -> str | None:
    """First top-level `"arg" = "literal"` string value inside a block body."""
    import re as _re

    m = _re.search(r'(?m)^\s*' + _re.escape(arg) + r'\s*=\s*"([^"]*)"', body)
    return m.group(1) if m else None


def _azure_output_values(findings: dict[str, Any]) -> dict[str, str]:
    """Resolve `output` blocks: literals and <resource>.<attr> references."""
    import re as _re

    values: dict[str, str] = {}
    resources = {(t, n): b for t, n, b in _azure_resources(findings)}
    for m in _re.finditer(r'output\s+"([^"]+)"\s*\{', _azure_all_hcl(findings)):
        oname = m.group(1)
        depth = 1
        i = m.end()
        hcl = _azure_all_hcl(findings)
        while i < len(hcl) and depth:
            if hcl[i] == "{":
                depth += 1
            elif hcl[i] == "}":
                depth -= 1
            i += 1
        body = hcl[m.end(): i - 1]
        mv = _re.search(r"value\s*=\s*([^\n#]+)", body)
        if not mv:
            continue
        expr = mv.group(1).strip().rstrip(",")
        lit = _re.fullmatch(r'"([^"]*)"', expr)
        if lit:
            values[oname] = lit.group(1)
            continue
        ref = _re.fullmatch(r"(azurerm_[A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)", expr)
        if ref and (ref.group(1), ref.group(2)) in resources:
            resolved = _azure_block_arg(resources[(ref.group(1), ref.group(2))], ref.group(3))
            values[oname] = resolved if resolved is not None else "(known after apply)"
            continue
        values[oname] = "(known after apply)"
    return values


def _azure_plan_body(blocks: list[tuple[str, str, str]]) -> str:
    lines = []
    for rtype, rname, body in blocks:
        lines.append("  # " + rtype + "." + rname + " will be created")
        lines.append('  + resource "' + rtype + '" "' + rname + '" {')
        shown = 0
        for bl in body.splitlines():
            s = bl.strip()
            if not s or s.startswith("#") or s.startswith("//"):
                continue
            lines.append("      + " + s)
            shown += 1
            if shown >= 5:
                lines.append("      + ... (remaining attributes hidden)")
                break
        lines.append("    }")
        lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# file commands: write / cat / ls / rm / validate
# ---------------------------------------------------------------------------

def _azure_cmd_write(raw: str, findings: dict[str, Any]) -> CommandResult:
    """write <file> -- heredoc body on following lines, terminated by EOF."""
    lines = raw.split("\n")
    first = lines[0].strip().split()
    if len(first) < 2:
        return CommandResult(
            output=(
                "Usage: write <file>\n"
                "  then paste HCL lines, ending with a line containing only EOF\n"
                "Example:\n"
                "  write provider.tf\n"
                '  provider "azurerm" {\n'
                "    features {}\n"
                "  }\n"
                "  EOF"
            ),
            exit_code=1,
        )
    target = first[1]
    if "/" in target or "\\" in target or ".." in target:
        return CommandResult(output="write: paths are not allowed in this lab.", exit_code=1)
    filename = target.split("/")[-1]
    if not filename.endswith(".tf"):
        return CommandResult(output="write: " + filename + ": only .tf files can be written in this lab.", exit_code=1)
    body_lines = []
    for line in lines[1:]:
        if line.strip() == "EOF":
            break
        body_lines.append(line)
    else:
        return CommandResult(
            output="write: heredoc not terminated - end your content with a line containing only EOF.",
            exit_code=1,
        )
    content = "\n".join(body_lines).strip("\n")
    if not content.strip():
        return CommandResult(output="write: " + filename + ": empty content, nothing written.", exit_code=1)
    ok, msg = _hcl_validate(content, filename, required_blocks={})
    if not ok:
        return CommandResult(output="write: HCL structure error: " + msg, exit_code=1)
    files = dict(_azure_files(findings))
    files[filename] = content
    return CommandResult(
        output="Wrote " + str(len(content.splitlines())) + " lines to " + filename + ". " + msg
               + "\nRun `terraform validate` to check it.",
        findings={"azure_files": files, "azure_wrote_file": filename, "azure_validated": False},
    )


def _azure_cmd_cat(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not args:
        return CommandResult(output="Usage: cat <file>", exit_code=1)
    name = args[0].split("/")[-1]
    files = _azure_files(findings)
    if name in files:
        return CommandResult(output=files[name], findings={"azure_config_viewed": True})
    if name in _AZURE_EXPECTED_FILES:
        return CommandResult(
            output="# " + name + " has not been written yet.\n# Use: write " + name + "  (paste HCL, end with EOF)"
        )
    return CommandResult(output="cat: " + args[0] + ": No such file or directory", exit_code=1)


def _azure_cmd_ls(findings: dict[str, Any]) -> CommandResult:
    files = sorted(_azure_files(findings).keys())
    if not files:
        return CommandResult(output="(empty directory - no .tf files yet. Start with: write provider.tf)")
    if findings.get("azure_init_done"):
        files += [".terraform/", ".terraform.lock.hcl"]
    if findings.get("azure_plan_saved"):
        files.append(findings["azure_plan_saved"])
    if findings.get("azure_applied"):
        files.append("terraform.tfstate")
    return CommandResult(output="  ".join(files))


def _azure_cmd_rm(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not args:
        return CommandResult(output="Usage: rm <file>", exit_code=1)
    name = args[0].split("/")[-1]
    files = dict(_azure_files(findings))
    if name not in files:
        return CommandResult(output="rm: " + args[0] + ": No such file", exit_code=1)
    del files[name]
    return CommandResult(
        output="Removed " + name,
        findings={"azure_files": files, "azure_validated": False},
    )


def _azure_hcl_problems(findings: dict[str, Any]) -> list[str]:
    """Structural HCL check across every written file + provider sanity."""
    import re as _re

    problems: list[str] = []
    files = _azure_files(findings)
    for name in sorted(files):
        ok, msg = _hcl_validate(files[name], name, required_blocks={})
        if not ok:
            problems.append(name + ": " + msg)
    hcl = _azure_all_hcl(findings)
    if _re.search(r'resource\s+"azurerm_', hcl) and not _re.search(r'provider\s+"azurerm"', hcl):
        problems.append('resources reference the azurerm provider but no provider "azurerm" block was found')
    return problems


def _azure_cmd_validate(findings: dict[str, Any]) -> CommandResult:
    """`terraform validate`: full check, requires init."""
    if not findings.get("azure_init_done"):
        return _need_init()
    if not _azure_files(findings):
        return CommandResult(output="Error: no .tf files written yet. Use `write <file>` first.", exit_code=1)
    problems = _azure_hcl_problems(findings)
    if problems:
        return CommandResult(
            output="Error: configuration invalid.\n" + "\n".join("  - " + p for p in problems),
            exit_code=1,
        )
    n = len(_azure_files(findings))
    return CommandResult(
        output="Success! The configuration is valid. (" + str(n) + " .tf files checked)",
        findings={"azure_validated": True},
    )


def _azure_cmd_validate_bare(findings: dict[str, Any]) -> CommandResult:
    """`validate`: HCL structure check only (no init required)."""
    if not _azure_files(findings):
        return CommandResult(output="validate: no .tf files written yet. Use `write <file>` first.", exit_code=1)
    problems = _azure_hcl_problems(findings)
    if problems:
        return CommandResult(
            output="HCL structure errors:\n" + "\n".join("  - " + p for p in problems),
            exit_code=1,
        )
    return CommandResult(
        output="HCL structure OK: " + str(len(_azure_files(findings))) + " file(s) checked.",
        findings={"azure_validated": True},
    )


# ---------------------------------------------------------------------------
# terraform subcommands
# ---------------------------------------------------------------------------

def _azure_cmd_init(findings: dict[str, Any]) -> CommandResult:
    files = _azure_files(findings)
    backend = any('backend "azurerm"' in content for content in files.values())
    out = (
        "Initializing the backend...\n"
    )
    new_findings: dict[str, Any] = {"azure_init_done": True}
    if backend:
        out += (
            'Successfully configured the backend "azurerm"! Terraform will automatically\n'
            "use this backend unless the backend configuration changes.\n\n"
            "Initializing provider plugins...\n"
        )
        new_findings["azure_backend_configured"] = True
    else:
        out += "Initializing provider plugins...\n"
    out += (
        '- Finding hashicorp/azurerm versions matching "~> 3.0"...\n'
        "- Installing hashicorp/azurerm v3.116.0...\n"
        "- Installed hashicorp/azurerm v3.116.0 (signed by HashiCorp)\n\n"
        "Terraform has been successfully initialized!"
    )
    if not backend:
        out += (
            "\n\nNote: no backend configured - state will be stored locally. "
            "Write backend.tf with an azurerm backend and re-run init for remote state."
        )
    return CommandResult(output=out, findings=new_findings)


def _azure_extract_out_file(args: list[str]) -> str | None:
    for a in args:
        if a.startswith("-out="):
            return a[5:]
    for i, a in enumerate(args):
        if a == "-out" and i + 1 < len(args) and not args[i + 1].startswith("-"):
            return args[i + 1]
    return None


def _azure_plan_output(findings: dict[str, Any], out_file: str | None) -> tuple[str, dict[str, Any]]:
    applied = findings.get("azure_applied") and not findings.get("azure_destroyed")
    if applied:
        return (
            "No changes. Your infrastructure matches the configuration.\n\n"
            "Terraform has compared your real infrastructure against your configuration and found no differences, "
            "so no actions are needed.",
            {"azure_plan_done": True},
        )
    blocks = _azure_resources(findings)
    if not blocks:
        return (
            "Error: no resources found in your .tf files. Write resource blocks first "
            "(e.g. write main.tf with an azurerm_resource_group), then plan again.",
            {},
        )
    body = _azure_plan_body(blocks)
    summary = "Plan: " + str(len(blocks)) + " to add, 0 to change, 0 to destroy."
    head = (
        "Terraform used the selected providers to generate the following execution plan. Resource\n"
        "actions are indicated with the following symbols:\n"
        "  + create\n\n"
        "Terraform will perform the following actions:\n\n"
    )
    out = head + body + "\n" + summary
    new_findings: dict[str, Any] = {"azure_plan_done": True}
    if out_file:
        new_findings["azure_plan_saved"] = out_file
        out += '\n\nSaved the plan to: ' + out_file + '\n\nTo perform exactly these actions, run: "terraform apply \\"' + out_file + '\\""'
    return out, new_findings


def _azure_cmd_plan(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get("azure_init_done"):
        return _need_init()
    cli_vars, rest = _extract_vars(args)
    out_file = _azure_extract_out_file(rest)
    out, new_findings = _azure_plan_output(findings, out_file)
    if out.startswith("Error:"):
        return CommandResult(output=out, exit_code=1)
    if cli_vars:
        merged = dict(findings.get("azure_variables_set") or {})
        merged.update(cli_vars)
        new_findings["azure_variables_set"] = merged
    return CommandResult(output=out, findings=new_findings)


def _azure_do_apply(findings: dict[str, Any], via_plan: str | None) -> CommandResult:
    blocks = _azure_resources(findings)
    lines = []
    for rtype, rname, _body in blocks:
        lines.append(rtype + "." + rname + ": Creating...")
    lines.append("")
    ids: dict[str, str] = {}
    for rtype, rname, _body in blocks:
        rid = _azure_resource_id(rtype, rname)
        ids[rtype + "." + rname] = rid
        lines.append(rtype + "." + rname + ": Creation complete after 6s [id=" + rid + "]")
    lines.append("")
    lines.append("Apply complete! Resources: " + str(len(blocks)) + " added, 0 changed, 0 destroyed.")
    outputs = _azure_output_values(findings)
    if outputs:
        lines.append("")
        lines.append("Outputs:")
        lines.append("")
        for k in sorted(outputs):
            lines.append(k + ' = "' + outputs[k] + '"')
    if via_plan:
        lines.insert(0, 'Applying saved plan "' + via_plan + '"...\n')
    return CommandResult(output="\n".join(lines), findings={
        "azure_applied": True,
        "azure_ever_applied": True,
        "azure_destroyed": False,
        "azure_applied_resources": [t + "." + n for t, n, _b in blocks],
        "azure_resource_ids": ids,
        "azure_pending_apply": False,
        "azure_plan_done": True,
    })


def _azure_cmd_apply(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get("azure_init_done"):
        return _need_init()
    rest = [a for a in args if not a.startswith("-var")]
    auto = _has_flag(args, "-auto-approve")
    plan_file = next((a for a in rest if not a.startswith("-")), None)
    if plan_file:
        saved = findings.get("azure_plan_saved")
        if saved and plan_file == saved:
            return _azure_do_apply(findings, via_plan=plan_file)
        return CommandResult(
            output='Error: Failed to read plan file "' + plan_file + '": no such saved plan. Run "terraform plan -out=' + plan_file + '" first.',
            exit_code=1,
        )
    if not _azure_resources(findings):
        return CommandResult(
            output="Error: no resources found in your .tf files. Nothing to apply.",
            exit_code=1,
        )
    if auto:
        return _azure_do_apply(findings, via_plan=None)
    out, plan_findings = _azure_plan_output(findings, None)
    if out.startswith("Error:"):
        return CommandResult(output=out, exit_code=1)
    out += "\n\nDo you want to perform these actions?\n  Only 'yes' will be accepted to approve.\n\n  Enter a value: "
    plan_findings["azure_pending_apply"] = True
    return CommandResult(output=out, findings=plan_findings)


def _azure_do_destroy(findings: dict[str, Any]) -> CommandResult:
    resources = findings.get("azure_applied_resources") or []
    lines = []
    ids = findings.get("azure_resource_ids") or {}
    for addr in reversed(resources):
        rid = ids.get(addr, _azure_resource_id(*addr.split(".", 1)))
        lines.append(addr + ": Destroying... [id=" + rid + "]")
    lines.append("")
    for addr in reversed(resources):
        lines.append(addr + ": Destruction complete after 3s")
    lines.append("")
    lines.append("Destroy complete! Resources: " + str(len(resources)) + " destroyed.")
    return CommandResult(output="\n".join(lines), findings={
        "azure_destroyed": True,
        "azure_applied": False,
        "azure_applied_resources": [],
        "azure_resource_ids": {},
        "azure_pending_destroy": False,
    })


def _azure_cmd_destroy(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get("azure_init_done"):
        return _need_init()
    if not findings.get("azure_applied"):
        return _need_apply()
    if _has_flag(args, "-auto-approve"):
        return _azure_do_destroy(findings)
    resources = findings.get("azure_applied_resources") or []
    body = "\n".join("  - " + r for r in resources)
    out = (
        "Terraform will perform the following actions:\n\n"
        + body + "\n\n"
        + "Plan: 0 to add, 0 to change, " + str(len(resources)) + " to destroy.\n\n"
        + "Do you really want to destroy all resources?\n"
        + "  There is no undo. Only 'yes' will be accepted to confirm.\n\n"
        + "  Enter a value: "
    )
    return CommandResult(output=out, findings={"azure_pending_destroy": True})


def _azure_cmd_show(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get("azure_init_done"):
        return _need_init()
    if args and not args[0].startswith("-"):
        plan_file = args[0]
        if findings.get("azure_plan_saved") == plan_file:
            out, _ = _azure_plan_output(findings, None)
            return CommandResult(output='# Saved plan "' + plan_file + '":\n\n' + out)
        return CommandResult(output='Error: no saved plan "' + plan_file + '".', exit_code=1)
    if not findings.get("azure_applied"):
        return CommandResult(output='No state. Run "terraform apply" first.', exit_code=1)
    ids = findings.get("azure_resource_ids") or {}
    lines = ["# terraform show: current state"]
    for addr in sorted(findings.get("azure_applied_resources") or []):
        lines.append("# " + addr + ":")
        lines.append('  id = "' + ids.get(addr, "") + '"')
    outputs = _azure_output_values(findings)
    if outputs:
        lines.append("")
        lines.append("Outputs:")
        for k in sorted(outputs):
            lines.append('  ' + k + ' = "' + outputs[k] + '"')
    return CommandResult(output="\n".join(lines))


def _azure_cmd_state(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get("azure_init_done"):
        return _need_init()
    if not args or args[0] != "list":
        return CommandResult(output="Usage: terraform state <list>", exit_code=1)
    if not findings.get("azure_applied"):
        return _need_apply()
    resources = findings.get("azure_applied_resources") or []
    return CommandResult(
        output="\n".join(sorted(resources)),
        findings={"azure_state_viewed": True},
    )


def _azure_cmd_output(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get("azure_init_done"):
        return _need_init()
    if not findings.get("azure_applied"):
        return _need_apply()
    outputs = _azure_output_values(findings)
    names = [a for a in args if not a.startswith("-")]
    if names:
        name = names[0]
        if name in outputs:
            return CommandResult(output='"' + outputs[name] + '"', findings={"azure_outputs_viewed": True})
        return CommandResult(output='Error: output "' + name + '" is not defined.', exit_code=1)
    lines = [k + ' = "' + v + '"' for k, v in sorted(outputs.items())]
    return CommandResult(output="\n".join(lines), findings={"azure_outputs_viewed": True})


def _azure_cmd_export(raw: str, findings: dict[str, Any]) -> CommandResult:
    body = raw[len("export"):].strip()
    if "=" not in body:
        return CommandResult(output="export: usage: export TF_VAR_<name>=<value>", exit_code=1)
    k, _, v = body.partition("=")
    k, v = k.strip(), v.strip().strip('"').strip("'")
    if not k.startswith("TF_VAR_"):
        return CommandResult(output="export: only TF_VAR_* variables affect Terraform in this lab.", exit_code=1)
    name = k[len("TF_VAR_"):]
    if not name:
        return CommandResult(output="export: usage: export TF_VAR_<name>=<value>", exit_code=1)
    merged = dict(findings.get("azure_variables_set") or {})
    merged[name] = v
    return CommandResult(output="", findings={"azure_variables_set": merged})


def _azure_cmd_terraform(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not args:
        return CommandResult(output="Usage: terraform <init|validate|plan|apply|destroy|show|state|output|version>", exit_code=1)
    sub = args[0]
    rest = args[1:]
    if sub == "init":
        return _azure_cmd_init(findings)
    if sub == "validate":
        return _azure_cmd_validate(findings)
    if sub == "plan":
        return _azure_cmd_plan(rest, findings)
    if sub == "apply":
        return _azure_cmd_apply(rest, findings)
    if sub == "destroy":
        return _azure_cmd_destroy(rest, findings)
    if sub == "show":
        return _azure_cmd_show(rest, findings)
    if sub == "state":
        return _azure_cmd_state(rest, findings)
    if sub == "output":
        return _azure_cmd_output(rest, findings)
    if sub == "fmt":
        files = sorted(_azure_files(findings).keys())
        return CommandResult(output="\n".join(files) if files else "(no .tf files yet)")
    if sub == "version":
        return _cmd_version()
    return CommandResult(output='Terraform has no command named "' + sub + '".', exit_code=1)


def _azure_banner() -> list[str]:
    return [
        "Road to CISSP - Terraform for Azure lab   (simulated: nothing is really provisioned)",
        "You WRITE every .tf file yourself: azurerm provider -> resource group + VNet ->",
        "Linux VM + NSG -> storage account -> variables/locals -> outputs -> remote state.",
        "Each objective teaches the exact HCL, line by line. Use `write <file>`, paste your",
        "HCL, and end with EOF on its own line. Try: write provider.tf  ...  EOF",
    ]


def _run_azure(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    """Entry point for the Azure scenario: mirrors run() with Azure handlers."""
    raw = (command or "").strip()
    if not raw:
        return CommandResult(output="")

    lowered_first = raw.split("\n", 1)[0].strip().lower()

    # pending interactive confirmations
    if lowered_first in ("yes", "y") and "\n" not in raw:
        if findings.get("azure_pending_apply"):
            return _azure_do_apply(findings, via_plan=None)
        if findings.get("azure_pending_destroy"):
            return _azure_do_destroy(findings)
        return CommandResult(output="Nothing is waiting for confirmation.")

    parts = _parse(lowered_first)
    if not parts:
        return CommandResult(output="")
    cmd = parts[0]
    args = parts[1:]

    if cmd in ("clear", "cls"):
        return CommandResult(output="", clear=True)
    if cmd in ("help", "?"):
        return CommandResult(output=(
            "Available commands (simulated - nothing is really provisioned):\n"
            "  ls / cat <file>             list written .tf files / show one\n"
            "  write <file>                write a .tf file (paste HCL, end with EOF)\n"
            "  rm <file>                   delete a written .tf file\n"
            "  validate                    HCL structure check across all written files\n"
            "  terraform init              download the azurerm provider (+ backend if backend.tf)\n"
            "  terraform validate          full configuration check (needs init)\n"
            "  terraform plan [-out=FILE]  preview changes; -out saves the plan\n"
            "  terraform apply [plan]      create resources (prompts; -auto-approve skips)\n"
            "  terraform destroy           tear everything down (prompts; -auto-approve skips)\n"
            "  terraform show              show current state\n"
            "  terraform state list        list resources tracked in state\n"
            "  terraform output [name]     show output values\n"
            "  export TF_VAR_<n>=<v>       set a variable via the environment\n"
            "  terraform version | help | clear"
        ))
    if cmd == "ls":
        return _azure_cmd_ls(findings)
    if cmd == "cat":
        return _azure_cmd_cat(args, findings)
    if cmd == "write":
        return _azure_cmd_write(raw, findings)
    if cmd == "rm":
        return _azure_cmd_rm(args, findings)
    if cmd == "validate":
        return _azure_cmd_validate_bare(findings)
    if cmd == "export":
        return _azure_cmd_export(raw, findings)
    if cmd in ("terraform", "tf"):
        return _azure_cmd_terraform([a for a in args], findings)
    return CommandResult(
        output=parts[0] + ": command not found (try `help`)",
        exit_code=127,
    )
