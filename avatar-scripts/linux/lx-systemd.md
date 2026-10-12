# systemd & Services: systemctl, journalctl and Timers — Avatar Tutor Script

**Lesson ID:** lx-systemd
**Track:** Linux Administration
**Estimated runtime:** ~5 minutes (~703 words)

## Spoken script

**[HOOK — 0:00]**
systemd is PID 1 on virtually every modern Linux distribution. It is the first
process the kernel starts and the last one standing at shutdown. It boots the
system, supervises every service, and collects their logs. Whether you are
deploying an app or debugging why one will not start at 3am, two commands
matter most: systemctl and journalctl. This lesson is those two commands, used
properly.

**[WHY IT MATTERS — ~0:25]**
"The app is down" is the sentence that starts every ops career, and the triage
sequence in this lesson is the professional answer to it. Which units failed,
what does the service status say, what do the recent logs show — thirty
seconds, three commands, and you know whether it is the app, the config, or
the machine. Interviewers ask candidates to walk through exactly this.

**[SECTION — Services: now vs at boot — ~0:50]**
systemctl status nginx is the single most informative command in this lesson.
One output tells you everything: the active state — is it running right now —
whether it starts at boot, the recent log lines, and the main PID. When
something is wrong, start here; it answers four questions at once.

Now the distinction that trips up every beginner: start, stop, and restart act
now — this boot, this moment. Enable and disable control boot behaviour —
whether the service comes up after a reboot. A service can be running but not
enabled, which means your fix evaporates on the next reboot — the classic
"but it was working yesterday." systemctl enable minus-minus now nginx does
both in one move: start it now and enable it for boot. Learn that flag; it
prevents an entire category of embarrassment.

Custom unit files go in /etc/systemd/system/. The distro ships its own in
/lib/systemd/system — never edit those directly, because the next package
update will overwrite your changes. Override with drop-in files instead. And
after any edit, run systemctl daemon-reload so systemd re-reads the
definitions. Forget the reload and systemd keeps running the old config while
you stare at the new file wondering why nothing changed.

**[SECTION — Logs and scheduling — ~2:25]**
journalctl is the unified log reader for everything systemd supervises.
journalctl minus u nginx minus f follows one service's logs live — the minus f
is "follow," the log equivalent of tail minus f. Minus-minus since "1 hour
ago" bounds the window, and minus p err filters to errors and above, cutting
the noise when you need signal. These three flags compose: follow one
service's errors from the last hour, live.

And the first command in any "the app is down" drill: systemctl minus-minus
failed. It lists everything currently in a failed state, system-wide. Before
you theorise, look at what is actually broken.

Two more modern pieces. systemd timers are cron's successor: a .timer unit
triggers a .service unit on a schedule — but with journald logging and
dependency handling built in, so you get "did the backup run and what did it
say" for free instead of cron's silent mysteries. And the old SysV runlevels
are now targets: multi-user.target and graphical.target, switched with
systemctl isolate. Same idea — which state should the system be in — modern
vocabulary.

**[COMMON MISTAKES — ~4:00]**
Three traps. One: starting a service without enabling it, then losing it on
reboot — now versus at boot are different things, and minus-minus now covers
both. Two: editing unit files and forgetting daemon-reload. The file changed;
systemd did not notice. Three: editing the distro's unit files in /lib instead
of overriding from /etc. It works until the next update wipes it, and then it
fails mysteriously at the worst moment.

**[RECAP — ~4:30]**
systemd is PID 1: it boots the box, supervises services, and journals their
logs. systemctl status shows active state, boot behaviour, recent logs, and
the PID in one shot. Start acts now, enable acts at boot, and minus-minus now
does both. Your unit files live in /etc/systemd/system, the distro's live in
/lib — override, never edit — and daemon-reload after every change. journalctl
reads the logs: minus u for one service, minus f to follow, minus-minus since
to bound, minus p err for the signal. systemctl minus-minus failed opens every
outage drill. Timers replace cron with logging built in, and runlevels are now
targets. That is systemd — the init system that runs the modern Linux world.

## On-screen visuals

- HOOK: boot sequence with systemd as PID 1 spawning services; systemctl and journalctl badges.
- WHY IT MATTERS: "the app is down" triage — three commands, thirty seconds, answer found.
- Services: now vs at boot: systemctl status output annotated (active state, boot behaviour, logs, PID); now-vs-boot toggle; --now combining both; /etc vs /lib unit file locations; daemon-reload refresh.
- Logs and scheduling: journalctl flags composing (-u, -f, --since, -p err); systemctl --failed system-wide view; timer triggering service on schedule; runlevels-to-targets mapping.
- RECAP: cheat-sheet terms as a clean summary card.
