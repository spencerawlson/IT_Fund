# Interactive Labs — Phase 1 (foundation)

A provider-agnostic, **simulation-only** lab engine for Road to CISSP. It lets a student start a
lab session, record findings, and have objectives validated against the resulting **state** rather
than against which commands they typed. Phase 1 executes nothing: no containers, no tools, no shell.

## Layers

```
API (labs/api.py)  ->  Lab Service (labs/sessions.py)  ->  LabProvider (labs/providers/*)  ->  runtime
```

The API only authenticates and delegates; orchestration never lives in routes. This separation is
what lets a later `DockerLabProvider` or `ProxmoxLabProvider` slot in without touching the API.

| File | Role |
|---|---|
| `models.py` | Lab domain model (dataclasses). `public_dict()` is the browser-safe view (no image/provider). |
| `providers/base.py` | `LabProvider` abstraction + `LabEnvironment`, `ValidationResult`. |
| `providers/mock.py` | `MockLabProvider`: executes nothing; validates recorded findings. |
| `validators.py` | Outcome-based validators, keyed by name. |
| `definitions/` | Lab definitions as data (Nmap, PortBlast comparison, VLAN routing). |
| `registry.py` | id → definition; validates every objective's validator exists at import. |
| `sessions.py` | Session lifecycle, ownership, expiry, idempotent cleanup (the "Lab Service"). |
| `api.py` | FastAPI routes, mounted by `main.py` at `/labs/*` and `/api/labs/*`. |

## Run locally

```bash
cd backend
.venv/Scripts/python -m uvicorn main:app --port 8000 --reload
.venv/Scripts/python -m pytest labs/            # lab tests
```

Endpoints. Labs are **open to everyone during development** — no account needed. The owner of a
session is `resolve_visitor_id` (`auth/deps.py`): the signed-in user, else a random per-browser
guest id in the `rtc_guest` cookie. It always comes from a cookie, never from the body or path.
When labs become a paid feature, implement `_check_lab_entitlement` in `api.py`: the first
`TRIAL_LAB_STARTS` (10) starts are the free trial, then a subscription is required.

```
GET    /api/labs/definitions
POST   /api/labs/{lab_id}/start
GET    /api/labs/sessions/{session_id}
POST   /api/labs/sessions/{session_id}/findings   body: {"findings": {...}}
POST   /api/labs/sessions/{session_id}/validate
POST   /api/labs/sessions/{session_id}/reset
DELETE /api/labs/sessions/{session_id}            (idempotent)
```

## Add a lab

1. Add a `LabDefinition` in `labs/definitions/<category>.py`. Set `environment.provider="mock"`.
   The `image` field is for real providers only and is never sent to the client.
2. Register it in `labs/definitions/__init__.py` (`ALL_LABS`).
3. Every objective's `validator` must exist in `validators.py`, or import fails at startup.

## Add a validator

Add a function in `validators.py` decorated with `@validator("name")` taking `(args, findings)` and
returning `(passed, message, evidence)`. Check recorded **state**, never a specific command string.

## How PortBlast integration will work

Not built yet (no PortBlast source in this repo). When wired up: PortBlast runs behind a
`LabProvider`/adapter on the execution host, and only its **normalized JSON** is written into the
session's `findings["portblast"]`. The `portblast_result_exists` / `comparison_complete` validators
already consume that. PortBlast's source and internals are never exposed to the browser; the client
only ever sees the normalized result via `public_dict()`.

## Security controls implemented (Phase 1)

- Owner taken from a cookie (account session, else guest id), never the request body/path; no
  visitor can read or write another's session, guest or signed-in (same 404 as "not found", so
  existence isn't leaked). A malformed guest cookie is discarded and replaced, never trusted as an
  id. Tested.
- Client cannot choose image, target or provider — only a `lab_id`; everything else is server-side.
  Tested.
- Providers are allow-listed; a lab requesting a non-implemented provider fails closed.
- `public_dict()` views omit `environment_id`, image and provider internals.
- Session + idle expiry, and idempotent cleanup/destroy. Tested.
- Definitions default `deny_internet_egress=True` (a contract for real providers to honour).

## Security controls STILL required (before any real execution)

These are **not** satisfied by Phase 1 and must be in place before a `DockerLabProvider` runs:
per-session container isolation, dedicated deny-by-default lab networks, CPU/RAM/PID/disk limits,
no `/var/run/docker.sock` or host FS in student containers, no `--privileged`, command auditing,
and internal-only `target.lab` DNS. The live terminal (WebSocket) is also deferred: it must never
carry Docker/SSH/hypervisor credentials to the browser.

## Known limitations

- Mock only: no tools run, so "findings" are recorded by the client, not observed from a live target.
- Sessions are in-memory (no DB yet); they reset on restart. Persistence lands with C3 (accounts +
  Postgres), where `sessions.py` is the single swap point.
- No frontend `LabWorkspace` UI or terminal yet.
