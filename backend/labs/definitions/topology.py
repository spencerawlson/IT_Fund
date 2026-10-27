"""Topology builder lab (net-topology-001): a cabling puzzle for game mode
(docs/GAME_LAB_DESIGN.md, Phase 4).

The learner places devices on a board and cables them together; the resulting
graph is validated against a target topology. This is a different interaction
from the cisco_ios config labs — it validates *physical wiring*, so it has its
own validators (a link is an unordered pair of device ids).

Findings shape the client records (via the TopologyBuilder workbench):
  {"devices": ["pc1","pc2","sw1","r1"], "links": [["pc1","sw1"], ["sw1","r1"], ...]}
"""
from labs.models import LabDefinition, LabEnvironmentConfig, LabObjective, LabTarget
from labs.validators import validator


def _norm(link):
    """An unordered link as a sorted tuple, so ['a','b'] == ['b','a']."""
    try:
        a, b = link
    except (ValueError, TypeError):
        return None
    return tuple(sorted((str(a), str(b))))


def _link_set(links):
    out = set()
    for link in links or []:
        n = _norm(link)
        if n is not None and n[0] != n[1]:  # drop self-loops / malformed
            out.add(n)
    return out


@validator("topology_devices_placed")
def topology_devices_placed(args, findings):
    required = set(args.get("devices", []))
    placed = set(findings.get("devices", []))
    missing = sorted(required - placed)
    if not missing:
        return True, f"All {len(required)} required devices are on the board.", {"placed": sorted(placed)}
    return False, f"Add these devices to the board: {', '.join(missing)}.", None


@validator("topology_cabled")
def topology_cabled(args, findings):
    required = _link_set(args.get("links"))
    present = _link_set(findings.get("links"))
    missing = sorted(required - present)
    if not missing:
        return True, "Every required cable is connected.", {"links": sorted("–".join(p) for p in present)}
    pretty = ", ".join("–".join(p) for p in missing)
    return False, f"Still need to cable: {pretty}.", None


@validator("topology_clean")
def topology_clean(args, findings):
    required = _link_set(args.get("links"))
    present = _link_set(findings.get("links"))
    extra = sorted(present - required)
    if not extra:
        return True, "No stray cables — the build matches the design exactly.", None
    pretty = ", ".join("–".join(p) for p in extra)
    return False, f"Remove the extra cable(s): {pretty}.", None


_DEVICES = ["pc1", "pc2", "sw1", "r1"]
_LINKS = [["pc1", "sw1"], ["pc2", "sw1"], ["sw1", "r1"]]

TOPOLOGY_LAB = LabDefinition(
    id="net-topology-001",
    slug="build-the-office-lan",
    title="Build the Office LAN",
    description=(
        "Cable a small office network the way you would in a rack: drop the two PCs, the switch and "
        "the router onto the board, then run the cables. The hosts hang off the switch; the switch "
        "uplinks to the router. Your wiring is checked against the target design."
    ),
    category="networking",
    difficulty="beginner",
    estimated_minutes=10,
    shell=None,
    workbench="topology",
    environment=LabEnvironmentConfig(provider="mock"),
    targets=[
        LabTarget(hostname="pc1", role="Workstation"),
        LabTarget(hostname="pc2", role="Workstation"),
        LabTarget(hostname="sw1", role="Access switch"),
        LabTarget(hostname="r1", role="Gateway router"),
    ],
    objectives=[
        LabObjective(
            id="place-devices",
            label="Place every device on the board",
            validator="topology_devices_placed",
            args={"devices": _DEVICES},
            description="Add PC1, PC2, SW1 and R1.",
            hints=["Drag each device from the palette onto the board."],
        ),
        LabObjective(
            id="cable",
            label="Cable the hosts to the switch and the switch to the router",
            validator="topology_cabled",
            args={"links": _LINKS},
            description="PC1→SW1, PC2→SW1, SW1→R1.",
            hints=["Click one device then another to run a cable between them.",
                   "Both PCs connect to SW1; SW1 uplinks to R1."],
        ),
        LabObjective(
            id="tidy",
            label="No stray cables",
            validator="topology_clean",
            args={"links": _LINKS},
            description="The build should match the design exactly — no extra links.",
            hints=["Remove any cable that isn't PC1–SW1, PC2–SW1 or SW1–R1."],
        ),
    ],
)


# --------------------------------------------------------------------------
# Level 2 — redundant core (two switches, dual uplinks). Same validators.
# --------------------------------------------------------------------------
_CORE_DEVICES = ["pc1", "pc2", "sw1", "sw2", "r1"]
_CORE_LINKS = [
    ["pc1", "sw1"], ["pc2", "sw2"],   # a host on each access switch
    ["sw1", "sw2"],                     # inter-switch cross-link
    ["sw1", "r1"], ["sw2", "r1"],       # dual uplink to the router
]

