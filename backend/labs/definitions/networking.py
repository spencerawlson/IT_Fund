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

_RT_ENV = LabEnvironmentConfig(provider="mock", idle_timeout_minutes=20, max_runtime_minutes=60, deny_internet_egress=True)

OSPF_LAB = LabDefinition(
    id="net-ospf-001",
    slug="ospf-single-area",
    title="OSPF Single-Area Configuration",
    description=(
        "Configure OSPF process 1 in area 0 across R1, R2 and R3 so the two LANs can talk. The links "
        "are already addressed and up — your job is the routing. Topology: PC-A - R1 = R2 = R3 - Server-A. "
        "Establish both adjacencies, advertise every network, and prove PC-A can reach Server-A."
    ),
    category="networking", difficulty="intermediate", estimated_minutes=35, shell="cisco_ios", environment=_RT_ENV,
    targets=[
        LabTarget(hostname="R1", role="Edge router (PC-A LAN)"),
        LabTarget(hostname="R2", role="Transit router"),
        LabTarget(hostname="R3", role="Edge router (Server-A LAN)"),
        LabTarget(hostname="PC-A", role="Host on R1's LAN"),
        LabTarget(hostname="Server-A", role="Host on R3's LAN"),
    ],
    objectives=[
        LabObjective(id="r1", label="Configure OSPF on R1 (area 0)", validator="r1_ospf",
                     hints=["connect R1 → enable → conf t → router ospf 1 → network 192.168.1.0 0.0.0.255 area 0 → network 10.0.12.0 0.0.0.255 area 0"]),
        LabObjective(id="r2", label="Configure OSPF on R2 (area 0)", validator="r2_ospf",
                     hints=["connect R2: advertise both link networks (10.0.12.0 and 10.0.23.0) in area 0."]),
        LabObjective(id="r3", label="Configure OSPF on R3 (area 0)", validator="r3_ospf",
                     hints=["connect R3: advertise 10.0.23.0 and the Server LAN 192.168.3.0 in area 0."]),
        LabObjective(id="adj", label="Bring up all OSPF adjacencies", validator="ospf_adjacencies",
                     hints=["Verify with show ip ospf neighbor — R1-R2 and R2-R3 should reach FULL."]),
        LabObjective(id="conn", label="Prove PC-A reaches Server-A", validator="ospf_connectivity",
                     hints=["connect PC-A → ping 192.168.3.10"]),
    ],
)

OSPF_TSHOOT_LAB = LabDefinition(
    id="net-ospf-tshoot-001",
    slug="ospf-troubleshooting",
    title="OSPF Troubleshooting",
    description=(
        "OSPF is already configured on R1, R2 and R3, but PC-A cannot reach Server-A. One router "
        "advertises a link in the wrong area, so an adjacency never forms. Use show commands to find "
        "the fault, fix it, and restore end-to-end connectivity."
    ),
    category="networking", difficulty="advanced", estimated_minutes=30, shell="cisco_ios", environment=_RT_ENV,
    targets=[
        LabTarget(hostname="R1", role="Edge router (PC-A LAN)"),
        LabTarget(hostname="R2", role="Transit router"),
        LabTarget(hostname="R3", role="Edge router (Server-A LAN)"),
        LabTarget(hostname="PC-A", role="Host on R1's LAN"),
        LabTarget(hostname="Server-A", role="Host on R3's LAN"),
    ],
    objectives=[
        LabObjective(id="fix", label="Fix the mis-configured router", validator="r2_ospf",
                     hints=["Check show ip ospf neighbor on R2 and R3 — the R2-R3 link has no neighbour. Look at show ip protocols / show run on R2: the 10.0.23.0 network is in the wrong area. Re-add it in area 0."]),
        LabObjective(id="adj", label="Restore all OSPF adjacencies", validator="ospf_adjacencies",
                     hints=["After the fix, show ip ospf neighbor on R2 should list both R1 and R3 as FULL."]),
        LabObjective(id="conn", label="Restore PC-A → Server-A connectivity", validator="ospf_connectivity",
                     hints=["connect PC-A → ping 192.168.3.10"]),
    ],
)

BGP_LAB = LabDefinition(
    id="net-bgp-001",
    slug="ebgp-configuration",
    title="eBGP Configuration",
    description=(
        "Peer two autonomous systems with external BGP. R1 is in AS 65001 and R2 in AS 65002, joined by "
        "a /30 link. Configure the neighbors, advertise each site's LAN, bring the session up, and prove "
        "PC1 can reach PC2. Topology: LAN1(PC1) - R1 = R2 - LAN2(PC2)."
    ),
    category="networking", difficulty="advanced", estimated_minutes=35, shell="cisco_ios", environment=_RT_ENV,
    targets=[
        LabTarget(hostname="R1", role="AS 65001 edge router"),
        LabTarget(hostname="R2", role="AS 65002 edge router"),
        LabTarget(hostname="PC1", role="Host in LAN1"),
        LabTarget(hostname="PC2", role="Host in LAN2"),
    ],
    objectives=[
        LabObjective(id="r1", label="Configure R1's eBGP neighbor", validator="r1_bgp",
                     hints=["connect R1 → conf t → router bgp 65001 → neighbor 10.0.0.2 remote-as 65002"]),
        LabObjective(id="r2", label="Configure R2's eBGP neighbor", validator="r2_bgp",
                     hints=["connect R2 → router bgp 65002 → neighbor 10.0.0.1 remote-as 65001"]),
        LabObjective(id="peer", label="Establish the eBGP session", validator="bgp_peering",
                     hints=["Both sides must point at each other with the right remote-as; verify with show ip bgp summary."]),
        LabObjective(id="adv", label="Advertise both LANs into BGP", validator="bgp_advertised",
                     hints=["network 192.168.1.0 mask 255.255.255.0 on R1, and 192.168.2.0 mask 255.255.255.0 on R2."]),
        LabObjective(id="conn", label="Prove PC1 reaches PC2", validator="bgp_connectivity",
                     hints=["connect PC1 → ping 192.168.2.10"]),
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
