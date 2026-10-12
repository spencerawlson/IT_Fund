"""Tests for the Terraform for Proxmox VE lab (terraform-proxmox-001).

Covers the terraform_cli shell's proxmox scenario (scenario dispatch, write
command with heredoc + --scaffold, HCL validation, stage derivation,
plan/apply/destroy/state/output, the linked->full clone fix), the
lab-scoped validators (pass/fail on written HCL content), and the lab
definition structure. Also asserts the other scenarios sharing the shell
are unaffected.
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.shells import terraform_cli
from labs.definitions.terraform_proxmox import TERRAFORM_PROXMOX_LAB as LAB
from labs.definitions.terraform_fundamentals import TERRAFORM_FUNDAMENTALS_LAB as AWS_LAB
from labs.definitions.terraform_k8s_docker import TERRAFORM_K8S_DOCKER_LAB as K8S_LAB
from labs.validators import VALIDATORS

# minimal student-authored HCL (heredoc path, not scaffold)
VERSIONS_TF = '''terraform {
  required_providers {
    proxmox = { source = "bpg/proxmox" version = "~> 0.66" }
  }
}
provider "proxmox" {
  endpoint  = var.pve_endpoint
  api_token = var.pve_api_token
  insecure  = true
}
'''

MAIN_TF_VM = '''resource "proxmox_virtual_environment_vm" "docker" {
  name      = "docker-01"
  node_name = var.pve_node
  vm_id     = 101
  clone { vm_id = 9000 full = false }
  agent { enabled = true }
  cpu { cores = 2 }
  memory { dedicated = 4096 }
  disk { datastore_id = "local-lvm" interface = "scsi0" size = 32 }
  network_device { bridge = "vmbr0" }
  initialization {
    datastore_id = "local-lvm"
    ip_config { ipv4 { address = "192.168.1.101/24" gateway = "192.168.1.1" } }
    user_account { username = "student" password = var.vm_password }
  }
}
'''

MAIN_TF_VM_LXC = MAIN_TF_VM + '''resource "proxmox_virtual_environment_container" "pihole" {
  node_name = var.pve_node
  vm_id     = 200
  operating_system {
    template_file_id = "local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst"
    type             = "debian"
  }
  cpu { cores = 1 }
  memory { dedicated = 512 }
  disk { datastore_id = "local-lvm" size = 8 }
  network_interface { name = "eth0" bridge = "vmbr0" }
  initialization {
    hostname = "pihole"
    ip_config { ipv4 { address = "192.168.1.200/24" gateway = "192.168.1.1" } }
    user_account { password = var.lxc_password }
  }
  unprivileged = true
}
'''

VARIABLES_TF = '''variable "pve_endpoint" { type = string }
variable "pve_api_token" { type = string sensitive = true }
variable "pve_node" { type = string default = "pve" }
variable "vm_password" { type = string sensitive = true }
variable "lxc_password" { type = string sensitive = true }
'''

OUTPUTS_TF = '''output "docker_vm_ip" {
  value = proxmox_virtual_environment_vm.docker.ipv4_addresses[1][0]
}
'''


def run_cmd(cmd, findings, lab=LAB):
    result = terraform_cli.run(lab, cmd, findings)
    findings.update(result.findings or {})
    return result


def fresh():
    return {}


def write_file(findings, name, content):
    return run_cmd(f"write {name}\n{content}\nEOF", findings)


def check(name, findings):
    fn = VALIDATORS[name]
    return fn({}, findings)


# ---------------------------------------------------------------------------
# shell interface / scenario dispatch
# ---------------------------------------------------------------------------

def test_proxmox_prompt_and_banner():
    assert 'proxmox' in terraform_cli.initial_prompt(LAB)
    assert 'proxmox' not in terraform_cli.initial_prompt(AWS_LAB)
    assert 'proxmox' not in terraform_cli.initial_prompt(K8S_LAB)
    banner = terraform_cli.banner(LAB)
    assert any('Proxmox VE' in line for line in banner)
    assert any('write <file>' in line for line in banner)


def test_proxmox_help_mentions_scaffold_and_edit():
    r = terraform_cli.run(LAB, 'help', {})
    assert 'write <file> --scaffold' in r.output
    assert 'edit main.tf' in r.output
    assert 'bpg/proxmox' in r.output


def test_proxmox_scenario_dispatch():
    assert terraform_cli._scenario(LAB) == 'proxmox'
    assert terraform_cli._scenario(AWS_LAB) == 'aws'
    assert terraform_cli._scenario(K8S_LAB) == 'k8s'


def test_ls_empty_directory():
    r = terraform_cli.run(LAB, 'ls', {})
    assert 'empty directory' in r.output
    assert 'versions.tf' in r.output


def test_gating_init_first():
    assert terraform_cli.run(LAB, 'terraform plan', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform validate', {}).exit_code == 1
    assert terraform_cli.run(LAB, 'terraform apply', {}).exit_code == 1


def test_init_requires_versions_tf():
    f = fresh()
    r = run_cmd('terraform init', f)
    assert r.exit_code == 1
    assert 'versions.tf' in r.output


def test_init_rejects_missing_provider():
    f = fresh()
    # passes write-time validation (declares bpg/proxmox) but has no provider block
    write_file(f, 'versions.tf', 'terraform {\n  required_providers {\n    proxmox = { source = "bpg/proxmox" }\n  }\n}\n')
    r = run_cmd('terraform init', f)
    assert r.exit_code == 1
    assert 'provider "proxmox"' in r.output


# ---------------------------------------------------------------------------
# write command: heredoc + scaffold + validation
# ---------------------------------------------------------------------------

def test_write_heredoc_and_cat():
    f = fresh()
    r = write_file(f, 'versions.tf', VERSIONS_TF)
    assert r.exit_code == 0
    assert 'Wrote' in r.output
    assert f['px_files']['versions.tf'] == VERSIONS_TF.strip('\n')
    r = run_cmd('cat versions.tf', f)
    assert 'bpg/proxmox' in r.output


def test_write_rejects_unbalanced_braces():
    f = fresh()
    r = write_file(f, 'main.tf', 'resource "proxmox_virtual_environment_vm" "x" {\n  name = "y"\n')
    assert r.exit_code == 1
    assert 'unbalanced' in r.output
    assert 'main.tf' not in f.get('px_files', {})


def test_write_rejects_missing_required_block():
    f = fresh()
    r = write_file(f, 'main.tf', 'resource "aws_instance" "x" {\n}\n')
    assert r.exit_code == 1
    assert 'missing required block' in r.output


def test_write_rejects_unexpected_file():
    f = fresh()
    r = write_file(f, 'random.tf', 'variable "x" {}\n')
    assert r.exit_code == 1
    assert 'not part of this lab' in r.output


def test_write_requires_eof_terminator():
    f = fresh()
    r = terraform_cli.run(LAB, 'write main.tf\nresource "x" {}\n', f)
    assert r.exit_code == 1
    assert 'EOF' in r.output


def test_scaffold_versions_tf():
    f = fresh()
    r = run_cmd('write versions.tf --scaffold', f)
    assert r.exit_code == 0
    assert 'expert scaffold' in r.output
    assert 'bpg/proxmox' in f['px_files']['versions.tf']


def test_scaffold_main_tf_upgrades_stage():
    f = fresh()
    run_cmd('write versions.tf --scaffold', f)
    r = run_cmd('write main.tf --scaffold', f)
    assert f['px_stage'] == 'vm'
    assert 'proxmox_virtual_environment_container' not in f['px_files']['main.tf']
    r = run_cmd('write main.tf --scaffold', f)
    assert f['px_stage'] == 'vm+lxc'
    assert 'proxmox_virtual_environment_container' in f['px_files']['main.tf']
    r = run_cmd('write main.tf --scaffold', f)
    assert f['px_stage'] == 'stack'
    assert f['px_files']['main.tf'].count('proxmox_virtual_environment_vm') >= 2


def test_cat_shows_expert_reference_before_write():
    f = fresh()
    r = run_cmd('cat main.tf', f)
    assert 'has not been written yet' in r.output
    assert 'proxmox_virtual_environment_vm' in r.output  # expert reference shown


# ---------------------------------------------------------------------------
# stage derivation
# ---------------------------------------------------------------------------

def test_stage_derivation():
    assert terraform_cli._px_stage(None) == 'empty'
    assert terraform_cli._px_stage('') == 'empty'
    assert terraform_cli._px_stage(MAIN_TF_VM) == 'vm'
    assert terraform_cli._px_stage(MAIN_TF_VM_LXC) == 'vm+lxc'
    two_vms = MAIN_TF_VM_LXC + '\nresource "proxmox_virtual_environment_vm" "k3s" {\n}\n'
    assert terraform_cli._px_stage(two_vms) == 'stack'


def test_clone_full_detection():
    assert not terraform_cli._px_clone_full(MAIN_TF_VM)  # full = false
    fixed = MAIN_TF_VM.replace('full = false', 'full = true')
    assert terraform_cli._px_clone_full(fixed)
    telmate = MAIN_TF_VM.replace('full = false', 'full_clone = true')
    assert terraform_cli._px_clone_full(telmate)
    assert not terraform_cli._px_clone_full('no clone here')


# ---------------------------------------------------------------------------
# init / validate / plan / apply / output / state / destroy
# ---------------------------------------------------------------------------

def test_validate_success():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM)
    r = run_cmd('terraform validate', f)
    assert r.exit_code == 0
    assert 'valid' in r.output.lower()
    assert f['validated']


def test_validate_fails_without_main_tf():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    r = run_cmd('terraform validate', f)
    assert r.exit_code == 1


def test_plan_shows_linked_clone_warning():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM)
    r = run_cmd('terraform plan', f)
    assert 'Plan: 1 to add, 0 to change, 0 to destroy.' in r.output
    assert 'LINKED clone' in r.output
    assert 'proxmox_virtual_environment_vm.docker' in r.output


def test_plan_out_and_apply_saved_plan():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM)
    r = run_cmd('terraform plan -out=tfplan', f)
    assert f['px_plan_saved'] == 'tfplan'
    assert 'Saved the plan to: tfplan' in r.output
    r = run_cmd('terraform apply tfplan', f)
    assert 'Apply complete! Resources: 1 added, 0 changed, 0 destroyed.' in r.output
    assert f['px_applied']
    assert f['ever_applied']


def test_apply_prompts_and_yes_confirms():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM)
    r = run_cmd('terraform apply', f)
    assert "Only 'yes' will be accepted" in r.output
    assert f['px_pending_apply']
    r = run_cmd('yes', f)
    assert 'Apply complete!' in r.output
    assert f['px_applied']
    assert not f.get('px_pending_apply')


def test_plan_no_changes_after_apply():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM_LXC)
    run_cmd('terraform apply -auto-approve', f)
    # fix the clone first so the plan is not the fix-update
    run_cmd('edit main.tf', f)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform plan', f)
    assert 'No changes.' in r.output


def test_output_stage_aware():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform output', f)
    assert 'docker_vm_ip = "192.168.1.101"' in r.output
    assert 'k3s_vm_ip' not in r.output  # stack-only output hidden at vm stage
    r = run_cmd('terraform output docker_vm_ip', f)
    assert '192.168.1.101' in r.output
    r = run_cmd('terraform output nope', f)
    assert r.exit_code == 1


def test_state_list_and_show():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM_LXC)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform state list', f)
    assert 'proxmox_virtual_environment_vm.docker' in r.output
    assert 'proxmox_virtual_environment_container.pihole' in r.output
    r = run_cmd('terraform show', f)
    assert 'terraform.tfstate' in r.output


def test_destroy_flow():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform destroy', f)
    assert 'no undo' in r.output.lower() or 'really want to destroy' in r.output
    assert f['px_pending_destroy']
    r = run_cmd('yes', f)
    assert 'Destroy complete! Resources: 1 destroyed.' in r.output
    assert f['destroyed']
    assert not f['px_applied']


def test_destroy_auto_approve():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform destroy -auto-approve', f)
    assert 'Destroy complete!' in r.output
    assert f['destroyed']


# ---------------------------------------------------------------------------
# clone fix (edit main.tf)
# ---------------------------------------------------------------------------

def test_edit_flips_clone_to_full():
    f = fresh()
    write_file(f, 'main.tf', MAIN_TF_VM)
    assert not f.get('px_clone_fixed')
    r = run_cmd('edit main.tf', f)
    assert r.exit_code == 0
    assert 'FULL clone' in r.output
    assert f['px_clone_fixed']
    assert 'full = true' in f['px_files']['main.tf']


def test_edit_requires_main_tf():
    f = fresh()
    r = run_cmd('edit main.tf', f)
    assert r.exit_code == 1


def test_edit_idempotent_when_already_full():
    f = fresh()
    write_file(f, 'main.tf', MAIN_TF_VM.replace('full = false', 'full = true'))
    assert f['px_clone_fixed']  # detected from written content
    r = run_cmd('edit main.tf', f)
    assert 'already' in r.output


def test_fix_plan_shows_update_in_place():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM)
    run_cmd('terraform apply -auto-approve', f)
    run_cmd('edit main.tf', f)
    r = run_cmd('terraform plan', f)
    assert 'Plan: 0 to add, 1 to change, 0 to destroy.' in r.output
    assert 'full = false -> true' in r.output


def test_fix_apply_marks_fix_deployed():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM)
    run_cmd('terraform apply -auto-approve', f)
    run_cmd('edit main.tf', f)
    r = run_cmd('terraform apply -auto-approve', f)
    assert '0 added, 1 changed, 0 destroyed' in r.output
    assert f['px_fix_deployed']


# ---------------------------------------------------------------------------
# variables via -var / TF_VAR_
# ---------------------------------------------------------------------------

def test_var_flag_sets_variables():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM)
    r = run_cmd('terraform plan -var="pve_node=pve2"', f)
    assert r.exit_code == 0
    assert f['variables_set']


def test_export_tf_var():
    f = fresh()
    r = run_cmd('export TF_VAR_pve_node=pve2', f)
    assert r.exit_code == 0
    r = run_cmd('env', f)
    assert 'TF_VAR_pve_node' in r.output


# ---------------------------------------------------------------------------
# validators: pass paths
# ---------------------------------------------------------------------------

def _full_setup_through_outputs(f):
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', MAIN_TF_VM)
    run_cmd('terraform validate', f)
    run_cmd('terraform plan -out=tfplan', f)
    run_cmd('terraform apply tfplan', f)
    write_file(f, 'main.tf', MAIN_TF_VM_LXC)
    run_cmd('terraform apply -auto-approve', f)
    write_file(f, 'variables.tf', VARIABLES_TF)
    run_cmd('terraform plan -var="pve_node=pve2"', f)
    run_cmd('terraform apply -auto-approve', f)
    write_file(f, 'outputs.tf', OUTPUTS_TF)
    run_cmd('terraform apply -auto-approve', f)
    run_cmd('terraform output', f)


def test_validator_provider_configured_pass():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    passed, msg, _ = check('px_provider_configured', f)
    assert passed, msg


def test_validator_vm_deployed_pass():
    f = fresh()
    _full_setup_through_outputs(f)
    passed, msg, _ = check('px_vm_deployed', f)
    assert passed, msg


def test_validator_lxc_deployed_pass():
    f = fresh()
    _full_setup_through_outputs(f)
    passed, msg, _ = check('px_lxc_deployed', f)
    assert passed, msg


def test_validator_variables_configured_pass():
    f = fresh()
    _full_setup_through_outputs(f)
    passed, msg, _ = check('px_variables_configured', f)
    assert passed, msg


def test_validator_outputs_read_pass():
    f = fresh()
    _full_setup_through_outputs(f)
    passed, msg, _ = check('px_outputs_read', f)
    assert passed, msg


def test_validator_clone_fixed_pass():
    f = fresh()
    _full_setup_through_outputs(f)
    run_cmd('edit main.tf', f)
    run_cmd('terraform apply -auto-approve', f)
    passed, msg, _ = check('px_clone_fixed', f)
    assert passed, msg


def test_validator_stack_deployed_pass():
    f = fresh()
    _full_setup_through_outputs(f)
    run_cmd('write main.tf --scaffold', f)  # vm+lxc -> stack
    assert f['px_stage'] == 'stack'
    run_cmd('terraform plan -out=tfplan', f)
    run_cmd('terraform apply tfplan', f)
    passed, msg, _ = check('px_stack_deployed', f)
    assert passed, msg


def test_validator_destroyed_pass():
    f = fresh()
    _full_setup_through_outputs(f)
    run_cmd('terraform destroy -auto-approve', f)
    passed, msg, _ = check('px_destroyed', f)
    assert passed, msg


# ---------------------------------------------------------------------------
# validators: fail paths (reject flawed configs)
# ---------------------------------------------------------------------------

def test_validator_provider_rejects_missing_token():
    f = fresh()
    write_file(f, 'versions.tf', 'terraform {\n required_providers {\n proxmox = { source = "bpg/proxmox" }\n }\n}\n')
    passed, msg, _ = check('px_provider_configured', f)
    assert not passed
    assert 'api_token' in msg or 'provider "proxmox"' in msg


def test_validator_vm_rejects_no_clone():
    f = fresh()
    write_file(f, 'versions.tf', VERSIONS_TF)
    run_cmd('terraform init', f)
    write_file(f, 'main.tf', '''resource "proxmox_virtual_environment_vm" "x" {
  name = "x"
  initialization { datastore_id = "local-lvm" }
}
''')
    run_cmd('terraform validate', f)
    run_cmd('terraform apply -auto-approve', f)
    passed, msg, _ = check('px_vm_deployed', f)
    assert not passed
    assert 'clone' in msg


def test_validator_lxc_rejects_privileged():
    f = fresh()
    bad = MAIN_TF_VM_LXC.replace('unprivileged = true', 'unprivileged = false')
    write_file(f, 'main.tf', bad)
    run_cmd('terraform apply -auto-approve', f)
    passed, msg, _ = check('px_lxc_deployed', f)
    assert not passed


def test_validator_variables_rejects_no_sensitive():
    f = fresh()
    write_file(f, 'variables.tf', 'variable "pve_endpoint" { type = string }\nvariable "pve_api_token" { type = string }\nvariable "pve_node" { type = string }\n')
    run_cmd('terraform plan -var="pve_node=x"', f)
    passed, msg, _ = check('px_variables_configured', f)
    assert not passed
    assert 'sensitive' in msg


def test_validator_outputs_rejects_no_ipv4():
    f = fresh()
    write_file(f, 'outputs.tf', 'output "name" { value = "x" }\n')
    run_cmd('terraform apply -auto-approve', f)
    run_cmd('terraform output', f)
    passed, msg, _ = check('px_outputs_read', f)
    assert not passed
    assert 'ipv4_addresses' in msg


def test_validator_clone_rejects_linked():
    f = fresh()
    _full_setup_through_outputs(f)
    # never ran edit: clone still linked
    passed, msg, _ = check('px_clone_fixed', f)
    assert not passed
    assert 'LINKED' in msg


def test_validator_clone_rejects_undeployed_fix():
    f = fresh()
    _full_setup_through_outputs(f)
    run_cmd('edit main.tf', f)
    passed, msg, _ = check('px_clone_fixed', f)
    assert not passed
    assert 'apply' in msg.lower()


def test_validator_stack_rejects_partial():
    f = fresh()
    _full_setup_through_outputs(f)  # stage is vm+lxc, not stack
    passed, msg, _ = check('px_stack_deployed', f)
    assert not passed
    assert 'vm+lxc' in msg


def test_validator_destroyed_rejects_not_destroyed():
    f = fresh()
    _full_setup_through_outputs(f)
    passed, msg, _ = check('px_destroyed', f)
    assert not passed


# ---------------------------------------------------------------------------
# end-to-end: every objective completable in order
# ---------------------------------------------------------------------------

def test_full_workflow_completes_all_objectives():
    f = fresh()
    # objective 1: provider setup
    run_cmd('write versions.tf --scaffold', f)
    run_cmd('terraform init', f)
    passed, msg, _ = check('px_provider_configured', f)
    assert passed, msg

    # objective 2: VM from cloud-init template
    run_cmd('write main.tf --scaffold', f)
    run_cmd('terraform validate', f)
    run_cmd('terraform plan', f)
    run_cmd('terraform apply -auto-approve', f)
    passed, msg, _ = check('px_vm_deployed', f)
    assert passed, msg

    # objective 3: LXC container
    run_cmd('write main.tf --scaffold', f)
    run_cmd('terraform plan', f)
    run_cmd('terraform apply -auto-approve', f)
    passed, msg, _ = check('px_lxc_deployed', f)
    assert passed, msg

    # objective 4: variables
    run_cmd('write variables.tf --scaffold', f)
    run_cmd('terraform plan -var="pve_node=pve2"', f)
    run_cmd('terraform apply -auto-approve', f)
    passed, msg, _ = check('px_variables_configured', f)
    assert passed, msg

    # objective 5: outputs
    run_cmd('write outputs.tf --scaffold', f)
    run_cmd('terraform apply -auto-approve', f)
    run_cmd('terraform output', f)
    passed, msg, _ = check('px_outputs_read', f)
    assert passed, msg

    # objective 6: fix the clone
    run_cmd('edit main.tf', f)
    run_cmd('terraform plan', f)
    run_cmd('terraform apply -auto-approve', f)
    passed, msg, _ = check('px_clone_fixed', f)
    assert passed, msg

    # objective 7: homelab stack
    run_cmd('write main.tf --scaffold', f)
    assert f['px_stage'] == 'stack'
    run_cmd('terraform plan -out=tfplan', f)
    run_cmd('terraform apply tfplan', f)
    passed, msg, _ = check('px_stack_deployed', f)
    assert passed, msg

    # objective 8: destroy
    run_cmd('terraform destroy', f)
    run_cmd('yes', f)
    passed, msg, _ = check('px_destroyed', f)
    assert passed, msg


# ---------------------------------------------------------------------------
# lab definition structure
# ---------------------------------------------------------------------------

def test_lab_definition_structure():
    assert LAB.id == 'terraform-proxmox-001'
    assert LAB.shell == 'terraform_cli'
    assert LAB.category == 'devops'
    assert len(LAB.objectives) == 8
    ids = [o.id for o in LAB.objectives]
    assert ids == [
        'provider-setup', 'vm-cloudinit', 'lxc-container', 'variables',
        'outputs', 'clones', 'homelab-stack', 'destroy',
    ]
    for o in LAB.objectives:
        assert o.validator in VALIDATORS, f'unknown validator {o.validator}'
        assert len(o.description) > 200, f'{o.id}: description too thin to teach HCL'


def test_lab_registered():
    from labs.definitions import ALL_LABS
    assert any(l.id == 'terraform-proxmox-001' for l in ALL_LABS)


def test_other_scenarios_unaffected():
    # AWS fundamentals: write still unavailable, edit still the SSH fix
    r = terraform_cli.run(AWS_LAB, 'write main.tf\nx\nEOF', {})
    assert r.exit_code == 1
    # k8s: prompt unchanged
    assert 'k8s-infra' in terraform_cli.initial_prompt(K8S_LAB)
    r = terraform_cli.run(K8S_LAB, 'help', {})
    assert 'kubernetes + docker providers' in r.output
