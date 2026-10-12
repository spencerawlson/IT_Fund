# Logs & Troubleshooting: journald, dmesg and the First Sixty Seconds — Avatar Tutor Script

**Lesson ID:** lx-logs
**Track:** Linux Administration
**Estimated runtime:** ~5 minutes (~742 words)

## Spoken script

**[HOOK — 0:00]**
When something breaks, the system already wrote down why. Every crash, every
failed login, every out-of-memory kill leaves a timestamped record. Your job
is not to guess — it is to know where to look. Logs are the flight recorders
of Linux: boot messages, auth events, service output, kernel warnings, all
waiting. This lesson maps the evidence and teaches the first-sixty-seconds
drill that separates triage from panic.

**[WHY IT MATTERS — ~0:25]**
Incidents are won or lost in the first minutes. The admin who runs four
commands and knows whether it is disk, memory, CPU, or the network looks like
a wizard — but it is just a checklist, and this lesson is the checklist. The
log locations here are also permanent infrastructure in your head: you will
reach for them in every future incident, on every system, for years.

**[SECTION — Where the evidence lives — ~0:50]**
Two logging worlds coexist. Traditional services write to /var/log/ — syslog,
auth.log, per-service directories, plain text files. systemd services log to
the journal instead, queried with journalctl. Check both; the answer is
sometimes in the one you did not check first.

To watch live, tail minus f follows any file as it grows — and capital-F
survives rotation, re-opening the file when logrotate replaces it. For the
kernel specifically, dmesg pipe tail shows recent kernel messages: hardware
events, driver issues, and the dreaded OOM killer — the out-of-memory killer
that sacrifices processes when RAM runs out. When a process vanishes with no
goodbye, dmesg is where you find the murder weapon.

But raw logs are firehoses, so filter ruthlessly. journalctl minus u nginx
minus-minus since "30 min ago" minus p err: one service, last half hour,
errors and above. grep "Failed password" /var/log/auth.log pipe tail: the
latest SSH failures. During an incident you want the last error before the
failure, not the whole file. Precision beats volume — ten relevant lines beat
ten thousand.

**[SECTION — The first sixty seconds — ~2:30]**
The drill. First, uptime: it gives the load averages over 1, 5, and 15
minutes. Sustained load above your CPU core count means processes are queuing
— the system has more work than processors. Then disk: df minus h checks
filesystem space, du minus sh star finds which directory is the hog. And the
classic gotcha — if df says full but du disagrees, check inodes with df minus
i. Millions of tiny files exhaust inodes while space remains, and "no space
left on device" lies about which resource is gone.

Then CPU and memory: top — capital P sorts by CPU, capital M by memory — or
htop for the friendlier view, finds the hungry process. ps aux pipe grep app
inspects one specific service. ss minus tulpn pipe grep :8080 confirms what
actually listens on the port, because "the config says it should listen" and
"it listens" are different facts. And when a process fails mysteriously,
strace minus p with the PID traces its system calls — every file it opens,
every network call, every failure, live. It is the X-ray: invasive, verbose,
and definitive.

The lesson's disk-full drill is the checklist in order: df minus h — which
filesystem is full? du minus sh /var/star pipe sort — biggest directories?
df minus i — out of inodes instead? lsof pipe grep deleted — space held by
deleted-but-open files, the ghost allocation that survives rm. Filesystem,
directories, inodes, deleted handles. Run it in order and disk-full stops
being scary.

**[COMMON MISTAKES — ~4:20]**
Three traps. One: reading the whole log instead of filtering. You do not have
time during an incident, and the answer is in the last errors, not the first
thousand lines. Two: trusting "no space left" at face value — check inodes
and deleted-but-open files before you start deleting things in a panic. Three:
assuming the config matches reality. ss shows what listens; ps shows what
runs. Verify, do not assume.

**[RECAP — ~4:50]**
Evidence lives in /var/log/ for traditional services and the journal for
systemd — check both. tail minus f follows live, dmesg reveals the kernel
including the OOM killer, and filters beat firehoses: bound the time, pick
the service, keep the errors. The sixty-second drill: uptime for load versus
core count, df minus h and du for space, df minus i for inodes, top or htop
for the hungry process, ps for the specific one, ss for what actually
listens, and strace for the X-ray. Disk-full means filesystem, directories,
inodes, then deleted handles — in that order. Logs are the flight recorder.
Learn where they live and incidents become investigations, not panics.

## On-screen visuals

- HOOK: system crash with timestamped log entries appearing — the flight recorder metaphor.
- WHY IT MATTERS: incident timeline — four commands in sixty seconds vs twenty minutes of guessing.
- Where the evidence lives: /var/log/ vs journal split; tail -F surviving rotation; dmesg OOM-killer entry highlighted; filter composition demo (service + time + severity).
- The first sixty seconds: uptime load vs cores gauge; df/du/du -i decision tree; top/htop process view; ss listening check; strace system-call trace; the disk-full drill as an ordered checklist.
- RECAP: cheat-sheet terms as a clean summary card.
