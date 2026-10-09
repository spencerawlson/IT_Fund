// Reading content for the Go Programming course, keyed by lesson (deck) id.
// Strings support `inline code` only. Every section is aligned with the lesson's questions in
// src/data/academy/go.js, so reading first prepares you for the practice.

const code = (...lines) => lines.join('\n');

export default {
  'go-basics': {
    overview: [
      'Go is a compiled language built around a radical idea: simplicity is a feature. Born at Google out of frustration with the complexity of large C++ codebases and slow build times, it compiles to a single, statically-linked native binary — no runtime, no interpreter, no dependency hell on the target machine. Drop the binary on a server or into a container and it runs.',
      'This lesson covers what Go is, the module system and the `go` command, and the design philosophy — one obvious way to do things, enforced by the toolchain — that shapes every line you will write.',
    ],
    learn: [
      {
        heading: 'One binary, no runtime',
        body: [
          'A Go program starts with `package main` and a `func main()` entry point, and compiles into one self-contained executable. That property alone explains Go\u2019s conquest of infrastructure: the same binary runs on your laptop, in CI, and in a scratch container with nothing else installed. During development, `go run main.go` compiles and executes in one step without keeping the binary; `go build` produces the reusable artifact you actually ship.',
          'Printing is the standard library\u2019s job: `fmt.Println("text")`, after importing `"fmt"`. Note the capitalization — it is not stylistic. In Go, an uppercase first letter marks a name as exported (public); lowercase names are package-private. The language has no `public` keyword at all; visibility is a naming convention the compiler enforces.',
        ],
      },
      {
        heading: 'Modules and the go command',
        body: [
          'Modern Go organizes code in modules. `go mod init <module-path>` creates `go.mod`, which records the module path, the Go version, and your dependencies; `go.sum` pins their cryptographic hashes. `go mod tidy` keeps both files honest, adding what is missing and dropping what is unused, while `go get` fetches a specific dependency. It is a small, predictable surface — deliberately so.',
        ],
      },
      {
        heading: 'The Go way: simplicity, enforced',
        body: [
          'Go\u2019s most opinionated choices are enforced by the compiler, not suggested by a style guide. `gofmt` (run as `go fmt`) rewrites your code to the single canonical format — formatting debates simply do not exist in Go shops. An unused import or an unused local variable is a compile error, not a warning you can ignore; the language would rather annoy you now than let dead code accumulate. Few keywords, no inheritance, no implicit conversions, built-in concurrency: the design thesis is that a small language with one obvious way to do things scales better across teams and years than a maximally expressive one.',
        ],
      },
    ],
    cheatSheet: [
      ['package main + func main()', 'Entry point of an executable program'],
      ['go run main.go', 'Compile and run in one step (no binary kept)'],
      ['go build', 'Produce a reusable, statically-linked binary'],
      ['go mod init <path>', 'Start a module (creates go.mod)'],
      ['go mod tidy', 'Add missing / remove unused dependencies'],
      ['gofmt / go fmt', 'The one canonical formatting — no debates'],
      ['Unused import/variable', 'Compile error, not a warning'],
      ['Uppercase first letter', 'Exported (public); lowercase is package-private'],
    ],
    examples: [
      {
        title: 'The smallest Go program',
        code: code(
          'package main',
          '',
          'import "fmt"',
          '',
          'func main() {',
          '    fmt.Println("Hello, cloud.")',
          '}',
        ),
      },
    ],
  },

  'go-types': {
    overview: [
      'Go\u2019s type system is deliberately boring — and that is a compliment. Declarations come in two flavors, every type has a zero value so nothing is ever \u201Cuninitialized,\u201D and the compiler refuses to silently convert between numeric types. Boring, here, means predictable: code does what it says, on every machine, every time.',
      'This lesson covers declarations, zero values, the lack of implicit conversion, text types, and constants.',
    ],
    learn: [
      {
        heading: 'Declaration in two flavors',
        body: [
          'Inside functions, `x := 5` declares and initializes in one stroke, inferring the type — the short variable declaration you will use most. At package level, or when you want an explicit type or a zero value, the `var` form takes over: `var x int` or `var x int = 5`. Both are statically typed; Go simply lets you skip writing what the compiler can see.',
          'What Go will not do is guess across types. Assigning an `int` where a `float64` is expected is a compile error — conversions are always explicit, as in `float64(i)`. It reads as ceremony until the day it catches a precision bug that a silently-converting language would have shipped.',
        ],
      },
      {
        heading: 'Every type starts somewhere: zero values',
        body: [
          'Every Go type has a zero value, and uninitialized variables hold it: `0` for numbers, `""` for strings, `false` for booleans. There is no \u201Cundefined\u201D — `var s string` is the empty string, not nil, not garbage. Useful types are designed around this: a `bytes.Buffer` or `sync.Mutex` is ready to use the moment you declare it, no constructor required. Zero values are one of Go\u2019s quietest productivity features.',
        ],
      },
      {
        heading: 'Text, bytes, and constants',
        body: [
          'Strings are immutable sequences of bytes — build them with `strings.Builder` or convert to `[]byte` when you need to mutate. The `byte` type is an alias for `uint8`; a `rune` is an alias for `int32` holding a Unicode code point, which is what `range` yields when you iterate a string. One sharp edge: `len(s)` counts bytes, not runes, so multibyte UTF-8 text needs `utf8.RuneCountInString`. Constants are declared with `const` (compile-time only, no `:=`, cannot take their address), and `iota` generates successive integer constants inside a `const` block — the idiomatic way to write enumerations.',
        ],
      },
    ],
    cheatSheet: [
      ['x := 5', 'Short declaration (functions only), type inferred'],
      ['var x int', 'Explicit declaration; starts at the zero value'],
      ['Zero values', '0, "", false — never "undefined"'],
      ['float64(i)', 'Conversions are always explicit — no implicit mixing'],
      ['byte = uint8', 'A single byte'],
      ['rune = int32', 'A Unicode code point'],
      ['const Pi = 3.14', 'Compile-time constant (no :=, not addressable)'],
      ['iota', 'Successive constants in a const block (0, 1, 2\u2026)'],
      ['len(s)', 'Byte count of a string, not rune count'],
    ],
  },

  'go-control-functions': {
    overview: [
      'Go takes minimalism seriously in control flow: there is exactly one loop keyword, `switch` does not fall through, and functions can return multiple values — a small feature with enormous consequences, because it underpins the entire error-handling model. Less syntax to learn, fewer ways to be surprised.',
      'This lesson covers the single `for`, expressive `switch`, multiple returns, and `defer` — Go\u2019s elegant answer to cleanup.',
    ],
    learn: [
      {
        heading: 'One loop, many shapes',
        body: [
          '`for` is the only loop, and it wears three hats: the classic `for i := 0; i < n; i++`, the while-style `for condition { ... }` (just drop the init and post clauses), and the infinite `for { ... }`. One keyword to learn, zero ambiguity about which construct fits. `switch` is similarly streamlined: cases do not fall through to the next one (unlike C), so the `break` you would write defensively elsewhere is unnecessary — and the rare intentional fallthrough uses an explicit `fallthrough` keyword. A `switch` with no condition at all reads its cases as boolean expressions, giving you a cleaner if/else-if chain.',
        ],
      },
      {
        heading: 'Functions that say more',
        body: [
          'Go functions may return multiple values — `func div(a, b int) (int, error)` — and that single capability shapes the whole language: the second return is conventionally the error, checked explicitly by every caller. Parameters can be named in the signature, which pre-initializes them to zero values and lets a bare `return` hand back their current state. Variadic functions (`func sum(nums ...int)`) accept any number of arguments, received inside as a slice. And when a function returns something you do not need, the blank identifier `_` discards it visibly: `v, _ := f()`. Nothing is silently dropped.',
        ],
      },
      {
        heading: 'Defer: cleanup you cannot forget',
        body: [
          '`defer` schedules a call to run when the surrounding function returns — `defer f.Close()` right after opening a file, and the close happens no matter which return path executes. It is Go\u2019s answer to try/finally, minus the nesting. When several defers stack up, they run last-in, first-out: the most recently deferred call executes first, which mirrors how nested resources should unwind. Used well, `defer` makes resource leaks structurally difficult.',
        ],
      },
    ],
    cheatSheet: [
      ['for', 'The only loop: classic, while-style, and infinite forms'],
      ['switch (no condition)', 'Acts as an if/else-if chain'],
      ['No fallthrough by default', 'Each case breaks automatically'],
      ['(result, error)', 'Multiple returns — the basis of Go error handling'],
      ['defer f.Close()', 'Runs at function return; great for cleanup'],
      ['LIFO', 'Multiple defers run in reverse declaration order'],
      ['func sum(nums ...int)', 'Variadic: variable argument count'],
      ['_', 'Blank identifier: visibly discard a value'],
    ],
    examples: [
      {
        title: 'Defer and multiple returns',
        code: code(
          'func readFirst(path string) (string, error) {',
          '    f, err := os.Open(path)',
          '    if err != nil {',
          '        return "", err',
          '    }',
          '    defer f.Close()   // runs when readFirst returns, any path',
          '',
          '    buf := make([]byte, 64)',
          '    n, _ := f.Read(buf)   // _ discards the second return',
          '    return string(buf[:n]), nil',
          '}',
        ),
      },
    ],
  },

  'go-collections': {
    overview: [
      'Go\u2019s data structures are few and opinionated: arrays are fixed-size values, slices are the dynamic views you actually use, and maps are the built-in hash tables. The `range` loop ties them together — with semantics precise enough that misunderstanding them is a rite of passage worth skipping.',
      'This lesson covers arrays versus slices, growing with `append`, `len` versus `cap`, maps and the comma-ok idiom, and what `range` really hands you.',
    ],
    learn: [
      {
        heading: 'Arrays are fixed; slices are the workhorse',
        body: [
          'An array\u2019s length is part of its type — `[4]int` and `[5]int` are different types — which makes arrays precise but rigid. Slices are what you use almost everywhere: dynamic, cheap views into a backing array. Growing one is `append`, and the critical detail is that `append` may allocate a new backing array, so you must assign the result back: `s = append(s, v)`. Forgetting the assignment is the classic beginner bug.',
          'Two numbers describe a slice: `len` (elements it holds) and `cap` (backing-array space available from the slice\u2019s start). `make([]int, 0, 10)` creates an empty slice pre-sized with capacity 10 — length zero, no wasted reallocations as you append. Pre-sizing when you know the rough size is one of the cheapest performance wins in Go.',
        ],
      },
      {
        heading: 'Maps and the comma-ok idiom',
        body: [
          'Maps come from `make(map[string]int)` or a literal, and reading a missing key returns the value type\u2019s zero value rather than an error — convenient, but ambiguous when zero is a legitimate stored value. The comma-ok idiom resolves it: `v, ok := m[key]` sets `ok` true only if the key exists. Deleting is `delete(m, key)` (a no-op when absent). And one more thing to internalize early: ranging over a map visits keys in a deliberately randomized order, so sort the keys whenever determinism matters.',
        ],
      },
      {
        heading: 'Range: know what you are holding',
        body: [
          '`for i, v := range s` gives you the index and a copy of each element — a copy, which means assigning to `v` changes nothing in the slice; mutate through `s[i]` instead. Over a map, `range` yields key and value pairs. These semantics are simple once stated and endlessly confusing until they are, so state them once more: `v` is a copy. Index to mutate.',
        ],
      },
    ],
    cheatSheet: [
      ['[4]int vs []int', 'Fixed-size array (length in type) vs dynamic slice'],
      ['s = append(s, v)', 'Grow a slice — always assign the result back'],
      ['len vs cap', 'Elements held vs backing-array space'],
      ['make([]int, 0, 10)', 'Empty slice pre-sized to capacity 10'],
      ['v, ok := m[k]', 'Comma-ok: distinguishes missing key from stored zero'],
      ['delete(m, k)', 'Remove a key (no-op if absent)'],
      ['for i, v := range s', 'Index + a COPY of each element'],
      ['Map iteration order', 'Randomized — sort keys for determinism'],
    ],
    examples: [
      {
        title: 'Slices, maps, and the comma-ok idiom',
        code: code(
          's := make([]int, 0, 4)',
          's = append(s, 1, 2)          // assign back: append may reallocate',
          '',
          'counts := map[string]int{}',
          'counts["go"]++',
          'if v, ok := counts["rust"]; ok {',
          '    fmt.Println("seen:", v)  // ok is false: key absent',
          '}',
        ),
      },
    ],
  },

  'go-structs-interfaces': {
    overview: [
      'Go has no classes and no inheritance — a deliberate omission, not a missing feature. Structs bundle named fields, methods attach via receivers, and reuse comes from composition: embedding one type inside another. Polymorphism arrives through interfaces, satisfied implicitly — if your type has the methods, it qualifies, no declaration required.',
      'This lesson covers structs and methods, value versus pointer receivers, implicit interfaces, embedding, and the empty interface.',
    ],
    learn: [
      {
        heading: 'Structs plus methods',
        body: [
          'A struct is a typed collection of named fields — data, nothing more. Behavior attaches through methods, declared with a receiver before the function name: `func (r Rectangle) Area() float64`. The receiver choice matters: a value receiver operates on a copy, while a pointer receiver (`func (r *Rectangle) Grow()`) can modify the original and avoids copying large structs. The rule of thumb is simple — if the method mutates, or the struct is large, use a pointer receiver.',
          'Inheritance\u2019s job is done by embedding: place one struct inside another and its fields and methods are promoted, callable as if defined on the outer type. It is composition with syntactic sugar — you assemble bigger behaviors from smaller ones instead of building class hierarchies. Go\u2019s designers considered deep inheritance trees a liability, and the language simply does not offer them.',
        ],
      },
      {
        heading: 'Interfaces, satisfied by structure',
        body: [
          'An interface lists method signatures, and a type satisfies it implicitly — there is no `implements` keyword, no registration step. If it has the methods, it qualifies. This structural typing keeps dependencies minimal: define small interfaces (often a single method, like `io.Reader` or `io.Writer`) at the point of use, and any type in any package that happens to match can plug in. To recover a concrete type from an interface value, use a type assertion — `v, ok := i.(MyType)` — or a type switch when several cases are possible.',
          'The empty interface, `interface{}` (modern alias `any`), is satisfied by every value. It is the escape hatch for genuinely heterogeneous data, but idiomatic Go reaches for concrete types or generics first — `any` everywhere is a design smell. And note the zero values: interfaces and pointers both start as `nil`, and calling a method on a nil interface panics. Nil is honest about being nothing; it just refuses to pretend otherwise.',
        ],
      },
    ],
    cheatSheet: [
      ['struct', 'Typed collection of named fields (no classes)'],
      ['func (r T) M() / func (r *T) M()', 'Value receiver (copy) vs pointer receiver (can mutate)'],
      ['Embedding', 'Composition: inner type\u2019s fields/methods promoted'],
      ['Implicit satisfaction', 'No implements keyword — methods alone qualify a type'],
      ['Small interfaces', 'Prefer one-method interfaces defined where used'],
      ['i.(T) / type switch', 'Recover the concrete type from an interface'],
      ['interface{} / any', 'Satisfied by every value — use sparingly'],
      ['nil', 'Zero value of interfaces and pointers'],
    ],
    examples: [
      {
        title: 'Implicit interfaces in action',
        code: code(
          'type Speaker interface { Speak() string }',
          '',
          'type Dog struct{ Name string }',
          'func (d Dog) Speak() string { return "woof" }',
          '// Dog satisfies Speaker implicitly — no declaration needed',
          '',
          'func announce(s Speaker) { fmt.Println(s.Speak()) }',
        ),
      },
    ],
  },

  'go-errors': {
    overview: [
      'Go famously has no exceptions. Instead, fallible functions return their error as an ordinary value — conventionally the last return — and callers check it, explicitly, every time. It is verbose by design: the language would rather make error handling visible than let failures hide behind invisible control flow.',
      'This lesson covers the error value pattern, creating and wrapping errors, inspecting chains with `errors.Is`/`errors.As`, and where `panic` actually belongs.',
    ],
    learn: [
      {
        heading: 'Errors are values, not exceptions',
        body: [
          'The core pattern is three lines you will write ten thousand times: call, check, handle. `if err != nil { return err }`. An error is anything implementing the tiny `error` interface — a single method, `Error() string` — created with `errors.New("message")` or formatted with `fmt.Errorf`. Because errors are just values, they flow through the same channels as data: returned, wrapped, logged, compared. And because handling is explicit, ignoring one is a visible choice — `_ = f()` announces the decision rather than hiding it. Silent failures, the cards warn, are what you get when a language lets you forget.',
        ],
      },
      {
        heading: 'Wrapping and inspecting error chains',
        body: [
          'Real programs add context as errors travel upward, and Go\u2019s `%w` verb in `fmt.Errorf("open config: %w", err)` wraps the underlying error so the chain stays inspectable. Two functions then do the interrogation: `errors.Is(err, target)` asks whether anything in the chain matches a sentinel error (the right way to compare, since direct equality breaks across wrapping), and `errors.As(err, &target)` finds the first error of a given type and assigns it for closer inspection. Together they replace the fragile habit of string-matching error messages.',
        ],
      },
      {
        heading: 'Panic is not error handling',
        body: [
          'Then there is `panic` — and the discipline around it is absolute. Panic is for the truly exceptional and usually unrecoverable: violated invariants, programmer bugs, impossible states. It unwinds the stack, running deferred calls along the way, which makes `recover()` — callable only inside a deferred function — the mechanism for turning a panic back into a returned error at a package boundary. Ordinary, foreseeable failures get returned as errors; panics are for when the program\u2019s assumptions are broken. Mixing the two up is the fastest way to write un-idiomatic Go.',
        ],
      },
    ],
    cheatSheet: [
      ['(value, error)', 'Errors returned as values, conventionally last'],
      ['if err != nil', 'The core explicit-handling pattern'],
      ['errors.New / fmt.Errorf', 'Create / format errors'],
      ['%w', 'Wrap an error, keeping the chain inspectable'],
      ['errors.Is(err, target)', 'Match a sentinel through the wrap chain'],
      ['errors.As(err, &t)', 'Extract the first error of a given type'],
      ['panic', 'Unrecoverable states only — never ordinary errors'],
      ['recover()', 'Stops unwinding, but only inside a deferred function'],
    ],
    examples: [
      {
        title: 'Wrap, then inspect',
        code: code(
          'if _, err := os.Open("app.toml"); err != nil {',
          '    return fmt.Errorf("load config: %w", err)',
          '}',
          '// later, at the call site:',
          'if errors.Is(err, os.ErrNotExist) {',
          '    // handle the missing-file case specifically',
          '}',
        ),
      },
    ],
  },

  'go-concurrency': {
    overview: [
      'Concurrency is Go\u2019s superpower and its calling card. Goroutines — lightweight threads managed by the runtime — make spawning thousands of concurrent tasks cheap, and channels give those tasks a disciplined way to talk. The guiding motto inverts the usual instinct: don\u2019t communicate by sharing memory; share memory by communicating.',
      'This lesson covers goroutines, channels (buffered and unbuffered), `select`, and the `sync` package\u2019s coordination primitives.',
    ],
    learn: [
      {
        heading: 'Goroutines: threads, minus the weight',
        body: [
          'A goroutine starts with a single keyword — `go someFunction()` — and costs roughly a few kilobytes of stack, multiplexed by the runtime scheduler onto a small pool of OS threads. Thousands can run concurrently without the overhead that makes OS threads precious. One caveat for newcomers: `main` does not wait. Launch a goroutine and return from `main`, and the program exits with it — coordination, covered below, is how you keep that from happening.',
        ],
      },
      {
        heading: 'Share memory by communicating',
        body: [
          'A channel is a typed conduit between goroutines: `ch <- v` sends, `v := <-ch` receives. An unbuffered channel (`make(chan int)`) blocks until sender and receiver meet — a rendezvous that synchronizes as well as transfers. A buffered channel (`make(chan int, 10)`) holds up to N values, letting the sender proceed until the buffer fills. The motto is a design principle, not a slogan: prefer passing values through channels over guarding shared variables with locks, and whole categories of reasoning about interleavings simply vanish.',
          '`select` is the other half of the model: it waits on multiple channel operations and proceeds with whichever is ready first, with an optional `default` case making it non-blocking. Timeouts, cancellation, fan-in from several producers — `select` is the construct behind all of them.',
        ],
      },
      {
        heading: 'Coordination primitives',
        body: [
          'Some problems still want the classic tools, and the `sync` package provides them. `sync.WaitGroup` counts goroutines down to zero (`Add`, `Done`, `Wait`) — the standard way to make `main` wait for its workers. `sync.Mutex` guards a critical section with `Lock`/`Unlock` (defer the unlock; forgetting is the classic bug). Get the coordination wrong and you meet the deadlock detector: if every goroutine is blocked with nobody left to unblock them, the runtime halts the program with \u201Call goroutines are asleep.\u201D And for the subtler bugs, the race detector (`go test -race`) instruments your program to flag unsynchronized concurrent access to shared memory — run it in CI and thank yourself later.',
        ],
      },
    ],
    cheatSheet: [
      ['go f()', 'Start a goroutine (lightweight, runtime-managed)'],
      ['ch <- v / v := <-ch', 'Send / receive on a channel'],
      ['make(chan int) vs make(chan int, N)', 'Unbuffered (rendezvous) vs buffered (holds N)'],
      ['Share memory by communicating', 'Prefer channels over shared, locked state'],
      ['select', 'Wait on multiple channels; default makes it non-blocking'],
      ['sync.WaitGroup', 'Add/Done/Wait — wait for goroutines to finish'],
      ['sync.Mutex', 'Lock/Unlock a critical section (defer the Unlock)'],
      ['go test -race', 'Race detector: flags unsynchronized shared access'],
    ],
    examples: [
      {
        title: 'Fan out, wait, collect',
        code: code(
          'var wg sync.WaitGroup',
          'results := make(chan int, 3)',
          '',
          'for i := 0; i < 3; i++ {',
          '    wg.Add(1)',
          '    go func(n int) {',
          '        defer wg.Done()',
          '        results <- n * n',
          '    }(i)',
          '}',
          'wg.Wait()          // all three goroutines finished',
          'close(results)',
        ),
      },
    ],
  },

  'go-stdlib-testing': {
    overview: [
      'Go ships with a standard library that other ecosystems would call a framework: HTTP servers and clients, JSON, cryptography, templating, and a testing toolchain — all in the box, all documented, all stable. It is a deliberate strategy: fewer third-party dependencies means fewer supply-chain surprises and code that still builds in five years.',
      'This lesson covers `net/http` and JSON, `context` for cancellation, the testing toolchain, and why this combination made Go the language of cloud-native infrastructure.',
    ],
    learn: [
      {
        heading: 'The standard library does the heavy lifting',
        body: [
          'A production-capable HTTP server is a few lines: `http.HandleFunc` registers a handler, `http.ListenAndServe` starts listening. JSON encoding is `json.Marshal` and `json.Unmarshal` from `encoding/json`, with struct tags controlling the mapping — `` `json:"name,omitempty"` `` renames a field and skips it when empty, and only exported (uppercase) fields are marshalled at all. For request-scoped values, deadlines, and cancellation, `context.Context` threads through API boundaries; `ctx.Done()` closes when the work should stop. These are not toy APIs — they run a significant fraction of the internet\u2019s backend services.',
        ],
      },
      {
        heading: 'Testing the Go way',
        body: [
          'Tests live in `*_test.go` files as `func TestXxx(t *testing.T)`, run with `go test`. The idiomatic style is the table-driven test: a slice of input/expected cases iterated with subtests via `t.Run`, which reads like a specification and grows gracefully. Benchmarks follow the same shape (`func BenchmarkXxx(b *testing.B)`, looping to `b.N` while the framework calibrates iterations), and `go test -cover` reports statement coverage. `go vet` adds a static pass for suspicious-but-legal constructs — wrong `Printf` verbs, unreachable code — catching what the compiler permits but a human would not.',
        ],
      },
      {
        heading: 'Why Go won cloud-native',
        body: [
          'Put the pieces together and the industry outcome makes sense. Static binaries deploy anywhere without a runtime. Builds take seconds, not minutes. Concurrency is a keyword, not a library. The standard library covers the networking and encoding that services need. Docker, Kubernetes, and Terraform are all written in Go — not by coincidence, but because the language\u2019s strengths map exactly onto what infrastructure software demands: fast to build, cheap to run, easy to operate.',
        ],
      },
    ],
    cheatSheet: [
      ['net/http', 'Servers (HandleFunc/ListenAndServe) and clients in the stdlib'],
      ['json.Marshal / Unmarshal', 'Encode/decode JSON'],
      ['`json:"name,omitempty"`', 'Struct tag: field mapping (exported fields only)'],
      ['context.Context', 'Deadlines, cancellation, request-scoped values'],
      ['*_test.go / TestXxx', 'Test files and functions; run with go test'],
      ['Table-driven tests', 'Slice of cases + t.Run subtests — the idiomatic style'],
      ['BenchmarkXxx / go test -bench', 'Benchmarks with calibrated iteration counts'],
      ['go vet', 'Static check for suspicious-but-legal code'],
      ['go test -cover', 'Statement coverage report'],
    ],
    examples: [
      {
        title: 'A server and a table-driven test',
        code: code(
          'http.HandleFunc("/hi", func(w http.ResponseWriter, r *http.Request) {',
          '    fmt.Fprintln(w, "hello")',
          '})',
          'http.ListenAndServe(":8080", nil)',
          '',
          'func TestAdd(t *testing.T) {',
          '    cases := []struct{ a, b, want int }{{1, 2, 3}, {-1, 1, 0}}',
          '    for _, c := range cases {',
          '        if got := c.a + c.b; got != c.want {',
          '            t.Errorf("got %d, want %d", got, c.want)',
          '        }',
          '    }',
          '}',
        ),
      },
    ],
  },
};
