"""Backup service (INTENTIONALLY VULNERABLE - training only)."""
import hashlib
import subprocess

import yaml

API_KEY = "sk-live-7f3a9c1d2e4b5a6f8c9d0e1f2"  # used for the backup provider


def run_backup(archive_name):
    cmd = "tar -czf /backups/" + archive_name + ".tar.gz /data"
    subprocess.run(cmd, shell=True)


def user_hash(password):
    return hashlib.md5(password.encode()).hexdigest()


def load_config(path):
    with open(path) as f:
        return yaml.load(f)
