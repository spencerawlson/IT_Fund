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


# ---- graph-property validators (open-ended: structure, not an exact design) ----

def _adjacency(links):
    adj = {}
    for a, b in _link_set(links):
        adj.setdefault(a, set()).add(b)
        adj.setdefault(b, set()).add(a)
    return adj


def _reachable(adj, start):
    seen, stack = set(), [start]
    while stack:
        node = stack.pop()
        if node in seen:
            continue
        seen.add(node)
        stack.extend(adj.get(node, set()) - seen)
    return seen


def _connected(links, a, b):
    if a == b:
        return True
    return b in _reachable(_adjacency(links), a)


@validator("topology_reaches")
def topology_reaches(args, findings):
    a, b = args.get("from"), args.get("to")
    if _connected(findings.get("links"), a, b):
        return True, f"{a} can reach {b} through the network.", None
    return False, f"{a} cannot reach {b} yet — trace a cabled path between them.", None


@validator("topology_redundant_path")
def topology_redundant_path(args, findings):
    """Two edge-disjoint paths between a and b: cutting any single cable still
    leaves them connected (the pair is 2-edge-connected). Any design that
    achieves this passes — there is no single 'correct' wiring."""
    a, b = args.get("from"), args.get("to")
    links = _link_set(findings.get("links"))
    if not _connected(links, a, b):
        return False, f"{a} and {b} aren't connected yet — build a path first.", None
    for cut in links:
        if not _connected(links - {cut}, a, b):
            name = "–".join(cut)
            return False, f"Not fault-tolerant: cutting {name} isolates {b} from {a}. Add a second, independent path.", None
    return True, f"Fault-tolerant: {a} keeps reaching {b} even if any single cable is cut.", None


@validator("topology_connected")
def topology_connected(args, findings):
    nodes = list(args.get("devices") or [])
    if len(nodes) <= 1:
        return True, "Nothing to connect.", None
    reach = _reachable(_adjacency(findings.get("links")), nodes[0])
    missing = [n for n in nodes if n not in reach]
    if missing:
        return False, f"Not one network yet: {', '.join(missing)} can't reach {nodes[0]}.", None
    return True, "Every device is part of one connected network.", None


@validator("topology_no_loop")
def topology_no_loop(args, findings):
    """No cycle among the given devices (a Layer-2 switch loop). Union-find: a
    link whose endpoints are already connected closes a loop."""
    nodes = set(args.get("devices") or [])
    links = _link_set(findings.get("links"))
    if nodes:
        links = {(a, b) for (a, b) in links if a in nodes and b in nodes}
    parent = {}

    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in links:
        ra, rb = find(a), find(b)
        if ra == rb:
            return False, (
                f"Switching loop: {a}–{b} closes a cycle. Without STP that's a broadcast storm — "
                "remove a link so the switches form a tree."
            ), None
        parent[ra] = rb
    return True, "Loop-free: the switched paths form a tree.", None


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
        LabObjective(id="fault-tolerant", label="Prove the core survives a cut cable",
                     validator="topology_redundant_path", args={"from": "sw1", "to": "r1"},
                     description="SW1 must still reach R1 if any single cable is cut.",
                     hints=["The direct SW1→R1 uplink plus the SW1→SW2→R1 path is what makes it redundant."]),
    ],
)


# --------------------------------------------------------------------------
# Level 4 — open-ended: make R1 reachable from PC1, fault-tolerantly. There is
# no single 'correct' wiring; any 2-edge-connected design between SW1 and R1
# passes. Validated by graph properties, not an exact link list.
# --------------------------------------------------------------------------
_FT_DEVICES = ["pc1", "sw1", "sw2", "r1"]

TOPOLOGY_FT_LAB = LabDefinition(
    id="net-topology-004",
    slug="make-the-core-fault-tolerant",
    title="Make the Core Fault-Tolerant",
    description=(
        "No blueprint this time — just a goal. Wire PC1 through to the router R1, and make the switch "
        "core fault-tolerant so a single cut cable can't isolate SW1 from R1. How you achieve the "
        "redundancy is up to you; any design with two independent paths through the core passes."
    ),
    category="networking",
    difficulty="advanced",
    estimated_minutes=12,
    shell=None,
    workbench="topology",
    environment=LabEnvironmentConfig(provider="mock"),
    targets=[
        LabTarget(hostname="pc1", role="Workstation"),
        LabTarget(hostname="sw1", role="Core switch"),
        LabTarget(hostname="sw2", role="Core switch"),
        LabTarget(hostname="r1", role="Core router"),
    ],
    objectives=[
        LabObjective(id="place-devices", label="Place every device on the board",
                     validator="topology_devices_placed", args={"devices": _FT_DEVICES},
                     description="Add PC1, SW1, SW2 and R1.",
                     hints=["Two switches give you the second path."]),
        LabObjective(id="reach", label="PC1 reaches the router",
                     validator="topology_reaches", args={"from": "pc1", "to": "r1"},
                     description="Cable a working path from PC1 all the way to R1.",
                     hints=["PC1 → a switch → … → R1."]),
        LabObjective(id="redundant", label="The SW1–R1 core survives any single cut",
                     validator="topology_redundant_path", args={"from": "sw1", "to": "r1"},
                     description="Build two independent paths between SW1 and R1.",
                     hints=["A direct SW1→R1 link AND an SW1→SW2→R1 path is one way.",
                            "Cutting any one cable must still leave SW1 able to reach R1."]),
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


# --------------------------------------------------------------------------
# Level 5 — the switching-loop lesson: connect all three switches, but WITHOUT
# a loop (no STP here). Connected + acyclic over N switches == a spanning tree.
# --------------------------------------------------------------------------
_STP_SWITCHES = ["sw1", "sw2", "sw3"]

TOPOLOGY_STP_LAB = LabDefinition(
    id="net-topology-005",
    slug="break-the-switching-loop",
    title="Break the Switching Loop",
    description=(
        "Three switches must all talk to each other — but a switched LAN with no spanning-tree "
        "protocol cannot tolerate a loop: cable them in a ring and broadcasts circle forever "
        "(a broadcast storm). Connect all three switches so every one is reachable, with no loop. "
        "This is exactly the problem STP was invented to solve."
    ),
    category="networking",
    difficulty="intermediate",
    estimated_minutes=10,
    shell=None,
    workbench="topology",
    environment=LabEnvironmentConfig(provider="mock"),
    targets=[
        LabTarget(hostname="sw1", role="Access switch"),
        LabTarget(hostname="sw2", role="Access switch"),
        LabTarget(hostname="sw3", role="Access switch"),
    ],
    objectives=[
        LabObjective(id="place-devices", label="Place all three switches",
                     validator="topology_devices_placed", args={"devices": _STP_SWITCHES},
                     description="Add SW1, SW2 and SW3.",
                     hints=["Three switches, no hosts needed for this one."]),
        LabObjective(id="connected", label="Every switch can reach every other",
                     validator="topology_connected", args={"devices": _STP_SWITCHES},
                     description="All three switches must be in one connected network.",
                     hints=["Two cables are enough to connect three switches in a line."]),
        LabObjective(id="no-loop", label="No switching loop",
                     validator="topology_no_loop", args={"devices": _STP_SWITCHES},
                     description="The switches must form a tree — no cable closes a loop.",
                     hints=["A ring (SW1–SW2–SW3–SW1) is a loop; drop one of its cables.",
                            "Connected + no loop over three switches means exactly two cables."]),
    ],
)
