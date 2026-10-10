"""A simulated Docker CLI shell for the Docker fundamentals lab.

A stateful, deterministic Docker Engine model: pull/run/stop/start/rm containers, publish ports,
exec/logs/inspect, build images from a workspace Dockerfile, manage volumes and networks, and
bring up a multi-container stack with `docker compose`. Nothing executes; the engine state lives
in the session findings under `_docker_cli`, so progress is derived from outcomes, not keystrokes.

Determinism: every generated id (container, image, network) is derived from an MD5 of its name,
so the same command sequence always produces the same output.
"""
from __future__ import annotations

import copy
import hashlib
import re
import shlex
from typing import Any

from labs.providers.base import CommandResult

DOCKERFILE = """FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
"""

COMPOSE_YML = """services:
  web:
    image: nginx:latest
    ports:
      - "8081:80"
  api:
    image: python:3.12-slim
    command: ["python", "-m", "http.server", "8000"]
    ports:
      - "8000:8000"
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
"""

# Images the simulated registry knows how to serve.
PULLABLE = {
    'nginx': {'tags': ['latest'], 'size': '188MB'},
    'postgres': {'tags': ['16', 'latest'], 'size': '432MB'},
    'redis': {'tags': ['7', 'latest'], 'size': '138MB'},
    'hello-world': {'tags': ['latest'], 'size': '20.3kB'},
    'ubuntu': {'tags': ['22.04', 'latest'], 'size': '77.8MB'},
    'python': {'tags': ['3.12-slim', 'latest'], 'size': '132MB'},
    'alpine': {'tags': ['latest'], 'size': '7.9MB'},
    'node': {'tags': ['20-alpine'], 'size': '172MB'},
}

PRESEED = [('nginx', 'latest'), ('postgres', '16'), ('redis', '7')]

COMPOSE_SERVICES = [
    {'name': 'web', 'image': 'nginx:latest', 'ports': {'8081': '80'}},
    {'name': 'api', 'image': 'python:3.12-slim', 'ports': {'8000': '8000'}},
    {'name': 'db', 'image': 'postgres:16', 'ports': {}, 'volumes': ['pgdata'], 'env': {'POSTGRES_PASSWORD': 'secret'}},
]

NGINX_PAGE = ('<!DOCTYPE html>\n<html>\n<head><title>Welcome to nginx!</title></head>\n'
              '<body>\n<h1>Welcome to nginx!</h1>\n'
              '<p>If you see this page, the nginx web server is successfully installed and working.</p>\n'
              '</body>\n</html>')


def _hid(seed: str, n: int = 12) -> str:
    h1 = hashlib.md5(seed.encode()).hexdigest()
    if n <= 32:
        return h1[:n]
    h2 = hashlib.md5((seed + ':2').encode()).hexdigest()
    return (h1 + h2)[:n]


def _fresh() -> dict[str, Any]:
    images = [{'repository': r, 'tag': t, 'id': _hid(f'image:{r}:{t}'),
               'size': PULLABLE[r]['size'], 'created': '3 weeks ago'} for r, t in PRESEED]
    return {
        'containers': {},          # name -> {id, image, status, ports{host:container}, env, volumes[], networks[]}
        'images': images,          # list of {repository, tag, id, size, created}
        'volumes': [],             # volume names
        'networks': {'bridge': {'driver': 'bridge', 'subnet': '172.17.0.0/16'},
                     'host': {'driver': 'host', 'subnet': ''},
                     'none': {'driver': 'null', 'subnet': ''}},
        'volume_data': {},         # volume name -> [rows] (simulated postgres table)
        'ip_next': {},             # network -> next host octet
        'compose_up': False,
        'verified': False,
        'pulled': False,
        'exec_ok': False,
        'logs_seen': False,
        'port_reached': False,
        'built': [],               # image refs created by `docker build`
        'pg_writer': None,         # container name that last INSERTed rows
        'data_survived': False,
        'ping_ok': False,
    }


def initial_prompt(lab) -> str:
    return 'student@docker:~/lab$ '


def banner(lab) -> list[str]:
    return [
        'Road to CISSP - simulated Docker host   (safe: nothing is really executed)',
        'Learn Docker by doing: run containers, publish ports, build an image, persist data',
        'with a volume, wire containers into a network, and deploy a Compose stack.',
        'Try: docker info · docker run -d --name web -p 8080:80 nginx · cat Dockerfile · help',
    ]


