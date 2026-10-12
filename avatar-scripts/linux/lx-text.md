# Text Processing Pipelines: grep, Pipes and awk — Avatar Tutor Script

**Lesson ID:** lx-text
**Track:** Linux Administration
**Estimated runtime:** ~5 minutes (~742 words)

## Spoken script

**[HOOK — 0:00]**
On Linux, everything interesting is text. Logs, configs, command output —
kilometres of it. The operators who find answers fastest are not the ones who
read fastest. They are the ones fluent in pipelines: chaining small,
single-purpose tools with pipes and redirection until the data confesses.
This is the exact skill SOC analysts use on logs every single day, and it is
pure leverage.

**[WHY IT MATTERS — ~0:25]**
You will use these tools in incidents, in audits, in every lab from here on.
"Which IPs are hammering SSH?" is one pipeline. "What changed in the config?"
is two commands. The philosophy is Unix itself: small tools, each doing one
thing, composed into anything. Learn the dozen tools in this lesson and you
can interrogate any text the system produces.

**[SECTION — Pipes and redirection — ~0:50]**
The pipe is the whole idea in one character. The vertical bar connects one
command's stdout to the next command's stdin: dmesg pipe grep minus i usb
searches kernel messages for USB events. Each tool does its one job, and the
pipe carries the data between them. When debugging a long pipeline, read it
right to left — each stage transforms the stream, and the failure is usually
one stage lying about its output.

Redirection handles files. Greater-than overwrites a file, double greater-than
appends — both create the file if it is missing. And here is the detail that
unlocks everything: every process has three streams. Stdin is 0, stdout is 1,
stderr is 2. So 2 greater-than captures errors separately, and command greater
than /dev/null 2 greater than ampersand 1 silences everything — stdout to the
void, stderr merged into stdout's void. You will see that incantation in
every cron job ever written.

The lesson's signature pipeline deserves a slow read: grep "Failed"
/var/log/auth.log, pipe, cut with delimiter space field 11, pipe, sort, pipe,
uniq minus c, pipe, sort minus rn. It extracts attacker IPs from SSH logs,
counts them, and ranks them. Filter, extract, sort, count, rank — five stages,
one line, and it is the core SOC log-triage pattern. When it breaks, read
right to left and check each stage's output.

**[SECTION — The text toolkit — ~2:30]**
Now the tools themselves. grep searches: minus i for case-insensitive, minus r
to recurse through directories, minus c to count matching lines instead of
printing them. cut slices fields: cut minus d colon minus f1 takes the first
colon-delimited field — perfect for /etc/passwd. sort orders lines, and uniq
minus c counts duplicates — but uniq needs sorted input, which is why you
always see sort pipe uniq. wc minus l counts lines. head and tail preview the
ends of a file, and tail minus f follows a live log as it grows — the
incident-response essential.

For the jobs the small tools cannot do, there are sed and awk. sed minus i
's/foo/bar/g' file edits in place: s means substitute, g means global, minus i
means rewrite the file. The lesson's SSH example is the real-world pattern —
sed rewrites the PasswordAuthentication line whether or not it was commented,
then grep verifies the result. And awk is the field processor: awk minus F
colon '{print $1}' /etc/passwd prints the first field of each line. Dollar-zero
is the whole line, dollar-one and dollar-two are fields, minus F sets the
delimiter. Once awk clicks, half of log analysis becomes one-liners.

**[COMMON MISTAKES — ~4:20]**
Three traps. One: single greater-than when you meant double. Overwriting a log
you wanted to append to is the kind of mistake you make exactly once — and
backups exist because of it. Two: uniq without sort. Unsorted input gives you
counts of consecutive duplicates only, which quietly lies about totals. Three:
for line in dollar-paren cat file — it mangles whitespace and breaks on odd
filenames. The safe line-by-line reader is while IFS equals read minus r line,
which the bash lesson covers properly.

**[RECAP — ~4:50]**
The pipe chains tools, stdout to stdin, and you debug pipelines right to left.
Greater-than overwrites, double greater-than appends, 2 greater-than catches
errors, and the three streams are stdin 0, stdout 1, stderr 2. grep finds, cut
slices fields, sort plus uniq minus c counts and ranks — with sort always
first — wc minus l counts lines, and tail minus f follows live logs. sed edits
in place with s for substitute and g for global; awk prints fields with dollar
numbers and minus F for the delimiter. Small tools, composed endlessly. That
is the pipeline toolkit — learn it and the system's text starts talking to
you.

## On-screen visuals

- HOOK: log file kilometres long; pipeline stages lighting up as data flows through.
- WHY IT MATTERS: SOC analyst triage — "which IPs are hammering SSH?" answered in one pipeline.
- Pipes and redirection: pipe connecting stdout to stdin between tool icons; the three streams (0, 1, 2) diagram; the auth.log attacker-IP pipeline built stage by stage with intermediate output shown.
- The text toolkit: grep flags demo; cut/sort/uniq/wc chain; tail -f live log; sed in-place edit before/after; awk field extraction on /etc/passwd.
- RECAP: cheat-sheet terms as a clean summary card.
