"""Terraform for Azure lab: author real azurerm HCL and watch it become infrastructure.

The student writes every .tf file with the `write` heredoc workflow in the
extended terraform_cli shell. The shell parses resource/output blocks out of
the written files and simulates init -> validate -> plan -> apply ->
state/outputs against them. Nothing is executed and nothing is provisioned.

Every objective teaches HCL thoroughly: the description shows the exact code to
write with line-by-line explanations of the syntax -- resource groups, VNets,
subnets, NSGs, NICs, Linux VMs, storage accounts, variables, locals, outputs,
and the azurerm remote-state backend.

Validators are defined in this module via the shared @validator decorator, so
importing it registers them in VALIDATORS before registry.py checks objective
references. Validators read the student's written files (findings['azure_files']),
not command history.
"""
from __future__ import annotations

import re

from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget
from labs.validators import validator


def _files(findings):
    return findings.get('azure_files') or {}


def _all_hcl(findings):
    return '\n'.join(_files(findings).values())


def _has(pattern, findings):
    return bool(re.search(pattern, _all_hcl(findings)))


def _block_body(hcl, keyword, rtype, rname):
    """Body of the first `keyword "rtype" "rname" { ... }` block (brace-aware)."""
    m = re.search(keyword + r'\s+"' + re.escape(rtype) + r'"\s+"' + re.escape(rname) + r'"\s*\{', hcl)
    if not m:
        return None
    depth, i = 1, m.end()
    while i < len(hcl) and depth:
        if hcl[i] == '{':
            depth += 1
        elif hcl[i] == '}':
            depth -= 1
        i += 1
    return hcl[m.end():i - 1]


def _security_rules(hcl):
    """Yield the body of every `security_rule { ... }` block (brace-aware)."""
    for m in re.finditer(r'security_rule\s*\{', hcl):
        depth, i = 1, m.end()
        while i < len(hcl) and depth:
            if hcl[i] == '{':
                depth += 1
            elif hcl[i] == '}':
                depth -= 1
            i += 1
        yield hcl[m.end():i - 1]


# ---------------------------------------------------------------------------
# validators (outcome-based: they read the student's written .tf files)
# ---------------------------------------------------------------------------

@validator("taz_provider_configured")
def taz_provider_configured(args, findings):
    hcl = _all_hcl(findings)
    missing = []
    if not re.search(r'provider\s+"azurerm"', hcl):
        missing.append('a provider "azurerm" block')
    if not re.search(r'required_providers', hcl):
        missing.append('a required_providers block pinning the azurerm version')
    if not re.search(r'hashicorp/azurerm', hcl):
        missing.append('source = "hashicorp/azurerm" in required_providers')
    if not re.search(r'features\s*\{', hcl):
        missing.append('a features {} block inside provider "azurerm" (required by the provider)')
    if not missing:
        return True, "azurerm provider configured with a pinned version.", None
    return False, f"provider.tf still needs: {', '.join(missing)}.", None


@validator("taz_network_defined")
def taz_network_defined(args, findings):
    hcl = _all_hcl(findings)
    if not re.search(r'resource\s+"azurerm_resource_group"', hcl):
        return False, 'No resource "azurerm_resource_group" block found. Every Azure resource needs a group.', None
    missing = []
    if not re.search(r'resource\s+"azurerm_virtual_network"', hcl):
        missing.append('an azurerm_virtual_network')
    if not re.search(r'address_space\s*=', hcl):
        missing.append('address_space on the VNet (a LIST, e.g. ["10.1.0.0/16"])')
    if not re.search(r'resource\s+"azurerm_subnet"', hcl):
        missing.append('an azurerm_subnet (separate resource in Azure)')
    if not re.search(r'address_prefixes\s*=', hcl):
        missing.append('address_prefixes on the subnet')
    if missing:
        return False, f"Network still needs: {', '.join(missing)}.", None
    # the subnet must actually attach to the VNet via a reference
    if not re.search(r'virtual_network_name\s*=\s*azurerm_virtual_network\.', hcl):
        return False, 'Link the subnet to the VNet: virtual_network_name = azurerm_virtual_network.<name>.name.', None
    return True, "Resource group, VNet and subnet defined and linked.", None