def _img_key(repo: str, tag: str) -> str:
    return f'{repo}:{tag}'


def _norm_image(ref: str) -> tuple[str, str]:
    """'nginx' -> ('nginx', 'latest'); 'postgres:16' -> ('postgres', '16')."""
    if ':' in ref and not ref.startswith('localhost'):
        repo, _, tag = ref.rpartition(':')
    else:
        repo, tag = ref, 'latest'
    return repo, tag or 'latest'


def _find_image(st, repo, tag):
    for im in st['images']:
        if im['repository'] == repo and im['tag'] == tag:
            return im
    return None


def _ensure_pulled(st, repo, tag):
    """Make sure image repo:tag exists locally, simulating a pull when needed."""
    if _find_image(st, repo, tag):
        return True, f'{repo}:{tag}: Status: Image is up to date for {repo}:{tag}'
    info = PULLABLE.get(repo)
    if not info or tag not in info['tags']:
        return False, (f'Error response from daemon: pull access denied for {repo}, '
                       f'repository does not exist or may require \'docker login\'')
    st['images'].append({'repository': repo, 'tag': tag, 'id': _hid(f'image:{repo}:{tag}'),
                         'size': info['size'], 'created': '2 weeks ago'})
    st['pulled'] = True
    return True, (f'{tag}: Pulling from library/{repo}\n'
                  f'Digest: sha256:{_hid(f"digest:{repo}:{tag}", 64)}\n'
                  f'Status: Downloaded newer image for {repo}:{tag}')


def _alloc_ip(st, net: str) -> str:
    base = st['networks'][net]['subnet'].rsplit('.', 1)[0] if st['networks'][net]['subnet'] else '172.17.0'
    nxt = st['ip_next'].get(net, 2)
    st['ip_next'][net] = nxt + 1
    return f'{base}.{nxt}'


def _derive(st: dict[str, Any]) -> dict[str, Any]:
    running = [c for c in st['containers'].values() if c['status'] == 'running']
    custom_nets = [n for n in st['networks'] if n not in ('bridge', 'host', 'none')]
    return {
        'df_engine_verified': st['verified'],
        'df_container_running': len(running) > 0,
        'df_port_mapped': st['port_reached'],
        'df_container_explored': st['exec_ok'] and st['logs_seen'],
        'df_image_built': len(st['built']) > 0,
        'df_volume_persisted': st['data_survived'],
        'df_network_connected': len(custom_nets) > 0 and st['ping_ok'],
        'df_compose_up': st['compose_up'],
    }


def _emit(st, output, clear=False, exit_code=0) -> CommandResult:
    return CommandResult(output=output, findings={'_docker_cli': st, **_derive(st)},
                         prompt='student@docker:~/lab$ ', clear=clear, exit_code=exit_code)


# ---- docker subcommands ----

def _docker_version() -> str:
    return ('Client:\n Version:           27.3.1\n API version:       1.47\n'
            ' Go version:        go1.22.7\n OS/Arch:           linux/amd64\n\n'
            'Server: Docker Desktop 4.36.0 (linux)\n Engine:\n  Version:          27.3.1\n'
            '  API version:      1.47 (minimum version 1.24)\n  Experimental:     false')


def _docker_info(st) -> str:
    st['verified'] = True
    n_run = sum(1 for c in st['containers'].values() if c['status'] == 'running')
    return (f'Client:\n Version:    27.3.1\n Context:    desktop-linux\n\n'
            f'Server:\n Containers: {len(st["containers"])}\n  Running: {n_run}\n'
            f'  Paused: 0\n  Stopped: {len(st["containers"]) - n_run}\n'
            f' Images: {len(st["images"])}\n Server Version: 27.3.1\n'
            f' Storage Driver: overlayfs\n Operating System: Docker Desktop\n'
            f' Architecture: x86_64\n Experimental: false')


def _images(st) -> str:
    rows = ['REPOSITORY   TAG         IMAGE ID       CREATED       SIZE']
    for im in st['images']:
        rows.append(f'{im["repository"]:<12} {im["tag"]:<11} {im["id"]:<14} {im["created"]:<11} {im["size"]}')
    return '\n'.join(rows)


