"""A simulated AWS CLI shell for the AWS CLI fundamentals lab (SAA-C03 aligned).

A stateful, deterministic model of one AWS account: sts identity, EC2 instances (list/launch/
start/stop/terminate), VPCs and subnets (list/create), S3 buckets (list/create/upload/remove),
ELBv2 load balancer with target health, IAM users and policies, and CloudWatch alarms. Nothing
executes and no cloud is contacted; account state lives in the session findings under `_aws_cli`,
so progress is derived from outcomes, not keystrokes.

Determinism: every generated id (instance, vpc, subnet) is derived from an MD5 of a counter plus
its parameters, so the same command sequence always produces the same output.
"""
from __future__ import annotations

import copy
import hashlib
import shlex
from typing import Any

from labs.providers.base import CommandResult

ACCOUNT = '123456789012'
REGION = 'us-east-1'


def _hid(seed: str, n: int = 12) -> str:
    return hashlib.md5(seed.encode()).hexdigest()[:n]


def _fresh() -> dict[str, Any]:
    return {
        'identity_checked': False,
        'instances_listed': 0,
        'launched_any': False,
        'launch_seq': 0,
        'vpc_seq': 0,
        'alb_inspected': False,
        'alarms_reviewed': False,
        'instances': {
            'i-0a1b2c3d4e5f60001': {'id': 'i-0a1b2c3d4e5f60001', 'name': 'web-1', 'type': 't3.micro',
                                    'state': 'running', 'subnet': 'subnet-pub1', 'az': 'us-east-1a',
                                    'student': False},
            'i-0a1b2c3d4e5f60002': {'id': 'i-0a1b2c3d4e5f60002', 'name': 'web-2', 'type': 't3.micro',
                                    'state': 'running', 'subnet': 'subnet-pub1', 'az': 'us-east-1a',
                                    'student': False},
            'i-0a1b2c3d4e5f60003': {'id': 'i-0a1b2c3d4e5f60003', 'name': 'db-1', 'type': 't3.small',
                                    'state': 'stopped', 'subnet': 'subnet-priv1', 'az': 'us-east-1b',
                                    'student': False},
        },
        'vpcs': {
            'vpc-0a1b2c3d4e5f60001': {'id': 'vpc-0a1b2c3d4e5f60001', 'name': 'vpc-main',
                                     'cidr': '10.0.0.0/16', 'state': 'available', 'student': False},
        },
        'subnets': {
            'subnet-pub1': {'id': 'subnet-pub1', 'vpc': 'vpc-0a1b2c3d4e5f60001',
                            'cidr': '10.0.1.0/24', 'az': 'us-east-1a', 'name': 'public-a', 'student': False},
            'subnet-priv1': {'id': 'subnet-priv1', 'vpc': 'vpc-0a1b2c3d4e5f60001',
                             'cidr': '10.0.2.0/24', 'az': 'us-east-1b', 'name': 'private-b', 'student': False},
        },
        'buckets': {
            'lab-website-assets': {'objects': ['index.html'], 'student': False},
            'lab-backups': {'objects': [], 'student': False},
        },
        'alb': {
            'name': 'alb-web',
            'arn': f'arn:aws:elasticloadbalancing:{REGION}:{ACCOUNT}:loadbalancer/app/alb-web/50dc6c495c0c9188',
            'dns': f'alb-web-1234567890.{REGION}.elb.amazonaws.com',
            'scheme': 'internet-facing',
            'state': 'active',
            'target_group': 'tg-web',
            'targets': ['i-0a1b2c3d4e5f60001', 'i-0a1b2c3d4e5f60002'],
        },
        'iam_users': {
            'deployer': {'policies': ['PowerUserAccess'], 'created': '2025-03-10T09:00:00Z'},
            'readonly': {'policies': ['ReadOnlyAccess'], 'created': '2025-07-22T14:30:00Z'},
        },
        'alarms': [
            {'name': 'web-cpu-high', 'state': 'ALARM', 'metric': 'CPUUtilization',
             'threshold': '80% for 5 minutes', 'resource': 'alb-web'},
            {'name': 'db-disk-low', 'state': 'OK', 'metric': 'FreeStorageSpace',
             'threshold': '< 20 GB', 'resource': 'i-0a1b2c3d4e5f60003'},
        ],
    }


