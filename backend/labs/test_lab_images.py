"""Contract tests for the road-to-cissp lab images (backend/labs/images/).

No Docker daemon needed: these tests verify the build inputs — Dockerfiles,
seeds, scripts, build.sh — against the lab definitions that reference them and
the mock shells the seeds were extracted from. The real-daemon verification
(build + LAB_DOCKER_ENABLED=1 end-to-end) is documented as explicit VM steps in
backend/labs/images/README.md.
"""
import importlib.util
import py_compile
import re
import shlex
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

LABS_DIR = Path(__file__).resolve().parent
IMAGES_DIR = LABS_DIR / "images"
SEEDS_DIR = IMAGES_DIR / "seeds"
DEFS_DIR = LABS_DIR / "definitions"

backend_dir = LABS_DIR.parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Every image a definition names -> the Dockerfile that builds it.
# None = deliberately not built (must be documented in images/README.md).
IMAGE_DOCKERFILE = {
    "python-basics": "Dockerfile.python",
    "python-automation": "Dockerfile.python",
    "python-netauto": "Dockerfile.python",
    "log-triage": "Dockerfile.logtriage",
    "security-tools": "Dockerfile.sectools",
    "portblast-lab": "Dockerfile.portblast",
    "cloudshell": "Dockerfile.cloudshell",
    "iac": "Dockerfile.iac",
    "docker-siem": None,  # Docker-in-Docker is incompatible with the hardened provider
}

IMAGE_RE = re.compile(r'image="(road-to-cissp/([\w-]+)):latest"')


def _definition_images():
    """All road-to-cissp/* image names referenced by lab definitions."""
    found = set()
    for path in DEFS_DIR.glob("*.py"):
        found.update(IMAGE_RE.findall(path.read_text(encoding="utf-8")))
    return {full for full, _name in found}


# ---------------------------------------------------------------------------
# Image <-> definition contract
# ---------------------------------------------------------------------------

def test_every_referenced_image_is_known():
    for image in _definition_images():
        name = image.removeprefix("road-to-cissp/")
        assert name in IMAGE_DOCKERFILE, f"{image} has no Dockerfile mapping"


def test_every_built_image_has_a_dockerfile():
    for name, dockerfile in IMAGE_DOCKERFILE.items():
        if dockerfile is None:
            continue
        path = IMAGES_DIR / dockerfile
        assert path.is_file(), f"{name}: missing {dockerfile}"


def test_unbuilt_images_are_documented():
    readme = (IMAGES_DIR / "README.md").read_text(encoding="utf-8")
    for image in _definition_images():
        name = image.removeprefix("road-to-cissp/")
        if IMAGE_DOCKERFILE[name] is None:
            assert f"road-to-cissp/{name}" in readme, (
                f"{image} has no image but its exclusion is not documented in images/README.md")


def test_build_sh_covers_every_built_image():
    """build.sh must produce exactly the tag each definition references."""
    lines = (IMAGES_DIR / "build.sh").read_text(encoding="utf-8").splitlines()
    built = set()
    for line in lines:
        line = line.strip()
        if not line.startswith("build "):
            continue
        parts = shlex.split(line)
        built.add(parts[1])  # the registry name
        for tok in parts[3:]:  # extra tags after the Dockerfile
            if tok.startswith("-"):
                break
            built.add(tok)
    for name, dockerfile in IMAGE_DOCKERFILE.items():
        if dockerfile is None:
            continue
        assert name in built, f"build.sh never tags road-to-cissp/{name}"


def test_image_backed_definitions_set_workdir():
    """Every definition that names an image must set a writable workdir for the
    non-root lab user (the docker provider execs there)."""
    for path in DEFS_DIR.glob("*.py"):
        text = path.read_text(encoding="utf-8")
        if 'image="road-to-cissp/' in text:
            assert 'workdir="' in text, f"{path.name}: image set but no workdir"


# ---------------------------------------------------------------------------
# Dockerfile content
# ---------------------------------------------------------------------------