def _ps(st, all_: bool) -> str:
    rows = ['CONTAINER ID   IMAGE            STATUS         PORTS                  NAMES']
    for name, c in st['containers'].items():
        if not all_ and c['status'] != 'running':
            continue
        status = 'Up 2 minutes' if c['status'] == 'running' else 'Exited (0) 1 minute ago'
        ports = ', '.join(f'0.0.0.0:{h}->{cp}/tcp' for h, cp in c['ports'].items())
        rows.append(f'{c["id"]:<14} {c["image"]:<16} {status:<14} {ports:<22} {name}')
    return '\n'.join(rows)


def _run(st, args) -> CommandResult:
    detach = name = image = net = None
    ports, env, vols = {}, {}, []
    i = 0
    while i < len(args):
        t = args[i]
        if t in ('-d', '--detach'):
            detach = True
        elif t in ('-it', '-i', '-t'):
            pass
        elif t == '--rm':
            pass
        elif t == '--name' and i + 1 < len(args):
            name = args[i + 1]; i += 1
        elif t in ('-p', '--publish') and i + 1 < len(args):
            hp, _, cp = args[i + 1].partition(':')
            if cp:
                ports[hp] = cp
            i += 1
        elif t in ('-e', '--env') and i + 1 < len(args):
            k, _, v = args[i + 1].partition('=')
            env[k] = v; i += 1
        elif t in ('-v', '--volume') and i + 1 < len(args):
            vols.append(args[i + 1]); i += 1
        elif t == '--network' and i + 1 < len(args):
            net = args[i + 1]; i += 1
        elif not t.startswith('-'):
            image = t  # last bare token wins
        i += 1
    if image is None:
        return _emit(st, '"docker run" requires at least 1 argument.', exit_code=1)
    repo, tag = _norm_image(image)
    if repo == 'hello-world' or image == 'hello-world':
        if not _find_image(st, 'hello-world', 'latest'):
            st['images'].append({'repository': 'hello-world', 'tag': 'latest',
                                 'id': _hid('image:hello-world:latest'), 'size': '20.3kB', 'created': '2 weeks ago'})
            st['pulled'] = True
        hello = ('\nHello from Docker!\nThis message shows that your installation appears to be working correctly.\n'
                 '\nTo generate this message, Docker took the following steps:\n'
                 ' 1. The Docker client contacted the Docker daemon.\n'
                 ' 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.\n'
                 ' 3. The Docker daemon created a new container from that image.\n'
                 ' 4. The Docker daemon streamed that output to the Docker client, which sent it to your terminal.\n')
        return _emit(st, hello.strip())
    ok, msg = _ensure_pulled(st, repo, tag)
    if not ok:
        return _emit(st, f"Unable to find image '{repo}:{tag}' locally\n{msg}", exit_code=1)
    if net and net not in st['networks']:
        return _emit(st, f'Error response from daemon: network {net} not found', exit_code=1)
    name = name or f'{repo}-{len(st["containers"]) + 1}'
    if name in st['containers']:
        return _emit(st, f'docker: Error response from daemon: Conflict. The container name "/{name}" is already in use.', exit_code=1)
    for hp in ports:
        for c in st['containers'].values():
            if c['status'] == 'running' and hp in c['ports']:
                return _emit(st, f'docker: Error response from daemon: Bind for 0.0.0.0:{hp} failed: port is already allocated.', exit_code=1)
    vol_names = []
    for v in vols:
        vn, _, _mp = v.partition(':')
        vol_names.append(vn)
        if vn not in st['volumes']:
            st['volumes'].append(vn)  # named volumes are auto-created on first use
    cid = _hid(f'container:{name}')
    nets = [net] if net else ['bridge']
    st['containers'][name] = {'id': cid, 'image': f'{repo}:{tag}', 'status': 'running',
                              'ports': ports, 'env': env, 'volumes': vol_names, 'networks': nets,
                              'ip': _alloc_ip(st, nets[0])}
    pull_note = f"Unable to find image '{repo}:{tag}' locally\n{tag}: Pulling from library/{repo}\nStatus: Downloaded newer image for {repo}:{tag}\n" if 'Downloaded newer' in msg else ''
    if detach:
        return _emit(st, pull_note + cid)
    return _emit(st, pull_note + f'[{name}] running in the foreground (simulated - use -d to detach)')


