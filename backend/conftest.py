"""Shared test fixtures for the backend suite.

CI and sandboxes have no Docker daemon, so docker-backed labs would 503 with
"Lab provider 'docker' is not available" and every API-mechanics test that
starts one would fail for infrastructure reasons. This fixture routes the
"docker" provider name to the mock provider in the session service, so the
API layer (sessions, auth, entitlement, validation) is exercised without a
daemon. DockerLabProvider itself is covered by labs/test_docker_provider.py,
which constructs the provider directly and is unaffected by this alias.
"""
import pytest

from labs import sessions as sessions_mod


@pytest.fixture(autouse=True)
def _route_docker_labs_to_mock():
    providers = sessions_mod.service._providers
    mock_provider = providers.get("mock")
    if mock_provider is not None:
        providers["docker"] = mock_provider
    yield
    # Leave the alias in place: setup_function in each file clears session
    # state, and the alias is idempotent.
