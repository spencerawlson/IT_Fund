"""Tests for the AWS CLI fundamentals lab (aws_cli shell + definition + validators)."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from labs.shells import aws_cli
from labs.definitions.cloud import AWS_CLI_LAB
from labs.validators import VALIDATORS
from labs import registry

LAB = AWS_CLI_LAB
VALIDATOR_NAMES = [o.validator for o in LAB.objectives]


def _run(cmds, findings=None):
    """Thread findings through the shell like the mock provider does."""
    f = findings if findings is not None else {}
    last = None
    for c in cmds:
        last = aws_cli.run(LAB, c, f)
        f = {**f, **last.findings}
    return f, last


def _check(validator_name, findings):
    args = {}
    return VALIDATORS[validator_name](args, findings)


# ---- lab definition ----

def test_lab_definition_loads():
    assert LAB.id == "aws-cli-001"
    assert LAB.slug == "aws-cli-fundamentals"
    assert LAB.category == "cloud"
    assert LAB.difficulty == "beginner"
    assert LAB.estimated_minutes == 45
    assert LAB.shell == "aws_cli"
    assert len(LAB.objectives) == 8
    ids = [o.id for o in LAB.objectives]
    assert len(set(ids)) == 8  # unique objective ids
    for o in LAB.objectives:
        assert o.label and o.description and o.hints, o.id


def test_all_objective_validators_registered():
    for name in VALIDATOR_NAMES:
        assert name in VALIDATORS, f"validator {name!r} not registered"
    assert len(set(VALIDATOR_NAMES)) == 8  # unique validator per objective


def test_lab_in_registry():
    assert registry.get_lab("aws-cli-001") is not None
    assert registry.get_lab("aws-cli-001").id == "aws-cli-001"


def test_banner_and_prompt():
    assert aws_cli.initial_prompt(LAB).endswith("$ ")
    banner = aws_cli.banner(LAB)
    assert isinstance(banner, list) and len(banner) >= 2


def test_help_and_unknown_command():
    _, res = _run(["help"])
    assert "aws ec2 describe-instances" in res.output
    _, res = _run(["frobnicate"])
    assert res.exit_code == 127
    _, res = _run(["aws frobnicate"])
    assert res.exit_code == 2


def test_clear():
    _, res = _run(["clear"])
    assert res.clear is True


# ---- identity ----

def test_sts_get_caller_identity():
    f, res = _run(["aws sts get-caller-identity"])
    assert "123456789012" in res.output
    assert "arn:aws:iam::123456789012:user/student" in res.output
    assert f["aws_identity"] is True
    ok, _, _ = _check("awsc_identity_checked", f)
    assert ok


def test_identity_validator_rejects_empty():
    ok, _, _ = _check("awsc_identity_checked", {})
    assert not ok


# ---- ec2: describe / launch / terminate ----

def test_describe_instances_preseeded():
    f, res = _run(["aws ec2 describe-instances"])
    for iid in ("i-0a1b2c3d4e5f60001", "i-0a1b2c3d4e5f60002", "i-0a1b2c3d4e5f60003"):
        assert iid in res.output, iid
    assert "stopped" in res.output  # db-1 is stopped
    assert f["aws_instances_listed"] == 3
    ok, _, _ = _check("awsc_instances_listed", f)
    assert ok


def test_describe_single_instance():
    _, res = _run(["aws ec2 describe-instances --instance-ids i-0a1b2c3d4e5f60001"])
    assert "web-1" in res.output
    assert "i-0a1b2c3d4e5f60002" not in res.output


def test_describe_unknown_instance_fails():
    _, res = _run(["aws ec2 describe-instances --instance-ids i-nope"])
    assert res.exit_code == 254
    assert "InvalidInstanceID.NotFound" in res.output


def test_run_instances_launches():
    f, res = _run(["aws ec2 run-instances --image-id ami-0abc123 --instance-type t3.micro --subnet-id subnet-pub1"])
    assert "running" in res.output
    assert f["aws_instance_launched"] is True
    ok, _, _ = _check("awsc_instance_launched", f)
    assert ok
    # instance id is deterministic: same sequence -> same id
    f2, res2 = _run(["aws ec2 run-instances --image-id ami-0abc123 --instance-type t3.micro --subnet-id subnet-pub1"])
    assert res2.output.split('"InstanceId": "')[1].split('"')[0] == \
        res.output.split('"InstanceId": "')[1].split('"')[0]


def test_run_instances_requires_image_id():
    _, res = _run(["aws ec2 run-instances --instance-type t3.micro"])
    assert res.exit_code == 254
    assert "MissingParameter" in res.output


def test_run_instances_bad_subnet():
    _, res = _run(["aws ec2 run-instances --image-id ami-0abc123 --subnet-id subnet-nope"])
    assert res.exit_code == 254
    assert "InvalidSubnetID.NotFound" in res.output


def test_run_instances_count():
    f, res = _run(["aws ec2 run-instances --image-id ami-0abc123 --subnet-id subnet-pub1 --count 2"])
    assert f["_aws_cli"]["launch_seq"] == 2


def test_terminate_instance():
    f, res = _run([
        "aws ec2 run-instances --image-id ami-0abc123 --subnet-id subnet-pub1",
    ])
    iid = res.output.split('"InstanceId": "')[1].split('"')[0]
    f, res = _run([f"aws ec2 terminate-instances --instance-ids {iid}"], f)
    assert "terminated" in res.output
    # launch objective stays complete (sticky); cleanup is now satisfied
    assert f["aws_instance_launched"] is True
    assert f["aws_cleanup_done"] is True
    ok, _, _ = _check("awsc_cleanup_done", f)
    assert ok


def test_cleanup_validator_rejects_running_student_instance():
    f, _ = _run(["aws ec2 run-instances --image-id ami-0abc123 --subnet-id subnet-pub1"])
    ok, msg, _ = _check("awsc_cleanup_done", f)
    assert not ok
    assert "terminate" in msg.lower()


def test_cleanup_validator_rejects_never_launched():
    ok, msg, _ = _check("awsc_cleanup_done", {})
    assert not ok
    assert "launch" in msg.lower()


def test_stop_start_instance():
    f, _ = _run(["aws ec2 stop-instances --instance-ids i-0a1b2c3d4e5f60001"])
    assert f["_aws_cli"]["instances"]["i-0a1b2c3d4e5f60001"]["state"] == "stopped"
    f, _ = _run(["aws ec2 start-instances --instance-ids i-0a1b2c3d4e5f60001"], f)
    assert f["_aws_cli"]["instances"]["i-0a1b2c3d4e5f60001"]["state"] == "running"


def test_terminate_unknown_instance_fails():
    _, res = _run(["aws ec2 terminate-instances --instance-ids i-nope"])
    assert res.exit_code == 1
    assert "InvalidInstanceID.NotFound" in res.output


# ---- vpc / subnets ----

def test_describe_vpcs():
    _, res = _run(["aws ec2 describe-vpcs"])
    assert "vpc-0a1b2c3d4e5f60001" in res.output
    assert "10.0.0.0/16" in res.output


def test_create_vpc_and_subnet():
    f, res = _run(["aws ec2 create-vpc --cidr-block 10.1.0.0/16"])
    vid = res.output.split('"VpcId": "')[1].split('"')[0]
    assert vid.startswith("vpc-")
    # validator rejects: vpc exists but no subnet yet
    ok, _, _ = _check("awsc_vpc_built", f)
    assert not ok
    f, res = _run([f"aws ec2 create-subnet --vpc-id {vid} --cidr-block 10.1.1.0/24"], f)
    assert res.output.split('"SubnetId": "')[1].split('"')[0].startswith("subnet-")
    assert f["aws_vpc_built"] is True
    ok, _, _ = _check("awsc_vpc_built", f)
    assert ok


def test_create_subnet_unknown_vpc():
    _, res = _run(["aws ec2 create-subnet --vpc-id vpc-nope --cidr-block 10.9.0.0/24"])
    assert res.exit_code == 254
    assert "InvalidVpcID.NotFound" in res.output


def test_describe_subnets():
    _, res = _run(["aws ec2 describe-subnets"])
    assert "subnet-pub1" in res.output
    assert "10.0.1.0/24" in res.output


# ---- s3 ----

def test_s3_ls_buckets():
    _, res = _run(["aws s3 ls"])
    assert "lab-website-assets" in res.output
    assert "lab-backups" in res.output


def test_s3_mb_cp_object_flow():
    f, res = _run(["aws s3 mb s3://student-notes"])
    assert "make_bucket: student-notes" in res.output
    # bucket exists but empty -> validator rejects
    ok, _, _ = _check("awsc_bucket_created", f)
    assert not ok
    f, res = _run(["aws s3 cp notes.txt s3://student-notes"], f)
    assert "upload: notes.txt to s3://student-notes/notes.txt" in res.output
    assert f["aws_bucket_created"] is True
    ok, _, _ = _check("awsc_bucket_created", f)
    assert ok
    _, res = _run(["aws s3 ls s3://student-notes"], f)
    assert "notes.txt" in res.output


def test_s3_mb_duplicate_fails():
    _, res = _run(["aws s3 mb s3://lab-website-assets"])
    assert res.exit_code == 254
    assert "BucketAlreadyExists" in res.output


def test_s3_cp_missing_bucket_fails():
    _, res = _run(["aws s3 cp notes.txt s3://no-such-bucket"])
    assert res.exit_code == 254
    assert "NoSuchBucket" in res.output


def test_s3_rb():
    f, _ = _run(["aws s3 mb s3://temp-bucket"])
    f, res = _run(["aws s3 rb s3://temp-bucket"], f)
    assert "remove_bucket: temp-bucket" in res.output
    assert "temp-bucket" not in f["_aws_cli"]["buckets"]


def test_s3_rb_nonempty_fails():
    _, res = _run(["aws s3 rb s3://lab-website-assets"])
    assert res.exit_code == 254
    assert "BucketNotEmpty" in res.output


# ---- iam ----

def test_iam_list_users():
    _, res = _run(["aws iam list-users"])
    assert "deployer" in res.output
    assert "readonly" in res.output


def test_iam_user_policies():
    _, res = _run(["aws iam list-attached-user-policies --user-name deployer"])
    assert "PowerUserAccess" in res.output
    _, res = _run(["aws iam list-attached-user-policies --user-name nope"])
    assert res.exit_code == 254
    assert "NoSuchEntity" in res.output


# ---- elbv2 ----

def test_elbv2_describe():
    _, res = _run(["aws elbv2 describe-load-balancers"])
    assert "alb-web" in res.output
    assert "elb.amazonaws.com" in res.output
    _, res = _run(["aws elbv2 describe-target-groups"])
    assert "tg-web" in res.output


def test_elbv2_target_health():
    f, res = _run([
        "aws elbv2 describe-target-groups",
        "aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/tg-web/abc",
    ])
    assert res.output.count('"State": "healthy"') == 2
    assert f["aws_alb_inspected"] is True
    ok, _, _ = _check("awsc_alb_inspected", f)
    assert ok


def test_alb_validator_rejects_before_inspection():
    ok, _, _ = _check("awsc_alb_inspected", {})
    assert not ok


# ---- cloudwatch ----

def test_cloudwatch_describe_alarms():
    f, res = _run(["aws cloudwatch describe-alarms"])
    assert "web-cpu-high" in res.output
    assert '"StateValue": "ALARM"' in res.output
    assert f["aws_alarms_reviewed"] is True
    ok, _, _ = _check("awsc_alarms_reviewed", f)
    assert ok


def test_alarms_validator_rejects_before_review():
    ok, _, _ = _check("awsc_alarms_reviewed", {})
    assert not ok


# ---- full objective walkthrough ----

def test_full_lab_walkthrough_all_objectives_pass():
    cmds = [
        "aws sts get-caller-identity",
        "aws ec2 describe-instances",
        "aws ec2 run-instances --image-id ami-0abc123 --instance-type t3.micro --subnet-id subnet-pub1",
        "aws s3 mb s3://student-lab-bucket",
        "aws s3 cp notes.txt s3://student-lab-bucket",
        "aws ec2 create-vpc --cidr-block 10.1.0.0/16",
    ]
    f, _ = _run(cmds)
    # create-subnet needs the vpc id from the previous command
    vid = [v for v in f["_aws_cli"]["vpcs"] if v != "vpc-0a1b2c3d4e5f60001"][0]
    f, _ = _run([f"aws ec2 create-subnet --vpc-id {vid} --cidr-block 10.1.1.0/24"], f)
    f, _ = _run([
        "aws elbv2 describe-load-balancers",
        "aws elbv2 describe-target-groups",
        "aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/tg-web/abc",
        "aws cloudwatch describe-alarms",
    ], f)
    # cleanup: terminate the student instance
    iid = [i for i, m in f["_aws_cli"]["instances"].items() if m.get("student")][0]
    f, _ = _run([f"aws ec2 terminate-instances --instance-ids {iid}"], f)

    for name in VALIDATOR_NAMES:
        ok, msg, _ = _check(name, f)
        assert ok, f"validator {name} failed: {msg}"


def test_state_is_deterministic():
    f1, _ = _run(["aws ec2 run-instances --image-id ami-x --subnet-id subnet-pub1"])
    f2, _ = _run(["aws ec2 run-instances --image-id ami-x --subnet-id subnet-pub1"])
    id1 = [i for i, m in f1["_aws_cli"]["instances"].items() if m.get("student")][0]
    id2 = [i for i, m in f2["_aws_cli"]["instances"].items() if m.get("student")][0]
    assert id1 == id2


def test_state_is_stateful_across_commands():
    f, _ = _run(["aws s3 mb s3://keep-me"])
    f, res = _run(["aws s3 ls"], f)
    assert "keep-me" in res.output
