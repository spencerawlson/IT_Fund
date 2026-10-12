"""A simulated IAM policy shell for the least-privilege lab (SCS-C02).

Deterministic and safe: models IAM users, roles, managed policies and trust policies in memory,
plus a policy evaluation simulator with real IAM semantics — explicit deny wins, wildcard
matching on actions/resources, and condition keys. The lab ships one deliberately
over-privileged role policy (PowerUserFlawed: Allow * on *) and one over-broad trust policy
(Principal "*") for the learner to find and fix. Executes nothing and talks to no cloud.

Mutable lab state lives in the session findings under the "_iam" key so it survives across
commands; every state-changing command returns the full updated state in its findings delta.
"""
from __future__ import annotations

import copy
import json
import re
import shlex
from typing import Any

from labs.providers.base import CommandResult

ACCOUNT = "123456789012"
DEV_BUCKET = "arn:aws:s3:::dev-bucket"
REPORTS_BUCKET = "arn:aws:s3:::reports-bucket"


def _seed_state() -> dict[str, Any]:
    return {
        "users": {
            "dev": {"attached": ["DevS3Scoped"], "boundary": None},
            "analyst": {"attached": ["AnalystReports"], "boundary": None},
            "admin": {"attached": ["ReadOnlyAccess"], "boundary": None},
        },
        "roles": {
            "DeployRole": {
                "attached": ["PowerUserFlawed"],
                "trust": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {"AWS": "*"},
                            "Action": "sts:AssumeRole",
                        }
                    ],
                },
            },
            "AnalyticsRole": {
                "attached": ["AnalystReports"],
                "trust": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {"AWS": f"arn:aws:iam::{ACCOUNT}:user/analyst"},
                            "Action": "sts:AssumeRole",
                            "Condition": {"Bool": {"aws:MultiFactorAuthPresent": "true"}},
                        }
                    ],
                },
            },
        },
        "policies": {
            "ReadOnlyAccess": {
                "Description": "Read-only access to common services (break-glass auditor style).",
                "Document": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Action": ["ec2:Describe*", "s3:Get*", "s3:List*", "iam:Get*", "iam:List*"],
                            "Resource": "*",
                        }
                    ],
                },
            },
            "DevS3Scoped": {
                "Description": "Scoped dev access: object read/write in dev-bucket only.",
                "Document": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "DevBucketRW",
                            "Effect": "Allow",
                            "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
                            "Resource": [DEV_BUCKET, DEV_BUCKET + "/*"],
                        },
                        {
                            "Sid": "NoBucketDelete",
                            "Effect": "Deny",
                            "Action": "s3:DeleteBucket",
                            "Resource": "*",
                        },
                    ],
                },
            },
            "AnalystReports": {
                "Description": "Analyst access: Athena queries and read-only reports bucket.",
                "Document": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "AthenaQuery",
                            "Effect": "Allow",
                            "Action": ["athena:StartQueryExecution", "athena:GetQueryResults",
                                       "glue:GetTable", "glue:GetPartitions"],
                            "Resource": "*",
                        },
                        {
                            "Sid": "ReportsRead",
                            "Effect": "Allow",
                            "Action": "s3:GetObject",
                            "Resource": REPORTS_BUCKET + "/*",
                        },
                    ],
                },
            },
            "PowerUserFlawed": {
                "Description": "Legacy deploy policy — flagged for least-privilege review.",
                "Document": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {"Sid": "LegacyFullAccess", "Effect": "Allow", "Action": "*", "Resource": "*"}
                    ],
                },
            },
        },
    }


# --------------------------------------------------------------------------
# IAM policy evaluation (explicit deny > allow > implicit deny)
# --------------------------------------------------------------------------

def _as_list(v: Any) -> list:
    return v if isinstance(v, list) else [v]


