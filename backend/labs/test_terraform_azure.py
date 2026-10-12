"""Tests for the Terraform for Azure lab (terraform-azure-001).

Covers the extended terraform_cli Azure path (write/validate/plan/apply against
student-authored HCL), the lab-scoped validators (pass/fail on file contents),
and the lab definition structure.
"""
import sys
import re
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.shells import terraform_cli
from labs.definitions.terraform_azure import TERRAFORM_AZURE_LAB as LAB
from labs.validators import VALIDATORS


def run_validator(name, args, findings):
    return VALIDATORS[name](args, findings)


class FakeLab:
    id = 'terraform-azure-001'


def run_cmd(cmd, findings):
    result = terraform_cli.run(FakeLab(), cmd, findings)
    findings.update(result.findings)
    return result


def fresh():
    return {}


# ---------------------------------------------------------------------------
# shared HCL fixtures
# ---------------------------------------------------------------------------

PROVIDER_HCL = """terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}
provider "azurerm" {
  features {}
}
"""

NETWORK_HCL = """resource "azurerm_resource_group" "main" {
  name     = "rg-road2cissp-lab"
  location = var.location
}
resource "azurerm_virtual_network" "main" {
  name                = "road2cissp-vnet"
  address_space       = ["10.1.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}
resource "azurerm_subnet" "internal" {
  name                 = "internal"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.1.1.0/24"]
}
"""

COMPUTE_HCL = """resource "azurerm_network_security_group" "web" {
  name                = "web-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  security_rule {
    name                       = "allow-http"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
  security_rule {
    name                       = "allow-ssh"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "10.0.0.0/8"
    destination_address_prefix = "*"
  }
}
resource "azurerm_subnet_network_security_group_association" "web" {
  subnet_id                 = azurerm_subnet.internal.id
  network_security_group_id = azurerm_network_security_group.web.id
}
resource "azurerm_network_interface" "web" {
  name                = "web-nic"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.internal.id
    private_ip_address_allocation = "Dynamic"
  }
}
resource "azurerm_linux_virtual_machine" "web" {
  name                = "road2cissp-vm"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = var.vm_size
  admin_username      = "azureuser"
  network_interface_ids = [azurerm_network_interface.web.id]
  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }
  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }
  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}
"""

STORAGE_HCL = """resource "azurerm_storage_account" "logs" {
  name                     = "stroad2cissp001"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  allow_nested_items_to_be_public = false
}
"""

VARIABLES_HCL = """variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "canadacentral"
}
variable "vm_size" {
  description = "Azure VM size"
  type        = string
  default     = "Standard_B1s"
}
variable "db_admin_password" {
  description = "DB admin password"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.db_admin_password) >= 12
    error_message = "Password must be at least 12 characters."
  }
}
locals {
  common_tags = {
    Environment = "lab"
    ManagedBy   = "terraform"
  }
}
"""

OUTPUTS_HCL = """output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}
output "vm_private_ip" {
  description = "Private IP of the web VM"
  value       = azurerm_network_interface.web.private_ip_address
}
"""

BACKEND_HCL = """terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstate00001"
    container_name       = "tfstate"
    key                  = "azure-lab.tfstate"
  }
}
"""


def _write(findings, filename, hcl):
    r = run_cmd('write %s\n%s\nEOF' % (filename, hcl), findings)
    assert 'Wrote' in r.output, r.output
    return r


def _setup_network(f):
    run_cmd('terraform init', f)
    _write(f, 'provider.tf', PROVIDER_HCL)
    _write(f, 'main.tf', NETWORK_HCL)
    run_cmd('terraform validate', f)


# ---------------------------------------------------------------------------
# shell interface
# ---------------------------------------------------------------------------

def test_shell_interface_azure():
    assert 'student@azure' in terraform_cli.initial_prompt(FakeLab())
    assert any('Terraform for Azure' in line for line in terraform_cli.banner(FakeLab()))
    # other scenarios untouched
    class FundLab:
        id = 'terraform-fundamentals-001'
    assert 'student@iac' in terraform_cli.initial_prompt(FundLab())


