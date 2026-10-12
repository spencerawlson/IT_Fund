"""Terraform for AWS lab: author real HCL and watch it become infrastructure.

Unlike terraform-fundamentals-001 (fixed scenario), here the student writes every
.tf file with `write <file> '<hcl>'`. The extended terraform_cli shell parses
resource/variable/output/provider/data/module/backend blocks out of the written
files and simulates init -> validate -> plan -> apply -> state/outputs against
them. Nothing is executed and nothing is provisioned.

Every objective teaches HCL thoroughly: the description shows the exact code to
write with line-by-line explanations of the syntax, not just the commands.

Validators are defined in this module via the shared @validator decorator, so
importing it registers them in VALIDATORS before registry.py checks objective
references. Validators read the student's written files (findings['tfa_files']),
not command history.
"""
from __future__ import annotations

import re

from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget
from labs.validators import validator


def _files(findings):
    return findings.get('tfa_files') or {}


def _all_hcl(findings):
    return '\n'.join(_files(findings).values())


def _has(pattern, findings):
    return bool(re.search(pattern, _all_hcl(findings)))


# ---------------------------------------------------------------------------
# validators (outcome-based: they read the student's written .tf files)
# ---------------------------------------------------------------------------

@validator("tfa_provider_configured")
def tfa_provider_configured(args, findings):
    hcl = _all_hcl(findings)
    missing = []
    if not re.search(r'provider\s+"aws"', hcl):
        missing.append('a provider "aws" block')
    if not re.search(r'required_providers', hcl):
        missing.append('a required_providers block pinning the AWS provider version')
    if not re.search(r'hashicorp/aws', hcl):
        missing.append('source = "hashicorp/aws" in required_providers')
    if not missing:
        return True, "AWS provider configured with a pinned version.", None
    return False, f"provider.tf still needs: {', '.join(missing)}.", None


@validator("tfa_vpc_defined")
def tfa_vpc_defined(args, findings):
    hcl = _all_hcl(findings)
    if not re.search(r'resource\s+"aws_vpc"', hcl):
        return False, 'No resource "aws_vpc" block found. Define the VPC first.', None
    subnets = len(re.findall(r'resource\s+"aws_subnet"', hcl))
    if subnets < 2:
        return False, f'Found {subnets} aws_subnet resource(s); define at least 2 (one per AZ).', None
    if not re.search(r'vpc_id\s*=\s*aws_vpc\.', hcl):
        return False, 'Subnets must reference the VPC: vpc_id = aws_vpc.<name>.id.', None
    return True, "VPC with 2 subnets defined and linked.", None


@validator("tfa_ec2_defined")
def tfa_ec2_defined(args, findings):
    hcl = _all_hcl(findings)
    if not re.search(r'resource\s+"aws_instance"', hcl):
        return False, 'No resource "aws_instance" block found.', None
    missing = []
    if not re.search(r'user_data', hcl):
        missing.append('user_data (bootstrap script)')
    if not re.search(r'resource\s+"aws_security_group"', hcl):
        missing.append('an aws_security_group for the instance')
    if not re.search(r'ami\s*=', hcl):
        missing.append('an ami argument')
    if missing:
        return False, f"EC2 definition still needs: {', '.join(missing)}.", None
    return True, "EC2 instance with user_data and security group defined.", None


@validator("tfa_variables_iam")
def tfa_variables_iam(args, findings):
    hcl = _all_hcl(findings)
    missing = []
    if not re.search(r'variable\s+"', hcl):
        missing.append('at least one variable block (e.g. variable "bucket_name")')
    if not re.search(r'resource\s+"aws_s3_bucket"', hcl):
        missing.append('a resource "aws_s3_bucket" block')
    if not re.search(r'resource\s+"aws_iam_role"', hcl):
        missing.append('a resource "aws_iam_role" block')
    if missing:
        return False, f"Still needed: {', '.join(missing)}.", None
    # variable must actually be referenced, otherwise it is decoration
    if not re.search(r'var\.', hcl):
        return False, 'You declared variables but never used var.<name> anywhere. Reference one.', None
    return True, "Variables declared and referenced; S3 bucket and IAM role defined.", None


