"""Lab inventory for the educational audit: every registered lab definition,
its execution model and what its objectives validate. Prints JSON.

Run from the repo root with the backend venv:
  backend/.venv/Scripts/python scripts/content-audit/labs_inventory.py   (Windows)
  backend/.venv/bin/python scripts/content-audit/labs_inventory.py       (Linux)

Execution model (never overstated):
  - "mock"   : simulated — commands are interpreted by Python, no real shell.
  - "docker" : a real, hardened container when LAB_DOCKER_ENABLED=1 and the
               image is built; otherwise the lab reports "unavailable".
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from labs.definitions import ALL_LABS  # noqa: E402


def main() -> None:
    out = []
    for lab in ALL_LABS:
        env = lab.environment
        out.append(
            {
                "id": lab.id,
                "slug": lab.slug,
                "title": lab.title,
                "provider": env.provider,
                "executionModel": "simulated (mock command interpreter)" if env.provider == "mock" else "real container (Docker, hardened) when enabled",
                "image": env.image,
                "denyInternetEgress": env.deny_internet_egress,
                "shell": lab.shell,
                "workbench": lab.workbench,
                "estimatedMinutes": lab.estimated_minutes,
                "objectives": len(lab.objectives),
                "objectivesWithHints": sum(1 for o in lab.objectives if o.hints),
                "validators": sorted({o.validator for o in lab.objectives}),
                "targets": [{"hostname": t.hostname, "role": t.role, "intentionallyVulnerable": t.intentionally_vulnerable} for t in lab.targets],
            }
        )
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