def _stop_start_rm(st, action: str, args) -> CommandResult:
    force = '-f' in args or '--force' in args
    names = [a for a in args if not a.startswith('-')]
    if not names:
        return _emit(st, f'"docker {action}" requires at least 1 argument.', exit_code=1)
    out = []
    failed = False
    for name in names:
        c = st['containers'].get(name)
        if not c:
            out.append(f'Error: No such container: {name}')
            failed = True
            continue
        if action == 'stop':
            c['status'] = 'exited'
            out.append(name)
        elif action == 'start':
            c['status'] = 'running'
            out.append(name)
        elif action == 'rm':
            if c['status'] == 'running' and not force:
                out.append(f'Error response from daemon: cannot remove container "{name}": '
                           f'container is running: stop the container before removing or force remove')
                failed = True
            else:
                del st['containers'][name]
                out.append(name)
    return _emit(st, '\n'.join(out), exit_code=1 if failed else 0)


def _exec(st, args) -> CommandResult:
    args = [a for a in args if a not in ('-it', '-i', '-t')]
    if len(args) < 2:
        return _emit(st, '"docker exec" requires a container name and a command.', exit_code=1)
    name, cmd = args[0], args[1:]
    c = st['containers'].get(name)
    if not c:
        return _emit(st, f'Error: No such container: {name}', exit_code=1)
    if c['status'] != 'running':
        return _emit(st, f'Error response from daemon: Container {name} is not running', exit_code=1)
    st['exec_ok'] = True
    joined = ' '.join(cmd)
    # postgres data story
    if c['image'].startswith('postgres') and cmd[:2] == ['psql', '-U'] or (c['image'].startswith('postgres') and 'psql' in cmd and '-c' in cmd):
        try:
            sql = cmd[cmd.index('-c') + 1]
        except (ValueError, IndexError):
            sql = ''
        return _psql(st, name, c, sql)
    if cmd[0] == 'ping':
        target = cmd[-1]
        return _ping(st, name, c, target)
    if cmd[:2] == ['cat', '/etc/hostname']:
        return _emit(st, c['id'])
    if cmd == ['env'] or (cmd[0] == 'env' and len(cmd) == 1):
        lines = [f'{k}={v}' for k, v in c['env'].items()] or ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin']
        return _emit(st, '\n'.join(lines))
    if cmd[:2] == ['ls', '/app'] or cmd == ['ls']:
        return _emit(st, 'package.json\nserver.js\nnode_modules')
    return _emit(st, f'OCI runtime exec failed: exec: "{cmd[0]}": executable file not found in $PATH', exit_code=1)


def _psql(st, name, c, sql: str) -> CommandResult:
    vol = c['volumes'][0] if c['volumes'] else None
    key = vol or f'__ephemeral__{name}'
    rows = st['volume_data'].setdefault(key, [])
    up = sql.strip().upper()
    if up.startswith('INSERT'):
        # INSERT INTO users(name) VALUES ('ada') — case-insensitive, tolerant of spacing
        m = re.search(r"\(\s*'([^']+)'\s*\)", sql)
        val = m.group(1) if m else ''
        if val:
            rows.append(val)
        st['pg_writer'] = name
        note = '' if vol else '\nWARNING: no volume mounted - this data dies with the container.'
        return _emit(st, f'INSERT 0 1{note}')
    if up.startswith('SELECT'):
        if not rows:
            return _emit(st, ' name \n------\n(0 rows)')
        body = '\n'.join(f' {r}' for r in rows)
        if st['pg_writer'] and st['pg_writer'] != name and vol:
            st['data_survived'] = True
        return _emit(st, f' name \n------\n{body}\n({len(rows)} row{"s" if len(rows) != 1 else ""})')
    return _emit(st, f'psql: unsupported statement in simulation (try INSERT or SELECT)', exit_code=1)


