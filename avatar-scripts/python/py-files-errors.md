# Files, Errors & Modules: Scripts That Survive the Real World — Avatar Tutor Script

**Lesson ID:** py-files-errors
**Track:** Python & Automation
**Estimated runtime:** ~5 minutes (~700 words)

## Spoken script

**[HOOK — 0:00]**
A script that works on your laptop and crashes on the server is a demo, not a
tool. Real automation reads files that might be missing, parses input that
might be garbage, and runs at 3 AM when nobody's watching. This lesson is
about writing scripts that survive the real world.

**[WHY IT MATTERS — 0:25]**
Automation lives on files: logs to parse, reports to write, configs to read.
And it has to survive files going missing and input arriving malformed. A
script that crashes halfway through a batch job is worse than no script —
because now you don't know what finished and what didn't. Safe file handling,
sane error handling, and isolated dependencies are what make your tools
trustworthy.

**[SECTION — Files and context managers — 0:50]**
Always open files with a with block. The with statement uses a context manager
that closes the file automatically when the block ends — even if an error
fires inside it. Why does that matter? An unclosed file can lose buffered
writes or lock the file for other processes. The with block means cleanup
happens no matter what. It's the single most important file habit in Python.

For paths, reach for pathlib. A Path object joined with a slash gives you a
path that works on every operating system — no more hand-building strings
with the wrong slashes. path dot exists, path dot read text: readable,
portable, done.

And for structured data, the json module converts between JSON text and
Python objects: loads parses text into objects, dumps goes the other way.
Config files, API payloads, reports — JSON is the lingua franca, and Python
speaks it in two function calls.

**[SECTION — Exceptions — 1:55]**
Errors in Python are raised as exceptions. Opening a missing file raises
FileNotFoundError; bad conversions raise ValueError. You handle the ones you
expect with try and except — and the key word is "specific". Catch the exact
error you're prepared for.

Why not just catch everything? Because a bare except swallows every error —
including KeyboardInterrupt when you press Ctrl+C. Your script becomes
unkillable and hides real bugs. Be precise about what you catch.

A finally block always runs, whether or not an exception happened, which makes
it the place for cleanup. And when your own code detects a problem, signal it
with raise — pick the most specific built-in exception, like ValueError with a
message saying what was wrong. Raising early with a clear message is a gift to
whoever debugs this at 3 AM — probably you.

**[SECTION — Modules, __main__ and virtual environments — 3:00]**
Every Python file is a module you can import. And the "if __name__ equals
__main__" guard is the trick that lets one file be both a reusable library and
a runnable script: code under it runs only when the file is executed directly,
not when it's imported. Without the guard, importing your module would run the
whole script — usually not what you want.

Now, dependencies. A virtual environment isolates a project's packages from
the system Python: create one with python -m venv, activate it, then pip
install. Why bother? Because without isolation, project A's library version
breaks project B, and system updates break everything. List your dependencies
in requirements.txt with pinned versions, so anyone can recreate the exact
environment later. Reproducible installs are how "works on my machine" dies.

**[SECTION — Safe data formats — 4:00]**
One warning with security teeth: pickle can serialise almost any Python
object, which makes it tempting — but pickle dot load on untrusted data can
execute arbitrary code. That is an insecure deserialisation vulnerability, the
kind that ends up in breach reports. For anything crossing a trust boundary —
files you receive, data from the network — use JSON. Less powerful, far safer.

**[COMMON MISTAKES — 4:30]**
Three traps. One: opening files without with and leaking handles when an
error hits. Two: the bare except that swallows Ctrl+C and hides bugs — always
name the exception. Three: unpickling data you didn't create. If it crossed a
trust boundary, it's JSON or nothing.

**[RECAP — 4:55]**
Open files with with so they always close, use pathlib for portable paths,
and json for structured data. Catch specific exceptions, never bare except;
finally is for cleanup, raise is for signalling. The __main__ guard makes a
file both library and script; virtual environments plus pinned requirements
make installs reproducible. And never unpickle untrusted data — JSON instead.
That's how scripts survive the real world.

## On-screen visuals

- HOOK: a script running at 3 AM on a server, hitting a missing file and
  carrying on gracefully.
- Files SECTION: a with block wrapping file access, the file closing itself
  when an error fires; pathlib joining path segments.
- Exceptions SECTION: try/except catching a specific error, the bare except
  swallowing a Ctrl+C, finally running in both cases.
- Modules SECTION: one file shown as importable library on the left and
  runnable script on the right, split by the __main__ guard; a venv isolating
  project packages from system Python.
- Safe formats SECTION: a pickle box labelled "can execute code" versus a
  JSON box labelled "safe across trust boundaries".
- RECAP: the cheat-sheet terms as a clean summary card.