def _wildcard_match(pattern: str, value: str) -> bool:
    rx = "^" + re.escape(pattern).replace(r"\*", ".*") + "$"
    return re.match(rx, value, re.IGNORECASE) is not None


def _conditions_hold(conditions: Any, context: dict[str, str]) -> bool:
    if not conditions:
        return True
    if not isinstance(conditions, dict):
        return False
    for operator, kv in conditions.items():
        if not isinstance(kv, dict):
            return False
        for key, expected in kv.items():
            actual = context.get(key)
            vals = _as_list(expected)
            if operator == "StringEquals":
                if actual is None or not any(str(actual) == str(v) for v in vals):
                    return False
            elif operator == "Bool":
                want = str(vals[0]).lower() == "true"
                have = str(actual).lower() == "true"
                if want != have:
                    return False
            else:
                return False  # unsupported operator: fail closed
    return True


def _statement_matches(stmt: dict, action: str, resource: str, context: dict[str, str]) -> bool:
    if "Action" in stmt:
        if not any(_wildcard_match(p, action) for p in _as_list(stmt["Action"])):
            return False
    elif "NotAction" in stmt:
        if any(_wildcard_match(p, action) for p in _as_list(stmt["NotAction"])):
            return False
    if "Resource" in stmt:
        if not any(_wildcard_match(p, resource) for p in _as_list(stmt["Resource"])):
            return False
    elif "NotResource" in stmt:
        if any(_wildcard_match(p, resource) for p in _as_list(stmt["NotResource"])):
            return False
    return _conditions_hold(stmt.get("Condition"), context)


def _eval_policies(named_docs: list[tuple[str, dict]], action: str, resource: str,
                   context: dict[str, str]) -> tuple[str, dict]:
    """Evaluate a set of policy documents. Returns (decision, detail)."""
    matched_allow: dict | None = None
    for pname, doc in named_docs:
        stmts = doc.get("Statement", [])
        for stmt in _as_list(stmts):
            if not isinstance(stmt, dict):
                continue
            if not _statement_matches(stmt, action, resource, context):
                continue
            if str(stmt.get("Effect", "")).lower() == "deny":
                return "DENY", {"explicit": True, "policy": pname, "statement": stmt}
            if matched_allow is None:
                matched_allow = {"policy": pname, "statement": stmt}
    if matched_allow:
        return "ALLOW", {"explicit": True, **matched_allow}
    return "DENY", {"explicit": False}


def simulate_principal(state: dict, principal: str, action: str, resource: str,
                       context: dict[str, str]) -> tuple[str, dict, str]:
    """Simulate an action for a user or role. Returns (decision, detail, resolved_principal)."""
    users, roles = state["users"], state["roles"]
    kind, name = None, principal
    if "/" in principal:
        kind, name = principal.split("/", 1)
        kind = kind.lower()
    else:
        if principal in users:
            kind, name = "user", principal
        elif principal in roles:
            kind, name = "role", principal
    if kind == "user" and name in users:
        u = users[name]
        docs = [(p, state["policies"][p]["Document"]) for p in u["attached"] if p in state["policies"]]
        decision, detail = _eval_policies(docs, action, resource, context)
        if decision == "ALLOW" and u.get("boundary") and u["boundary"] in state["policies"]:
            bdoc = state["policies"][u["boundary"]]["Document"]
            bdec, bdet = _eval_policies([(u["boundary"], bdoc)], action, resource, context)
            if bdec != "ALLOW":
                detail = {"explicit": bdet.get("explicit", False),
                          "policy": u["boundary"], "statement": bdet.get("statement"),
                          "note": "blocked by permissions boundary"}
                decision = "DENY"
        return decision, detail, f"user/{name}"
    if kind == "role" and name in roles:
        r = roles[name]
        docs = [(p, state["policies"][p]["Document"]) for p in r["attached"] if p in state["policies"]]
        decision, detail = _eval_policies(docs, action, resource, context)
        return decision, detail, f"role/{name}"
    return "ERROR", {"error": f"unknown principal '{principal}' (try user/dev or role/DeployRole)"}, principal


