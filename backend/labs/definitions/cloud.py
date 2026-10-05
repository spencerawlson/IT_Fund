"""Cloud computing / cloud security lab definitions (data only; nothing here executes).

Both drive a simulated terminal via the shells registry: an AWS CLI audit shell and a Terraform
workflow shell. Each lab is a progression of several exercises validated against the resulting state.
"""
from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget

CLOUD_AUDIT_LAB = LabDefinition(
    id="cloud-aws-audit-001",
    slug="cloud-security-audit",
    title="Cloud Security Audit with the AWS CLI",
    description=(
        "You have read-only access to audit a dev AWS account for the classic cloud misconfigurations. "
        "Use the AWS CLI to find a publicly-exposed S3 bucket, a security group with SSH open to the "
        "world, an IAM user with AdministratorAccess, and a stale access key that was never rotated."
    ),
    category="cloud",
    difficulty="intermediate",
    estimated_minutes=30,
    shell="aws_audit",
    environment=LabEnvironmentConfig(
        provider="mock",
        # NOT prefers_docker: the cloudshell image runs real awscli against a
        # live moto server, whose output (account IDs, ARNs, timestamps) is
        # dynamic and not byte-identical to the aws_audit mock shell — and no
        # test proves parity. Promoting it risks the learner seeing real moto
        # output that disagrees with the recorded findings. Stays simulated
        # until an end-to-end fidelity test covers the moto scenario.
        image="road-to-cissp/cloudshell:latest",
        workdir="/home/auditor",
        idle_timeout_minutes=20,
        max_runtime_minutes=60,
        deny_internet_egress=True,
    ),
    targets=[LabTarget(hostname="globomantics-dev", role="AWS account under audit", intentionally_vulnerable=True)],
    objectives=[
        LabObjective(id="list-buckets", label="List the account's S3 buckets", validator="bucket_list",
                     hints=["aws s3 ls"]),
        LabObjective(id="public-bucket", label="Find the publicly-exposed bucket", validator="public_bucket",
                     hints=["Check each bucket's ACL: aws s3api get-bucket-acl --bucket <name> — look for the AllUsers group."]),
        LabObjective(id="open-ssh", label="Find the security group with SSH open to the world", validator="open_ssh",
                     hints=["aws ec2 describe-security-groups — which group allows 0.0.0.0/0 on port 22?"]),
        LabObjective(id="admin-user", label="Find the over-privileged IAM user", validator="admin_user",
                     hints=["List users (aws iam list-users), then their policies: aws iam list-attached-user-policies --user-name <u>."]),
        LabObjective(id="stale-key", label="Find the stale, never-rotated access key", validator="stale_key",
                     hints=["aws iam list-access-keys --user-name <u> — check the CreateDate; one key is over a year old."]),
    ],
)

TERRAFORM_LAB = LabDefinition(
    id="cloud-terraform-001",
    slug="terraform-provision-and-secure",
    title="Terraform: Provision & Secure Infrastructure",
    description=(
        "Learn the Terraform workflow — init, plan, apply — on a starter AWS configuration, and catch "
        "the insecure default (SSH open to 0.0.0.0/0) with a tfsec scan before you ever apply it. "
        "Infrastructure as Code, with a cloud-security eye."
    ),
    category="cloud",
    difficulty="intermediate",
    estimated_minutes=30,
    shell="terraform",
    environment=LabEnvironmentConfig(
        provider="mock",
        prefers_docker=True,
        image="road-to-cissp/iac:latest",
        # Matches the mock shell's prompt (student@iac:~/infra$): the config lives here.
        workdir="/home/student/infra",
        idle_timeout_minutes=20,
        max_runtime_minutes=60,
        deny_internet_egress=True,
    ),
    targets=[LabTarget(hostname="infra", role="Terraform working directory")],
    objectives=[
        LabObjective(id="review-config", label="Review the infrastructure definition", validator="config_viewed",
                     hints=["cat main.tf — note the aws_security_group and its ingress rules."]),
        LabObjective(id="init", label="Initialize the working directory", validator="init_done",
                     hints=["terraform init — downloads the AWS provider."]),
        LabObjective(id="scan", label="Catch the insecure default before applying", validator="security_issue",
                     hints=["tfsec scans the config statically and flags a HIGH issue (SSH open to 0.0.0.0/0)."]),
        LabObjective(id="plan", label="Preview the execution plan", validator="plan_done",
                     hints=["terraform plan (after init) — 3 resources to add."]),
        LabObjective(id="apply", label="Provision the resources", validator="applied",
                     hints=["terraform apply (after init) — creates the bucket, security group, and instance."]),
    ],
)
