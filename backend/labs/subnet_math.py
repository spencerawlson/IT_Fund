"""Pure subnetting math for the Subnetting Mastery lab (net-subnetting-001).

Shared by the `subnet` shell (labs/shells/subnet.py) and the objective validators
(labs/validators.py) so the worked solutions, the in-terminal feedback and the
"Check my work" checks all derive from a single implementation. Deterministic
arithmetic on the stdlib `ipaddress` module only — nothing executes.
"""
from __future__ import annotations

import ipaddress


# ---------------------------------------------------------------------------
# Core calculations
# ---------------------------------------------------------------------------

def cidr_to_mask(prefix: int) -> str:
    """'/26' -> '255.255.255.192'."""
    return str(ipaddress.IPv4Network(f"0.0.0.0/{prefix}").netmask)


def mask_to_cidr(mask: str) -> int:
    """'255.255.255.192' -> 26."""
    return ipaddress.IPv4Network(f"0.0.0.0/{mask.strip()}").prefixlen


def _v4net(ip: str, prefix: int) -> ipaddress.IPv4Network:
    return ipaddress.IPv4Network(f"{ip.strip()}/{prefix}", strict=False)


def network_address(ip: str, prefix: int) -> str:
    return str(_v4net(ip, prefix).network_address)


def broadcast_address(ip: str, prefix: int) -> str:
    return str(_v4net(ip, prefix).broadcast_address)


def usable_range(ip: str, prefix: int) -> tuple[str, str]:
    """(first usable, last usable) host addresses."""
    hosts = list(_v4net(ip, prefix).hosts())
    return str(hosts[0]), str(hosts[-1])


def usable_host_count(prefix: int) -> int:
    return _v4net("0.0.0.0", prefix).num_addresses - 2


def vlsm_allocate(base: str, base_prefix: int, host_counts: list[int]) -> list[str]:
    """Allocate subnets largest-first from base/prefix.

    Returns CIDR strings such as ['192.168.1.0/26', ...]. Raises ValueError if
    the requirements do not fit inside the base network.
    """
    base_net = ipaddress.IPv4Network(f"{base}/{base_prefix}", strict=False)
    out: list[str] = []
    cursor = int(base_net.network_address)
    last = int(base_net.broadcast_address)
    for need in sorted(host_counts, reverse=True):
        bits = (need + 2 - 1).bit_length()  # smallest power of two >= need+2
        prefix = 32 - bits
        net = ipaddress.IPv4Network((cursor, prefix))
        if int(net.broadcast_address) > last:
            raise ValueError(f"requirements do not fit in {base_net}")
        out.append(str(net))
        cursor = int(net.broadcast_address) + 1
    return out


def summarize(networks: list[str]) -> str:
    """Smallest single supernet covering every network in the list.

    Uses the longest common prefix of the full address range (first network
    address through last broadcast), which is the route-summarization method
    taught for Network+.
    """
    nets = sorted(ipaddress.IPv4Network(n.strip(), strict=False) for n in networks)
    first = int(nets[0].network_address)
    last = int(nets[-1].broadcast_address)
    prefix = 32 - (first ^ last).bit_length()
    return str(ipaddress.IPv4Network((first, prefix), strict=False))


def ipv6_nth_subnet(base: str, base_prefix: int, new_prefix: int, index: int) -> str:
    """The index-th (0-based) new_prefix subnet carved from base/base_prefix."""
    net = ipaddress.IPv6Network(f"{base}/{base_prefix}", strict=False)
    return str(list(net.subnets(new_prefix=new_prefix))[index])


def ipv6_subnet_count(base_prefix: int, new_prefix: int) -> int:
    return 2 ** (new_prefix - base_prefix)


# ---------------------------------------------------------------------------
# Answer normalization (student input -> canonical form for comparison)
# ---------------------------------------------------------------------------

def norm_ipv4(value: str) -> str | None:
    try:
        return str(ipaddress.IPv4Address(value.strip()))
    except ValueError:
        return None


def norm_network(value: str) -> str | None:
    """'192.168.1.0/26' (whitespace tolerated) -> canonical CIDR string."""
    try:
        return str(ipaddress.IPv4Network(value.strip(), strict=False))
    except ValueError:
        return None


def norm_mask(value: str) -> str | None:
    try:
        ipaddress.IPv4Network(f"0.0.0.0/{value.strip()}")
        return str(ipaddress.IPv4Address(value.strip()))
    except ValueError:
        return None


def norm_int(value: str) -> str | None:
    v = value.strip().replace(",", "").replace("_", "")
    if v.isdigit():
        return str(int(v))
    return None


def norm_ipv6net(value: str) -> str | None:
    try:
        return str(ipaddress.IPv6Network(value.strip(), strict=False))
    except ValueError:
        return None


