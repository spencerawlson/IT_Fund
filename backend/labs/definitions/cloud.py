"""Cloud computing / cloud security lab definitions (data only; nothing here executes).

Both drive a simulated terminal via the shells registry: an AWS CLI audit shell and a Terraform
workflow shell. Each lab is a progression of several exercises validated against the resulting state.
"""
from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget
from labs.validators import validator

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
        # Docker image road-to-cissp/cloudshell is published on FedSer: the real
        # AWS CLI against a local moto API seeded with the misconfigured account.
        provider="docker",
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
        "Learn the Terraform workflow — init, validate, plan — on a starter AWS configuration, and catch "
        "the insecure default (SSH open to 0.0.0.0/0) with a tfsec scan before you ever apply it. "
        "The sandbox has no AWS API access, so the workflow stops at a saved, reviewed plan: the last "
        "human gate before a real apply. Infrastructure as Code, with a cloud-security eye."
    ),
    category="cloud",
    difficulty="intermediate",
    estimated_minutes=30,
    shell="terraform",
    environment=LabEnvironmentConfig(
        # Docker image road-to-cissp/iac is published on FedSer: real terraform +
        # tfsec with an offline provider mirror. init/validate/plan/tfsec all run
        # for real; apply stops at a saved plan (no AWS API in the sandbox).
        provider="docker",
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
        LabObjective(id="apply", label="Lock in a deployment-ready plan", validator="applied",
                     description="No AWS API here, so apply stops at a saved plan — the artifact a real pipeline would hand to the apply stage.",
                     hints=["terraform plan -out=tfplan — the saved plan is the deployable artifact.",
                            "terraform show tfplan — read what would be created before signing it off."]),
    ],
)


# ---- AWS CLI fundamentals (SAA-C03) ----

@validator("awsc_identity_checked")
def awsc_identity_checked(args, findings):
    if findings.get("aws_identity"):
        return True, "Identity confirmed: you know who you are in this account.", {"account": "123456789012"}
    return False, "Run aws sts get-caller-identity first.", None


@validator("awsc_instances_listed")
def awsc_instances_listed(args, findings):
    n = findings.get("aws_instances_listed") or 0
    if n >= 3:
        return True, f"You inventoried the fleet: {n} EC2 instances recorded.", {"instances": n}
    return False, "List the EC2 instances: aws ec2 describe-instances.", None


@validator("awsc_instance_launched")
def awsc_instance_launched(args, findings):
    if findings.get("aws_instance_launched"):
        return True, "Your instance is launched and running.", None
    return False, "Launch an instance: aws ec2 run-instances --image-id ami-0abc --instance-type t3.micro --subnet-id subnet-pub1.", None


@validator("awsc_bucket_created")
def awsc_bucket_created(args, findings):
    if findings.get("aws_bucket_created"):
        return True, "Bucket created and an object uploaded to it.", None
    return False, "Create a bucket (aws s3 mb s3://<name>) and upload a file (aws s3 cp <file> s3://<name>).", None


@validator("awsc_vpc_built")
def awsc_vpc_built(args, findings):
    if findings.get("aws_vpc_built"):
        return True, "Your VPC exists and has a subnet inside it.", None
    return False, "Create a VPC (aws ec2 create-vpc --cidr-block 10.1.0.0/16), then a subnet in it (aws ec2 create-subnet --vpc-id <vpc> --cidr-block 10.1.1.0/24).", None


@validator("awsc_alb_inspected")
def awsc_alb_inspected(args, findings):
    if findings.get("aws_alb_inspected"):
        return True, "Load balancer inspected: both targets report healthy.", {"targets": "2/2 healthy"}
    return False, "Describe the load balancer, then check target health: aws elbv2 describe-target-health --target-group-arn <arn> (get the ARN from describe-target-groups).", None


