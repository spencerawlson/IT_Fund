"""Interactive lab foundation for Road to CISSP.

Phase 1 is a provider-agnostic, simulation-only scaffold:
  - domain models (models.py) describe labs as data,
  - the LabProvider abstraction (providers/base.py) keeps the app decoupled from any runtime,
  - MockLabProvider (providers/mock.py) executes NOTHING: it fabricates lab state so the UI and
    validators can be built and tested without running any security tooling or exposing a shell,
  - sessions.py holds the per-user session lifecycle and idempotent cleanup,
  - validators.py checks recorded lab STATE, not which commands were typed.

A DockerLabProvider that actually executes tools, and any live-terminal transport, are deliberately
NOT part of this phase: they are security-critical and need their own isolation review and a real
execution host (Vercel's serverless functions cannot run them).
"""