TOPOLOGY_CORE_LAB = LabDefinition(
    id="net-topology-002",
    slug="build-a-redundant-core",
    title="Build a Redundant Core",
    description=(
        "Wire a network that survives a cut cable. Two access switches each carry a host, cross-link "
        "the switches, and give the router a dual uplink — one to each switch — so no single link is a "
        "single point of failure. Your wiring is checked against the target design."
    ),
    category="networking",
    difficulty="intermediate",
    estimated_minutes=12,
    shell=None,
    workbench="topology",
    environment=LabEnvironmentConfig(provider="mock"),
    targets=[
        LabTarget(hostname="pc1", role="Workstation"),
        LabTarget(hostname="pc2", role="Workstation"),
        LabTarget(hostname="sw1", role="Access switch"),
        LabTarget(hostname="sw2", role="Access switch"),
        LabTarget(hostname="r1", role="Core router"),
    ],
    objectives=[
        LabObjective(id="place-devices", label="Place every device on the board",
                     validator="topology_devices_placed", args={"devices": _CORE_DEVICES},
                     description="Add PC1, PC2, SW1, SW2 and R1.",
                     hints=["Both switches and both PCs plus the core router."]),
        LabObjective(id="cable", label="Cable the redundant core",
                     validator="topology_cabled", args={"links": _CORE_LINKS},
                     description="PC1→SW1, PC2→SW2, SW1↔SW2, and a dual uplink SW1→R1 and SW2→R1.",
                     hints=["Each PC hangs off its own switch.",
                            "Cross-link the two switches so they can reach each other directly.",
                            "The router uplinks to BOTH switches — that's the redundancy."]),
        LabObjective(id="tidy", label="No stray cables",
                     validator="topology_clean", args={"links": _CORE_LINKS},
                     description="The build should match the design exactly — no extra links.",
                     hints=["Keep only the six designed cables."]),
    ],
)


# --------------------------------------------------------------------------
# Level 3 — DMZ segmentation (internet, firewall, DMZ server, inside LAN).
# --------------------------------------------------------------------------
_DMZ_DEVICES = ["inet", "fw1", "r1", "sw1", "sw2", "web1", "pc1"]
_DMZ_LINKS = [
    ["inet", "fw1"],                   # internet into the firewall
    ["fw1", "r1"],                      # firewall to the edge router
    ["r1", "sw1"], ["r1", "sw2"],       # router to the DMZ switch and the inside switch
    ["sw1", "web1"],                    # DMZ: public web server
    ["sw2", "pc1"],                     # inside LAN: workstation
]

TOPOLOGY_DMZ_LAB = LabDefinition(
    id="net-topology-003",
    slug="segment-a-dmz",
    title="Segment a DMZ",
    description=(
        "Design a perimeter the way a security team would: the internet enters through a firewall, the "
        "firewall feeds an edge router, and the router splits into two segments — a DMZ switch holding "
        "the public web server, and an inside switch holding the workstation. Keep the DMZ and the "
        "inside LAN on separate switches. Your wiring is checked against the target design."
    ),
    category="networking",
    difficulty="advanced",
    estimated_minutes=15,
    shell=None,
    workbench="topology",
    environment=LabEnvironmentConfig(provider="mock"),
    targets=[
        LabTarget(hostname="inet", role="Internet / upstream cloud"),
        LabTarget(hostname="fw1", role="Perimeter firewall"),
        LabTarget(hostname="r1", role="Edge router"),
        LabTarget(hostname="sw1", role="DMZ switch"),
        LabTarget(hostname="sw2", role="Inside switch"),
        LabTarget(hostname="web1", role="DMZ web server"),
        LabTarget(hostname="pc1", role="Inside workstation"),
    ],
    objectives=[
        LabObjective(id="place-devices", label="Place every device on the board",
                     validator="topology_devices_placed", args={"devices": _DMZ_DEVICES},
                     description="Add the internet, firewall, router, both switches, the web server and the workstation.",
                     hints=["Seven devices in all."]),
        LabObjective(id="cable", label="Wire the perimeter and both segments",
                     validator="topology_cabled", args={"links": _DMZ_LINKS},
                     description="INET→FW1→R1, then R1→SW1 (DMZ) and R1→SW2 (inside); WEB1→SW1, PC1→SW2.",
                     hints=["Traffic enters INET → FW1 → R1.",
                            "The router fans out to two switches: SW1 is the DMZ, SW2 is inside.",
                            "The web server lives on the DMZ switch; the workstation on the inside switch."]),
        LabObjective(id="tidy", label="Keep the segments clean",
                     validator="topology_clean", args={"links": _DMZ_LINKS},
                     description="No extra cables — especially nothing that bridges the DMZ to the inside LAN.",
                     hints=["Don't cable WEB1 and PC1 to the same switch, and don't cross the two switches."]),
    ],
)
