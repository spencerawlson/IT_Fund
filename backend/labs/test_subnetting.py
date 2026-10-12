"""Tests for the Subnetting Mastery lab (net-subnetting-001): the `subnet` shell,
the subnet_math helpers, the parameterized validator, and the lab definition."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs import subnet_math as sm
from labs.definitions.networking import SUBNETTING_LAB as LAB
from labs.registry import get_lab
from labs.shells import has_shell, meta, subnet
from labs.validators import VALIDATORS

V = VALIDATORS["subnet_problem_solved"]


def run(cmd, findings=None):
    return subnet.run(LAB, cmd, dict(findings or {}))


def check(obj, findings):
    return V({"objective": obj}, findings)


# ---- lab definition & registry ----

def test_lab_registered_with_eight_objectives():
    lab = get_lab("net-subnetting-001")
    assert lab is LAB
    assert lab.title == "Subnetting Mastery"
    assert lab.shell == "subnet"
    assert has_shell(lab)
    assert [o.id for o in lab.objectives] == sm.PROBLEM_IDS
    assert all(o.validator == "subnet_problem_solved" for o in lab.objectives)
    assert all(o.args.get("objective") == o.id for o in lab.objectives)


def test_shell_meta():
    assert subnet.initial_prompt(LAB).strip()
    banner = subnet.banner(LAB)
    assert isinstance(banner, list) and any("Subnetting" in line for line in banner)
    assert meta(LAB)["prompt"] == subnet.initial_prompt(LAB)


def test_help_and_unknown_command():
    assert "practice" in run("help").output
    r = run("frobnicate")
    assert r.exit_code == 127


def test_clear():
    assert run("clear").clear is True


# ---- subnet_math sanity ----

def test_math_helpers():
    assert sm.cidr_to_mask(26) == "255.255.255.192"
    assert sm.mask_to_cidr("255.255.255.192") == 26
    assert sm.network_address("192.168.10.77", 26) == "192.168.10.64"
    assert sm.broadcast_address("192.168.10.77", 26) == "192.168.10.127"
    assert sm.usable_range("10.20.30.45", 21) == ("10.20.24.1", "10.20.31.254")
    assert sm.usable_host_count(27) == 30
    assert sm.usable_host_count(30) == 2
    assert sm.usable_host_count(16) == 65534


def test_vlsm_allocation():
    assert sm.vlsm_allocate("192.168.1.0", 24, [50, 25, 12, 6]) == [
        "192.168.1.0/26", "192.168.1.64/27", "192.168.1.96/28", "192.168.1.112/29",
    ]


def test_summarize():
    assert sm.summarize(["192.168.0.0/24", "192.168.1.0/24", "192.168.2.0/24", "192.168.3.0/24"]) == "192.168.0.0/22"
    assert sm.summarize(["10.1.0.0/16", "10.2.0.0/16"]) == "10.0.0.0/14"


def test_ipv6_helpers():
    assert sm.ipv6_nth_subnet("2001:db8:abcd::", 48, 64, 4) == "2001:db8:abcd:4::/64"
    assert sm.ipv6_subnet_count(48, 64) == 65536


def test_expected_answers_recomputed():
    assert sm.expected_answers("cidr") == {"mask": "255.255.240.0", "cidr": "26"}
    assert sm.expected_answers("vlsm")["s1"] == "192.168.1.0/26"
    final = sm.expected_answers("final")
    assert final == {
        "network": "172.20.14.0", "broadcast": "172.20.15.255",
        "mask": "255.255.254.0", "hosts": "510",
        "first": "172.20.14.1", "last": "172.20.15.254",
    }


# ---- shell: problems / practice / solve ----

def test_problems_lists_all_eight():
    out = run("problems").output
    for p in sm.PROBLEMS:
        assert p["title"] in out
    assert out.count("[ ]") == 8


def test_practice_defaults_to_first_unsolved():
    out = run("practice").output
    assert "Problem 1" in out and "CIDR" in out


def test_practice_by_number():
    out = run("practice 5").output
    assert "VLSM" in out
    assert "192.168.1.0/24" in out


def test_practice_bad_number():
    assert run("practice 9").exit_code == 1
    assert run("practice x").exit_code == 1


def test_solve_shows_work():
    out = run("solve 192.168.10.77/26").output
    assert "192.168.10.64" in out  # network
    assert "192.168.10.127" in out  # broadcast
    assert "255.255.255.192" in out
    assert "62 usable" in out


def test_solve_rejects_bad_input():
    assert run("solve").exit_code == 2
    assert run("solve 999.1.1.1/24").exit_code == 1
    assert run("solve 10.0.0.1/33").exit_code == 1


def test_progress_starts_at_zero():
    assert "0 of 8" in run("progress").output


# ---- shell: answer flow ----

def test_answer_wrong_then_right():
    r = run("answer mask=255.255.0.0 cidr=26", {})
    assert "✗" in r.output and "mask" in r.output
    ok, _, _ = check("cidr", r.findings)
    assert ok is False

    r2 = subnet.run(LAB, "answer mask=255.255.240.0", r.findings)
    assert "Objective complete" in r2.output
    ok, _, _ = check("cidr", r2.findings)
    assert ok is True


def test_answer_rejects_unknown_keys():
    r = run("answer foo=bar", {})
    assert r.exit_code == 2
    assert "unexpected key" in r.output


def test_answer_rejects_garbage_values():
    r = run("answer mask=banana", {})
    assert r.exit_code == 1
    assert "invalid value" in r.output


def test_answer_requires_kv_format():
    r = run("answer justaword", {})
    assert r.exit_code == 2


def test_answer_marks_progress_and_advances():
    r = subnet.run(LAB, "answer mask=255.255.240.0 cidr=26", {})
    out = run("problems", r.findings).output
    assert out.count("[x]") == 1
    # practice now shows problem 2
    assert "Problem 2" in subnet.run(LAB, "practice", r.findings).output


# ---- validators: every objective, right and wrong ----

CORRECT = {
    "cidr": "answer mask=255.255.240.0 cidr=26",
    "net-bcast": "answer network=192.168.10.64 broadcast=192.168.10.127",
    "host-range": "answer first=10.20.24.1 last=10.20.31.254",
    "host-count": "answer a=30 b=2 c=65534",
    "vlsm": "answer s1=192.168.1.0/26 s2=192.168.1.64/27 s3=192.168.1.96/28 s4=192.168.1.112/29",
    "supernet": "answer sum1=192.168.0.0/22 sum2=10.0.0.0/14",
    "ipv6": "answer subnet=2001:db8:abcd:4::/64 count=65536",
    "final": "answer network=172.20.14.0 broadcast=172.20.15.255 mask=255.255.254.0 hosts=510 first=172.20.14.1 last=172.20.15.254",
}


def _solve_all():
    findings = {}
    for obj, cmd in CORRECT.items():
        r = subnet.run(LAB, cmd, findings)
        findings.update(r.findings)
    return findings


def test_all_objectives_completable():
    findings = _solve_all()
    for obj in sm.PROBLEM_IDS:
        ok, msg, _ = check(obj, findings)
        assert ok is True, f"{obj}: {msg}"
    assert "8 of 8" in run("progress", findings).output
    assert "All eight problems are solved" in subnet.run(LAB, "practice", findings).output


def test_validator_rejects_no_answers():
    ok, msg, _ = check("cidr", {})
    assert ok is False and "No answers recorded" in msg


def test_answer_accepts_problem_number():
    r = run("answer 2 network=192.168.10.64 broadcast=192.168.10.127", {})
    ok, _, _ = check("net-bcast", r.findings)
    assert ok is True
    # ...but problem 1 is still the current one
    assert "Problem 1" in subnet.run(LAB, "practice", r.findings).output


def test_answer_rejects_bad_problem_number():
    assert run("answer 9 network=x", {}).exit_code == 2


def test_validator_rejects_wrong_network():
    r = run("answer 2 network=192.168.10.0 broadcast=192.168.10.127", {})
    ok, msg, _ = check("net-bcast", r.findings)
    assert ok is False and "network" in msg


def test_validator_rejects_wrong_vlsm_order():
    # right sizes, wrong order: s1 too small for 50 hosts
    r = run("answer 5 s1=192.168.1.0/27 s2=192.168.1.32/27 s3=192.168.1.96/28 s4=192.168.1.112/29", {})
    ok, _, _ = check("vlsm", r.findings)
    assert ok is False


def test_validator_rejects_wrong_supernet():
    r = run("answer 6 sum1=192.168.0.0/23 sum2=10.0.0.0/14", {})
    ok, msg, _ = check("supernet", r.findings)
    assert ok is False and "sum1" in msg


def test_validator_accepts_ipv6_variants():
    r = run("answer 7 subnet=2001:0DB8:ABCD:0004:0000:0000:0000:0000/64 count=65536", {})
    ok, _, _ = check("ipv6", r.findings)
    assert ok is True  # expanded form normalizes to compressed


def test_validator_rejects_partial_answers():
    r = run("answer 2 network=192.168.10.64", {})
    ok, msg, _ = check("net-bcast", r.findings)
    assert ok is False and "missing" in msg


def test_validator_unknown_objective():
    ok, msg, _ = V({"objective": "nope"}, {})
    assert ok is False and "Unknown" in msg


def test_answers_tolerate_whitespace():
    r = run("answer 2   network=192.168.10.64   broadcast=192.168.10.127  ", {})
    ok, _, _ = check("net-bcast", r.findings)
    assert ok is True
