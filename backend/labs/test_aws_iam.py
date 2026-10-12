"""Tests for the IAM policies & least-privilege lab (aws-iam-001).

Covers the policy simulator's evaluation semantics (explicit deny wins, wildcard matching,
conditions, permissions boundaries), the state-changing commands, and every objective's
validator — including rejection of flawed policies.
"""
import asyncio
import json
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.definitions import cloud as cloud_defs
from labs.shells import iam_cli

LAB = cloud_defs.AWS_IAM_LAB


def _run(cmd, findings=None):
    # Mirror the session layer: the shell returns a findings delta that gets
    # merged into the session's findings (shallow replace per key).
    findings = {} if findings is None else dict(findings)
    r = iam_cli.run(LAB, cmd, findings)
    merged = dict(findings)
    merged.update(r.findings or {})
    return r, merged


def _findings_after(cmds):
    findings: dict = {}
    last = None
    for c in cmds:
        last, findings = _run(c, findings)
    return last, findings


def _sims(findings):
    return findings.get("iam_simulations") or []


# --------------------------------------------------------------------------
# Shell basics
# --------------------------------------------------------------------------

def test_lab_metadata():
    assert LAB.id == "aws-iam-001"
    assert LAB.shell == "iam_cli"
    assert len(LAB.objectives) == 8
    assert [o.id for o in LAB.objectives] == [
        "list-identities", "read-policies", "simulate-allow", "find-flaw",
        "fix-policy", "fix-trust", "set-boundary", "verify",
    ]


def test_help_lists_commands():
    r, _ = _run("iam help")
    for cmd in ("list-users", "list-roles", "list-policies", "get-policy",
                "put-policy", "simulate", "attach-policy", "create-role", "set-boundary"):
        assert cmd in r.output


def test_unknown_command_errors():
    r, _ = _run("kubectl get pods")
    assert r.exit_code == 127
    r, _ = _run("iam frobnicate")
    assert r.exit_code == 2


def test_list_users_and_roles_seed():
    r, f = _run("iam list-users")
    assert "dev" in r.output and "analyst" in r.output and "admin" in r.output
    assert f["iam_users_listed"] is True
    r, f = _run("iam list-roles", f)
    assert "DeployRole" in r.output and "AnalyticsRole" in r.output
    assert f["iam_roles_listed"] is True


def test_list_and_get_policy():
    r, f = _run("iam list-policies")
    for name in ("ReadOnlyAccess", "DevS3Scoped", "AnalystReports", "PowerUserFlawed"):
        assert name in r.output
    r, f = _run("iam get-policy PowerUserFlawed", f)
    doc = json.loads(r.output.split("\n", 1)[1])
    assert doc["Statement"][0]["Action"] == "*"
    assert "PowerUserFlawed" in f["iam_policies_read"]
    r, _ = _run("iam get-policy Nope", f)
    assert r.exit_code == 254


# --------------------------------------------------------------------------
# Policy simulator semantics
# --------------------------------------------------------------------------

def test_simulate_explicit_allow():
    _, f = _run("iam simulate user/dev s3:GetObject arn:aws:s3:::dev-bucket/report.csv", {})
    s = _sims(f)[-1]
    assert s["decision"] == "ALLOW"
    assert s["principal"] == "user/dev"


def test_simulate_explicit_deny_beats_allow():
    # DevS3Scoped allows s3:* on the bucket but explicitly denies DeleteBucket.
    _, f = _run("iam simulate user/dev s3:DeleteBucket arn:aws:s3:::dev-bucket", {})
    assert _sims(f)[-1]["decision"] == "DENY"


def test_simulate_implicit_deny():
    _, f = _run("iam simulate user/dev iam:CreateUser *", {})
    assert _sims(f)[-1]["decision"] == "DENY"


def test_simulate_wildcard_action_and_resource():
    # analyst's Athena actions use wildcards only via explicit list; s3:GetObject is scoped.
    _, f = _run("iam simulate user/analyst s3:GetObject arn:aws:s3:::reports-bucket/q1.csv", {})
    assert _sims(f)[-1]["decision"] == "ALLOW"
    _, f = _run("iam simulate user/analyst s3:GetObject arn:aws:s3:::dev-bucket/q1.csv", f)
    assert _sims(f)[-1]["decision"] == "DENY"


def test_simulate_case_insensitive_action():
    _, f = _run("iam simulate user/dev S3:GetObject arn:aws:s3:::dev-bucket/report.csv", {})
    assert _sims(f)[-1]["decision"] == "ALLOW"