@validator("tfa_rds_outputs")
def tfa_rds_outputs(args, findings):
    hcl = _all_hcl(findings)
    if not re.search(r'resource\s+"aws_db_instance"', hcl):
        return False, 'No resource "aws_db_instance" block found.', None
    outputs = len(re.findall(r'output\s+"', hcl))
    if outputs < 1:
        return False, 'No output blocks found. Expose at least one value (e.g. the DB endpoint).', None
    if not re.search(r'output\s+"[^"]+"\s*\{[^}]*value\s*=', hcl, re.S):
        return False, 'Output blocks need a value argument: output "name" { value = ... }.', None
    return True, "RDS instance defined and outputs exposing its attributes.", None


@validator("tfa_module_defined")
def tfa_module_defined(args, findings):
    hcl = _all_hcl(findings)
    m = re.search(r'module\s+"([^"]+)"\s*\{([^}]*)\}', hcl, re.S)
    if not m:
        return False, 'No module block found. Add: module "<name>" { source = "./modules/<name>" ... }.', None
    body = m.group(2)
    if 'source' not in body:
        return False, 'Module blocks require a source argument.', None
    return True, f'Module "{m.group(1)}" wired with a source.', None


@validator("tfa_backend_configured")
def tfa_backend_configured(args, findings):
    if not findings.get('tfa_backend_configured'):
        # also accept it purely from file content (student may not have re-run init)
        if not re.search(r'backend\s+"s3"', _all_hcl(findings)):
            return False, 'No backend "s3" block found. Add terraform { backend "s3" { ... } }.', None
    hcl = _all_hcl(findings)
    for arg in ('bucket', 'key', 'region'):
        if not re.search(rf'{arg}\s*=', hcl):
            return False, f'S3 backend needs a {arg} argument.', None
    return True, "Remote S3 backend configured for shared state.", None


@validator("tfa_workspace_used")
def tfa_workspace_used(args, findings):
    if not findings.get('tfa_workspace_created'):
        return False, 'Create a workspace first: terraform workspace new <name>.', None
    if not re.search(r'terraform\.workspace', _all_hcl(findings)):
        return False, 'Reference terraform.workspace in your HCL (e.g. lookup(var.map, terraform.workspace)).', None
    return True, f'Workspace "{findings.get("tfa_workspace")}" created and used in configuration.', None


@validator("tfa_data_source")
def tfa_data_source(args, findings):
    m = re.search(r'data\s+"([^"]+)"\s+"([^"]+)"', _all_hcl(findings))
    if not m:
        return False, 'No data block found. Add e.g. data "aws_ami" "ubuntu" { ... }.', None
    return True, f'Data source data.{m.group(1)}.{m.group(2)} reads existing infrastructure.', None


@validator("tfa_capstone")
def tfa_capstone(args, findings):
    hcl = _all_hcl(findings)
    missing = []
    for rtype, label in (
        ('aws_lb', 'an Application Load Balancer (aws_lb)'),
        ('aws_autoscaling_group', 'an Auto Scaling group (aws_autoscaling_group)'),
        ('aws_db_instance', 'an RDS database (aws_db_instance)'),
    ):
        if not re.search(rf'resource\s+"{rtype}"', hcl):
            missing.append(label)
    if missing:
        return False, f"Three-tier capstone still needs: {', '.join(missing)}.", None
    if not findings.get('tfa_applied'):
        return False, 'Configuration complete — now provision it: terraform apply.', None
    return True, "Three-tier architecture (ALB -> ASG -> RDS) defined and applied.", None


# ---------------------------------------------------------------------------
# lab definition
# ---------------------------------------------------------------------------

