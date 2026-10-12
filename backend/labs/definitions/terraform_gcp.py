"""Terraform for GCP lab: write every .tf file yourself, learn HCL thoroughly.

Unlike terraform-fundamentals-001 (pre-seeded AWS config), this lab starts with an
EMPTY working directory. Each objective teaches real Google Cloud Terraform HCL -
the exact code, explained line by line - and the student writes it with
`write <file>` (heredoc, terminated by EOF). Validators inspect the written HCL
for required blocks and attributes, not command history.

Covers: google provider setup -> VPC network + subnetworks -> Compute Engine VM ->
Cloud Storage bucket -> firewall rules + IAM bindings (with an intentional
overly-permissive SSH rule to find and fix) -> variables.tf + outputs.tf ->
init/validate/plan/apply -> GCS remote-state backend -> destroy.

Uses the `terraform_cli` shell in GCP scenario mode (lab id terraform-gcp-001).
"""
from __future__ import annotations

import re

from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget
from labs.validators import validator


# ---------------------------------------------------------------------------
# HCL content helpers (validators read what the student WROTE)
# ---------------------------------------------------------------------------

def _written(findings, name: str) -> str:
    return (findings.get("gcp_files") or {}).get(name, "")


def _has(content: str, *needles: str) -> bool:
    return all(n in content for n in needles)


def _has_resource(content: str, rtype: str, name: str | None = None) -> bool:
    """Check for resource "<rtype>" ["<name>"] block (flexible whitespace)."""
    if name:
        return re.search(
            rf'resource\s+"{re.escape(rtype)}"\s+"{re.escape(name)}"', content
        ) is not None
    return re.search(rf'resource\s+"{re.escape(rtype)}"', content) is not None


# ---------------------------------------------------------------------------
# validators
# ---------------------------------------------------------------------------

@validator("gcp_provider_written")
def gcp_provider_written(args, findings):
    c = _written(findings, "versions.tf")
    if not c.strip():
        return False, "Write versions.tf first: `write versions.tf`, paste the HCL, end with EOF.", None
    missing = []
    if not _has(c, "terraform {"):
        missing.append("a terraform { } block")
    if not _has(c, "required_version"):
        missing.append("required_version")
    if not _has(c, "required_providers"):
        missing.append("required_providers")
    if not _has(c, 'source', 'hashicorp/google'):
        missing.append('google provider source = "hashicorp/google"')
    if not re.search(r'provider\s+"google"', c):
        missing.append('a provider "google" block')
    if not _has(c, "project"):
        missing.append("project = var.project_id in the provider block")
    if not _has(c, "region"):
        missing.append("region = var.region in the provider block")
    if missing:
        return False, f"versions.tf is missing: {', '.join(missing)}.", None
    return True, "Provider configured: terraform block pins the google provider, project/region wired to variables.", None


@validator("gcp_network_written")
def gcp_network_written(args, findings):
    c = _written(findings, "network.tf")
    if not c.strip():
        return False, "Write network.tf: `write network.tf`, paste the HCL, end with EOF.", None
    missing = []
    if not _has_resource(c, "google_compute_network", "main"):
        missing.append('resource "google_compute_network" "main"')
    if not _has(c, "auto_create_subnetworks", "false"):
        missing.append("auto_create_subnetworks = false (custom-mode VPC)")
    if not _has_resource(c, "google_compute_subnetwork", "public_a"):
        missing.append('resource "google_compute_subnetwork" "public_a"')
    if not _has_resource(c, "google_compute_subnetwork", "public_b"):
        missing.append('resource "google_compute_subnetwork" "public_b"')
    if not _has(c, "10.0.1.0/24", "10.0.2.0/24"):
        missing.append("both ip_cidr_range values (10.0.1.0/24 and 10.0.2.0/24)")
    if not _has(c, "google_compute_network.main"):
        missing.append("subnetwork -> network reference (google_compute_network.main.id)")
    if missing:
        return False, f"network.tf is missing: {', '.join(missing)}.", None
    return True, "VPC network + two subnetworks defined with correct references.", None


