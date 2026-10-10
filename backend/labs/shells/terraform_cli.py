"""A simulated Terraform CLI for the Terraform fundamentals (IaC workflow) lab.

Models the complete core workflow deterministically: init -> validate/fmt -> plan (-out) ->
apply (with confirmation flow / -auto-approve) -> state/outputs/show inspection ->
variables (-var, terraform.tfvars, TF_VAR_ env) -> workspaces -> destroy. State is derived
from the findings already recorded, so no separate store is needed. Executes nothing and
provisions no cloud.

The scenario is a realistic webapp stack (VPC, 2 subnets, security group, EC2, S3 + versioning
= 7 resources) with one intentional misconfiguration: the security group allows SSH from
0.0.0.0/0. The student fixes it with `edit main.tf`, previews with `terraform plan`, and
deploys with `terraform apply`.

This is a separate shell from `labs/shells/terraform.py` (used by cloud-terraform-001):
that shell is tailored to a 3-resource cloud-security scan scenario, while this one models
the full CLI workflow surface for the fundamentals track.
"""
from __future__ import annotations

import shlex
from typing import Any

from labs.providers.base import CommandResult

MAIN_TF = """terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# --- Networking ---
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true

  tags = {
    Name = "road2cissp-vpc"
  }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "road2cissp-public-a"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true

  tags = {
    Name = "road2cissp-public-b"
  }
}

# --- Security ---
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Allow web traffic and admin access"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]   # <-- REVIEW: SSH open to the world
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- Compute ---
resource "aws_instance" "web" {
  ami                    = "ami-0abcd1234ef567890"
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name = "road2cissp-web"
  }
}

# --- Storage ---
resource "aws_s3_bucket" "logs" {
  bucket = "road2cissp-app-logs"
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id

  versioning_configuration {
    status = "Enabled"
  }
}
"""

VARIABLES_TF = """variable "region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type for the web server"
  type        = string
  default     = "t3.micro"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}
"""

TERRAFORM_TFVARS = """# Override variable defaults without touching the .tf files.
# Loaded automatically on plan/apply. Explicit -var flags and TF_VAR_
# environment variables take precedence over these values.
instance_type = "t3.small"
"""

OUTPUTS_TF = """output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "web_public_ip" {
  description = "Public IP of the web server"
  value       = aws_instance.web.public_ip
}

output "logs_bucket" {
  description = "Name of the logs bucket"
  value       = aws_s3_bucket.logs.bucket
}
"""

RESOURCES = [
    'aws_vpc.main',
    'aws_subnet.public_a',
    'aws_subnet.public_b',
    'aws_security_group.web',
    'aws_instance.web',
    'aws_s3_bucket.logs',
    'aws_s3_bucket_versioning.logs',
]

# Deterministic simulated IDs / output values.
RESOURCE_IDS = {
    'aws_vpc.main': 'vpc-0a1b2c3d4e5f60718',
    'aws_subnet.public_a': 'subnet-0a1b2c3d4e5f60718',
    'aws_subnet.public_b': 'subnet-1b2c3d4e5f6071829',
    'aws_security_group.web': 'sg-0a1b2c3d4e5f60718',
    'aws_instance.web': 'i-0abc123def456789',
    'aws_s3_bucket.logs': 'road2cissp-app-logs',
    'aws_s3_bucket_versioning.logs': 'road2cissp-app-logs',
}

OUTPUTS = {
    'vpc_id': 'vpc-0a1b2c3d4e5f60718',
    'web_public_ip': '54.210.11.9',
    'logs_bucket': 'road2cissp-app-logs',
}

SSH_OPEN_CIDR = '0.0.0.0/0'
SSH_FIXED_CIDR = '10.0.0.0/8'


def initial_prompt(lab) -> str:
    return 'student@iac:~/infra$ '