def _ping(st, name, c, target: str) -> CommandResult:
    peer = st['containers'].get(target)
    if not peer:
        return _emit(st, f'ping: bad address \'{target}\'', exit_code=1)
    shared = [n for n in c['networks'] if n in peer['networks'] and n not in ('bridge', 'host', 'none')]
    if peer['status'] != 'running':
        return _emit(st, f'ping: {target}: Host is down', exit_code=1)
    if not shared:
        # Default bridge has no embedded DNS: names do not resolve, like real Docker.
        return _emit(st, f'ping: bad address \'{target}\' '
                         f'(containers on the default bridge cannot resolve each other by name - '
                         f'use a custom network)', exit_code=1)
    st['ping_ok'] = True
    ip = peer['ip']
    return _emit(st, f'PING {target} ({ip}): 56 data bytes\n'
                     f'64 bytes from {ip}: seq=0 ttl=64 time=0.082 ms\n'
                     f'64 bytes from {ip}: seq=1 ttl=64 time=0.071 ms\n\n'
                     f'--- {target} ping statistics ---\n2 packets transmitted, 2 packets received, 0% packet loss')


def _logs(st, name) -> CommandResult:
    c = st['containers'].get(name)
    if not c:
        return _emit(st, f'Error: No such container: {name}', exit_code=1)
    st['logs_seen'] = True
    img = c['image']
    if img.startswith('nginx'):
        out = ('/docker-entrypoint.sh: Configuration complete; ready for start up\n'
               '10.0.0.2 - - [09/Oct/2026:14:01:12 +0000] "GET / HTTP/1.1" 200 615 "-" "curl/8.4.0"\n'
               '10.0.0.2 - - [09/Oct/2026:14:01:44 +0000] "GET /health HTTP/1.1" 200 2 "-" "curl/8.4.0"')
    elif img.startswith('postgres'):
        out = ('PostgreSQL Database directory appears to contain a database; Skipping initialization\n'
               'LOG:  database system is ready to accept connections\n'
               'LOG:  autovacuum launcher started')
    elif img.startswith('redis'):
        out = ('1:C 09 Oct 2026 14:00:01.123 * Ready to accept connections tcp')
    elif 'hello-lab' in img:
        out = ('> hello-lab@1.0.0 start\n> node server.js\nlistening on port 3000')
    else:
        out = f'{name}: 2026-10-09T14:00:00Z INFO service started'
    return _emit(st, out)


def _inspect(st, target) -> CommandResult:
    c = st['containers'].get(target)
    if c:
        mounts = ', '.join(f'{{ "Name": "{v}", "Destination": "/data" }}' for v in c['volumes'])
        ports = ', '.join(f'"{cp}/tcp": [{{ "HostIp": "0.0.0.0", "HostPort": "{h}" }}]' for h, cp in c['ports'].items())
        out = ('[\n  {\n'
               f'    "Id": "{c["id"]}",\n    "Name": "/{target}",\n'
               f'    "Image": "{c["image"]}",\n'
               f'    "State": {{ "Status": "{c["status"]}", "Running": {str(c["status"] == "running").lower()} }},\n'
               f'    "NetworkSettings": {{ "IPAddress": "{c["ip"]}", "Ports": {{ {ports} }} }},\n'
               f'    "Mounts": [ {mounts} ]\n  }}\n]')
        return _emit(st, out)
    if target in st['volumes']:
        return _emit(st, f'[\n  {{ "Name": "{target}", "Driver": "local", '
                         f'"Mountpoint": "/var/lib/docker/volumes/{target}/_data" }}\n]')
    if target in st['networks']:
        n = st['networks'][target]
        attached = {name: cc for name, cc in st['containers'].items() if target in cc['networks']}
        cont = ', '.join(f'"{cc["id"]}": {{ "Name": "{nm}" }}' for nm, cc in attached.items())
        return _emit(st, f'[\n  {{ "Name": "{target}", "Driver": "{n["driver"]}", "Scope": "local",\n'
                         f'    "IPAM": {{ "Config": [{{ "Subnet": "{n["subnet"]}" }}] }},\n'
                         f'    "Containers": {{ {cont} }} }}\n]')
    return _emit(st, f'Error: No such object: {target}', exit_code=1)