@validator("taz_vm_nsg_defined")
def taz_vm_nsg_defined(args, findings):
    hcl = _all_hcl(findings)
    if not re.search(r'resource\s+"azurerm_linux_virtual_machine"', hcl):
        return False, 'No resource "azurerm_linux_virtual_machine" block found.', None
    missing = []
    if not re.search(r'size\s*=', hcl):
        missing.append('a size argument (e.g. "Standard_B1s")')
    if not re.search(r'admin_ssh_key', hcl):
        missing.append('an admin_ssh_key block (key-based login, no passwords)')
    if not re.search(r'network_interface_ids\s*=', hcl):
        missing.append('network_interface_ids (VMs attach via a NIC, never directly to a subnet)')
    if missing:
        return False, f"VM definition still needs: {', '.join(missing)}.", None
    if not re.search(r'resource\s+"azurerm_network_security_group"', hcl):
        return False, 'No resource "azurerm_network_security_group" block found.', None
    rules = list(_security_rules(hcl))
    if not rules:
        return False, 'The NSG has no security_rule blocks. Add at least an HTTP allow rule.', None
    for body in rules:
        if re.search(r'destination_port_range\s*=\s*"22"', body) and re.search(
                r'source_address_prefix\s*=\s*"0\.0\.0\.0/0"', body):
            return False, ('SECURITY: an SSH rule allows port 22 from 0.0.0.0/0. '
                           'Restrict source_address_prefix to your corporate range (e.g. "10.0.0.0/8").'), None
    # NSG must be attached: association resource or NIC reference
    if not (re.search(r'resource\s+"azurerm_subnet_network_security_group_association"', hcl)
            or re.search(r'network_security_group_id\s*=', hcl)):
        return False, ('The NSG is defined but not attached to anything. Add an '
                       'azurerm_subnet_network_security_group_association resource.'), None
    return True, "Linux VM (SSH key auth, NIC-attached) behind a least-privilege NSG.", None


@validator("taz_storage_defined")
def taz_storage_defined(args, findings):
    hcl = _all_hcl(findings)
    m = re.search(r'resource\s+"azurerm_storage_account"\s+"[^"]+"', hcl)
    if not m:
        return False, 'No resource "azurerm_storage_account" block found.', None
    body = _block_body(hcl, 'resource', 'azurerm_storage_account',
                       re.search(r'resource\s+"azurerm_storage_account"\s+"([^"]+)"', hcl).group(1))
    missing = []
    if not re.search(r'account_tier\s*=', hcl):
        missing.append('account_tier (Standard or Premium)')
    if not re.search(r'account_replication_type\s*=', hcl):
        missing.append('account_replication_type (LRS/ZRS/GRS/RA-GRS)')
    if not re.search(r'min_tls_version\s*=', hcl):
        missing.append('min_tls_version (harden to "TLS1_2")')
    if missing:
        return False, f"Storage account still needs: {', '.join(missing)}.", None
    nm = re.search(r'name\s*=\s*"([^"]*)"', body or '')
    if nm and not re.fullmatch(r'[a-z0-9]{3,24}', nm.group(1)):
        return False, (f'Storage account name "{nm.group(1)}" is invalid: Azure requires '
                       '3-24 chars, lowercase letters and numbers only, globally unique.'), None
    return True, "Storage account defined with hardened TLS and valid naming.", None


@validator("taz_variables_defined")
def taz_variables_defined(args, findings):
    hcl = _all_hcl(findings)
    var_blocks = re.findall(r'variable\s+"([^"]+)"\s*\{', hcl)
    if len(var_blocks) < 2:
        return False, f'Found {len(var_blocks)} variable block(s); declare at least 2 in variables.tf.', None
    missing = []
    if not re.search(r'type\s*=\s*(string|number|bool|list\(|map\(|object\()', hcl):
        missing.append('type declarations on your variables')
    if not re.search(r'description\s*=', hcl):
        missing.append('description on your variables (documents the interface)')
    if not re.search(r'sensitive\s*=\s*true', hcl):
        missing.append('sensitive = true on the secret variable (e.g. the DB password)')
    if not re.search(r'locals\s*\{', hcl):
        missing.append('a locals block (for DRY computed values like common_tags)')
    if missing:
        return False, f"variables.tf still needs: {', '.join(missing)}.", None
    if len(re.findall(r'var\.', hcl)) < 2:
        return False, 'You declared variables but barely use them: reference at least two as var.<name>.', None
    return True, "Variables typed, described, validated; secrets marked sensitive; locals in use.", None


