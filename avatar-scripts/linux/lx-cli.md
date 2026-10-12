# Command Line & Filesystem: The Ten Commands That Cover Everything — Avatar Tutor Script

**Lesson ID:** lx-cli
**Track:** Linux Administration
**Estimated runtime:** ~5 minutes (~727 words)

## Spoken script

**[HOOK — 0:00]**
The command line is the native interface of every Linux server, container, and
cloud VM you will ever touch. Graphical tools come and go. Dashboards get
redesigned. But the shell is always there — scriptable, identical everywhere,
and reachable over the worst network connection you have ever suffered through.
Ten commands cover ninety percent of daily work. This lesson builds the muscle
memory.

**[WHY IT MATTERS — ~0:25]**
Every lab, every incident, every deployment in this track starts at a prompt.
You cannot read permissions until you can list a directory. You cannot follow a
log until you can move around the filesystem. And the shell habits — tab
completion, history, the sudo double-bang — are what separate someone who
fights the terminal from someone who flies through it. Learn this cold and
everything after it gets easier.

**[SECTION — Where you are and what is around you — ~0:50]**
Three commands answer the eternal questions: where am I, and what is here?
pwd prints your working directory as an absolute path, starting at slash — the
root of everything. An absolute path like /etc/ssh/sshd_config works from
anywhere. A relative path like ../logs or docs/report.txt is interpreted from
where you currently stand. Mixing those two up is the source of half of all
"file not found" confusion, so make it instinct: absolute starts at root,
relative starts at you.

ls lists directory contents, and three flags do the daily work. Minus l gives
the long format — permissions, owner, size, date, the works. Minus a shows
hidden dotfiles, the config files that start with a dot. Minus h makes sizes
human-readable, because nobody thinks in raw bytes. And movement: cd with a
tilde, or bare cd, takes you home; cd minus jumps back to the previous
directory, like a back button for your shell. You will use cd minus a dozen
times a day.

**[SECTION — Creating, moving, and destroying — ~2:20]**
Now the workshop commands. mkdir with minus p creates the whole chain at once
— projects/2026/q1 appears in one move, no step-by-step needed. touch creates
an empty file or updates timestamps. cp with minus r copies whole trees, and
mv both moves and renames — there is no separate rename command, which
confuses everyone exactly once.

Then there is rm minus rf. It deletes recursively, without asking, and without
a trash can. This is the most feared command in Linux for a reason: there is
no undo. Double-check the path before pressing enter — especially the space
between the directory and the slash, because rm minus rf / tmp/old is a very
different sentence from rm minus rf /tmp/old. One space is the difference
between deleting a folder and deleting a career.

find walks the filesystem looking for names: find /var minus name "app.log".
Quote the pattern so the shell does not expand it first. And when you forget a
flag — you will, constantly — man followed by the command opens the built-in
manual. Q quits, slash searches. For quick examples instead of the full
manual, tldr is faster to skim. Professionals look things up; they just look
them up fast.

One last habit, the classic recovery: you type a command, get "permission
denied," and realise you forgot sudo. Do not retype it. Type sudo double-bang
— the double-bang expands to your previous command, re-run with sudo. It is
the fastest fix for a forgotten sudo, and you will use it weekly.

**[COMMON MISTAKES — ~4:15]**
Three traps. One: running rm minus rf with an unquoted variable or a stray
space — always echo the path first when it comes from a variable. Two: quoting
find patterns. Unquoted, the shell expands the wildcard before find ever sees
it, and your search silently searches the wrong thing. Three: typing the whole
command again after a permission denied instead of sudo double-bang. It works,
but it is slow — and speed at the prompt compounds.

**[RECAP — ~4:45]**
pwd tells you where you are, ls minus la shows you what is there including
dotfiles, and cd minus jumps back like a browser back button. Absolute paths
start at root; relative paths start at you. mkdir minus p builds whole trees,
cp minus r copies them, mv moves and renames, and rm minus rf deletes without
mercy or undo — check the path twice. find searches by name with quoted
patterns, man and tldr are your memory, tab completes everything, and sudo
double-bang rescues the forgotten sudo. Ten commands, ninety percent of the
job. That is the command line.

## On-screen visuals

- HOOK: terminal prompt on a server, container, and cloud VM — same shell everywhere.
- WHY IT MATTERS: skill tree — later lessons (permissions, logs, systemd) branching from CLI basics.
- Where you are and what is around you: filesystem tree with absolute vs relative path highlighted; ls flag comparison (-l, -a, -h); cd - back-button animation.
- Creating, moving, and destroying: mkdir -p chain building; the rm -rf space typo contrasted side by side; find with quoted pattern; man page with q and / hints; sudo !! recovery demo.
- RECAP: cheat-sheet terms as a clean summary card.