def normalize_answer(key: str, value: str) -> str | None:
    """Canonicalize a raw student answer for the given answer key."""
    if key in ("cidr", "hosts", "count", "a", "b", "c"):
        return norm_int(value)
    if key == "mask":
        return norm_mask(value)
    if key in ("network", "broadcast", "first", "last"):
        return norm_ipv4(value)
    if key in ("s1", "s2", "s3", "s4", "sum1", "sum2"):
        return norm_network(value)
    if key == "subnet":
        return norm_ipv6net(value)
    return value.strip() or None


# ---------------------------------------------------------------------------
# Lab problems (fixed so validators can recompute the expected answers)
# ---------------------------------------------------------------------------

def _p_cidr():
    return {"mask": cidr_to_mask(20), "cidr": str(mask_to_cidr("255.255.255.192"))}


def _p_net_bcast():
    return {
        "network": network_address("192.168.10.77", 26),
        "broadcast": broadcast_address("192.168.10.77", 26),
    }


def _p_host_range():
    first, last = usable_range("10.20.30.45", 21)
    return {"first": first, "last": last}


def _p_host_count():
    return {
        "a": str(usable_host_count(27)),
        "b": str(usable_host_count(30)),
        "c": str(usable_host_count(16)),
    }


def _p_vlsm():
    alloc = vlsm_allocate("192.168.1.0", 24, [50, 25, 12, 6])
    return {"s1": alloc[0], "s2": alloc[1], "s3": alloc[2], "s4": alloc[3]}


def _p_supernet():
    return {
        "sum1": summarize(["192.168.0.0/24", "192.168.1.0/24", "192.168.2.0/24", "192.168.3.0/24"]),
        "sum2": summarize(["10.1.0.0/16", "10.2.0.0/16"]),
    }


def _p_ipv6():
    return {
        "subnet": ipv6_nth_subnet("2001:db8:abcd::", 48, 64, 4),
        "count": str(ipv6_subnet_count(48, 64)),
    }


def _p_final():
    first, last = usable_range("172.20.14.99", 23)
    return {
        "network": network_address("172.20.14.99", 23),
        "broadcast": broadcast_address("172.20.14.99", 23),
        "mask": cidr_to_mask(23),
        "hosts": str(usable_host_count(23)),
        "first": first,
        "last": last,
    }


