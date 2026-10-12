"""DevOps-tools labs: container scanning (Trivy) and Terraform policy-as-code.

Data only; nothing here executes. Both labs drive the generic `linux_cli`
shell in hardened per-session Docker containers with real tools: real Trivy
against a seeded vulnerable rootfs tarball, and real tfsec + conftest against
seeded Terraform with policy violations. Validators are registered here
(trivy_* / tfpolicy_* namespaces) so they load with the labs.
"""
from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget

# Importing registers the trivy_* / tfpolicy_* validators via the @validator decorator.
import labs.validators_devops  # noqa: F401

TRIVY_LAB = LabDefinition(
    id="sec-trivy-001",
    slug="container-image-scanning-with-trivy",
    title="Container Image Scanning with Trivy",
    description=(
        "Scan like a DevSecOps engineer: run the real Trivy scanner against a seeded vulnerable "
        "rootfs tarball, triage the HIGH/CRITICAL findings, read the fixed versions out of the "
        "report, and write the upgrade/rebuild remediation. Honesty note: `trivy image` needs "
        "the Docker socket, which the hardened lab provider forbids — this lab runs `trivy "
        "rootfs` on a tarball instead. Same scanner, same vulnerability DB (baked in at image "
        "build time), no live image pull."
    ),
    category="devops", difficulty="intermediate", estimated_minutes=25, shell="linux_cli",
    environment=LabEnvironmentConfig(
        provider="docker", image="road-to-cissp/trivy:latest",
        idle_timeout_minutes=15, max_runtime_minutes=45, deny_internet_egress=True,
        cpu_limit=1.0, memory_mb=512, workdir="/home/analyst"),
    targets=[LabTarget(hostname="devsecops01", role="DevSecOps workstation")],
    objectives=[
        LabObjective(id="scan", label="Run trivy rootfs against the seeded tarball",
                     validator="trivy_scan_run",
                     hints=["trivy rootfs --severity HIGH,CRITICAL ./vuln-rootfs.tar.gz"]),
        LabObjective(id="critical", label="Identify the critical CVE in the report",
                     validator="trivy_critical_identified",
                     hints=["One CRITICAL row names zlib1g — note its CVE (CVE-2022-37434)."]),
        LabObjective(id="fixed", label="Determine the fixed version for that CVE",
                     validator="trivy_fixed_version_found",
                     hints=["Trivy's FIXED column names the patched release — check it for the critical CVE."]),
        LabObjective(id="report", label="Save a JSON report of the scan",
                     validator="trivy_report_saved",
                     hints=["trivy rootfs --format json --output report.json ./vuln-rootfs.tar.gz"]),
        LabObjective(id="remediate", label="Write the remediation note",
                     validator="trivy_remediation_written",
                     hints=["Write remediation.md: which packages to upgrade, to which versions, "
                            "and why the base image must be rebuilt."]),
    ],
)

IAC_POLICY_LAB = LabDefinition(
    id="iac-policy-001",
    slug="terraform-policy-as-code",
    title="Terraform Policy as Code",
    description=(
        "Shift security left: the seeded Terraform has an unencrypted S3 bucket, a security "
        "group with SSH open to the world, and missing required tags. Run real tfsec and real "
        "conftest (OPA policies in policy/*.rego) against it, triage both sets of findings, "
        "fix main.tf until both tools go green — all offline, no AWS credentials needed."
    ),
    category="devops", difficulty="intermediate", estimated_minutes=25, shell="linux_cli",
    environment=LabEnvironmentConfig(
        provider="docker", image="road-to-cissp/iac-policy:latest",
        idle_timeout_minutes=15, max_runtime_minutes=45, deny_internet_egress=True,
        cpu_limit=1.0, memory_mb=512, workdir="/home/analyst"),
    targets=[LabTarget(hostname="devsecops01", role="DevSecOps workstation")],
    objectives=[
        LabObjective(id="view", label="Review the seeded Terraform and policies",
                     validator="tfpolicy_config_viewed",
                     hints=["cat ~/policy-lab/main.tf", "ls ~/policy-lab/policy/"]),
        LabObjective(id="tfsec", label="Run tfsec and triage the findings",
                     validator="tfpolicy_tfsec_run",
                     hints=["cd ~/policy-lab && tfsec ."]),
        LabObjective(id="conftest", label="Run conftest against the OPA policies",
                     validator="tfpolicy_conftest_run",
                     hints=["conftest test --parser hcl2 -p policy/ main.tf"]),
        LabObjective(id="fix", label="Fix main.tf to satisfy both scanners",
                     validator="tfpolicy_violations_fixed",
                     hints=["Add server_side_encryption_configuration and versioning to the bucket, "
                            "restrict the SSH ingress away from 0.0.0.0/0, "
                            "add Environment/Owner tags to both resources."]),
        LabObjective(id="green", label="Re-run tfsec and conftest to green",
                     validator="tfpolicy_all_green",
                     hints=["tfsec . should exit 0; conftest should report 0 failures."]),
    ],
)