def test_dockerfiles_use_pinned_bases_and_non_root_users():
    for dockerfile in {d for d in IMAGE_DOCKERFILE.values() if d}:
        text = (IMAGES_DIR / dockerfile).read_text(encoding="utf-8")
        assert re.search(r"^FROM (python:3\.12\.7-slim-bookworm|debian:bookworm-slim|road-to-cissp/)",
                         text, re.M), f"{dockerfile}: unpinned or unknown base"
        assert re.search(r"^USER (analyst|student|auditor)$", text, re.M), (
            f"{dockerfile}: must drop to a non-root lab user")
        assert 'CMD ["sleep", "infinity"]' in text, (
            f"{dockerfile}: the provider starts lab containers with `sleep infinity`")


def test_iac_image_pins_toolchain_and_verifies_checksums():
    text = (IMAGES_DIR / "Dockerfile.iac").read_text(encoding="utf-8")
    assert "TERRAFORM_VERSION=1.9.8" in text
    assert "TFSEC_VERSION=v1.28.14" in text
    assert text.count("sha256sum -c") >= 2  # terraform zip AND tfsec binary
    assert "terraform providers mirror" in text  # offline provider seed


def test_cloudshell_image_pins_cli_and_simulator():
    text = (IMAGES_DIR / "Dockerfile.cloudshell").read_text(encoding="utf-8")
    assert "awscli==1.46.1" in text
    assert "moto[server]==5.2.3" in text


def test_portblast_image_extends_security_tools():
    text = (IMAGES_DIR / "Dockerfile.portblast").read_text(encoding="utf-8")
    assert "FROM road-to-cissp/security-tools:${BASE_TAG}" in text


# ---------------------------------------------------------------------------
# Seed fidelity: committed seeds == the mock shell data, byte for byte
# ---------------------------------------------------------------------------

def _seed(rel):
    return (SEEDS_DIR / rel).read_bytes()


def test_python_seeds_match_mock_shell():
    from labs.shells import linux_python
    assert _seed("python/auth.log") == ("\n".join(linux_python.AUTH_LOG) + "\n").encode()
    assert _seed("python/notes.txt") == ("\n".join(linux_python.NOTES_TXT) + "\n").encode()
    assert _seed("python/switch.cfg") == (linux_python.SWITCH_CFG + "\n").encode()


def test_logtriage_seeds_match_mock_shells():
    from labs import logsets
    from labs.shells import linux_logs
    assert _seed("logtriage/auth.log") == ("\n".join(linux_logs.AUTH_LOG) + "\n").encode()
    seen = set()
    for _lab_id, loglab in logsets.LOGSETS.items():
        for name, lines in loglab.files.items():
            assert _seed(f"logtriage/{name}") == ("\n".join(lines) + "\n").encode()
            seen.add(name)
    assert seen == {"conn.log", "http.log", "dns.log", "smb.log"}


def test_iac_main_tf_matches_mock_plus_offline_stanza():
    from labs.shells import terraform
    content = (SEEDS_DIR / "iac" / "main.tf").read_text(encoding="utf-8")
    # The mock's config with the provider pinned to the simulated version...
    expected_prefix = terraform.MAIN_TF.replace(
        'version = "~> 5.0"', 'version = "5.31.0"').rstrip("\n") + "\n"
    assert content.startswith(expected_prefix)
    # ...plus the offline-lab stanza (dummy creds + skip flags)...
    assert "skip_credentials_validation = true" in content
    assert "skip_metadata_api_check     = true" in content
    assert "skip_requesting_account_id  = true" in content
    # ...and the lab's insecure SSH ingress tfsec must flag.
    assert 'cidr_blocks = ["0.0.0.0/0"]' in content
    assert re.search(r"from_port\s+=\s+22", content), "insecure SSH ingress must survive"