def initial_prompt(lab) -> str:
    return 'student@cloudshell:~/aws$ '


def banner(lab) -> list[str]:
    return [
        'Road to CISSP - simulated AWS CloudShell   (safe: nothing is really executed)',
        'Learn the AWS CLI the way architects use it: identity, EC2, S3, VPC networking,',
        'load balancing, CloudWatch alarms - then clean up what you built.',
        'Try: aws sts get-caller-identity · aws ec2 describe-instances · aws s3 ls · help',
    ]


def _opt(args: list[str], *names: str) -> str | None:
    for name in names:
        if name in args:
            i = args.index(name)
            if i + 1 < len(args):
                return args[i + 1]
    return None


def _err(code: str, op: str, msg: str) -> CommandResult:
    return CommandResult(output=f'An error occurred ({code}) when calling the {op} operation: {msg}',
                         exit_code=254)


def _derive(st: dict[str, Any]) -> dict[str, Any]:
    student_running = [i for i in st['instances'].values()
                       if i.get('student') and i['state'] == 'running']
    student_buckets = [b for b, meta in st['buckets'].items()
                       if meta.get('student') and meta['objects']]
    student_vpcs = [v for v in st['vpcs'].values() if v.get('student')]
    vpc_with_subnet = any(
        any(s['vpc'] == v['id'] for s in st['subnets'].values()) for v in student_vpcs
    )
    return {
        'aws_identity': st['identity_checked'],
        'aws_instances_listed': st['instances_listed'],
        # sticky: launching is an achievement even after the instance is terminated for cleanup
        'aws_instance_launched': st['launched_any'],
        'aws_bucket_created': len(student_buckets) > 0,
        'aws_vpc_built': vpc_with_subnet,
        'aws_alb_inspected': st['alb_inspected'],
        'aws_alarms_reviewed': st['alarms_reviewed'],
        'aws_cleanup_done': st['launched_any'] and len(student_running) == 0,
    }


def _emit(st, output, clear=False, exit_code=0) -> CommandResult:
    return CommandResult(output=output, findings={'_aws_cli': st, **_derive(st)},
                         prompt='student@cloudshell:~/aws$ ', clear=clear, exit_code=exit_code)


# ---- sts ----

def _sts(st, args) -> CommandResult:
    sub = args[0] if args else ''
    if sub == 'get-caller-identity':
        st['identity_checked'] = True
        out = ('{\n'
               f'    "UserId": "AIDAEXAMPLE123",\n    "Account": "{ACCOUNT}",\n'
               f'    "Arn": "arn:aws:iam::{ACCOUNT}:user/student"\n}}')
        return _emit(st, out)
    return _err('InvalidAction', 'Sts', f'unknown subcommand: {sub or "(none)"}')


# ---- ec2: instances ----

def _instance_json(i: dict[str, Any]) -> str:
    return ('        {\n'
            f'            "InstanceId": "{i["id"]}",\n'
            f'            "InstanceType": "{i["type"]}",\n'
            f'            "State": {{ "Name": "{i["state"]}" }},\n'
            f'            "SubnetId": "{i["subnet"]}",\n'
            f'            "Placement": {{ "AvailabilityZone": "{i["az"]}" }},\n'
            f'            "Tags": [ {{ "Key": "Name", "Value": "{i["name"]}" }} ]\n'
            '        }')


def _ec2_describe_instances(st, args) -> CommandResult:
    ids = _opt(args, '--instance-ids')
    wanted = ids.split(',') if ids else None
    insts = [i for i in st['instances'].values() if not wanted or i['id'] in wanted]
    if wanted and not insts:
        return _err('InvalidInstanceID.NotFound', 'DescribeInstances',
                    f'the instance IDs {wanted} do not exist')
    body = ',\n'.join(_instance_json(i) for i in insts)
    st['instances_listed'] = max(st['instances_listed'], len(insts))
    out = '{\n    "Reservations": [\n        {\n            "Instances": [\n' + body + '\n            ]\n        }\n    ]\n}'
    return _emit(st, out)