@validator("taz_outputs_defined")
def taz_outputs_defined(args, findings):
    hcl = _all_hcl(findings)
    count = 0
    for m in re.finditer(r'output\s+"([^"]+)"\s*\{', hcl):
        depth, i = 1, m.end()
        while i < len(hcl) and depth:
            depth += (hcl[i] == '{') - (hcl[i] == '}')
            i += 1
        body = hcl[m.end():i - 1]
        if re.search(r'value\s*=', body):
            count += 1
        else:
            return False, f'Output "{m.group(1)}" has no value argument: output "name" {{ value = ... }}.', None
    if count < 2:
        return False, f'Found {count} output block(s) with values; write at least 2 in outputs.tf.', None
    return True, f"{count} outputs exposing post-apply values.", None


@validator("taz_backend_configured")
def taz_backend_configured(args, findings):
    hcl = _all_hcl(findings)
    if not re.search(r'backend\s+"azurerm"', hcl):
        if findings.get('azure_backend_configured'):
            return True, "azurerm remote backend configured (detected at init).", None
        return False, 'No backend "azurerm" block found. Add terraform { backend "azurerm" { ... } }.', None
    missing = [a for a in ('resource_group_name', 'storage_account_name', 'container_name', 'key')
               if not re.search(rf'{a}\s*=', hcl)]
    if missing:
        return False, f'azurerm backend still needs: {", ".join(missing)}.', None
    return True, "Remote state backend (Azure Blob Storage) configured.", None


@validator("taz_capstone")
def taz_capstone(args, findings):
    if not findings.get('azure_applied'):
        return False, 'Nothing deployed yet. Run terraform apply to provision the stack.', None
    applied = findings.get('azure_applied_resources') or []
    types = {a.split('.')[0] for a in applied}
    need = {'azurerm_resource_group', 'azurerm_virtual_network',
            'azurerm_linux_virtual_machine', 'azurerm_storage_account'}
    missing = sorted(need - types)
    if missing:
        return False, f"Deployed state is missing: {', '.join(missing)}. Apply the full configuration.", None
    return True, f"Full Azure stack deployed: {len(applied)} resources in state.", None


# ---------------------------------------------------------------------------
# lab definition
# ---------------------------------------------------------------------------

