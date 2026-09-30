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
        image="road-to-cissp/security-tools:latest",  # used only by a real provider, never sent to the client
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
    title="Manual Reconnaissance vs PortBlast",
    description=(
        "Enumerate an authorized target manually with standard tools and record your findings, "
        "then run PortBlast against the same target and compare its structured results with yours. "
        "PortBlast is an automation/orchestration tool, not a replacement for the native tools."
    ),
    category="portblast",
    shell="linux_recon",
    difficulty="intermediate",
    estimated_minutes=45,
    environment=LabEnvironmentConfig(
        provider="mock",
        image="road-to-cissp/portblast-lab:latest",
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
        LabObjective(id="portblast-run", label="Run PortBlast against the training target", validator="portblast_result_exists", args={"target": "target.lab"}),
        LabObjective(id="compare-results", label="Compare manual findings with PortBlast", validator="comparison_complete", args={"target": "target.lab"}),
    ],
)