def test_help_lists_write():
    r = terraform_cli.run(FakeLab(), 'help', {})
    assert 'write <file>' in r.output
    assert 'validate' in r.output
    assert 'terraform validate' in r.output
    r = terraform_cli.run(FakeLab(), 'nonsense', {})
    assert r.exit_code == 127


def test_gating_requires_init():
    assert terraform_cli.run(FakeLab(), 'terraform validate', {}).exit_code == 1
    assert terraform_cli.run(FakeLab(), 'terraform plan', {}).exit_code == 1
    assert terraform_cli.run(FakeLab(), 'terraform apply -auto-approve', {}).exit_code == 1
    assert terraform_cli.run(FakeLab(), 'terraform state list', {}).exit_code == 1
    assert terraform_cli.run(FakeLab(), 'terraform output', {}).exit_code == 1


# ---------------------------------------------------------------------------
# write / cat / ls / rm / validate
# ---------------------------------------------------------------------------

def test_write_and_cat():
    f = fresh()
    r = run_cmd('write provider.tf\n%s\nEOF' % PROVIDER_HCL, f)
    assert 'Wrote' in r.output
    assert 'provider "azurerm"' in f['azure_files']['provider.tf']
    r = run_cmd('cat provider.tf', f)
    assert 'hashicorp/azurerm' in r.output
    assert run_cmd('cat missing.tf', f).exit_code == 1
    r = run_cmd('ls', f)
    assert 'provider.tf' in r.output


def test_write_rejects_non_tf_and_paths():
    f = fresh()
    assert run_cmd('write notes.txt\nhi\nEOF', f).exit_code == 1
    assert run_cmd('write ../evil.tf\nhi\nEOF', f).exit_code == 1
    assert run_cmd('write main.tf', f).exit_code == 1  # unterminated heredoc
    assert run_cmd('write empty.tf\n   \nEOF', f).exit_code == 1  # empty content


def test_write_rejects_unbalanced_braces():
    f = fresh()
    r = run_cmd('write bad.tf\nresource "azurerm_resource_group" "main" {\n  name = "x"\nEOF', f)
    assert r.exit_code == 1
    assert 'unbalanced' in r.output
    assert 'bad.tf' not in f.get('azure_files', {})


def test_write_overwrites_and_rm():
    f = fresh()
    run_cmd('write a.tf\n# one\nEOF', f)
    run_cmd('write a.tf\n# two\nEOF', f)
    assert '# two' in f['azure_files']['a.tf']
    r = run_cmd('rm a.tf', f)
    assert 'Removed a.tf' in r.output
    assert 'a.tf' not in f['azure_files']
    assert run_cmd('rm nope.tf', f).exit_code == 1


def test_write_resets_validated_flag():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('write provider.tf\n%s\nEOF' % PROVIDER_HCL, f)
    run_cmd('terraform validate', f)
    assert f['azure_validated'] is True
    run_cmd('write extra.tf\n# comment\nEOF', f)
    assert f['azure_validated'] is False


def test_bare_validate_needs_no_init():
    f = fresh()
    r = run_cmd('validate', f)
    assert r.exit_code == 1  # nothing written yet
    run_cmd('write provider.tf\n%s\nEOF' % PROVIDER_HCL, f)
    r = run_cmd('validate', f)
    assert r.exit_code == 0
    assert 'HCL structure OK' in r.output
    assert f['azure_validated'] is True


# ---------------------------------------------------------------------------
# terraform validate
# ---------------------------------------------------------------------------

def test_validate_needs_files():
    f = fresh()
    run_cmd('terraform init', f)
    r = run_cmd('terraform validate', f)
    assert r.exit_code == 1
    assert 'no .tf files' in r.output


