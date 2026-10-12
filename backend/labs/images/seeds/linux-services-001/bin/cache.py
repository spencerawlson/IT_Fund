#!/usr/bin/env python3
"""Cache service for the services lab. Requires --config pointing at a real file."""
import argparse
import os
import sys
import time

p = argparse.ArgumentParser()
p.add_argument("--config", required=True)
args = p.parse_args()
if not os.path.isfile(args.config):
    print(f"cache: FATAL: config file not found: {args.config}", file=sys.stderr)
    sys.exit(1)
print(f"cache: loaded config {args.config}", flush=True)
while True:
    time.sleep(30)