def test_simulate_role_flaw_is_allow():
    # The seeded flaw: DeployRole's PowerUserFlawed allows * on *.
    _, f = _run("iam simulate role/DeployRole iam:CreateUser *", {})
    assert _sims(f)[-1]["decision"] == "ALLOW"


def test_simulate_unknown_principal():
    r, _ = _run("iam simulate user/nobody s3:GetObject *", {})
    assert r.exit_code == 2
    assert "unknown principal" in r.output


def test_condition_mfa():
    # Give analyst an MFA-gated policy, then simulate with and without the context key.
    mfa_policy = json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow", "Action": "ec2:DescribeInstances", "Resource": "*",
            "Condition": {"Bool": {"aws:MultiFactorAuthPresent": "true"}},
        }],
    })
    _, f = _run(f"iam put-policy MfaGated '{mfa_policy}'", {})
    _, f = _run("iam attach-policy --user analyst --policy MfaGated", f)
    _, f = _run("iam simulate user/analyst ec2:DescribeInstances *", f)
    assert _sims(f)[-1]["decision"] == "DENY"  # no MFA context -> condition fails
    _, f = _run("iam simulate user/analyst ec2:DescribeInstances * --context aws:MultiFactorAuthPresent=true", f)
    assert _sims(f)[-1]["decision"] == "ALLOW"


def test_permissions_boundary_caps_allow():
    _, f = _run("iam set-boundary --user dev --policy ReadOnlyAccess", {})
    assert f["iam_boundary_set"] == {"dev": "ReadOnlyAccess"}
    # Read still allowed by both identity policy and boundary...
    _, f = _run("iam simulate user/dev s3:GetObject arn:aws:s3:::dev-bucket/report.csv", f)
    assert _sims(f)[-1]["decision"] == "ALLOW"
    # ...but PutObject is allowed by identity policy and denied by the boundary.
    _, f = _run("iam simulate user/dev s3:PutObject arn:aws:s3:::dev-bucket/report.csv", f)
    assert _sims(f)[-1]["decision"] == "DENY"


def test_set_boundary_validates():
    r, _ = _run("iam set-boundary --user dev --policy Nope", {})
    assert r.exit_code == 254
    r, _ = _run("iam set-boundary --user nobody --policy ReadOnlyAccess", {})
    assert r.exit_code == 254


# --------------------------------------------------------------------------
# Policy authoring
# --------------------------------------------------------------------------

def test_put_policy_roundtrip():
    doc = {"Version": "2012-10-17",
           "Statement": [{"Effect": "Allow", "Action": "s3:ListBucket", "Resource": "arn:aws:s3:::dev-bucket"}]}
    r, f = _run(f"iam put-policy DevListOnly '{json.dumps(doc)}'", {})
    assert "created" in r.output
    assert "DevListOnly" in f["iam_policy_updated"]
    r, _ = _run("iam get-policy DevListOnly", f)
    assert json.loads(r.output.split("\n", 1)[1]) == doc


def test_put_policy_rejects_bad_json():
    r, f = _run("iam put-policy Bad '{not json'", {})
    assert r.exit_code == 2
    assert "Bad" not in (f.get("_iam") or {}).get("policies", {})


def test_put_policy_rejects_bad_shape():
    r, _ = _run("iam put-policy Bad '{\"Version\": \"2012-10-17\"}'", {})
    assert r.exit_code == 2 and "Statement" in r.output
    r, _ = _run("iam put-policy Bad '{\"Statement\": [{\"Effect\": \"Maybe\"}]}'", {})
    assert r.exit_code == 2


def test_attach_policy():
    r, f = _run("iam attach-policy --user analyst --policy ReadOnlyAccess", {})
    assert "Attached" in r.output
    r, _ = _run("iam attach-policy --user analyst --policy Nope", f)
    assert r.exit_code == 254


def test_set_trust_policy():
    trust = {"Version": "2012-10-17", "Statement": [{
        "Effect": "Allow",
        "Principal": {"AWS": "arn:aws:iam::123456789012:role/Deployer"},
        "Action": "sts:AssumeRole",
        "Condition": {"Bool": {"aws:MultiFactorAuthPresent": "true"}},
    }]}
    r, f = _run(f"iam set-trust-policy DeployRole '{json.dumps(trust)}'", {})
    assert "updated" in r.output
    assert f["iam_trust_updated"] == ["DeployRole"]
    assert f["_iam"]["roles"]["DeployRole"]["trust"] == trust


