"""Cybersecurity lab definitions (data only; nothing here executes)."""
from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget

NMAP_ENUMERATION_LAB = LabDefinition(
    id="cyber-nmap-001",
    slug="nmap-service-enumeration",
    title="Service Enumeration with Nmap",
    description=(
        "Discover ports, identify services, and collect version information from an authorized, "
        "isolated training target. Learn the native tool first: command, purpose, output, "
        "interpretation."
    ),
    category="cybersecurity",
    shell="linux_recon",
    difficulty="beginner",
    estimated_minutes=25,
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/security-tools:latest",
        workdir="/home/student",  # used only by a real provider, never sent to the client
        idle_timeout_minutes=15,
        max_runtime_minutes=45,
        deny_internet_egress=True,
    ),
    targets=[
        LabTarget(hostname="target.lab", role="Intentionally vulnerable training target", intentionally_vulnerable=True)
    ],
    objectives=[
        LabObjective(
            id="discover-host",
            label="Confirm that target.lab is reachable",
            validator="host_discovered",
            args={"target": "target.lab"},
            hints=["Start by investigating the assigned target.", "Nmap can perform host discovery."],
        ),
        LabObjective(
            id="discover-ports",
            label="Identify exposed TCP ports",
            validator="ports_discovered",
            args={"target": "target.lab"},
            hints=["Consider whether the default scan covers every TCP port (-p-)."],
        ),
        LabObjective(
            id="identify-services",
            label="Identify services",
            validator="services_identified",
            args={"target": "target.lab"},
            hints=["Nmap supports service/version detection: research the -sV option."],
        ),
        LabObjective(
            id="identify-versions",
            label="Identify relevant service versions",
            validator="versions_identified",
            args={"target": "target.lab"},
            hints=["-sV reports version strings you can research later."],
        ),
    ],
)

PORTBLAST_COMPARISON_LAB = LabDefinition(
    id="cyber-portblast-001",
    slug="manual-vs-portblast",
    title="PortBlast: Full Assessment Workflow",
    description=(
        "PortBlast grew from a port scanner into a full assessment workflow. Enumerate an authorized "
        "target manually, run PortBlast's orchestrated scan and compare, then walk the rest of the "
        "workflow: vulnerability lookup, credential testing, hash cracking, and a single-module "
        "exploit run. Every network-facing action is scope-gated to target.lab - try stepping outside "
        "it and watch PortBlast refuse."
    ),
    category="portblast",
    shell="linux_recon",
    difficulty="intermediate",
    estimated_minutes=45,
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/portblast-lab:latest",
        workdir="/home/student",
        idle_timeout_minutes=20,
        max_runtime_minutes=60,
        deny_internet_egress=True,
    ),
    targets=[
        LabTarget(hostname="target.lab", role="Authorized vulnerable training target", intentionally_vulnerable=True)
    ],
    objectives=[
        LabObjective(id="manual-enumeration", label="Enumerate the target manually", validator="manual_enumeration_complete", args={"target": "target.lab"}),
        LabObjective(id="service-identification", label="Identify exposed services and versions", validator="services_identified", args={"target": "target.lab"}),
        LabObjective(id="vulnerability-research", label="Research discovered software", validator="research_complete", args={"target": "target.lab"}),
        LabObjective(id="portblast-run", label="Run PortBlast scan against the training target", validator="portblast_result_exists", args={"target": "target.lab"}),
        LabObjective(id="compare-results", label="Compare manual findings with PortBlast", validator="comparison_complete", args={"target": "target.lab"}),
        LabObjective(id="portblast-vuln", label="Look up vulnerabilities with PortBlast", validator="portblast_vulns_found", args={"target": "target.lab"},
                     hints=["portblast vuln apache 2.4.52  (passive Exploit-DB lookup)"]),
        LabObjective(id="portblast-scope", label="Confirm PortBlast enforces scope", validator="portblast_scope_understood", args={"target": "target.lab"},
                     hints=["Try a network action against a host outside scope, e.g. portblast scan evil.example.com"]),
        LabObjective(id="portblast-creds", label="Test credentials with PortBlast", validator="portblast_creds_found", args={"target": "target.lab"},
                     hints=["portblast creds target.lab --service ssh"]),
        LabObjective(id="portblast-crack", label="Crack a captured hash offline", validator="portblast_crack_done", args={"target": "target.lab"},
                     hints=["portblast crack hashes.txt  (local only, no network)"]),
        LabObjective(id="portblast-exploit", label="Run a single exploit module", validator="portblast_exploit_done", args={"target": "target.lab"},
                     hints=["portblast exploit --module exploit/linux/samba/is_known_pipename --target target.lab"]),
    ],
)

LOG_TRIAGE_LAB = LabDefinition(
    id="sec-logtriage-001",
    slug="brute-force-log-triage",
    title="Log Triage: Brute-Force Investigation",
    description=(
        "web01 shows signs of an SSH brute-force. Investigate /var/log/auth.log with real cat, grep "
        "and tail: find the failed attempts, pin down the attacker's IP, locate the login that "
        "succeeded, and name the account that was compromised. A blue-team detective exercise."
    ),
    category="cybersecurity",
    difficulty="beginner",
    estimated_minutes=20,
    shell="linux_logs",
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/log-triage:latest",
        workdir="/home/analyst",
        idle_timeout_minutes=15,
        max_runtime_minutes=45,
        deny_internet_egress=True,
    ),
    targets=[LabTarget(hostname="web01", role="SSH server under investigation")],
    objectives=[
        LabObjective(id="view-log", label="Open the authentication log", validator="log_viewed",
                     hints=["cat /var/log/auth.log  (or tail -n 20 auth.log)"]),
        LabObjective(id="find-failed", label="Find the failed login attempts", validator="failed_found",
                     hints=['grep "Failed password" auth.log']),
        LabObjective(id="identify-attacker", label="Identify the attacker's IP", validator="attacker_ip",
                     hints=["One IP repeats across the failures — grep for it to see its full activity (203.0.113.66)."]),
        LabObjective(id="find-breach", label="Find the successful login", validator="breach_found",
                     hints=['grep "Accepted password" auth.log — which attempt finally worked?']),
        LabObjective(id="identify-account", label="Name the compromised account", validator="account_identified",
                     hints=["The Accepted line names the user the attacker got into — grep that username."]),
    ],
)