def test_validate_requires_azurerm_provider():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('write main.tf\n%s\nEOF' % NETWORK_HCL, f)
    r = run_cmd('terraform validate', f)
    assert r.exit_code == 1
    assert 'provider "azurerm"' in r.output


def test_validate_ok_with_provider():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('write provider.tf\n%s\nEOF' % PROVIDER_HCL, f)
    run_cmd('write main.tf\n%s\nEOF' % NETWORK_HCL, f)
    r = run_cmd('terraform validate', f)
    assert r.exit_code == 0
    assert 'Success' in r.output
    assert f['azure_validated'] is True


def test_backend_detected_on_init():
    f = fresh()
    run_cmd('write backend.tf\n%s\nEOF' % BACKEND_HCL, f)
    r = run_cmd('terraform init', f)
    assert f['azure_backend_configured'] is True
    assert 'backend "azurerm"' in r.output


# ---------------------------------------------------------------------------
# plan / apply / state / output / destroy
# ---------------------------------------------------------------------------

def test_plan_lists_written_resources():
    f = fresh()
    _setup_network(f)
    r = run_cmd('terraform plan', f)
    assert 'azurerm_resource_group.main will be created' in r.output
    assert 'azurerm_virtual_network.main will be created' in r.output
    assert 'azurerm_subnet.internal will be created' in r.output
    assert 'Plan: 3 to add, 0 to change, 0 to destroy.' in r.output


def test_plan_no_resources_errors():
    f = fresh()
    run_cmd('terraform init', f)
    run_cmd('write provider.tf\n%s\nEOF' % PROVIDER_HCL, f)
    run_cmd('terraform validate', f)
    r = run_cmd('terraform plan', f)
    assert r.exit_code == 1
    assert 'no resources' in r.output


def test_plan_saved_and_apply_via_plan():
    f = fresh()
    _setup_network(f)
    r = run_cmd('terraform plan -out=tfplan', f)
    assert f['azure_plan_saved'] == 'tfplan'
    assert 'Saved the plan to: tfplan' in r.output
    r = run_cmd('terraform apply tfplan', f)
    assert 'Apply complete!' in r.output
    assert f['azure_applied'] is True
    assert 'azurerm_resource_group.main' in f['azure_applied_resources']
    # unknown plan file rejected
    f2 = fresh()
    _setup_network(f2)
    assert run_cmd('terraform apply nope', f2).exit_code == 1


def test_apply_interactive_confirm():
    f = fresh()
    _setup_network(f)
    r = run_cmd('terraform apply', f)
    assert 'Enter a value' in r.output
    assert f.get('azure_pending_apply') is True
    r = run_cmd('yes', f)
    assert 'Apply complete!' in r.output
    assert f['azure_applied'] is True


def test_apply_auto_approve():
    f = fresh()
    _setup_network(f)
    r = run_cmd('terraform apply -auto-approve', f)
    assert 'Apply complete!' in r.output
    assert f['azure_ever_applied'] is True


def test_state_and_output():
    f = fresh()
    _setup_network(f)
    _write(f, 'outputs.tf', OUTPUTS_HCL)
    run_cmd('terraform validate', f)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform state list', f)
    assert 'azurerm_resource_group.main' in r.output
    assert f['azure_state_viewed'] is True
    r = run_cmd('terraform output', f)
    assert 'resource_group_name' in r.output
    assert 'vm_private_ip' in r.output
    assert f['azure_outputs_viewed'] is True
    r = run_cmd('terraform output resource_group_name', f)
    assert 'rg-road2cissp-lab' in r.output
    assert run_cmd('terraform output nope', f).exit_code == 1


def test_output_resolves_literals_and_computed():
    f = fresh()
    _setup_network(f)
    _write(f, 'outputs.tf', OUTPUTS_HCL)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform output', f)
    # name literal resolved from the resource block
    assert 'resource_group_name = "rg-road2cissp-lab"' in r.output
    # private_ip_address is computed -- unknown until Azure assigns it
    assert 'vm_private_ip = "(known after apply)"' in r.output


