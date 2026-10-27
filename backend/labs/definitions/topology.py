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
