"""A simulated Terraform shell for the IaC provisioning + cloud-security lab.

Models the Terraform workflow deterministically: `init` must run before `validate`/`plan`/`apply`,
and `state list`/`destroy` need a prior `apply`. State is derived from the findings already recorded
(e.g. `init_done`), so no separate store is needed. Executes nothing and provisions no cloud. The
provided `main.tf` ships one deliberate misconfiguration — SSH open to 0.0.0.0/0 — for `tfsec` to flag.
"""
from __future__ import annotations

from typing import Any

from labs.providers.base import CommandResult

MAIN_TF = """terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "assets" {
  bucket = "globomantics-app-assets"
}

resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Allow web and admin access"

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "app" {
  ami                    = "ami-0abcd1234ef567890"
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name = "globomantics-app"
  }
}
"""

RESOURCES = ['aws_s3_bucket.assets', 'aws_security_group.web', 'aws_instance.app']


def initial_prompt(lab) -> str:
    return 'student@iac:~/infra$ '


def banner(lab) -> list[str]:
    return [
        'Road to CISSP - simulated Terraform workspace   (safe: nothing is really provisioned)',
        'A starter main.tf is in this directory. Run the Terraform workflow and catch the insecure default before you apply.',
        'Try: cat main.tf · terraform init · tfsec · terraform plan · terraform apply',
    ]


def _need_init() -> CommandResult:
    return CommandResult(output='Error: Initialization required. Please run "terraform init" first.', exit_code=1)


def _need_apply() -> CommandResult:
    return CommandResult(output='Error: No state. Run "terraform apply" before inspecting state.', exit_code=1)


def _tfsec() -> CommandResult:
    out = (
        'tfsec is scanning main.tf ...\n\n'
        'Result #1 HIGH  Security group rule allows ingress from the public internet to port 22 (SSH).\n'
        '--------------------------------------------------------------------------------\n'
        '  main.tf:38-43\n'
        '    aws_security_group.web\n'
        '  Impact:     Anyone on the internet can attempt to reach SSH on the instance.\n'
        '  Resolution: Restrict cidr_blocks to a known admin range instead of 0.0.0.0/0.\n'
        '--------------------------------------------------------------------------------\n\n'
        '  timings\n  ----------\n  disk i/o          124µs\n  parsing           2ms\n\n'
        '  1 potential problem detected (1 HIGH).'
    )
    return CommandResult(output=out, findings={'security_issue': {'rule': 'open-ssh', 'severity': 'HIGH', 'resource': 'aws_security_group.web'}})


def _init() -> CommandResult:
    out = (
        'Initializing the backend...\n'
        'Initializing provider plugins...\n'
        '- Finding hashicorp/aws versions matching "~> 5.0"...\n'
        '- Installing hashicorp/aws v5.31.0...\n'
        '- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)\n\n'
        'Terraform has been successfully initialized!'
    )
    return CommandResult(output=out, findings={'init_done': True})


def _plan() -> CommandResult:
    body = '\n'.join(f'  # {r} will be created\n  + resource "{r.split(".")[0]}" "{r.split(".")[1]}"' for r in RESOURCES)
    out = (
        'Terraform used the selected providers to generate the following execution plan.\n'
        'Resource actions are indicated with the following symbols:\n  + create\n\n'
        'Terraform will perform the following actions:\n\n'
        f'{body}\n\n'
        'Plan: 3 to add, 0 to change, 0 to destroy.\n\n'
        'Note: a HIGH tfsec finding exists on aws_security_group.web (SSH open to 0.0.0.0/0).'
    )
    return CommandResult(output=out, findings={'plan_done': True})


def _apply() -> CommandResult:
    out = (
        'aws_s3_bucket.assets: Creating...\n'
        'aws_security_group.web: Creating...\n'
        'aws_instance.app: Creating...\n'
        'aws_instance.app: Creation complete after 12s [id=i-0abc123]\n\n'
        'Apply complete! Resources: 3 added, 0 changed, 0 destroyed.\n\n'
        'Outputs:\n\n  app_public_ip = "54.210.11.9"'
    )
    return CommandResult(output=out, findings={'applied': True})


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    raw = (command or '').strip()
    if not raw:
        return CommandResult(output='')
    if len(raw) > 512:
        return CommandResult(output='Command too long.', exit_code=1)
    parts = raw.split()
    cmd = parts[0].lower()
    args = [p.lower() for p in parts[1:]]

    if cmd in ('clear', 'cls'):
        return CommandResult(output='', clear=True)
    if cmd in ('help', '?'):
        return CommandResult(output=(
            'Available commands (simulated - nothing is really provisioned):\n'
            '  cat main.tf                 read the infrastructure definition\n'
            '  terraform init              download providers and prepare the working directory\n'
            '  terraform fmt               format the configuration\n'
            '  terraform validate          check the configuration is syntactically valid\n'
            '  tfsec                       scan the config for security issues (static analysis)\n'
            '  terraform plan              preview what will be created/changed/destroyed\n'
            '  terraform apply             create the resources (use -auto-approve to skip the prompt)\n'
            '  terraform state list        list resources Terraform is tracking\n'
            '  terraform destroy           tear everything down\n'
            '  help | clear'
        ))
    if cmd == 'cat' and args and args[0].endswith('main.tf'):
        return CommandResult(output=MAIN_TF, findings={'config_viewed': True})
    if cmd == 'cat':
        return CommandResult(output=f'cat: {parts[1] if len(parts) > 1 else ""}: No such file or directory', exit_code=1)
    if cmd == 'ls':
        return CommandResult(output='main.tf')
    if cmd == 'tfsec':
        return _tfsec()
    if cmd in ('terraform', 'tf'):
        if not args:
            return CommandResult(output='Usage: terraform <init|validate|plan|apply|destroy|fmt|state>', exit_code=1)
        sub = args[0]
        if sub == 'init':
            return _init()
        if sub == 'fmt':
            return CommandResult(output='main.tf')
        if sub == 'validate':
            return CommandResult(output='Success! The configuration is valid.') if findings.get('init_done') else _need_init()
        if sub == 'plan':
            return _plan() if findings.get('init_done') else _need_init()
        if sub == 'apply':
            return _apply() if findings.get('init_done') else _need_init()
        if sub == 'state' and len(args) > 1 and args[1] == 'list':
            return CommandResult(output='\n'.join(RESOURCES)) if findings.get('applied') else _need_apply()
        if sub == 'destroy':
            return CommandResult(output='Destroy complete! Resources: 3 destroyed.') if findings.get('applied') else _need_apply()
        return CommandResult(output=f'Terraform has no command named "{sub}".', exit_code=1)
    return CommandResult(output=f'{cmd}: command not found (this lab uses `terraform` and `tfsec` — try `help`)', exit_code=127)
