#!/bin/bash
# Disk report job for the cron lab.
echo "disk-report $(date -u +%Y-%m-%dT%H:%M:%SZ) $(df -h /home/student | awk 'NR==2{print $5}')"