TERRAFORM_AZURE_LAB = LabDefinition(
    id="terraform-azure-001",
    slug="terraform-azure",
    title="Terraform for Azure: Write Real HCL",
    description=(
        "Author production-style Terraform for Azure from scratch: the azurerm provider, "
        "resource groups, VNets and subnets, a Linux VM behind a least-privilege NSG, a "
        "hardened storage account, typed variables with locals, outputs, and the Azure "
        "Storage remote-state backend -- then plan and apply the whole stack. Every step "
        "teaches the HCL syntax line by line -- you write every file."
    ),
    category="devops",  # type: ignore[assignment]
    difficulty="intermediate",
    estimated_minutes=75,
    shell="terraform_cli",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/iac:latest",
        workdir="/home/student/azure-infra",
        idle_timeout_minutes=20,
        max_runtime_minutes=120,
        deny_internet_egress=True,
    ),
    targets=[LabTarget(hostname="azure-infra", role="Terraform working directory for Azure")],
    objectives=[
        LabObjective(
            id="provider-setup",
            label="Configure the azurerm provider",
            validator="taz_provider_configured",
            description=(
                "Write provider.tf. Every Terraform project starts by declaring WHICH provider "
                "plugin to use and pinning its version. The Azure provider is `azurerm`:\n\n"
                '  terraform {\n'
                '    required_version = ">= 1.5"          # the CLI version this code needs\n\n'
                '    required_providers {\n'
                '      azurerm = {\n'
                '        source  = "hashicorp/azurerm"   # registry address of the plugin\n'
                '        version = "~> 3.0"              # ~> 3.0 means >= 3.0, < 4.0 (safe upgrades)\n'
                '      }\n'
                '    }\n'
                '  }\n\n'
                '  provider "azurerm" {\n'
                '    features {}                          # REQUIRED -- even empty. The provider\n'
                '  }                                      # refuses to run without this block.\n\n'
                "HOW IT WORKS, LINE BY LINE:\n"
                "- `terraform {}` is meta-configuration: it configures Terraform itself, not cloud "
                "resources. Everything about versions and backends lives here.\n"
                "- `required_version = \">= 1.5\"` fails fast if someone runs this with an ancient CLI.\n"
                "- `required_providers` maps the LOCAL name `azurerm` to the real plugin "
                "`hashicorp/azurerm`, so `terraform init` knows exactly what to download. The `~>` "
                "pessimistic operator allows patch/minor upgrades (3.1, 3.116) but blocks the next "
                "major (4.0), which is where breaking changes live.\n"
                "- `provider \"azurerm\"` configures the plugin. `features {}` is an azurerm quirk: "
                "an empty block that opts into provider-managed behaviors (like how resource-group "
                "deletion is handled). Forget it and init fails -- a classic first error.\n"
                "- Authentication (in real life): the provider reads `az login` credentials, a "
                "service principal (`ARM_CLIENT_ID`/`ARM_CLIENT_SECRET`), or a managed identity. "
                "This lab simulates auth, so no credentials are needed.\n\n"
                "Write it with the `write` command: type `write provider.tf`, paste the HCL above, "
                "then a line containing only `EOF`. Then run `terraform init` to install the "
                "provider and `terraform validate` to check your syntax."
            ),
            hints=[
                "write provider.tf -- paste the HCL, end with a line containing only EOF.",
                "terraform init installs hashicorp/azurerm v3.x; terraform validate checks syntax.",
                "The validator wants: provider \"azurerm\", required_providers, hashicorp/azurerm, features {}.",
            ],
        ),
        LabObjective(
            id="network-rg-vnet",
            label="Resource group, VNet, and subnet (main.tf walkthrough)",
            validator="taz_network_defined",
            description=(
                "Write main.tf with the network foundation. Azure's hierarchy differs from AWS: "
                "EVERY resource must live in a RESOURCE GROUP -- there is no floating in a region.\n\n"
                '  resource "azurerm_resource_group" "main" {\n'
                '    name     = "rg-road2cissp-lab"   # Azure-visible name, unique in subscription\n'
                '    location = "canadacentral"       # Toronto -- Canadian data residency\n'
                '    tags = {                         # tags is a MAP argument (key = value)\n'
                '      Environment = "lab"\n'
                '      ManagedBy   = "terraform"\n'
                '    }\n'
                '  }\n\n'
                '  resource "azurerm_virtual_network" "main" {\n'
                '    name                = "road2cissp-vnet"\n'
                '    address_space       = ["10.1.0.0/16"]   # a LIST: VNets hold MULTIPLE ranges\n'
                '    location            = azurerm_resource_group.main.location        # REFERENCE\n'
                '    resource_group_name = azurerm_resource_group.main.name           # REFERENCE\n'
                '  }\n\n'
                '  resource "azurerm_subnet" "internal" {\n'
                '    name                 = "internal"\n'
                '    resource_group_name  = azurerm_resource_group.main.name\n'
                '    virtual_network_name = azurerm_virtual_network.main.name  # link to the VNet\n'
                '    address_prefixes     = ["10.1.1.0/24"]   # must sit INSIDE the VNet range\n'
                '  }\n\n'
                "HOW IT WORKS, LINE BY LINE:\n"
                "- `resource \"azurerm_resource_group\" \"main\"`: the general form is "
                "`resource \"<PROVIDER>_<TYPE>\" \"<LOCAL_NAME>\" { ... }`. The TYPE "
                "(`azurerm_resource_group`) is the Azure object; the LOCAL NAME (`main`) is only "
                "how YOU refer to it: `azurerm_resource_group.main`.\n"
                "- The resource group is a lifecycle AND billing boundary: delete the group and "
                "Azure deletes everything inside it. `location` pins the region.\n"
                "- `address_space = [\"10.1.0.0/16\"]` is a LIST (square brackets), not a string: "
                "a VNet can hold several non-overlapping ranges. AWS uses one `cidr_block` string.\n"
                "- `location = azurerm_resource_group.main.location` is a REFERENCE "
                "(<TYPE>.<NAME>.<ATTRIBUTE>). References do two jobs: they copy the value, and "
                "they build the DEPENDENCY GRAPH -- Terraform creates the group BEFORE the VNet "
                "automatically. You never order resources by hand.\n"
                "- In Azure, subnets are SEPARATE resources (not inline blocks like AWS). "
                "`virtual_network_name` wires the subnet to its VNet; `address_prefixes` (also a "
                "list) must fall within the VNet's address space.\n"
                "- Nearly every Azure resource repeats `location` and `resource_group_name`: Azure "
                "has no implicit region context like an AWS provider `region`.\n\n"
                "Write main.tf with `write main.tf` (paste, end with EOF), then `terraform validate`."
            ),
            hints=[
                "write main.tf -- paste all three blocks, end with EOF.",
                "address_space and address_prefixes are LISTS: [\"10.1.0.0/16\"], not bare strings.",
                "The subnet links via virtual_network_name = azurerm_virtual_network.main.name.",
            ],
        ),
        LabObjective(
            id="vm-nsg",
            label="Linux VM behind a least-privilege NSG",
            validator="taz_vm_nsg_defined",
            description=(
                "Append compute to main.tf. REWRITE the whole file with `write main.tf`: include "
                "the network blocks from objective 2 PLUS the blocks below (the shell overwrites).\n\n"
                '  resource "azurerm_network_security_group" "web" {\n'
                '    name                = "web-nsg"\n'
                '    location            = azurerm_resource_group.main.location\n'
                '    resource_group_name = azurerm_resource_group.main.name\n\n'
                '    security_rule {                       # repeatable NESTED BLOCK\n'
                '      name                       = "allow-http"\n'
                '      priority                   = 100    # LOWER number = evaluated FIRST\n'
                '      direction                  = "Inbound"\n'
                '      access                     = "Allow"  # or "Deny" -- Azure supports both!\n'
                '      protocol                   = "Tcp"\n'
                '      source_port_range          = "*"\n'
                '      destination_port_range     = "80"\n'
                '      source_address_prefix      = "*"    # public web: anyone\n'
                '      destination_address_prefix = "*"\n'
                '    }\n\n'
                '    security_rule {\n'
                '      name                       = "allow-ssh"\n'
                '      priority                   = 110    # evaluated AFTER allow-http\n'
                '      direction                  = "Inbound"\n'
                '      access                     = "Allow"\n'
                '      protocol                   = "Tcp"\n'
                '      source_port_range          = "*"\n'
                '      destination_port_range     = "22"\n'
                '      source_address_prefix      = "10.0.0.0/8"  # corporate range, NOT 0.0.0.0/0\n'
                '      destination_address_prefix = "*"\n'
                '    }\n'
                '  }\n\n'
                '  resource "azurerm_subnet_network_security_group_association" "web" {\n'
                '    subnet_id                 = azurerm_subnet.internal.id\n'
                '    network_security_group_id = azurerm_network_security_group.web.id\n'
                '  }\n\n'
                '  resource "azurerm_network_interface" "web" {\n'
                '    name                = "web-nic"\n'
                '    location            = azurerm_resource_group.main.location\n'
                '    resource_group_name = azurerm_resource_group.main.name\n'
                '    ip_configuration {\n'
                '      name                          = "internal"\n'
                '      subnet_id                     = azurerm_subnet.internal.id\n'
                '      private_ip_address_allocation = "Dynamic"\n'
                '    }\n'
                '  }\n\n'
                '  resource "azurerm_linux_virtual_machine" "web" {\n'
                '    name                = "road2cissp-vm"\n'
                '    resource_group_name = azurerm_resource_group.main.name\n'
                '    location            = azurerm_resource_group.main.location\n'
                '    size                = "Standard_B1s"   # ~ t3.micro: burstable, cheapest\n'
                '    admin_username      = "azureuser"\n'
                '    network_interface_ids = [azurerm_network_interface.web.id]  # LIST of IDs\n'
                '    admin_ssh_key {\n'
                '      username   = "azureuser"\n'
                '      public_key = file("~/.ssh/id_rsa.pub")  # file() reads at PLAN time\n'
                '    }\n'
                '    os_disk {\n'
                '      caching              = "ReadWrite"\n'
                '      storage_account_type = "Standard_LRS"   # locally-redundant disk\n'
                '    }\n'
                '    source_image_reference {\n'
                '      publisher = "Canonical"                # marketplace image coordinates\n'
                '      offer     = "0001-com-ubuntu-server-jammy"\n'
                '      sku       = "22_04-lts"\n'
                '      version   = "latest"\n'
                '    }\n'
                '  }\n\n'
                "HOW IT WORKS, LINE BY LINE:\n"
                "- NSGs differ from AWS security groups in three exam-relevant ways: they support "
                "explicit DENY rules, every rule has a PRIORITY (100-4096, lower wins), and "
                "`direction` is explicit (\"Inbound\"/\"Outbound\"). Design pattern: specific allows "
                "at low priorities, broad denies high. Like AWS, NSGs are STATEFUL -- return "
                "traffic is automatic.\n"
                "- Attaching the NSG is its OWN resource "
                "(`azurerm_subnet_network_security_group_association`): in Azure, relationships "
                "are often managed objects with their own lifecycle.\n"
                "- VMs NEVER attach to subnets directly: they attach to a NIC, the NIC attaches "
                "to the subnet. The NIC is also where public IPs, DNS, and accelerated networking "
                "live. Hence `network_interface_ids` is a LIST even with one NIC.\n"
                "- `azurerm_linux_virtual_machine` is the current resource (the old "
                "`azurerm_virtual_machine` is deprecated). `admin_ssh_key` with `file()` inlines "
                "your public key at plan time -- passwords are disabled by default.\n"
                "- `size = \"Standard_B1s\"`: format is Standard_[Family][vCPUs]s. "
                "`source_image_reference` pins publisher/offer/sku/version; `latest` floats, so "
                "pin a version in production.\n"
                "- SSH is restricted to 10.0.0.0/8: least privilege is the default posture.\n\n"
                "Rewrite main.tf completely (network + compute), then `terraform validate` and "
                "`terraform plan` -- read the plan: it should list every new resource."
            ),
            hints=[
                "write main.tf must contain the FULL file: objective 2 blocks + the new ones.",
                "cat main.tf shows what you have; copy it, append the new blocks, re-write.",
                "SSH rule: source_address_prefix = \"10.0.0.0/8\" -- 0.0.0.0/0 fails the validator.",
            ],
        ),
        LabObjective(
            id="storage-account",
            label="Hardened storage account",
            validator="taz_storage_defined",
            description=(
                "Append a storage account to main.tf (again: rewrite the full file). One account "
                "provides blob, file, queue, and table storage:\n\n"
                '  resource "azurerm_storage_account" "logs" {\n'
                '    name                     = "stroad2cissp001"  # GLOBALLY unique, see rules\n'
                '    resource_group_name      = azurerm_resource_group.main.name\n'
                '    location                 = azurerm_resource_group.main.location\n'
                '    account_tier             = "Standard"   # Standard vs Premium (performance)\n'
                '    account_replication_type = "LRS"        # LRS / ZRS / GRS / RA-GRS\n'
                '    min_tls_version          = "TLS1_2"     # never allow TLS 1.0/1.1\n'
                '    allow_nested_items_to_be_public = false  # no anonymous blob access\n'
                '    tags = { Environment = "lab" }\n'
                '  }\n\n'
                "HOW IT WORKS, LINE BY LINE:\n"
                "- NAMING RULES (a favorite exam trap): the name must be GLOBALLY unique across ALL "
                "of Azure, lowercase letters and numbers ONLY, 3-24 characters. Terraform cannot "
                "check uniqueness at plan time -- a taken name fails at APPLY. Real code generates "
                "names with a random suffix.\n"
                "- `account_tier` + `account_replication_type` define the durability/cost trade-off: "
                "LRS keeps 3 copies in ONE datacenter (cheapest); ZRS spreads across zones; GRS "
                "replicates to a second region; RA-GRS adds read access to the secondary.\n"
                "- `min_tls_version = \"TLS1_2\"` and `allow_nested_items_to_be_public = false` are "
                "security hardening every storage account should carry -- misconfigured public "
                "blobs are a classic breach vector.\n\n"
                "Rewrite main.tf with the storage block added, then `terraform validate`."
            ),
            hints=[
                "Storage names: lowercase + numbers only, 3-24 chars, globally unique.",
                "account_replication_type = \"LRS\" is the cheapest; min_tls_version = \"TLS1_2\".",
                "Full-file rewrite again -- the shell overwrites main.tf on each write.",
            ],
        ),
        LabObjective(
            id="variables-locals",
            label="Variables and locals (variables.tf)",
            validator="taz_variables_defined",
            description=(
                "Hardcoded values don't scale across environments -- parameterize with "
                "variables.tf, and update main.tf to USE them:\n\n"
                '  variable "location" {\n'
                '    description = "Azure region for all resources"  # documents the interface\n'
                '    type        = string               # string | number | bool | list(...) |\n'
                '    default     = "canadacentral"      # map(...) | object({...})\n'
                '  }\n\n'
                '  variable "vm_size" {\n'
                '    description = "Azure VM size"\n'
                '    type        = string\n'
                '    default     = "Standard_B1s"\n'
                '  }\n\n'
                '  variable "db_admin_password" {\n'
                '    description = "Admin password for the database -- never commit a real one"\n'
                '    type        = string\n'
                '    sensitive   = true              # hidden from CLI output (still in state!)\n'
                '    validation {                    # fail FAST at plan time\n'
                '      condition     = length(var.db_admin_password) >= 12\n'
                '      error_message = "Password must be at least 12 characters."\n'
                '    }\n'
                '  }\n\n'
                '  locals {                          # computed values, INTERNAL only\n'
                '    common_tags = {                 # define once, use everywhere (DRY)\n'
                '      Environment = "lab"\n'
                '      ManagedBy   = "terraform"\n'
                '    }\n'
                '  }\n\n'
                "HOW IT WORKS, LINE BY LINE:\n"
                "- A `variable` block DECLARES an input: `description` (required by style guides), "
                "`type` (type-checked at plan), optional `default` (no default = Terraform PROMPTS "
                "for a value), `sensitive = true` (redacts CLI output), and `validation` blocks "
                "with a boolean `condition` and a human `error_message`.\n"
                "- You READ variables as `var.<name>` -- e.g. `location = var.location` in main.tf. "
                "Update your resource group and VNet to use `var.location`, and the VM to use "
                "`var.vm_size`.\n"
                "- PRECEDENCE (lowest to highest): `default` < `terraform.tfvars` file < "
                "`*.auto.tfvars` < `-var=\"k=v\"` flag < `TF_VAR_k` environment variable. Try: "
                "`export TF_VAR_vm_size=Standard_B2s` then plan.\n"
                "- `locals` are NOT inputs: they can't be set from outside, but they can reference "
                "variables, resources, and functions. Perfect for shared tags and computed names. "
                "Read them as `local.common_tags`.\n\n"
                "Write variables.tf, update main.tf to reference var.location / var.vm_size, then "
                "`terraform validate`."
            ),
            hints=[
                "write variables.tf with at least 2 typed, described variables + a sensitive one + locals.",
                "Reference them: var.location in the resource group, var.vm_size in the VM.",
                "Try the precedence chain: export TF_VAR_vm_size=Standard_B2s, then terraform plan.",
            ],
        ),
        LabObjective(
            id="outputs",
            label="Outputs (outputs.tf)",
            validator="taz_outputs_defined",
            description=(
                "Outputs are the configuration's PUBLIC API -- what `terraform apply` prints and "
                "what other configurations can consume:\n\n"
                '  output "resource_group_name" {\n'
                '    description = "Name of the resource group"   # documents the contract\n'
                '    value       = azurerm_resource_group.main.name\n'
                '  }\n\n'
                '  output "vm_private_ip" {\n'
                '    description = "Private IP of the web VM"\n'
                '    value       = azurerm_network_interface.web.private_ip_address\n'
                '  }\n\n'
                '  output "storage_account_name" {\n'
                '    description = "Globally unique storage account name"\n'
                '    value       = azurerm_storage_account.logs.name\n'
                '  }\n\n'
                "HOW IT WORKS, LINE BY LINE:\n"
                "- `output \"<name>\" { value = <expression> }`: the value can be any expression -- "
                "usually a resource attribute like `.name` or `.private_ip_address` that is only "
                "known AFTER apply.\n"
                "- After apply, `terraform output` lists all outputs; `terraform output <name>` "
                "prints one. Other stacks read them via `terraform_remote_state` data sources or "
                "module outputs -- this is how teams split infrastructure across boundaries.\n"
                "- `sensitive = true` on an output redacts it from console output (same caveat as "
                "variables: it is still in the state file).\n\n"
                "Write outputs.tf with at least 2 outputs (each with a value), then "
                "`terraform validate`."
            ),
            hints=[
                "write outputs.tf -- every output block needs a value = ... argument.",
                "Reference real resources: azurerm_resource_group.main.name, etc.",
                "terraform output only works after apply -- that comes next.",
            ],
        ),
        LabObjective(
            id="remote-state",
            label="Remote state in Azure Storage (backend.tf)",
            validator="taz_backend_configured",
            description=(
                "Local terraform.tfstate doesn't survive laptops or teams -- BACKENDS store state "
                "remotely. Write backend.tf:\n\n"
                '  terraform {\n'
                '    backend "azurerm" {\n'
                '      resource_group_name  = "rg-terraform-state"   # must ALREADY exist\n'
                '      storage_account_name = "sttfstate00001"        # must ALREADY exist\n'
                '      container_name       = "tfstate"              # blob container (like a bucket)\n'
                '      key                  = "azure-lab.tfstate"    # the blob holding YOUR state\n'
                '    }\n'
                '  }\n\n'
                "HOW IT WORKS, LINE BY LINE:\n"
                "- `backend \"azurerm\"` tells Terraform: don't write terraform.tfstate locally -- "
                "PUT it as a blob at `container_name`/`key` in that storage account. `key` is just "
                "an object path, so teams share one account with many keys (one per "
                "project/environment).\n"
                "- LOCKING is automatic: Azure blob LEASES prevent two applies from running at "
                "once -- a teammate applying simultaneously gets a lock error instead of corrupting "
                "state. (AWS needs a separate DynamoDB table for this; Azure gets it free.)\n"
                "- State is encrypted at rest by default -- critical, because state contains "
                "secrets in plaintext (remember: `sensitive` only hides console output!).\n"
                "- CHICKEN-AND-EGG: the backend storage must exist BEFORE init. Create it once "
                "manually (or with a bootstrap config), then point every project at it.\n"
                "- After writing backend.tf, run `terraform init` AGAIN: init is what configures "
                "backends, and it offers to migrate your local state into the blob.\n\n"
                "Write backend.tf, re-run `terraform init`, and confirm the backend message."
            ),
            hints=[
                "backend \"azurerm\" needs all four: resource_group_name, storage_account_name, container_name, key.",
                "Backends are configured by INIT, not validate -- run terraform init after writing.",
                "The shell reports the backend migration when backend.tf is present.",
            ],
        ),
        LabObjective(
            id="apply-capstone",
            label="Capstone: plan, apply, and verify the full stack",
            validator="taz_capstone",
            description=(
                "Assemble everything: review the plan, deploy, and inspect state and outputs.\n\n"
                "  1. `terraform plan` -- read it like a contract. Every `+ resource` line is a "
                "     promise. Check: is the NSG SSH rule still restricted? Is the storage name "
                "     valid? The plan is your last review gate before real money is spent.\n"
                "  2. `terraform plan -out=tfplan` -- save the reviewed plan to a file.\n"
                "  3. `terraform apply tfplan` -- execute EXACTLY the saved plan (no re-planning, "
                "     no surprises), or `terraform apply -auto-approve` to skip the prompt.\n"
                "  4. `terraform state list` -- every resource Terraform now tracks.\n"
                "  5. `terraform output` -- your outputs.tf values, resolved after apply.\n\n"
                "HOW IT ALL FITS: the provider block (objective 1) authenticated the plugin; the "
                "resource group (2) contains everything; references wired the VNet, subnet, NSG, "
                "NIC, and VM together in dependency order (3); the storage account (4) hardened "
                "with TLS 1.2; variables (5) parameterized region and size; outputs (6) expose the "
                "results; the backend (7) holds state where the team can share and lock it. "
                "Running `terraform plan` again now reports 'No changes' -- configuration and "
                "reality agree, which is the entire point of IaC.\n\n"
                "Finish: apply the full stack, then verify with state list and output."
            ),
            hints=[
                "terraform plan first -- read every + line before you approve anything.",
                "terraform apply tfplan (or -auto-approve) to deploy.",
                "Verify: terraform state list and terraform output.",
            ],
        ),
    ],
)
