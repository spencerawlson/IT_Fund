"""Contract tests for the security-tools lab group (Phase 3).

No Docker daemon needed: these verify the definitions (fields, objectives,
env hardening), the validators' pass/fail logic with synthetic findings, and
the image build inputs. The real-daemon end-to-end check is a documented VM
step (see backend/labs/images/README.md).
"""
import re
import struct
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import labs.validators_sectools  # noqa: F401  (registers ws_*/webapp_*/gitleaks_* validators)
from labs.definitions.sectools import GITLEAKS_LAB, WEBAPP_LAB, WIRESHARK_LAB
from labs.validators import VALIDATORS

IMAGES_DIR = backend_dir / "labs" / "images"
SEEDS_DIR = IMAGES_DIR / "seeds"

WS_VALIDATORS = [
    "ws_capture_opened", "ws_protocols_identified", "ws_tcp_stream_followed",
    "ws_credentials_found", "ws_dns_exfil_found", "ws_report_written",
]
WEBAPP_VALIDATORS = [
    "webapp_enumerated", "webapp_sqli_proven", "webapp_sqli_extracted",
    "webapp_xss_reflected", "webapp_fix_proposed", "webapp_loopback_verified",
]
GITLEAKS_VALIDATORS = [
    "gitleaks_run", "gitleaks_types_identified", "gitleaks_history_found",
    "gitleaks_remediated", "gitleaks_precommit_added",
]


def _check_hardened_env(lab):
    env = lab.environment
    assert env.provider == "docker"
    assert env.image and env.image.startswith("road-to-cissp/") and env.image.endswith(":latest")
    assert env.workdir == "/home/analyst"
    assert env.idle_timeout_minutes == 15
    assert env.max_runtime_minutes == 45
    assert env.deny_internet_egress is True
    assert env.cpu_limit == 1.0
    assert env.memory_mb == 512
    assert lab.shell == "linux_cli"
    assert lab.category == "cybersecurity"


# ---------------------------------------------------------------------------
# definitions
# ---------------------------------------------------------------------------

def test_wireshark_lab_fields():
    lab = WIRESHARK_LAB
    assert lab.id == "tools-wireshark-001"
    assert lab.title == "Wireshark / tshark Packet Analysis"
    assert lab.difficulty == "intermediate"
    assert lab.estimated_minutes == 25
    assert lab.environment.image == "road-to-cissp/wireshark:latest"
    assert len(lab.objectives) == 6
    _check_hardened_env(lab)


def test_webapp_lab_fields():
    lab = WEBAPP_LAB
    assert lab.id == "sec-webapp-001"
    assert lab.title == "Web App Testing: SQLi & XSS"
    assert lab.difficulty == "intermediate"
    assert lab.estimated_minutes == 30
    assert lab.environment.image == "road-to-cissp/webapp:latest"
    assert lab.environment.extra_hosts == {"target.lab": "127.0.0.1"}
    target = lab.targets[0]
    assert target.hostname == "target.lab"
    assert target.intentionally_vulnerable is True
    assert len(lab.objectives) == 6
    _check_hardened_env(lab)


def test_gitleaks_lab_fields():
    lab = GITLEAKS_LAB
    assert lab.id == "sec-gitleaks-001"
    assert lab.title == "Secret Scanning with gitleaks"
    assert lab.difficulty == "beginner"
    assert lab.estimated_minutes == 20
    assert lab.environment.image == "road-to-cissp/gitleaks:latest"
    assert len(lab.objectives) == 5
    _check_hardened_env(lab)


def test_objective_validators_all_registered_and_unique():
    seen = set()
    for lab, expected in (
        (WIRESHARK_LAB, WS_VALIDATORS),
        (WEBAPP_LAB, WEBAPP_VALIDATORS),
        (GITLEAKS_LAB, GITLEAKS_VALIDATORS),
    ):
        got = [o.validator for o in lab.objectives]
        assert got == expected, f"{lab.id}: {got}"
        for v in got:
            assert v in VALIDATORS, f"{lab.id}: validator {v!r} not registered"
            assert v not in seen, f"duplicate validator name: {v}"
            seen.add(v)
        # every objective has a label and at least one hint
        for o in lab.objectives:
            assert o.label
            assert o.hints, f"{lab.id}/{o.id}: no hints"