@validator("awsc_alarms_reviewed")
def awsc_alarms_reviewed(args, findings):
    if findings.get("aws_alarms_reviewed"):
        return True, "Alarms reviewed: one is in ALARM state and needs attention.", {"alarms": 2}
    return False, "Review the CloudWatch alarms: aws cloudwatch describe-alarms.", None


@validator("awsc_cleanup_done")
def awsc_cleanup_done(args, findings):
    if not findings.get("aws_instance_launched") and not findings.get("aws_cleanup_done"):
        return False, "Launch an instance first, then terminate it to prove cleanup.", None
    if findings.get("aws_cleanup_done"):
        return True, "Cleanup verified: no student-launched instances are still running.", None
    return False, "Terminate the instance you launched: aws ec2 terminate-instances --instance-ids <id>.", None


AWS_CLI_LAB = LabDefinition(
    id="aws-cli-001",
    slug="aws-cli-fundamentals",
    title="AWS CLI Fundamentals",
    description=(
        "Learn the AWS CLI the way solutions architects use it: confirm your identity, inventory EC2, "
        "launch an instance, create an S3 bucket and upload to it, build a VPC with a subnet, inspect "
        "the application load balancer's target health, review CloudWatch alarms, and clean up what you "
        "built. Mapped to the AWS Solutions Architect Associate (SAA-C03) exam. Everything is simulated."
    ),
    category="cloud",
    difficulty="beginner",
    estimated_minutes=45,
    shell="aws_cli",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/aws-cli:latest",
        workdir="/home/student/aws",
        idle_timeout_minutes=25,
        max_runtime_minutes=60,
        deny_internet_egress=True,
    ),
    targets=[
        LabTarget(hostname="aws-account", role="AWS account 123456789012 (simulated)"),
    ],
    objectives=[
        LabObjective(
            id="whoami", label="Prove your identity", validator="awsc_identity_checked",
            description="Before touching anything, confirm who you are in this AWS account.",
            hints=["aws sts get-caller-identity returns your ARN and account id.",
                   "Real architects run this first in every new shell — it catches wrong profiles."]),
        LabObjective(
            id="list-instances", label="Inventory the EC2 fleet", validator="awsc_instances_listed",
            description="List every EC2 instance in the account and note their states.",
            hints=["aws ec2 describe-instances shows all instances, types, states and subnets.",
                   "One instance is stopped — stopped instances still cost for EBS, not compute."]),
        LabObjective(
            id="launch-instance", label="Launch an EC2 instance", validator="awsc_instance_launched",
            description="Launch a t3.micro instance into the public subnet.",
            hints=["aws ec2 run-instances --image-id ami-0abc123 --instance-type t3.micro --subnet-id subnet-pub1",
                   "The command returns the new instance id — save it, you will need it for cleanup."]),
        LabObjective(
            id="s3-storage", label="Create a bucket and upload", validator="awsc_bucket_created",
            description="Create your own S3 bucket and upload a file into it.",
            hints=["aws s3 mb s3://<your-bucket-name> — bucket names are globally unique.",
                   "aws s3 cp notes.txt s3://<your-bucket-name> uploads; aws s3 ls s3://<name> lists objects."]),
        LabObjective(
            id="vpc-network", label="Build a VPC with a subnet", validator="awsc_vpc_built",
            description="Create a VPC, then carve a subnet out of it — the foundation of every AWS network.",
            hints=["aws ec2 create-vpc --cidr-block 10.1.0.0/16 returns a vpc- id.",
                   "aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.1.1.0/24 puts a subnet inside it."]),
        LabObjective(
            id="alb-health", label="Inspect the load balancer", validator="awsc_alb_inspected",
            description="Find the application load balancer and verify its targets are healthy.",
            hints=["aws elbv2 describe-load-balancers shows the ALB and its DNS name.",
                   "aws elbv2 describe-target-groups gives the target group ARN.",
                   "aws elbv2 describe-target-health --target-group-arn <arn> — both targets should be healthy."]),
        LabObjective(
            id="cloudwatch-alarms", label="Review CloudWatch alarms", validator="awsc_alarms_reviewed",
            description="List the CloudWatch alarms and identify which one needs attention.",
            hints=["aws cloudwatch describe-alarms shows every alarm and its state.",
                   "One alarm is in ALARM state — in production that would page someone."]),
        LabObjective(
            id="cleanup", label="Clean up what you built", validator="awsc_cleanup_done",
            description="Terminate the instance you launched. Architects clean up: running resources cost money.",
            hints=["aws ec2 terminate-instances --instance-ids <your-instance-id>",
                   "aws ec2 describe-instances afterwards should show it as terminated."]),
    ],
)


