"""Helper utilities (INTENTIONALLY VULNERABLE - training only)."""
import subprocess

DB_PASSWORD = "P@ssw0rd123!"


def ping(host):
    subprocess.call("ping -c1 " + host, shell=True)


def status():
    return "ok"