def test_create_role():
    trust = {"Version": "2012-10-17", "Statement": [{
        "Effect": "Allow", "Principal": {"AWS": "arn:aws:iam::123456789012:root"},
        "Action": "sts:AssumeRole"}]}
    r, f = _run(f"iam create-role --name CrossAcct --trust '{json.dumps(trust)}'", {})
    assert "created" in r.output
    assert "CrossAcct" in f["_iam"]["roles"]
    r, _ = _run(f"iam create-role --name CrossAcct --trust '{json.dumps(trust)}'", f)
    assert r.exit_code == 254


# --------------------------------------------------------------------------
# Validators
# --------------------------------------------------------------------------

def _v(name, findings):
    from labs import validators as vmod
    fn = vmod.VALIDATORS[name]
    return fn({}, findings)


def test_validator_identities_listed():
    assert _v("iam_identities_listed", {})[0] is False
    assert _v("iam_identities_listed", {"iam_users_listed": True, "iam_roles_listed": True})[0] is True


def test_validator_policies_read_needs_three():
    assert _v("iam_policies_read", {"iam_policies_read": ["a", "b"]})[0] is False
    assert _v("iam_policies_read", {"iam_policies_read": ["a", "b", "c"]})[0] is True


def test_validator_sim_allow():
    sims = [{"principal": "user/dev", "action": "s3:GetObject",
             "resource": "arn:aws:s3:::dev-bucket/report.csv", "decision": "ALLOW"}]
    assert _v("iam_sim_allow", {"iam_simulations": sims})[0] is True
    assert _v("iam_sim_allow", {"iam_simulations": []})[0] is False


def test_validator_flaw_found():
    sims = [{"principal": "role/DeployRole", "action": "iam:CreateUser",
             "resource": "*", "decision": "ALLOW"}]
    assert _v("iam_flaw_found", {"iam_simulations": sims})[0] is True
    sims_deny = [{"principal": "role/DeployRole", "action": "iam:CreateUser",
                  "resource": "*", "decision": "DENY"}]
    assert _v("iam_flaw_found", {"iam_simulations": sims_deny})[0] is False


def _iam_with_policy(doc):
    return {"_iam": {"policies": {"PowerUserFlawed": {"Document": doc}},
                     "roles": {}, "users": {}}}


def test_validator_policy_fixed_rejects_wildcard():
    flawed = {"Version": "2012-10-17",
              "Statement": [{"Effect": "Allow", "Action": "*", "Resource": "*"}]}
    passed, msg, _ = _v("iam_policy_fixed", _iam_with_policy(flawed))
    assert passed is False and "Action" in msg


def test_validator_policy_fixed_rejects_iam_wildcard():
    bad = {"Version": "2012-10-17", "Statement": [
        {"Effect": "Allow", "Action": "iam:*", "Resource": "*"},
        {"Effect": "Allow", "Action": "ec2:RunInstances", "Resource": "arn:aws:ec2:*:123456789012:instance/*"},
    ]}
    passed, msg, _ = _v("iam_policy_fixed", _iam_with_policy(bad))
    assert passed is False and "iam:*" in msg


def test_validator_policy_fixed_rejects_write_on_star_resource():
    bad = {"Version": "2012-10-17", "Statement": [
        {"Effect": "Allow", "Action": "s3:PutObject", "Resource": "*"},
    ]}
    passed, msg, _ = _v("iam_policy_fixed", _iam_with_policy(bad))
    assert passed is False and "Resource" in msg


def test_validator_policy_fixed_accepts_least_privilege():
    good = {"Version": "2012-10-17", "Statement": [
        {"Sid": "DeployEC2", "Effect": "Allow",
         "Action": ["ec2:RunInstances", "ec2:TerminateInstances"],
         "Resource": "arn:aws:ec2:us-east-1:123456789012:instance/*"},
        {"Sid": "DeployS3", "Effect": "Allow",
         "Action": ["s3:GetObject", "s3:PutObject"],
         "Resource": "arn:aws:s3:::app-artifacts/*"},
        {"Sid": "ReadOnly", "Effect": "Allow",
         "Action": ["ec2:Describe*", "s3:List*"], "Resource": "*"},
    ]}
    passed, msg, _ = _v("iam_policy_fixed", _iam_with_policy(good))
    assert passed is True, msg


def test_validator_policy_fixed_rejects_empty():
    assert _v("iam_policy_fixed", {"_iam": {"policies": {}, "roles": {}, "users": {}}})[0] is False


