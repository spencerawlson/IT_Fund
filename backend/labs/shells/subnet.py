"""Simulated `subnet` CLI for the Subnetting Mastery lab (net-subnetting-001).

A calculation workbench, not a device console: the learner works through eight
fixed subnetting problems (CIDR notation -> full subnet analysis). Commands:

  problems                  list the eight problems and which are solved
  practice [n]              show problem n (default: first unsolved)
  solve <ip>/<cidr>         worked binary solution for any IPv4 network (study aid)
  answer k=v [k=v ...]      submit answers for the current problem
  progress                  how many objectives are complete
  help | clear

Answers are normalized and recorded into findings["subnet_answers"]; the
objective validators recompute the expected values from labs/subnet_math.py and
compare. Nothing executes and nothing is real.
"""
from __future__ import annotations

from typing import Any

from labs.providers.base import CommandResult
from labs import subnet_math as sm


def initial_prompt(lab) -> str:
    return "student@netlab:~$ "


def banner(lab) -> list[str]:
    return [
        "Road to CISSP - Subnetting Mastery (net-subnetting-001)",
        "Eight problems, Network+ style: CIDR, network/broadcast, host ranges,",
        "host counts, VLSM, summarization, IPv6, and a full analysis.",
        'Type "problems" to see them, "practice" to start, "help" for commands.',
    ]


def _answers(findings: dict) -> dict[str, dict[str, str]]:
    return dict(findings.get("subnet_answers") or {})


def _current_problem_id(findings: dict) -> str | None:
    answers = _answers(findings)
    for pid in sm.PROBLEM_IDS:
        ok, _, _, _ = sm.check_answers(pid, answers.get(pid, {}))
        if not ok:
            return pid
    return None


def _help() -> CommandResult:
    return CommandResult(output="\n".join([
        "subnet lab commands:",
        "  problems                  list the eight problems and your progress",
        "  practice [n]              show problem n (default: first unsolved)",
        "  solve <ip>/<cidr>         step-by-step worked solution, e.g. solve 192.168.10.77/26",
        "  answer [n] k=v [k=v ...]  submit answers (n = problem number, default: current)",
        "  progress                  solved count",
        "  clear                     clear the screen",
    ]))


def _problems(findings: dict) -> CommandResult:
    answers = _answers(findings)
    lines = ["Subnetting problems:"]
    for i, p in enumerate(sm.PROBLEMS, 1):
        ok, _, _, _ = sm.check_answers(p["id"], answers.get(p["id"], {}))
        mark = "[x]" if ok else "[ ]"
        lines.append(f"  {mark} {i}. {p['title']} — {p['brief']}")
    lines.append('Use "practice [n]" to work on one.')
    return CommandResult(output="\n".join(lines))


def _practice(args: list[str], findings: dict) -> CommandResult:
    if args:
        try:
            n = int(args[0])
        except ValueError:
            return CommandResult(output=f'practice: "{args[0]}" is not a problem number (1-8).', exit_code=1)
        if not 1 <= n <= len(sm.PROBLEMS):
            return CommandResult(output=f"practice: problem number must be 1-{len(sm.PROBLEMS)}.", exit_code=1)
        problem = sm.PROBLEMS[n - 1]
    else:
        pid = _current_problem_id(findings)
        if pid is None:
            return CommandResult(output="All eight problems are solved. Nice work — run `progress` to confirm.")
        problem = sm.get_problem(pid)
    return CommandResult(output="\n".join(problem["prompt"]))


def _solve(args: list[str]) -> CommandResult:
    if not args or "/" not in args[0]:
        return CommandResult(output="Usage: solve <ip>/<cidr>   (e.g. solve 192.168.10.77/26)", exit_code=2)
    ip, _, prefix = args[0].partition("/")
    if sm.normalize_answer("network", ip) is None:
        return CommandResult(output=f'solve: "{ip}" is not a valid IPv4 address.', exit_code=1)
    if not prefix.isdigit() or not 0 <= int(prefix) <= 32:
        return CommandResult(output=f'solve: "{prefix}" is not a valid prefix length (0-32).', exit_code=1)
    return CommandResult(output="\n".join(sm.worked_solution(ip, int(prefix))))


