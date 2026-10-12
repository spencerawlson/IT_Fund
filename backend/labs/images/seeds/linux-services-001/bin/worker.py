#!/usr/bin/env python3
"""Queue worker for the services lab. Requires QUEUE_NAME in the environment."""
import os
import sys
import time

queue = os.environ.get("QUEUE_NAME")
if not queue:
    print("worker: FATAL: required environment variable QUEUE_NAME is not set", file=sys.stderr)
    sys.exit(1)
print(f"worker: consuming queue '{queue}'", flush=True)
while True:
    time.sleep(30)