def _ec2_run_instances(st, args) -> CommandResult:
    image = _opt(args, '--image-id')
    itype = _opt(args, '--instance-type', '--instance_type') or 't3.micro'
    subnet = _opt(args, '--subnet-id', '--subnet_id') or 'subnet-pub1'
    count = _opt(args, '--count')
    try:
        n = max(1, min(int(count), 5)) if count else 1
    except ValueError:
        return _err('InvalidParameterValue', 'RunInstances', f'bad --count value: {count}')
    if not image:
        return _err('MissingParameter', 'RunInstances',
                    'the request must contain the parameter image-id')
    if subnet not in st['subnets']:
        return _err('InvalidSubnetID.NotFound', 'RunInstances', f'subnet {subnet} does not exist')
    launched = []
    for _ in range(n):
        st['launch_seq'] += 1
        iid = f'i-{_hid(f"launch:{st["launch_seq"]}:{itype}:{subnet}", 17)}'
        name = f'student-{st["launch_seq"]}'
        st['instances'][iid] = {'id': iid, 'name': name, 'type': itype, 'state': 'running',
                                'subnet': subnet, 'az': st['subnets'][subnet]['az'], 'student': True}
        launched.append(st['instances'][iid])
    st['launched_any'] = True
    body = ',\n'.join(_instance_json(i) for i in launched)
    out = '{\n    "Instances": [\n' + body + '\n    ]\n}'
    return _emit(st, out)


def _ec2_change_state(st, args, action: str) -> CommandResult:
    ids = _opt(args, '--instance-ids')
    if not ids:
        return CommandResult(output=f'usage: aws ec2 {action} --instance-ids <id> [more ...]', exit_code=2)
    wanted = ids.split(',')
    out_lines, failed = [], False
    for iid in wanted:
        inst = st['instances'].get(iid)
        if not inst:
            out_lines.append(f'An error occurred (InvalidInstanceID.NotFound) when calling the '
                             f'{action} operation: {iid} does not exist')
            failed = True
            continue
        prev = inst['state']
        if action == 'terminate-instances':
            inst['state'] = 'terminated'
        elif action == 'stop-instances':
            inst['state'] = 'stopped' if prev == 'running' else prev
        elif action == 'start-instances':
            inst['state'] = 'running' if prev == 'stopped' else prev
        out_lines.append(f'{iid}: {prev} -> {inst["state"]}')
    return _emit(st, '\n'.join(out_lines), exit_code=1 if failed else 0)


# ---- ec2: networking ----

def _ec2_describe_vpcs(st, args) -> CommandResult:
    rows = []
    for v in st['vpcs'].values():
        rows.append('        {\n'
                    f'            "VpcId": "{v["id"]}",\n'
                    f'            "CidrBlock": "{v["cidr"]}",\n'
                    f'            "State": "{v["state"]}",\n'
                    f'            "Tags": [ {{ "Key": "Name", "Value": "{v["name"]}" }} ]\n'
                    '        }')
    return _emit(st, '{\n    "Vpcs": [\n' + ',\n'.join(rows) + '\n    ]\n}')


def _ec2_create_vpc(st, args) -> CommandResult:
    cidr = _opt(args, '--cidr-block', '--cidr_block')
    if not cidr:
        return CommandResult(output='usage: aws ec2 create-vpc --cidr-block <cidr>', exit_code=2)
    st['vpc_seq'] += 1
    vid = f'vpc-{_hid(f"vpc:{st["vpc_seq"]}:{cidr}", 17)}'
    st['vpcs'][vid] = {'id': vid, 'name': f'student-vpc-{st["vpc_seq"]}', 'cidr': cidr,
                       'state': 'available', 'student': True}
    out = ('{\n    "Vpc": {\n'
           f'        "VpcId": "{vid}",\n'
           f'        "CidrBlock": "{cidr}",\n'
           f'        "State": "available"\n'
           '    }\n}')
    return _emit(st, out)


