#!/usr/bin/env python3
"""Generate the Docker lab image seed files from the mock shell sources.

The seeds are byte-identical to the data the mock shells simulate, so a lab
behaves the same whether it runs on the mock provider or on Docker: the same
grep finds the same lines, the same one-liners produce the same answers.

Sources:
  seeds/python/*     <- labs/shells/linux_python.py (AUTH_LOG, NOTES_TXT, SWITCH_CFG)
  seeds/logtriage/*  <- labs/shells/linux_logs.py (AUTH_LOG) and labs/logsets.py (LOGSETS)
  seeds/iac/main.tf  <- labs/shells/terraform.py (MAIN_TF) + offline lab stanza

Usage:  python3 gen_seeds.py   (run from backend/labs/images/)
The generated files are committed; re-run after changing any mock dataset.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BACKEND = HERE.parents[1]
sys.path.insert(0, str(BACKEND))

from labs import logsets  # noqa: E402
from labs.shells import linux_logs, linux_python, terraform  # noqa: E402


def write(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # \n-joined + trailing newline, exactly like the mock's "\n".join() reads.
    path.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {path.relative_to(HERE)} ({len(lines)} lines)")


def main() -> None:
    seeds = HERE / "seeds"

    # --- python labs (py-basics-001, py-automation-001, py-netauto-001) ---
    write(seeds / "python" / "auth.log", linux_python.AUTH_LOG)
    write(seeds / "python" / "notes.txt", linux_python.NOTES_TXT)
    (seeds / "python" / "switch.cfg").write_text(
        linux_python.SWITCH_CFG + "\n", encoding="utf-8", newline="\n")
    print("wrote seeds/python/switch.cfg")

    # --- log-triage labs (sec-logtriage-001 uses linux_logs; the blue-team
    # --- trio uses logsets via the logfile shell) ---
    write(seeds / "logtriage" / "auth.log", linux_logs.AUTH_LOG)
    for lab_id, loglab in logsets.LOGSETS.items():
        for name, lines in loglab.files.items():
            write(seeds / "logtriage" / name, lines)

    # --- IaC lab: mock's main.tf plus the offline-lab provider stanza --------
    # The stanza is the standard offline pattern (documented in README.md):
    # dummy credentials + skip flags so `terraform plan` works with no network.
    # tfsec still flags the open SSH ingress exactly as in the mock.
    offline_stanza = (
        '\n# --- Road to CISSP lab stanza: offline-friendly provider settings ---\n'
        '# The sandbox has no internet egress, so the AWS provider is told to skip\n'
        '# credential/account validation. Dummy credentials come from the environment\n'
        '# (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY). `terraform init` uses the\n'
        '# pre-seeded plugin mirror; `tfsec`, `validate` and `plan` run fully offline.\n'
        '# `apply` needs real AWS credentials and network, and is out of scope here.\n'
        'provider "aws" {\n'
        '  region                      = "us-east-1"\n'
        '  access_key                  = "lab"\n'
        '  secret_key                  = "lab"\n'
        '  skip_credentials_validation = true\n'
        '  skip_metadata_api_check     = true\n'
        '  skip_requesting_account_id  = true\n'
        '}\n'
    )
    # Pin the provider to the exact version the mock shell simulates
    # ("Installing hashicorp/aws v5.31.0") so the real init output matches
    # what learners saw in the simulation.
    main_tf = terraform.MAIN_TF.replace('version = "~> 5.0"', 'version = "5.31.0"')
    main_tf = main_tf.rstrip("\n") + "\n" + offline_stanza
    (seeds / "iac" / "main.tf").write_text(main_tf, encoding="utf-8", newline="\n")
    print("wrote seeds/iac/main.tf")

    print("done.")


if __name__ == "__main__":
    main()
