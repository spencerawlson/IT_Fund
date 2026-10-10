"""Tests for the Terraform fundamentals lab (terraform-fundamentals-001).

Covers the terraform_cli shell (commands, gating, state transitions, determinism),
the lab-scoped validators (pass/fail), and the lab definition structure. These tests
do not need the lab registered in labs.registry (the parent wires definitions/__init__.py
and shells/__init__.py); they import the shell and definition modules directly.
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.shells import terraform_cli
from labs.definitions.terraform_fundamentals import TERRAFORM_FUNDAMENTALS_LAB as LAB
from labs.validators import VALIDATORS

RESOURCES = [
    'aws_vpc.main',
    'aws_subnet.public_a',
    'aws_subnet.public_b',
    'aws_security_group.web',
    'aws_instance.web',
    'aws_s3_bucket.logs',
    'aws_s3_bucket_versioning.logs',
]


def run_cmd(cmd, findings):
    """Run one shell command, merging findings like sessions.py does."""
    result = terraform_cli.run(LAB, cmd, findings)
    findings.update(result.findings)
    return result


def fresh():
    return {}


# ---------------------------------------------------------------------------
# shell interface
# ---------------------------------------------------------------------------

def test_shell_interface():
    assert callable(terraform_cli.initial_prompt)
    assert callable(terraform_cli.banner)
    assert callable(terraform_cli.run)
    assert 'student@iac' in terraform_cli.initial_prompt(LAB)
    assert len(terraform_cli.banner(LAB)) >= 3


def test_help_and_unknown_command():
    r = terraform_cli.run(LAB, 'help', {})
    assert 'terraform init' in r.output
    assert 'terraform plan' in r.output
    r = terraform_cli.run(LAB, 'nonsense', {})
    assert r.exit_code == 127


def test_empty_and_too_long():
    assert terraform_cli.run(LAB, '', {}).output == ''
    assert terraform_cli.run(LAB, '   ', {}).output == ''
    assert terraform_cli.run(LAB, 'x' * 2000, {}).exit_code == 1


# ---------------------------------------------------------------------------
# gating: init before everything
# ---------------------------------------------------------------------------

def test_plan_validate_apply_require_init():
    assert terraform_cli.run(LAB, 'terraform plan', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform validate', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform apply -auto-approve', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform destroy -auto-approve', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform state list', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform output', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform workspace list', {}).exit_code == 1


def test_state_output_require_apply():
    f = {'init_done': True}
    assert terraform_cli.run(LAB, 'terraform state list', f).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform output', f).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform destroy', f).exit_code == 1


# ---------------------------------------------------------------------------
# file inspection
# ---------------------------------------------------------------------------

def test_cat_main_tf_marks_config_viewed():
    f = fresh()
    r = run_cmd('cat main.tf', f)
    assert 'aws_vpc' in r.output and 'aws_instance' in r.output
    assert f['config_viewed'] is True
    assert '0.0.0.0/0' in r.output  # the misconfiguration is visible


def test_cat_other_files():
    assert 'variable "region"' in terraform_cli.run(LAB, 'cat variables.tf', {}).output
    assert 'instance_type' in terraform_cli.run(LAB, 'cat terraform.tfvars', {}).output
    assert 'output "vpc_id"' in terraform_cli.run(LAB, 'cat outputs.tf', {}).output
    assert terraform_cli.run(LAB, 'cat nope.tf', {}).exit_code == 1


def test_ls_grows_with_progress():
    f = fresh()
    assert 'main.tf' in terraform_cli.run(LAB, 'ls', f).output
    assert '.terraform/' not in terraform_cli.run(LAB, 'ls', f).output
    run_cmd('terraform init', f)
    assert '.terraform/' in terraform_cli.run(LAB, 'ls', f).output


# ---------------------------------------------------------------------------
# init / validate / fmt / version
# ---------------------------------------------------------------------------

def test_init_validate_fmt():
    f = fresh()
    r = run_cmd('terraform init', f)
    assert 'successfully initialized' in r.output
    assert f['init_done'] is True
    r = run_cmd('terraform validate', f)
    assert 'valid' in r.output.lower()
    assert f['validated'] is True
    r = run_cmd('terraform fmt', f)
    assert 'main.tf' in r.output
    assert f['formatted'] is True
    assert 'Terraform v' in terraform_cli.run(LAB, 'terraform version', f).output


def test_tf_alias():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('tf validate', f)
    assert 'valid' in r.output.lower()


# ---------------------------------------------------------------------------
# plan
# ---------------------------------------------------------------------------

def test_plan_shows_seven_resources_and_ssh_note():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('terraform plan', f)
    assert 'Plan: 7 to add, 0 to change, 0 to destroy.' in r.output
    assert 'aws_vpc.main' in r.output
    assert 'aws_s3_bucket_versioning.logs' in r.output
    assert 'SSH (port 22) from 0.0.0.0/0' in r.output
    assert f['plan_done'] is True


def test_plan_out_saves_plan():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('terraform plan -out=tfplan', f)
    assert 'Saved the plan to: tfplan' in r.output
    assert f['plan_saved'] == 'tfplan'
    # show can read the saved plan
    r = terraform_cli.run(LAB, 'terraform show tfplan', f)
    assert '7 to add' in r.output


def test_plan_idempotent_when_no_changes():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform plan', f)
    assert 'No changes' in r.output


# ---------------------------------------------------------------------------
# apply (incl. confirmation flow)
# ---------------------------------------------------------------------------

def test_apply_auto_approve():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('terraform apply -auto-approve', f)
    assert 'Apply complete! Resources: 7 added, 0 changed, 0 destroyed.' in r.output
    assert f['applied'] is True
    assert f['applied_resources'] == RESOURCES
    assert 'web_public_ip' in r.output


def test_apply_saved_plan():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('terraform plan -out=tfplan', f)
    r = run_cmd('terraform apply tfplan', f)
    assert '7 added' in r.output
    assert f['applied'] is True


def test_apply_unknown_plan_file_errors():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('terraform apply nope.plan', f)
    assert r.exit_code == 1
    assert 'no such saved plan' in r.output.lower()


def test_apply_confirmation_flow():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('terraform apply', f)
    assert "Only 'yes' will be accepted" in r.output
    assert f.get('applied') is not True
    assert f['pending_apply'] is True
    r = run_cmd('yes', f)
    assert 'Apply complete!' in r.output
    assert f['applied'] is True
    assert f.get('pending_apply') is not True


def test_yes_with_nothing_pending():
    r = terraform_cli.run(LAB, 'yes', {})
    assert 'Nothing is waiting' in r.output


# ---------------------------------------------------------------------------
# state / output / show
# ---------------------------------------------------------------------------

def test_state_list_output_show():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform state list', f)
    for res in RESOURCES:
        assert res in r.output
    assert f['state_viewed'] is True
    r = run_cmd('terraform output', f)
    assert 'vpc_id' in r.output and 'web_public_ip' in r.output and 'logs_bucket' in r.output
    assert f['outputs_viewed'] is True
    r = run_cmd('terraform output vpc_id', f)
    assert 'vpc-0a1b2c3d4e5f60718' in r.output
    r = run_cmd('terraform output bogus', f)
    assert r.exit_code == 1
    r = run_cmd('terraform show', f)
    assert 'aws_instance.web' in r.output


# ---------------------------------------------------------------------------
# variables
# ---------------------------------------------------------------------------

def test_var_flag_records_variable():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('terraform plan -var="instance_type=t3.small"', f)
    assert f['variables_set']['instance_type'] == 't3.small'
    assert 't3.small' in r.output


def test_var_flag_space_form():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('terraform plan -var instance_type=t3.medium', f)
    assert f['variables_set']['instance_type'] == 't3.medium'


def test_export_tf_var():
    f = fresh()
    r = run_cmd('export TF_VAR_region=us-west-2', f)
    assert r.exit_code == 0
    assert f['variables_set']['region'] == 'us-west-2'
    r = run_cmd('env', f)
    assert 'TF_VAR_region=us-west-2' in r.output


def test_export_non_tf_var_rejected():
    f = fresh()
    r = run_cmd('export FOO=bar', f)
    assert r.exit_code == 1
    assert 'variables_set' not in f


def test_apply_uses_var_override():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('terraform apply -auto-approve -var="instance_type=t3.large"', f)
    assert f['applied_instance_type'] == 't3.large'
    assert f['applied_instance_type_source'] == '-var'


# ---------------------------------------------------------------------------
# workspaces
# ---------------------------------------------------------------------------

def test_workspace_lifecycle():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('terraform workspace list', f)
    assert 'default' in r.output
    r = run_cmd('terraform workspace new staging', f)
    assert 'Created and switched to workspace "staging"' in r.output
    assert f['workspace'] == 'staging'
    assert f['workspace_created'] is True
    r = run_cmd('terraform workspace list', f)
    assert '* staging' in r.output
    r = run_cmd('terraform workspace select default', f)
    assert 'Switched to workspace "default"' in r.output
    assert f['workspace'] == 'default'


def test_workspace_duplicate_and_missing():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('terraform workspace new staging', f)
    assert run_cmd('terraform workspace new staging', f).exit_code == 1
    assert run_cmd('terraform workspace select nope', f).exit_code == 1


# ---------------------------------------------------------------------------
# misconfiguration fix
# ---------------------------------------------------------------------------

def test_fix_flow_after_apply():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('terraform apply -auto-approve', f)
    # fix
    r = run_cmd('edit main.tf', f)
    assert '10.0.0.0/8' in r.output
    assert f['misconfiguration_fixed'] is True
    assert f.get('fix_deployed') is not True  # not deployed yet
    # plan shows exactly one change
    r = run_cmd('terraform plan', f)
    assert 'Plan: 0 to add, 1 to change, 0 to destroy.' in r.output
    assert '0.0.0.0/0' in r.output and '10.0.0.0/8' in r.output
    # apply deploys the fix
    r = run_cmd('terraform apply -auto-approve', f)
    assert '1 changed' in r.output
    assert f['fix_deployed'] is True


def test_fix_before_apply():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('edit main.tf', f)
    run_cmd('terraform apply -auto-approve', f)
    assert f['misconfiguration_fixed'] is True
    assert f['fix_deployed'] is True


def test_edit_idempotent_and_other_files_rejected():
    f = fresh()
    run_cmd('edit main.tf', f)
    r = run_cmd('edit main.tf', f)
    assert 'already patched' in r.output
    assert run_cmd('edit variables.tf', f).exit_code == 1


# ---------------------------------------------------------------------------
# destroy
# ---------------------------------------------------------------------------

def test_destroy_flow():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform destroy', f)
    assert 'really want to destroy' in r.output
    assert f['pending_destroy'] is True
    assert f.get('destroyed') is not True
    r = run_cmd('yes', f)
    assert 'Destroy complete! Resources: 7 destroyed.' in r.output
    assert f['destroyed'] is True
    assert f['applied'] is False
    # state is gone afterwards
    assert terraform_cli.run(LAB, 'terraform state list', f).exit_code == 1


def test_destroy_auto_approve():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform destroy -auto-approve', f)
    assert '7 destroyed' in r.output
    assert f['destroyed'] is True


# ---------------------------------------------------------------------------
# determinism
# ---------------------------------------------------------------------------

def test_deterministic_output():
    def scenario():
        f = fresh()
        outs = []
        for cmd in ['terraform init', 'terraform plan -out=tfplan', 'terraform apply tfplan',
                    'terraform state list', 'terraform output']:
            outs.append(run_cmd(cmd, f).output)
        return outs
    assert scenario() == scenario()


# ---------------------------------------------------------------------------
# validators
# ---------------------------------------------------------------------------

def _check(name, findings):
    passed, message, evidence = VALIDATORS[name]({}, findings)
    return passed, message


def test_validators_fail_empty():
    for name in ['tf_config_viewed', 'tf_init_validated', 'tf_plan_saved', 'tf_applied',
                 'tf_state_inspected', 'tf_variables_workspaces', 'tf_misconfiguration_fixed',
                 'tf_destroyed']:
        passed, _ = _check(name, {})
        assert passed is False, name


def test_validators_pass_with_findings():
    assert _check('tf_config_viewed', {'config_viewed': True})[0]
    assert _check('tf_init_validated', {'init_done': True, 'validated': True})[0]
    assert not _check('tf_init_validated', {'init_done': True})[0]
    assert _check('tf_plan_saved', {'plan_saved': 'tfplan'})[0]
    assert _check('tf_applied', {'ever_applied': True, 'applied_resources': RESOURCES})[0]
    assert not _check('tf_applied', {'applied': True, 'applied_resources': []})[0]
    # apply milestone survives destroy
    assert _check('tf_applied', {'ever_applied': True, 'destroyed': True})[0]
    assert _check('tf_state_inspected', {'state_viewed': True})[0]
    assert _check('tf_state_inspected', {'outputs_viewed': True})[0]
    assert _check('tf_variables_workspaces',
                  {'variables_set': {'instance_type': 't3.small'}, 'workspace_created': True,
                   'workspace': 'staging'})[0]
    assert not _check('tf_variables_workspaces', {'variables_set': {'a': 'b'}})[0]
    assert _check('tf_misconfiguration_fixed',
                  {'misconfiguration_fixed': True, 'fix_deployed': True})[0]
    assert not _check('tf_misconfiguration_fixed', {'misconfiguration_fixed': True})[0]
    assert _check('tf_destroyed', {'destroyed': True})[0]


def test_full_lab_completes_all_validators():
    """End-to-end: run the whole workflow, every objective validator passes."""
    f = fresh()
    run_cmd('cat main.tf', f)
    run_cmd('terraform init', f)
    run_cmd('terraform fmt', f)
    run_cmd('terraform validate', f)
    run_cmd('terraform plan -out=tfplan', f)
    run_cmd('terraform apply tfplan', f)
    run_cmd('terraform state list', f)
    run_cmd('terraform output', f)
    run_cmd('terraform plan -var="instance_type=t3.small"', f)
    run_cmd('terraform workspace new staging', f)
    run_cmd('edit main.tf', f)
    run_cmd('terraform plan', f)
    run_cmd('terraform apply -auto-approve', f)
    run_cmd('terraform destroy -auto-approve', f)
    for obj in LAB.objectives:
        passed, message = _check(obj.validator, f)
        assert passed, f'{obj.id}: {message}'


# ---------------------------------------------------------------------------
# lab definition
# ---------------------------------------------------------------------------

def test_lab_definition():
    assert LAB.id == 'terraform-fundamentals-001'
    assert LAB.slug == 'terraform-fundamentals'
    assert LAB.category == 'devops'
    assert LAB.difficulty == 'beginner'
    assert LAB.estimated_minutes == 45
    assert LAB.shell == 'terraform_cli'
    assert 6 <= len(LAB.objectives) <= 8
    # every objective references a registered validator
    for obj in LAB.objectives:
        assert obj.validator in VALIDATORS, f'{obj.id} -> unknown validator {obj.validator}'
        assert obj.label and obj.hints
    # objective ids are unique
    ids = [o.id for o in LAB.objectives]
    assert len(ids) == len(set(ids))
    # does not duplicate the cloud-security lab's focus
    assert LAB.id != 'cloud-terraform-001'
    assert 'workflow' in LAB.description.lower()


def test_lab_public_dict():
    d = LAB.public_dict()
    assert d['id'] == 'terraform-fundamentals-001'
    assert len(d['objectives']) == len(LAB.objectives)
    assert all('validator' in o for o in d['objectives'])