# --------------------------------------------------------------------------
# Shell plumbing
# --------------------------------------------------------------------------

def _tok(s: str) -> list[str]:
    try:
        return shlex.split(s)
    except ValueError:
        return s.split()


def _opt(args: list[str], name: str) -> str | None:
    if name in args:
        i = args.index(name)
        if i + 1 < len(args):
            return args[i + 1]
    return None


def _state(findings: dict[str, Any]) -> dict[str, Any]:
    st = findings.get("_iam")
    if not isinstance(st, dict) or "users" not in st:
        st = _seed_state()
    return copy.deepcopy(st)


def _save(state: dict, extra: dict | None = None) -> dict:
    out = {"_iam": state}
    if extra:
        out.update(extra)
    return out


def initial_prompt(lab) -> str:
    return "student@iam:~$ "


def banner(lab) -> list[str]:
    return [
        "Road to CISSP - simulated IAM policy workbench   (safe: nothing is really executed)",
        "Model users, roles and policies, then prove least privilege with the policy simulator.",
        "Try: iam list-users · iam list-roles · iam list-policies · iam help",
    ]


def _fmt_json(doc: Any) -> str:
    return json.dumps(doc, indent=2)


def _cmd_list_users(state) -> CommandResult:
    lines = ["USERNAME   ATTACHED POLICIES              BOUNDARY",
             "--------   ------------------              --------"]
    for name, u in state["users"].items():
        lines.append(f"{name:<10} {', '.join(u['attached']):<30} {u.get('boundary') or '-'}")
    return CommandResult(output="\n".join(lines), findings=_save(state, {"iam_users_listed": True}))


def _cmd_list_roles(state) -> CommandResult:
    lines = ["ROLE            ATTACHED POLICIES",
             "----            ------------------"]
    for name, r in state["roles"].items():
        lines.append(f"{name:<15} {', '.join(r['attached'])}")
    return CommandResult(output="\n".join(lines), findings=_save(state, {"iam_roles_listed": True}))


def _cmd_list_policies(state) -> CommandResult:
    lines = ["POLICY NAME        DESCRIPTION",
             "-----------        -----------"]
    for name, p in state["policies"].items():
        lines.append(f"{name:<18} {p.get('Description', '')}")
    return CommandResult(output="\n".join(lines), findings=_save(state))


def _cmd_get_policy(state, findings, name: str | None) -> CommandResult:
    if not name:
        return CommandResult(output="usage: iam get-policy <policy-name>", exit_code=2)
    p = state["policies"].get(name)
    if not p:
        return CommandResult(output=f"NoSuchEntity: policy '{name}' not found.", exit_code=254)
    read = list(findings.get("iam_policies_read") or [])
    if name not in read:
        read.append(name)
    out = f"Policy: {name}\n{_fmt_json(p['Document'])}"
    return CommandResult(output=out, findings=_save(state, {"iam_policies_read": read}))


def _parse_inline_json(raw: str, prefix_parts: int) -> tuple[dict | None, str | None]:
    """Take everything after the first `prefix_parts` whitespace-separated tokens as JSON."""
    parts = raw.split(None, prefix_parts)
    if len(parts) <= prefix_parts:
        return None, "missing JSON document (pass it inline, quoted if it contains spaces)"
    text = parts[prefix_parts].strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in ("'", '"'):
        text = text[1:-1]
    try:
        doc = json.loads(text)
    except json.JSONDecodeError as exc:
        return None, f"invalid JSON: {exc}"
    return doc, None


