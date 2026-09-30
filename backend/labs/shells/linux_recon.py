"""The Linux recon shell (nmap / rustscan / ping / searchsploit / portblast).

A thin adapter over labs/scenarios.py, which already implements this interpreter and is covered by
test_terminal.py. Kept as a named shell so the recon labs go through the same registry as the others.
"""
from __future__ import annotations

from typing import Any

from labs import scenarios
from labs.providers.base import CommandResult


def initial_prompt(lab) -> str:
    return 'student@target-lab:~$ '


def banner(lab) -> list[str]:
    return scenarios.banner_for(lab)


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    return scenarios.simulate_command(lab, command, findings)
