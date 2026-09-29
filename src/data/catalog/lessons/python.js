// Reading content for the Python & Automation course, keyed by lesson (deck) id.
// Strings support `inline code` only. Every section is aligned with the lesson's questions in
// src/data/academy/python.js, so reading first prepares you for the practice.

const code = (...lines) => lines.join('\n');

/** @type {Record<string, import('../schema').LessonContent>} */
export default {
  'py-basics': {
    overview: [
      'Python is the glue language of IT and security work: short scripts rename a thousand files, parse a firewall log, or call a cloud API. Everything starts with values, the variables that name them, and the operators that combine them.',
      'This lesson covers the core data types (`int`, `float`, `str`, `bool` and `None`), arithmetic including floor division and modulo, converting between types, and working with strings: indexing, immutability and f-strings.',
    ],
    learn: [
      {
        heading: 'Values, types and variables',
        body: [
          'Every value has a type, and `type(value)` tells you which. `42` is an `int`, `3.0` is a `float` (any literal with a decimal point), `"hi"` is a `str`, `True` and `False` are `bool`, and `None` is the single value that means "nothing here". Functions that do not return anything give back `None`.',
          'A variable is just a name bound to a value: `count = 3`. Python is dynamically typed, so the same name can later refer to a different type, but the value itself always has one definite type.',
        ],
      },
      {
        heading: 'Operators you will use constantly',
        body: [
          '`+ - * /` work as expected, and `/` always returns a `float` (`7 / 2` is `3.5`). Floor division `//` divides and rounds down (`7 // 2` is `3`), modulo `%` gives the remainder (`7 % 2` is `1`), and `**` raises to a power (`2 ** 3` is `8`).',
          'Modulo is more useful than it looks: `n % 2 == 0` tests for even numbers, and `seconds % 60` turns a duration into the seconds part of minutes:seconds.',
        ],
      },
      {
        heading: 'Converting types and reading input',
        body: [
          '`input()` always returns a `str`, even if the user types digits. Convert with `int("42")` or `float("3.5")`. If the text is not a valid number, `int()` raises `ValueError`, which you will learn to handle in the Files & Errors lesson.',
          'Going the other way, `str(42)` gives `"42"`. You rarely need that for output, because f-strings convert for you.',
        ],
      },
      {
        heading: 'Strings: indexing, immutability and f-strings',
        body: [
          'Strings are sequences of characters, indexed from zero: `"abc"[1]` is `"b"`. Negative indices count from the end, so `"hello"[-1]` is `"o"`. `len("hello")` is `5`.',
          'Strings are immutable. Methods such as `.upper()` or `.replace()` return a new string and leave the original unchanged, so you must assign the result: `name = name.strip()`.',
          'To build text from values, use an f-string: `f"Hi {name}, you have {count} alerts"`. Any expression can go inside the braces, including formatting such as `{ratio:.1%}`.',
        ],
      },
    ],
    examples: [
      {
        title: 'Arithmetic and types',
        code: code(
          'print(type(3.0))   # <class \'float\'>',
          'print(7 / 2)       # 3.5',
          'print(7 // 2)      # 3  (floor division)',
          'print(7 % 2)       # 1  (remainder)',
          'print(2 ** 3)      # 8',
        ),
        explanation: 'Run each line in a Python shell (`python` or `python3`) to see the result for yourself.',
      },
      {
        title: 'Read a number and report it',
        code: code(
          'raw = input("How many hosts? ")   # always a str',
          'hosts = int(raw)                  # ValueError if not digits',
          'print(f"Scanning {hosts} hosts, about {hosts * 0.5:.0f} seconds")',
        ),
        explanation: 'Convert input before doing maths with it, then let the f-string format the output.',
      },
    ],
    cheatSheet: [
      ['int / float / str / bool', 'Whole numbers, decimals, text, True/False'],
      ['None', 'The "no value" object; default return value of functions'],
      ['// and %', 'Floor division and remainder: 7 // 2 = 3, 7 % 2 = 1'],
      ['**', 'Power: 2 ** 3 = 8'],
      ['int("42")', 'Parse text to a number (ValueError if invalid)'],
      ['s[0], s[-1]', 'First and last character (zero-based indexing)'],
      ['Immutable strings', 'Methods return a new string; reassign the result'],
      ['f"{x}"', 'Insert any expression into text'],
    ],
  },

  'py-flow': {
    overview: [
      'Programs become useful when they make decisions and repeat work. Control flow is how a script decides what to do with each log line, retries a failed request, or stops when it finds what it was looking for.',
      'This lesson covers `if`/`elif`/`else`, truthiness, `for` and `while` loops with `range`, `break`, `continue` and `pass`, and how to package logic into reusable functions.',
    ],
    learn: [
      {
        heading: 'Decisions: if, elif, else and truthiness',
        body: [
          'Python delimits blocks with indentation, not braces. PEP 8 recommends 4 spaces per level; mixing tabs and spaces causes errors. The "else if" keyword is `elif`.',
          'Conditions do not have to be booleans. The falsy values are `False`, `None`, `0`, `""` and empty collections; everything else is truthy. That is why `if items:` is the idiomatic way to check that a list is not empty.',
          'Use `==` to compare values and `is` to compare identity. In practice `is` is only for singletons: write `if result is None:`.',
        ],
      },
      {
        heading: 'Loops',
        body: [
          'A `for` loop walks over any iterable: a list, a string, a file, a dictionary. `range(3)` produces `0, 1, 2`: it starts at 0 and stops before the end value. A `while` loop repeats as long as its condition stays true.',
          '`break` leaves the innermost loop immediately, `continue` skips the rest of the current pass and moves to the next one, and `pass` does nothing: it is a placeholder where the syntax needs a statement.',
        ],
      },
      {
        heading: 'Functions',
        body: [
          'Define a function with `def name(parameters):` and an indented body. `return` sends a value back; a function without a `return` returns `None`.',
          'Parameters can have default values: `def greet(name="world"):`. Never use a mutable default such as `[]` or `{}`: the default is created once, when the function is defined, and shared by every call. Use `None` and create the list inside the function instead.',
        ],
      },
    ],
    examples: [
      {
        title: 'Classify failed logins',
        code: code(
          'def severity(failures, threshold=5):',
          '    if failures == 0:',
          '        return "ok"',
          '    elif failures < threshold:',
          '        return "watch"',
          '    else:',
          '        return "alert"',
          '',
          'for user, failures in [("amy", 0), ("bob", 3), ("eve", 12)]:',
          '    print(user, severity(failures))',
        ),
        explanation: 'One function holds the rule; the loop applies it to every user.',
      },
      {
        title: 'break, continue and the mutable-default trap',
        code: code(
          'with open("auth.log") as f:     # with: see the Files & Errors lesson',
          '    for line in f:',
          '        if not line.strip():',
          '            continue      # skip blank lines',
          '        if "CRITICAL" in line:',
          '            print(line)',
          '            break         # stop at the first critical entry',
          '',
          'def add_tag(tag, tags=None):   # not tags=[]',
          '    tags = [] if tags is None else tags',
          '    tags.append(tag)',
          '    return tags',
        ),
        explanation: 'With `tags=[]`, every call would append to the same shared list.',
      },
    ],
    cheatSheet: [
      ['elif', 'Python\'s "else if"'],
      ['Falsy', 'False, None, 0, "", and empty collections'],
      ['== vs is', 'Value equality vs identity (use is only for None)'],
      ['range(3)', '0, 1, 2 (stop value excluded)'],
      ['break / continue', 'Leave the loop / skip to the next pass'],
      ['pass', 'Do-nothing placeholder'],
      ['No return', 'Function returns None'],
      ['Defaults', 'def f(x=None); never a mutable default like []'],
    ],
  },

  'py-collections': {
    overview: [
      'Real data comes in groups: a list of IP addresses, a mapping of usernames to roles, a set of blocked domains. Choosing the right collection makes code simpler and often dramatically faster.',
      'This lesson compares the four built-in collections (`list`, `tuple`, `set`, `dict`), then covers slicing, comprehensions, and the looping helpers `enumerate` and `.items()`.',
    ],
    learn: [
      {
        heading: 'Four collections, four jobs',
        body: [
          'A `list` is ordered and mutable: use it for sequences you add to and change. A `tuple` is ordered but immutable: use it for fixed records such as `(host, port)`. Because tuples cannot change, they are hashable and can be dictionary keys.',
          'A `set` holds unique items only; adding a duplicate does nothing, and membership tests (`x in s`) are O(1) on average. A `dict` maps keys to values and has preserved insertion order since Python 3.7.',
          'Dictionary keys must be hashable, which is why a list cannot be a key: it could change after being stored. Convert it to a tuple first.',
        ],
      },
      {
        heading: 'Working with lists and dicts',
        body: [
          '`my_list.append(x)` adds one item to the end; `extend` adds every item from another iterable. `d["k"]` raises `KeyError` if the key is missing, whereas `d.get("k", 0)` returns the default instead.',
          'Slices take a range: `nums[1:3]` includes index 1 and excludes index 3, so `[10, 20, 30, 40][1:3]` is `[20, 30]`. `nums[::-1]` reverses a list.',
        ],
      },
      {
        heading: 'Comprehensions and idiomatic loops',
        body: [
          'A list comprehension builds a list from a loop in one expression: `[x * 2 for x in range(3)]` is `[0, 2, 4]`. Add a filter with `if`: `[ip for ip in ips if ip.startswith("10.")]`. Dict and set comprehensions use `{}`.',
          'Loop over a dict\'s keys and values together with `for k, v in d.items():`. When you need the position as well as the item, use `for i, item in enumerate(items):` instead of `range(len(items))`.',
        ],
      },
    ],
    examples: [
      {
        title: 'Count hits per IP with a dict',
        code: code(
          'hits = {}',
          'for ip in ["10.0.0.5", "10.0.0.9", "10.0.0.5"]:',
          '    hits[ip] = hits.get(ip, 0) + 1',
          '',
          'for ip, count in hits.items():',
          '    print(ip, count)      # 10.0.0.5 2, then 10.0.0.9 1',
        ),
        explanation: '`get` with a default avoids a KeyError the first time each IP appears.',
      },
      {
        title: 'Fast membership with a set',
        code: code(
          'blocked = {"evil.example", "phish.example"}   # set literal',
          'requests = ["docs.python.org", "phish.example"]',
          'flagged = [r for r in requests if r in blocked]',
          'print(flagged)   # [\'phish.example\']',
        ),
        explanation: 'Checking membership in a set stays fast even with millions of entries.',
      },
    ],
    cheatSheet: [
      ['list', 'Ordered, mutable: append, insert, remove'],
      ['tuple', 'Ordered, immutable, hashable (can be a dict key)'],
      ['set', 'Unique items, O(1) membership'],
      ['dict', 'Key → value, insertion-ordered (3.7+)'],
      ['d.get(k, default)', 'No KeyError for missing keys'],
      ['a[1:3]', 'Slice: start included, end excluded'],
      ['[f(x) for x in xs]', 'List comprehension'],
      ['.items() / enumerate()', '(key, value) pairs / (index, item) pairs'],
    ],
  },

  'py-files-errors': {
    overview: [
      'Automation lives on files: logs to parse, reports to write, configs to read. It also has to survive the real world, where files go missing and input is malformed. A script that crashes halfway through a batch job is worse than no script.',
      'This lesson covers reading and writing files safely, handling and raising exceptions, organising code into modules, isolating dependencies with virtual environments, and choosing a safe data format.',
    ],
    learn: [
      {
        heading: 'Files and context managers',
        body: [
          'Open files with `with open(path) as f:`. The `with` block uses a context manager that closes the file automatically when the block ends, even if an error occurs inside it.',
          'The `pathlib` module gives object-oriented paths that work on every operating system: `Path("logs") / "app.log"`, `path.exists()`, `path.read_text()`. For structured data, the `json` module converts between JSON text and Python objects with `json.loads` and `json.dumps`.',
        ],
      },
      {
        heading: 'Exceptions',
        body: [
          'Errors are raised as exceptions. Opening a missing file raises `FileNotFoundError` (a subclass of `OSError`); bad conversions raise `ValueError`. Handle the ones you expect with `try`/`except SpecificError:`.',
          'Avoid a bare `except:`. It swallows every error, including `KeyboardInterrupt` when you press Ctrl+C, and hides bugs. A `finally` block always runs, whether or not an exception happened, which makes it the place for cleanup.',
          'Signal problems in your own code with `raise ValueError("port must be 1-65535")`, choosing the most specific built-in exception or your own subclass.',
        ],
      },
      {
        heading: 'Modules, __main__ and virtual environments',
        body: [
          'Every `.py` file is a module you can import. Code under `if __name__ == "__main__":` runs only when the file is executed directly, not when it is imported, so a file can be both a reusable library and a script.',
          'A virtual environment isolates a project\'s dependencies from the system Python: `python -m venv .venv`, activate it, then `pip install`. List dependencies in `requirements.txt` and pin versions so every install is reproducible.',
        ],
      },
      {
        heading: 'Safe data formats',
        body: [
          '`pickle` can serialise almost any Python object, but `pickle.load` on untrusted data can execute arbitrary code: an insecure deserialization vulnerability. For anything that crosses a trust boundary, use JSON.',
        ],
      },
    ],
    examples: [
      {
        title: 'Read a config file defensively',
        code: code(
          'import json',
          'from pathlib import Path',
          '',
          'def load_config(path="config.json"):',
          '    try:',
          '        with open(Path(path)) as f:',
          '            return json.load(f)',
          '    except FileNotFoundError:',
          '        return {"retries": 3}          # sensible default',
          '    except json.JSONDecodeError as e:',
          '        raise ValueError(f"Bad config: {e}") from e',
          '',
          'if __name__ == "__main__":',
          '    print(load_config())',
        ),
        explanation: 'Each expected failure is handled specifically; anything unexpected still surfaces as an error.',
      },
      {
        title: 'Set up an isolated project',
        code: code(
          'python -m venv .venv',
          'source .venv/bin/activate        # Windows: .venv\\Scripts\\activate',
          'pip install requests',
          'pip freeze > requirements.txt',
        ),
        explanation: 'Anyone can recreate the environment later with `pip install -r requirements.txt`.',
      },
    ],
    cheatSheet: [
      ['with open(...) as f', 'File closes automatically, even on error'],
      ['FileNotFoundError', 'Raised when opening a missing file'],
      ['finally', 'Always runs: cleanup code'],
      ['Bare except:', 'Avoid: hides every error, even Ctrl+C'],
      ['raise ValueError("...")', 'Signal an error from your own code'],
      ['__name__ == "__main__"', 'Runs only when executed directly'],
      ['venv + requirements.txt', 'Isolated, reproducible dependencies'],
      ['pickle on untrusted data', 'Can execute code; use JSON instead'],
    ],
  },

  'py-oop': {
    overview: [
      'As scripts grow into tools, you need ways to model things (a host, a finding, a user) and to reuse behaviour without copying code. Object-oriented programming and a few Pythonic features make larger code readable and testable.',
      'This lesson covers classes and `self`, `__init__` and the dunder methods, inheritance, dataclasses, static and class methods, generators, decorators, lambdas, type hints and PEP 8 naming.',
    ],
    learn: [
      {
        heading: 'Classes, self and dunder methods',
        body: [
          'A class is a blueprint; each object created from it is an instance. `__init__` initialises a new instance\'s attributes, and every method receives the instance it was called on as its first parameter, named `self` by convention.',
          'Methods with double underscores ("dunder" methods) hook into Python\'s syntax. `__repr__` controls how an object appears to developers (in the shell and in logs) and should be unambiguous; `__str__` is the friendlier form for end users; `__eq__` defines `==`.',
          '`@dataclass` writes `__init__`, `__repr__` and `__eq__` for you from annotated fields, which is ideal for plain data-holding classes.',
        ],
      },
      {
        heading: 'Inheritance and method types',
        body: [
          'Inheritance lets a class reuse and extend another: `class Admin(User):` gets every `User` method, and `super().__init__(...)` calls the parent\'s version. Prefer small hierarchies; composition (an object holding another) is often clearer.',
          '`@staticmethod` defines a method that takes neither `self` nor `cls`, a plain function grouped with the class. `@classmethod` receives the class itself as `cls`, which is handy for alternative constructors such as `Host.from_string("10.0.0.1:22")`.',
        ],
      },
      {
        heading: 'Generators, decorators and lambdas',
        body: [
          'A generator function uses `yield` instead of `return`, producing values lazily, one at a time. It can process a huge file or an endless stream without loading everything into memory.',
          'A decorator is a function that wraps another function to add behaviour: timing, logging, retries, access checks. Writing `@login_required` above a `def` wraps it without editing its body.',
          '`lambda x: x * 2` creates a small anonymous function from one expression, most often as a sort key: `sorted(users, key=lambda u: u.age)`.',
        ],
      },
      {
        heading: 'Type hints and style',
        body: [
          'Type hints such as `def f(x: int) -> str:` document intent and let tools like mypy and your IDE catch bugs early. They are not enforced at runtime.',
          'PEP 8 naming: `snake_case` for functions and variables, `CapWords` (PascalCase) for classes, `UPPER_CASE` for constants.',
        ],
      },
    ],
    examples: [
      {
        title: 'A dataclass with an alternative constructor',
        code: code(
          'from dataclasses import dataclass',
          '',
          '@dataclass',
          'class Host:',
          '    ip: str',
          '    port: int = 22',
          '',
          '    @classmethod',
          '    def from_string(cls, text: str) -> "Host":',
          '        ip, port = text.split(":")',
          '        return cls(ip, int(port))',
          '',
          'print(Host.from_string("10.0.0.1:2222"))   # Host(ip=\'10.0.0.1\', port=2222)',
        ),
        explanation: 'The dataclass generated `__init__` and `__repr__`; the class method parses a common input format.',
      },
      {
        title: 'A generator and a decorator',
        code: code(
          'import functools, time',
          '',
          'def timed(func):',
          '    @functools.wraps(func)',
          '    def wrapper(*args, **kwargs):',
          '        start = time.perf_counter()',
          '        try:',
          '            return func(*args, **kwargs)',
          '        finally:',
          '            print(f"{func.__name__} took {time.perf_counter() - start:.3f}s")',
          '    return wrapper',
          '',
          'def errors(path):',
          '    with open(path) as f:',
          '        for line in f:',
          '            if "ERROR" in line:',
          '                yield line.rstrip()',
          '',
          '@timed',
          'def count_errors(path):',
          '    return sum(1 for _ in errors(path))',
        ),
        explanation: 'The generator streams matching lines; the decorator adds timing without touching `count_errors`.',
      },
    ],
    cheatSheet: [
      ['self', 'The instance a method was called on'],
      ['__init__', 'Initialises a new instance'],
      ['__repr__ / __str__', 'Developer view / user-friendly view'],
      ['class B(A): super()', 'Inherit and call the parent'],
      ['@dataclass', 'Generates __init__, __repr__, __eq__'],
      ['@staticmethod / @classmethod', 'No self or cls / receives cls'],
      ['yield', 'Makes a lazy generator'],
      ['@decorator', 'Wraps a function to add behaviour'],
      ['snake_case / CapWords', 'Functions and variables / classes'],
    ],
  },

  'py-automation': {
    overview: [
      'This is where Python pays for itself: talking to web APIs, running system commands, pulling indicators out of logs, and turning a one-off script into a tool colleagues can use.',
      'This lesson covers HTTP with `requests`, safe use of `subprocess`, regular expressions, CSV parsing, handling secrets, SSH automation, command-line arguments and proper logging.',
    ],
    learn: [
      {
        heading: 'Calling APIs',
        body: [
          '`requests` is the de facto library for HTTP: `requests.get(url, timeout=5)` then `.json()` for the body. Always set a timeout, or a hung server can hang your script forever.',
          'Check the status code: 2xx means success, 3xx a redirect, 4xx a client error (bad request, not authorised, not found) and 5xx a server error. `response.raise_for_status()` turns 4xx and 5xx into exceptions.',
          'API keys never belong in code. Read them from an environment variable (`os.environ["API_KEY"]`) or a secrets manager. A key committed to git stays in the history and must be rotated.',
        ],
      },
      {
        heading: 'Running commands safely',
        body: [
          '`subprocess.run(["ping", "-c", "1", host], capture_output=True, text=True)` runs a program with its arguments passed as a list. Each item is one argument, so nothing is interpreted by a shell.',
          'Passing a string with `shell=True` and user input enables command injection: a "hostname" of `8.8.8.8; rm -rf /` becomes two commands. Use the list form, and validate input.',
        ],
      },
      {
        heading: 'Parsing text: regex and CSV',
        body: [
          'The `re` module finds patterns: `re.findall(r"\\d+\\.\\d+\\.\\d+\\.\\d+", log)` pulls IPv4-like strings from a log. Write patterns as raw strings (`r"..."`) so Python does not interpret the backslashes before `re` sees them.',
          'The `csv` module handles quoting and commas inside fields correctly. `csv.DictReader` gives each row as a dictionary keyed by the header, which reads far better than numeric column indexes.',
        ],
      },
      {
        heading: 'From script to tool',
        body: [
          '`argparse` turns hard-coded values into command-line options and generates `--help` automatically. `logging` replaces `print()` for diagnostics, with levels (DEBUG, INFO, WARNING, ERROR) you can filter and handlers that write to files.',
          'For servers and network gear, `paramiko` provides SSH, and `netmiko` builds on it with vendor-specific handling for switches and routers.',
        ],
      },
    ],
    examples: [
      {
        title: 'Query an API with a timeout and a secret from the environment',
        code: code(
          'import os, requests',
          '',
          'resp = requests.get(',
          '    "https://api.example.com/v1/alerts",',
          '    headers={"Authorization": f"Bearer {os.environ[\'API_KEY\']}"},',
          '    timeout=5,',
          ')',
          'resp.raise_for_status()           # 4xx/5xx -> exception',
          'for alert in resp.json()["alerts"]:',
          '    print(alert["id"], alert["severity"])',
        ),
        explanation: 'No key in the code, no request without a timeout, no silent failure on an error status.',
      },
      {
        title: 'A small log tool with argparse, regex and logging',
        code: code(
          'import argparse, logging, re',
          '',
          'IPV4 = re.compile(r"\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b")',
          '',
          'def main():',
          '    parser = argparse.ArgumentParser(description="List unique IPs in a log")',
          '    parser.add_argument("logfile")',
          '    parser.add_argument("-v", "--verbose", action="store_true")',
          '    args = parser.parse_args()',
          '    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO)',
          '',
          '    with open(args.logfile) as f:',
          '        ips = {ip for line in f for ip in IPV4.findall(line)}',
          '    logging.info("found %d unique IPs", len(ips))',
          '    for ip in sorted(ips):',
          '        print(ip)',
          '',
          'if __name__ == "__main__":',
          '    main()',
        ),
        explanation: 'Run it with `python ips.py auth.log -v`; `python ips.py --help` documents itself.',
      },
    ],
    cheatSheet: [
      ['requests.get(url, timeout=5)', 'HTTP call; always set a timeout'],
      ['2xx / 3xx / 4xx / 5xx', 'Success / redirect / client error / server error'],
      ['subprocess.run([...])', 'Run a command; pass arguments as a list'],
      ['shell=True + user input', 'Command injection risk'],
      ['re + r"..."', 'Regular expressions; raw strings keep backslashes'],
      ['csv.DictReader', 'Rows as dicts keyed by header'],
      ['os.environ["KEY"]', 'Secrets from the environment, never in code'],
      ['argparse / logging', 'CLI options with --help / levelled diagnostics'],
      ['paramiko / netmiko', 'SSH to servers / network devices'],
    ],
  },

  'py-concurrency': {
    overview: [
      'Scanning a /16, pulling data from 500 APIs or hashing a disk image all hit the same wall: doing things one at a time is slow. Concurrency helps, but only if you pick the right tool for the kind of work.',
      'This lesson explains the GIL, when to use threads, processes or asyncio, how race conditions happen, and how to measure and fix performance with profiling, the right data structures, caching and streaming.',
    ],
    learn: [
      {
        heading: 'The GIL and the two kinds of work',
        body: [
          'CPython has a Global Interpreter Lock (GIL): only one thread runs Python bytecode at a time. CPython 3.13 and later also offer an experimental free-threaded build without it, but the default build still has the GIL.',
          'I/O-bound work (network requests, disk reads, database calls) spends most of its time waiting, and threads release the GIL while waiting. Threads or `asyncio` therefore speed it up well.',
          'CPU-bound work (hashing, compression, number crunching) is limited by the GIL, so use `multiprocessing` or `ProcessPoolExecutor`: separate processes each have their own interpreter and GIL, so they use multiple cores.',
        ],
      },
      {
        heading: 'Threads, processes and asyncio in practice',
        body: [
          '`concurrent.futures.ThreadPoolExecutor` gives a pool of worker threads with a simple `submit`/`map` API; `ProcessPoolExecutor` offers the same API with processes. Start with these before reaching for lower-level modules.',
          '`asyncio` runs many tasks on one thread with an event loop. Inside an `async def`, `await` suspends that coroutine until the awaited operation finishes, and the loop runs other tasks meanwhile. It scales to thousands of concurrent connections, but every library in the path must be async-aware.',
        ],
      },
      {
        heading: 'Race conditions',
        body: [
          'A race condition is when the outcome depends on the unpredictable timing of concurrent access to shared state, for example two threads both reading a counter, adding one, and writing it back. Protect shared state with a `threading.Lock`, or better, avoid sharing: have workers return results and combine them at the end.',
        ],
      },
      {
        heading: 'Measure, then optimise',
        body: [
          'Profile before changing anything: `python -m cProfile -s cumtime script.py` shows where time actually goes. The fix is often a data structure, not concurrency. `x in my_set` is O(1) on average while `x in my_list` is O(n), so converting a list to a set can turn minutes into milliseconds.',
          '`functools.lru_cache` memoises a pure function\'s results for repeated arguments. For big inputs, stream with generators: iterating over a file object reads it line by line, so a 10 GB log never has to fit in memory.',
        ],
      },
    ],
    examples: [
      {
        title: 'I/O-bound: check many URLs with a thread pool',
        code: code(
          'from concurrent.futures import ThreadPoolExecutor',
          'import requests',
          '',
          'def status(url):',
          '    try:',
          '        return url, requests.head(url, timeout=5).status_code',
          '    except requests.RequestException as e:',
          '        return url, type(e).__name__',
          '',
          'urls = ["https://example.com", "https://python.org"]',
          'with ThreadPoolExecutor(max_workers=20) as pool:',
          '    for url, result in pool.map(status, urls):',
          '        print(url, result)',
        ),
        explanation: 'Workers return results instead of writing to shared state, so no lock is needed.',
      },
      {
        title: 'CPU-bound: hash files on every core',
        code: code(
          'from concurrent.futures import ProcessPoolExecutor',
          'import hashlib, pathlib',
          '',
          'def sha256(path):',
          '    h = hashlib.sha256()',
          '    with open(path, "rb") as f:',
          '        for chunk in iter(lambda: f.read(1 << 20), b""):',
          '            h.update(chunk)',
          '    return path.name, h.hexdigest()',
          '',
          'if __name__ == "__main__":',
          '    files = list(pathlib.Path("evidence").glob("*"))',
          '    with ProcessPoolExecutor() as pool:',
          '        for name, digest in pool.map(sha256, files):',
          '            print(digest, name)',
        ),
        explanation: 'The `__main__` guard is required for process pools on Windows and macOS.',
      },
    ],
    cheatSheet: [
      ['GIL', 'One thread runs Python bytecode at a time (CPython)'],
      ['I/O-bound', 'Threads or asyncio'],
      ['CPU-bound', 'multiprocessing / ProcessPoolExecutor'],
      ['await', 'Suspend this coroutine; the loop runs others'],
      ['Race condition', 'Result depends on timing; use locks or avoid sharing'],
      ['cProfile', 'Find where the time goes before optimising'],
      ['x in set', 'O(1) average (list is O(n))'],
      ['lru_cache', 'Memoise repeated calls'],
      ['Generators / file iteration', 'Stream big data line by line'],
    ],
  },

  'py-testing-packaging': {
    overview: [
      'A tool other people rely on needs tests that prove it works, a clean way to install it, and dependencies you can trust. Supply-chain attacks against PyPI are real, and untested security tooling fails exactly when it matters.',
      'This lesson covers pytest, fixtures and mocking, coverage, modern packaging with `pyproject.toml` and lock files, and the security checks every Python project should run.',
    ],
    learn: [
      {
        heading: 'Testing with pytest',
        body: [
          'pytest is the most widely used Python test framework. Tests are plain functions named `test_*` that use ordinary `assert` statements, and pytest explains exactly what differed when one fails. `@pytest.mark.parametrize` runs one test over many inputs.',
          'A fixture is reusable setup code that pytest injects into any test that names it as a parameter. A fixture can `yield` its value and run teardown code after the test finishes.',
          'Mocking replaces a real dependency with a controllable fake. `unittest.mock.patch` stops tests from calling real APIs, databases or clocks, which keeps them fast and repeatable.',
        ],
      },
      {
        heading: 'Coverage',
        body: [
          'Coverage measures which lines or branches your tests executed. High coverage does not prove the code is correct, since a test can run a line without checking its result, but low coverage clearly shows the blind spots.',
        ],
      },
      {
        heading: 'Packaging and reproducible installs',
        body: [
          '`pyproject.toml` is the modern standard file for package metadata and build configuration (PEP 517, 518 and 621), replacing most uses of `setup.py`.',
          'A lock file pins the exact version of every dependency, including indirect ones, so installs are reproducible and a compromised new release cannot slip in unnoticed. Tools such as uv, poetry and pip-tools generate them.',
        ],
      },
      {
        heading: 'Security checks',
        body: [
          '`pip-audit` checks installed packages against the Python Packaging Advisory Database of known vulnerabilities. Typosquatting is a supply-chain attack where malicious packages use names close to popular ones (`reqeusts` instead of `requests`), so check names and publishers.',
          'Bandit is a static security linter (SAST) for Python. It flags insecure patterns such as `eval`, `shell=True` and hard-coded secrets; run it in CI. Never call `eval()` on user input: it executes arbitrary code. Use `ast.literal_eval` to safely parse Python literals.',
        ],
      },
    ],
    examples: [
      {
        title: 'Fixtures, parametrise and mocking',
        code: code(
          '# test_scanner.py',
          'import pytest',
          'from unittest.mock import patch',
          'from scanner import is_valid_port, fetch_banner',
          '',
          '@pytest.mark.parametrize("port,ok", [(22, True), (0, False), (70000, False)])',
          'def test_is_valid_port(port, ok):',
          '    assert is_valid_port(port) is ok',
          '',
          '@pytest.fixture',
          'def fake_socket():',
          '    with patch("scanner.socket.create_connection") as conn:',
          '        conn.return_value.recv.return_value = b"SSH-2.0-OpenSSH_9.6"',
          '        yield conn',
          '',
          'def test_fetch_banner(fake_socket):',
          '    assert fetch_banner("10.0.0.1", 22).startswith("SSH-2.0")',
        ),
        explanation: 'Assumes `fetch_banner` calls `socket.create_connection(...)` and then `.recv()`. No real network traffic: the fixture patches the socket call, and teardown happens after `yield`.',
      },
      {
        title: 'Quality gate for CI',
        code: code(
          'pytest --cov=scanner --cov-report=term-missing',
          'pip-audit',
          'bandit -r scanner/',
        ),
        explanation: 'Run all three on every pull request: tests with coverage, known-vulnerable dependencies, insecure code patterns.',
      },
    ],
    cheatSheet: [
      ['pytest', 'Plain assert, fixtures, parametrize'],
      ['Fixture', 'Injected setup; yield for teardown'],
      ['mock.patch', 'Swap a real dependency for a fake'],
      ['Coverage', 'What ran, not whether it is correct'],
      ['pyproject.toml', 'Modern package metadata (PEP 621)'],
      ['Lock file', 'Exact pinned versions for reproducible installs'],
      ['pip-audit', 'Known-vulnerable dependencies'],
      ['Typosquatting', 'Look-alike malicious package names'],
      ['Bandit', 'Python SAST: eval, shell=True, secrets'],
      ['eval(user_input)', 'Arbitrary code execution; use ast.literal_eval'],
    ],
  },

  'py-security-tools': {
    overview: [
      'Security teams build small tools constantly: a port checker, a hash verifier, a log summariser. Python\'s standard library covers most of it, and a few well-known libraries fill the gaps, but only if you use the security-sensitive parts correctly.',
      'This lesson covers sockets, hashing and password storage, secure randomness, the cryptography library, constant-time comparison, packet crafting, pandas for log analysis, SQL injection prevention, and the ethics of testing.',
    ],
    learn: [
      {
        heading: 'Networking and integrity',
        body: [
          'The `socket` module opens raw TCP and UDP connections. `socket.create_connection((host, port), timeout=2)` succeeding means the port is open, which is the basis of a simple port check. Scapy crafts and sniffs arbitrary packets for deeper protocol work.',
          '`hashlib` computes digests: `hashlib.sha256(data).hexdigest()` produces the fingerprint you compare against a vendor\'s published hash to verify a download or preserve evidence integrity.',
        ],
      },
      {
        heading: 'Passwords, tokens and encryption',
        body: [
          'Never store passwords with a fast hash like plain SHA-256: attackers can try billions of guesses per second. Use a slow, salted algorithm designed for passwords: bcrypt, scrypt or Argon2.',
          'Generate tokens, API keys and passwords with the `secrets` module. The `random` module is predictable and must never be used for security values.',
          'For encryption, use the `cryptography` library. Its Fernet recipe gives authenticated symmetric encryption with sensible defaults, so you do not have to assemble primitives yourself.',
          'When comparing secrets such as tokens or HMACs, use `hmac.compare_digest(a, b)`. A normal `==` stops at the first differing character, and that timing difference can leak the secret byte by byte.',
        ],
      },
      {
        heading: 'Data and databases',
        body: [
          'pandas is the standard library for tabular analysis: `pd.read_csv("auth.csv")` then `groupby` and `value_counts` summarise thousands of log rows in a line or two.',
          'Prevent SQL injection with parameterised queries: `cursor.execute("SELECT * FROM users WHERE name = ?", (name,))`. The driver sends the value separately from the SQL, so input can never change the query. Never build SQL with f-strings or concatenation.',
        ],
      },
      {
        heading: 'Authorisation first',
        body: [
          'Scanning or probing systems you do not own or have written permission to test can be illegal, and it violates professional codes of ethics such as ISC2\'s. Get a written scope before running any of these tools against anything but your own lab.',
        ],
      },
    ],
    examples: [
      {
        title: 'A minimal, polite port check',
        code: code(
          'import socket',
          '',
          'def is_open(host, port, timeout=2.0):',
          '    try:',
          '        with socket.create_connection((host, port), timeout=timeout):',
          '            return True',
          '    except OSError:',
          '        return False',
          '',
          '# Only against hosts you are authorised to test',
          'for port in (22, 80, 443):',
          '    print(port, is_open("127.0.0.1", port))',
        ),
        explanation: 'A timeout keeps it fast, and the `with` block closes each connection immediately.',
      },
      {
        title: 'Tokens, constant-time checks and safe SQL',
        code: code(
          'import hmac, secrets, sqlite3',
          '',
          'token = secrets.token_urlsafe(32)            # not random.random()',
          '',
          'def token_ok(supplied: str) -> bool:',
          '    return hmac.compare_digest(supplied, token)',
          '',
          'db = sqlite3.connect("users.db")',
          'name = input("user: ")',
          'rows = db.execute("SELECT id, role FROM users WHERE name = ?", (name,)).fetchall()',
        ),
        explanation: 'Secure randomness, constant-time comparison, and a parameterised query: three of the most common fixes in real code reviews.',
      },
    ],
    cheatSheet: [
      ['socket.create_connection', 'TCP connect with a timeout: port check'],
      ['hashlib.sha256', 'File and evidence integrity'],
      ['bcrypt / scrypt / Argon2', 'Password storage (slow, salted)'],
      ['secrets', 'Tokens and passwords (never random)'],
      ['cryptography (Fernet)', 'Authenticated symmetric encryption'],
      ['hmac.compare_digest', 'Constant-time secret comparison'],
      ['Scapy', 'Craft and sniff packets (authorised networks only)'],
      ['pandas', 'read_csv, groupby: fast log summaries'],
      ['execute(sql, (value,))', 'Parameterised query: stops SQL injection'],
    ],
  },
};
