"""Tests for the Terraform for AWS lab (terraform-aws-001).

Covers the extended terraform_cli AWS path (write/validate/plan/apply against
student-authored HCL), the lab-scoped validators (pass/fail on file contents),
and the lab definition structure.
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.shells import terraform_cli
from labs.definitions.terraform_aws import TERRAFORM_AWS_LAB as LAB
from labs.validators import VALIDATORS


def run_validator(name, args, findings):
    return VALIDATORS[name](args, findings)


class FakeLab:
    id = 'terraform-aws-001'


def run_cmd(cmd, findings):
    result = terraform_cli.run(FakeLab(), cmd, findings)
    findings.update(result.findings)
    return result


def fresh():
    return {}


# ---------------------------------------------------------------------------
# shell interface
# ---------------------------------------------------------------------------

def test_shell_interface_aws():
    assert 'student@aws' in terraform_cli.initial_prompt(FakeLab())
    assert any('Terraform for AWS' in line for line in terraform_cli.banner(FakeLab()))
    # fundamentals path untouched
    class FundLab:
        id = 'terraform-fundamentals-001'
    assert 'student@iac' in terraform_cli.initial_prompt(FundLab())


def test_help_lists_write():
    r = terraform_cli.run(FakeLab(), 'help', {})
    assert 'write <file.tf>' in r.output
    assert 'terraform validate' in r.output
    r = terraform_cli.run(FakeLab(), 'nonsense', {})
    assert r.exit_code == 127


def test_gating_requires_init():
    assert terraform_cli.run(FakeLab(), 'terraform validate', {}).exit_code == 1
    assert terraform_cli.run(FakeLab(), 'terraform plan', {}).exit_code == 1
    assert terraform_cli.run(FakeLab(), 'terraform apply -auto-approve', {}).exit_code == 1
    assert terraform_cli.run(FakeLab(), 'terraform state list', {}).exit_code == 1
    assert terraform_cli.run(FakeLab(), 'terraform workspace list', {}).exit_code == 1


# ---------------------------------------------------------------------------
# write / cat / ls / rm
# ---------------------------------------------------------------------------

def test_write_and_cat():
    f = fresh()
    r = run_cmd('write provider.tf \'provider "aws" { region = "us-east-1" }\'', f)
    assert 'Wrote provider.tf' in r.output
    assert f['tfa_files']['provider.tf'] == 'provider "aws" { region = "us-east-1" }'
    r = run_cmd('cat provider.tf', f)
    assert 'provider "aws"' in r.output
    r = run_cmd('ls', f)
    assert 'provider.tf' in r.output


def test_write_rejects_non_tf_and_paths():
    f = fresh()
    assert run_cmd('write notes.txt \'hi\'', f).exit_code == 1
    assert run_cmd('write ../evil.tf \'hi\'', f).exit_code == 1
    assert run_cmd('write main.tf', f).exit_code == 1  # no content


def test_write_overwrites_and_rm():
    f = fresh()
    run_cmd('write a.tf \'resource "x" "y" {}\'', f)
    run_cmd('write a.tf \'resource "x" "z" {}\'', f)
    assert 'resource "x" "z"' in f['tfa_files']['a.tf']
    r = run_cmd('rm a.tf', f)
    assert 'Removed a.tf' in r.output
    assert 'a.tf' not in f['tfa_files']
    assert run_cmd('rm nope.tf', f).exit_code == 1


def test_write_resets_validated_flag():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('write a.tf \'provider "aws" {}\'', f)
    run_cmd('terraform validate', f)
    assert f['tfa_validated'] is True
    run_cmd('write b.tf \'x\'', f)
    assert f['tfa_validated'] is False


# ---------------------------------------------------------------------------
# validate
# ---------------------------------------------------------------------------

def test_validate_needs_files():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('terraform validate', f)
    assert r.exit_code == 1
    assert 'no .tf files' in r.output


def test_validate_catches_unbalanced_braces():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('write bad.tf \'resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16"\'', f)
    r = run_cmd('terraform validate', f)
    assert r.exit_code == 1
    assert 'unbalanced' in r.output


def test_validate_requires_provider_for_resources():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('write main.tf \'resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" }\'', f)
    r = run_cmd('terraform validate', f)
    assert r.exit_code == 1
    assert 'provider "aws"' in r.output


def test_validate_ok_with_provider():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('write provider.tf \'terraform { required_providers { aws = { source = "hashicorp/aws" version = "~> 5.0" } } } provider "aws" { region = "us-east-1" }\'', f)
    run_cmd('write main.tf \'resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" }\'', f)
    r = run_cmd('terraform validate', f)
    assert r.exit_code == 0
    assert 'Success' in r.output
    assert f['tfa_validated'] is True


def test_backend_detected_on_init():
    f = fresh()
    run_cmd('write provider.tf \'terraform { backend "s3" { bucket = "b" key = "k" region = "r" } } provider "aws" {}\'', f)
    r = run_cmd('terraform init', f)
    assert f['tfa_backend_configured'] is True
    assert 'Backend "s3"' in r.output


# ---------------------------------------------------------------------------
# plan / apply / state / output / destroy
# ---------------------------------------------------------------------------

def _setup_vpc(f):
    run_cmd('terraform init', f)
    run_cmd('write provider.tf \'terraform { required_providers { aws = { source = "hashicorp/aws" version = "~> 5.0" } } } provider "aws" { region = "us-east-1" }\'', f)
    run_cmd('write main.tf \'resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" } resource "aws_subnet" "a" { vpc_id = aws_vpc.main.id cidr_block = "10.0.1.0/24" }\'', f)
    run_cmd('terraform validate', f)


def test_plan_lists_written_resources():
    f = fresh()
    _setup_vpc(f)
    r = run_cmd('terraform plan', f)
    assert 'aws_vpc.main will be created' in r.output
    assert 'aws_subnet.a will be created' in r.output
    assert 'Plan: 2 to add' in r.output


def test_plan_saved_and_apply_via_plan():
    f = fresh()
    _setup_vpc(f)
    r = run_cmd('terraform plan -out=tfplan', f)
    assert f['tfa_plan_saved'] == 'tfplan'
    assert 'Saved the plan to: tfplan' in r.output
    r = run_cmd('terraform apply tfplan', f)
    assert 'Apply complete!' in r.output
    assert f['tfa_applied'] is True
    assert 'aws_vpc.main' in f['tfa_applied_resources']


def test_apply_interactive_confirm():
    f = fresh()
    _setup_vpc(f)
    r = run_cmd('terraform apply', f)
    assert 'Enter a value' in r.output
    assert f.get('tfa_pending_apply') is True
    r = run_cmd('yes', f)
    assert 'Apply complete!' in r.output
    assert f['tfa_applied'] is True


def test_apply_auto_approve():
    f = fresh()
    _setup_vpc(f)
    r = run_cmd('terraform apply -auto-approve', f)
    assert 'Apply complete!' in r.output
    assert f['tfa_ever_applied'] is True


def test_state_and_output():
    f = fresh()
    _setup_vpc(f)
    run_cmd('write outputs.tf \'output "vpc_id" { value = aws_vpc.main.id }\'', f)
    run_cmd('terraform validate', f)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform state list', f)
    assert 'aws_vpc.main' in r.output
    assert f['tfa_state_viewed'] is True
    r = run_cmd('terraform output', f)
    assert 'vpc_id' in r.output
    assert f['tfa_outputs_viewed'] is True
    r = run_cmd('terraform output vpc_id', f)
    assert 'vpc_id =' in r.output
    assert run_cmd('terraform output nope', f).exit_code == 1


def test_plan_no_changes_after_apply():
    f = fresh()
    _setup_vpc(f)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform plan', f)
    assert 'No changes' in r.output


def test_destroy_flow():
    f = fresh()
    _setup_vpc(f)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform destroy', f)
    assert 'Enter a value' in r.output
    r = run_cmd('yes', f)
    assert 'Destroy complete!' in r.output
    assert f['tfa_destroyed'] is True
    assert f['tfa_applied'] is False
    assert run_cmd('terraform state list', f).exit_code == 1


def test_resource_ids_deterministic():
    f = fresh()
    _setup_vpc(f)
    run_cmd('terraform apply -auto-approve', f)
    ids1 = dict(f['tfa_resource_ids'])
    f2 = fresh()
    _setup_vpc(f2)
    run_cmd('terraform apply -auto-approve', f2)
    assert f2['tfa_resource_ids'] == ids1
    assert ids1['aws_vpc.main'].startswith('vpc-')


def test_workspace_flow():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('terraform workspace new prod', f)
    assert 'Created and switched to workspace "prod"' in r.output
    assert f['tfa_workspace_created'] is True
    assert f['tfa_workspace'] == 'prod'
    r = run_cmd('terraform workspace list', f)
    assert '* prod' in r.output
    run_cmd('terraform workspace select default', f)
    assert f['tfa_workspace'] == 'default'


def test_export_tf_var():
    f = fresh()
    r = run_cmd('export TF_VAR_region=eu-west-1', f)
    assert r.exit_code == 0
    assert f['variables_set'] == {'region': 'eu-west-1'}


# ---------------------------------------------------------------------------
# validators
# ---------------------------------------------------------------------------

def _v(name, findings):
    ok, msg, _ = run_validator(name, {}, findings)
    return ok, msg


def _provider_files():
    return {'tfa_files': {
        'provider.tf': 'terraform { required_providers { aws = { source = "hashicorp/aws" version = "~> 5.0" } } } provider "aws" { region = "us-east-1" }',
    }}


def test_v_provider():
    ok, _ = _v('tfa_provider_configured', _provider_files())
    assert ok is True
    ok, msg = _v('tfa_provider_configured', {'tfa_files': {'provider.tf': 'provider "aws" {}'}})
    assert ok is False and 'required_providers' in msg
    ok, _ = _v('tfa_provider_configured', {'tfa_files': {}})
    assert ok is False


def test_v_vpc():
    files = {'tfa_files': {
        'main.tf': 'resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" } '
                   'resource "aws_subnet" "a" { vpc_id = aws_vpc.main.id cidr_block = "10.0.1.0/24" } '
                   'resource "aws_subnet" "b" { vpc_id = aws_vpc.main.id cidr_block = "10.0.2.0/24" }',
    }}
    ok, _ = _v('tfa_vpc_defined', files)
    assert ok is True
    ok, msg = _v('tfa_vpc_defined', {'tfa_files': {'main.tf': 'resource "aws_vpc" "main" {} resource "aws_subnet" "a" {}'}})
    assert ok is False  # only one subnet and no vpc reference
    ok, _ = _v('tfa_vpc_defined', {'tfa_files': {}})
    assert ok is False


def test_v_ec2():
    good = {'tfa_files': {'main.tf': 'resource "aws_security_group" "web" {} resource "aws_instance" "web" { ami = "ami-x" user_data = "<<-EOF" }'}}
    ok, _ = _v('tfa_ec2_defined', good)
    assert ok is True
    ok, msg = _v('tfa_ec2_defined', {'tfa_files': {'main.tf': 'resource "aws_instance" "web" { ami = "ami-x" }'}})
    assert ok is False and 'user_data' in msg


def test_v_variables_iam():
    good = {'tfa_files': {
        'variables.tf': 'variable "bucket_name" { type = string default = "b" }',
        'main.tf': 'resource "aws_s3_bucket" "app" { bucket = var.bucket_name } resource "aws_iam_role" "app" {}',
    }}
    ok, _ = _v('tfa_variables_iam', good)
    assert ok is True
    # declared but never referenced
    bad = {'tfa_files': {
        'variables.tf': 'variable "bucket_name" { type = string }',
        'main.tf': 'resource "aws_s3_bucket" "app" { bucket = "hardcoded" } resource "aws_iam_role" "app" {}',
    }}
    ok, msg = _v('tfa_variables_iam', bad)
    assert ok is False and 'var.' in msg


def test_v_rds_outputs():
    good = {'tfa_files': {'main.tf': 'resource "aws_db_instance" "main" { engine = "postgres" }', 'outputs.tf': 'output "db_endpoint" { value = aws_db_instance.main.endpoint }'}}
    ok, _ = _v('tfa_rds_outputs', good)
    assert ok is True
    ok, _ = _v('tfa_rds_outputs', {'tfa_files': {'main.tf': 'resource "aws_db_instance" "main" {}'}})
    assert ok is False


def test_v_module():
    good = {'tfa_files': {'main.tf': 'module "network" { source = "./modules/vpc" vpc_cidr = "10.1.0.0/16" }'}}
    ok, _ = _v('tfa_module_defined', good)
    assert ok is True
    ok, _ = _v('tfa_module_defined', {'tfa_files': {}})
    assert ok is False


def test_v_backend():
    good = {'tfa_files': {'provider.tf': 'terraform { backend "s3" { bucket = "b" key = "k" region = "r" } }'}, 'tfa_backend_configured': True}
    ok, _ = _v('tfa_backend_configured', good)
    assert ok is True
    ok, _ = _v('tfa_backend_configured', {'tfa_files': {}})
    assert ok is False


def test_v_workspace():
    good = {'tfa_workspace_created': True, 'tfa_workspace': 'prod',
            'tfa_files': {'main.tf': 'resource "aws_instance" "x" { instance_type = lookup(var.t, terraform.workspace, "t3.micro") }'}}
    ok, _ = _v('tfa_workspace_used', good)
    assert ok is True
    ok, _ = _v('tfa_workspace_used', {'tfa_files': {}})
    assert ok is False


def test_v_data_source():
    good = {'tfa_files': {'main.tf': 'data "aws_ami" "ubuntu" { most_recent = true }'}}
    ok, _ = _v('tfa_data_source', good)
    assert ok is True
    ok, _ = _v('tfa_data_source', {'tfa_files': {}})
    assert ok is False


def test_v_capstone():
    hcl = ('resource "aws_lb" "app" {} resource "aws_autoscaling_group" "app" {} '
           'resource "aws_db_instance" "main" {}')
    ok, msg = _v('tfa_capstone', {'tfa_files': {'main.tf': hcl}})
    assert ok is False and 'apply' in msg  # not applied yet
    ok, _ = _v('tfa_capstone', {'tfa_files': {'main.tf': hcl}, 'tfa_applied': True})
    assert ok is True
    ok, _ = _v('tfa_capstone', {'tfa_files': {'main.tf': 'resource "aws_lb" "app" {}'}})
    assert ok is False


def test_validators_registered():
    for name in ['tfa_provider_configured', 'tfa_vpc_defined', 'tfa_ec2_defined',
                 'tfa_variables_iam', 'tfa_rds_outputs', 'tfa_module_defined',
                 'tfa_backend_configured', 'tfa_workspace_used', 'tfa_data_source',
                 'tfa_capstone']:
        assert name in VALIDATORS, f'missing validator: {name}'


# ---------------------------------------------------------------------------
# definition structure + registry
# ---------------------------------------------------------------------------

def test_lab_definition():
    assert LAB.id == 'terraform-aws-001'
    assert LAB.shell == 'terraform_cli'
    assert len(LAB.objectives) == 10
    ids = [o.id for o in LAB.objectives]
    assert len(set(ids)) == 10
    for o in LAB.objectives:
        assert o.validator in VALIDATORS, f'objective {o.id} -> unknown validator {o.validator}'
        assert len(o.description) > 200, f'objective {o.id} description too thin'
        assert o.hints, f'objective {o.id} needs hints'


def test_lab_in_registry():
    from labs.definitions import ALL_LABS
    ids = [lab.id for lab in ALL_LABS]
    assert 'terraform-aws-001' in ids
    # no duplicate ids across the whole registry
    assert len(ids) == len(set(ids))