def _ec2_describe_subnets(st, args) -> CommandResult:
    rows = []
    for s in st['subnets'].values():
        rows.append('        {\n'
                    f'            "SubnetId": "{s["id"]}",\n'
                    f'            "VpcId": "{s["vpc"]}",\n'
                    f'            "CidrBlock": "{s["cidr"]}",\n'
                    f'            "AvailabilityZone": "{s["az"]}",\n'
                    f'            "Tags": [ {{ "Key": "Name", "Value": "{s["name"]}" }} ]\n'
                    '        }')
    return _emit(st, '{\n    "Subnets": [\n' + ',\n'.join(rows) + '\n    ]\n}')


def _ec2_create_subnet(st, args) -> CommandResult:
    vpc = _opt(args, '--vpc-id', '--vpc_id')
    cidr = _opt(args, '--cidr-block', '--cidr_block')
    if not vpc or not cidr:
        return CommandResult(output='usage: aws ec2 create-subnet --vpc-id <vpc> --cidr-block <cidr>', exit_code=2)
    if vpc not in st['vpcs']:
        return _err('InvalidVpcID.NotFound', 'CreateSubnet', f'vpc {vpc} does not exist')
    sid = f'subnet-{_hid(f"subnet:{vpc}:{cidr}", 13)}'
    st['subnets'][sid] = {'id': sid, 'vpc': vpc, 'cidr': cidr, 'az': f'{REGION}a',
                          'name': f'student-subnet-{len(st["subnets"])}', 'student': True}
    out = ('{\n    "Subnet": {\n'
           f'        "SubnetId": "{sid}",\n'
           f'        "VpcId": "{vpc}",\n'
           f'        "CidrBlock": "{cidr}",\n'
           f'        "AvailabilityZone": "{REGION}a",\n'
           f'        "State": "available"\n'
           '    }\n}')
    return _emit(st, out)


def _ec2(st, args) -> CommandResult:
    sub = args[0] if args else ''
    rest = args[1:]
    if sub == 'describe-instances':
        return _ec2_describe_instances(st, rest)
    if sub == 'run-instances':
        return _ec2_run_instances(st, rest)
    if sub in ('terminate-instances', 'stop-instances', 'start-instances'):
        return _ec2_change_state(st, rest, sub)
    if sub == 'describe-vpcs':
        return _ec2_describe_vpcs(st, rest)
    if sub == 'create-vpc':
        return _ec2_create_vpc(st, rest)
    if sub == 'describe-subnets':
        return _ec2_describe_subnets(st, rest)
    if sub == 'create-subnet':
        return _ec2_create_subnet(st, rest)
    return _err('InvalidAction', 'Ec2', f'unknown subcommand: {sub or "(none)"} - try `help`')


# ---- s3 ----

def _s3_ls(st, args) -> CommandResult:
    if args and args[0].startswith('s3://'):
        bucket = args[0][5:].rstrip('/')
        meta = st['buckets'].get(bucket)
        if meta is None:
            return _err('NoSuchBucket', 'ListObjects', f'bucket {bucket} does not exist')
        rows = [f'2026-10-09 14:00:00           0 {o}' for o in meta['objects']]
        return _emit(st, '\n'.join(rows) if rows else '')
    rows = [f'2026-10-09 09:14:00 {b}' for b in st['buckets']]
    return _emit(st, '\n'.join(rows))


def _s3_mb(st, args) -> CommandResult:
    if not args or not args[0].startswith('s3://'):
        return CommandResult(output='usage: aws s3 mb s3://<bucket-name>', exit_code=2)
    bucket = args[0][5:].rstrip('/')
    if bucket in st['buckets']:
        return _err('BucketAlreadyExists', 'CreateBucket', f'bucket {bucket} already exists')
    st['buckets'][bucket] = {'objects': [], 'student': True}
    return _emit(st, f'make_bucket: {bucket}')