def _build(st, args) -> CommandResult:
    tag = None
    i = 0
    while i < len(args):
        if args[i] in ('-t', '--tag') and i + 1 < len(args):
            tag = args[i + 1]; i += 2; continue
        i += 1
    if not tag:
        return _emit(st, 'ERROR: "docker build" requires a tag in this lab: docker build -t <name>:<tag> .', exit_code=1)
    repo, t = _norm_image(tag)
    ref = _img_key(repo, t)
    if _find_image(st, repo, t):
        return _emit(st, f'naming to docker.io/library/{ref} (image already exists locally)')
    st['images'].append({'repository': repo, 'tag': t, 'id': _hid(f'image:{repo}:{t}'),
                         'size': '186MB', 'created': '1 minute ago'})
    st['built'].append(ref)
    out = ('[+] Building 12.4s (9/9) FINISHED\n'
           ' => [internal] load build definition from Dockerfile                            0.0s\n'
           ' => [internal] load metadata for docker.io/library/node:20-alpine             2.1s\n'
           ' => [1/5] FROM docker.io/library/node:20-alpine                               3.4s\n'
           ' => [2/5] WORKDIR /app                                                        0.2s\n'
           ' => [3/5] COPY package.json .                                                 0.1s\n'
           ' => [4/5] RUN npm install --production                                        5.8s\n'
           ' => [5/5] COPY . .                                                            0.3s\n'
           ' => exporting to image                                                        0.4s\n'
           f' => => naming to docker.io/library/{ref}                                     0.0s')
    return _emit(st, out)


def _volume(st, args) -> CommandResult:
    sub = args[0] if args else ''
    if sub == 'ls':
        rows = ['DRIVER    VOLUME NAME'] + [f'local     {v}' for v in st['volumes']]
        return _emit(st, '\n'.join(rows))
    if sub == 'create' and len(args) > 1:
        v = args[1]
        if v not in st['volumes']:
            st['volumes'].append(v)
        return _emit(st, v)
    if sub == 'inspect' and len(args) > 1:
        return _inspect(st, args[1])
    if sub == 'rm' and len(args) > 1:
        v = args[1]
        if v not in st['volumes']:
            return _emit(st, f'Error: No such volume: {v}', exit_code=1)
        if any(v in c['volumes'] for c in st['containers'].values()):
            return _emit(st, f'Error response from daemon: remove {v}: volume is in use', exit_code=1)
        st['volumes'].remove(v)
        return _emit(st, v)
    return _emit(st, 'Usage: docker volume ls|create|inspect|rm', exit_code=1)


def _network(st, args) -> CommandResult:
    sub = args[0] if args else ''
    if sub == 'ls':
        rows = ['NETWORK ID     NAME        DRIVER    SCOPE']
        for n, meta in st['networks'].items():
            rows.append(f'{_hid(f"net:{n}", 12):<14} {n:<11} {meta["driver"]:<9} local')
        return _emit(st, '\n'.join(rows))
    if sub == 'create' and len(args) > 1:
        n = args[1]
        if n not in st['networks']:
            idx = len([x for x in st['networks'] if x not in ('bridge', 'host', 'none')])
            st['networks'][n] = {'driver': 'bridge', 'subnet': f'172.{18 + idx}.0.0/16'}
        return _emit(st, _hid(f'net:{n}', 64))
    if sub == 'inspect' and len(args) > 1:
        return _inspect(st, args[1])
    if sub == 'rm' and len(args) > 1:
        n = args[1]
        if n not in st['networks']:
            return _emit(st, f'Error: No such network: {n}', exit_code=1)
        if n in ('bridge', 'host', 'none'):
            return _emit(st, f'Error response from daemon: cannot remove predefined network {n}', exit_code=1)
        if any(n in c['networks'] for c in st['containers'].values()):
            return _emit(st, f'Error response from daemon: has active endpoints', exit_code=1)
        del st['networks'][n]
        return _emit(st, n)
    if sub == 'connect' and len(args) > 2:
        n, cname = args[1], args[2]
        c = st['containers'].get(cname)
        if n not in st['networks']:
            return _emit(st, f'Error: No such network: {n}', exit_code=1)
        if not c:
            return _emit(st, f'Error: No such container: {cname}', exit_code=1)
        if n not in c['networks']:
            c['networks'].append(n)
            c['ip'] = _alloc_ip(st, n)
        return _emit(st, n)
    if sub == 'disconnect' and len(args) > 2:
        n, cname = args[1], args[2]
        c = st['containers'].get(cname)
        if c and n in c['networks'] and len(c['networks']) > 1:
            c['networks'].remove(n)
        return _emit(st, n)
    return _emit(st, 'Usage: docker network ls|create|inspect|rm|connect|disconnect', exit_code=1)


