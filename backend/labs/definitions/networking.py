"""Networking lab definitions (data only; nothing here executes).

All three drive a simulated terminal (see labs/shells): the switching/routing labs use the Cisco IOS
console, the troubleshooting lab uses a Linux shell. Each lab is a progression of several exercises
(objectives) validated against the resulting device/host state, not the exact commands typed.
"""
from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget

VLAN_ROUTING_LAB = LabDefinition(
    id="net-vlan-001",
    slug="vlan-inter-vlan-routing",
    title="VLANs and Inter-VLAN Routing",
    description=(
        "Configure a real Cisco IOS console: create VLANs on a switch, place hosts in them, trunk "
        "up to a router, and configure router-on-a-stick subinterfaces so the two VLANs can talk. "
        "Then prove it with ping. Topology: PC1(VLAN10) & PC2(VLAN20) - SW1 =trunk= R1."
    ),
    category="networking",
    difficulty="intermediate",
    estimated_minutes=35,
    shell="cisco_ios",
    environment=LabEnvironmentConfig(provider="mock", idle_timeout_minutes=20, max_runtime_minutes=60, deny_internet_egress=True),
    targets=[
        LabTarget(hostname="SW1", role="Access/trunk switch"),
        LabTarget(hostname="R1", role="Router-on-a-stick"),
        LabTarget(hostname="PC1", role="Host in VLAN 10"),
        LabTarget(hostname="PC2", role="Host in VLAN 20"),
    ],
    objectives=[
        LabObjective(id="vlans", label="Create VLAN 10 and VLAN 20 on SW1", validator="vlans_created",
                     hints=["enable → configure terminal → vlan 10 → name SALES → exit → vlan 20 → name ENG"]),
        LabObjective(id="access-ports", label="Assign the host access ports", validator="access_ports_configured",
                     hints=["interface gi0/1 → switchport mode access → switchport access vlan 10 (Gi0/2 → VLAN 20)"]),
        LabObjective(id="trunk", label="Trunk SW1 up to the router", validator="trunk_configured",
                     hints=["interface gi0/24 → switchport mode trunk"]),
        LabObjective(id="router-subif", label="Configure router-on-a-stick on R1", validator="router_subinterfaces_configured",
                     hints=["connect R1 → interface gi0/0 → no shutdown → interface gi0/0.10 → encapsulation dot1q 10 → ip address 192.168.10.1 255.255.255.0 (repeat .20 for VLAN 20)"]),
        LabObjective(id="connectivity", label="Prove PC1 can reach PC2 across VLANs", validator="intervlan_connectivity",
                     hints=["connect PC1 → ping 192.168.20.10"]),
    ],
)

STATIC_ROUTING_LAB = LabDefinition(
    id="net-static-routing-001",
    slug="static-routing",
    title="Static Routing Between Two Sites",
    description=(
        "Two sites, two routers, one WAN link. Address each router's LAN and WAN interfaces, then "
        "add the static routes that let the far LAN be reached — and confirm end-to-end with ping. "
        "Topology: LAN1(PC1) - R1 =10.0.0.0/30= R2 - LAN2(PC2)."
    ),
    category="networking",
    difficulty="intermediate",
    estimated_minutes=35,
    shell="cisco_ios",
    environment=LabEnvironmentConfig(provider="mock", idle_timeout_minutes=20, max_runtime_minutes=60, deny_internet_egress=True),
    targets=[
        LabTarget(hostname="R1", role="Site 1 router"),
        LabTarget(hostname="R2", role="Site 2 router"),
        LabTarget(hostname="PC1", role="Host in LAN1"),
        LabTarget(hostname="PC2", role="Host in LAN2"),
    ],
    objectives=[
        LabObjective(id="r1-if", label="Bring up R1's interfaces", validator="r1_interfaces_configured",
                     hints=["interface gi0/0 → ip address 192.168.1.1 255.255.255.0 → no shutdown; Gi0/1 → 10.0.0.1 /30"]),
        LabObjective(id="r2-if", label="Bring up R2's interfaces", validator="r2_interfaces_configured",
                     hints=["connect R2; Gi0/0 → 192.168.2.1 /24, Gi0/1 → 10.0.0.2 /30, no shutdown"]),
        LabObjective(id="r1-route", label="Add R1's route to LAN2", validator="r1_static_route",
                     hints=["On R1: ip route 192.168.2.0 255.255.255.0 10.0.0.2"]),
        LabObjective(id="r2-route", label="Add R2's route to LAN1", validator="r2_static_route",
                     hints=["On R2: ip route 192.168.1.0 255.255.255.0 10.0.0.1"]),
        LabObjective(id="connectivity", label="Prove PC1 can reach PC2", validator="end_to_end_connectivity",
                     hints=["connect PC1 → ping 192.168.2.10; verify routes with show ip route"]),
    ],
)