def banner(lab) -> list[str]:
    return [
        'Road to CISSP - Terraform fundamentals lab   (simulated: nothing is really provisioned)',
        'Master the core IaC workflow: init -> validate -> plan -> apply -> inspect -> configure -> destroy.',
        'A realistic webapp stack (VPC, subnets, security group, EC2, S3) is in this directory.',
        'One security group rule is wrong: find it, fix it with `edit main.tf`, then tear it all down.',
        'Try: cat main.tf · terraform init · terraform validate · terraform plan -out=tfplan',
    ]


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _need_init() -> CommandResult:
    return CommandResult(
        output='Error: Initialization required. Please run "terraform init" first.',
        exit_code=1,
    )


def _need_apply() -> CommandResult:
    return CommandResult(
        output='Error: No state. Run "terraform apply" before inspecting state.',
        exit_code=1,
    )


def _parse(raw: str) -> list[str]:
    try:
        return shlex.split(raw)
    except ValueError:
        return raw.split()


def _extract_vars(args: list[str]) -> tuple[dict[str, str], list[str]]:
    """Pull -var key=value pairs out of an arg list. Returns (vars, remaining)."""
    variables: dict[str, str] = {}
    remaining: list[str] = []
    i = 0
    while i < len(args):
        a = args[i]
        if a.startswith('-var='):
            k, _, v = a[5:].partition('=')
            if k.strip():
                variables[k.strip()] = v.strip()
        elif a == '-var' and i + 1 < len(args):
            k, _, v = args[i + 1].partition('=')
            if k.strip():
                variables[k.strip()] = v.strip()
            i += 1
        else:
            remaining.append(a)
        i += 1
    return variables, remaining


def _has_flag(args: list[str], *names: str) -> bool:
    return any(a in names for a in args)


def _instance_type(findings: dict[str, Any], cli_vars: dict[str, str]) -> tuple[str, str | None]:
    """Resolve instance_type by precedence: -var > TF_VAR_ > terraform.tfvars > default."""
    if 'instance_type' in cli_vars:
        return cli_vars['instance_type'], '-var'
    env_vars = findings.get('variables_set') or {}
    if 'instance_type' in env_vars:
        return env_vars['instance_type'], 'TF_VAR_'
    return 't3.small', 'terraform.tfvars'


def _plan_body(findings: dict[str, Any], cli_vars: dict[str, str], for_change: bool = False) -> str:
    """Render the resource-action section of a plan."""
    itype, itype_src = _instance_type(findings, cli_vars)
    if for_change:
        return (
            '  # aws_security_group.web will be updated in-place\n'
            '  ~ resource "aws_security_group" "web" {\n'
            f'        id       = "{RESOURCE_IDS["aws_security_group.web"]}"\n'
            '      ~ ingress  = [\n'
            '          ~ {\n'
            '              ~ cidr_blocks = [\n'
            f'                  - "{SSH_OPEN_CIDR}",\n'
            f'                  + "{SSH_FIXED_CIDR}",\n'
            '                ]\n'
            '                # (4 unchanged attributes hidden)\n'
            '            },\n'
            '        ]\n'
            '      # (1 unchanged block hidden)\n'
            '    }\n'
        )
    lines = []
    for r in RESOURCES:
        rtype, rname = r.split('.', 1)
        lines.append(f'  # {r} will be created')
        lines.append(f'  + resource "{rtype}" "{rname}" {{')
        if r == 'aws_vpc.main':
            lines.append('      + cidr_block           = "10.0.0.0/16"')
            lines.append('      + enable_dns_hostnames = true')
        elif r.startswith('aws_subnet'):
            az = 'us-east-1a' if r.endswith('public_a') else 'us-east-1b'
            cidr = '10.0.1.0/24' if r.endswith('public_a') else '10.0.2.0/24'
            lines.append(f'      + availability_zone       = "{az}"')
            lines.append(f'      + cidr_block              = "{cidr}"')
        elif r == 'aws_security_group.web':
            lines.append('      + description = "Allow web traffic and admin access"')
            lines.append('      + ingress     = (2 rules: HTTP 80, SSH 22)')
        elif r == 'aws_instance.web':
            lines.append(f'      + instance_type = "{itype}"')
        elif r == 'aws_s3_bucket.logs':
            lines.append('      + bucket = "road2cissp-app-logs"')
        elif r == 'aws_s3_bucket_versioning.logs':
            lines.append('      + versioning_configuration = [{ status = "Enabled" }]')
        lines.append('    }')
        lines.append('')
    return '\n'.join(lines)


