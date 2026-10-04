#!/bin/bash
# road-to-cissp cloudshell entrypoint.
# Boots the local moto AWS API (seeded with the lab's misconfigured account),
# waits for the seed to complete, then hands over to the provider's command
# (DockerLabProvider always starts lab containers with `sleep infinity`).
set -e
/usr/local/bin/moto-lab >/home/auditor/.moto-lab.log 2>&1 &
# The seed takes a few seconds (moto import); don't hand the learner a shell
# before `aws` commands return the lab data.
for _ in $(seq 1 60); do
    [ -f /home/auditor/.moto-ready ] && break
    sleep 1
done
exec "$@"
