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
        # Docker image road-to-cissp/security-tools is published on FedServ: real
        # sshd (2222), nginx (8080) and http.server (8000) on loopback. target.lab
        # resolves to 127.0.0.1 via extra_hosts; scan unprivileged (-Pn -sT).
        provider="docker",
        image="road-to-cissp/security-tools:latest",
        workdir="/home/student",  # used only by a real provider, never sent to the client
        idle_timeout_minutes=15,
        max_runtime_minutes=45,
        deny_internet_egress=True,
        extra_hosts={"target.lab": "127.0.0.1"},
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
        # Docker image road-to-cissp/portblast-lab is published on FedServ: the real
        # PortBlast tool plus the security-tools target services on loopback.
        # target.lab resolves to 127.0.0.1 via extra_hosts (scope-gated, as in the mock).
        provider="docker",
        image="road-to-cissp/portblast-lab:latest",
        workdir="/home/student",
        idle_timeout_minutes=20,
        max_runtime_minutes=60,
        deny_internet_egress=True,
        extra_hosts={"target.lab": "127.0.0.1"},
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
        # Docker image road-to-cissp/log-triage is published on FedServ: the real
        # /var/log/auth.log, investigated with real cat/grep/tail.
        provider="docker",
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

SIEM_HUNTING_LAB = LabDefinition(
    id="siem-hunting-001",
    slug="siem-threat-hunting",
    title="SIEM Threat Hunting",
    description=(
        "Three intrusions are hiding in the SIEM: an RDP brute-force that turned into lateral "
        "movement, a DNS tunneling exfiltration, and a phishing malware callback. Triage the fired "
        "alerts, hunt the attacker infrastructure, scope each compromise, contain the hosts, and "
        "write up the incident. A CySA+ security-operations exercise."
    ),
    category="cybersecurity",
    shell="siem_cli",
    difficulty="intermediate",
    estimated_minutes=45,
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/siem-hunting:latest",
        workdir="/home/analyst",
        idle_timeout_minutes=20,
        max_runtime_minutes=90,
        deny_internet_egress=True,
    ),
    targets=[
        LabTarget(hostname="siem.corp.local", role="Centralized log store under investigation"),
        LabTarget(hostname="ws-finance01", role="Workstation hit by RDP brute-force", intentionally_vulnerable=True),
        LabTarget(hostname="ws-hr02", role="Workstation exfiltrating over DNS", intentionally_vulnerable=True),
        LabTarget(hostname="ws-sales03", role="Workstation with malware callback", intentionally_vulnerable=True),
    ],
    objectives=[
        LabObjective(id="triage-alerts", label="Triage the fired detection alerts", validator="siem_alerts_triaged",
                     hints=["alerts — then drill into each one with alert <id> (note A-105: not every alert is malicious)."]),
        LabObjective(id="identify-rdp-attacker", label="Identify the RDP brute-force attacker's IP", validator="siem_rdp_attacker",
                     hints=["Alert A-101 names the pattern — search the failures, then track the source: hunt ioc <ip>."]),
        LabObjective(id="reconstruct-rdp", label="Reconstruct the RDP intrusion timeline, including lateral movement", validator="siem_rdp_timeline",
                     hints=["timeline ws-finance01 — follow the chain past the first success: where did the attacker go next?"]),
        LabObjective(id="identify-dns-tunnel", label="Identify the DNS tunneling domain", validator="siem_dns_tunnel",
                     hints=["Alert A-102 — what domain are the TXT queries for? Track it: hunt ioc <domain>."]),
        LabObjective(id="scope-exfil-host", label="Scope the exfiltration to its source host", validator="siem_exfil_host",
                     hints=["Which internal host is sending the tunneling queries? timeline <host> to confirm."]),
        LabObjective(id="identify-malware-c2", label="Identify the malware C2 server IP", validator="siem_malware_c2",
                     hints=["Alert A-103 — the beacons go somewhere every ~5 minutes. Track the destination: hunt ioc <ip>."]),
        LabObjective(id="contain", label="Isolate all compromised hosts", validator="siem_hosts_isolated",
                     hints=["isolate <host> for each of the four compromised hosts (RDP entry, lateral target, exfil, malware)."]),
        LabObjective(id="report", label="Generate the incident report", validator="siem_report_done",
                     hints=["report — it stays blocked until the IOCs are tracked and every compromised host is isolated."]),
    ],
)