# Ordered: the shell presents them in this order and the lab objectives match.
PROBLEMS: list[dict] = [
    {
        "id": "cidr",
        "title": "CIDR notation",
        "brief": "Convert between CIDR prefix length and dotted-decimal mask.",
        "prompt": [
            "Problem 1 — CIDR notation",
            "  a) What is the dotted-decimal subnet mask for 10.0.0.0/20?",
            "  b) What is the CIDR prefix length for mask 255.255.255.192?",
            "",
            "Answer with:  answer mask=<dotted-mask> cidr=<prefix>",
            "Example:      answer mask=255.255.0.0 cidr=16",
        ],
        "fields": ["mask", "cidr"],
        "solve": _p_cidr,
    },
    {
        "id": "net-bcast",
        "title": "Network and broadcast addresses",
        "brief": "Find the network and broadcast address of 192.168.10.77/26.",
        "prompt": [
            "Problem 2 — Network and broadcast addresses",
            "  Host 192.168.10.77 with mask /26.",
            "  What is the network address? What is the broadcast address?",
            "",
            "Answer with:  answer network=<ip> broadcast=<ip>",
            "Example:      answer network=192.168.1.0 broadcast=192.168.1.255",
        ],
        "fields": ["network", "broadcast"],
        "solve": _p_net_bcast,
    },
    {
        "id": "host-range",
        "title": "Usable host range",
        "brief": "Find the first/last usable host of 10.20.30.45/21.",
        "prompt": [
            "Problem 3 — Usable host range",
            "  Host 10.20.30.45 with mask /21.",
            "  What is the first usable host address? The last usable host address?",
            "  (Remember: network and broadcast addresses are not usable.)",
            "",
            "Answer with:  answer first=<ip> last=<ip>",
            "Example:      answer first=192.168.1.1 last=192.168.1.254",
        ],
        "fields": ["first", "last"],
        "solve": _p_host_range,
    },
    {
        "id": "host-count",
        "title": "Usable host count",
        "brief": "How many usable hosts fit in /27, /30 and /16 subnets?",
        "prompt": [
            "Problem 4 — Usable host count",
            "  How many usable host addresses fit in each subnet?",
            "    a) 172.16.5.10/27",
            "    b) 192.168.0.1/30",
            "    c) 10.0.0.5/16",
            "",
            "Answer with:  answer a=<n> b=<n> c=<n>",
            "Example:      answer a=126 b=2 c=65534",
        ],
        "fields": ["a", "b", "c"],
        "solve": _p_host_count,
    },
    {
        "id": "vlsm",
        "title": "VLSM allocation",
        "brief": "Carve 192.168.1.0/24 into subnets for 50, 25, 12 and 6 hosts.",
        "prompt": [
            "Problem 5 — VLSM allocation",
            "  You own 192.168.1.0/24. Carve it into subnets for:",
            "    s1) 50 hosts    s2) 25 hosts    s3) 12 hosts    s4) 6 hosts",
            "  Allocate largest-first with no gaps and no overlaps.",
            "",
            "Answer with:  answer s1=<net/cidr> s2=<net/cidr> s3=<net/cidr> s4=<net/cidr>",
            "Example:      answer s1=10.0.0.0/25 s2=10.0.0.128/26",
        ],
        "fields": ["s1", "s2", "s3", "s4"],
        "solve": _p_vlsm,
    },
    {
        "id": "supernet",
        "title": "Route summarization",
        "brief": "Summarize 192.168.0-3.0/24 and 10.1-2.0.0/16.",
        "prompt": [
            "Problem 6 — Route summarization (supernetting)",
            "  What single summary route covers each set?",
            "    sum1) 192.168.0.0/24, 192.168.1.0/24, 192.168.2.0/24, 192.168.3.0/24",
            "    sum2) 10.1.0.0/16, 10.2.0.0/16",
            "",
            "Answer with:  answer sum1=<net/cidr> sum2=<net/cidr>",
            "Example:      answer sum1=192.168.0.0/22 sum2=10.0.0.0/15",
        ],
        "fields": ["sum1", "sum2"],
        "solve": _p_supernet,
    },
    {
        "id": "ipv6",
        "title": "IPv6 subnetting",
        "brief": "Carve /64s from 2001:db8:abcd::/48.",
        "prompt": [
            "Problem 7 — IPv6 subnetting",
            "  You own 2001:db8:abcd::/48.",
            "  a) What is the 5th /64 subnet? (the first is 2001:db8:abcd:0::/64)",
            "  b) How many /64 subnets fit inside the /48?",
            "",
            "Answer with:  answer subnet=<ipv6-net/prefix> count=<n>",
            "Example:      answer subnet=2001:db8::1:0/64 count=256",
        ],
        "fields": ["subnet", "count"],
        "solve": _p_ipv6,
    },
    {
        "id": "final",
        "title": "Full subnet analysis",
        "brief": "Fully analyze 172.20.14.99/23.",
        "prompt": [
            "Problem 8 — Full subnet analysis (put it all together)",
            "  For host 172.20.14.99/23, find everything:",
            "  network, broadcast, dotted-decimal mask, usable host count,",
            "  first and last usable host.",
            "",
            "Answer with:  answer network=<ip> broadcast=<ip> mask=<mask>",
            "                    hosts=<n> first=<ip> last=<ip>",
        ],
        "fields": ["network", "broadcast", "mask", "hosts", "first", "last"],
        "solve": _p_final,
    },
]

PROBLEM_IDS = [p["id"] for p in PROBLEMS]


def get_problem(problem_id: str) -> dict | None:
    return next((p for p in PROBLEMS if p["id"] == problem_id), None)


def expected_answers(problem_id: str) -> dict[str, str]:
    """Recompute the expected answers for a problem (used by validators)."""
    problem = get_problem(problem_id)
    if problem is None:
        raise KeyError(f"unknown subnetting problem: {problem_id}")
    return problem["solve"]()


def check_answers(problem_id: str, recorded: dict[str, str]) -> tuple[bool, list[str], list[str], dict[str, str]]:
    """Compare recorded answers against recomputed expected values.

    Returns (passed, missing_keys, wrong_keys, expected).
    """
    expected = expected_answers(problem_id)
    missing = [k for k in expected if k not in recorded]
    wrong = [k for k in expected if k in recorded and recorded[k] != expected[k]]
    return (not missing and not wrong, missing, wrong, expected)


# ---------------------------------------------------------------------------
# Worked solutions (the `solve` study aid)
# ---------------------------------------------------------------------------

def _bits(ip: str) -> str:
    return ".".join(f"{int(o):08b}" for o in ip.split("."))


def worked_solution(ip: str, prefix: int) -> list[str]:
    """Step-by-step binary breakdown of ip/prefix for the `solve` command."""
    net = _v4net(ip, prefix)
    mask = cidr_to_mask(prefix)
    first, last = usable_range(ip, prefix)
    lines = [
        f"Worked solution for {ip}/{prefix}",
        "",
        f"  IP:        {ip:>15}   {_bits(ip)}",
        f"  Mask /{prefix:<2}: {mask:>15}   {_bits(mask)}",
        f"  Network:   {str(net.network_address):>15}   (host bits -> 0)",
        f"  Broadcast: {str(net.broadcast_address):>15}   (host bits -> 1)",
        f"  Usable:    {first} - {last}",
        f"  Hosts:     {usable_host_count(prefix)} usable "
        f"({net.num_addresses} total - network - broadcast)",
    ]
    return lines
