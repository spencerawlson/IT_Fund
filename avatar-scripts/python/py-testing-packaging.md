# Testing, Packaging & Quality: Tools People Can Trust — Avatar Tutor Script

**Lesson ID:** py-testing-packaging
**Track:** Python & Automation
**Estimated runtime:** ~5 minutes (~764 words)

## Spoken script

**[HOOK — 0:00]**
Untested security tooling fails exactly when it matters — during the
incident, at 3 AM, with everyone watching. And the packages you install?
Supply-chain attacks against PyPI are real. This lesson is about proving your
code works and trusting what you install.

**[WHY IT MATTERS — 0:25]**
A tool other people rely on needs tests that prove it works, a clean way to
install it, and dependencies you can trust. Testing catches the bug before
the incident does. Packaging means colleagues install your tool in one
command instead of a README archaeology expedition. And dependency security is
how you make sure the libraries you pull in aren't pulling a fast one on you.

**[SECTION — Testing with pytest — 0:50]**
Pytest is the most widely used Python test framework, and its genius is
simplicity: tests are plain functions named test underscore something, using
ordinary assert statements. When one fails, pytest explains exactly what
differed — no cryptic codes. And parametrize runs one test over many inputs,
so the port validator gets tested against 22, 0, and 70000 in a single test
function instead of three copies.

A fixture is reusable setup code that pytest injects into any test naming it
as a parameter. Need a fake socket for every network test? Write the fixture
once. A fixture can even yield its value and run teardown afterwards — setup
and cleanup in one tidy package, like the lesson's fake socket that patches
the connection, yields it, then tears it down.

Mocking replaces a real dependency with a controllable fake. Unittest dot
mock dot patch stops tests from calling real APIs, databases, or clocks.
Why does that matter? Real calls are slow, flaky, and sometimes
irreversible — you don't want your test suite charging a credit card. Fakes
keep tests fast and repeatable, which is what makes developers actually run
them.

**[SECTION — Coverage — 2:00]**
Coverage measures which lines or branches your tests executed. It's a useful
flashlight — but read the label carefully. High coverage does not prove the
code is correct, because a test can run a line without checking its result.
Your test executed the function; it never asserted the answer was right.

But low coverage clearly shows the blind spots: whole modules nobody ever
exercises. So treat coverage as what it is — a map of what's untested, not a
certificate of correctness. Run it with the missing-lines report and go visit
the dark corners.

**[SECTION — Packaging and reproducible installs — 2:45]**
Pyproject dot toml is the modern standard file for package metadata and build
configuration, replacing most uses of setup dot py. One file declares what
your package is, what it needs, and how to build it.

Then the lock file: it pins the exact version of every dependency, including
indirect ones — the dependencies of your dependencies. Why does that matter?
Because without pinning, today's install and next month's install can differ,
and a compromised new release of some transitive dependency can slip in
unnoticed. Tools like uv, poetry, and pip-tools generate lock files, and the
result is reproducible installs: the same bits, everywhere, every time.

**[SECTION — Security checks — 3:40]**
Three checks every Python project should run. First, pip-audit: it checks
your installed packages against the Python Packaging Advisory Database of
known vulnerabilities. If a library you use has a published CVE, you want to
know before an attacker tells you.

Second, watch for typosquatting — malicious packages with names close to
popular ones, like "reqeusts" instead of "requests". One transposed letter in
a pip install command and you've installed malware. Check names and
publishers before you trust a package.

Third, Bandit: a static security linter for Python. It flags insecure
patterns — eval, shell equals True, hard-coded secrets — and you run it in CI
so every pull request gets scanned. And the headline rule: never call eval on
user input, because eval executes arbitrary code. Need to parse a Python
literal safely? Use ast dot literal eval instead.

**[COMMON MISTAKES — 4:45]**
Three traps. One: mistaking high coverage for correctness — coverage shows
what ran, not whether it was right. Two: eval on user input. It's arbitrary
code execution wearing a parsing costume; use ast dot literal eval. Three:
installing packages without checking the name. Typosquatting is one letter
away — verify the publisher.

**[RECAP — 5:10]**
Pytest gives you plain asserts, parametrize for many inputs, fixtures for
reusable setup with teardown, and mock dot patch to fake the slow and
dangerous dependencies. Coverage maps your blind spots but never proves
correctness. Pyproject dot toml declares your package; lock files pin every
dependency for reproducible installs. And the security trio: pip-audit for
known vulnerabilities, vigilance against typosquatting, Bandit in CI — with
eval on user input banned outright. Test it, package it, check it. That's how
tools become trustworthy.

## On-screen visuals

- HOOK: a test suite catching a bug before deployment; a typosquatted
  package name ("reqeusts") highlighted next to the real one.
- Pytest SECTION: a parametrize decorator expanding one test into three
  cases; a fixture yielding a fake socket; mock dot patch intercepting a
  network call.
- Coverage SECTION: a coverage report with the missing-lines column
  pointing at untested code; a passing-but-asserting-nothing test flagged.
- Packaging SECTION: pyproject dot toml as the package's identity card; a
  lock file pinning a full dependency tree to exact versions.
- Security checks SECTION: pip-audit flagging a vulnerable package, Bandit
  flagging eval and a hard-coded secret in a CI run.
- RECAP: the cheat-sheet terms as a clean summary card.
