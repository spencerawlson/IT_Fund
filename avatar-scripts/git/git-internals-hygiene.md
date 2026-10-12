# Internals & Good Practice: What's Under the Hood — Avatar Tutor Script

**Lesson ID:** git-internals-hygiene
**Track:** Git & Version Control
**Estimated runtime:** ~5 minutes (~733 words)

## Spoken script

**[HOOK — 0:00]**
Git can feel like magic — until you see the handful of simple ideas
underneath. Four object types, one hash function, one graph. Learn them, and
suddenly you can explain why some operations are safe, why others are
dangerous, and why nobody can quietly rewrite history without everyone
noticing.

**[WHY IT MATTERS — 0:25]**
Understanding the object model turns Git from a set of memorised incantations
into a system you can reason about. It explains the tamper-evidence behind
signed commits, why rewriting shared history is so disruptive, and why the
hygiene disciplines — secrets, large files, message quality — are not
etiquette but engineering.

**[SECTION — The object model — 0:50]**
Everything in Git is a hashed object stored under .git/objects, and there are
only four types. A blob holds a file's contents — just the bytes, no name. A
tree represents a directory: names pointing at blobs and other trees, which is
how filenames enter the picture. A commit points at one tree plus its parent
commit or commits, and carries the author and the message. And a tag can
annotate a specific object, usually a commit, with a label like a release
version. Four types, and the whole of history is built from them.

Each object is named by a cryptographic hash of its content — historically
SHA-1, now moving to SHA-256. The name is the content's fingerprint. And that
is what makes history tamper-evident: change a single byte in any commit and
its hash changes, which changes every descendant's hash in turn, like a row
of dominoes where each one is glued to the next. You cannot quietly alter the
past; the fingerprints would all stop matching.

The commits themselves form a directed acyclic graph — a DAG — each pointing
back at its parents, with branches and merges as simply nodes and edges in
that graph. This is also why rewriting a commit everyone else already has is
so disruptive: new content means new hashes, and your collaborators' histories
no longer line up with yours. Same graph, different fingerprints — and now
nothing matches.

**[SECTION — Keeping a repository healthy — 2:35]**
The single most important discipline is keeping secrets out. Because every
commit is permanent and content-addressed, a committed password lives on in
history even after you "delete" it — the fingerprint remembers. So use
.gitignore plus a secret scanner such as gitleaks in a pre-commit hook, and
if something does leak, rotate the credential rather than trusting a cleanup.
You cannot un-send a letter; you change the locks.

For provenance, signing commits and tags with GPG or SSH cryptographically
proves who authored them, defending against impersonation in the log. Anyone
can write your name in an author field; a signature proves the key holder
actually made the commit. In a world of supply-chain attacks, that proof
matters.

A few more habits keep repositories fast and sane. Large binaries bloat every
clone's history forever — every clone carries every version of every binary,
for all time — so store them with Git LFS, which keeps lightweight pointers
in Git and the bytes elsewhere. Write commit messages that explain the why,
because future debuggers will read them when the code alone cannot explain
itself. And treat the golden rule as sacred: never rewrite history that has
been shared. Local cleanup before you push is good craftsmanship; rewriting
public history is how you break everyone downstream of you. The fingerprints
do not lie, and neither should the log.

**[COMMON MISTAKES — 4:25]**
Three traps. One: assuming a deleted secret is a fixed secret. History is
content-addressed and permanent — rotate the credential. Two: committing
large binaries directly instead of using Git LFS, taxing every clone forever.
Three: "cleaning up" shared history. Tidy your local work all you like; the
moment it is pushed, the history belongs to everyone, and rewriting it breaks
their clones.

**[RECAP — 4:45]**
Four object types — blob, tree, commit, tag — each named by a cryptographic
hash of its content, SHA-1 moving to SHA-256. Change one byte and the
fingerprints cascade, which is what makes history tamper-evident. Commits form
a directed acyclic graph of parents and children; branches and merges are
just nodes and edges. Keep the repository healthy: secrets stay out via
.gitignore and a scanner like gitleaks — and anything leaked gets rotated,
never trusted to deletion. Sign commits and tags with GPG or SSH to prove
authorship. Store large binaries in Git LFS, not in history. Write messages
that explain why. And honour the golden rule: never rewrite shared history.
Four types, one hash, one graph — and now the magic is just engineering.

## On-screen visuals

- HOOK: a magician's curtain pulling back to reveal four object types, one
  hash function, and one graph.
- The object model: the four object types as nesting layers — blob inside
  tree inside commit, tag labelling a commit; a single changed byte
  cascading new hashes down the chain like dominoes; the commit DAG with
  branches and merges as nodes and edges.
- Keeping a repository healthy: a committed secret surviving its deletion in
  history, then the credential being rotated; a signed commit with a verified
  signature badge; large binaries diverted to LFS pointers while the repo
  stays light; the golden rule as a boundary between local cleanup and
  shared history.
- RECAP: blob, tree, commit, tag, hash, DAG, and the hygiene disciplines as
  a summary strip.
