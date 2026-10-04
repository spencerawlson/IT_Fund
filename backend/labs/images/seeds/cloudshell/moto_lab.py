#!/usr/bin/env python3
"""Local AWS API for the cloud-security-audit lab (road-to-cissp/cloudshell).

Serves moto's S3/EC2/IAM/STS APIs on 127.0.0.1:5001-5004 and seeds the exact
misconfigured account the lab teaches to audit (see labs/shells/aws_audit.py):
  - buckets: corp-assets, corp-logs, corp-public-backups (AllUsers READ grant)
  - security groups: sg-web (443 open), sg-admin (SSH 22 open to 0.0.0.0/0),
    sg-db (5432 from sg-web)
  - IAM: deploy (AdministratorAccess), analyst (ReadOnlyAccess),
    ci-bot (S3FullAccess, access key created 2024-02-20 -> visibly stale)

The learner uses the REAL `aws` CLI against this local API (endpoint URLs come
from the image ENV). The credentials are intentionally fake lab credentials for
a simulator that never leaves the container - never use real AWS keys here.

moto pins: moto[server]==5.2.3 (MOTO_IAM_LOAD_MANAGED_POLICIES=true loads the
AWS managed policies; ci-bot's key is backdated through moto's backend, which
is why the seed runs in-process instead of against a remote moto_server).
"""
from __future__ import annotations

import os
import socket
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("MOTO_IAM_LOAD_MANAGED_POLICIES", "true")

from werkzeug.serving import run_simple  # noqa: E402

from moto.backends import get_backend  # noqa: E402
from moto.core import DEFAULT_ACCOUNT_ID  # noqa: E402
from moto.moto_server.werkzeug_app import create_backend_app  # noqa: E402

import boto3  # noqa: E402

REGION = "us-east-1"
PORTS = {"s3": 5001, "ec2": 5002, "iam": 5003, "sts": 5004}
CREDS = {"aws_access_key_id": "auditor", "aws_secret_access_key": "lab-fake-key"}
READY_FILE = os.path.expanduser("~/.moto-ready")


def _wait_for(port: int, timeout: int = 30) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            socket.create_connection(("127.0.0.1", port), timeout=1).close()
            return
        except OSError:
            time.sleep(0.2)
    raise RuntimeError(f"moto service on port {port} never came up")


def _clients():
    kw = dict(region_name=REGION, **CREDS)
    return (
        boto3.client("s3", endpoint_url=f"http://127.0.0.1:{PORTS['s3']}", **kw),
        boto3.client("ec2", endpoint_url=f"http://127.0.0.1:{PORTS['ec2']}", **kw),
        boto3.client("iam", endpoint_url=f"http://127.0.0.1:{PORTS['iam']}", **kw),
    )


def seed() -> None:
    s3, ec2, iam = _clients()

    for bucket in ("corp-assets", "corp-logs", "corp-public-backups"):
        s3.create_bucket(Bucket=bucket)
    s3.put_bucket_acl(Bucket="corp-public-backups", ACL="public-read")

    vpc = ec2.create_vpc(CidrBlock="10.0.0.0/16")["Vpc"]["VpcId"]
    ids = {}
    for name in ("sg-web", "sg-admin", "sg-db"):
        ids[name] = ec2.create_security_group(GroupName=name, Description=name, VpcId=vpc)["GroupId"]
    ec2.authorize_security_group_ingress(
        GroupId=ids["sg-web"],
        IpPermissions=[{"IpProtocol": "tcp", "FromPort": 443, "ToPort": 443,
                        "IpRanges": [{"CidrIp": "0.0.0.0/0"}]}])
    ec2.authorize_security_group_ingress(
        GroupId=ids["sg-admin"],
        IpPermissions=[{"IpProtocol": "tcp", "FromPort": 22, "ToPort": 22,
                        "IpRanges": [{"CidrIp": "0.0.0.0/0"}]}])
    ec2.authorize_security_group_ingress(
        GroupId=ids["sg-db"],
        IpPermissions=[{"IpProtocol": "tcp", "FromPort": 5432, "ToPort": 5432,
                        "UserIdGroupPairs": [{"GroupId": ids["sg-web"]}]}])

    for user in ("deploy", "analyst", "ci-bot"):
        iam.create_user(UserName=user)
    iam.attach_user_policy(UserName="deploy",
                           PolicyArn="arn:aws:iam::aws:policy/AdministratorAccess")
    iam.attach_user_policy(UserName="analyst",
                           PolicyArn="arn:aws:iam::aws:policy/ReadOnlyAccess")
    iam.attach_user_policy(UserName="ci-bot",
                           PolicyArn="arn:aws:iam::aws:policy/AmazonS3FullAccess")
    for user in ("deploy", "analyst", "ci-bot"):
        iam.create_access_key(UserName=user)

    # The stale key: backdate ci-bot's key through moto's backend
    # (pinned moto==5.2.3; attribute is `create_date` on moto.iam.models.AccessKey).
    iam_backend = get_backend("iam")[DEFAULT_ACCOUNT_ID]["global"]
    cibot_keys = iam_backend.users["ci-bot"].access_keys
    cibot_keys[0].create_date = datetime(2024, 2, 20, 12, 5, tzinfo=timezone.utc)


def main() -> None:
    for service, port in PORTS.items():
        app = create_backend_app(service)
        thread = threading.Thread(
            target=run_simple,
            kwargs={"hostname": "127.0.0.1", "port": port, "application": app},
            daemon=True,
            name=f"moto-{service}",
        )
        thread.start()
    for port in PORTS.values():
        _wait_for(port)
    seed()
    Path(READY_FILE).touch()
    print("moto-lab: seeded and ready", flush=True)
    threading.Event().wait()  # serve until the container stops


if __name__ == "__main__":
    sys.exit(main())
