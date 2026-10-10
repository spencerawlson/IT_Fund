"""Simulated shells for terminal-based labs.

A lab names its shell via `LabDefinition.shell`; each shell module exposes `initial_prompt(lab)`,
`banner(lab)` and `run(lab, command, findings) -> CommandResult`. The mock provider routes every
terminal command here, and the API advertises `initial_prompt`/`banner` so the client can seed the
terminal. Nothing in any shell executes anything — they are deterministic simulations.
"""
from __future__ import annotations

from typing import Any

from labs.providers.base import CommandResult
from labs.shells import aws_audit, cisco_ios, docker_cli, docker_siem, kubectl, linux_logs, linux_net, linux_python, linux_recon, logfile, pentest, terraform, terraform_cli

_SHELLS = {
    'linux_recon': linux_recon,   # nmap / rustscan / recon labs
    'cisco_ios': cisco_ios,       # switching / routing / ACL labs
    'linux_net': linux_net,       # DNS & connectivity troubleshooting
    'linux_logs': linux_logs,     # log triage / brute-force investigation
    'linux_python': linux_python, # python automation lab (simulated python3)
    'aws_audit': aws_audit,       # cloud security audit (AWS CLI)
    'terraform': terraform,       # IaC provisioning + cloud security
    'docker_siem': docker_siem,   # container security monitoring + SIEM investigation
    'docker_cli': docker_cli,     # docker fundamentals (images/containers/compose)
    'kubectl': kubectl,           # kubernetes fundamentals (deploy/scale/troubleshoot)
    'pentest': pentest,           # full pentest methodology (recon → exploitation → reporting)
    'terraform': terraform,       # IaC provisioning + cloud security
    'terraform_cli': terraform_cli,  # terraform fundamentals (full workflow)
    'logfile': logfile,           # generic data-driven log-analysis labs (blue-team)
}


def has_shell(lab) -> bool:
    return bool(getattr(lab, 'shell', None)) and lab.shell in _SHELLS


def meta(lab) -> dict[str, Any] | None:
    """Terminal seed for the client: the initial prompt and welcome banner, or None if not a shell lab."""
    if not has_shell(lab):
        return None
    shell = _SHELLS[lab.shell]
    return {
        'prompt': shell.initial_prompt(lab),
        'banner': shell.banner(lab),
        # Only shells that support `connect <device>` get the workspace's console tabs.
        'multi_device': getattr(shell, 'multi_device', False),
    }


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    shell = _SHELLS.get(getattr(lab, 'shell', None))
    if shell is None:
        return CommandResult(output='This lab has no interactive shell.', exit_code=127)
    return shell.run(lab, command, findings)