def _compose(st, args) -> CommandResult:
    sub = args[0] if args else ''
    if sub == 'up':
        if 'fundamentals_default' not in st['networks']:
            st['networks']['fundamentals_default'] = {'driver': 'bridge', 'subnet': '172.21.0.0/16'}
        if 'pgdata' not in st['volumes']:
            st['volumes'].append('pgdata')
        for svc in COMPOSE_SERVICES:
            repo, tag = _norm_image(svc['image'])
            _ensure_pulled(st, repo, tag)
            cname = f'fundamentals-{svc["name"]}-1'
            if cname not in st['containers']:
                st['containers'][cname] = {
                    'id': _hid(f'container:{cname}'), 'image': f'{repo}:{tag}', 'status': 'running',
                    'ports': svc.get('ports', {}), 'env': svc.get('env', {}),
                    'volumes': svc.get('volumes', []), 'networks': ['fundamentals_default'],
                    'ip': _alloc_ip(st, 'fundamentals_default')}
            else:
                st['containers'][cname]['status'] = 'running'
        st['compose_up'] = True
        return _emit(st, '[+] Running 3/3\n' + '\n'.join(f' ⠿ Container {c}  Started' for c in
                    [f'fundamentals-{s["name"]}-1' for s in COMPOSE_SERVICES]))
    if sub == 'ps':
        rows = ['NAME                    IMAGE               STATUS']
        for svc in COMPOSE_SERVICES:
            cname = f'fundamentals-{svc["name"]}-1'
            c = st['containers'].get(cname)
            status = 'running' if (c and c['status'] == 'running' and st['compose_up']) else 'exited'
            rows.append(f'{cname:<23} {svc["image"]:<19} {status}')
        return _emit(st, '\n'.join(rows))
    if sub == 'logs':
        return _emit(st, 'fundamentals-web-1  | Configuration complete; ready for start up\n'
                         'fundamentals-api-1  | Serving HTTP on 0.0.0.0 port 8000\n'
                         'fundamentals-db-1   | LOG:  database system is ready to accept connections')
    if sub == 'down':
        st['compose_up'] = False
        for svc in COMPOSE_SERVICES:
            cname = f'fundamentals-{svc["name"]}-1'
            if cname in st['containers']:
                st['containers'][cname]['status'] = 'exited'
        return _emit(st, '[+] Running 3/3\n ⠿ Container fundamentals-db-1   Removed\n'
                         ' ⠿ Container fundamentals-api-1  Removed\n ⠿ Container fundamentals-web-1  Removed\n'
                         ' ⠿ Network fundamentals_default  Removed')
    return _emit(st, 'Usage: docker compose up -d | ps | logs | down', exit_code=1)


def _docker(st, args) -> CommandResult:
    if not args:
        return _emit(st, 'Usage: docker <images|pull|run|ps|stop|start|rm|exec|logs|inspect|build|volume|network|compose|info|version>', exit_code=1)
    sub = args[0].lower()
    rest = args[1:]
    if sub in ('--version', 'version'):
        return _emit(st, _docker_version())
    if sub == 'info':
        return _emit(st, _docker_info(st))
    if sub == 'images':
        return _emit(st, _images(st))
    if sub == 'pull' and rest:
        repo, tag = _norm_image(rest[0])
        ok, msg = _ensure_pulled(st, repo, tag)
        return _emit(st, msg, exit_code=0 if ok else 1)
    if sub == 'pull':
        return _emit(st, '"docker pull" requires exactly 1 argument.', exit_code=1)
    if sub == 'rmi' and rest:
        repo, tag = _norm_image(rest[0])
        im = _find_image(st, repo, tag)
        if not im:
            return _emit(st, f'Error: No such image: {rest[0]}', exit_code=1)
        if any(c['image'] == f'{repo}:{tag}' for c in st['containers'].values()):
            return _emit(st, f'Error response from daemon: conflict: unable to remove repository reference '
                             f'"{repo}:{tag}" (must force) - container is using its referenced image', exit_code=1)
        st['images'].remove(im)
        return _emit(st, f'Untagged: {repo}:{tag}\nDeleted: sha256:{im["id"]}')
    if sub == 'run':
        return _run(st, rest)
    if sub == 'ps':
        return _emit(st, _ps(st, all_='-a' in rest or '--all' in rest))
    if sub in ('stop', 'start', 'rm'):
        return _stop_start_rm(st, sub, rest)
    if sub == 'exec':
        return _exec(st, rest)
    if sub == 'logs' and rest:
        return _logs(st, rest[0])
    if sub == 'inspect' and rest:
        return _inspect(st, rest[0])
    if sub == 'build':
        return _build(st, rest)
    if sub == 'volume':
        return _volume(st, rest)
    if sub == 'network':
        return _network(st, rest)
    if sub == 'compose':
        return _compose(st, rest)
    return _emit(st, f'docker: \'{sub}\' is not a docker command in this simulation.', exit_code=1)


