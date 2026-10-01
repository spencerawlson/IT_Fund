"""A simulated AWS CLI shell for the cloud-security audit lab.

Stateless like the recon/log shells: each recognised `aws` command returns realistic canned JSON/table
output for a fixed (misconfigured) account, and records the finding the learner uncovered. Executes
nothing and talks to no cloud. The scenario hides four classic misconfigurations to find:
  - a public S3 bucket (corp-public-backups, open to AllUsers)
  - a security group with SSH open to 0.0.0.0/0 (sg-admin)
  - an IAM user with AdministratorAccess (deploy)
  - a stale, never-rotated access key (ci-bot, >1 year old)
"""
from __future__ import annotations

import shlex
from typing import Any

from labs.providers.base import CommandResult

BUCKETS = ['corp-assets', 'corp-logs', 'corp-public-backups']
PUBLIC_BUCKET = 'corp-public-backups'


def _tok(s: str) -> list[str]:
    try:
        return shlex.split(s)
    except ValueError:
        return s.split()


def initial_prompt(lab) -> str:
    return 'auditor@cloudshell:~$ '


def banner(lab) -> list[str]:
    return [
        'Road to CISSP - simulated AWS CloudShell   (safe: read-only, nothing is really executed)',
        'You have read-only access to audit the "globomantics-dev" account for misconfigurations.',
        'Try: aws s3 ls · aws ec2 describe-security-groups · aws iam list-users · help',
    ]


def _opt(args: list[str], name: str) -> str | None:
    if name in args:
        i = args.index(name)
        if i + 1 < len(args):
            return args[i + 1]
    return None


def _s3_ls() -> CommandResult:
    out = '\n'.join(f'2026-0{i+1}-1{i} 09:14:0{i}  {b}' for i, b in enumerate(BUCKETS))
    return CommandResult(output=out, findings={'bucket_list': {'count': len(BUCKETS)}})


def _s3_get_acl(bucket: str) -> CommandResult:
    if bucket not in BUCKETS:
        return CommandResult(output=f'An error occurred (NoSuchBucket) when calling GetBucketAcl: {bucket}', exit_code=254)
    grants = ['        { "Grantee": { "Type": "CanonicalUser", "DisplayName": "globomantics" }, "Permission": "FULL_CONTROL" }']
    findings: dict[str, Any] = {}
    if bucket == PUBLIC_BUCKET:
        grants.append('        { "Grantee": { "Type": "Group", "URI": "http://acs.amazonaws.com/groups/global/AllUsers" }, "Permission": "READ" }')
        findings['public_bucket'] = {'bucket': bucket, 'grant': 'AllUsers:READ'}
    out = '{\n    "Owner": { "DisplayName": "globomantics" },\n    "Grants": [\n' + ',\n'.join(grants) + '\n    ]\n}'
    return CommandResult(output=out, findings=findings)


def _s3_pab(bucket: str) -> CommandResult:
    if bucket == PUBLIC_BUCKET:
        out = ('{\n    "PublicAccessBlockConfiguration": {\n'
               '        "BlockPublicAcls": false,\n        "IgnorePublicAcls": false,\n'
               '        "BlockPublicPolicy": false,\n        "RestrictPublicBuckets": false\n    }\n}')
        return CommandResult(output=out, findings={'public_bucket': {'bucket': bucket, 'grant': 'public-access-block disabled'}})
    return CommandResult(output=('An error occurred (NoSuchPublicAccessBlockConfiguration) when calling '
                                 f'GetPublicAccessBlock: no block configuration for {bucket}'), exit_code=254)


def _ec2_sgs() -> CommandResult:
    out = (
        '{\n    "SecurityGroups": [\n'
        '        { "GroupId": "sg-0web", "GroupName": "sg-web",\n'
        '          "IpPermissions": [ { "IpProtocol": "tcp", "FromPort": 443, "ToPort": 443, "IpRanges": [ { "CidrIp": "0.0.0.0/0" } ] } ] },\n'
        '        { "GroupId": "sg-0adm", "GroupName": "sg-admin",\n'
        '          "IpPermissions": [ { "IpProtocol": "tcp", "FromPort": 22, "ToPort": 22, "IpRanges": [ { "CidrIp": "0.0.0.0/0" } ] } ] },\n'
        '        { "GroupId": "sg-0db", "GroupName": "sg-db",\n'
        '          "IpPermissions": [ { "IpProtocol": "tcp", "FromPort": 5432, "ToPort": 5432, "UserIdGroupPairs": [ { "GroupId": "sg-0web" } ] } ] }\n'
        '    ]\n}'
    )
    return CommandResult(output=out, findings={'open_ssh': {'group': 'sg-admin', 'port': 22, 'cidr': '0.0.0.0/0'}})


def _iam_users() -> CommandResult:
    out = ('{\n    "Users": [\n'
           '        { "UserName": "deploy",  "CreateDate": "2025-06-01T10:00:00Z" },\n'
           '        { "UserName": "analyst", "CreateDate": "2025-08-14T09:30:00Z" },\n'
           '        { "UserName": "ci-bot",  "CreateDate": "2024-02-20T12:00:00Z" }\n    ]\n}')
    return CommandResult(output=out, findings={'iam_users': {'count': 3}})


