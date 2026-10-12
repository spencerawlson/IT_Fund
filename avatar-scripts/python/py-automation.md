# Automation & APIs: Where Python Pays for Itself — Avatar Tutor Script

**Lesson ID:** py-automation
**Track:** Python & Automation
**Estimated runtime:** ~5 minutes (~703 words)

## Spoken script

**[HOOK — 0:00]**
This is where Python pays for itself: talking to web APIs, running system
commands, pulling indicators out of logs, and turning a one-off script into a
tool your colleagues can actually use. Everything you've learned so far was
warming up for this.

**[WHY IT MATTERS — 0:25]**
Automation is the job. Security teams don't hand-edit a thousand firewall
rules — they script it. They don't eyeball logs — they parse them. HTTP APIs,
shell commands, regex, CSV files, SSH sessions: these are the interfaces your
scripts will touch every day, and using them safely is the difference between
a tool and a liability.

**[SECTION — Calling APIs — 0:50]**
Requests is the de facto library for HTTP: get the URL with a timeout, then
dot json for the body. And always set a timeout. Why? Because a hung server
can hang your script forever — your 3 AM batch job just sits there, doing
nothing, until someone notices. Five seconds is the lesson's habit. Make it
yours.

Then check the status code. 2xx means success, 3xx is a redirect, 4xx is a
client error — bad request, not authorised, not found — and 5xx is a server
error. The response's raise-for-status method turns 4xx and 5xx into
exceptions, so errors become loud instead of silent. Silent failures are how
you "successfully" process zero alerts.

And API keys never belong in code. Read them from an environment variable or
a secrets manager. Here's why: a key committed to git stays in the history
forever — deleting the file doesn't delete the history — and it must be
rotated. Environment variables keep secrets out of your repo entirely.

**[SECTION — Running commands safely — 2:00]**
Subprocess dot run executes a program, and you pass the command and its
arguments as a list: "ping", "-c", "1", host. Each item is one argument, so
nothing is interpreted by a shell. That's the safe form, and it's the default
you should reach for.

The dangerous form is passing a string with shell equals True. Then a
"hostname" of 8.8.8.8 semicolon rm -rf slash becomes two commands — and the
second one deletes your filesystem. That's command injection, and it's exactly
as bad as it sounds. The rule is simple: use the list form, and validate
input before it ever reaches a shell.

**[SECTION — Parsing text: regex and CSV — 3:00]**
The re module finds patterns in text. The lesson's example pulls IPv4-like
strings from a log with findall — one pattern, every match. And write your
patterns as raw strings, with the r prefix. Why? So Python doesn't interpret
the backslashes before re sees them. Without the r, your backslash-d becomes
just "d" and your pattern silently matches the wrong thing.

For CSV files, don't split on commas yourself — quoted fields with commas
inside will break you. The csv module handles quoting correctly, and
DictReader gives each row as a dictionary keyed by the header. Reading
row-of-hostname beats row-of-column-7 every time: the code documents itself.

**[SECTION — From script to tool — 3:55]**
A script becomes a tool when other people can use it. Argparse turns
hard-coded values into command-line options and generates dash-dash-help
automatically — your script documents itself. Logging replaces print for
diagnostics, with levels from DEBUG to ERROR you can filter, and handlers that
write to files. Print is for humans watching; logging is for systems running
unattended.

And for reaching servers and network gear directly, paramiko provides SSH,
while netmiko builds on it with vendor-specific handling for switches and
routers. That's how you automate the devices that don't have APIs.

**[COMMON MISTAKES — 4:45]**
Three traps. One: requests without a timeout — one hung server freezes your
whole script. Two: shell equals True with user input — that's command
injection; use the list form. Three: API keys in code. They live in
environment variables or a secrets manager, never in git history.

**[RECAP — 5:10]**
Call APIs with requests, always with a timeout, and let raise-for-status
make errors loud; read status codes in families — 2xx success through 5xx
server error. Run commands with subprocess as a list, never a shell string
with user input. Parse text with raw-string regex and csv's DictReader.
Promote scripts to tools with argparse and logging, reach devices over SSH
with paramiko and netmiko, and keep every secret in the environment, never in
code. That's automation — where Python pays for itself.

## On-screen visuals

- HOOK: a script pulling alerts from an API, parsing a log, and SSHing into
  a switch in one flow.
- APIs SECTION: an HTTP request timeline with the timeout as a safety net,
  status-code families as a colour chart, a key moving from code into an
  environment variable.
- Subprocess SECTION: the list form versus the shell-equals-True form, with
  the injected semicolon command highlighted in red.
- Regex/CSV SECTION: the IPv4 pattern lighting up matches in a log; a quoted
  CSV field breaking a naive comma split versus DictReader's clean rows.
- Script-to-tool SECTION: a script gaining --help output and log levels;
  paramiko/netmiko connecting to server and switch icons.
- RECAP: the cheat-sheet terms as a clean summary card.