def _curl(st, args) -> CommandResult:
    target = next((a for a in args if a.startswith('http')), '')
    port = None
    if ':' in target:
        port = target.rsplit(':', 1)[1].rstrip('/')
    hit = None
    for c in st['containers'].values():
        if c['status'] == 'running' and port in c['ports']:
            hit = c
            break
    if hit:
        st['port_reached'] = True
        if hit['image'].startswith('nginx'):
            return _emit(st, NGINX_PAGE)
        if 'hello-lab' in hit['image']:
            return _emit(st, '{"message":"Hello from your custom image!"}')
        if hit['image'].startswith('python'):
            return _emit(st, '<html><body><h1>Directory listing for /</h1></body></html>')
        return _emit(st, f'<html><body>OK from {hit["image"]}</body></html>')
    return _emit(st, f'curl: (7) Failed to connect to localhost port {port}: Connection refused', exit_code=7)


def _help() -> str:
    return (
        'Simulated Docker host - safe: nothing is really executed.\n'
        '\n'
        '  docker info | version        engine status\n'
        '  docker images                list local images\n'
        '  docker pull <image>          download an image (nginx, postgres, redis, hello-world, ubuntu, python, alpine)\n'
        '  docker rmi <image>           remove an image\n'
        '  docker run -d --name NAME -p HOST:CTR -e KEY=VAL -v VOL:/path --network NET <image>\n'
        '  docker ps [-a]               list containers\n'
        '  docker stop|start|rm <name>  container lifecycle\n'
        '  docker exec <name> <cmd>     run a command inside a container (try: ping, cat /etc/hostname)\n'
        '  docker logs <name>           container logs\n'
        '  docker inspect <name>        low-level details (containers, volumes, networks)\n'
        '  docker build -t <name:tag> . build an image from the Dockerfile\n'
        '  docker volume ls|create|inspect|rm\n'
        '  docker network ls|create|inspect|connect|disconnect|rm\n'
        '  docker compose up -d|ps|logs|down   the stack in compose.yml\n'
        '\n'
        '  cat Dockerfile | cat compose.yml | ls     workspace files\n'
        '  curl http://localhost:PORT   reach a published port\n'
        '  systemctl status docker      engine service status\n'
        '  help | clear'
    )


def run(lab, command: str, findings: dict[str, Any]) -> CommandResult:
    st = copy.deepcopy(findings.get('_docker_cli')) if findings.get('_docker_cli') else _fresh()
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
    if cmd == 'sudo' and args:
        parts = args; cmd = parts[0].lower(); args = parts[1:]
    if cmd == 'ls':
        return _emit(st, 'Dockerfile  compose.yml')
    if cmd == 'cat' and args:
        if args[0] == 'Dockerfile':
            return _emit(st, DOCKERFILE)
        if args[0] in ('compose.yml', 'compose.yaml'):
            return _emit(st, COMPOSE_YML)
        return _emit(st, f'cat: {args[0]}: No such file or directory', exit_code=1)
    if cmd == 'systemctl':
        if args[:2] == ['status', 'docker']:
            st['verified'] = True
            return _emit(st, '● docker.service - Docker Application Container Engine\n'
                             '   Loaded: loaded (/lib/systemd/system/docker.service; enabled)\n'
                             '   Active: active (running) since Thu 2026-10-09 13:58:01 UTC')
        return _emit(st, 'Usage: systemctl status docker', exit_code=1)
    if cmd == 'curl':
        return _curl(st, args)
    if cmd == 'docker':
        return _docker(st, args)
    return _emit(st, f'{cmd}: command not found (this lab is a Docker host - try `docker`, `cat Dockerfile`, or `help`)', exit_code=127)