def _validate_policy_doc(doc: Any) -> str | None:
    if not isinstance(doc, dict):
        return "policy must be a JSON object"
    stmts = doc.get("Statement")
    if isinstance(stmts, dict):
        stmts = [stmts]
    if not isinstance(stmts, list) or not stmts:
        return "policy needs a non-empty Statement list"
    for i, s in enumerate(stmts):
        if not isinstance(s, dict):
            return f"statement {i} must be an object"
        if str(s.get("Effect", "")).lower() not in ("allow", "deny"):
            return f"statement {i}: Effect must be Allow or Deny"
        if "Action" not in s and "NotAction" not in s:
            return f"statement {i}: needs Action (or NotAction)"
        if "Resource" not in s and "NotResource" not in s:
            return f"statement {i}: needs Resource (or NotResource)"
    return None


def _cmd_put_policy(state, raw: str, name: str | None) -> CommandResult:
    if not name:
        return CommandResult(output="usage: iam put-policy <policy-name> '<json>'", exit_code=2)
    doc, err = _parse_inline_json(raw, 3)
    if err:
        return CommandResult(output=f"put-policy failed: {err}", exit_code=2)
    problem = _validate_policy_doc(doc)
    if problem:
        return CommandResult(output=f"put-policy failed: {problem}", exit_code=2)
    is_new = name not in state["policies"]
    state["policies"][name] = {"Description": "Custom policy (written in this lab).", "Document": doc}
    verb = "created" if is_new else "updated"
    updated_names = sorted(set((state.get("_updated_names") or []) + [name]))
    state["_updated_names"] = updated_names
    findings = {"iam_policy_updated": updated_names}
    out = f"Policy '{name}' {verb}.\nTip: re-run iam simulate to see the new evaluation."
    return CommandResult(output=out, findings=_save(state, findings))


def _fmt_simulation(principal: str, action: str, resource: str, decision: str, detail: dict) -> str:
    lines = [f"Principal: {principal}", f"Action:    {action}", f"Resource:  {resource}", ""]
    if decision == "ERROR":
        lines.append(f"ERROR: {detail.get('error')}")
        return "\n".join(lines)
    if decision == "ALLOW":
        lines.append("Decision: ALLOW  (explicit allow)")
        stmt = detail.get("statement") or {}
        lines.append(f"  matched in policy '{detail.get('policy')}':")
        lines.append(f"    Effect={stmt.get('Effect')}, Action={_fmt_v(stmt.get('Action'))}, "
                     f"Resource={_fmt_v(stmt.get('Resource'))}")
    else:
        if detail.get("explicit"):
            lines.append("Decision: DENY  (explicit deny)")
            stmt = detail.get("statement") or {}
            lines.append(f"  matched in policy '{detail.get('policy')}':")
            lines.append(f"    Effect={stmt.get('Effect')}, Action={_fmt_v(stmt.get('Action'))}, "
                         f"Resource={_fmt_v(stmt.get('Resource'))}")
        else:
            lines.append("Decision: DENY  (implicit — no statement allows this)")
        if detail.get("note"):
            lines.append(f"  note: {detail['note']}")
    return "\n".join(lines)


def _fmt_v(v: Any) -> str:
    if isinstance(v, list):
        return "[" + ", ".join(str(x) for x in v) + "]"
    return str(v)


def _cmd_simulate(state, findings, args: list[str]) -> CommandResult:
    if len(args) < 3:
        return CommandResult(
            output="usage: iam simulate <principal> <action> <resource> [--context key=value ...]\n"
                   "  principal: user/dev, user/analyst, user/admin, role/DeployRole, role/AnalyticsRole",
            exit_code=2)
    principal, action, resource = args[0], args[1], args[2]
    context: dict[str, str] = {}
    i = 3
    while i < len(args):
        if args[i] == "--context" and i + 1 < len(args):
            kv = args[i + 1]
            if "=" in kv:
                k, v = kv.split("=", 1)
                context[k] = v
            i += 2
        else:
            i += 1
    decision, detail, resolved = simulate_principal(state, principal, action, resource, context)
    if decision == "ERROR":
        return CommandResult(output=_fmt_simulation(principal, action, resource, decision, detail),
                             exit_code=2, findings=_save(state))
    sims = list(findings.get("iam_simulations") or [])
    sims.append({"principal": resolved, "action": action, "resource": resource,
                 "decision": decision, "context": context})
    out = _fmt_simulation(resolved, action, resource, decision, detail)
    return CommandResult(output=out, findings=_save(state, {"iam_simulations": sims}))


