# Syntax & Data Types: Values, Variables, and the Foundations of Automation — Avatar Tutor Script

**Lesson ID:** py-basics
**Track:** Python & Automation
**Estimated runtime:** ~6 minutes (~798 words)

## Spoken script

**[HOOK — 0:00]**
Picture this: a thousand log files land in your lap, and somebody needs every
failed login pulled out before lunch. That job is about ten lines of Python —
but only if you're fluent in the basics: values, variables, operators, and
strings. Everything else in this track is built on this lesson.

**[WHY IT MATTERS — 0:25]**
Python is the glue language of IT and security work. Short scripts rename a
thousand files, parse a firewall log, or call a cloud API. Those scripts are
made of the same few ingredients. Get sloppy with types and your script crashes
halfway through a batch job. Get them right, and everything that follows
becomes dramatically easier.

**[SECTION — Values, types and variables — 0:50]**
Every value in Python has a type, and you can ask what it is with the type
function. 42 is an int, 3.0 is a float — any literal with a decimal point is a float — "hi" is a
string, True and False are booleans, and None is the loneliest value in the
language: "nothing here." Here's why you'll care: functions that don't return
anything give back None, so confusing it with False or zero is a classic trap.

A variable is just a name bound to a value, like count equals 3. Think of it
as a sticky note on a box. Python is dynamically typed, so you can move the
sticky note to a different box later — but every box holds exactly one
definite type at any moment. The name doesn't have the type; the value does.

**[SECTION — Operators you will use constantly — 1:50]**
Addition, subtraction, and multiplication work as you'd expect. But division
has a twist worth memorising: the single slash always returns a float, so 7
divided by 2 is 3.5, not 3. If you want the whole-number answer, floor
division — the double slash — divides and rounds down, so 7 floor-divided by
2 is 3. Modulo, the percent sign, gives the remainder: 7 mod 2 is 1. And the
double star raises to a power, so 2 to the 3 is 8.

Modulo is far more useful than it looks. How do you test whether a number is
even? n mod 2 equals zero. How do you turn a duration into minutes and
seconds? Take seconds mod 60 for the seconds part. Whenever you need "the
leftover after dividing," modulo is your operator.

**[SECTION — Converting types and reading input — 2:50]**
Here's a fact that bites everyone exactly once: the input function always
returns a string, even when the user types digits. If you ask "how many
hosts?" and the user types 10, you get the text "10", not the number 10 — and
you can't do maths with text. So you convert: int of "42" gives you 42, float
of "3.5" gives you 3.5. But if the text isn't a valid number, int raises a
ValueError — you'll learn to handle those in the Files and Errors lesson.

Going the other direction is easier. str of 42 gives you "42", and you rarely
need to do it by hand for output, because f-strings convert values for you
automatically.

**[SECTION — Strings: indexing, immutability and f-strings — 3:50]**
Strings are sequences of characters, and Python counts from zero: in "abc",
position 1 is "b". Negative indices count from the end, so "hello" at minus 1
is "o" — a lovely way to grab the last character. And len gives you the length:
5 for "hello".

Now the big one: strings are immutable. Methods like upper or replace don't
change the string — they return a brand-new one. So if you write name dot
strip and forget to assign the result, nothing happened. You must reassign:
name equals name dot strip. That one missing assignment is behind an enormous
number of confused debugging sessions.

To build text from values, reach for the f-string. Put an f before the quotes
and drop expressions in braces: f "Hi {name}, you have {count} alerts". Any
expression can go inside — even formatting, like {ratio colon dot 1 percent}
for a tidy percentage.

**[COMMON MISTAKES — 4:40]**
Three traps. One: single slash versus double slash. Seven divided by two is
3.5, not 3 — that float will sneak through and cause trouble downstream. Two:
string methods that go nowhere because you forgot to reassign. name dot strip
without the equals sign is a no-op. Three: trusting input to be a number.
input always gives you a string, so convert it before doing maths.

**[RECAP — 5:05]**
Every value has a type — int, float, string, bool, and None for nothing here —
and variables are just names bound to values. A single slash always gives a
float; floor division, modulo, and the power operator handle the rest. Input
arrives as text, so convert with int or float before doing maths. And strings
are immutable sequences with zero-based indexing: reassign the result of every
string method, and build output with f-strings. That's the foundation.
Everything from here is combination.

## On-screen visuals

- HOOK: a folder of a thousand log files collapsing into ten lines of Python
  code.
- Values/types SECTION: five labelled value boxes — 42, 3.0, "hi", True, None
  — with a sticky-note variable name attached to one.
- Operators SECTION: a small calculator card showing 7/2 = 3.5, 7//2 = 3,
  7%2 = 1, 2**3 = 8, plus the n mod 2 evenness check.
- Converting SECTION: the string "10" morphing into the number 10 through
  int(), with input() labelled "always returns text".
- Strings SECTION: "hello" with numbered character positions, a minus-1 index
  highlighted, and an f-string expanding into a finished message.
- RECAP: the cheat-sheet terms as a clean summary card.
