"""Python scripting basics lab: learn Python by doing — print, loop, write a script, run it."""
from labs.models import (
    LabDefinition,
    LabDifficulty,
    LabEnvironmentConfig,
    LabObjective,
    LabTarget,
)

PYTHON_BASICS_LAB = LabDefinition(
    id="py-basics-001",
    slug="python-scripting-basics",
    title="Python Scripting Basics",
    description=(
        "Your first Python reps in the terminal: print a greeting from a variable, loop with "
        "for and range(), write a real script file with echo, and run it to count the lines in "
        "notes.txt. Everything the automation labs assume you already know, taught by doing."
    ),
    category="python",
    difficulty="beginner",
    estimated_minutes=20,
    shell="linux_python",
    environment=LabEnvironmentConfig(
        # TEMPORARY (2026-10-07): back to the mock provider until the Docker daemon
        # runs on FedSer (`docker info` fails there even after `systemctl start
        # docker`, so the docker provider can't serve). Flip back to "docker" with
        # image="road-to-cissp/python-basics:latest" once the daemon is healthy —
        # the hardened provider, image Dockerfiles and runbook all stay in repo.
        # `environment.live` derives from this flag, so the UI automatically drops
        # the "live container" claim and attestation buttons while mocked.
        provider="mock",
        workdir="/home/analyst",
        idle_timeout_minutes=15,
        max_runtime_minutes=45,
        deny_internet_egress=True,
    ),
    targets=[
        LabTarget(hostname="auto01", role="Your Python workstation"),
    ],
    objectives=[
        LabObjective(id="py-version", label="Verify Python is available", validator="py_version",
                     hints=["python3 --version"]),
        LabObjective(id="greeting", label="Print a greeting built from a variable",
                     validator="py_basics_print",
                     hints=["python3 -c \"name='ada'; print('hello, ' + name)\""]),
        LabObjective(id="loop", label="Loop with for and range()",
                     validator="py_basics_loop",
                     hints=["python3 -c \"for i in range(3): print('port', i)\""]),
        LabObjective(id="write-script", label="Write a script that counts lines in notes.txt",
                     validator="py_script_written",
                     hints=["echo \"lines = open('notes.txt').read().splitlines()\" > count.py",
                            "then echo \"print('lines:', len(lines))\" >> count.py (>> appends)"]),
        LabObjective(id="run-script", label="Run your script",
                     validator="py_script_run",
                     hints=["python3 count.py — it should print 5"]),
    ],
)