# ---- IAM policies & least privilege (SCS-C02: IAM is 16% of the exam) ----

def _iam_state(findings):
    st = findings.get("_iam") or {}
    return st if isinstance(st, dict) else {}


def _iam_sims(findings):
    sims = findings.get("iam_simulations") or []
    return sims if isinstance(sims, list) else []


def _as_list(v):
    return v if isinstance(v, list) else [v]


def _is_read_action(action: str) -> bool:
    suffix = str(action).split(":")[-1].lower()
    return suffix.startswith(("get", "list", "describe"))


def _least_privilege_check(doc):
    """Validate a rewritten role policy. Returns (passed, message, evidence)."""
    if not isinstance(doc, dict):
        return False, "PowerUserFlawed has no policy document yet — rewrite it with iam put-policy.", None
    stmts = doc.get("Statement")
    if isinstance(stmts, dict):
        stmts = [stmts]
    if not isinstance(stmts, list) or not stmts:
        return False, "The policy needs a non-empty Statement list.", None
    allows = [s for s in stmts if isinstance(s, dict) and str(s.get("Effect", "")).lower() == "allow"]
    if not allows:
        return False, "No Allow statements — the deploy role still needs scoped permissions to do its job.", None
    for s in allows:
        actions = _as_list(s.get("Action", []))
        resources = _as_list(s.get("Resource", []))
        if any(a == "*" for a in actions):
            return False, "Still allows Action \"*\" — replace the wildcard with the specific deploy actions.", None
        if any(str(a).lower() == "iam:*" for a in actions):
            return False, "Allows iam:* — that is a privilege-escalation path. Scope or remove IAM actions.", None
        if any(r == "*" for r in resources) and any(not _is_read_action(a) for a in actions):
            return False, ("Grants write actions on Resource \"*\" — scope resources to the buckets/roles "
                           "the deploy role actually needs."), None
    has_scoped_write = any(
        any(not _is_read_action(a) for a in _as_list(s.get("Action", [])))
        and any(r != "*" for r in _as_list(s.get("Resource", [])))
        for s in allows
    )
    if not has_scoped_write:
        return False, ("The policy allows nothing useful — keep the deploy actions the role needs, "
                       "just scoped to specific resources."), None
    return True, "PowerUserFlawed now follows least privilege: scoped actions, scoped resources.", None


@validator("iam_identities_listed")
def iam_identities_listed(args, findings):
    if findings.get("iam_users_listed") and findings.get("iam_roles_listed"):
        return True, "You inventoried the IAM users and roles.", None
    return False, "List the identities first: iam list-users and iam list-roles.", None


@validator("iam_policies_read")
def iam_policies_read(args, findings):
    read = set(findings.get("iam_policies_read") or [])
    if len(read) >= 3:
        return True, f"You read {len(read)} managed policies.", {"policies": sorted(read)}
    return False, "Read the policy documents: iam get-policy <name> (at least 3 of the 4).", None


@validator("iam_sim_allow")
def iam_sim_allow(args, findings):
    for s in _iam_sims(findings):
        if (s.get("decision") == "ALLOW"
                and s.get("principal") in ("dev", "user/dev")
                and str(s.get("action", "")).lower() == "s3:getobject"
                and "dev-bucket" in str(s.get("resource", ""))):
            return True, "Simulator confirms dev can read from dev-bucket.", None
    return False, ("Use the simulator: iam simulate user/dev s3:GetObject "
                   "arn:aws:s3:::dev-bucket/report.csv — expect ALLOW."), None


