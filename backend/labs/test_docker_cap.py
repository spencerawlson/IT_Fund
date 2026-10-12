"""Tests for the per-owner Docker session cap (real containers cost host resources)."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio

import pytest

from labs.providers.mock import MockLabProvider
from labs.sessions import MAX_LIVE_DOCKER_SESSIONS_PER_OWNER, LabError, SessionService


def _svc():
    return SessionService(providers={"mock": MockLabProvider(), "docker": MockLabProvider()})


def test_docker_cap_blocks_fourth_live_container_lab():
    svc = _svc()
    # py-basics-001 is docker-backed; the mock stands in for the daemon here.
    ids = [asyncio.run(svc.start("py-basics-001", "u1")).id
           for _ in range(MAX_LIVE_DOCKER_SESSIONS_PER_OWNER)]
    assert len(ids) == MAX_LIVE_DOCKER_SESSIONS_PER_OWNER
    with pytest.raises(LabError, match="container labs open"):
        asyncio.run(svc.start("py-basics-001", "u1"))


def test_docker_cap_is_per_owner():
    svc = _svc()
    for _ in range(MAX_LIVE_DOCKER_SESSIONS_PER_OWNER):
        asyncio.run(svc.start("py-basics-001", "u1"))
    # Another owner is unaffected.
    s = asyncio.run(svc.start("py-basics-001", "u2"))
    assert s.user_id == "u2"


def test_mock_labs_do_not_count_against_docker_cap():
    svc = _svc()
    # net-vlan-001 is mock-backed: one mock lab stays well under both caps.
    asyncio.run(svc.start("net-vlan-001", "u1"))
    # Docker labs still start up to their own cap: the mock session doesn't consume it.
    for _ in range(MAX_LIVE_DOCKER_SESSIONS_PER_OWNER):
        asyncio.run(svc.start("py-basics-001", "u1"))
    with pytest.raises(LabError, match="container labs open"):
        asyncio.run(svc.start("py-basics-001", "u1"))
