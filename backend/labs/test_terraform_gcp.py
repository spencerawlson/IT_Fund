"""Tests for the Terraform for GCP lab (terraform-gcp-001).

Covers the terraform_cli shell in GCP scenario mode (write/cat/validate flow,
HCL structure checks, init/plan/apply/fix/backend/destroy lifecycle),
the lab-scoped validators (accept correct HCL, reject flawed configs), and the
lab definition structure. Imports the shell and definition modules directly.
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.shells import terraform_cli
from labs.definitions.terraform_gcp import TERRAFORM_GCP_LAB as LAB
from labs.validators import VALIDATORS


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def run_cmd(cmd, findings):
    """Run one shell command, merging findings like sessions.py does."""
    result = terraform_cli.run(LAB, cmd, findings)
    findings.update(result.findings)
    return result


def fresh():
    return {}


def _check(name, findings):
    passed, message, evidence = VALIDATORS[name]({}, findings)
    return passed, message


# --- canonical HCL used across tests (matches the objective teachings) ---

VERSIONS_TF = '''terraform {
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
}'''

NETWORK_TF = '''resource "google_compute_network" "main" {
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
}'''

COMPUTE_TF = '''resource "google_compute_instance" "web" {
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
    }
  }

  tags = ["web", "road2cissp"]
}'''

STORAGE_TF = '''resource "google_storage_bucket" "logs" {
  name     = "road2cissp-app-logs"
  location = var.region

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }
}'''

SECURITY_TF_FLAWED = '''resource "google_compute_firewall" "allow_http" {
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

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web"]
}

resource "google_project_iam_binding" "log_viewer" {
  project = var.project_id
  role    = "roles/logging.viewer"
  members = ["user:analyst@example.com"]
}'''

SECURITY_TF_FIXED = SECURITY_TF_FLAWED.replace(
    'ports    = ["22"]\n  }\n\n  source_ranges = ["0.0.0.0/0"]',
    'ports    = ["22"]\n  }\n\n  source_ranges = ["10.0.0.0/8"]',
)

VARIABLES_TF = '''variable "project_id" {
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
}'''

OUTPUTS_TF = '''output "vpc_id" {
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
}'''

BACKEND_TF = '''terraform {
  backend "gcs" {
    bucket = "road2cissp-tfstate"
    prefix = "gcp/terraform.tfstate"
  }
}'''


def write_all(findings, security=SECURITY_TF_FLAWED):
    """Write the 7 objective .tf files through the shell."""
    for name, content in [
        ("versions.tf", VERSIONS_TF),
        ("network.tf", NETWORK_TF),
        ("compute.tf", COMPUTE_TF),
        ("storage.tf", STORAGE_TF),
        ("security.tf", security),
        ("variables.tf", VARIABLES_TF),
        ("outputs.tf", OUTPUTS_TF),
    ]:
        r = run_cmd(f"write {name}\n{content}\nEOF", findings)
        assert r.exit_code == 0, (name, r.output)
    return findings


# ---------------------------------------------------------------------------
# lab definition structure
# ---------------------------------------------------------------------------

def test_lab_structure():
    assert LAB.id == "terraform-gcp-001"
    assert LAB.shell == "terraform_cli"
    assert len(LAB.objectives) == 8
    expected = [
        ("provider-setup", "gcp_provider_written"),
        ("vpc-network", "gcp_network_written"),
        ("compute-vm", "gcp_compute_written"),
        ("storage-security", "gcp_storage_security_written"),
        ("variables-outputs", "gcp_vars_outputs_written"),
        ("init-plan-apply", "gcp_applied"),
        ("fix-misconfig", "gcp_misconfig_fixed"),
        ("remote-state-destroy", "gcp_backend_destroyed"),
    ]
    for obj, (oid, vname) in zip(LAB.objectives, expected):
        assert obj.id == oid
        assert obj.validator == vname
        assert vname in VALIDATORS, vname
        # critical requirement: objectives teach HCL thoroughly
        assert len(obj.description) > 1500, f"{oid} description too short to teach HCL"


def test_lab_registered():
    from labs.definitions import ALL_LABS
    ids = [l.id for l in ALL_LABS]
    assert "terraform-gcp-001" in ids


# ---------------------------------------------------------------------------
# shell: GCP scenario basics + isolation
# ---------------------------------------------------------------------------

def test_gcp_prompt_and_banner():
    assert "gcp" in terraform_cli.initial_prompt(LAB)
    banner = terraform_cli.banner(LAB)
    assert any("GCP" in line for line in banner)


def test_scenario_isolation():
    """GCP commands must not leak into the AWS lab and vice versa."""
    from labs.definitions.terraform_fundamentals import TERRAFORM_FUNDAMENTALS_LAB as AWS_LAB
    # write is not available in the AWS scenario; no gcp_files leak
    f = {}
    r = terraform_cli.run(AWS_LAB, "write versions.tf\nfoo\nEOF", f)
    assert r.exit_code == 1
    assert "gcp_files" not in f
    # gcp prompt/banner differ from the AWS lab's
    assert terraform_cli.initial_prompt(LAB) != terraform_cli.initial_prompt(AWS_LAB)
    # gcp starts empty: no AWS main.tf present
    f2 = {}
    r2 = terraform_cli.run(LAB, "cat main.tf", f2)
    assert "No such file" in r2.output


def test_gcp_help():
    r = run_cmd("help", fresh())
    assert "write <file>" in r.output
    assert "terraform init" in r.output
    r = run_cmd("nonsense-command", fresh())
    assert r.exit_code == 127


# ---------------------------------------------------------------------------
# write / cat / ls flow
# ---------------------------------------------------------------------------

def test_write_and_cat_roundtrip():
    f = fresh()
    r = run_cmd(f"write versions.tf\n{VERSIONS_TF}\nEOF", f)
    assert r.exit_code == 0
    assert "Wrote" in r.output and "versions.tf" in r.output
    r = run_cmd("cat versions.tf", f)
    assert 'provider "google"' in r.output
    r = run_cmd("ls", f)
    assert "versions.tf" in r.output


def test_write_rejects_unbalanced_hcl():
    f = fresh()
    r = run_cmd("write bad.tf\nresource \"x\" {\nEOF", f)
    assert r.exit_code == 1
    assert "unbalanced" in r.output.lower()
    assert "bad.tf" not in (f.get("gcp_files") or {})


def test_write_rejects_missing_eof():
    f = fresh()
    r = run_cmd("write versions.tf\nsome content without terminator", f)
    assert r.exit_code == 1
    assert "EOF" in r.output


def test_write_rejects_non_tf_extension():
    f = fresh()
    r = run_cmd("write notes.txt\nhello\nEOF", f)
    assert r.exit_code == 1


def test_write_rejects_empty_content():
    f = fresh()
    r = run_cmd("write empty.tf\n\nEOF", f)
    assert r.exit_code == 1


def test_cat_missing_file():
    r = run_cmd("cat nope.tf", fresh())
    assert "No such file" in r.output


def test_write_long_heredoc_not_truncated():
    """Multi-line writes must bypass the 1024-char command limit."""
    f = fresh()
    big = "resource \"x\" \"y\" {\n" + '  a = "%s"\n' % ("z" * 2000) + "}\n"
    r = run_cmd(f"write big.tf\n{big}EOF", f)
    assert r.exit_code == 0
    assert len(f["gcp_files"]["big.tf"]) > 2000


# ---------------------------------------------------------------------------
# init / validate / plan / apply lifecycle
# ---------------------------------------------------------------------------

def test_validate_requires_init():
    f = fresh()
    write_all(f)
    r = run_cmd("terraform validate", f)
    assert r.exit_code == 1
    assert "init" in r.output.lower()


def test_plan_requires_validate():
    f = fresh()
    write_all(f)
    run_cmd("terraform init", f)
    r = run_cmd("terraform plan", f)
    assert r.exit_code == 1
    assert "validate" in r.output.lower()


def test_init_installs_google_provider():
    f = fresh()
    write_all(f)
    r = run_cmd("terraform init", f)
    assert r.exit_code == 0
    assert "hashicorp/google" in r.output
    assert f["init_done"] is True


def test_validate_after_init():
    f = fresh()
    write_all(f)
    run_cmd("terraform init", f)
    r = run_cmd("terraform validate", f)
    assert r.exit_code == 0
    assert "valid" in r.output.lower()


def test_plan_shows_8_resources_and_ssh_warning():
    f = fresh()
    write_all(f)
    run_cmd("terraform init", f)
    run_cmd("terraform validate", f)
    r = run_cmd("terraform plan -out=tfplan", f)
    assert "8 to add" in r.output
    assert "google_compute_instance.web" in r.output
    assert "google_storage_bucket.logs" in r.output
    assert "SSH" in r.output or "ssh" in r.output.lower()
    assert f["gcp_plan_saved"] == "tfplan"


def test_plan_unsaved_without_out_flag():
    f = fresh()
    write_all(f)
    run_cmd("terraform init", f)
    run_cmd("terraform validate", f)
    r = run_cmd("terraform plan", f)
    assert "8 to add" in r.output
    assert f.get("gcp_plan_saved") is not True


def test_apply_provisions_resources_and_outputs():
    f = fresh()
    write_all(f)
    run_cmd("terraform init", f)
    run_cmd("terraform validate", f)
    run_cmd("terraform plan -out=tfplan", f)
    r = run_cmd("terraform apply tfplan", f)
    assert r.exit_code == 0
    assert "Apply complete" in r.output
    assert "vpc_id" in r.output and "web_external_ip" in r.output and "logs_bucket" in r.output
    assert len(f["applied_resources"]) == 8
    assert f["gcp_applied"] is True


def test_apply_rejects_unknown_plan_file():
    f = fresh()
    write_all(f)
    run_cmd("terraform init", f)
    run_cmd("terraform validate", f)
    r = run_cmd("terraform apply nosuchplan", f)
    assert r.exit_code == 1
    assert "no such saved plan" in r.output.lower()


def test_apply_without_plan_file_prompts_for_confirmation():
    f = fresh()
    write_all(f)
    run_cmd("terraform init", f)
    run_cmd("terraform validate", f)
    r = run_cmd("terraform apply", f)
    assert r.exit_code == 0
    assert "yes" in r.output.lower()
    assert f.get("gcp_pending_apply") is True
    # confirm with yes -> applies
    r = run_cmd("yes", f)
    assert "Apply complete" in r.output
    assert f["gcp_applied"] is True


def test_state_and_output_after_apply():
    f = fresh()
    write_all(f)
    run_cmd("terraform init", f)
    run_cmd("terraform validate", f)
    run_cmd("terraform plan -out=tfplan", f)
    run_cmd("terraform apply tfplan", f)
    r = run_cmd("terraform state list", f)
    assert "google_compute_network.main" in r.output
    r = run_cmd("terraform output", f)
    assert "34.122.18.7" in r.output
    r = run_cmd("terraform output web_external_ip", f)
    assert "34.122.18.7" in r.output


def test_backend_migration_and_destroy():
    f = fresh()
    write_all(f)
    run_cmd("terraform init", f)
    run_cmd("terraform validate", f)
    run_cmd("terraform plan -out=tfplan", f)
    run_cmd("terraform apply tfplan", f)
    # backend written before init -> init detects migration
    run_cmd(f"write backend.tf\n{BACKEND_TF}\nEOF", f)
    r = run_cmd("terraform init", f)
    assert "backend" in r.output.lower()
    assert f["gcp_backend_migrated"] is True
    r = run_cmd("terraform destroy", f)
    assert r.exit_code == 0
    assert "yes" in r.output.lower()  # prompts for confirmation
    r = run_cmd("yes", f)
    assert "Destroy complete" in r.output
    assert f["destroyed"] is True
    assert f["applied_resources"] == []


def test_destroy_auto_approve_skips_prompt():
    f = fresh()
    write_all(f)
    run_cmd("terraform init", f)
    run_cmd("terraform validate", f)
    run_cmd("terraform plan -out=tfplan", f)
    run_cmd("terraform apply tfplan", f)
    r = run_cmd("terraform destroy -auto-approve", f)
    assert "Destroy complete" in r.output
    assert f["destroyed"] is True


# ---------------------------------------------------------------------------
# validators: accept correct HCL
# ---------------------------------------------------------------------------

def test_validators_accept_correct_hcl():
    f = write_all(fresh())
    for name in [
        "gcp_provider_written", "gcp_network_written", "gcp_compute_written",
        "gcp_storage_security_written", "gcp_vars_outputs_written",
    ]:
        passed, msg = _check(name, f)
        assert passed is True, (name, msg)


def test_validators_fail_empty():
    for name in [
        "gcp_provider_written", "gcp_network_written", "gcp_compute_written",
        "gcp_storage_security_written", "gcp_vars_outputs_written",
        "gcp_applied", "gcp_misconfig_fixed", "gcp_backend_destroyed",
    ]:
        passed, _ = _check(name, {})
        assert passed is False, name


# ---------------------------------------------------------------------------
# validators: reject flawed configs
# ---------------------------------------------------------------------------

def test_provider_validator_rejects_flaws():
    # missing provider block
    f = {"gcp_files": {"versions.tf": 'terraform {\n required_version = ">= 1.5"\n}\n'}}
    passed, msg = _check("gcp_provider_written", f)
    assert passed is False

    # wrong provider source
    f = {"gcp_files": {"versions.tf": VERSIONS_TF.replace("hashicorp/google", "hashicorp/aws")}}
    passed, _ = _check("gcp_provider_written", f)
    assert passed is False


def test_network_validator_rejects_flaws():
    # auto-mode VPC (the classic mistake)
    bad = NETWORK_TF.replace("auto_create_subnetworks = false", "auto_create_subnetworks = true")
    f = {"gcp_files": {"network.tf": bad}}
    passed, msg = _check("gcp_network_written", f)
    assert passed is False
    assert "auto_create_subnetworks" in msg

    # missing second subnet
    bad2 = "\n".join(l for l in NETWORK_TF.splitlines() if "public_b" not in l and "10.0.2.0/24" not in l)
    f = {"gcp_files": {"network.tf": bad2}}
    passed, _ = _check("gcp_network_written", f)
    assert passed is False


def test_compute_validator_rejects_flaws():
    # no public IP requested
    bad = COMPUTE_TF.replace("  access_config {\n    }\n", "")
    f = {"gcp_files": {"compute.tf": bad}}
    passed, msg = _check("gcp_compute_written", f)
    assert passed is False
    assert "access_config" in msg


def test_storage_security_validator_rejects_flaws():
    # no versioning on the bucket
    bad_storage = STORAGE_TF.replace("  versioning {\n    enabled = true\n  }\n", "")
    f = {"gcp_files": {"storage.tf": bad_storage, "security.tf": SECURITY_TF_FLAWED}}
    passed, msg = _check("gcp_storage_security_written", f)
    assert passed is False
    assert "versioning" in msg

    # missing IAM binding
    bad_sec = "\n".join(l for l in SECURITY_TF_FLAWED.splitlines()
                        if "google_project_iam_binding" not in l and "log_viewer" not in l)
    f = {"gcp_files": {"storage.tf": STORAGE_TF, "security.tf": bad_sec}}
    passed, _ = _check("gcp_storage_security_written", f)
    assert passed is False


def test_vars_outputs_validator_rejects_flaws():
    # missing required project_id variable
    bad = "\n".join(l for l in VARIABLES_TF.splitlines() if 'variable "project_id"' not in l)
    f = {"gcp_files": {"variables.tf": bad, "outputs.tf": OUTPUTS_TF}}
    passed, msg = _check("gcp_vars_outputs_written", f)
    assert passed is False
    assert "project_id" in msg

    # missing output
    bad2 = OUTPUTS_TF.replace('output "web_external_ip"', 'output "renamed_ip"')
    f = {"gcp_files": {"variables.tf": VARIABLES_TF, "outputs.tf": bad2}}
    passed, _ = _check("gcp_vars_outputs_written", f)
    assert passed is False


def test_applied_validator_requires_full_lifecycle():
    f = write_all(fresh())
    passed, _ = _check("gcp_applied", f)
    assert passed is False  # nothing run yet
    run_cmd("terraform init", f)
    passed, _ = _check("gcp_applied", f)
    assert passed is False  # not validated
    run_cmd("terraform validate", f)
    run_cmd("terraform plan -out=tfplan", f)
    passed, _ = _check("gcp_applied", f)
    assert passed is False  # not applied
    run_cmd("terraform apply tfplan", f)
    passed, msg = _check("gcp_applied", f)
    assert passed is True, msg


def test_misconfig_validator_flow():
    f = write_all(fresh())  # flawed security.tf
    passed, msg = _check("gcp_misconfig_fixed", f)
    assert passed is False
    assert "0.0.0.0/0" in msg

    # full lifecycle with the flawed config first
    run_cmd("terraform init", f)
    run_cmd("terraform validate", f)
    run_cmd("terraform plan -out=tfplan", f)
    run_cmd("terraform apply tfplan", f)

    # rewrite with the fix, like the student does via the shell
    run_cmd(f"write security.tf\n{SECURITY_TF_FIXED}\nEOF", f)
    passed, msg = _check("gcp_misconfig_fixed", f)
    assert passed is False  # fixed in file, but not redeployed
    assert "apply" in msg.lower()

    # redeploy: plan shows the in-place update, apply prompts, yes confirms
    run_cmd("terraform plan", f)
    r = run_cmd("terraform apply", f)
    assert "1 to change" in r.output
    r = run_cmd("yes", f)
    assert "1 changed" in r.output
    passed, msg = _check("gcp_misconfig_fixed", f)
    assert passed is True, msg


def test_backend_validator_requires_backend_and_destroy():
    f = write_all(fresh())
    run_cmd("terraform init", f)
    run_cmd("terraform validate", f)
    run_cmd("terraform plan -out=tfplan", f)
    run_cmd("terraform apply tfplan", f)
    passed, _ = _check("gcp_backend_destroyed", f)
    assert passed is False  # no backend.tf

    run_cmd("write backend.tf\nterraform {}\nEOF", f)
    passed, msg = _check("gcp_backend_destroyed", f)
    assert passed is False  # backend block wrong

    run_cmd(f"write backend.tf\n{BACKEND_TF}\nEOF", f)
    passed, _ = _check("gcp_backend_destroyed", f)
    assert passed is False  # not destroyed yet

    run_cmd("terraform destroy", f)
    run_cmd("yes", f)
    passed, msg = _check("gcp_backend_destroyed", f)
    assert passed is True, msg


# ---------------------------------------------------------------------------
# end-to-end: every objective completable in order
# ---------------------------------------------------------------------------

def test_full_workflow_completes_all_objectives():
    f = fresh()
    # objectives 1-5: write files
    write_all(f)
    for name in ["gcp_provider_written", "gcp_network_written", "gcp_compute_written",
                 "gcp_storage_security_written", "gcp_vars_outputs_written"]:
        passed, msg = _check(name, f)
        assert passed is True, (name, msg)

    # objective 6: init -> validate -> plan -> apply
    run_cmd("terraform init", f)
    run_cmd("terraform validate", f)
    run_cmd("terraform plan -out=tfplan", f)
    run_cmd("terraform apply tfplan", f)
    passed, msg = _check("gcp_applied", f)
    assert passed is True, msg

    # objective 7: fix ssh, redeploy
    run_cmd(f"write security.tf\n{SECURITY_TF_FIXED}\nEOF", f)
    run_cmd("terraform plan", f)
    run_cmd("terraform apply", f)
    run_cmd("yes", f)
    passed, msg = _check("gcp_misconfig_fixed", f)
    assert passed is True, msg

    # objective 8: backend + destroy
    run_cmd(f"write backend.tf\n{BACKEND_TF}\nEOF", f)
    run_cmd("terraform init", f)
    run_cmd("terraform destroy", f)
    run_cmd("yes", f)
    passed, msg = _check("gcp_backend_destroyed", f)
    assert passed is True, msg


def test_determinism():
    """Same workflow twice -> same fake IDs and outputs."""
    def scenario():
        f = fresh()
        write_all(f)
        outs = []
        for cmd in ["terraform init", "terraform validate",
                    "terraform plan -out=tfplan", "terraform apply tfplan",
                    "terraform output"]:
            outs.append(run_cmd(cmd, f).output)
        return outs
    assert scenario() == scenario()
