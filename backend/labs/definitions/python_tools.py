"""Phase 3 Python-tools labs (085 log analysis, 087 SQL injection, 089 semgrep).

All three are Docker-backed and drive the real tools inside one shared image
(road-to-cissp/python-tools:latest): real python3 over a seeded auth log, real
sqlite3 against a deliberately vulnerable notes app, and real semgrep over
deliberately vulnerable code with custom rules. Validation is attestation-based:
the learner records what they uncovered and the validators in
labs/validators_python.py check the recorded outcomes.
"""
import labs.validators_python  # noqa: F401  (registers the pylog_/sqli_/semgrep_ validators)

from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget

_ENV = LabEnvironmentConfig(
    # Docker image road-to-cissp/python-tools is published on FedServ: real
    # python3, sqlite3 CLI and semgrep (pinned) plus the three labs' seeds.
    provider="docker",
    image="road-to-cissp/python-tools:latest",
    workdir="/home/analyst",
    idle_timeout_minutes=15,
    max_runtime_minutes=45,
    deny_internet_egress=True,
    cpu_limit=1.0,
    memory_mb=512,
)

_WORKSTATION = LabTarget(hostname="auto01", role="Your Python workstation")

PY_LOGANALYSIS_LAB = LabDefinition(
    id="py-loganalysis-001",
    slug="python-log-analysis",
    title="Python Log Analysis",
    description=(
        "Three days of application auth logs (loganalysis/auth.log) hide a brute-force campaign, a "
        "port scan, and two odd-hour logins. Parse them with real Python: count the failed logins "
        "with a one-liner, extract the attacker IPs with re, find the most-targeted account, and "
        "write up an incident report."
    ),
    category="python",
    difficulty="beginner",
    estimated_minutes=20,
    shell="linux_python",
    environment=_ENV,
    targets=[_WORKSTATION],
    objectives=[
        LabObjective(id="count-failed", label="Count the failed logins with a Python one-liner",
                     validator="pylog_failed_count",
                     hints=["python3 -c \"print(sum(1 for l in open('loganalysis/auth.log') if 'Login failed' in l))\""]),
        LabObjective(id="extract-ips", label="Extract the unique attacker IPs with re",
                     validator="pylog_attacker_ips",
                     hints=["re.findall(r'\\d+\\.\\d+\\.\\d+\\.\\d+', text) over the failed lines, wrap it in set() and collections.Counter"]),
        LabObjective(id="top-user", label="Find the most-targeted username",
                     validator="pylog_top_user",
                     hints=["re.search(r\"user '([^']+)'\", line) per failed line — tally with collections.Counter"]),
        LabObjective(id="scan-src", label="Identify the port scanner's IP",
                     validator="pylog_scan_src",
                     hints=["grep 'closed port' loganalysis/auth.log — one source IP probes closed ports across the window"]),
        LabObjective(id="write-report", label="Write your findings to incident_report.txt",
                     validator="pylog_report_written",
                     hints=["open('incident_report.txt','w') — include the failed-login count, the attacker IPs, and the scanner"]),
    ],
)

PY_SQLI_LAB = LabDefinition(
    id="py-sqli-001",
    slug="fixing-sql-injection",
    title="Fixing SQL Injection",
    description=(
        "A small notes app (sqli/vuln_app.py + seed.db) builds SQL with f-strings. Prove the "
        "injection against the live database — dump every user with ' OR '1'='1 — then find both "
        "vulnerable sinks, rewrite them with parameterized queries in fixed_app.py, and verify the "
        "injection dies while legit logins keep working."
    ),
    category="python",
    difficulty="intermediate",
    estimated_minutes=25,
    shell="linux_python",
    environment=_ENV,
    targets=[_WORKSTATION],
    objectives=[
        LabObjective(id="demo-injection", label="Demonstrate the SQL injection",
                     validator="sqli_injection_demo",
                     hints=["cd sqli && python3 vuln_app.py login \"' OR '1'='1\" — all 3 user rows (with hashes) should print"]),
        LabObjective(id="locate-vuln", label="Identify the vulnerable login code",
                     validator="sqli_vuln_located",
                     hints=["grep -n 'f\"' vuln_app.py — which function interpolates the username into the SELECT?"]),
        LabObjective(id="second-sink", label="Find the second vulnerable sink",
                     validator="sqli_insert_vuln",
                     hints=["The login is not the only sink — check the INSERT path too"]),
        LabObjective(id="fix-code", label="Rewrite both queries with parameterized placeholders",
                     validator="sqli_fix_applied",
                     hints=["cursor.execute('SELECT ... WHERE username = ?', (username,)) in a new fixed_app.py — no f-strings in SQL"]),
        LabObjective(id="retest", label="Verify the injection is blocked and legit logins still work",
                     validator="sqli_injection_blocked",
                     hints=["python3 fixed_app.py login \"' OR '1'='1\" must print nothing; python3 fixed_app.py login admin must print exactly 1 row"]),
    ],
)

PY_SEMGREP_LAB = LabDefinition(
    id="py-semgrep-001",
    slug="static-analysis-semgrep",
    title="Static Analysis with Semgrep",
    description=(
        "A backup service (semgrep/vuln/) ships four classic flaws: a hardcoded secret, "
        "subprocess shell=True, MD5 password hashing, and unsafe yaml.load. Run real semgrep "
        "against the custom rule pack in semgrep/.semgrep/rules.yml, triage the findings by "
        "severity, fix every one, and re-run to a clean 0."
    ),
    category="python",
    difficulty="intermediate",
    estimated_minutes=25,
    shell="linux_python",
    environment=_ENV,
    targets=[_WORKSTATION],
    objectives=[
        LabObjective(id="run-scan", label="Run semgrep with the custom rules",
                     validator="semgrep_scanned",
                     hints=["cd semgrep && semgrep --config .semgrep/rules.yml vuln/"]),
        LabObjective(id="triage", label="Triage the findings by severity",
                     validator="semgrep_triaged",
                     hints=["Which two rule ids are ERROR (fix now) and which two are WARNING (fix soon)? Check .semgrep/rules.yml"]),
        LabObjective(id="fix-secrets", label="Remove the hardcoded secrets",
                     validator="semgrep_secret_fixed",
                     hints=["os.environ.get('BACKUP_API_KEY', '') — never commit a literal secret"]),
        LabObjective(id="fix-shell", label="Eliminate shell=True",
                     validator="semgrep_shell_fixed",
                     hints=["subprocess.run(['tar', '-czf', archive, '/data'], shell=False) — pass an argv list, not a string"]),
        LabObjective(id="clean-rerun", label="Re-run semgrep to zero findings",
                     validator="semgrep_clean",
                     hints=["semgrep --config .semgrep/rules.yml vuln/ after fixing — sha256 for the hash, yaml.safe_load for the config"]),
    ],
)
