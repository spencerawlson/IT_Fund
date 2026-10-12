# Bash Scripting: Shebangs, Exit Codes and Safety Habits — Avatar Tutor Script

**Lesson ID:** lx-bash
**Track:** Linux Administration
**Estimated runtime:** ~6 minutes (~787 words)

## Spoken script

**[HOOK — 0:00]**
If you do it twice, script it. That is the operator's rule, and bash is how
you follow it. Backups, log analysis, provisioning, health checks — bash turns
your hard-won command-line knowledge into repeatable automation. It is also
the first language of incident response, the one you will reach for at 3am
when nothing else is installed and the pressure is on. Worth learning
properly, because a bad script does not just fail — it deletes the wrong
directory.

**[WHY IT MATTERS — ~0:25]**
Every senior admin has a directory of scripts that are basically their
experience, saved as text. This lesson is the anatomy of a trustworthy one:
the shebang, the safety line, quoting, exit codes, and the logic constructs.
The safety habits here are the difference between automation you trust and
automation you are afraid of. Exams test the syntax; incidents test the
habits.

**[SECTION — Anatomy of a trustworthy script — ~0:50]**
Every script starts with a shebang: hash-bang /usr/bin/env bash. It picks the
interpreter portably — env finds bash wherever it lives instead of hardcoding
a path that differs between systems. Then chmod plus x makes it executable,
and you run it as ./script.sh. Why the dot-slash? Because the current
directory is deliberately not in PATH — a security decision from the 1970s
that stops a malicious script named "ls" in some directory from hijacking
your commands.

Three variables run the show. Dollar-question-mark holds the last command's
exit code, where 0 means success and anything else means failure — the entire
language of "did it work." Dollar-at is all the arguments, dollar-hash is how
many. Then the safety line that belongs at the top of any script that
matters: set minus euo pipefail. Three promises: exit on any error, treat
unset variables as errors, and make pipelines fail when any stage fails —
not just the last one. Without pipefail, a pipeline that fails in the middle
reports success, and your error handling is fiction.

And the quoting rule, the single most violated rule in bash: quote every
expansion. "$file", never bare $file. Because a filename with a space becomes
two arguments unquoted, and then your script operates on two files that do
not exist instead of one that does. Quote everything, always, no exceptions.

**[SECTION — Logic: conditionals, loops, functions — ~2:30]**
Scripts need decisions and repetition. Test with square brackets: minus f for
files, minus d for directories, minus z for empty strings — if [ minus f
"$config" ] reads almost like English. For loops iterate globs: for f in
*.log; do ... done processes every log file. But the safe line-by-line file
reader is while IFS equals read minus r line; do ... done < file. Never for
line in dollar-paren cat file — it mangles whitespace and breaks on odd
filenames. This is one of those details that separates scripts that work on
your test data from scripts that work in production.

Functions group logic: backup() { ...; }. But bash functions do not return
values like other languages. A function "returns" an exit status via return N,
0 to 255 — success or failure, nothing more. Real data goes on stdout and gets
captured with result equals dollar-paren backup. return "text" does not do
what you hope; it is an error wearing a disguise. Remember the split: exit
status for did-it-work, stdout for the actual data.

The lesson's two examples are templates worth stealing. The nightly backup:
shebang, strict mode, quoted variables, date-stamped output — the skeleton of
reliable automation. The host checker: line-by-line reading, a conditional on
ping's exit code, clear output per host. Small, readable, safe. That is the
house style.

**[COMMON MISTAKES — ~4:20]**
Three traps. One: unquoted variables. It works in testing, then a space in a
filename — or worse, in a path built from user input — turns one argument
into many. Quote everything. Two: forgetting set minus euo pipefail, so the
script marches on after a failure and the damage compounds silently. Three:
using return to pass data out of a function. Return carries 0 to 255 for
status; data travels on stdout. Mix them up and you get mysterious numbers
where your text should be.

**[RECAP — ~4:50]**
The shebang picks the interpreter portably, chmod plus x makes it runnable,
and dot-slash runs it because the current directory is not in PATH — on
purpose. Dollar-question-mark is the exit code, dollar-at and dollar-hash are
the arguments. set minus euo pipefail is the safety line: fail on errors,
fail on unset variables, fail on pipeline failures. Quote every expansion —
"$file", never bare. Test with square brackets, loop globs with for, read
files with while read, and remember functions return a status via return N
while data goes on stdout. Two templates to steal: the strict-mode backup and
the per-host checker. That is bash you can trust at 3am.

## On-screen visuals

- HOOK: 3am incident — admin reaching for bash; automation vs the script that deleted the wrong directory.
- WHY IT MATTERS: senior admin's script directory as "experience saved as text."
- Anatomy of a trustworthy script: shebang line annotated; PATH security diagram (why ./ is needed); $?/$@/$# variables; set -euo pipefail three promises; quoted vs unquoted filename-with-space demo.
- Logic: conditionals, loops, functions: [ -f ] test; for-glob vs while-read comparison; function return-status vs stdout split; the two example scripts (backup, host checker).
- RECAP: cheat-sheet terms as a clean summary card.