def _parse_kv(tokens: list[str]) -> tuple[dict[str, str], list[str]]:
    pairs: dict[str, str] = {}
    bad: list[str] = []
    for tok in tokens:
        if "=" not in tok:
            bad.append(tok)
            continue
        k, _, v = tok.partition("=")
        k, v = k.strip().lower(), v.strip()
        if not k or not v:
            bad.append(tok)
            continue
        pairs[k] = v
    return pairs, bad


def _answer(args: list[str], findings: dict) -> CommandResult:
    rest = args
    problem = None
    if args and "=" not in args[0]:
        # Optional leading problem number: `answer 5 s1=...`
        try:
            n = int(args[0])
        except ValueError:
            n = 0
        if not 1 <= n <= len(sm.PROBLEMS):
            return CommandResult(
                output=f"answer: problem number must be 1-{len(sm.PROBLEMS)} (or omit it to answer the current problem).",
                exit_code=2)
        problem = sm.PROBLEMS[n - 1]
        rest = args[1:]
    if problem is None:
        pid = _current_problem_id(findings)
        if pid is None:
            return CommandResult(output="All eight problems are solved already.")
        problem = sm.get_problem(pid)
    pid = problem["id"]
    if not rest:
        return CommandResult(
            output=f"Usage: answer [n] {' '.join(f'{k}=<value>' for k in problem['fields'])}", exit_code=2)
    pairs, bad = _parse_kv(rest)
    if bad:
        return CommandResult(
            output=f"answer: could not parse {', '.join(bad)} — use key=value.", exit_code=2)
    unknown = [k for k in pairs if k not in problem["fields"]]
    if unknown:
        return CommandResult(
            output=f"answer: unexpected key(s) {', '.join(unknown)} for this problem "
                   f"(expected: {', '.join(problem['fields'])}).", exit_code=2)

    normed: dict[str, str] = {}
    invalid: list[str] = []
    for k, v in pairs.items():
        n = sm.normalize_answer(k, v)
        if n is None:
            invalid.append(f"{k}={v}")
        else:
            normed[k] = n
    if invalid:
        return CommandResult(
            output="answer: invalid value(s): " + ", ".join(invalid)
                   + " — check the format and try again.", exit_code=1)

    answers = _answers(findings)
    merged = {**answers.get(pid, {}), **normed}
    answers[pid] = merged

    ok, missing, wrong, expected = sm.check_answers(pid, merged)
    lines = []
    for k in problem["fields"]:
        if k in normed:
            mark = "✓" if k not in wrong else "✗"
            lines.append(f"  {mark} {k} = {normed[k]}")
    if ok:
        lines.append("")
        lines.append(f'Objective complete: "{problem["title"]}".')
        nxt = _current_problem_id({"subnet_answers": answers})
        if nxt:
            lines.append(f'Next up: "{sm.get_problem(nxt)["title"]}" — type "practice".')
        else:
            lines.append("That was the last one — all eight problems solved!")
    else:
        remaining = [k for k in problem["fields"] if k not in merged]
        if remaining:
            lines.append(f"Still needed: {', '.join(remaining)}.")
        if wrong:
            lines.append("Some answers are off — recheck the math and resubmit. `solve` can show the method.")
    return CommandResult(output="\n".join(lines), findings={"subnet_answers": answers})


def _progress(findings: dict) -> CommandResult:
    answers = _answers(findings)
    done = sum(1 for pid in sm.PROBLEM_IDS if sm.check_answers(pid, answers.get(pid, {}))[0])
    return CommandResult(output=f"Solved {done} of {len(sm.PROBLEM_IDS)} subnetting problems.")


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    raw = (command or "").strip()
    if not raw:
        return CommandResult(output="")
    if len(raw) > 512:
        return CommandResult(output="Command too long.", exit_code=1)
    parts = raw.split()
    cmd = parts[0].lower()
    args = parts[1:]

    if cmd in ("clear", "cls"):
        return CommandResult(output="", clear=True)
    if cmd in ("help", "?"):
        return _help()
    if cmd == "problems":
        return _problems(findings)
    if cmd == "practice":
        return _practice(args, findings)
    if cmd == "solve":
        return _solve(args)
    if cmd == "answer":
        return _answer(args, findings)
    if cmd == "progress":
        return _progress(findings)
    return CommandResult(output=f'{cmd}: command not found (try "help").', exit_code=127)
