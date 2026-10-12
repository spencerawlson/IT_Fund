"""Terraform Fundamentals lab: the complete core IaC workflow.

Covers init -> validate/fmt -> plan (saved) -> apply -> state/outputs inspection ->
variables (-var / TF_VAR_ / terraform.tfvars) + workspaces -> find & fix the open-SSH
misconfiguration -> destroy. Uses the `terraform_cli` shell, a richer workflow simulation
than the `terraform` shell (which serves the cloud-security-focused cloud-terraform-001).

Validators are defined in this module (not labs/validators.py) via the shared @validator
decorator, so importing this module registers them in VALIDATORS before registry.py checks
objective references.
"""
from __future__ import annotations

from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget
from labs.validators import validator


# ---------------------------------------------------------------------------
# validators (outcome-based: they read findings, not command history)
# ---------------------------------------------------------------------------

@validator("tf_config_viewed")
def tf_config_viewed(args, findings):
    if findings.get("config_viewed"):
        return True, "You reviewed the infrastructure definition.", None
    return False, "Read the configuration first (cat main.tf).", None


@validator("tf_init_validated")
def tf_init_validated(args, findings):
    missing = []
    if not findings.get("init_done"):
        missing.append("terraform init")
    if not findings.get("validated"):
        missing.append("terraform validate")
    if not missing:
        return True, "Working directory initialized and configuration validated.", None
    return False, f"Still needed: {', '.join(missing)}.", None


@validator("tf_plan_saved")
def tf_plan_saved(args, findings):
    plan = findings.get("plan_saved")
    if plan:
        return True, f"Execution plan saved to {plan}.", {"plan_file": plan}
    return False, "Save an execution plan with terraform plan -out=<file>.", None


@validator("tf_applied")
def tf_applied(args, findings):
    resources = findings.get("applied_resources") or []
    # ever_applied persists through destroy: the student did complete the apply step.
    if findings.get("ever_applied"):
        count = len(resources) if resources else 7
        return True, f"Applied: {count} resources provisioned.", {"resources": resources or "destroyed-after-apply"}
    return False, "Apply the configuration (terraform apply).", None


@validator("tf_state_inspected")
def tf_state_inspected(args, findings):
    if findings.get("state_viewed") or findings.get("outputs_viewed"):
        return True, "You inspected Terraform state and outputs.", None
    return False, "Inspect state (terraform state list) or outputs (terraform output).", None


@validator("tf_variables_workspaces")
def tf_variables_workspaces(args, findings):
    vars_set = findings.get("variables_set") or {}
    ws_created = findings.get("workspace_created")
    if vars_set and ws_created:
        return True, (
            f"Variables configured ({', '.join(sorted(vars_set))}) and "
            f'workspace "{findings.get("workspace")}" created.'
        ), {"variables": sorted(vars_set), "workspace": findings.get("workspace")}
    missing = []
    if not vars_set:
        missing.append("override a variable explicitly (-var or export TF_VAR_<name>=<value>)")
    if not ws_created:
        missing.append("create a workspace (terraform workspace new <name>)")
    return False, f"Still needed: {', '.join(missing)}.", None


@validator("tf_misconfiguration_fixed")
def tf_misconfiguration_fixed(args, findings):
    if findings.get("misconfiguration_fixed") and findings.get("fix_deployed"):
        return True, "SSH ingress restricted to 10.0.0.0/8 and the change deployed.", None
    if not findings.get("misconfiguration_fixed"):
        return False, "Find the open SSH rule in main.tf and fix it (edit main.tf).", None
    return False, "Deploy the fix: terraform plan to preview, then terraform apply.", None


@validator("tf_destroyed")
def tf_destroyed(args, findings):
    if findings.get("destroyed"):
        return True, "Infrastructure destroyed. Clean teardown complete.", None
    return False, "Tear everything down (terraform destroy).", None


# ---------------------------------------------------------------------------
# lab definition
# ---------------------------------------------------------------------------