@validator("iam_flaw_found")
def iam_flaw_found(args, findings):
    for s in _iam_sims(findings):
        if (s.get("decision") == "ALLOW"
                and "deployrole" in str(s.get("principal", "")).lower()
                and str(s.get("action", "")).lower().startswith("iam:")):
            return True, "Confirmed: DeployRole can run IAM actions — the policy is far too broad.", None
    return False, ("Find the flaw: iam simulate role/DeployRole iam:CreateUser * — "
                   "a deploy role should never be able to do that."), None


@validator("iam_policy_fixed")
def iam_policy_fixed(args, findings):
    doc = ((_iam_state(findings).get("policies") or {}).get("PowerUserFlawed") or {}).get("Document")
    return _least_privilege_check(doc)


@validator("iam_trust_fixed")
def iam_trust_fixed(args, findings):
    trust = ((_iam_state(findings).get("roles") or {}).get("DeployRole") or {}).get("trust") or {}
    stmts = trust.get("Statement")
    if isinstance(stmts, dict):
        stmts = [stmts]
    if not isinstance(stmts, list) or not stmts:
        return False, "DeployRole has no trust policy statements — set one with iam set-trust-policy.", None
    principals = []
    for s in stmts:
        if isinstance(s, dict):
            p = (s.get("Principal") or {}).get("AWS")
            if p:
                principals.extend(_as_list(p))
    if not principals:
        return False, "The trust policy names no AWS principal — who is allowed to assume DeployRole?", None
    if any(p == "*" for p in principals):
        return False, ("Principal \"*\" lets any AWS account assume the role — scope it to a specific "
                       "role ARN (arn:aws:iam::<account>:role/<name>)."), None
    if not any(str(p).startswith("arn:aws:iam::") for p in principals):
        return False, "Use a full role ARN as the principal, e.g. arn:aws:iam::123456789012:role/Deployer.", None
    if not any(isinstance(s, dict) and s.get("Condition") for s in stmts):
        return False, ("Add a Condition to the trust policy (e.g. MFA required) — trust should constrain "
                       "when assumption is allowed, not just who."), None
    return True, "DeployRole trust is scoped to a specific principal with conditions.", {"principals": principals}


@validator("iam_boundary_set")
def iam_boundary_set(args, findings):
    boundary = ((_iam_state(findings).get("users") or {}).get("dev") or {}).get("boundary")
    if boundary:
        return True, f"dev now has permissions boundary '{boundary}'.", {"boundary": boundary}
    return False, "Set a permissions boundary: iam set-boundary --user dev --policy <name>.", None


@validator("iam_verified")
def iam_verified(args, findings):
    sims = _iam_sims(findings)
    allow_ok = any(
        s.get("decision") == "ALLOW" and s.get("principal") in ("dev", "user/dev")
        and str(s.get("action", "")).lower() == "s3:getobject"
        and "dev-bucket" in str(s.get("resource", "")) for s in sims)
    deny_ok = any(
        s.get("decision") != "ALLOW" and s.get("principal") in ("dev", "user/dev")
        and str(s.get("action", "")).lower() == "iam:createuser" for s in sims)
    if allow_ok and deny_ok:
        return True, "Verified: dev can read the bucket and cannot escalate via IAM.", None
    missing = []
    if not allow_ok:
        missing.append("iam simulate user/dev s3:GetObject arn:aws:s3:::dev-bucket/report.csv (expect ALLOW)")
    if not deny_ok:
        missing.append("iam simulate user/dev iam:CreateUser * (expect DENY)")
    return False, "Prove least privilege with the simulator: " + "; ".join(missing), None


