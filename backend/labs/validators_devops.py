"""Outcome-based validators for the DevOps-tools labs.

sec-trivy-001 (trivy_*) and iac-policy-001 (tfpolicy_*) run REAL tools in
hardened per-session containers. The learner records an "I did this"
attestation per objective in the workspace; the attestation lands in the
session `findings` dict, and these validators check that recorded STATE —
never command history — following the _finding_present attestation pattern.
"""
from __future__ import annotations

from typing import Any

from labs.validators import validator


# ---- sec-trivy-001: Container Image Scanning with Trivy ----

@validator("trivy_scan_run")
def trivy_scan_run(args, findings):
    if findings.get("trivy_scan_run"):
        return True, "You ran trivy rootfs against the seeded vulnerable tarball.", None
    return False, "Run the scan: trivy rootfs --severity HIGH,CRITICAL ./vuln-rootfs.tar.gz.", None


@validator("trivy_critical_identified")
def trivy_critical_identified(args, findings):
    hit = findings.get("trivy_critical_identified") or {}
    cve = str(hit.get("cve") or "").upper()
    if cve.startswith("CVE-"):
        pkg = hit.get("package") or "a package"
        return True, f"You identified the critical CVE: {cve} in {pkg}.", {"cve": cve}
    return False, ("Attest the critical CVE from the report — the CRITICAL row in zlib1g "
                   "is CVE-2022-37434."), None


@validator("trivy_fixed_version_found")
def trivy_fixed_version_found(args, findings):
    fix = findings.get("trivy_fixed_version") or {}
    cve = str(fix.get("cve") or "").upper()
    version = fix.get("fixed_version")
    if cve.startswith("CVE-") and version:
        return True, f"You determined the fixed version for {cve}: {version}.", {"cve": cve, "fixed_version": version}
    return False, "Read the FIXED column for the critical CVE and attest the patched version.", None


@validator("trivy_report_saved")
def trivy_report_saved(args, findings):
    if findings.get("trivy_report_saved"):
        return True, "You saved a machine-readable report of the scan.", None
    return False, "Save one: trivy rootfs --format json --output report.json ./vuln-rootfs.tar.gz.", None


@validator("trivy_remediation_written")
def trivy_remediation_written(args, findings):
    if findings.get("trivy_remediation_written"):
        return True, "You wrote the remediation note: upgrade the packages and rebuild the image.", None
    return False, ("Write remediation.md: which packages to upgrade, to which versions, "
                   "and why the base image must be rebuilt."), None


# ---- iac-policy-001: Terraform Policy as Code ----

@validator("tfpolicy_config_viewed")
def tfpolicy_config_viewed(args, findings):
    if findings.get("tfpolicy_config_viewed"):
        return True, "You reviewed the seeded Terraform and the OPA policies.", None
    return False, "Review the starting point: cat ~/policy-lab/main.tf and ls ~/policy-lab/policy/.", None


@validator("tfpolicy_tfsec_run")
def tfpolicy_tfsec_run(args, findings):
    run = findings.get("tfpolicy_tfsec_run")
    if run:
        n = run.get("issues") if isinstance(run, dict) else None
        detail = f" ({n} findings triaged)" if n is not None else ""
        return True, f"You ran tfsec and triaged the findings{detail}.", None
    return False, "Run the scanner: cd ~/policy-lab && tfsec .", None


@validator("tfpolicy_conftest_run")
def tfpolicy_conftest_run(args, findings):
    run = findings.get("tfpolicy_conftest_run")
    if run:
        return True, "You ran conftest against the OPA policies and read the denials.", None
    return False, "Run the policy check: conftest test --parser hcl2 -p policy/ main.tf.", None


@validator("tfpolicy_violations_fixed")
def tfpolicy_violations_fixed(args, findings):
    if findings.get("tfpolicy_violations_fixed"):
        return True, "You fixed main.tf: encrypted + versioned bucket, closed SSH, required tags.", None
    return False, ("Fix main.tf: add server_side_encryption_configuration and versioning to the "
                   "bucket, restrict the SSH ingress away from 0.0.0.0/0, and add "
                   "Environment/Owner tags to both resources."), None


@validator("tfpolicy_all_green")
def tfpolicy_all_green(args, findings):
    if findings.get("tfpolicy_all_green"):
        return True, "Both gates are green: tfsec exits 0 and conftest reports 0 failures.", None
    return False, ("Re-run both: tfsec . should exit 0, and conftest test --parser hcl2 "
                   "-p policy/ main.tf should report 0 failures."), None