def _s3_cp(st, args) -> CommandResult:
    if len(args) < 2:
        return CommandResult(output='usage: aws s3 cp <local-file> s3://<bucket>[/key]', exit_code=2)
    src, dst = args[0], args[1]
    if not dst.startswith('s3://'):
        return _err('InvalidArgument', 'PutObject', 'destination must be s3://<bucket>[/key]')
    rest = dst[5:]
    bucket, _, key = rest.partition('/')
    meta = st['buckets'].get(bucket)
    if meta is None:
        return _err('NoSuchBucket', 'PutObject', f'bucket {bucket} does not exist')
    key = key or src.rsplit('/', 1)[-1]
    if key not in meta['objects']:
        meta['objects'].append(key)
    return _emit(st, f'upload: {src} to s3://{bucket}/{key}')


def _s3_rb(st, args) -> CommandResult:
    if not args or not args[0].startswith('s3://'):
        return CommandResult(output='usage: aws s3 rb s3://<bucket-name>', exit_code=2)
    bucket = args[0][5:].rstrip('/')
    meta = st['buckets'].get(bucket)
    if meta is None:
        return _err('NoSuchBucket', 'DeleteBucket', f'bucket {bucket} does not exist')
    if meta['objects']:
        return _err('BucketNotEmpty', 'DeleteBucket', f'bucket {bucket} is not empty')
    del st['buckets'][bucket]
    return _emit(st, f'remove_bucket: {bucket}')


def _s3(st, args) -> CommandResult:
    sub = args[0] if args else ''
    rest = args[1:]
    if sub == 'ls':
        return _s3_ls(st, rest)
    if sub == 'mb':
        return _s3_mb(st, rest)
    if sub == 'cp':
        return _s3_cp(st, rest)
    if sub == 'rb':
        return _s3_rb(st, rest)
    return _err('InvalidAction', 'S3', f'unknown subcommand: {sub or "(none)"} - try `help`')


# ---- iam ----

def _iam(st, args) -> CommandResult:
    sub = args[0] if args else ''
    rest = args[1:]
    if sub == 'list-users':
        rows = ',\n'.join(
            f'        {{ "UserName": "{u}", "CreateDate": "{m["created"]}" }}'
            for u, m in st['iam_users'].items())
        return _emit(st, '{\n    "Users": [\n' + rows + '\n    ]\n}')
    if sub == 'list-attached-user-policies':
        user = _opt(rest, '--user-name', '--user_name')
        if not user:
            return CommandResult(output='usage: aws iam list-attached-user-policies --user-name <u>', exit_code=2)
        meta = st['iam_users'].get(user)
        if meta is None:
            return _err('NoSuchEntity', 'ListAttachedUserPolicies', f'user {user} does not exist')
        rows = ',\n'.join(
            f'        {{ "PolicyName": "{p}", "PolicyArn": "arn:aws:iam::aws:policy/{p}" }}'
            for p in meta['policies'])
        return _emit(st, '{\n    "AttachedPolicies": [\n' + rows + '\n    ]\n}')
    return _err('InvalidAction', 'Iam', f'unknown subcommand: {sub or "(none)"} - try `help`')


# ---- elbv2 ----

def _elbv2(st, args) -> CommandResult:
    sub = args[0] if args else ''
    rest = args[1:]
    alb = st['alb']
    if sub == 'describe-load-balancers':
        out = ('{\n    "LoadBalancers": [\n        {\n'
               f'            "LoadBalancerName": "{alb["name"]}",\n'
               f'            "DNSName": "{alb["dns"]}",\n'
               f'            "Scheme": "{alb["scheme"]}",\n'
               f'            "State": {{ "Code": "{alb["state"]}" }},\n'
               f'            "Type": "application"\n'
               '        }\n    ]\n}')
        return _emit(st, out)
    if sub == 'describe-target-groups':
        out = ('{\n    "TargetGroups": [\n        {\n'
               f'            "TargetGroupName": "{alb["target_group"]}",\n'
               '            "Protocol": "HTTP",\n'
               '            "Port": 80,\n'
               '            "TargetType": "instance",\n'
               f'            "LoadBalancerArns": [ "{alb["arn"]}" ]\n'
               '        }\n    ]\n}')
        return _emit(st, out)
    if sub == 'describe-target-health':
        arn = _opt(rest, '--target-group-arn', '--target_group_arn')
        if not arn:
            return CommandResult(output='usage: aws elbv2 describe-target-health --target-group-arn <arn>',
                                 exit_code=2)
        rows = []
        for tid in alb['targets']:
            inst = st['instances'].get(tid, {})
            health = 'healthy' if inst.get('state') == 'running' else 'unhealthy'
            rows.append('        {\n'
                        f'            "Target": {{ "Id": "{tid}" }},\n'
                        f'            "TargetHealth": {{ "State": "{health}" }}\n'
                        '        }')
        st['alb_inspected'] = True
        return _emit(st, '{\n    "TargetHealthDescriptions": [\n' + ',\n'.join(rows) + '\n    ]\n}')
    return _err('InvalidAction', 'Elbv2', f'unknown subcommand: {sub or "(none)"} - try `help`')


