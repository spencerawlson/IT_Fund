"""Networking lab definitions (data only; nothing here executes)."""
from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget

VLAN_ROUTING_LAB = LabDefinition(
    id="net-vlan-001",
    slug="vlan-inter-vlan-routing",
    title="VLANs and Inter-VLAN Routing",
    description=(
        "Build two VLANs across two switches joined by a trunk, route between them on a router, "
        "and prove connectivity. Topology: PC1 - SW1 - R1 - SW2 - PC2."
    ),
    category="networking",
    difficulty="intermediate",
    estimated_minutes=40,
    environment=LabEnvironmentConfig(provider="mock", idle_timeout_minutes=20, max_runtime_minutes=60, deny_internet_egress=True),
    targets=[
        LabTarget(hostname="SW1", role="Access/trunk switch"),
        LabTarget(hostname="SW2", role="Access/trunk switch"),
        LabTarget(hostname="R1", role="Inter-VLAN router"),
    ],
    objectives=[
        LabObjective(id="vlan10", label="Create VLAN 10", validator="vlan10_exists"),
        LabObjective(id="vlan20", label="Create VLAN 20", validator="vlan20_exists"),
        LabObjective(id="sw1-trunk", label="Configure the trunk on SW1", validator="sw1_trunk_configured"),
        LabObjective(id="sw2-trunk", label="Configure the trunk on SW2", validator="sw2_trunk_configured"),
        LabObjective(id="router-interfaces", label="Configure inter-VLAN routing on R1", validator="router_interfaces_configured"),
        LabObjective(id="pc1-gw", label="PC1 reaches its gateway", validator="pc1_reaches_gateway"),
        LabObjective(id="pc2-gw", label="PC2 reaches its gateway", validator="pc2_reaches_gateway"),
        LabObjective(id="pc1-pc2", label="PC1 reaches PC2 across VLANs", validator="pc1_reaches_pc2"),
    ],
)