@validator("gcp_compute_written")
def gcp_compute_written(args, findings):
    c = _written(findings, "compute.tf")
    if not c.strip():
        return False, "Write compute.tf: `write compute.tf`, paste the HCL, end with EOF.", None
    missing = []
    if not _has_resource(c, "google_compute_instance", "web"):
        missing.append('resource "google_compute_instance" "web"')
    if not _has(c, "machine_type"):
        missing.append("machine_type")
    if not _has(c, "boot_disk"):
        missing.append("a boot_disk block")
    if not _has(c, "initialize_params"):
        missing.append("initialize_params with an image")
    if not _has(c, "network_interface"):
        missing.append("a network_interface block")
    if not _has(c, "google_compute_subnetwork.public_a"):
        missing.append("subnetwork reference (google_compute_subnetwork.public_a.id)")
    if not _has(c, "access_config"):
        missing.append("access_config (for the ephemeral public IP)")
    if missing:
        return False, f"compute.tf is missing: {', '.join(missing)}.", None
    return True, "Compute Engine VM defined: boot disk, network interface, public IP.", None


@validator("gcp_storage_security_written")
def gcp_storage_security_written(args, findings):
    s = _written(findings, "storage.tf")
    sec = _written(findings, "security.tf")
    missing = []
    if not s.strip():
        missing.append("write storage.tf first")
    else:
        if not _has_resource(s, "google_storage_bucket", "logs"):
            missing.append('resource "google_storage_bucket" "logs" in storage.tf')
        if not _has(s, "versioning"):
            missing.append("versioning { enabled = true } in storage.tf")
    if not sec.strip():
        missing.append("write security.tf first")
    else:
        if not _has_resource(sec, "google_compute_firewall", "allow_http"):
            missing.append('resource "google_compute_firewall" "allow_http" in security.tf')
        if not _has_resource(sec, "google_compute_firewall", "allow_ssh"):
            missing.append('resource "google_compute_firewall" "allow_ssh" in security.tf')
        if not _has_resource(sec, "google_project_iam_binding", "log_viewer"):
            missing.append('resource "google_project_iam_binding" "log_viewer" in security.tf')
        if not _has(sec, '"80"', '"22"'):
            missing.append('allow blocks with ports ["80"] and ["22"]')
    if missing:
        return False, f"Missing: {', '.join(missing)}.", None
    return True, "Storage bucket, firewall rules, and IAM binding defined.", None


@validator("gcp_vars_outputs_written")
def gcp_vars_outputs_written(args, findings):
    v = _written(findings, "variables.tf")
    o = _written(findings, "outputs.tf")
    missing = []
    if not v.strip():
        missing.append("write variables.tf first")
    else:
        for var in ("project_id", "region", "machine_type"):
            if not re.search(rf'variable\s+"{var}"', v):
                missing.append(f'variable "{var}" in variables.tf')
        if not _has(v, "us-central1"):
            missing.append('default = "us-central1" for region')
    if not o.strip():
        missing.append("write outputs.tf first")
    else:
        for out in ("vpc_id", "web_external_ip", "logs_bucket"):
            if not re.search(rf'output\s+"{out}"', o):
                missing.append(f'output "{out}" in outputs.tf')
    if missing:
        return False, f"Missing: {', '.join(missing)}.", None
    return True, "Variables parameterized and outputs exposed.", None


@validator("gcp_applied")
def gcp_applied(args, findings):
    if not findings.get("init_done"):
        return False, "Run terraform init first (downloads the google provider).", None
    if not findings.get("validated"):
        return False, "Run terraform validate to check your HCL.", None
    if not findings.get("gcp_plan_saved"):
        return False, "Save a plan: terraform plan -out=tfplan.", None
    if findings.get("gcp_applied"):
        resources = findings.get("applied_resources") or []
        return True, f"Applied: {len(resources)} GCP resources provisioned.", {"resources": resources}
    return False, "Apply the saved plan: terraform apply tfplan.", None


