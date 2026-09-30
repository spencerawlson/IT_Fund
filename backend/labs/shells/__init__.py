"""Simulated shells for terminal-based labs.

A lab names its shell via `LabDefinition.shell`; each shell module exposes `initial_prompt(lab)`,
`banner(lab)` and `run(lab, command, findings) -> CommandResult`. The mock provider routes every
terminal command here, and the API advertises `initial_prompt`/`banner` so the client can seed the
terminal. Nothing in any shell executes anything — they are deterministic simulations.
"""
from __future__ import annotations

from typing import Any

from labs.providers.base import CommandResult
from labs.shells import cisco_ios, linux_net, linux_recon

_SHELLS = {
    'linux_recon': linux_recon,   # nmap / rustscan / recon labs
    'cisco_ios': cisco_ios,       # switching / routing labs
    'linux_net': linux_net,       # DNS & connectivity troubleshooting
}


def has_shell(lab) -> bool:
    return bool(getattr(lab, 'shell', None)) and lab.shell in _SHELLS


def meta(lab) -> dict[str, Any] | None:
    """Terminal seed for the client: the initial prompt and welcome banner, or None if not a shell lab."""
    if not has_shell(lab):
        return None
    shell = _SHELLS[lab.shell]
    return {'prompt': shell.initial_prompt(lab), 'banner': shell.banner(lab)}


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    shell = _SHELLS.get(getattr(lab, 'shell', None))
    if shell is None:
        return CommandResult(output='This lab has no interactive shell.', exit_code=127)
    return shell.run(lab, command, findings)