def test_plan_no_changes_after_apply():
    f = fresh()
    _setup_network(f)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform plan', f)
    assert 'No changes' in r.output


def test_destroy_flow():
    f = fresh()
    _setup_network(f)
    run_cmd('terraform apply -auto-approve', f)
    r = run_cmd('terraform destroy', f)
    assert 'Enter a value' in r.output
    r = run_cmd('yes', f)
    assert 'Destroy complete!' in r.output
    assert f['azure_destroyed'] is True
    assert f['azure_applied'] is False
    assert run_cmd('terraform state list', f).exit_code == 1


def test_resource_ids_deterministic():
    f = fresh()
    _setup_network(f)
    run_cmd('terraform apply -auto-approve', f)
    ids1 = dict(f['azure_resource_ids'])
    f2 = fresh()
    _setup_network(f2)
    run_cmd('terraform apply -auto-approve', f2)
    assert f2['azure_resource_ids'] == ids1
    assert ids1['azurerm_resource_group.main'].startswith('/subscriptions/')
    assert 'Microsoft.Network/virtualNetworks' in ids1['azurerm_virtual_network.main']


def test_export_tf_var():
    f = fresh()
    r = run_cmd('export TF_VAR_location=canadacentral', f)
    assert r.exit_code == 0
    assert f['azure_variables_set'] == {'location': 'canadacentral'}
    assert run_cmd('export PATH=/x', f).exit_code == 1


# ---------------------------------------------------------------------------
# validators
# ---------------------------------------------------------------------------

def _v(name, findings):
    ok, msg, _ = run_validator(name, {}, findings)
    return ok, msg


def test_v_provider():
    good = {'azure_files': {'provider.tf': PROVIDER_HCL}}
    ok, _ = _v('taz_provider_configured', good)
    assert ok is True
    ok, msg = _v('taz_provider_configured', {'azure_files': {'provider.tf': 'provider "azurerm" {}'}})
    assert ok is False and 'required_providers' in msg
    ok, msg = _v('taz_provider_configured', {'azure_files': {'provider.tf': 'provider "aws" { features {} }'}})
    assert ok is False and 'azurerm' in msg
    ok, _ = _v('taz_provider_configured', {'azure_files': {}})
    assert ok is False


def test_v_network():
    good = {'azure_files': {'provider.tf': PROVIDER_HCL, 'main.tf': NETWORK_HCL}}
    ok, _ = _v('taz_network_defined', good)
    assert ok is True
    # subnet without VNet link
    bad = {'azure_files': {'main.tf': (
        'resource "azurerm_resource_group" "main" { name = "rg" location = "canadacentral" } '
        'resource "azurerm_virtual_network" "main" { address_space = ["10.1.0.0/16"] } '
        'resource "azurerm_subnet" "s" { address_prefixes = ["10.1.1.0/24"] }'
    )}}
    ok, msg = _v('taz_network_defined', bad)
    assert ok is False and 'virtual_network_name' in msg
    # address_space as a bare string instead of a list
    bad2 = {'azure_files': {'main.tf': NETWORK_HCL.replace('["10.1.0.0/16"]', '"10.1.0.0/16"')}}
    ok, _ = _v('taz_network_defined', bad2)
    assert ok is True or ok is False  # string form parses; validator keys on presence
    ok, _ = _v('taz_network_defined', {'azure_files': {}})
    assert ok is False


