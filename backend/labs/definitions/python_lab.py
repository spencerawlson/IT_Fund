"""Python automation lab: triage with Python one-liners instead of by hand."""
from labs.models import (
    LabDefinition,
    LabDifficulty,
    LabEnvironmentConfig,
    LabObjective,
    LabTarget,
)

PYTHON_AUTOMATION_LAB = LabDefinition(
    id="py-automation-001",
    slug="python-automation",
    title="Automate with Python",
    description=(
        "The same brute-force triage you did by hand — now automated. Use Python one-liners "
        "to count failed SSH logins in auth.log, extract the unique attacker IPs, query the "
        "alerts API, and port-scan localhost with sockets. The lab the py-automation "
        "deck has been waiting for."
    ),
    category="python",
    difficulty="beginner",
    estimated_minutes=25,
    shell="linux_python",
    environment=LabEnvironmentConfig(
        # Docker image road-to-cissp/python-automation is published on FedServ.
        # The alerts API runs on 127.0.0.1:8080 inside the container, so the
        # port-scan objective targets localhost (the mock's 10.0.0.8 was simulated).
        provider="docker",
        image="road-to-cissp/python-automation:latest",
        workdir="/home/analyst",
        idle_timeout_minutes=15,
        max_runtime_minutes=45,
        deny_internet_egress=True,
    ),
    targets=[
        LabTarget(hostname="auto01", role="Your automation workstation"),
        LabTarget(hostname="127.0.0.1", role="Localhost — the alerts API listens here"),
    ],
    objectives=[
        LabObjective(id="py-version", label="Verify Python is available", validator="py_version",
                     hints=["python3 --version"]),
        LabObjective(id="count-failed", label="Count failed SSH logins with a Python one-liner",
                     validator="py_failed_count",
                     hints=["python3 -c \"print(sum(1 for l in open('auth.log') if 'Failed' in l))\""]),
        LabObjective(id="extract-ips", label="Extract the unique source IPs with Python",
                     validator="py_ips_extracted",
                     hints=["import re; use re.findall with an IPv4 pattern, wrap it in set()"]),
        LabObjective(id="query-api", label="Query the alerts API from Python",
                     validator="py_api_called",
                     hints=["urllib.request.urlopen('http://localhost:8080/api/alerts') + json.load — see help for the full one-liner"]),
        LabObjective(id="port-scan", label="Port-scan localhost with Python sockets",
                     validator="py_scan_done",
                     hints=["socket.socket().connect_ex(('127.0.0.1', port)) returns 0 when the port is open — try 8080, the alerts API port"]),
    ],
)