AWS_IAM_LAB = LabDefinition(
    id="aws-iam-001",
    slug="iam-policies-least-privilege",
    title="IAM Policies & Least Privilege",
    description=(
        "Work the IAM policy workbench: read the account's users, roles and policies, prove what "
        "they allow with the policy simulator, find the over-privileged deploy role, rewrite its "
        "policy to least privilege, lock down its trust policy, cap a user with a permissions "
        "boundary, and verify it all with the simulator. Maps to SCS-C02 (IAM is 16% of the exam)."
    ),
    category="cloud",
    difficulty="intermediate",
    estimated_minutes=45,
    shell="iam_cli",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/cloudshell:latest",
        workdir="/home/student",
        idle_timeout_minutes=20,
        max_runtime_minutes=60,
        deny_internet_egress=True,
    ),
    targets=[LabTarget(hostname="iam-workbench", role="Simulated IAM policy workbench", intentionally_vulnerable=True)],
    objectives=[
        LabObjective(
            id="list-identities", label="Inventory the IAM users and roles", validator="iam_identities_listed",
            description="See who exists in the account before touching any policy.",
            hints=["iam list-users shows users, attached policies and boundaries.",
                   "iam list-roles shows the two roles and their policies."]),
        LabObjective(
            id="read-policies", label="Read the managed policy documents", validator="iam_policies_read",
            description="Read the JSON of at least three managed policies — policies are code, read them.",
            hints=["iam get-policy <name> prints the full document.",
                   "Compare DevS3Scoped (scoped) with PowerUserFlawed (suspicious)."]),
        LabObjective(
            id="simulate-allow", label="Simulate: confirm dev can read the bucket", validator="iam_sim_allow",
            description="Use the policy simulator to prove a legitimate access path.",
            hints=["iam simulate user/dev s3:GetObject arn:aws:s3:::dev-bucket/report.csv",
                   "The simulator shows ALLOW/DENY and exactly which statement matched."]),
        LabObjective(
            id="find-flaw", label="Find the over-privileged policy", validator="iam_flaw_found",
            description="One role can do far more than its job needs. Prove it with the simulator.",
            hints=["Which role would a deploy job use? Check its attached policy JSON first.",
                   "iam simulate role/DeployRole iam:CreateUser * — a deploy role should never allow that."]),
        LabObjective(
            id="fix-policy", label="Rewrite the flawed policy (least privilege)", validator="iam_policy_fixed",
            description="Replace PowerUserFlawed's wildcard with the scoped deploy actions the role needs.",
            hints=["iam put-policy PowerUserFlawed '<json>' — keep deploy actions (ec2, scoped s3), drop \"*\" and iam:*.",
                   "Write actions must target specific resources, not \"*\". Read actions may stay broad."]),
        LabObjective(
            id="fix-trust", label="Lock down the role trust policy", validator="iam_trust_fixed",
            description="DeployRole's trust policy lets any AWS account assume it. Scope it to one principal with conditions.",
            hints=["iam set-trust-policy DeployRole '<json>' with Principal AWS = a specific role ARN.",
                   "Add a Condition (e.g. Bool aws:MultiFactorAuthPresent true) like AnalyticsRole has."]),
        LabObjective(
            id="set-boundary", label="Cap the dev user with a permissions boundary", validator="iam_boundary_set",
            description="Boundaries set the maximum permissions — defense in depth on top of identity policies.",
            hints=["iam set-boundary --user dev --policy <name> — pick a policy that caps dev sensibly.",
                   "Re-run the simulator afterwards: even an Allow can be denied by the boundary."]),
        LabObjective(
            id="verify", label="Verify least privilege with the simulator", validator="iam_verified",
            description="Prove the end state: legitimate access works, escalation is denied.",
            hints=["iam simulate user/dev s3:GetObject arn:aws:s3:::dev-bucket/report.csv → ALLOW",
                   "iam simulate user/dev iam:CreateUser * → DENY"]),
    ],
)