@validator("gcp_misconfig_fixed")
def gcp_misconfig_fixed(args, findings):
    sec = _written(findings, "security.tf")
    # The flaw: allow_ssh with source_ranges 0.0.0.0/0. Check the SSH rule specifically.
    ssh_block = re.search(
        r'resource\s+"google_compute_firewall"\s+"allow_ssh"\s*\{(.*?)\n\}',
        sec, re.DOTALL,
    )
    if ssh_block and "0.0.0.0/0" in ssh_block.group(1):
        return False, "The allow_ssh firewall rule still allows 0.0.0.0/0. Rewrite security.tf with SSH restricted (e.g. 10.0.0.0/8), then plan + apply.", None
    if not findings.get("gcp_misconfiguration_fixed"):
        # Mark the fix when the file no longer has the flaw (student rewrote it).
        if ssh_block or "allow_ssh" in sec:
            findings["gcp_misconfiguration_fixed"] = True
        else:
            return False, "security.tf should still contain the allow_ssh rule - just with restricted source_ranges.", None
    if not findings.get("gcp_fix_deployed"):
        return False, "Deploy the fix: terraform plan to preview, then terraform apply.", None
    return True, "SSH firewall rule restricted and redeployed.", None


@validator("gcp_backend_destroyed")
def gcp_backend_destroyed(args, findings):
    b = _written(findings, "backend.tf")
    if not b.strip():
        return False, "Write backend.tf with the GCS backend block first.", None
    if not _has(b, 'backend "gcs"'):
        return False, 'backend.tf needs a backend "gcs" block.', None
    if not _has(b, "bucket"):
        return False, 'backend.tf needs the bucket = "road2cissp-tfstate" setting.', None
    if not findings.get("destroyed"):
        return False, "Tear everything down: terraform destroy.", None
    return True, "Remote state configured (GCS backend) and infrastructure destroyed.", None


# ---------------------------------------------------------------------------
# lab definition
# ---------------------------------------------------------------------------