def _cmd_attach(state, args: list[str]) -> CommandResult:
    user = _opt(args, "--user")
    role = _opt(args, "--role")
    policy = _opt(args, "--policy")
    if not policy or (not user and not role) or (user and role):
        return CommandResult(
            output="usage: iam attach-policy (--user <name> | --role <name>) --policy <name>", exit_code=2)
    if policy not in state["policies"]:
        return CommandResult(output=f"NoSuchEntity: policy '{policy}' not found.", exit_code=254)
    if user:
        if user not in state["users"]:
            return CommandResult(output=f"NoSuchEntity: user '{user}' not found.", exit_code=254)
        attached = state["users"][user]["attached"]
        if policy not in attached:
            attached.append(policy)
        return CommandResult(output=f"Attached '{policy}' to user '{user}'.",
                             findings=_save(state, {"iam_attached": {"user": user, "policy": policy}}))
    if role not in state["roles"]:
        return CommandResult(output=f"NoSuchEntity: role '{role}' not found.", exit_code=254)
    attached = state["roles"][role]["attached"]
    if policy not in attached:
        attached.append(policy)
    return CommandResult(output=f"Attached '{policy}' to role '{role}'.",
                         findings=_save(state, {"iam_attached": {"role": role, "policy": policy}}))


def _cmd_set_trust(state, raw: str, role: str | None) -> CommandResult:
    if not role:
        return CommandResult(output="usage: iam set-trust-policy <role> '<json>'", exit_code=2)
    if role not in state["roles"]:
        return CommandResult(output=f"NoSuchEntity: role '{role}' not found.", exit_code=254)
    doc, err = _parse_inline_json(raw, 3)
    if err:
        return CommandResult(output=f"set-trust-policy failed: {err}", exit_code=2)
    stmts = doc.get("Statement") if isinstance(doc, dict) else None
    if isinstance(stmts, dict):
        stmts = [stmts]
    if not isinstance(stmts, list) or not stmts:
        return CommandResult(output="set-trust-policy failed: needs a non-empty Statement list", exit_code=2)
    for s in stmts:
        if not isinstance(s, dict) or "Principal" not in s:
            return CommandResult(output="set-trust-policy failed: each statement needs a Principal", exit_code=2)
    state["roles"][role]["trust"] = doc
    out = (f"Trust policy for role '{role}' updated.\n"
           f"{_fmt_json(doc)}\n"
           "Verify who can now assume it — and who cannot.")
    return CommandResult(output=out, findings=_save(state, {"iam_trust_updated": [role]}))


def _cmd_create_role(state, args: list[str], raw: str) -> CommandResult:
    name = _opt(args, "--name")
    if not name:
        return CommandResult(output="usage: iam create-role --name <name> --trust '<json>'", exit_code=2)
    if name in state["roles"]:
        return CommandResult(output=f"EntityAlreadyExists: role '{name}' already exists.", exit_code=254)
    # --trust value may be a single shlex token (quoted JSON)
    trust_raw = _opt(args, "--trust")
    if trust_raw is not None:
        try:
            doc = json.loads(trust_raw)
        except json.JSONDecodeError as exc:
            return CommandResult(output=f"create-role failed: invalid --trust JSON: {exc}", exit_code=2)
    else:
        doc, err = _parse_inline_json(raw, 3)
        if err:
            return CommandResult(output=f"create-role failed: {err}", exit_code=2)
    state["roles"][name] = {"attached": [], "trust": doc}
    return CommandResult(output=f"Role '{name}' created with the given trust policy.",
                         findings=_save(state, {"iam_role_created": name}))