ACL_LAB = LabDefinition(
    id="net-acl-001",
    slug="access-control-lists",
    title="Filtering Traffic with ACLs",
    description=(
        "R1 already routes a user LAN to a server LAN. Write a standard access list that blocks one "
        "untrusted host (the GUEST, 192.168.1.20) from the server while leaving everyone else "
        "connected — then prove it with ping from both the guest and a trusted PC. "
        "Topology: PC1(.10) & GUEST(.20) - R1 - SRV(192.168.2.10)."
    ),
    category="networking",
    difficulty="intermediate",
    estimated_minutes=30,
    shell="cisco_ios",
    environment=LabEnvironmentConfig(provider="mock", idle_timeout_minutes=20, max_runtime_minutes=60, deny_internet_egress=True),
    targets=[
        LabTarget(hostname="R1", role="Router between the two LANs"),
        LabTarget(hostname="PC1", role="Trusted host (192.168.1.10)"),
        LabTarget(hostname="GUEST", role="Untrusted host (192.168.1.20)"),
        LabTarget(hostname="SRV", role="Server (192.168.2.10)"),
    ],
    objectives=[
        LabObjective(id="deny-guest", label="Deny the guest host in an ACL", validator="acl_denies_guest",
                     hints=["conf t → access-list 10 deny host 192.168.1.20"]),
        LabObjective(id="permit-others", label="Permit all other traffic", validator="acl_permits_others",
                     hints=["access-list 10 permit any  (an ACL ends with an implicit deny, so this is required)"]),
        LabObjective(id="apply", label="Apply the ACL to the path", validator="acl_applied",
                     hints=["Standard ACLs go near the destination: interface gi0/1 → ip access-group 10 out"]),
        LabObjective(id="guest-blocked", label="Confirm the guest is blocked", validator="guest_blocked",
                     hints=["connect GUEST → ping 192.168.2.10 — it should fail now"]),
        LabObjective(id="trusted-allowed", label="Confirm trusted hosts still pass", validator="trusted_allowed",
                     hints=["connect PC1 → ping 192.168.2.10 — it should still succeed"]),
    ],
)

DNS_CONNECTIVITY_LAB = LabDefinition(
    id="net-dns-connectivity-001",
    slug="dns-and-connectivity",
    title="DNS & Connectivity Troubleshooting",
    description=(
        "A workstation can't reach an internal web app. Work the layers on a Linux shell — local "
        "addressing, name resolution, gateway reachability, the path to the server, and finally the "
        "HTTP service — to confirm each link in the chain. Tools: ip, dig, ping, traceroute, curl."
    ),
    category="networking",
    difficulty="beginner",
    estimated_minutes=25,
    shell="linux_net",
    environment=LabEnvironmentConfig(provider="mock", idle_timeout_minutes=15, max_runtime_minutes=45, deny_internet_egress=True),
    targets=[LabTarget(hostname="workstation", role="Client to diagnose from")],
    objectives=[
        LabObjective(id="inspect-ip", label="Inspect the workstation's IP configuration", validator="local_ip",
                     hints=["ip addr (or ifconfig)"]),
        LabObjective(id="resolve-dns", label="Resolve the app's hostname", validator="dns",
                     hints=["dig app.corp.example (or nslookup) — does it return an A record?"]),
        LabObjective(id="reach-gateway", label="Confirm the default gateway is reachable", validator="gateway",
                     hints=["find the gateway with ip route, then ping it"]),
        LabObjective(id="trace-path", label="Trace the path to the app", validator="trace",
                     hints=["traceroute app.corp.example"]),
        LabObjective(id="verify-service", label="Confirm the web service responds", validator="service",
                     hints=["curl -I http://app.corp.example — look for 200 OK"]),
    ],
)
