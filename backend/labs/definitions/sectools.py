"""Security-tools lab group (Phase 3): packet analysis, web app testing, secret scanning.

All three are live Docker labs (real tshark / real Flask target / real gitleaks).
Validators are registered here (ws_* / webapp_* / gitleaks_* namespaces) so they
load with the labs; objectives are attestation-based (the learner does the work
in the container and records the finding — see LabWorkspace.jsx attest).
"""
from __future__ import annotations

import labs.validators_sectools  # noqa: F401  (registers ws_*/webapp_*/gitleaks_* validators)
from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget


def _env(image: str, **kwargs) -> LabEnvironmentConfig:
    return LabEnvironmentConfig(
        provider="docker",
        image=image,
        workdir="/home/analyst",
        idle_timeout_minutes=15,
        max_runtime_minutes=45,
        deny_internet_egress=True,
        cpu_limit=1.0,
        memory_mb=512,
        **kwargs,
    )


WIRESHARK_LAB = LabDefinition(
    id="tools-wireshark-001",
    slug="wireshark-tshark-packet-analysis",
    title="Wireshark / tshark Packet Analysis",
    description=(
        "A packet capture hides a story: an intranet login, credentials in the clear, and data "
        "sneaking out over DNS. Carve it up with real tshark — list the protocols, follow the TCP "
        "stream, pull the cleartext credentials, and catch the DNS exfiltration."
    ),
    category="cybersecurity", difficulty="intermediate", estimated_minutes=25, shell="linux_cli",
    environment=_env("road-to-cissp/wireshark:latest"),
    targets=[LabTarget(hostname="analyst-ws", role="Analyst workstation with seeded captures")],
    objectives=[
        LabObjective(id="open", label="Open the capture and list its packets", validator="ws_capture_opened",
                     hints=["tshark -r capture.pcap", "tshark -r capture.pcap -q -z io,phs for a protocol summary."]),
        LabObjective(id="protocols", label="Identify the protocols in the capture", validator="ws_protocols_identified",
                     hints=["The protocol hierarchy (-z io,phs) lists every dissector — expect ARP, DNS, TCP, HTTP, TLS, ICMP."]),
        LabObjective(id="stream", label="Follow the HTTP login TCP stream", validator="ws_tcp_stream_followed",
                     hints=["tshark -r capture.pcap -q -z follow,tcp,ascii,0 reassembles stream 0."]),
        LabObjective(id="creds", label="Find the cleartext credentials", validator="ws_credentials_found",
                     hints=["Read the reassembled stream: the login POST body and an Authorization header both leak credentials."]),
        LabObjective(id="exfil", label="Spot the DNS exfiltration", validator="ws_dns_exfil_found",
                     hints=["tshark -r capture.pcap -Y dns — look for the odd domain with many TXT queries."]),
        LabObjective(id="report", label="Write up your findings", validator="ws_report_written",
                     hints=["echo your summary > findings.txt: protocol mix, where the credentials were, how the exfil worked."]),
    ],
)

WEBAPP_LAB = LabDefinition(
    id="sec-webapp-001",
    slug="web-app-testing-sqli-xss",
    title="Web App Testing: SQLi & XSS",
    description=(
        "A deliberately vulnerable training app (built in-house for this lab) runs on loopback inside "
        "your container as target.lab:5000. Enumerate it, prove the search box is injectable, extract "
        "data with UNION-based SQLi, demonstrate reflected XSS in the guestbook — then write the fix "
        "(parameterized queries, output encoding) and confirm the app is loopback-only."
    ),
    category="cybersecurity", difficulty="intermediate", estimated_minutes=30, shell="linux_cli",
    environment=_env("road-to-cissp/webapp:latest", extra_hosts={"target.lab": "127.0.0.1"}),
    targets=[LabTarget(hostname="target.lab", role="Vulnerable test application",
                       intentionally_vulnerable=True)],
    objectives=[
        LabObjective(id="enum", label="Enumerate the application", validator="webapp_enumerated",
                     hints=["curl http://target.lab:5000/ then visit /search and /comment."]),
        LabObjective(id="prove-sqli", label="Prove the search box is injectable", validator="webapp_sqli_proven",
                     hints=["curl 'http://target.lab:5000/search?q=%27%20OR%20%271%27=%271' — all users back means injectable."]),
        LabObjective(id="extract", label="Extract data with UNION-based SQLi", validator="webapp_sqli_extracted",
                     hints=["The query returns 4 columns: ' UNION SELECT 1,sql,2,3 FROM sqlite_master--  reveals the schema."]),
        LabObjective(id="xss", label="Demonstrate reflected XSS", validator="webapp_xss_reflected",
                     hints=["curl 'http://target.lab:5000/comment?name=<script>alert(1)</script>' — is your payload escaped?"]),
        LabObjective(id="fix", label="Propose the fix", validator="webapp_fix_proposed",
                     hints=["Write FIX.md: parameterized query (db.execute('... WHERE username LIKE ?', (q,))) and html.escape() on reflection."]),
        LabObjective(id="loopback", label="Verify the app is loopback-only", validator="webapp_loopback_verified",
                     hints=["ss -tlnp | grep 5000 — the app must listen on 127.0.0.1, never 0.0.0.0."]),
    ],
)

GITLEAKS_LAB = LabDefinition(
    id="sec-gitleaks-001",
    slug="secret-scanning-with-gitleaks",
    title="Secret Scanning with gitleaks",
    description=(
        "A developer pushed secrets to git — an AWS key pair in a .env (later 'deleted'), a Stripe key "
        "and Slack token in config.py, a GitHub token and a private key in the README. All are clearly "
        "fake training fixtures. Scan the repo with real gitleaks, triage the findings, purge history, "
        "and install a pre-commit hook so it never happens again."
    ),
    category="cybersecurity", difficulty="beginner", estimated_minutes=20, shell="linux_cli",
    environment=_env("road-to-cissp/gitleaks:latest"),
    targets=[LabTarget(hostname="dev-ws", role="Developer workstation with a leaky repo")],
    objectives=[
        LabObjective(id="scan", label="Run gitleaks over the repo", validator="gitleaks_run",
                     hints=["cd ~/leaky-repo && gitleaks detect --no-git -v"]),
        LabObjective(id="triage", label="Identify the leaked secret types", validator="gitleaks_types_identified",
                     hints=["Read the report: which rules fired? Expect AWS keys, a Stripe key, a Slack token, a GitHub PAT, an RSA private key."]),
        LabObjective(id="history", label="Find the secrets hiding in git history", validator="gitleaks_history_found",
                     hints=["gitleaks detect -v (git-aware) — the 'deleted' .env is still in the first commit."]),
        LabObjective(id="remediate", label="Remediate: purge history, rotate", validator="gitleaks_remediated",
                     hints=["git filter-repo / BFG purges the blobs; then document the rule: committed secrets get ROTATED, not just deleted."]),
        LabObjective(id="precommit", label="Add a gitleaks pre-commit hook", validator="gitleaks_precommit_added",
                     hints=["Write .git/hooks/pre-commit: #!/bin/sh + gitleaks protect --staged -v; chmod +x; test it with a fake secret."]),
    ],
)