TERRAFORM_FUNDAMENTALS_LAB = LabDefinition(
    id="terraform-fundamentals-001",
    slug="terraform-fundamentals",
    title="Terraform Fundamentals: The IaC Workflow",
    description=(
        "Master the core Terraform workflow on a realistic webapp stack (VPC, subnets, "
        "security group, EC2, S3): init, validate, plan, inspect the planned state, "
        "configure variables and workspaces, find and fix a misconfigured security group rule, "
        "then clean up. The sandbox has no AWS API access, so apply/destroy stop at the plan "
        "stage — exactly where a careful engineer reviews before touching real infrastructure."
    ),
    category="devops",
    difficulty="beginner",
    estimated_minutes=45,
    shell="terraform_cli",
    environment=LabEnvironmentConfig(
        # Docker image road-to-cissp/iac is published on FedServ: real terraform 1.9.8
        # + tfsec with an offline provider mirror. init/validate/plan/tfsec run for
        # real; there is no AWS API in the sandbox, so apply/destroy objectives are
        # framed around the saved plan (the honest boundary).
        provider="docker",
        image="road-to-cissp/iac:latest",
        workdir="/home/student/infra",
        idle_timeout_minutes=20,
        max_runtime_minutes=60,
        deny_internet_egress=True,
    ),
    targets=[LabTarget(hostname="infra", role="Terraform working directory")],
    objectives=[
        LabObjective(
            id="review-config",
            label="Review the infrastructure definition",
            validator="tf_config_viewed",
            description="Read main.tf: 7 resources (VPC, 2 subnets, security group, EC2, S3 + versioning).",
            hints=[
                "cat main.tf — count the resources and read the security group ingress rules.",
                "One ingress rule is far too permissive. Note which port and CIDR.",
            ],
        ),
        LabObjective(
            id="init-validate",
            label="Initialize and validate the working directory",
            validator="tf_init_validated",
            description="terraform init downloads the AWS provider; terraform validate checks the config.",
            hints=[
                "terraform init — then terraform validate (validate needs init first).",
                "terraform fmt tidies formatting; terraform version shows the CLI version.",
            ],
        ),
        LabObjective(
            id="plan",
            label="Preview and save the execution plan",
            validator="tf_plan_saved",
            description="terraform plan shows 7 resources to add. Save it with -out for a repeatable apply.",
            hints=[
                "terraform plan -out=tfplan — the plan file makes apply deterministic.",
                "Read the plan note about the security group before moving on.",
            ],
        ),
        LabObjective(
            id="apply",
            label="Confirm the plan is safe to apply",
            validator="tf_applied",
            description="No AWS API in the sandbox: review the saved plan the way a careful engineer does before apply — 7 adds, no surprises.",
            hints=[
                "terraform show -json tfplan | python3 -c \"import json,sys; d=json.load(sys.stdin); print([c['type'] for c in d['resource_changes']])\"",
                "Every change should be type 'create'; anything else deserves investigation.",
            ],
        ),
        LabObjective(
            id="state-outputs",
            label="Inspect the planned outputs",
            validator="tf_state_inspected",
            description="See what Terraform would track: planned values and outputs from the plan file.",
            hints=[
                "terraform show -json tfplan | python3 -m json.tool | grep -A5 '\"planned_values\"'",
                "terraform output needs real state; the plan JSON shows the would-be outputs instead.",
            ],
        ),
        LabObjective(
            id="variables-workspaces",
            label="Configure variables and workspaces",
            validator="tf_variables_workspaces",
            description="Override a variable explicitly and create an isolated workspace.",
            hints=[
                'terraform plan -var="instance_type=t3.small" — or export TF_VAR_region=us-west-2.',
                "terraform workspace new staging — then terraform workspace list to see it.",
            ],
        ),
        LabObjective(
            id="fix-misconfig",
            label="Find and fix the open SSH rule",
            validator="tf_misconfiguration_fixed",
            description="The web security group allows SSH from 0.0.0.0/0. Restrict it to 10.0.0.0/8 and re-plan to prove the fix.",
            hints=[
                "sed -i 's|0.0.0.0/0|10.0.0.0/8|' main.tf — then grep the SSH ingress block to confirm.",
                "terraform plan shows the 1-line change; tfsec should go quiet on it.",
            ],
        ),
        LabObjective(
            id="destroy",
            label="Clean up the lab workspace",
            validator="tf_destroyed",
            description="No cloud resources were created, so there is nothing to destroy — leave no trace locally instead.",
            hints=[
                "rm -rf .terraform .terraform.lock.hcl tfplan — the working directory returns to just main.tf.",
                "terraform version still works: the tool stays, the lab state goes.",
            ],
        ),
    ],
)
