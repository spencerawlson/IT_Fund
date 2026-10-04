#!/bin/bash
# road-to-cissp security-tools / portblast-lab entrypoint.
#
# Starts the lab's intentionally-vulnerable target services on unprivileged
# ports (the hardened DockerLabProvider drops the capabilities needed to bind
# privileged ports, so the classic port numbers are remapped):
#   2222/tcp  OpenSSH  (real daemon, real banner)
#   8080/tcp  nginx    (real Server header)
#   8000/tcp  python http.server (second HTTP service, different banner)
#
# Scan 127.0.0.1 (this host). nmap runs unprivileged here: use -Pn and TCP
# connect scans (-sT); ping and SYN scans need raw sockets the provider
# does not grant. Then hands over to the provider's command
# (DockerLabProvider always starts lab containers with `sleep infinity`).
set -e
# sshd runs as the unprivileged lab user (it only needs root to setuid into
# other users, which never happens here). Host keys live under the user's home
# because /etc/ssh is not readable by them; the port is unprivileged for the
# same reason (CAP_NET_BIND_SERVICE is dropped by the provider).
/usr/sbin/sshd -p 2222 \
    -o HostKey=/home/student/.ssh/host/ssh_host_ed25519_key \
    -o HostKey=/home/student/.ssh/host/ssh_host_rsa_key \
    -o PidFile=/home/student/sshd.pid \
    -E /home/student/sshd.log
nginx -c /home/student/nginx.conf
nohup python3 -m http.server 8000 --bind 127.0.0.1 \
    --directory /home/student/www >/home/student/http8000.log 2>&1 &
exec "$@"