def _plan_output(findings: dict[str, Any], cli_vars: dict[str, str], out_file: str | None) -> tuple[str, dict[str, Any]]:
    """Build plan output + findings for a create plan."""
    applied = findings.get('applied') and not findings.get('destroyed')
    fixed = findings.get('misconfiguration_fixed')
    fix_deployed = findings.get('fix_deployed')

    if applied and fixed and not fix_deployed:
        body = _plan_body(findings, cli_vars, for_change=True)
        summary = 'Plan: 0 to add, 1 to change, 0 to destroy.'
    elif applied:
        no_change_findings: dict[str, Any] = {'plan_done': True}
        if cli_vars:
            merged = dict(findings.get('variables_set') or {})
            merged.update(cli_vars)
            no_change_findings['variables_set'] = merged
        return (
            'No changes. Your infrastructure matches the configuration.\n\n'
            'Terraform has compared your real infrastructure against your configuration and found no differences, '
            'so no actions are needed.',
            no_change_findings,
        )
    else:
        body = _plan_body(findings, cli_vars)
        summary = f'Plan: {len(RESOURCES)} to add, 0 to change, 0 to destroy.'

    head = (
        'Terraform used the selected providers to generate the following execution plan. Resource\n'
        'actions are indicated with the following symbols:\n'
        '  + create\n'
        '  ~ update in-place\n\n'
        'Terraform will perform the following actions:\n\n'
    )
    notes = []
    if not fixed and not applied:
        notes.append(
            f'Note: aws_security_group.web allows SSH (port 22) from {SSH_OPEN_CIDR}. '
            'Review security group rules before applying.'
        )
    if out_file:
        notes.append(f'\nSaved the plan to: {out_file}\n\nTo perform exactly these actions, run: "terraform apply \\"{out_file}\\""')
    new_findings: dict[str, Any] = {'plan_done': True}
    if out_file:
        new_findings['plan_saved'] = out_file
    if cli_vars:
        merged = dict(findings.get('variables_set') or {})
        merged.update(cli_vars)
        new_findings['variables_set'] = merged
    out = head + body + '\n' + summary
    if notes:
        out += '\n\n' + '\n'.join(notes)
    return out, new_findings


def _do_apply(findings: dict[str, Any], cli_vars: dict[str, str], via_plan: str | None) -> CommandResult:
    itype, itype_src = _instance_type(findings, cli_vars)
    lines = []
    for r in RESOURCES:
        lines.append(f'{r}: Creating...')
    lines.append('')
    for r in RESOURCES:
        lines.append(f'{r}: Creation complete after 4s [id={RESOURCE_IDS[r]}]')
    lines.append('')
    fixed = findings.get('misconfiguration_fixed')
    if fixed and findings.get('applied'):
        summary = f'Apply complete! Resources: 0 added, 1 changed, 0 destroyed.'
    else:
        summary = f'Apply complete! Resources: {len(RESOURCES)} added, 0 changed, 0 destroyed.'
    lines.append(summary)
    lines.append('')
    lines.append('Outputs:')
    lines.append('')
    for k in sorted(OUTPUTS):
        lines.append(f'{k} = "{OUTPUTS[k]}"')
    if via_plan:
        lines.insert(0, f'Applying saved plan "{via_plan}"...\n')
    new_findings: dict[str, Any] = {
        'applied': True,
        'ever_applied': True,
        'destroyed': False,
        'applied_resources': list(RESOURCES),
        'pending_apply': False,
        'plan_done': True,
    }
    if fixed:
        new_findings['fix_deployed'] = True
    if cli_vars:
        merged = dict(findings.get('variables_set') or {})
        merged.update(cli_vars)
        new_findings['variables_set'] = merged
    # instance_type actually used (for test introspection)
    new_findings['applied_instance_type'] = itype
    new_findings['applied_instance_type_source'] = itype_src
    return CommandResult(output='\n'.join(lines), findings=new_findings)


