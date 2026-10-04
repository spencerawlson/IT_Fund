# Road to CISSP — Docker lab images

Real container images for the interactive labs, so labs can graduate from the
`mock` provider (simulation) to the `docker` provider (real execution, one
hardened container per session). Build them on the VM that runs the backend
(FedSer); nothing here is pushed to any registry.

## What was built

| Image | Labs served | What's inside |
|---|---|---|
| `road-to-cissp/python-basics` | py-basics-001 | python3, seed files, alerts API |
| `road-to-cissp/python-automation` | py-automation-001 | same image, retagged (environments identical) |
| `road-to-cissp/python-netauto` | py-netauto-001 | same image, retagged |
| `road-to-cissp/log-triage` | sec-logtriage-001, sec-c2beacon-001, sec-dns-typo-001, sec-ransomware-001 | real grep/cat/wc/tail over the real log datasets |
| `road-to-cissp/security-tools` | cyber-nmap-001 | real nmap/dig/traceroute/whois/netcat/curl vs a real local target (OpenSSH :2222, nginx :8080, http :8000) |
| `road-to-cissp/portblast-lab` | cyber-portblast-001 | security-tools + the real `portblast` orchestrated scanner |
| `road-to-cissp/cloudshell` | cloud-aws-audit-001 | real `aws` CLI (1.46.1) vs a local moto API (5.2.3) seeded with the misconfigured account |
| `road-to-cissp/iac` | cloud-terraform-001 | real terraform 1.9.8 + tfsec v1.28.14, pre-seeded provider mirror (offline) |

Design rules, kept for every image:

- **Pinned bases**: `python:3.12.7-slim-bookworm`, `debian:bookworm-slim`; terraform/tfsec/awscli/moto versions pinned and (for the binaries) checksum-verified at build.
- **Non-root lab user** (`analyst`, `student`, `auditor`); the provider additionally drops all capabilities and sets `no-new-privileges`.
- **No network egress needed at runtime**: seeds are baked in; the lab network denies egress by default and everything still works. (Build time needs internet for apt/pip/downloads.)
- **No secrets**: the only credentials in any image are intentionally fake lab credentials for the local moto simulator (`auditor` / `lab-fake-key`), documented as such.
- **Seed data is byte-identical to the mock shells** (`gen_seeds.py` generates it from `labs/shells/*` and `labs/logsets.py`), so a lab behaves the same on either provider.

## Build (on the VM)

```bash
cd ~/Projects/IT_Fund/backend/labs/images
./build.sh
```

`./build.sh` checks the daemon first, builds in dependency order
(portblast extends security-tools), and prints the resulting image sizes.
Useful variants:

```bash
TAG=v1 ./build.sh            # custom tag instead of :latest
./build.sh cloudshell        # rebuild one image only
```

Expected sizes: python/logtriage ~150-200 MB, sectools/portblast ~450 MB,
cloudshell ~500 MB (awscli + moto), iac ~400 MB (terraform + provider mirror).

## Enable the Docker provider

1. Build the images above.
2. In `~/.config/itfund/backend.env` (or the host env): `LAB_DOCKER_ENABLED=1`.
   The `docker` Python package must be installed where the backend runs
   (`pip install docker`), and the daemon must be reachable.
3. Restart the backend: `systemctl --user restart itfund-backend`.
4. Flip one lab at a time: in `backend/labs/definitions/<file>.py`, change that
   lab's `environment.provider` from `"mock"` to `"docker"`. The `image` and
   `workdir` are already set. Start with a Python lab - it is the simplest.

## Verify end-to-end

The API never exposes the provider, so verify on the VM itself:

```bash
# start a lab in the UI (or via the API), then:
docker ps --format '{{.Names}} {{.Image}} {{.Status}}'
# -> rtc-lab-<id>  road-to-cissp/python-basics:latest  Up ...

# run a command inside the learner's container:
CID=$(docker ps -q --filter "name=rtc-lab-" | head -1)
docker exec -u analyst "$CID" python3 -c "print('real execution')"
docker exec -u analyst "$CID" grep -c "Failed password" /var/log/auth.log
# -> 14
```

Then complete the lab in the UI: run the real commands, record findings by
hand (the Docker provider validates outcome-based findings, same as mock),
and confirm objectives tick over.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Lab provider 'docker' is not available` | `LAB_DOCKER_ENABLED=1` not set, `docker` package missing, or daemon unreachable. Check `docker info` as the backend user and `journalctl --user -u itfund-backend`. |
| `Lab image 'road-to-cissp/x:latest' is not available` | Image not built (or wrong tag). Run `./build.sh`; the provider does **not** fall back to mock - the lab fails loudly instead of silently simulating. |
| `terraform init` tries the network | The provider mirror wasn't populated (build ran without internet). Rebuild `iac` with internet access. |
| `aws` commands hang | The moto supervisor is still seeding (first ~10s). The entrypoint waits for `~/.moto-ready`; check `/home/auditor/.moto-lab.log` via `docker exec`. |
| `nmap` says host is down | Normal unprivileged behaviour: use `nmap -Pn` and `-sT` (see image notes). Ping and SYN scans need raw sockets the hardened provider never grants. |
| `terraform apply` fails | Expected: `apply` needs real AWS credentials and network. `init`, `validate`, `fmt`, `tfsec` and `plan` are fully real offline; the lab definition is data-only by design. |

## Deliberate omissions

- **`road-to-cissp/docker-siem` is not built.** The container-security lab
  (`sec-docker-siem-001`) needs Docker-in-Docker (`docker run`, `docker compose`
  inside the lab container), which is incompatible with the provider's hardened
  posture (no privileged containers, Docker socket never exposed). It stays on
  the `mock` provider until that changes - building a fake `docker` CLI shim
  would be dishonest scaffolding.
- **rustscan** is not installed: it needs raw sockets the provider drops; `nmap
  -p-` teaches the same skill.
- **searchsploit** is not installed: it needs a ~234 MB exploit-db snapshot that
  goes stale without network updates.
- The recon target runs on **unprivileged ports** (2222/8080/8000): the dropped
  capabilities forbid binding 22/80/443. The enumeration *skills* are identical;
  the port numbers are documented in the lab.

## Regenerating seeds

If a mock dataset changes, regenerate and rebuild:

```bash
cd backend/labs/images
python3 gen_seeds.py
git diff --stat seeds/   # review what changed
./build.sh
```

`tests/test_lab_images.py` asserts the seeds stay byte-identical to the mock
sources, and that every image a definition references has a Dockerfile and a
`build.sh` tag.
