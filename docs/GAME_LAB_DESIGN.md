# Game Lab Design — "Mission Console" and beyond

Status: design + first slice landed (2026-10-27). Owner: Spencer.

The labs should feel like a **game** — the immersion of *Hacknet*, but every command is
real. This doc is the plan for getting there without throwing away the lab engine we
already have, which is the whole point: the game is a **skin and a framing** over the real
Docker-exec backend, not a reimplementation of it.

## What already exists (and we build on, not replace)

- **Real command execution.** `backend/labs/providers/docker.py` runs one hardened
  container per session (caps dropped, no-new-privileges, PID/CPU/mem limits, internal-only
  network). Commands actually run; output is real. Simulated labs use `mock.py` instead.
- **A working terminal.** `src/components/labs/LabTerminal.jsx` — real input, history,
  meta-commands, live/sim awareness. Its colors come entirely from CSS variables
  (`--terminal-bg`, `--terminal-text-rgb`, …), so a theme can be swapped **without touching
  the component**.
- **Objectives + validation.** `src/pages/LabWorkspace.jsx` shows objectives, progress, and
  (for live labs) per-objective attestation. Validators are outcome-based.
- **Real vulnerable targets.** First one: `sec-pentest-web-001` (SQLi/XSS/IDOR/cmdi on
  loopback). See `docs`/memory `vulnerable-labs-pattern`.
- **Three.js** is already a dependency (Visual Lab), so the 3D phase needs no new runtime.

## Design pillars

1. **Real beats fake.** The drama is in the framing, never in faking output. A "mission"
   is a real lab session; "hacking the mainframe" is really `sqlmap` against `target.lab`.
2. **Skin, don't fork.** Game mode is a presentation layer. The same `LabTerminal`,
   `labsApi`, sessions, and validators drive it. One engine, two faces.
3. **Diegetic progress.** Objectives become **mission objectives**; completing them advances
   a story beat. No separate progress system — it reads the same `results`.
4. **Opt-in, reversible.** Game mode is a toggle, remembered per viewer. The plain,
   accessible workspace is always one click away (and is the a11y fallback).

## Phase 1 — Mission Console (styled terminal first) ✅ first slice

A *Hacknet*-flavored CRT skin over the existing terminal, shipped fast.

- **Palette + CRT.** A `.mission-console` scope in `src/index.css` redefines the
  `--terminal-*` variables (deep black, phosphor green, amber highlights) and layers a CRT
  effect: scanlines, a soft bloom/glow, a faint flicker, and vignette. Because the terminal
  reads those variables, **no change to `LabTerminal.jsx`** is required for the recolor.
- **Boot sequence.** When game mode turns on, the terminal banner becomes a short boot log
  ("ESTABLISHING UPLINK… target.lab ONLINE"), reusing the existing `banner` prop.
- **Mission framing.** The workspace header/objectives card gets a "MISSION" treatment in
  game mode (callsign, objective = "intel", a monospace mission brief). Same data.
- **Toggle.** A "Mission mode" switch in the workspace header, persisted in `localStorage`
  (`rtc-lab-gamemode`), wrapped in try/catch (private windows). Default off.
- **Accessibility.** CRT effects are decorative (`aria-hidden`, `pointer-events:none`) and
  respect `prefers-reduced-motion` (flicker/scan animation disabled). Contrast of the
  phosphor palette is checked against the terminal background. The toggle is a real
  `<button aria-pressed>`.

### First-slice scope (landed)
`src/index.css` (`.mission-console` palette + `.crt`/`.crt-flicker` effects, reduced-motion
guard) and `src/pages/LabWorkspace.jsx` (toggle + `localStorage` + boot banner + wrap the
terminal card in `.mission-console`). Additive and reversible: existing labs/tests untouched.

## Phase 2 — Mission wrapper & story

- A thin `missions.js` map: `labId → { callsign, brief, beats[] }`, each beat tied to an
  objective id. Advancing a beat is just "this objective now passes".
- Typewriter briefings, a "mission complete" dossier screen built from `results` + attested
  findings (recovered flags become "exfiltrated intel").
- Sound/typing SFX (respecting a mute toggle and reduced-motion/quiet preferences).

## Phase 3 — 3D network scene (Three.js)

- A node graph of the lab's `targets` the player flies through; "entering" a node focuses
  the Mission Console on that host. Reuses target metadata already in the definition.
- Strictly a visualization/navigation layer; the terminal remains the interaction surface.
  Degrades to the Phase-1 2D console when WebGL is unavailable or reduced-motion is set.

## Phase 4 — Network topology builder (switch/router wiring game)

A distinct game genre from the terminal missions: a **canvas puzzle** where the player
places switches/routers/hosts, drags cables between ports, assigns VLANs/IPs, and the design
is **validated by the real networking lab validators** (`labs/definitions/networking.py` —
VLAN/OSPF/EIGRP/RIP/BGP already exist as mock shells + validators).

- **Model:** devices (ports), links (cable = port↔port), per-device config (VLANs, IP,
  routing). Serialize to the same `findings` shape the existing networking validators read,
  so "did the player wire it right?" reuses server-side validation — no new truth source.
- **Interaction:** drag from a device palette, click-drag port→port to cable, a config panel
  per device. Link lights go green when a link carries traffic in the simulated check.
- **Levels:** "connect two VLANs with a router-on-a-stick", "make OSPF converge", etc. Each
  level = a target topology + the validator(s) that confirm it.
- **Build surface:** likely an SVG/canvas board under `src/components/labs/topology/`, with a
  `TopologyBuilder` page that submits to `labsApi.validate`. The 3D version (Phase 3 scene)
  and this share the device/link model.

## Guardrails that do not change

- Game mode never bypasses isolation, entitlement, or validation. It calls the same API.
- No "DJINN"/internal names in anything user-facing (project rule).
- Real vulnerable targets stay single-container, loopback, internal-network only.