def test_gen_seeds_is_idempotent():
    """Re-running gen_seeds.py must not change any committed seed file."""
    spec = importlib.util.spec_from_file_location(
        "gen_seeds", IMAGES_DIR / "gen_seeds.py")
    gen_seeds = importlib.util.module_from_spec(spec)
    before = {p: p.read_bytes() for p in SEEDS_DIR.rglob("*") if p.is_file()}
    spec.loader.exec_module(gen_seeds)
    gen_seeds.main()
    after = {p: p.read_bytes() for p in SEEDS_DIR.rglob("*") if p.is_file()}
    assert before.keys() == after.keys()
    for path, data in before.items():
        assert after[path] == data, f"gen_seeds.py changed {path.relative_to(SEEDS_DIR)}"


# ---------------------------------------------------------------------------
# The real portblast scanner: nmap XML parsing
# ---------------------------------------------------------------------------

def _load_portblast():
    src = (IMAGES_DIR / "seeds" / "portblast" / "portblast").read_text(encoding="utf-8")
    assert src.startswith("#!/usr/bin/env python3")
    mod = importlib.util.module_from_spec(
        importlib.util.spec_from_loader("portblast", loader=None))
    # Execute the module without running main().
    src = src.replace('if __name__ == "__main__":', 'if False:')
    exec(compile(src, "portblast", "exec"), mod.__dict__)
    return mod


NMAP_XML = """<?xml version="1.0"?>
<nmaprun>
<host><address addr="127.0.0.1" addrtype="ipv4"/>
<ports>
<port protocol="tcp" portid="22"><state state="open"/><service name="ssh" product="OpenSSH" version="9.6"/></port>
<port protocol="tcp" portid="80"><state state="closed"/><service name="http"/></port>
<port protocol="tcp" portid="2222"><state state="open"/><service name="ssh" product="OpenSSH" version="9.6p1"/></port>
<port protocol="tcp" portid="8080"><state state="open"/><service name="http-proxy" product="nginx" version="1.24.0"/></port>
</ports></host>
</nmaprun>"""


def test_portblast_parses_nmap_xml():
    portblast = _load_portblast()
    records = portblast.parse_nmap_xml(NMAP_XML)
    assert records == [
        {"port": 22, "protocol": "tcp", "service": "ssh", "version": "OpenSSH 9.6"},
        {"port": 2222, "protocol": "tcp", "service": "ssh", "version": "OpenSSH 9.6p1"},
        {"port": 8080, "protocol": "tcp", "service": "http-proxy", "version": "nginx 1.24.0"},
    ]


def test_portblast_handles_garbage_xml():
    portblast = _load_portblast()
    assert portblast.parse_nmap_xml("not xml at all") == []
    assert portblast.parse_nmap_xml("") == []


# ---------------------------------------------------------------------------
# Script syntax (shell + python)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("script", [
    "seeds/python/alerts_api.py",
    "seeds/cloudshell/moto_lab.py",
    "seeds/portblast/portblast",
])
def test_lab_scripts_compile(script):
    py_compile.compile(str(IMAGES_DIR / script), doraise=True)


def test_shell_scripts_pass_bash_n():
    bash = shutil.which("bash")
    if bash is None:
        pytest.skip("bash not available")
    scripts = [IMAGES_DIR / "build.sh"] + sorted(SEEDS_DIR.glob("*/entrypoint.sh"))
    assert scripts, "no shell scripts found"
    for script in scripts:
        result = subprocess.run([bash, "-n", str(script)], capture_output=True, text=True)
        assert result.returncode == 0, f"{script.name}: {result.stderr}"


# ---------------------------------------------------------------------------
# No secrets in the repo or the images
# ---------------------------------------------------------------------------

def test_no_real_credentials_in_images():
    """The only credentials in image sources are the documented lab fakes."""
    dockerfiles = [IMAGES_DIR / d for d in IMAGE_DOCKERFILE.values() if d]
    scripts = list(SEEDS_DIR.rglob("*"))
    for path in dockerfiles + scripts:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        assert "AKIA" not in text, f"{path.name}: looks like a real AWS key id"
        for match in re.finditer(r'AWS_SECRET_ACCESS_KEY=(\S+)', text):
            assert match.group(1) in ("lab-fake-key", "lab"), (
                f"{path.name}: unexpected AWS secret value")
