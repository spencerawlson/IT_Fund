# Go Basics & Tooling: One Binary, No Runtime — Avatar Tutor Script

**Lesson ID:** go-basics
**Track:** Go Programming
**Estimated runtime:** ~5 minutes (~670 words)

## Spoken script

**[HOOK — 0:00]**
Imagine shipping your program as a single file. No runtime to install, no
interpreter on the target machine, no dependency chase on a fresh server.
Drop the binary in a container and it runs. That is Go's party trick — and
it is the reason a huge slice of the internet's infrastructure is written in
it.

**[WHY IT MATTERS — ~0:25]**
Go was born at Google out of frustration: huge C++ codebases and painfully
slow builds. The answer was a radical idea — simplicity is a feature. A
small language with one obvious way to do things scales better across teams
and years than a maximally expressive one. That philosophy shapes every line
you will write, so learn it first and the rest feels inevitable.

**[SECTION — One binary, no runtime — ~0:50]**
A Go program starts with package main and a func main() entry point, and
compiles into one self-contained, statically-linked executable. Think of it
as a packed lunch versus needing a kitchen: the same binary runs on your
laptop, in CI, and in a scratch container with nothing else installed. That
property alone explains Go's conquest of infrastructure.

During development, go run main.go compiles and executes in one step without
keeping the binary — fast feedback. go build produces the reusable artifact
you actually ship. Different jobs, different commands: run to experiment,
build to deploy.

Printing is the standard library's job: fmt.Println("text"), after importing
"fmt". Now note the capitalisation — it is not stylistic. In Go, an
uppercase first letter marks a name as exported, meaning public; lowercase
names are package-private. The language has no public keyword at all.
Visibility is a naming convention the compiler enforces. Think of capitals
as name badges worn outside the room: Println is introduced to strangers,
while a lowercase helper stays inside.

**[SECTION — Modules and the go command — ~2:35]**
Modern Go organises code in modules. go mod init <module-path> creates
go.mod, which records the module path, the Go version, and your
dependencies; go.sum pins their cryptographic hashes. Think of the pair as a
recipe card with exact fingerprints for every ingredient — anyone building
your code gets precisely what you used.

go mod tidy keeps both files honest, adding what is missing and dropping
what is unused, while go get fetches a specific dependency. It is a small,
predictable surface — deliberately so. Go's tooling does a few things
flawlessly rather than many things adequately. Small, predictable, boring
in the best way: you can learn the entire module workflow in an afternoon
and never be surprised by it again.

**[SECTION — The Go way: simplicity, enforced — ~3:40]**
Go's most opinionated choices are enforced by the compiler, not suggested by
a style guide. gofmt — run as go fmt — rewrites your code to the single
canonical format. Formatting debates simply do not exist in Go shops. Imagine
never arguing about brace placement again, because the tool already decided.

An unused import or an unused local variable is a compile error, not a
warning you can ignore. The language would rather annoy you now than let
dead code accumulate silently. Few keywords, no inheritance, no implicit
conversions, built-in concurrency: the design thesis is that one obvious way
to do things beats ten clever ones, especially when the codebase outlives
its authors.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: leaving an unused import while experimenting — Go refuses
to compile, and newcomers read it as breakage when it is really hygiene.
Two: naming something lowercase and expecting another package to use it —
lowercase is package-private; exported names start uppercase. Three: using
go run to ship — it compiles and runs in one step but keeps no binary; go
build is the artifact you deploy.

**[RECAP — ~5:05]**
Go compiles to a single, statically-linked native binary — no runtime, no
interpreter, no dependency chase. package main plus func main() is the entry
point; go run experiments, go build ships. Uppercase names are exported,
lowercase names are package-private — there is no public keyword. go mod
init starts a module, go.mod and go.sum track dependencies, go mod tidy
keeps them honest. gofmt enforces the one true format, unused imports are
compile errors, and the whole language bets that simplicity scales.

## On-screen visuals

- HOOK: a single binary file dropped onto a server, a laptop, and a
  container — running in all three.
- WHY IT MATTERS: "simplicity is a feature" as the design thesis card.
- SECTION — One binary, no runtime: package main + func main() entry;
  go run vs go build comparison; Println with its capital P wearing a
  "public" badge, a lowercase name staying inside the package.
- SECTION — Modules and the go command: go.mod and go.sum as a recipe card
  with dependency fingerprints; go mod tidy cleaning the list.
- SECTION — The Go way: simplicity, enforced: gofmt normalising messy code;
  an unused import flagged as a compile error, not a warning.
- COMMON MISTAKES: three trap cards — the unused import error, a lowercase
  name used across packages, go run with "no binary kept".
- RECAP: the cheat-sheet terms rendered as a clean summary card.