TERRAFORM_AWS_LAB = LabDefinition(
    id="terraform-aws-001",
    slug="terraform-aws",
    title="Terraform for AWS: Write Real HCL",
    description=(
        "Author production-style Terraform for AWS from scratch: provider setup, VPC and "
        "subnets, EC2 with user_data, variables with S3 and IAM, RDS with outputs, reusable "
        "modules, S3 remote state, workspaces, data sources, and a three-tier ALB/ASG/RDS "
        "capstone. Every step teaches the HCL syntax line by line — you write every file."
    ),
    category="devops",  # type: ignore[assignment]
    difficulty="intermediate",
    estimated_minutes=90,
    shell="terraform_cli",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/iac:latest",
        workdir="/home/student/aws-infra",
        idle_timeout_minutes=20,
        max_runtime_minutes=120,
        deny_internet_egress=True,
    ),
    targets=[LabTarget(hostname="aws-infra", role="Terraform working directory for AWS")],
    objectives=[
        LabObjective(
            id="provider-setup",
            label="Configure the AWS provider",
            validator="tfa_provider_configured",
            description=(
                "Write provider.tf. Every Terraform project starts by declaring WHICH provider "
                "plugin to use and pinning its version:\n\n"
                '  terraform {\n'
                '    required_version = ">= 1.5"          # the CLI version this code needs\n'
                '    required_providers {\n'
                '      aws = {\n'
                '        source  = "hashicorp/aws"       # registry address of the plugin\n'
                '        version = "~> 5.0"              # ~> 5.0 means >= 5.0, < 6.0 (safe upgrades)\n'
                '      }\n'
                '    }\n'
                '  }\n\n'
                '  provider "aws" {\n'
                '    region = "us-east-1"                # every resource inherits this region\n'
                '  }\n\n'
                "HOW IT WORKS: the `terraform {}` block is meta-configuration — it configures "
                "Terraform itself, not cloud resources. `required_providers` maps the local name "
                "`aws` to the real plugin `hashicorp/aws` so `terraform init` knows what to "
                "download. The `provider \"aws\"` block configures that plugin (region, and in "
                "real life, credentials). Version pinning (`~> 5.0`) prevents a future major "
                "release from silently breaking your code.\n\n"
                "Write it with: write provider.tf '<the HCL above>' — then run terraform init "
                "to download the provider and terraform validate to check the syntax."
            ),
            hints=[
                "write provider.tf '...' — paste the HCL from the description between the quotes.",
                "terraform init downloads the AWS provider; terraform validate checks your syntax.",
                "The validator wants: provider \"aws\", required_providers, and hashicorp/aws.",
            ],
        ),
        LabObjective(
            id="vpc-subnets",
            label="Define the VPC and subnets (main.tf)",
            validator="tfa_vpc_defined",
            description=(
                "Write main.tf with the network foundation. A `resource` block is HCL's core "
                "unit — `resource \"<TYPE>\" \"<NAME>\" { ... }` where TYPE is the provider's "
                "resource type and NAME is YOUR label for it (used only inside Terraform):\n\n"
                '  resource "aws_vpc" "main" {\n'
                '    cidr_block           = "10.0.0.0/16"   # 65,536 addresses for the whole VPC\n'
                '    enable_dns_hostnames = true           # EC2 instances get DNS names\n'
                '    tags = { Name = "lab-vpc" }           # tags is a MAP argument\n'
                '  }\n\n'
                '  resource "aws_subnet" "public_a" {\n'
                '    vpc_id                  = aws_vpc.main.id   # REFERENCE: <TYPE>.<NAME>.<ATTR>\n'
                '    cidr_block              = "10.0.1.0/24"     # a /24 slice of the VPC\n'
                '    availability_zone       = "us-east-1a"      # pin to one AZ\n'
                '    map_public_ip_on_launch = true\n'
                '    tags = { Name = "lab-public-a" }\n'
                '  }\n\n'
                '  resource "aws_subnet" "public_b" {\n'
                '    vpc_id            = aws_vpc.main.id\n'
                '    cidr_block        = "10.0.2.0/24"\n'
                '    availability_zone = "us-east-1b"           # second AZ = resilience\n'
                '    tags = { Name = "lab-public-b" }\n'
                '  }\n\n'
                "HOW IT WORKS: `aws_vpc.main.id` is a REFERENCE — Terraform reads the VPC's ID "
                "attribute and wires it into the subnet. References also build the DEPENDENCY "
                "GRAPH: Terraform knows the VPC must exist before the subnets, so it creates "
                "them in order automatically. `tags = { ... }` is a map (key = value pairs); "
                "`cidr_block = \"...\"` is a plain string argument. CIDR math: 10.0.0.0/16 gives "
                "10.0.x.x; each /24 subnet gives 256 addresses (10.0.1.0–10.0.1.255).\n\n"
                "Write main.tf with the blocks above, then terraform validate."
            ),
            hints=[
                "Two subnets in DIFFERENT AZs (us-east-1a and us-east-1b) — that is the point.",
                "vpc_id = aws_vpc.main.id — the reference is what links them.",
                "terraform validate after writing; fix any brace errors it reports.",
            ],
        ),
        LabObjective(
            id="ec2-userdata",
            label="Add EC2 with user_data and a security group",
            validator="tfa_ec2_defined",
            description=(
                "Append compute to main.tf. `user_data` bootstraps the instance with a shell "
                "script using a HEREDOC — HCL's multi-line string syntax:\n\n"
                '  resource "aws_security_group" "web" {\n'
                '    name   = "web-sg"\n'
                '    vpc_id = aws_vpc.main.id\n\n'
                '    ingress {                              # NESTED BLOCK (repeatable)\n'
                '      description = "HTTP"\n'
                '      from_port   = 80\n'
                '      to_port     = 80\n'
                '      protocol    = "tcp"\n'
                '      cidr_blocks = ["0.0.0.0/0"]          # LIST of strings\n'
                '    }\n'
                '    egress {\n'
                '      from_port   = 0\n'
                '      to_port     = 0\n'
                '      protocol    = "-1"                   # -1 = all protocols\n'
                '      cidr_blocks = ["0.0.0.0/0"]\n'
                '    }\n'
                '  }\n\n'
                '  resource "aws_instance" "web" {\n'
                '    ami                    = "ami-0abcdef1234567890"\n'
                '    instance_type          = "t3.micro"\n'
                '    subnet_id              = aws_subnet.public_a.id\n'
                '    vpc_security_group_ids = [aws_security_group.web.id]  # LIST of references\n'
                '    user_data = <<-EOF\n'
                '      #!/bin/bash\n'
                '      yum install -y httpd\n'
                '      systemctl start httpd\n'
                '      EOF\n'
                '    tags = { Name = "lab-web" }\n'
                '  }\n\n'
                "HOW IT WORKS: `ingress { }` is a NESTED BLOCK — unlike arguments, blocks can "
                "repeat (two ingress rules = two blocks). `<<-EOF ... EOF` is a heredoc: "
                "everything between the markers becomes one string (the `-` strips leading tabs). "
                "The instance's user_data runs ONCE at first boot. "
                "`vpc_security_group_ids = [...]` shows a list containing a reference — "
                "Terraform resolves it to the real security group ID at apply time."
            ),
            hints=[
                "Append to main.tf — use write main.tf with the FULL file (old + new blocks).",
                "cat main.tf first to see what you already wrote, then include it all.",
                "user_data with a <<-EOF heredoc installing httpd is the key piece.",
            ],
        ),
        LabObjective(
            id="variables-s3-iam",
            label="Variables, S3, and IAM (variables.tf)",
            validator="tfa_variables_iam",
            description=(
                "Hardcoded values don't scale — parameterize with variables.tf, then add "
                "storage and identity:\n\n"
                '  variable "bucket_name" {\n'
                '    description = "Name for the app S3 bucket"\n'
                '    type        = string                 # string | number | bool | list(...) | map(...)\n'
                '    default     = "lab-app-bucket-001"   # used unless overridden\n'
                '  }\n\n'
                '  variable "environment" {\n'
                '    description = "Deployment environment"\n'
                '    type        = string\n'
                '    default     = "dev"\n'
                '    validation {\n'
                '      condition     = contains(["dev", "staging", "prod"], var.environment)\n'
                '      error_message = "Must be dev, staging, or prod."\n'
                '    }\n'
                '  }\n\n'
                '  resource "aws_s3_bucket" "app" {\n'
                '    bucket = var.bucket_name            # var.<NAME> reads the variable\n'
                '    tags   = { Environment = var.environment }\n'
                '  }\n\n'
                '  resource "aws_iam_role" "app" {\n'
                '    name = "lab-app-role"\n'
                '    assume_role_policy = jsonencode({   # jsonencode() turns HCL into JSON\n'
                '      Version = "2012-10-17"\n'
                '      Statement = [{\n'
                '        Action    = "sts:AssumeRole"\n'
                '        Effect    = "Allow"\n'
                '        Principal = { Service = "ec2.amazonaws.com" }\n'
                '      }]\n'
                '    })\n'
                '  }\n\n'
                "HOW IT WORKS: `variable` blocks DECLARE inputs; `var.bucket_name` READS them. "
                "Precedence when you run plan/apply: `-var` flag > `TF_VAR_` env var > "
                "`terraform.tfvars` file > `default`. The `validation` block rejects bad values "
                "BEFORE anything is created — fail fast. `jsonencode()` is a Terraform FUNCTION "
                "converting HCL maps/lists into the JSON string IAM expects (writing raw JSON "
                "in HCL is error-prone; jsonencode keeps it native)."
            ),
            hints=[
                "write variables.tf with the two variable blocks above.",
                "Then add the S3 bucket and IAM role to main.tf — reference var.bucket_name.",
                "Try overriding: terraform plan -var='bucket_name=my-test-bucket'.",
            ],
        ),
        LabObjective(
            id="rds-outputs",
            label="RDS database and outputs (outputs.tf)",
            validator="tfa_rds_outputs",
            description=(
                "Add a managed database, then EXPOSE useful values with outputs.tf:\n\n"
                '  resource "aws_db_subnet_group" "main" {\n'
                '    name       = "lab-db-subnets"\n'
                '    subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]\n'
                '    # RDS needs subnets in 2+ AZs — we built exactly that in objective 2\n'
                '  }\n\n'
                '  resource "aws_db_instance" "main" {\n'
                '    identifier             = "lab-db"\n'
                '    engine                 = "postgres"\n'
                '    engine_version         = "15.4"\n'
                '    instance_class         = "db.t3.micro"\n'
                '    allocated_storage      = 20              # GB\n'
                '    db_name                = "labdb"\n'
                '    username               = "admin"\n'
                '    password               = "ChangeMe123!"  # demo only — use secrets in reality\n'
                '    db_subnet_group_name   = aws_db_subnet_group.main.name\n'
                '    multi_az               = true            # standby in the other AZ\n'
                '    skip_final_snapshot    = true            # lab convenience\n'
                '  }\n\n'
                "And outputs.tf — outputs are Terraform's RETURN VALUES:\n\n"
                '  output "db_endpoint" {\n'
                '    description = "Connection endpoint for the database"\n'
                '    value       = aws_db_instance.main.endpoint   # computed AFTER apply\n'
                '  }\n\n'
                '  output "vpc_id" {\n'
                '    description = "ID of the lab VPC"\n'
                '    value       = aws_vpc.main.id\n'
                '  }\n\n'
                '  output "db_password" {\n'
                '    description = "Database password"\n'
                '    value       = aws_db_instance.main.password\n'
                '    sensitive   = true              # hidden from CLI output, still in state!\n'
                '  }\n\n'
                "HOW IT WORKS: `output` blocks publish values after apply — other configs, "
                "scripts, or humans read them via `terraform output`. `value` can be any "
                "expression, usually a resource attribute like `.endpoint` that only exists "
                "after creation. `sensitive = true` redacts the value from console output "
                "(but it is STILL in the state file in plaintext — hence remote state + "
                "encryption, next objectives)."
            ),
            hints=[
                "Append the RDS resources to main.tf; write outputs.tf with the three outputs.",
                "terraform validate, then terraform plan — watch the DB appear in the plan.",
                "Note how db_subnet_group reuses the two subnets from objective 2.",
            ],
        ),
        LabObjective(
            id="modules",
            label="Refactor the network into a module",
            validator="tfa_module_defined",
            description=(
                "Copy-paste doesn't scale — MODULES package reusable infrastructure. A module "
                "is just a directory with .tf files; you CALL it with a `module` block:\n\n"
                "  # modules/vpc/main.tf  (the REUSABLE unit — write with write modules-vpc.tf\n"
                "  # in this lab, or just reference the pattern)\n"
                '  variable "vpc_cidr" { type = string }\n'
                '  variable "azs"      { type = list(string) }\n\n'
                '  resource "aws_vpc" "this" {\n'
                '    cidr_block = var.vpc_cidr\n'
                '    tags = { Name = "modular-vpc" }\n'
                '  }\n\n'
                '  output "vpc_id" { value = aws_vpc.this.id }   # module EXPOSES this\n\n'
                "  # ---- calling it from your root config ----\n"
                '  module "network" {\n'
                '    source   = "./modules/vpc"     # local path (or git URL / registry)\n'
                '    vpc_cidr = "10.1.0.0/16"      # INPUTS: assigned like arguments\n'
                '    azs      = ["us-east-1a", "us-east-1b"]\n'
                '  }\n\n'
                '  resource "aws_instance" "web2" {\n'
                '    ami           = "ami-0abcdef1234567890"\n'
                '    instance_type = "t3.micro"\n'
                '    subnet_id     = "subnet-12345"   # in real code: module.network.subnet_ids[0]\n'
                '  }\n\n'
                "HOW IT WORKS: inside a module, `variable` blocks become INPUTS the caller "
                "must provide; `output` blocks become values the caller reads as "
                "`module.<NAME>.<OUTPUT>`. `source` can be a local path (`./modules/vpc`), a "
                "git URL (`git::https://...//modules/vpc?ref=v1.2.0` — PIN the ref!), or a "
                "public registry address (`terraform-aws-modules/vpc/aws`). Modules are how "
                "teams standardize: one reviewed VPC module, used by fifty services.\n\n"
                "For this lab, add a module block calling ./modules/vpc to main.tf (the "
                "simulated shell accepts the pattern; in real life you'd create the "
                "modules/vpc/ directory too)."
            ),
            hints=[
                'Add: module "network" { source = "./modules/vpc" ... } with vpc_cidr and azs inputs.',
                "Module inputs are assigned exactly like resource arguments.",
                "terraform validate to confirm the module block parses.",
            ],
        ),
        LabObjective(
            id="remote-state",
            label="Configure S3 remote state",
            validator="tfa_backend_configured",
            description=(
                "Local terraform.tfstate doesn't survive laptops or teams — BACKENDS store "
                "state remotely. Add to provider.tf (or a backend.tf):\n\n"
                "  terraform {\n"
                '    required_version = ">= 1.5"\n'
                "    # ... required_providers stays ...\n"
                '    backend "s3" {\n'
                '      bucket         = "lab-terraform-state-001"  # must already exist\n'
                '      key            = "lab/aws-infra.tfstate"    # path INSIDE the bucket\n'
                '      region         = "us-east-1"\n'
                '      dynamodb_table = "lab-tf-locks"              # STATE LOCKING table\n'
                '      encrypt        = true                       # SSE for the state file\n'
                '    }\n'
                "  }\n\n"
                "HOW IT WORKS: `backend \"s3\"` tells Terraform: don't write terraform.tfstate "
                "locally — PUT it at s3://bucket/key instead. `key` is just an object path, so "
                "teams use one bucket with many keys (one per project/environment). "
                "`dynamodb_table` enables STATE LOCKING: before any plan/apply, Terraform "
                "writes a lock row; if a teammate runs apply simultaneously, they get "
                "\"Error: state locked\" instead of corrupting state. `encrypt = true` turns on "
                "server-side encryption — critical because state contains secrets in plaintext "
                "(remember `sensitive` only hides console output!). Run terraform init again "
                "after adding a backend — init is what configures it."
            ),
            hints=[
                'Add the backend "s3" block inside the terraform {} block in provider.tf.',
                "bucket, key, region, dynamodb_table, encrypt — all five.",
                "Run terraform init again — backends are initialized, not just validated.",
            ],
        ),
        LabObjective(
            id="workspaces",
            label="Isolate environments with workspaces",
            validator="tfa_workspace_used",
            description=(
                "One config, many environments: WORKSPACES give each environment its own state "
                "file. First create one, then make your HCL ENVIRONMENT-AWARE:\n\n"
                "  # in variables.tf\n"
                '  variable "instance_types" {\n'
                '    description = "Instance type per environment"\n'
                '    type        = map(string)                 # MAP: keys -> values\n'
                '    default = {\n'
                '      dev     = "t3.micro"\n'
                '      staging = "t3.small"\n'
                '      prod    = "t3.medium"\n'
                '    }\n'
                '  }\n\n'
                "  # in main.tf — pick the value for THIS workspace\n"
                '  resource "aws_instance" "web_ws" {\n'
                '    ami           = "ami-0abcdef1234567890"\n'
                '    instance_type = lookup(var.instance_types, terraform.workspace, "t3.micro")\n'
                '    tags = { Environment = terraform.workspace }\n'
                '  }\n\n'
                "HOW IT WORKS: `terraform.workspace` is a built-in variable holding the current "
                "workspace name (\"default\" until you create others). `lookup(map, key, default)` "
                "returns `map[key]` or the fallback — so the SAME config provisions t3.micro in "
                "dev and t3.medium in prod, with SEPARATE state files per workspace (with the S3 "
                "backend: s3://bucket/lab/aws-infra.tfstate becomes "
                "s3://bucket/lab/env:/prod/aws-infra.tfstate). Commands: `terraform workspace "
                "new prod`, `terraform workspace list`, `terraform workspace select dev`.\n\n"
                "Do: terraform workspace new prod — then add the lookup() line to main.tf."
            ),
            hints=[
                "terraform workspace new prod — then reference terraform.workspace in main.tf.",
                "lookup(var.instance_types, terraform.workspace, \"t3.micro\") is the pattern.",
                "Tags with Environment = terraform.workspace make resources self-labeling.",
            ],
        ),
        LabObjective(
            id="data-sources",
            label="Read existing infrastructure with data sources",
            validator="tfa_data_source",
            description=(
                "Not everything is managed by YOU — DATA SOURCES read infrastructure that "
                "already exists (or that another config manages). Resources CREATE; data "
                "sources QUERY:\n\n"
                '  data "aws_ami" "ubuntu" {           # find the newest Ubuntu AMI\n'
                '    most_recent = true\n'
                '    owners      = ["099720109477"]     # Canonical (Ubuntu publisher)\n'
                '    filter {\n'
                '      name   = "name"\n'
                '      values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-*"]\n'
                '    }\n'
                '  }\n\n'
                '  data "aws_availability_zones" "available" {\n'
                '    state = "available"                # no filter needed — just list them\n'
                '  }\n\n'
                '  resource "aws_instance" "data_driven" {\n'
                '    ami                    = data.aws_ami.ubuntu.id   # data.<TYPE>.<NAME>.<ATTR>\n'
                '    instance_type          = "t3.micro"\n'
                '    availability_zone      = data.aws_availability_zones.available.names[0]\n'
                '  }\n\n'
                "HOW IT WORKS: `data \"aws_ami\" \"ubuntu\"` doesn't CREATE an AMI — at plan "
                "time Terraform QUERIES the AWS API and exposes the result as "
                "`data.aws_ami.ubuntu.id`. This kills hardcoded AMI IDs (which rot as images "
                "are deprecated). Same pattern everywhere: `data \"aws_vpc\" \"existing\"`, "
                "`data \"aws_secretsmanager_secret_version\"` for passwords (never hardcode "
                "them like objective 5's demo did!), `data \"terraform_remote_state\"` to read "
                "another config's outputs. Rule of thumb: if Terraform shouldn't own its "
                "lifecycle, use data."
            ),
            hints=[
                'Add a data "aws_ami" block and reference data.aws_ami.ubuntu.id in an instance.',
                "data.<TYPE>.<NAME>.<ATTR> — same reference syntax as resources, with data. prefix.",
                "terraform plan will show the data source being READ before resources.",
            ],
        ),
        LabObjective(
            id="capstone",
            label="Capstone: three-tier architecture (ALB -> ASG -> RDS)",
            validator="tfa_capstone",
            description=(
                "Assemble everything into a production-shaped three tier. The load balancer "
                "receives traffic, the Auto Scaling group runs the app tier, RDS holds data:\n\n"
                '  resource "aws_lb" "app" {\n'
                '    name               = "lab-alb"\n'
                '    load_balancer_type = "application"          # ALB = Layer 7 (HTTP)\n'
                '    subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]\n'
                '    security_groups    = [aws_security_group.web.id]\n'
                '  }\n\n'
                '  resource "aws_lb_target_group" "app" {\n'
                '    port     = 80\n'
                '    protocol = "HTTP"\n'
                '    vpc_id   = aws_vpc.main.id\n'
                '    health_check { path = "/"  matcher = "200" }  # ALB health probes\n'
                '  }\n\n'
                '  resource "aws_launch_template" "app" {\n'
                '    image_id      = data.aws_ami.ubuntu.id      # from objective 9!\n'
                '    instance_type = lookup(var.instance_types, terraform.workspace, "t3.micro")\n'
                '    user_data     = base64encode(<<-EOF\n'
                '      #!/bin/bash\n'
                '      apt-get update && apt-get install -y nginx\n'
                '      EOF\n'
                '    )\n'
                '  }\n\n'
                '  resource "aws_autoscaling_group" "app" {\n'
                '    desired_capacity    = 2\n'
                '    min_size            = 2\n'
                '    max_size            = 4\n'
                '    vpc_zone_identifier = [aws_subnet.public_a.id, aws_subnet.public_b.id]\n'
                '    launch_template {\n'
                '      id      = aws_launch_template.app.id\n'
                '      version = "$Latest"\n'
                '    }\n'
                '    target_group_arns = [aws_lb_target_group.app.arn]\n'
                '  }\n\n'
                "HOW IT ALL FITS: clients hit the ALB (spread across both AZ subnets from "
                "objective 2). The ALB forwards to the target group, whose health checks "
                "decide which instances get traffic. The ASG keeps 2–4 instances running "
                "from the launch template (which bakes in our data-source AMI and "
                "workspace-aware instance type). RDS (objective 5) is the data tier. "
                "EVERY technique in this lab appears: references wire the tiers together, "
                "variables parameterize, outputs would expose the ALB DNS name, the S3 "
                "backend holds state, workspaces isolate prod.\n\n"
                "Add the four blocks above to main.tf, run terraform validate, then "
                "terraform apply -auto-approve to provision the full stack."
            ),
            hints=[
                "You need: aws_lb, aws_lb_target_group, aws_launch_template, aws_autoscaling_group.",
                "RDS from objective 5 completes the data tier — keep it.",
                "terraform validate first, then terraform apply -auto-approve.",
            ],
        ),
    ],
)