def _cmd_set_boundary(state, args: list[str]) -> CommandResult:
    user = _opt(args, "--user")
    policy = _opt(args, "--policy")
    if not user or not policy:
        return CommandResult(output="usage: iam set-boundary --user <name> --policy <name>", exit_code=2)
    if user not in state["users"]:
        return CommandResult(output=f"NoSuchEntity: user '{user}' not found.", exit_code=254)
    if policy not in state["policies"]:
        return CommandResult(output=f"NoSuchEntity: policy '{policy}' not found.", exit_code=254)
    state["users"][user]["boundary"] = policy
    out = (f"Permissions boundary '{policy}' set on user '{user}'.\n"
           "The boundary caps the maximum permissions — even an Allow in an identity policy\n"
           "is denied if the boundary does not also allow it.")
    return CommandResult(output=out, findings=_save(state, {"iam_boundary_set": {user: policy}}))


def _help() -> CommandResult:
    return CommandResult(output=(
        "IAM policy workbench (simulated — nothing really runs):\n"
        "  iam list-users                                users, attached policies, boundaries\n"
        "  iam list-roles                                roles and their attached policies\n"
        "  iam list-policies                             managed policies in this account\n"
        "  iam get-policy <name>                         show a policy document (JSON)\n"
        "  iam put-policy <name> '<json>'                create or replace a policy document\n"
        "  iam simulate <principal> <action> <resource>  evaluate access (shows ALLOW/DENY + matched statement)\n"
        "      [--context key=value ...]                 e.g. --context aws:MultiFactorAuthPresent=true\n"
        "      principal: user/dev, user/analyst, user/admin, role/DeployRole, role/AnalyticsRole\n"
        "  iam attach-policy (--user U | --role R) --policy P\n"
        "  iam set-trust-policy <role> '<json>'          replace a role's trust policy\n"
        "  iam create-role --name <n> --trust '<json>'    create a role with a trust policy\n"
        "  iam set-boundary --user <u> --policy <p>       permissions boundary (max-permissions cap)\n"
        "  help | clear"
    ))


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    raw = (command or "").strip()
    if not raw:
        return CommandResult(output="")
    if len(raw) > 8192:
        return CommandResult(output="Command too long.", exit_code=1)
    parts = _tok(raw)
    cmd = parts[0].lower()
    if cmd in ("clear", "cls"):
        return CommandResult(output="", clear=True)
    if cmd in ("help", "?"):
        return _help()
    if cmd != "iam":
        return CommandResult(output=f"{cmd}: command not found (this lab uses the `iam` workbench — try `help`)", exit_code=127)

    state = _state(findings)
    args = parts[1:]
    sub = args[0].lower() if args else ""

    if sub == "list-users":
        return _cmd_list_users(state)
    if sub == "list-roles":
        return _cmd_list_roles(state)
    if sub == "list-policies":
        return _cmd_list_policies(state)
    if sub == "get-policy":
        return _cmd_get_policy(state, findings, args[1] if len(args) > 1 else None)
    if sub == "put-policy":
        return _cmd_put_policy(state, raw, args[1] if len(args) > 1 else None)
    if sub == "simulate":
        return _cmd_simulate(state, findings, args[1:])
    if sub == "attach-policy":
        return _cmd_attach(state, args[1:])
    if sub == "set-trust-policy":
        return _cmd_set_trust(state, raw, args[1] if len(args) > 1 else None)
    if sub == "create-role":
        return _cmd_create_role(state, args[1:], raw)
    if sub == "set-boundary":
        return _cmd_set_boundary(state, args[1:])
    if sub in ("help", "?"):
        return _help()
    return CommandResult(output=f"iam: unknown subcommand '{sub}'. Try `iam help`.", exit_code=2)
