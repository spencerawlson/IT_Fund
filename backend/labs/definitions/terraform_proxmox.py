"""Terraform for Proxmox VE lab: write real HCL against the bpg/proxmox provider.

Progression: provider setup (API token) -> VM from a cloud-init template
(main.tf line-by-line walkthrough) -> LXC container -> variables.tf (node
names, IPs, secrets) -> outputs.tf (guest IPs) -> linked vs full clones
(find and fix the clone block) -> a realistic homelab stack (2 VMs + 1 LXC)
-> destroy.

Uses the `terraform_cli` shell (proxmox scenario): the working directory
starts empty and the student WRITES every .tf file with `write <file>`
(heredoc, ends with EOF) or `write <file> --scaffold` for the expert
reference. Every objective's description teaches the HCL being written,
line by line.

Validators are defined in this module (not labs/validators.py) via the
shared @validator decorator, so importing this module registers them in
VALIDATORS before registry.py checks objective references. Validators are
outcome-based: they read findings (including written .tf file contents),
not command history.
"""
from __future__ import annotations

import re

from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget
from labs.validators import validator


# ---------------------------------------------------------------------------
# helpers: inspect written .tf content from findings
# ---------------------------------------------------------------------------

def _written(findings, name: str) -> str:
    files = findings.get("px_files") or {}
    return files.get(name, "")


def _stage(findings) -> str:
    main = _written(findings, "main.tf")
    vms = len(re.findall(r'resource\s+"proxmox_virtual_environment_vm"', main))
    cts = len(re.findall(r'resource\s+"proxmox_virtual_environment_container"', main))
    if vms >= 2 and cts >= 1:
        return "stack"
    if vms >= 1 and cts >= 1:
        return "vm+lxc"
    if vms >= 1:
        return "vm"
    return "empty"


def _clone_is_full(main: str) -> bool:
    blocks = re.findall(r"clone\s*\{(.*?)\}", main, re.DOTALL)
    if not blocks:
        return False
    return all(
        re.search(r"\bfull\s*=\s*true", b) or re.search(r"\bfull_clone\s*=\s*true", b)
        for b in blocks
    )


# ---------------------------------------------------------------------------
# validators (outcome-based: they read findings, not command history)
# ---------------------------------------------------------------------------

@validator("px_provider_configured")
def px_provider_configured(args, findings):
    versions = _written(findings, "versions.tf")
    problems = []
    if "bpg/proxmox" not in versions:
        problems.append("versions.tf must declare the bpg/proxmox provider in required_providers")
    if 'provider "proxmox"' not in versions:
        problems.append('versions.tf must contain a provider "proxmox" block (endpoint + api_token)')
    if "api_token" not in versions:
        problems.append("the provider block must authenticate with api_token (never a hardcoded password)")
    if not findings.get("init_done"):
        problems.append("run terraform init to download the provider")
    if problems:
        return False, "Proxmox provider not configured: " + "; ".join(problems) + ".", None
    return True, "bpg/proxmox provider declared, API token configured, init complete.", None


@validator("px_vm_deployed")
def px_vm_deployed(args, findings):
    main = _written(findings, "main.tf")
    problems = []
    if 'resource "proxmox_virtual_environment_vm"' not in main:
        problems.append("main.tf must declare a proxmox_virtual_environment_vm resource")
    if "clone" not in main:
        problems.append("the VM should clone from a cloud-init template (clone block)")
    if "initialization" not in main:
        problems.append("the VM needs an initialization block (cloud-init: IP, user)")
    if not findings.get("validated"):
        problems.append("run terraform validate")
    if not findings.get("ever_applied"):
        problems.append("run terraform apply to create the VM")
    if problems:
        return False, "VM not deployed: " + "; ".join(problems) + ".", None
    return True, "VM declared in HCL (clone + cloud-init) and applied.", None


@validator("px_lxc_deployed")
def px_lxc_deployed(args, findings):
    main = _written(findings, "main.tf")
    problems = []
    if 'resource "proxmox_virtual_environment_container"' not in main:
        problems.append('main.tf must declare a proxmox_virtual_environment_container resource')
    if "template_file_id" not in main:
        problems.append("the container needs operating_system.template_file_id (an OS template archive)")
    if "unprivileged" not in main:
        problems.append("set unprivileged = true (root in container != root on host)")
    if _stage(findings) not in ("vm+lxc", "stack"):
        problems.append("main.tf should now manage the VM *and* the container")
    if not findings.get("ever_applied"):
        problems.append("run terraform apply to create the container")
    if problems:
        return False, "Container not deployed: " + "; ".join(problems) + ".", None
    return True, "LXC container declared (unprivileged, OS template) and applied.", None