def _do_destroy(findings: dict[str, Any]) -> CommandResult:
    lines = []
    for r in reversed(RESOURCES):
        lines.append(f'{r}: Destroying... [id={RESOURCE_IDS[r]}]')
    lines.append('')
    for r in reversed(RESOURCES):
        lines.append(f'{r}: Destruction complete after 2s')
    lines.append('')
    lines.append(f'Destroy complete! Resources: {len(RESOURCES)} destroyed.')
    return CommandResult(output='\n'.join(lines), findings={
        'destroyed': True,
        'applied': False,
        'applied_resources': [],
        'pending_destroy': False,
    })


# ---------------------------------------------------------------------------
# command implementations
# ---------------------------------------------------------------------------

def _cmd_init(findings: dict[str, Any]) -> CommandResult:
    out = (
        'Initializing the backend...\n'
        'Initializing provider plugins...\n'
        '- Finding hashicorp/aws versions matching "~> 5.0"...\n'
        '- Installing hashicorp/aws v5.31.0...\n'
        '- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)\n\n'
        'Terraform has been successfully initialized!'
    )
    return CommandResult(output=out, findings={'init_done': True})


def _cmd_validate(findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    return CommandResult(output='Success! The configuration is valid.', findings={'validated': True})


def _cmd_fmt(args: list[str]) -> CommandResult:
    files = ['main.tf', 'outputs.tf', 'variables.tf']
    if _has_flag(args, '-check'):
        return CommandResult(output='')
    if _has_flag(args, '-diff'):
        return CommandResult(output='No formatting differences.')
    return CommandResult(output='\n'.join(files), findings={'formatted': True})


def _cmd_version() -> CommandResult:
    return CommandResult(output='Terraform v1.9.0\non linux_amd64')


def _cmd_plan(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    cli_vars, rest = _extract_vars(args)
    out_file = None
    for a in rest:
        if a.startswith('-out='):
            out_file = a[5:]
        elif a == '-out' :
            out_file = 'tfplan'
    # support bare `-out tfplan` form
    for i, a in enumerate(rest):
        if a == '-out' and i + 1 < len(rest) and not rest[i + 1].startswith('-'):
            out_file = rest[i + 1]
    out, new_findings = _plan_output(findings, cli_vars, out_file)
    return CommandResult(output=out, findings=new_findings)


def _cmd_apply(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    cli_vars, rest = _extract_vars(args)
    auto = _has_flag(args, '-auto-approve')
    plan_file = next((a for a in rest if not a.startswith('-')), None)

    if plan_file:
        saved = findings.get('plan_saved')
        if saved and plan_file == saved:
            return _do_apply(findings, cli_vars, via_plan=plan_file)
        return CommandResult(
            output=f'Error: Failed to read plan file "{plan_file}": no such saved plan. Run "terraform plan -out={plan_file}" first.',
            exit_code=1,
        )
    if auto:
        return _do_apply(findings, cli_vars, via_plan=None)
    # interactive confirmation flow
    out, plan_findings = _plan_output(findings, cli_vars, None)
    out += '\n\nDo you want to perform these actions?\n  Terraform will perform the actions described above.\n  Only \'yes\' will be accepted to approve.\n\n  Enter a value: '
    plan_findings['pending_apply'] = True
    if cli_vars:
        plan_findings['pending_cli_vars'] = cli_vars
    return CommandResult(output=out, findings=plan_findings)


def _cmd_destroy(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not findings.get('applied'):
        return _need_apply()
    if _has_flag(args, '-auto-approve'):
        return _do_destroy(findings)
    body = '\n'.join(f'  - {r}' for r in RESOURCES)
    out = (
        'Terraform will perform the following actions:\n\n'
        f'{body}\n\n'
        f'Plan: 0 to add, 0 to change, {len(RESOURCES)} to destroy.\n\n'
        'Do you really want to destroy all resources?\n'
        '  Terraform will destroy all your managed infrastructure, as shown above.\n'
        '  There is no undo. Only \'yes\' will be accepted to confirm.\n\n'
        '  Enter a value: '
    )
    return CommandResult(output=out, findings={'pending_destroy': True})


def _cmd_show(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if args and not args[0].startswith('-'):
        plan_file = args[0]
        if findings.get('plan_saved') == plan_file:
            out, _ = _plan_output(findings, {}, None)
            return CommandResult(output=f'# Saved plan "{plan_file}":\n\n' + out)
        return CommandResult(output=f'Error: no saved plan "{plan_file}".', exit_code=1)
    if not findings.get('applied'):
        return CommandResult(output='No state. Run "terraform apply" first.', exit_code=1)
    lines = ['# terraform show: current state']
    for r in RESOURCES:
        lines.append(f'# {r}:')
        lines.append(f'  id = "{RESOURCE_IDS[r]}"')
    lines.append('')
    lines.append('Outputs:')
    for k in sorted(OUTPUTS):
        lines.append(f'  {k} = "{OUTPUTS[k]}"')
    return CommandResult(output='\n'.join(lines))


def _cmd_state(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if len(args) < 1:
        return CommandResult(output='Usage: terraform state <list>', exit_code=1)
    if args[0] != 'list':
        return CommandResult(output=f'Terraform has no "state {args[0]}" command in this lab.', exit_code=1)
    if not findings.get('applied'):
        return _need_apply()
    resources = findings.get('applied_resources') or RESOURCES
    return CommandResult(
        output='\n'.join(sorted(resources)),
        findings={'state_viewed': True},
    )


def _cmd_output(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not findings.get('applied'):
        return _need_apply()
    names = [a for a in args if not a.startswith('-')]
    if names:
        name = names[0]
        if name in OUTPUTS:
            return CommandResult(output=f'"{OUTPUTS[name]}"', findings={'outputs_viewed': True})
        return CommandResult(output=f'Error: output "{name}" is not defined.', exit_code=1)
    lines = [f'{k} = "{v}"' for k, v in sorted(OUTPUTS.items())]
    return CommandResult(output='\n'.join(lines), findings={'outputs_viewed': True})


def _cmd_workspace(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not findings.get('init_done'):
        return _need_init()
    if not args:
        return CommandResult(output='Usage: terraform workspace <list|new|select> [name]', exit_code=1)
    sub = args[0]
    workspaces = list(findings.get('workspaces') or ['default'])
    current = findings.get('workspace') or 'default'
    if sub == 'list':
        lines = [('* ' if w == current else '  ') + w for w in workspaces]
        return CommandResult(output='\n'.join(lines))
    if sub == 'new':
        if len(args) < 2:
            return CommandResult(output='Usage: terraform workspace new <name>', exit_code=1)
        name = args[1]
        if name in workspaces:
            return CommandResult(output=f'Error: workspace "{name}" already exists.', exit_code=1)
        workspaces.append(name)
        out = (
            f'Created and switched to workspace "{name}"!\n\n'
            "You're now on a new, empty workspace. Workspaces isolate their Terraform state,\n"
            'so if you run "terraform plan" Terraform will not see any existing state\n'
            'for this configuration.'
        )
        return CommandResult(output=out, findings={
            'workspaces': workspaces,
            'workspace': name,
            'workspace_created': True,
        })
    if sub in ('select', 'switch'):
        if len(args) < 2:
            return CommandResult(output='Usage: terraform workspace select <name>', exit_code=1)
        name = args[1]
        if name not in workspaces:
            return CommandResult(output=f'Error: workspace "{name}" does not exist.', exit_code=1)
        return CommandResult(output=f'Switched to workspace "{name}".', findings={'workspace': name})
    return CommandResult(output=f'Error: unknown workspace subcommand "{sub}".', exit_code=1)


def _cmd_terraform(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not args:
        return CommandResult(output='Usage: terraform <init|validate|fmt|plan|apply|destroy|show|state|output|workspace|version>', exit_code=1)
    sub = args[0]
    rest = args[1:]
    if sub == 'init':
        return _cmd_init(findings)
    if sub == 'validate':
        return _cmd_validate(findings)
    if sub == 'fmt':
        return _cmd_fmt(rest)
    if sub == 'version':
        return _cmd_version()
    if sub == 'plan':
        return _cmd_plan(rest, findings)
    if sub == 'apply':
        return _cmd_apply(rest, findings)
    if sub == 'destroy':
        return _cmd_destroy(rest, findings)
    if sub == 'show':
        return _cmd_show(rest, findings)
    if sub == 'state':
        return _cmd_state(rest, findings)
    if sub == 'output':
        return _cmd_output(rest, findings)
    if sub == 'workspace':
        return _cmd_workspace(rest, findings)
    return CommandResult(output=f'Terraform has no command named "{sub}".', exit_code=1)


def _cmd_cat(args: list[str]) -> CommandResult:
    files = {
        'main.tf': (MAIN_TF, {'config_viewed': True}),
        'variables.tf': (VARIABLES_TF, {}),
        'terraform.tfvars': (TERRAFORM_TFVARS, {}),
        'outputs.tf': (OUTPUTS_TF, {}),
    }
    if not args:
        return CommandResult(output='Usage: cat <file>', exit_code=1)
    name = args[0].split('/')[-1]
    if name in files:
        content, f = files[name]
        return CommandResult(output=content, findings=dict(f))
    return CommandResult(output=f'cat: {args[0]}: No such file or directory', exit_code=1)


def _cmd_ls(findings: dict[str, Any]) -> CommandResult:
    files = ['main.tf', 'outputs.tf', 'terraform.tfvars', 'variables.tf']
    if findings.get('init_done'):
        files += ['.terraform/', '.terraform.lock.hcl']
    if findings.get('plan_saved'):
        files.append(findings['plan_saved'])
    if findings.get('applied'):
        files.append('terraform.tfstate')
        ws = findings.get('workspace') or 'default'
        if ws != 'default':
            files.append('terraform.tfstate.d/')
    return CommandResult(output='  '.join(files))


def _cmd_edit(args: list[str], findings: dict[str, Any]) -> CommandResult:
    if not args or args[0].split('/')[-1] != 'main.tf':
        return CommandResult(
            output='Simulated editor: only main.tf has a patch available in this lab (usage: edit main.tf).',
            exit_code=1,
        )
    if findings.get('misconfiguration_fixed'):
        return CommandResult(output='main.tf already patched: SSH ingress is restricted to 10.0.0.0/8.')
    out = (
        'Simulated editor: main.tf updated.\n'
        '  ~ aws_security_group.web ingress "SSH":\n'
        f'      cidr_blocks = ["{SSH_OPEN_CIDR}"]  ->  ["{SSH_FIXED_CIDR}"]\n\n'
        'Run `terraform plan` to preview the change, then `terraform apply` to deploy it.'
    )
    return CommandResult(output=out, findings={'misconfiguration_fixed': True})


def _cmd_export(raw: str, findings: dict[str, Any]) -> CommandResult:
    # export TF_VAR_name=value
    body = raw[len('export'):].strip()
    if '=' not in body:
        return CommandResult(output=f'export: usage: export TF_VAR_<name>=<value>', exit_code=1)
    k, _, v = body.partition('=')
    k, v = k.strip(), v.strip().strip('"').strip("'")
    if not k.startswith('TF_VAR_'):
        return CommandResult(output=f'export: only TF_VAR_* variables affect Terraform in this lab.', exit_code=1)
    name = k[len('TF_VAR_'):]
    if not name:
        return CommandResult(output='export: usage: export TF_VAR_<name>=<value>', exit_code=1)
    merged = dict(findings.get('variables_set') or {})
    merged[name] = v
    return CommandResult(output='', findings={'variables_set': merged, 'env_vars_set': True})


def _cmd_env(findings: dict[str, Any]) -> CommandResult:
    variables = findings.get('variables_set') or {}
    tf_vars = [f'TF_VAR_{k}={v}' for k, v in sorted(variables.items())]
    base = ['PATH=/usr/local/bin:/usr/bin:/bin', 'HOME=/home/student']
    return CommandResult(output='\n'.join(base + tf_vars))


# ---------------------------------------------------------------------------
# entry point
# ---------------------------------------------------------------------------

def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    raw = (command or '').strip()
    if not raw:
        return CommandResult(output='')
    if len(raw) > 1024:
        return CommandResult(output='Command too long.', exit_code=1)

    lowered = raw.lower()

    # pending interactive confirmations (terraform apply / destroy prompt for 'yes')
    if lowered in ('yes', 'y'):
        if findings.get('pending_apply'):
            cli_vars = findings.get('pending_cli_vars') or {}
            return _do_apply(findings, cli_vars, via_plan=None)
        if findings.get('pending_destroy'):
            return _do_destroy(findings)
        return CommandResult(output='Nothing is waiting for confirmation.')

    parts = _parse(raw)
    if not parts:
        return CommandResult(output='')
    cmd = parts[0].lower()
    args = parts[1:]

    if cmd in ('clear', 'cls'):
        return CommandResult(output='', clear=True)
    if cmd in ('help', '?'):
        return CommandResult(output=(
            'Available commands (simulated - nothing is really provisioned):\n'
            '  ls / cat <file>             inspect the working directory (main.tf, variables.tf,\n'
            '                              terraform.tfvars, outputs.tf)\n'
            '  edit main.tf                fix the SSH ingress rule (simulated editor)\n'
            '  terraform init              download providers, prepare the working directory\n'
            '  terraform fmt               format configuration files\n'
            '  terraform validate          syntax + consistency check (needs init)\n'
            '  terraform plan [-out=FILE]  preview changes; -out saves the plan\n'
            '  terraform apply [plan]      create/update resources (prompts; -auto-approve skips)\n'
            '  terraform destroy           tear everything down (prompts; -auto-approve skips)\n'
            '  terraform show [plan]       show current state (or a saved plan)\n'
            '  terraform state list        list resources tracked in state\n'
            '  terraform output [name]     show output values\n'
            '  terraform workspace <list|new|select>\n'
            '                              manage workspaces (isolated state)\n'
            '  export TF_VAR_<n>=<v>       set a variable via the environment\n'
            '  env                         show environment variables\n'
            '  terraform version | help | clear'
        ))
    if cmd == 'ls':
        return _cmd_ls(findings)
    if cmd == 'cat':
        return _cmd_cat(args)
    if cmd == 'edit':
        return _cmd_edit(args, findings)
    if cmd == 'export':
        return _cmd_export(raw, findings)
    if cmd == 'env':
        return _cmd_env(findings)
    if cmd in ('terraform', 'tf'):
        return _cmd_terraform([a for a in args], findings)
    return CommandResult(
        output=f'{parts[0]}: command not found (this lab uses terraform file commands - try `help`)',
        exit_code=127,
    )