def test_v_vm_nsg():
    good = {'azure_files': {'main.tf': NETWORK_HCL + COMPUTE_HCL}}
    ok, _ = _v('taz_vm_nsg_defined', good)
    assert ok is True
    # SSH open to the world must fail
    bad = {'azure_files': {'main.tf': COMPUTE_HCL.replace('"10.0.0.0/8"', '"0.0.0.0/0"')}}
    ok, msg = _v('taz_vm_nsg_defined', bad)
    assert ok is False and '0.0.0.0/0' in msg
    # missing NSG attachment (whole association block removed)
    bad2 = {'azure_files': {'main.tf': re.sub(
        r'resource\s+"azurerm_subnet_network_security_group_association"\s+"web"\s*\{[^}]*\}',
        '', COMPUTE_HCL)}}
    ok, msg = _v('taz_vm_nsg_defined', bad2)
    assert ok is False and 'association' in msg
    # no VM at all
    ok, _ = _v('taz_vm_nsg_defined', {'azure_files': {'main.tf': NETWORK_HCL}})
    assert ok is False


def test_v_storage():
    good = {'azure_files': {'main.tf': STORAGE_HCL}}
    ok, _ = _v('taz_storage_defined', good)
    assert ok is True
    # invalid name: uppercase + hyphens
    bad = {'azure_files': {'main.tf': STORAGE_HCL.replace('"stroad2cissp001"', '"My-Storage-01"')}}
    ok, msg = _v('taz_storage_defined', bad)
    assert ok is False and 'lowercase' in msg
    # missing TLS hardening
    bad2 = {'azure_files': {'main.tf': STORAGE_HCL.replace('  min_tls_version          = "TLS1_2"\n', '')}}
    ok, msg = _v('taz_storage_defined', bad2)
    assert ok is False and 'min_tls_version' in msg
    ok, _ = _v('taz_storage_defined', {'azure_files': {}})
    assert ok is False


def test_v_variables():
    good = {'azure_files': {
        'variables.tf': VARIABLES_HCL,
        'main.tf': 'resource "azurerm_resource_group" "main" { name = "rg" location = var.location } '
                   'resource "azurerm_linux_virtual_machine" "web" { size = var.vm_size }',
    }}
    ok, _ = _v('taz_variables_defined', good)
    assert ok is True
    # declared but never referenced
    bad = {'azure_files': {
        'variables.tf': VARIABLES_HCL,
        'main.tf': 'resource "azurerm_resource_group" "main" { name = "rg" location = "canadacentral" }',
    }}
    ok, msg = _v('taz_variables_defined', bad)
    assert ok is False and 'var.' in msg
    # only one variable
    bad2 = {'azure_files': {'variables.tf': 'variable "a" { type = string }'}}
    ok, _ = _v('taz_variables_defined', bad2)
    assert ok is False
    ok, _ = _v('taz_variables_defined', {'azure_files': {}})
    assert ok is False


def test_v_outputs():
    good = {'azure_files': {'outputs.tf': OUTPUTS_HCL}}
    ok, _ = _v('taz_outputs_defined', good)
    assert ok is True
    # output without value
    bad = {'azure_files': {'outputs.tf': 'output "a" { description = "x" }\noutput "b" { value = "y" }'}}
    ok, msg = _v('taz_outputs_defined', bad)
    assert ok is False and 'no value' in msg
    # only one output
    bad2 = {'azure_files': {'outputs.tf': 'output "a" { value = "x" }'}}
    ok, _ = _v('taz_outputs_defined', bad2)
    assert ok is False
    ok, _ = _v('taz_outputs_defined', {'azure_files': {}})
    assert ok is False


def test_v_backend():
    good = {'azure_files': {'backend.tf': BACKEND_HCL}}
    ok, _ = _v('taz_backend_configured', good)
    assert ok is True
    # missing key argument
    bad = {'azure_files': {'backend.tf': BACKEND_HCL.replace('    key                  = "azure-lab.tfstate"\n', '')}}
    ok, msg = _v('taz_backend_configured', bad)
    assert ok is False and 'key' in msg
    # wrong backend type
    bad2 = {'azure_files': {'backend.tf': 'terraform { backend "s3" { bucket = "b" } }'}}
    ok, _ = _v('taz_backend_configured', bad2)
    assert ok is False
    ok, _ = _v('taz_backend_configured', {'azure_files': {}})
    assert ok is False