@validator("px_variables_configured")
def px_variables_configured(args, findings):
    variables = _written(findings, "variables.tf")
    problems = []
    for name in ("pve_endpoint", "pve_api_token", "pve_node"):
        if f'variable "{name}"' not in variables:
            problems.append(f'variables.tf must declare variable "{name}"')
    if "sensitive" not in variables:
        problems.append("mark secrets sensitive = true (pve_api_token and passwords)")
    if not findings.get("variables_set"):
        problems.append("override a variable explicitly: terraform plan -var=\"pve_node=pve2\" or export TF_VAR_pve_node=pve2")
    if problems:
        return False, "Variables not configured: " + "; ".join(problems) + ".", None
    return True, "variables.tf declares typed, documented variables; override demonstrated.", None


@validator("px_outputs_read")
def px_outputs_read(args, findings):
    outputs = _written(findings, "outputs.tf")
    problems = []
    if 'output "' not in outputs:
        problems.append("outputs.tf must declare at least one output block")
    if "ipv4_addresses" not in outputs:
        problems.append("expose guest IPs via the ipv4_addresses attribute (needs the QEMU guest agent)")
    if not findings.get("px_outputs_viewed"):
        problems.append("read the outputs: terraform output")
    if problems:
        return False, "Outputs not configured: " + "; ".join(problems) + ".", None
    return True, "outputs.tf exposes guest IPs; values read with terraform output.", None


@validator("px_clone_fixed")
def px_clone_fixed(args, findings):
    main = _written(findings, "main.tf")
    if "clone" not in main:
        return False, "main.tf has no clone block to fix.", None
    if not _clone_is_full(main):
        return False, (
            "The clone block still requests a LINKED clone (full = false). "
            "Linked clones die with their template - Terraform-managed VMs must be full clones. "
            "Run: edit main.tf"
        ), None
    if not findings.get("px_fix_deployed"):
        return False, "Clone fixed in config but not deployed: terraform plan to preview, then terraform apply.", None
    return True, "Clone block fixed to full = true and the change applied.", None


@validator("px_stack_deployed")
def px_stack_deployed(args, findings):
    stage = _stage(findings)
    applied = findings.get("px_applied_resources") or []
    if stage != "stack":
        return False, (
            f"main.tf currently describes stage '{stage}'. The homelab stack needs 2 VMs + 1 LXC "
            "(write main.tf --scaffold upgrades to the next stage), then terraform apply."
        ), None
    if len(applied) < 3 or findings.get("px_applied_stage") != "stack":
        return False, "Stack defined but not applied: terraform plan -out=tfplan, then terraform apply.", None
    return True, "Homelab stack applied: 2 VMs + 1 LXC.", {"resources": applied}


@validator("px_destroyed")
def px_destroyed(args, findings):
    if not findings.get("ever_applied"):
        return False, "Nothing was ever applied - deploy the stack before destroying it.", None
    if not findings.get("destroyed"):
        return False, "Tear everything down: terraform destroy (confirm with 'yes').", None
    return True, "All Proxmox guests destroyed; state is clean.", None


# ---------------------------------------------------------------------------
# lab definition
# ---------------------------------------------------------------------------

