"""Tests for the cloud security audit (AWS CLI) and Terraform lab shells."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio

from fastapi.testclient import TestClient
import main
from labs import sessions as sessions_mod
from labs.registry import get_lab
from labs.shells import aws_audit, meta, terraform
from labs.sessions import SessionService

client = TestClient(main.app)
AUDIT = get_lab("cloud-aws-audit-001")
TF = get_lab("cloud-terraform-001")


def _run(lab_id, cmds):
    svc = SessionService()
    s = asyncio.run(svc.start(lab_id, "u1"))
    last = None
    for c in cmds:
        s, last = asyncio.run(svc.exec_command(s.id, "u1", c))
    return s, last


# ---- Cloud security audit (AWS CLI) ----

def test_audit_lab_completes():
    s, _ = _run("cloud-aws-audit-001", [
        "aws s3 ls",
        "aws s3api get-bucket-acl --bucket corp-public-backups",
        "aws ec2 describe-security-groups",
        "aws iam list-attached-user-policies --user-name deploy",
        "aws iam list-access-keys --user-name ci-bot",
    ])
    assert s.status == "COMPLETED"
    assert all(s.progress.values())


def test_private_bucket_acl_does_not_flag_public():
    r = aws_audit.run(AUDIT, "aws s3api get-bucket-acl --bucket corp-logs", {})
    assert "AllUsers" not in r.output and r.findings == {}


def test_public_bucket_acl_flags_allusers():
    r = aws_audit.run(AUDIT, "aws s3api get-bucket-acl --bucket corp-public-backups", {})
    assert "AllUsers" in r.output and r.findings.get("public_bucket")


def test_read_only_user_is_not_flagged_admin():
    r = aws_audit.run(AUDIT, "aws iam list-attached-user-policies --user-name analyst", {})
    assert "ReadOnlyAccess" in r.output and r.findings == {}


def test_non_aws_command_is_rejected():
    r = aws_audit.run(AUDIT, "rm -rf /", {})
    assert r.exit_code == 127 and r.findings == {}


# ---- Terraform ----

def test_terraform_lab_completes():
    s, _ = _run("cloud-terraform-001", ["cat main.tf", "terraform init", "tfsec", "terraform plan", "terraform apply"])
    assert s.status == "COMPLETED"
    assert all(s.progress.values())


def test_terraform_requires_init_before_plan_and_apply():
    assert terraform.run(TF, "terraform plan", {}).exit_code == 1
    assert terraform.run(TF, "terraform apply", {}).exit_code == 1
    assert terraform.run(TF, "terraform plan", {"init_done": True}).findings.get("plan_done")


def test_tfsec_flags_open_ssh():
    r = terraform.run(TF, "tfsec", {})
    assert "HIGH" in r.output and "22" in r.output and r.findings.get("security_issue")


def test_state_list_requires_apply():
    assert terraform.run(TF, "terraform state list", {"init_done": True}).exit_code == 1
    assert "aws_s3_bucket.assets" in terraform.run(TF, "terraform state list", {"applied": True}).output


# ---- API surface ----

def test_cloud_definitions_have_terminal_and_five_objectives():
    labs = {l["id"]: l for l in client.get("/api/labs/definitions").json()["labs"]}
    for lab_id in ("cloud-aws-audit-001", "cloud-terraform-001"):
        assert labs[lab_id].get("terminal") and len(labs[lab_id]["objectives"]) == 5
    assert meta(TF)["prompt"].startswith("student@iac")
    assert meta(AUDIT)["prompt"].startswith("auditor@cloudshell")
