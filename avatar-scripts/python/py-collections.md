# Lists, Dicts, Sets & Tuples: Picking the Right Container — Avatar Tutor Script

**Lesson ID:** py-collections
**Track:** Python & Automation
**Estimated runtime:** ~6 minutes (~786 words)

## Spoken script

**[HOOK — 0:00]**
Real data comes in groups: a list of IP addresses, a mapping of usernames to
roles, a set of blocked domains. And here's the thing — choosing the right
container doesn't just make your code simpler. It can make it dramatically
faster. The wrong choice turns a one-second lookup into a ten-minute one.

**[WHY IT MATTERS — 0:25]**
Every automation script you write handles collections. Counting hits per IP,
filtering a blocklist, pairing hosts with ports — all of it is lists, dicts,
sets, and tuples. Python gives you four built-in collections, each with a
different job, and knowing which one reaches for which job is what separates
scripts that crawl from scripts that fly.

**[SECTION — Four collections, four jobs — 0:50]**
A list is ordered and mutable: the things in it can change, and the order is
preserved. Use it for sequences you add to and change — a list of log lines,
a list of hosts to scan.

A tuple is ordered but immutable: once created, it never changes. Use it for
fixed records like host-and-port pairs. And here's the payoff of
immutability: because tuples can't change, they're hashable, which means they
can be dictionary keys. A list can't be a key — it might change after being
stored, which would corrupt the dictionary. Convert it to a tuple first.

A set holds unique items only. Add a duplicate and nothing happens — it just
vanishes. Why does that matter? Because membership tests in a set are
blazingly fast on average, no matter how big the set gets. Checking whether a
domain is in a blocklist of ten million entries is just as quick as checking
against ten. A dictionary maps keys to values — usernames to roles, IPs to hit
counts — and it has preserved insertion order since Python 3.7, so things come
back in the order you put them in.

The exam-style question to rehearse: which collection for which job? Growing
sequence — list. Fixed record — tuple. Uniqueness plus fast membership — set.
Lookup by key — dict.

**[SECTION — Working with lists and dicts — 2:10]**
Two list methods to keep straight. Append adds one item to the end. Extend
adds every item from another iterable — it unpacks them in. Appending a list
gives you a list inside your list; extending gives you the items merged in.
Know which one you want before you type it.

For dicts, the trap is the missing key. Square brackets with a missing key
raises a KeyError and your script dies. The get method with a default returns
the default instead — no crash. The lesson's hit-counter is the pattern to
memorise: hits of ip equals hits dot get of ip with zero, plus one. The first
time an IP appears, get returns zero instead of exploding.

Slices take a range: nums from 1 to 3 includes index 1 and excludes index 3,
so a list of 10, 20, 30, 40 sliced 1 to 3 gives 20, 30. Start included, end
excluded — that's the rule, same as range. And nums with step minus 1 reverses
the whole list, a neat trick worth having in your pocket.

**[SECTION — Comprehensions and idiomatic loops — 3:20]**
A list comprehension builds a list from a loop in a single expression: x
times 2 for x in range of 3 gives 0, 2, 4. Add an if and you get a filter:
ip for ip in ips if ip starts with "10." — every private address, one line.
Dict and set comprehensions work the same way with curly braces.

Now the two looping helpers that make your code read like Python instead of
Java. To loop over a dict's keys and values together, write "for k, v in d
dot items". And when you need the position as well as the item, use "for i,
item in enumerate of items" instead of range of len. It's shorter, clearer,
and you can't get the indexing wrong — because there is no indexing.

**[COMMON MISTAKES — 4:20]**
Three traps. One: using a list as a dict key. Lists are mutable, so they're
unhashable — convert to a tuple first. Two: square brackets on a missing dict
key raises KeyError; use get with a default. Three: slices and range both
exclude the end. nums 1 to 3 stops at index 2 — memorise "start included, end
excluded" and off-by-one errors lose their favourite hiding place.

**[RECAP — 4:50]**
Four collections, four jobs: lists for growing ordered sequences, tuples for
fixed immutable records that can be dict keys, sets for unique items with
lightning-fast membership, dicts for key-to-value lookups. Append adds one
item, extend merges in many; get with a default never raises KeyError; slices
include the start and exclude the end. Comprehensions build collections in one
expression, items and enumerate loop the idiomatic way. Choose the right
container, and your code gets simpler and faster at the same time.

## On-screen visuals

- HOOK: a blocklist check running instantly against millions of entries versus
  a slow linear scan, side by side.
- Four collections SECTION: four labelled containers — a growing list, a
  sealed tuple pair, a set rejecting a duplicate, a dict mapping keys to
  values.
- Lists/dicts SECTION: append versus extend animation, the KeyError crash
  versus the safe get-with-default, a slice window over a numbered list.
- Comprehensions SECTION: a for loop collapsing into a one-line
  comprehension, plus enumerate pairing indexes with items.
- RECAP: the cheat-sheet terms as a clean summary card.
