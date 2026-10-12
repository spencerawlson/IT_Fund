"""Contract tests for the DevOps-tools labs (Trivy + Terraform policy-as-code).

No Docker daemon: definitions import directly from labs.definitions.devops_tools,
validators are exercised with synthetic findings dicts, and the env hardening
flags are asserted on the data. The images themselves are built on FedServ
via backend/labs/images/build.sh (see /tmp/phase3-docs-devops.md).
"""
import sys
import tarfile
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import labs.validators_devops  # noqa: F401  (registers trivy_*/tfpolicy_* validators)
from labs.definitions.devops_tools import IAC_POLICY_LAB, TRIVY_LAB
from labs.validators import VALIDATORS

IMAGES_DIR = Path(__file__).resolve().parent / "images"


def _assert_env_hardened(lab):
    env = lab.environment
    assert env.provider == "docker"
    assert env.idle_timeout_minutes == 15
    assert env.max_runtime_minutes == 45
    assert env.deny_internet_egress is True
    assert env.cpu_limit == 1.0
    assert env.memory_mb == 512
    assert env.workdir == "/home/analyst"
    assert lab.shell == "linux_cli"


def test_trivy_lab_definition_fields():
    lab = TRIVY_LAB
    assert lab.id == "sec-trivy-001"
    assert lab.category == "devops"
    assert lab.difficulty == "intermediate"
    assert lab.estimated_minutes == 25
    assert lab.environment.image == "road-to-cissp/trivy:latest"
    assert lab.targets[0].hostname == "devsecops01"
    assert lab.targets[0].role == "DevSecOps workstation"
    assert len(lab.objectives) == 5
    _assert_env_hardened(lab)


def test_iac_policy_lab_definition_fields():
    lab = IAC_POLICY_LAB
    assert lab.id == "iac-policy-001"
    assert lab.category == "devops"
    assert lab.difficulty == "intermediate"
    assert lab.estimated_minutes == 25
    assert lab.environment.image == "road-to-cissp/iac-policy:latest"
    assert lab.targets[0].hostname == "devsecops01"
    _assert_env_hardened(lab)


def test_all_objective_validators_registered():
    for lab in (TRIVY_LAB, IAC_POLICY_LAB):
        for obj in lab.objectives:
            assert obj.validator in VALIDATORS, f"unknown validator: {obj.validator}"
            assert obj.validator.startswith(("trivy_", "tfpolicy_"))


def test_objective_ids_unique_per_lab():
    for lab in (TRIVY_LAB, IAC_POLICY_LAB):
        ids = [o.id for o in lab.objectives]
        assert len(ids) == len(set(ids))


def test_trivy_validators_pass_fail():
    assert VALIDATORS["trivy_scan_run"]({}, {})[0] is False
    assert VALIDATORS["trivy_scan_run"]({}, {"trivy_scan_run": True})[0] is True

    # Critical CVE: needs a CVE-looking value.
    assert VALIDATORS["trivy_critical_identified"]({}, {})[0] is False
    ok, msg, ev = VALIDATORS["trivy_critical_identified"](
        {}, {"trivy_critical_identified": {"cve": "CVE-2022-37434", "package": "zlib1g"}})
    assert ok and ev["cve"] == "CVE-2022-37434" and "CVE-2022-37434" in msg
    assert VALIDATORS["trivy_critical_identified"](
        {}, {"trivy_critical_identified": {"cve": "not-a-cve"}})[0] is False

    # Fixed version: needs both the CVE and the version.
    assert VALIDATORS["trivy_fixed_version_found"]({}, {"trivy_fixed_version": {"cve": "CVE-2022-37434"}})[0] is False
    ok, msg, ev = VALIDATORS["trivy_fixed_version_found"](
        {}, {"trivy_fixed_version": {"cve": "CVE-2022-37434", "fixed_version": "1:1.2.12"}})
    assert ok and ev["fixed_version"] == "1:1.2.12"

    assert VALIDATORS["trivy_report_saved"]({}, {})[0] is False
    assert VALIDATORS["trivy_report_saved"]({}, {"trivy_report_saved": {"file": "report.json"}})[0] is True
    assert VALIDATORS["trivy_remediation_written"]({}, {})[0] is False
    assert VALIDATORS["trivy_remediation_written"]({}, {"trivy_remediation_written": True})[0] is True


def test_tfpolicy_validators_pass_fail():
    assert VALIDATORS["tfpolicy_config_viewed"]({}, {})[0] is False
    assert VALIDATORS["tfpolicy_config_viewed"]({}, {"tfpolicy_config_viewed": True})[0] is True

    assert VALIDATORS["tfpolicy_tfsec_run"]({}, {})[0] is False
    ok, msg, _ = VALIDATORS["tfpolicy_tfsec_run"]({}, {"tfpolicy_tfsec_run": {"issues": 4}})
    assert ok and "4" in msg

    assert VALIDATORS["tfpolicy_conftest_run"]({}, {})[0] is False
    assert VALIDATORS["tfpolicy_conftest_run"]({}, {"tfpolicy_conftest_run": {"failures": 3}})[0] is True

    assert VALIDATORS["tfpolicy_violations_fixed"]({}, {})[0] is False
    assert VALIDATORS["tfpolicy_violations_fixed"]({}, {"tfpolicy_violations_fixed": True})[0] is True

    assert VALIDATORS["tfpolicy_all_green"]({}, {})[0] is False
    assert VALIDATORS["tfpolicy_all_green"]({}, {"tfpolicy_all_green": True})[0] is True


def test_trivy_seed_tarball_has_dpkg_status():
    tarball = IMAGES_DIR / "seeds" / "sec-trivy-001" / "vuln-rootfs.tar.gz"
    assert tarball.exists()
    with tarfile.open(tarball, "r:gz") as tf:
        names = tf.getnames()
    assert "var/lib/dpkg/status" in names
    assert "etc/os-release" in names


def test_iac_policy_seeds_present():
    seed = IMAGES_DIR / "seeds" / "iac-policy-001"
    main_tf = (seed / "main.tf").read_text()
    assert "aws_s3_bucket" in main_tf and "aws_security_group" in main_tf
    assert "0.0.0.0/0" in main_tf
    rego_files = sorted((seed / "policy").glob("*.rego"))
    assert len(rego_files) >= 1
    assert all("deny" in f.read_text() for f in rego_files)