TERRAFORM_PROXMOX_LAB = LabDefinition(
    id="terraform-proxmox-001",
    slug="terraform-proxmox",
    title="Terraform for Proxmox VE",
    description=(
        "Write real Terraform HCL for your Proxmox homelab with the bpg/proxmox provider: "
        "configure the provider with an API token, clone a VM from a cloud-init template, "
        "add an LXC container, parameterize everything with variables, expose guest IPs "
        "with outputs, fix a linked-clone mistake, scale to a 2-VM + 1-LXC homelab stack, "
        "then destroy it all. Every objective teaches the HCL line by line."
    ),
    category="devops",  # type: ignore[assignment]
    difficulty="intermediate",
    estimated_minutes=60,
    shell="terraform_cli",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/iac:latest",
        workdir="/home/student/proxmox",
        idle_timeout_minutes=20,
        max_runtime_minutes=90,
        deny_internet_egress=True,
    ),
    targets=[LabTarget(hostname="homelab", role="Terraform working directory (Proxmox)")],
    objectives=[
        LabObjective(
            id="provider-setup",
            label="Configure the Proxmox provider (API token auth)",
            validator="px_provider_configured",
            description=(
                "Write versions.tf: the terraform block pins the bpg/proxmox provider "
                "(source = \"bpg/proxmox\", version = \"~> 0.66\") and the provider block "
                "authenticates with an API token (endpoint + api_token = var.pve_api_token). "
                "API tokens beat passwords: create one at Datacenter > Permissions > API Tokens "
                "for a dedicated user (never root), scoped to only the privileges Terraform needs. "
                "Homelab TLS uses self-signed certs, so insecure = true skips verification "
                "(use a real cert in production). Then terraform init downloads the provider plugin."
                "\n\nHCL you are writing:\n"
                "  terraform {\n"
                "    required_providers {\n"
                "      proxmox = { source = \"bpg/proxmox\"  version = \"~> 0.66\" }\n"
                "    }\n"
                "  }\n"
                "  provider \"proxmox\" {\n"
                "    endpoint  = var.pve_endpoint    # \"https://192.168.1.10:8006/\"\n"
                "    api_token = var.pve_api_token   # \"user@realm!tokenid=secret\" (sensitive)\n"
                "    insecure  = true                # self-signed homelab cert\n"
                "    ssh { agent = true  username = \"root\" }  # guest operations via SSH agent\n"
                "  }"
            ),
            hints=[
                "write versions.tf --scaffold  (writes the expert reference with full comments)",
                "cat versions.tf — read every comment; it explains bpg vs telmate and token setup.",
                "terraform init — then terraform validate.",
            ],
        ),
        LabObjective(
            id="vm-cloudinit",
            label="Deploy a VM cloned from a cloud-init template",
            validator="px_vm_deployed",
            description=(
                "Write main.tf with your first resource. HCL anatomy: "
                "resource \"<PROVIDER>_<TYPE>\" \"<LOCAL_NAME>\" { <arguments> }. The local name "
                "(\"docker\") builds the address proxmox_virtual_environment_vm.docker; the real "
                "Proxmox object is identified by vm_id (101 — convention: 1xx = VMs, 2xx = containers, "
                "9000+ = templates)."
                "\n\nKey blocks, line by line:\n"
                "  clone { vm_id = var.template_vm_id  full = false } — clone the template (VMID 9000). "
                "full = false is a LINKED clone (fast, tiny, dies with the template); you will fix this later. "
                "Build the template once: import the Ubuntu cloud image, install qemu-guest-agent, qm template 9000.\n"
                "  agent { enabled = true } — the QEMU guest agent lets Proxmox report guest IPs; "
                "without it terraform output shows no addresses.\n"
                "  cpu { cores = 2 } / memory { dedicated = 4096 } — on old CPUs without modern flags "
                "(e.g. Xeon X5650: no AVX), pin cpu type = \"x86-64-v2-AES\" or guests fail to boot.\n"
                "  disk { datastore_id = \"local-lvm\"  interface = \"scsi0\"  size = 32  iothread = true  discard = \"on\" } — "
                "discard = \"on\" enables TRIM so thin provisioning reclaims space.\n"
                "  network_device { bridge = \"vmbr0\" } — attach to the LAN bridge (model defaults to virtio).\n"
                "  initialization { ... } — inline cloud-init: static IP 192.168.1.101/24, gateway, "
                "user_account. Terraform waits for cloud-init to finish before completing apply."
                "\n\nThen: terraform validate, terraform plan, terraform apply."
            ),
            hints=[
                "write main.tf --scaffold  (expert VM with every block commented)",
                "terraform validate — then terraform plan to preview the + create.",
                "terraform apply -auto-approve — or without the flag and type yes.",
            ],
        ),
        LabObjective(
            id="lxc-container",
            label="Add an LXC container (VMs vs containers)",
            validator="px_lxc_deployed",
            description=(
                "Extend main.tf with a proxmox_virtual_environment_container resource. "
                "Containers vs VMs: LXC shares the host kernel — tiny, instant boot, near-zero overhead, "
                "ideal for single-purpose services (DNS, reverse proxy). VMs have their own kernel — "
                "use them for Docker hosts, Kubernetes nodes, Windows, or strong isolation."
                "\n\nContainer HCL mirrors the VM's shape with two key differences:\n"
                "  operating_system { template_file_id = \"local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst\"  type = \"debian\" } — "
                "containers boot from an OS template ARCHIVE (download once: pveam download local <template>), "
                "not from a VM template.\n"
                "  network_interface { name = \"eth0\"  bridge = \"vmbr0\" } — note the different block name "
                "vs the VM's network_device.\n"
                "  unprivileged = true — maps root inside the container to an unprivileged host UID. "
                "Always prefer unprivileged unless you need device passthrough.\n"
                "  initialization { hostname = \"pihole\"  ip_config { ipv4 { address = \"192.168.1.200/24\" ... } } } — "
                "same cloud-init style config as the VM.\n"
                "  startup { order = \"1\" } — DNS boots FIRST; everything else depends on name resolution."
                "\n\nThen: terraform plan (1 to add), terraform apply."
            ),
            hints=[
                "write main.tf --scaffold  (upgrades your VM config to VM + container)",
                "terraform plan — expect: Plan: 1 to add, 0 to change, 0 to destroy.",
                "terraform apply — the container creates in seconds.",
            ],
        ),
        LabObjective(
            id="variables",
            label="Parameterize with variables.tf (node names, IPs, secrets)",
            validator="px_variables_configured",
            description=(
                "Write variables.tf. Every value that changes between environments — or is SECRET — "
                "becomes a variable instead of a hardcoded literal in main.tf."
                "\n\nA variable block has four arguments you must know:\n"
                "  description — always write one; it is documentation AND plan-time help.\n"
                "  type — string, number, bool, list(string), map(string), object({...}). Types catch "
                "mistakes early: passing \"abc\" to a number variable fails BEFORE apply.\n"
                "  default — makes the variable OPTIONAL. No default = REQUIRED (Terraform prompts, "
                "or fails in automation).\n"
                "  sensitive = true — HIDES the value in plan/apply output. Use for every password, "
                "token, and key. (It still lands in state — protect state like a secret too.)"
                "\n\nPrecedence (lowest to highest): default < terraform.tfvars < *.auto.tfvars < "
                "TF_VAR_* environment variables < -var command-line flags. "
                "Keep sane defaults in code, personal values in terraform.tfvars (gitignored), "
                "secrets in env vars or -var flags."
                "\n\nDeclare: pve_endpoint (string, required), pve_api_token (string, sensitive), "
                "pve_node (string, default \"pve\"), template_vm_id (number, default 9000), "
                "vm_username, vm_password (sensitive), lxc_password (sensitive). "
                "Then prove the override chain works: terraform plan -var=\"pve_node=pve2\"."
            ),
            hints=[
                "write variables.tf --scaffold — read the precedence comment block.",
                "terraform plan -var=\"pve_node=pve2\" — CLI flags win over everything.",
                "export TF_VAR_pve_node=pve2 — env vars beat tfvars but lose to -var.",
            ],
        ),
        LabObjective(
            id="outputs",
            label="Expose guest IPs with outputs.tf",
            validator="px_outputs_read",
            description=(
                "Write outputs.tf. Outputs are the values Terraform prints after apply and stores "
                "in state — other configs, scripts, and Ansible inventories read them via "
                "terraform output or terraform output -json."
                "\n\nAn output block: description (always), value (any expression — usually a resource "
                "attribute: <type>.<name>.<attribute>), sensitive (hides unless explicitly requested)."
                "\n\nThe QEMU-agent catch: the bpg provider can only report guest IPs when the guest "
                "agent runs inside the VM — agent { enabled = true } in main.tf AND qemu-guest-agent "
                "installed in the template. No agent, no IPs here."
                "\n\nipv4_addresses is a MAP keyed by interface: { lo = [\"127.0.0.1\"], eth0 = [\"192.168.1.101\"] }. "
                "So proxmox_virtual_environment_vm.docker.ipv4_addresses[1][0] selects the second entry "
                "(eth0), first address. For the container: "
                "proxmox_virtual_environment_container.pihole.ipv4_addresses[\"eth0\"][0]."
                "\n\nThen: terraform apply (to refresh outputs), terraform output, "
                "terraform output docker_vm_ip."
            ),
            hints=[
                "write outputs.tf --scaffold — then terraform apply to refresh.",
                "terraform output — prints every output; terraform output <name> prints one.",
                "terraform show — see the full state including output values.",
            ],
        ),
        LabObjective(
            id="clones",
            label="Fix the clone: linked vs full clones",
            validator="px_clone_fixed",
            description=(
                "Your VM was cloned with full = false — a LINKED clone: copy-on-write on the "
                "template's disk. Fast and tiny, but the VM DIES if the template is ever deleted, "
                "and you cannot migrate it to another storage. Rule of thumb: Terraform-managed "
                "VMs are ALWAYS full clones (full = true — an independent disk copy)."
                "\n\nThe telmate provider spells this full_clone = true; bpg uses full = true inside "
                "the clone block. Same idea, different spelling — watch for it in old tutorials."
                "\n\nRun edit main.tf to flip the clone block to full = true, then terraform plan. "
                "The plan shows an in-place update: ~ full = false -> true (no rebuild needed — "
                "Proxmox converts the disk). Then terraform apply to deploy the fix."
            ),
            hints=[
                "edit main.tf — flips full = false to full = true.",
                "terraform plan — expect: Plan: 0 to add, 1 to change, 0 to destroy.",
                "terraform apply — Apply complete! Resources: 0 added, 1 changed, 0 destroyed.",
            ],
        ),
        LabObjective(
            id="homelab-stack",
            label="Deploy the homelab stack (2 VMs + 1 LXC)",
            validator="px_stack_deployed",
            description=(
                "Scale to a realistic homelab: docker-01 (apps, VM 101), k3s-01 (Kubernetes "
                "playground, VM 102), pihole (DNS, container 200). Each resource block is "
                "independent — Terraform builds a dependency graph and creates them in parallel "
                "where possible."
                "\n\nScaling this pattern: for N identical nodes, do NOT copy-paste blocks — use for_each:\n"
                "  resource \"proxmox_virtual_environment_vm\" \"k3s\" {\n"
                "    for_each = toset([\"k3s-01\", \"k3s-02\", \"k3s-03\"])\n"
                "    name     = each.key\n"
                "    vm_id    = 102 + index([\"k3s-01\", \"k3s-02\", \"k3s-03\"], each.key)\n"
                "    # ... rest identical\n"
                "  }\n"
                "for_each gives you proxmox_virtual_environment_vm.k3s[\"k3s-01\"] and friends — "
                "one block, N instances, each tracked separately in state."
                "\n\nRun: write main.tf --scaffold (upgrades to the full stack), "
                "terraform plan -out=tfplan, terraform apply tfplan. Saving the plan with -out "
                "and applying THAT file guarantees you deploy exactly what you reviewed."
            ),
            hints=[
                "write main.tf --scaffold — upgrades VM+LXC to the 2-VM + 1-LXC stack.",
                "terraform plan -out=tfplan — review, then terraform apply tfplan.",
                "terraform state list — see all three guests tracked in state.",
            ],
        ),
        LabObjective(
            id="destroy",
            label="Destroy everything (clean teardown)",
            validator="px_destroyed",
            description=(
                "terraform destroy tears down every resource Terraform manages, in reverse "
                "dependency order (guests before the networks/templates they depend on — here: "
                "k3s-01, docker-01, pihole). It prompts for confirmation; type yes. "
                "In automation, -auto-approve skips the prompt — never use it casually against "
                "a homelab you care about."
                "\n\nDestroy reads the STATE file, not your .tf files: even if you delete main.tf, "
                "terraform destroy still knows what it created. That is why state is precious — "
                "lose terraform.tfstate and Terraform forgets your infrastructure exists "
                "(it becomes orphaned, still running, still billing you in cloud terms)."
            ),
            hints=[
                "terraform destroy — type yes at the prompt.",
                "terraform state list — should now be empty.",
                "ls — terraform.tfstate remains (with zero resources) as the record.",
            ],
        ),
    ],
)
