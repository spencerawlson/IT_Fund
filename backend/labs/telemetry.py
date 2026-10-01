"""Reusable telemetry / detection / investigation model for SIEM-style labs.

Deliberately generic so future labs (SSH, web-attack, cloud logging, IR) can reuse it rather than
hard-coding one incident: a lab supplies a list of TelemetryEvents, DetectionRules and
InvestigationQuestions, and the SIEM shell searches/correlates over them. Nothing here executes; the
events are a fixed, curated incident dataset.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class TelemetryEvent:
    """One normalized security event, as a SIEM would store it."""

    id: str
    ts: str                 # HH:MM:SS (lab-relative)
    src_ip: str
    dst: str                # destination host:port or service
    host: str               # container / host that produced the event
    event_type: str         # auth_failure, auth_success, port_scan, http_404, http_request, privileged, db_connect, health_check
    severity: str           # info | low | medium | high
    message: str            # human-readable raw line
    username: str | None = None

    def matches(self, field_name: str, value: str) -> bool:
        actual = getattr(self, field_name, None)
        return actual is not None and value.lower() in str(actual).lower()

    def public(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class DetectionRule:
    id: str
    name: str
    logic: str              # human-readable rule logic
    severity: str
    event_type: str         # the event_type this rule keys on
    threshold: int = 1
    window: str = ""        # e.g. "2 minutes"


@dataclass(frozen=True)
class InvestigationQuestion:
    id: str
    prompt: str
    answer: str             # canonical answer (checked case-insensitively, substring)
    hint: str = ""


@dataclass(frozen=True)
class Incident:
    events: list[TelemetryEvent] = field(default_factory=list)
    rules: list[DetectionRule] = field(default_factory=list)
    questions: list[InvestigationQuestion] = field(default_factory=list)

    def search(self, filters: dict[str, str]) -> list[TelemetryEvent]:
        """Events matching every field=value filter (substring, case-insensitive). No filters -> all."""
        return [e for e in self.events if all(e.matches(k, v) for k, v in filters.items())]

    def alerts(self) -> list[tuple[DetectionRule, list[TelemetryEvent]]]:
        """Rules that fire: event_type count (optionally per src_ip) >= threshold."""
        fired = []
        for rule in self.rules:
            hits = [e for e in self.events if e.event_type == rule.event_type]
            if len(hits) >= rule.threshold:
                fired.append((rule, hits))
        return fired