# ---- cloudwatch ----

def _cloudwatch(st, args) -> CommandResult:
    sub = args[0] if args else ''
    if sub == 'describe-alarms':
        rows = []
        for a in st['alarms']:
            rows.append('        {\n'
                        f'            "AlarmName": "{a["name"]}",\n'
                        f'            "StateValue": "{a["state"]}",\n'
                        f'            "MetricName": "{a["metric"]}",\n'
                        f'            "Threshold": "{a["threshold"]}",\n'
                        f'            "Resource": "{a["resource"]}"\n'
                        '        }')
        st['alarms_reviewed'] = True
        return _emit(st, '{\n    "MetricAlarms": [\n' + ',\n'.join(rows) + '\n    ]\n}')
    return _err('InvalidAction', 'CloudWatch', f'unknown subcommand: {sub or "(none)"} - try `help`')


def _help() -> str:
    return (
        'Simulated AWS CloudShell - safe: nothing is really executed.\n'
        '\n'
        '  aws sts get-caller-identity                       who am I in this account\n'
        '  aws ec2 describe-instances [--instance-ids i-..]  list EC2 instances\n'
        '  aws ec2 run-instances --image-id ami-.. --instance-type t3.micro --subnet-id subnet-.. [--count N]\n'
        '  aws ec2 start-instances|stop-instances|terminate-instances --instance-ids i-..\n'
        '  aws ec2 describe-vpcs | create-vpc --cidr-block 10.1.0.0/16\n'
        '  aws ec2 describe-subnets | create-subnet --vpc-id vpc-.. --cidr-block 10.1.1.0/24\n'
        '  aws s3 ls [s3://bucket]                           list buckets (or objects)\n'
        '  aws s3 mb s3://<name> | cp <file> s3://<bucket>[/key] | rb s3://<name>\n'
        '  aws iam list-users | list-attached-user-policies --user-name <u>\n'
        '  aws elbv2 describe-load-balancers | describe-target-groups\n'
        '  aws elbv2 describe-target-health --target-group-arn <arn>\n'
        '  aws cloudwatch describe-alarms                     alarm states (watch for ALARM)\n'
        '\n'
        '  help | clear'
    )


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    st = copy.deepcopy(findings.get('_aws_cli')) if findings.get('_aws_cli') else _fresh()
    raw = (command or '').strip()
    if not raw:
        return _emit(st, '')
    if len(raw) > 512:
        return _emit(st, 'Command too long.', exit_code=1)
    try:
        parts = shlex.split(raw)
    except ValueError:
        parts = raw.split()
    cmd = parts[0].lower()
    args = parts[1:]

    if cmd in ('clear', 'cls'):
        return _emit(st, '', clear=True)
    if cmd in ('help', '?'):
        return _emit(st, _help())
    if cmd != 'aws':
        return _emit(st, f'{cmd}: command not found (this lab uses the `aws` CLI - try `help`)', exit_code=127)

    svc = args[0] if args else ''
    sub = args[1:]

    if svc == 'sts':
        return _sts(st, sub)
    if svc == 'ec2':
        return _ec2(st, sub)
    if svc == 's3':
        return _s3(st, sub)
    if svc == 'iam':
        return _iam(st, sub)
    if svc == 'elbv2':
        return _elbv2(st, sub)
    if svc == 'cloudwatch':
        return _cloudwatch(st, sub)
    return _emit(st, f'aws: unknown service "{svc}" in this lab. Try `help`.', exit_code=2)