VULN_SCANNING_LAB = LabDefinition(
    id="vuln-scanning-001",
    slug="vulnerability-assessment-workflow",
    title="Vulnerability Assessment Workflow",
    description=(
        "Run a full vulnerability management cycle against a fictional network: scan, interpret "
        "CVSS vectors, cross-check the CISA KEV catalog, prioritize by RISK (CVSS + EPSS + KEV + "
        "asset criticality — not CVSS alone), choose remediation vs mitigation, rescan to verify, "
        "and write the executive summary. Maps to CySA+ CS0-003 Vulnerability Management (30%)."
    ),
    category="cybersecurity",
    shell="vuln_cli",
    difficulty="intermediate",
    estimated_minutes=40,
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/vuln-lab:latest",
        workdir="/home/analyst",
        idle_timeout_minutes=15,
        max_runtime_minutes=60,
        deny_internet_egress=True,
    ),
    targets=[
        LabTarget(hostname="web01", role="Public web server (critical)", intentionally_vulnerable=True),
        LabTarget(hostname="db01", role="Customer database (critical)", intentionally_vulnerable=True),
        LabTarget(hostname="mail01", role="Mail gateway (high)", intentionally_vulnerable=True),
        LabTarget(hostname="ws042", role="Finance workstation (medium)", intentionally_vulnerable=True),
        LabTarget(hostname="iot-cam03", role="Lobby IoT camera (low)", intentionally_vulnerable=True),
    ],
    objectives=[
        LabObjective(
            id="run-scan",
            label="Run a vulnerability scan of the network",
            validator="vuln_scan_complete",
            description="Discover what is vulnerable before deciding what matters.",
            hints=["scan 10.0.1.0/24"],
        ),
        LabObjective(
            id="interpret-cvss",
            label="Interpret CVSS vectors on two findings",
            validator="vuln_cvss_interpreted",
            description="Read the vector string: attack vector, complexity, privileges, scope, CIA impact.",
            hints=["vuln VULN-001  then  vuln VULN-003 — compare AV:N/PR:N/UI:N vs the scores"],
        ),
        LabObjective(
            id="check-kev",
            label="Check the CISA KEV catalog",
            validator="vuln_kev_checked",
            description="Known-exploited vulns jump the queue regardless of CVSS.",
            hints=["kev"],
        ),
        LabObjective(
            id="prioritize-risk",
            label="Prioritize the top 3 by RISK, not CVSS",
            validator="vuln_prioritized",
            description=(
                "The key lesson: CVSS alone misorders the queue. Weigh EPSS "
                "(likelihood), KEV (confirmed exploitation), and asset criticality."
            ),
            hints=[
                "prioritize  shows the risk ranking;  prioritize --by cvss  shows the naive one",
                "VULN-003 (CVSS 7.5) vs VULN-004 (CVSS 9.8) — which is really more urgent?",
                "Submit: prioritize VULN-001 VULN-003 VULN-002",
            ],
        ),
        LabObjective(
            id="plan-remediation",
            label="Recommend remediation vs mitigation",
            validator="vuln_remediation_planned",
            description="Patch what has a patch; contain what does not. VULN-004 has no vendor fix.",
            hints=["remediate VULN-001  patches it;  mitigate VULN-004  segments it"],
        ),
        LabObjective(
            id="fix-top3",
            label="Address all three top-risk findings",
            validator="vuln_top3_fixed",
            description="The top 3 by risk must each be remediated or mitigated.",
            hints=["vulns  shows status — OPEN means untreated"],
        ),
        LabObjective(
            id="rescan-verify",
            label="Rescan to verify the fixes",
            validator="vuln_rescan_done",
            description="A fix is not done until a follow-up scan confirms it.",
            hints=["rescan"],
        ),
        LabObjective(
            id="exec-summary",
            label="Generate the executive summary",
            validator="vuln_report_done",
            description="Leaders need risk, not CVE counts: top risks, actions, residual exposure.",
            hints=["report"],
        ),
    ],
)