TERRAFORM_GCP_LAB = LabDefinition(
    id="terraform-gcp-001",
    slug="terraform-gcp",
    title="Terraform for GCP: Write Every .tf File",
    description=(
        "Learn Terraform HCL by writing it: google provider setup, VPC network + "
        "subnetworks, Compute Engine VM, Cloud Storage bucket, firewall rules + IAM "
        "bindings (find and fix an open SSH rule), variables.tf + outputs.tf, "
        "GCS remote-state backend, then destroy. Every objective teaches the exact "
        "HCL line by line - you write it with `write <file>`, paste, EOF."
    ),
    category="devops",  # type: ignore[assignment]
    difficulty="intermediate",
    estimated_minutes=60,
    shell="terraform_cli",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/iac:latest",
        workdir="/home/student/gcp-infra",
        idle_timeout_minutes=20,
        max_runtime_minutes=90,
        deny_internet_egress=True,
    ),
    targets=[LabTarget(hostname="gcp-infra", role="Terraform working directory (GCP)")],
    objectives=[
        LabObjective(
            id="provider-setup",
            label="Configure the google provider",
            validator="gcp_provider_written",
            description="""Write versions.tf - the foundation every Terraform project needs.

TYPE:  write versions.tf
PASTE this HCL, then type EOF on its own line:

  terraform {
    required_version = ">= 1.5"

    required_providers {
      google = {
        source  = "hashicorp/google"
        version = "~> 5.0"
      }
    }
  }

  provider "google" {
    project = var.project_id
    region  = var.region
  }

LINE BY LINE:
- terraform { } is the settings block. Everything about Terraform itself lives here.
- required_version = ">= 1.5" refuses to run on ancient Terraform that lacks features you use.
- required_providers declares WHICH providers this config needs. Without it, Terraform
  cannot download anything.
- google = { ... } gives the provider a LOCAL name ("google") used in every resource type
  (google_compute_instance, google_storage_bucket, ...).
- source = "hashicorp/google" is the registry address: [HOST/]NAMESPACE/TYPE. hashicorp/
  is the official publisher. (Community providers look like "kreuzwerker/docker".)
- version = "~> 5.0" is a pessimistic constraint: >= 5.0, < 6.0. Safe upgrades, no breaking majors.
- provider "google" { } configures the provider: project = var.project_id tells it WHICH
  GCP project to manage; region sets the default region so resources inherit it.
- var.project_id is a variable reference - you will define it in variables.tf (objective 5).
  Referencing an undefined variable fails validation, which is why we write variables.tf later
  BEFORE running terraform validate.""",
            hints=[
                "write versions.tf - paste the HCL from the description, end with EOF.",
                "The validator checks for: terraform block, required_providers, hashicorp/google source, provider \"google\" with project and region.",
            ],
        ),
        LabObjective(
            id="vpc-network",
            label="Build the VPC network and subnetworks",
            validator="gcp_network_written",
            description="""Write network.tf - a custom-mode VPC with two subnetworks.

TYPE:  write network.tf
PASTE this HCL, then type EOF:

  resource "google_compute_network" "main" {
    name                    = "road2cissp-vpc"
    auto_create_subnetworks = false
  }

  resource "google_compute_subnetwork" "public_a" {
    name          = "road2cissp-public-a"
    ip_cidr_range = "10.0.1.0/24"
    region        = var.region
    network       = google_compute_network.main.id
  }

  resource "google_compute_subnetwork" "public_b" {
    name          = "road2cissp-public-b"
    ip_cidr_range = "10.0.2.0/24"
    region        = var.region
    network       = google_compute_network.main.id
  }

LINE BY LINE:
- resource "google_compute_network" "main" declares a VPC. The TYPE (google_compute_network)
  is what GCP API object to create; the NAME ("main") is Terraform's local handle for references.
- name = "road2cissp-vpc" is the actual GCP resource name you will see in the console.
- auto_create_subnetworks = false makes this a CUSTOM-mode VPC: no subnets are created
  automatically, you define exactly the ones you want. (true = auto-mode, one subnet per region.)
- resource "google_compute_subnetwork" "public_a" - subnets are SEPARATE resources in GCP
  (unlike AWS where subnets are arguments of the VPC). Each has its own lifecycle.
- ip_cidr_range = "10.0.1.0/24" - 254 usable addresses. Must not overlap sibling subnets.
- region = var.region - subnets are REGIONAL in GCP; the VM zone later must be inside this region.
- network = google_compute_network.main.id - a REFERENCE. Terraform builds a dependency graph
  from these: the subnets cannot be created before the network exists. .id is the network's
  self-link, which is what the API expects.""",
            hints=[
                "write network.tf - paste the HCL, end with EOF.",
                "Key details the validator checks: auto_create_subnetworks = false, both CIDR ranges, and the network = google_compute_network.main.id references.",
            ],
        ),
        LabObjective(
            id="compute-vm",
            label="Launch a Compute Engine VM",
            validator="gcp_compute_written",
            description="""Write compute.tf - a Debian VM on the first subnetwork with a public IP.

TYPE:  write compute.tf
PASTE this HCL, then type EOF:

  resource "google_compute_instance" "web" {
    name         = "road2cissp-web"
    machine_type = var.machine_type
    zone         = "${var.region}-a"

    boot_disk {
      initialize_params {
        image = "debian-cloud/debian-12"
      }
    }

    network_interface {
      subnetwork = google_compute_subnetwork.public_a.id

      access_config {
        # Ephemeral public IP - empty block requests one
      }
    }

    tags = ["web", "road2cissp"]
  }

LINE BY LINE:
- resource "google_compute_instance" "web" - a VM. Instances are ZONAL in GCP (unlike subnets).
- machine_type = var.machine_type - e2-micro is in the free tier; parameterized so you can
  change it without editing this file.
- zone = "${var.region}-a" - string interpolation: "us-central1" becomes "us-central1-a".
  The zone MUST be inside the subnetwork's region.
- boot_disk { initialize_params { image = "debian-cloud/debian-12" } } - nested blocks.
  boot_disk describes the disk; initialize_params says CREATE it from this public image
  (debian-cloud is Google's public image project, debian-12 the image family).
- network_interface { subnetwork = google_compute_subnetwork.public_a.id } - attaches the
  VM's NIC to your subnet, again via a reference that orders creation correctly.
- access_config { } - an EMPTY block is meaningful: its presence requests an ephemeral
  external IP. No access_config block = internal-only VM.
- tags = ["web", "road2cissp"] - network tags. Firewall rules target these tags, so the
  allow_http rule you write later applies to this VM.""",
            hints=[
                "write compute.tf - paste the HCL, end with EOF.",
                "Do not forget access_config { } - without it the VM gets no public IP and the output later will be empty.",
            ],
        ),
        LabObjective(
            id="storage-security",
            label="Add Cloud Storage, firewall rules, and IAM",
            validator="gcp_storage_security_written",
            description="""Write storage.tf AND security.tf. The firewall section contains an intentional
misconfiguration (SSH open to the world) - you will fix it in objective 7.

TYPE:  write storage.tf     (paste, EOF)
TYPE:  write security.tf    (paste, EOF)

--- storage.tf ---
  resource "google_storage_bucket" "logs" {
    name     = "road2cissp-app-logs"
    location = var.region

    uniform_bucket_level_access = true

    versioning {
      enabled = true
    }
  }

- name must be GLOBALLY unique across all of GCP (buckets share one namespace).
- location = var.region - single region. Alternatives: "US" (multi-region), "US-CENTRAL1" dual.
- uniform_bucket_level_access = true - IAM-only access control, no legacy bucket ACLs.
  Google recommends this for every new bucket.
- versioning { enabled = true } - keeps overwritten/deleted object versions. Your safety net.

--- security.tf ---
  resource "google_compute_firewall" "allow_http" {
    name    = "allow-http"
    network = google_compute_network.main.name

    allow {
      protocol = "tcp"
      ports    = ["80"]
    }

    source_ranges = ["0.0.0.0/0"]
    target_tags   = ["web"]
  }

  resource "google_compute_firewall" "allow_ssh" {
    name    = "allow-ssh"
    network = google_compute_network.main.name

    allow {
      protocol = "tcp"
      ports    = ["22"]
    }

    source_ranges = ["0.0.0.0/0"]   # <-- REVIEW: SSH open to the world
    target_tags   = ["web"]
  }

  resource "google_project_iam_binding" "log_viewer" {
    project = var.project_id
    role    = "roles/logging.viewer"
    members = ["user:analyst@example.com"]
  }

LINE BY LINE (firewall):
- google_compute_firewall rules attach to a network (note: .name here, either works).
- allow { protocol/ports } - what traffic is permitted. protocol = "tcp", ports = ["80"].
- source_ranges = ["0.0.0.0/0"] - WHERE from. Fine for public HTTP; DANGEROUS for SSH.
- target_tags = ["web"] - applies ONLY to VMs carrying the "web" tag (your VM has it).

LINE BY LINE (IAM):
- google_project_iam_binding grants a ROLE to MEMBERS at project level.
- role = "roles/logging.viewer" - predefined role, least-privilege read access to logs.
- members = ["user:analyst@example.com"] - format is "<type>:<id>": user:, group:, serviceAccount:.
- WARNING: google_project_iam_binding is AUTHORITATIVE - it overwrites the entire member
  list for that role. For additive grants, google_project_iam_member is safer.""",
            hints=[
                "Two files this time: write storage.tf, then write security.tf.",
                "Note the SSH rule - terraform plan will flag it. You fix it in the next objective.",
            ],
        ),
        LabObjective(
            id="variables-outputs",
            label="Parameterize with variables, expose outputs",
            validator="gcp_vars_outputs_written",
            description="""Write variables.tf AND outputs.tf - the inputs and outputs of your module.

TYPE:  write variables.tf   (paste, EOF)
TYPE:  write outputs.tf     (paste, EOF)

--- variables.tf ---
  variable "project_id" {
    description = "GCP project ID for all resources"
    type        = string
  }

  variable "region" {
    description = "GCP region for all resources"
    type        = string
    default     = "us-central1"
  }

  variable "machine_type" {
    description = "Machine type for the web VM"
    type        = string
    default     = "e2-micro"
  }

- variable blocks declare INPUTS. type = string constrains what callers may pass.
- description documents intent - always write one; future-you will thank present-you.
- default makes a variable OPTIONAL. project_id has NO default, so it is REQUIRED:
  Terraform will prompt for it (or take -var / TF_VAR_ / terraform.tfvars).
- You already referenced var.project_id, var.region, var.machine_type in earlier files.
  This is the file that makes those references valid.

--- outputs.tf ---
  output "vpc_id" {
    description = "Self-link of the created VPC network"
    value       = google_compute_network.main.id
  }

  output "web_external_ip" {
    description = "External IP of the web VM"
    value       = google_compute_instance.web.network_interface[0].access_config[0].nat_ip
  }

  output "logs_bucket" {
    description = "Name of the logs bucket"
    value       = google_storage_bucket.logs.name
  }

- output blocks expose VALUES after apply: for humans (terraform output) and for other
  modules/configurations that consume this one.
- network_interface[0].access_config[0].nat_ip - these are LISTS in the provider schema,
  so index [0] drills in. nat_ip is only known AFTER apply (it is "computed").
- values referencing resources create implicit dependencies, same as resource references.""",
            hints=[
                "Two files: write variables.tf, then write outputs.tf.",
                "project_id has no default - it becomes a required input, which is correct for a project-specific value.",
            ],
        ),
        LabObjective(
            id="init-plan-apply",
            label="Initialize, validate, plan, and apply",
            validator="gcp_applied",
            description="""Run the core workflow against the HCL you wrote. Each command does something
specific to your configuration - understanding this pipeline is the heart of Terraform.

  terraform init        # downloads hashicorp/google ~> 5.0
  terraform validate    # checks HCL structure across all 7 .tf files
  terraform plan -out=tfplan
  terraform apply tfplan

WHAT EACH COMMAND DOES TO YOUR HCL:

- terraform init reads versions.tf and nothing else. It sees required_providers
  (hashicorp/google ~> 5.0), downloads the provider plugin into .terraform/, and writes
  .terraform.lock.hcl pinning the exact version. No GCP API calls happen - init is
  purely local setup. If you add a new provider to required_providers later, run
  init again (or terraform init -upgrade to move within your version constraint).

- terraform validate parses ALL 7 .tf files as one configuration: balanced braces,
  valid block types, and resolvable references. It catches things like a typo in
  google_compute_subnetwork.public_a (an unresolvable reference fails validation)
  BEFORE you touch any cloud API. It does not check values against GCP - that is
  plan's job. If validate reports an error naming a file, cat the file, fix the HCL,
  and rewrite it with `write <file>` (the shell replaces the whole file).

- terraform plan builds the dependency graph from your references (subnets depend on
  the network, the VM depends on subnet public_a, the firewall rules depend on the
  network) and asks the provider what each resource would look like. Output:
  "Plan: 8 to add, 0 to change, 0 to destroy", one block per resource. The -out=tfplan
  flag SAVES the plan to a file; without it the plan is shown and discarded.
  READ the Note about the SSH firewall rule - you wrote that misconfiguration in
  objective 4, and plan surfaces it.

- terraform apply tfplan provisions EXACTLY the saved plan - no re-planning, no drift
  between what you reviewed and what gets built. This is why teams always plan to a
  file in CI: the apply step cannot surprise you. 8 resources are created in
  dependency order, then Terraform prints your 3 outputs (vpc_id, web_external_ip,
  logs_bucket) and writes terraform.tfstate.""",
            hints=[
                "terraform init, then terraform validate, then terraform plan -out=tfplan, then terraform apply tfplan.",
                "If validate complains, cat the file it names and rewrite it with write.",
            ],
        ),
        LabObjective(
            id="fix-misconfig",
            label="Find and fix the open SSH firewall rule",
            validator="gcp_misconfig_fixed",
            description="""The allow_ssh firewall rule permits 0.0.0.0/0 - the whole internet can reach
port 22 on your VM. This is one of the most common cloud misconfigurations, and fixing
it is the real-world IaC loop: audit -> edit HCL -> plan the diff -> apply.

  1. cat security.tf - confirm the flaw is in the allow_ssh source_ranges.
     (Compare with allow_http: 0.0.0.0/0 there is CORRECT, because a public web
     server must accept traffic from everyone. Context determines whether an open
     rule is a finding or a requirement - that judgment is the security skill.)
  2. write security.tf - paste the FULL file again, but change ONLY this line:
       source_ranges = ["0.0.0.0/0"]   -->   source_ranges = ["10.0.0.0/8"]
     (Keep everything else identical. The shell replaces the whole file, so you must
     include the allow_http rule, the IAM binding, everything.)
  3. terraform plan - shows the diff Terraform computed:
       Plan: 0 to add, 1 to change, 0 to destroy.
     with a ~ (tilde) marker on google_compute_firewall.allow_ssh. The tilde means
     UPDATE IN-PLACE: GCP's API supports modifying a firewall rule's source_ranges
     without deleting and recreating it, so there is no downtime. Contrast with -/+
     (destroy then create), which Terraform shows when an argument is immutable and
     forces replacement - e.g. changing a subnetwork's ip_cidr_range.
  4. terraform apply - confirms the prompt with yes and deploys the fix.

WHY THIS MATTERS:
- An SSH rule open to 0.0.0.0/0 invites automated brute-force within minutes of the
  VM appearing. Restricting to 10.0.0.0/8 (your private address space) follows least
  privilege: only hosts inside your network can even attempt SSH.
- Because the fix is IN CODE (security.tf), it is permanent: the next terraform apply
  by anyone, from any machine, enforces the restricted rule. A console click-fix
  would drift back the next time someone applies the old HCL. This is the core IaC
  security argument: policy lives in version-controlled code, not in someone's memory
  of what they clicked.""",
            hints=[
                "Rewrite the whole security.tf with write - the shell replaces the file.",
                "Only the allow_ssh source_ranges changes. Then terraform plan, then terraform apply.",
            ],
        ),
        LabObjective(
            id="remote-state-destroy",
            label="Configure GCS remote state, then destroy",
            validator="gcp_backend_destroyed",
            description="""Write backend.tf - move state from your laptop to a GCS bucket - then tear down.

TYPE:  write backend.tf
PASTE this HCL, then type EOF:

  terraform {
    backend "gcs" {
      bucket = "road2cissp-tfstate"
      prefix = "gcp/terraform.tfstate"
    }
  }

LINE BY LINE:
- backend "gcs" replaces the default local backend: terraform.tfstate will live in a
  Cloud Storage bucket instead of your working directory. The backend block lives
  inside terraform { } because it configures Terraform's own behavior, not infrastructure.
- bucket = "road2cissp-tfstate" - the state bucket (in production, create it first with
  versioning + uniform access, exactly like your logs bucket - state history is as
  precious as log history).
- prefix = "gcp/terraform.tfstate" - the object path inside the bucket. One bucket can
  hold state for many configurations (gcp/..., aws/..., prod/..., staging/...), which
  is how teams organize dozens of Terraform roots.

WHY REMOTE STATE:
- Local state cannot be shared: two engineers applying from two laptops corrupt or
  diverge state. The GCS backend gives every operator the same view.
- State LOCKING: when you run apply, Terraform locks the state object so a teammate's
  concurrent apply waits instead of corrupting. (Local state has no locking.)
- Versioned history: with bucket versioning on, every state change is recoverable -
  you can roll back a bad apply by restoring a previous state version.
- After writing backend.tf, run terraform init again: Terraform detects the backend
  change and migrates state ("Successfully configured the backend gcs"). In real
  Terraform this prompts to copy terraform.tfstate up to the bucket.

THEN destroy everything:

  terraform destroy    # confirm with yes at the prompt (or -auto-approve)

Destroy reads the CURRENT configuration (all 8 resources) and tears them down in
REVERSE dependency order: the VM and firewall rules go before the subnetworks, the
subnetworks before the VPC - Terraform will not delete the network while the
subnets still reference it. Always clean up lab infrastructure: in GCP, a forgotten
e2-micro and a few firewall rules are cheap, but the habit of destroying what you
create is what keeps real cloud bills under control.""",
            hints=[
                "write backend.tf first, then terraform init to migrate state to GCS.",
                "Then terraform destroy - confirm with yes.",
            ],
        ),
    ],
)