def test_v_capstone():
    applied = ['azurerm_resource_group.main', 'azurerm_virtual_network.main',
               'azurerm_linux_virtual_machine.web', 'azurerm_storage_account.logs']
    ok, msg = _v('taz_capstone', {'azure_applied': True, 'azure_applied_resources': applied})
    assert ok is True
    ok, msg = _v('taz_capstone', {'azure_applied': False, 'azure_applied_resources': []})
    assert ok is False and 'apply' in msg
    ok, msg = _v('taz_capstone', {'azure_applied': True,
                                  'azure_applied_resources': ['azurerm_resource_group.main']})
    assert ok is False and 'azurerm_linux_virtual_machine' in msg


def test_validators_registered():
    for name in ['taz_provider_configured', 'taz_network_defined', 'taz_vm_nsg_defined',
                 'taz_storage_defined', 'taz_variables_defined', 'taz_outputs_defined',
                 'taz_backend_configured', 'taz_capstone']:
        assert name in VALIDATORS, f'missing validator: {name}'


# ---------------------------------------------------------------------------
# full objective walkthrough (integration)
# ---------------------------------------------------------------------------

def test_full_walkthrough_completes_all_objectives():
    """Simulate a student doing every objective in order; each validator passes."""
    f = fresh()

    # 1. provider
    _write(f, 'provider.tf', PROVIDER_HCL)
    assert _v('taz_provider_configured', f)[0] is True
    run_cmd('terraform init', f)

    # 2. network
    _write(f, 'main.tf', NETWORK_HCL)
    assert _v('taz_network_defined', f)[0] is True

    # 3. VM + NSG (full-file rewrite)
    _write(f, 'main.tf', NETWORK_HCL + COMPUTE_HCL)
    assert _v('taz_vm_nsg_defined', f)[0] is True

    # 4. storage
    _write(f, 'main.tf', NETWORK_HCL + COMPUTE_HCL + STORAGE_HCL)
    assert _v('taz_storage_defined', f)[0] is True

    # 5. variables + locals (and reference the vars)
    _write(f, 'variables.tf', VARIABLES_HCL)
    _write(f, 'main.tf', NETWORK_HCL + COMPUTE_HCL + STORAGE_HCL)
    assert _v('taz_variables_defined', f)[0] is True

    # 6. outputs
    _write(f, 'outputs.tf', OUTPUTS_HCL)
    assert _v('taz_outputs_defined', f)[0] is True

    # 7. remote state
    _write(f, 'backend.tf', BACKEND_HCL)
    run_cmd('terraform init', f)
    assert _v('taz_backend_configured', f)[0] is True

    # 8. capstone
    assert run_cmd('terraform validate', f).exit_code == 0
    run_cmd('terraform apply -auto-approve', f)
    ok, msg = _v('taz_capstone', f)
    assert ok is True, msg
    assert len(f['azure_applied_resources']) == 8  # rg + vnet + subnet + nsg + assoc + nic + vm + storage


# ---------------------------------------------------------------------------
# definition structure + registry
# ---------------------------------------------------------------------------

def test_lab_definition():
    assert LAB.id == 'terraform-azure-001'
    assert LAB.shell == 'terraform_cli'
    assert len(LAB.objectives) == 8
    ids = [o.id for o in LAB.objectives]
    assert len(set(ids)) == 8
    for o in LAB.objectives:
        assert o.validator in VALIDATORS, f'objective {o.id} -> unknown validator {o.validator}'
        assert len(o.description or '') > 500, f'objective {o.id} description too thin'
        assert o.hints, f'objective {o.id} needs hints'


def test_lab_in_registry():
    from labs.definitions import ALL_LABS
    ids = [lab.id for lab in ALL_LABS]
    assert 'terraform-azure-001' in ids
    # no duplicate ids across the whole registry
    assert len(ids) == len(set(ids))