def _iam_policies(user: str) -> CommandResult:
    policies = {
        'deploy': [('AdministratorAccess', 'arn:aws:iam::aws:policy/AdministratorAccess')],
        'analyst': [('ReadOnlyAccess', 'arn:aws:iam::aws:policy/ReadOnlyAccess')],
        'ci-bot': [('AmazonS3FullAccess', 'arn:aws:iam::aws:policy/AmazonS3FullAccess')],
    }
    if user not in policies:
        return CommandResult(output=f'An error occurred (NoSuchEntity) when calling ListAttachedUserPolicies: {user}', exit_code=254)
    rows = ',\n'.join(f'        {{ "PolicyName": "{n}", "PolicyArn": "{a}" }}' for n, a in policies[user])
    out = '{\n    "AttachedPolicies": [\n' + rows + '\n    ]\n}'
    findings = {'admin_user': {'user': user}} if any(n == 'AdministratorAccess' for n, _ in policies[user]) else {}
    return CommandResult(output=out, findings=findings)


def _iam_keys(user: str) -> CommandResult:
    keys = {
        'deploy': ('AKIADEPLOY0001', '2025-06-01T10:05:00Z'),
        'analyst': ('AKIAANALYST001', '2025-08-14T09:35:00Z'),
        'ci-bot': ('AKIACIBOT00001', '2024-02-20T12:05:00Z'),  # ~2 years old
    }
    if user not in keys:
        return CommandResult(output=f'An error occurred (NoSuchEntity) when calling ListAccessKeys: {user}', exit_code=254)
    kid, created = keys[user]
    out = ('{\n    "AccessKeyMetadata": [\n'
           f'        {{ "UserName": "{user}", "AccessKeyId": "{kid}", "Status": "Active", "CreateDate": "{created}" }}\n'
           '    ]\n}')
    findings = {'stale_key': {'user': user, 'created': created}} if user == 'ci-bot' else {}
    return CommandResult(output=out, findings=findings)


def _help() -> CommandResult:
    return CommandResult(output=(
        'Available commands (simulated, read-only - nothing really runs):\n'
        '  aws s3 ls                                         list S3 buckets\n'
        '  aws s3api get-bucket-acl --bucket <name>          who can access a bucket (watch for AllUsers)\n'
        '  aws s3api get-public-access-block --bucket <name> is public access blocked?\n'
        '  aws ec2 describe-security-groups                  firewall rules (watch for 0.0.0.0/0 on 22)\n'
        '  aws iam list-users                                IAM users\n'
        '  aws iam list-attached-user-policies --user-name <u>  a user\'s policies (watch for AdministratorAccess)\n'
        '  aws iam list-access-keys --user-name <u>          access keys and their age\n'
        '  aws sts get-caller-identity                       who am I\n'
        '  help | clear'
    ))


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    raw = (command or '').strip()
    if not raw:
        return CommandResult(output='')
    if len(raw) > 512:
        return CommandResult(output='Command too long.', exit_code=1)
    parts = _tok(raw)
    cmd = parts[0].lower()
    if cmd in ('clear', 'cls'):
        return CommandResult(output='', clear=True)
    if cmd in ('help', '?'):
        return _help()
    if cmd != 'aws':
        return CommandResult(output=f'{cmd}: command not found (this lab uses the `aws` CLI — try `help`)', exit_code=127)

    args = parts[1:]
    svc = args[0] if args else ''
    sub = args[1] if len(args) > 1 else ''

    if svc == 's3' and sub == 'ls':
        return _s3_ls()
    if svc == 's3api' and sub == 'get-bucket-acl':
        b = _opt(args, '--bucket')
        return _s3_get_acl(b) if b else CommandResult(output='usage: aws s3api get-bucket-acl --bucket <name>', exit_code=2)
    if svc == 's3api' and sub == 'get-public-access-block':
        b = _opt(args, '--bucket')
        return _s3_pab(b) if b else CommandResult(output='usage: aws s3api get-public-access-block --bucket <name>', exit_code=2)
    if svc == 'ec2' and sub == 'describe-security-groups':
        return _ec2_sgs()
    if svc == 'iam' and sub == 'list-users':
        return _iam_users()
    if svc == 'iam' and sub == 'list-attached-user-policies':
        u = _opt(args, '--user-name')
        return _iam_policies(u) if u else CommandResult(output='usage: aws iam list-attached-user-policies --user-name <u>', exit_code=2)
    if svc == 'iam' and sub == 'list-access-keys':
        u = _opt(args, '--user-name')
        return _iam_keys(u) if u else CommandResult(output='usage: aws iam list-access-keys --user-name <u>', exit_code=2)
    if svc == 'sts' and sub == 'get-caller-identity':
        return CommandResult(output='{\n    "UserId": "AIDAAUDITOR01",\n    "Account": "123456789012",\n    "Arn": "arn:aws:iam::123456789012:user/auditor"\n}')
    return CommandResult(output=f'aws: command not recognised in this lab: {" ".join(args[:2])}. Try `help`.', exit_code=2)