def test_objective_ids_unique_within_lab():
    for lab in (WIRESHARK_LAB, WEBAPP_LAB, GITLEAKS_LAB):
        ids = [o.id for o in lab.objectives]
        assert len(ids) == len(set(ids)), f"{lab.id}: duplicate objective id"


# ---------------------------------------------------------------------------
# validator pass/fail logic (attestation pattern, synthetic findings)
# ---------------------------------------------------------------------------

def _check_validator(name):
    fn = VALIDATORS[name]
    passed, msg, evidence = fn({}, {})
    assert passed is False and evidence is None and msg
    passed, msg, evidence = fn({}, {name: {"attested": True}})
    assert passed is True and msg and evidence == {"attested": True}


def test_ws_validators_pass_fail():
    for name in WS_VALIDATORS:
        _check_validator(name)


def test_webapp_validators_pass_fail():
    for name in WEBAPP_VALIDATORS:
        _check_validator(name)


def test_gitleaks_validators_pass_fail():
    for name in GITLEAKS_VALIDATORS:
        _check_validator(name)


def test_validator_namespaces():
    for name in VALIDATORS:
        if name.startswith(("ws_", "webapp_", "gitleaks_")):
            fn = VALIDATORS[name]
            passed, _, _ = fn({}, {name: True})
            assert passed is True


# ---------------------------------------------------------------------------
# image build inputs
# ---------------------------------------------------------------------------

def test_dockerfiles_exist_and_follow_conventions():
    for dockerfile in ("Dockerfile.wireshark", "Dockerfile.webapp", "Dockerfile.gitleaks"):
        text = (IMAGES_DIR / dockerfile).read_text(encoding="utf-8")
        assert re.search(r"^FROM (python:3\.12\.7-slim-bookworm|debian:bookworm-slim|road-to-cissp/)",
                         text, re.M), f"{dockerfile}: unpinned or unknown base"
        assert "\nUSER analyst\n" in text, f"{dockerfile}: must drop to non-root analyst"
        assert 'CMD ["sleep", "infinity"]' in text, f"{dockerfile}: provider execs sleep infinity"


def test_wireshark_seeds_present_and_valid_pcap():
    seed = SEEDS_DIR / "tools-wireshark-001"
    assert (seed / "gen_pcap.py").is_file()
    for pcap in ("capture.pcap", "dns-exfil.pcap"):
        data = (seed / pcap).read_bytes()
        magic, = struct.unpack("<I", data[:4])
        assert magic == 0xA1B2C3D4, f"{pcap}: bad pcap magic"
        assert len(data) > 1000, f"{pcap}: suspiciously small"
    raw = (seed / "capture.pcap").read_bytes()
    assert b"password=Sup3rS3cret!" in raw  # cleartext creds seed
    assert b"YWRtaW46cGFzc3dvcmQxMjM=" in raw  # Basic auth seed
    assert b"\x05exfil\x08evil-dns\x03net\x00" in raw  # DNS exfil seed (label-encoded)


def test_webapp_seeds_present():
    seed = SEEDS_DIR / "sec-webapp-001"
    app = (seed / "app.py").read_text(encoding="utf-8")
    assert (seed / "entrypoint.sh").is_file()
    assert "127.0.0.1" in app and "0.0.0.0" not in app, "app must bind loopback only"
    assert "LIKE '%{q}%'" in app, "SQLi seed: interpolated query"
    assert "/search" in app and "/comment" in app


def test_gitleaks_seeds_present_and_fake():
    seed = SEEDS_DIR / "sec-gitleaks-001"
    script = (seed / "seed_repo.sh").read_text(encoding="utf-8")
    assert "AKIAIOSFODNN7EXAMPLE" in script
    assert script.count("FAKE") >= 5, "every fake secret must be marked FAKE"
    for line in script.splitlines():
        low = line.lower()
        assert "real password" not in low and "actual secret" not in low