def _trust(principal_aws, condition=None):
    stmt = {"Effect": "Allow", "Principal": {"AWS": principal_aws}, "Action": "sts:AssumeRole"}
    if condition:
        stmt["Condition"] = condition
    return {"_iam": {"roles": {"DeployRole": {"trust": {"Version": "2012-10-17", "Statement": [stmt]}}},
                     "policies": {}, "users": {}}}


def test_validator_trust_fixed():
    assert _v("iam_trust_fixed", _trust("*"))[0] is False  # seeded flaw
    no_cond = _trust("arn:aws:iam::123456789012:role/Deployer")
    passed, msg, _ = _v("iam_trust_fixed", no_cond)
    assert passed is False and "Condition" in msg
    good = _trust("arn:aws:iam::123456789012:role/Deployer",
                  {"Bool": {"aws:MultiFactorAuthPresent": "true"}})
    assert _v("iam_trust_fixed", good)[0] is True


def test_validator_boundary_set():
    assert _v("iam_boundary_set", {"_iam": {"users": {"dev": {"boundary": None}}}})[0] is False
    assert _v("iam_boundary_set", {"_iam": {"users": {"dev": {"boundary": "ReadOnlyAccess"}}}})[0] is True


def test_validator_verified_needs_both():
    allow_only = {"iam_simulations": [
        {"principal": "user/dev", "action": "s3:GetObject",
         "resource": "arn:aws:s3:::dev-bucket/report.csv", "decision": "ALLOW"}]}
    assert _v("iam_verified", allow_only)[0] is False
    both = {"iam_simulations": allow_only["iam_simulations"] + [
        {"principal": "user/dev", "action": "iam:CreateUser", "resource": "*", "decision": "DENY"}]}
    assert _v("iam_verified", both)[0] is True


# --------------------------------------------------------------------------
# End-to-end: every objective completable in one session
# --------------------------------------------------------------------------

def _full_run_cmds():
    fixed_policy = json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {"Sid": "DeployEC2", "Effect": "Allow",
             "Action": ["ec2:RunInstances", "ec2:TerminateInstances"],
             "Resource": "arn:aws:ec2:us-east-1:123456789012:instance/*"},
            {"Sid": "DeployS3", "Effect": "Allow",
             "Action": ["s3:GetObject", "s3:PutObject"],
             "Resource": "arn:aws:s3:::app-artifacts/*"},
        ],
    })
    fixed_trust = json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"AWS": "arn:aws:iam::123456789012:role/Deployer"},
            "Action": "sts:AssumeRole",
            "Condition": {"Bool": {"aws:MultiFactorAuthPresent": "true"}},
        }],
    })
    return [
        "iam list-users",
        "iam list-roles",
        "iam get-policy ReadOnlyAccess",
        "iam get-policy DevS3Scoped",
        "iam get-policy PowerUserFlawed",
        "iam simulate user/dev s3:GetObject arn:aws:s3:::dev-bucket/report.csv",
        "iam simulate role/DeployRole iam:CreateUser *",
        f"iam put-policy PowerUserFlawed '{fixed_policy}'",
        f"iam set-trust-policy DeployRole '{fixed_trust}'",
        "iam set-boundary --user dev --policy ReadOnlyAccess",
        "iam simulate user/dev s3:GetObject arn:aws:s3:::dev-bucket/report.csv",
        "iam simulate user/dev iam:CreateUser *",
    ]


def test_all_validators_pass_after_full_run():
    from labs import validators as vmod
    _, findings = _findings_after(_full_run_cmds())
    for obj in LAB.objectives:
        passed, msg, _ = vmod.VALIDATORS[obj.validator]({}, findings)
        assert passed, f"objective {obj.id} ({obj.validator}) failed: {msg}"


def _needs_registry():
    try:
        from labs.registry import get_lab  # noqa: F401
    except ImportError as exc:
        import pytest
        pytest.skip(f"registry not importable yet: {exc}")


def test_registry_knows_lab_and_validators():
    _needs_registry()
    from labs.registry import get_lab
    lab = get_lab("aws-iam-001")
    assert lab is not None and lab.title == "IAM Policies & Least Privilege"
    assert len(lab.objectives) == 8


def test_full_session_completes():
    _needs_registry()
    from labs.registry import get_lab
    from labs.sessions import SessionService
    lab = get_lab("aws-iam-001")
    assert lab is not None

    async def go():
        svc = SessionService()
        s = await svc.start("aws-iam-001", "u1")
        last = None
        for c in _full_run_cmds():
            s, last = await svc.exec_command(s.id, "u1", c)
        return s

    s = asyncio.run(go())
    assert s.status == "COMPLETED", f"progress: {s.progress}"
    assert all(s.progress.values())
