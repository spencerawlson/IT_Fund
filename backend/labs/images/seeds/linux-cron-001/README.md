# Cron & automation

The system cron daemon needs root, so this lab uses supercronic — same five-field
crontab format, runs as your user.

## Jobs to schedule (in ~/cron/jobs.cron)

1. Heartbeat every minute:
     * * * * * /home/student/cron/heartbeat.sh >> /home/student/cron/out/heartbeat.log 2>&1
2. Disk report every 5 minutes:
     */5 * * * * /home/student/cron/report.sh >> /home/student/cron/out/report.log 2>&1

## Workflow

1. Write both lines into ~/cron/jobs.cron (absolute paths — cron has a minimal PATH).
2. Start the scheduler in the background:
     supercronic ~/cron/jobs.cron > ~/cron/supercronic.log 2>&1 &
3. Verify: `ps aux | grep supercronic`, wait ~70s, then
   `cat ~/cron/out/heartbeat.log` — cron is verified by its OUTPUT, not by faith.

Gotchas to notice: cron lines need the trailing command on the SAME line, `%` is
special in classic cron (avoid it), and stdout goes nowhere unless you redirect it.
