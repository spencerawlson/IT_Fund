// Reading content for the Terraform track (src/data/academy/terraform.js).
// Keyed by deck id. Professional voice — narrative, precise, confident.

export default {
  'tf-iac-basics': {
    overview: [
      'Terraform turns infrastructure from something you click into something you write. Instead of provisioning servers, networks, and databases by hand through a console, you describe the infrastructure you want in configuration files — and Terraform builds it, keeps it, and changes it for you.',
      'This lesson covers what Infrastructure as Code means, why Terraform\'s declarative model wins over imperative scripting, the HCL language it speaks, and the providers, resources, and state files that make the whole machine turn.',
    ],
    learn: [
      {
        heading: 'From clicks to code',
        body: [
          'Every infrastructure has two possible futures: documented in someone\'s memory, or documented in a repository. Infrastructure as Code — IaC — is the discipline of managing servers, networks, storage, and services through machine-readable configuration files, versioned and peer-reviewed like application code. When an environment breaks at 2 AM, the fix is not a heroic console session; it is a pull request.',
          'The payoff is repeatability. A configuration that builds staging can build production, because the description is the same and the machine follows it faithfully. Environments stop drifting from each other. Changes get reviewed before they happen, rolled back when they misbehave, and audited long after. The platform knowledge still matters — IaC does not absolve you of understanding the cloud — but it turns that knowledge into an artifact the whole team can read.',
        ],
      },
      {
        heading: 'Declarative: describe the destination, not the drive',
        body: [
          'Terraform is declarative. You write down the desired end state — this VPC, these subnets, that database — and Terraform computes the steps to get there. You say *what*; the tool figures out *how*. This is the opposite of an imperative script, which lists every command in order and breaks the moment reality diverges from the script\'s assumptions.',
          'The payoff is idempotence: applying the same configuration twice converges on the same result, with the second run changing nothing. A script that creates a bucket will fail if the bucket already exists; a Terraform configuration that describes a bucket simply ensures it is there. That property is what makes Terraform safe to run continuously — in CI, on a schedule, by many people — without fear of double-applying side effects.',
          'Terraform speaks HCL, the HashiCorp Configuration Language: human-readable, block-structured, forgiving to read and write. Every file ending in .tf in a directory is loaded and merged into one configuration, so you can split a large environment across main.tf, networking.tf, and variables.tf purely for your own sanity. The machine does not care; it sees one graph.',
        ],
      },
      {
        heading: 'Providers, resources, and the state file',
        body: [
          'Terraform itself knows nothing about AWS, Azure, or DNS. All platform knowledge lives in providers — plugins that translate Terraform\'s generic operations into real API calls. A provider block configures credentials and region; the resources beneath it are the actual objects you manage, each described in a resource block with a type and a local name. An aws_instance named "web" becomes the address aws_instance.web, and from there it can be referenced anywhere.',
          'Terraform remembers what it built in a state file, terraform.tfstate. State is the mapping between your configuration and the real world: this resource block corresponds to that instance ID in that account. It is why a second apply is a no-op, why Terraform can show you a plan before acting, and why it must be protected — state contains secrets and the full topology of your infrastructure.',
        ],
      },
    ],
    examples: [
      {
        title: 'Declare, plan, apply',
        code: '# main.tf\nresource "aws_s3_bucket" "logs" {\n  bucket = "acme-logs-prod"\n  tags   = { owner = "platform" }\n}\n\n$ terraform init\n$ terraform plan\n  + aws_s3_bucket.logs will be created\nPlan: 1 to add, 0 to change, 0 to destroy.\n$ terraform apply',
        explanation: 'You declare the desired end state; Terraform compares it with the state file and real infrastructure and shows the plan before changing anything.',
      },
    ],
    cheatSheet: [
      ['IaC', 'Infrastructure managed through versioned, machine-readable configuration files.'],
      ['Declarative', 'Describe the desired end state; the tool computes the steps.'],
      ['HCL', 'HashiCorp Configuration Language; Terraform configs use .tf files.'],
      ['Provider', 'Plugin that lets Terraform manage a specific platform (AWS, Azure, Kubernetes).'],
      ['Resource', 'A block describing one infrastructure object Terraform manages.'],
      ['Idempotence', 'Re-applying the same config converges to the same state with no extra changes.'],
      ['State file', 'terraform.tfstate — maps config blocks to real-world resource IDs.'],
      ['Terraform vs Ansible', 'Terraform provisions infrastructure declaratively; Ansible configures it procedurally.'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Terraform introduction', url: 'https://developer.hashicorp.com/terraform/intro' },
      { title: 'Terraform language', url: 'https://developer.hashicorp.com/terraform/language' },
      { title: 'Terraform AWS get started tutorial', url: 'https://developer.hashicorp.com/terraform/tutorials/aws-get-started' },
    ],
  },

  'tf-core-workflow': {
    overview: [
      'Terraform\'s daily rhythm is three commands: init, plan, apply. They form a loop — prepare, preview, execute — that makes infrastructure changes reviewable before they touch anything real.',
      'This lesson walks the workflow end to end: what each command does, how to read plan output, why fmt and validate belong in CI, and how to destroy and preview safely.',
    ],
    learn: [
      {
        heading: 'init, plan, apply: the three beats',
        body: [
          'Every Terraform session opens with terraform init. It prepares the working directory: downloading the provider plugins your configuration declares, installing modules, and configuring the backend where state will live. Run it once when you start, and again whenever providers, modules, or the backend change — a stale init is the source of half of all confusing errors.',
          'Then comes terraform plan, the dry run. Plan compares your desired configuration against the current state and prints the difference: what would be created, updated, or destroyed. Nothing touches the cloud. This is the moment a human reviews the change — in a pull request, in CI output, in a terminal — and it is the single most important habit in the Terraform world: never apply what you have not read.',
          'Finally, terraform apply executes the plan against real infrastructure. It shows the plan once more and asks for confirmation, because applying is the point of no return. In automation you can pass -auto-approve to skip the prompt, which is exactly as dangerous as it sounds — fine in a pipeline that already reviewed the plan, reckless anywhere else.',
        ],
      },
      {
        heading: 'Reading the plan',
        body: [
          'Plan output is a small language of its own, and fluency pays. A + beside a resource means it will be created. A ~ means updated in place — the resource survives, one or more arguments change. A - means destroyed. And -/+ means replaced: destroyed and recreated, because you changed an argument the platform treats as immutable, like an instance type\'s AMI on some providers.',
          'Replacement deserves respect. It is the plan\'s way of telling you there will be a gap — the old object dies before the new one lives. When that gap means downtime, reach for create_before_destroy in the lifecycle block, or reconsider the change. The plan is Terraform negotiating with you; read it like a contract.',
          'For extra safety, save the plan with terraform plan -out=planfile and then run terraform apply planfile. The apply executes exactly the plan you reviewed — no drift between preview and execution, no surprises from a state that moved while you were reading.',
        ],
      },
      {
        heading: 'Hygiene: fmt, validate, destroy',
        body: [
          'Two commands keep a codebase honest. terraform fmt rewrites your files into the canonical style — consistent indentation, aligned equals signs — so diffs show real changes instead of formatting noise. Run it before every commit, or enforce terraform fmt -check in CI so unformatted code never merges.',
          'terraform validate checks that the configuration is syntactically valid and internally consistent: references resolve, required arguments are present, types line up. It talks to no provider and touches no infrastructure, which makes it fast and perfect for CI. Validate answers "is this well-formed?"; only plan can answer "is this wise?".',
          'And when the environment has served its purpose, terraform destroy tears it all down — an apply aimed at an empty desired state. It plans first, asks first, and removes every tracked resource. Preview a destroy the same way you preview anything else: terraform plan -destroy shows exactly what would vanish.',
        ],
      },
    ],
    examples: [
      {
        title: 'Plan file in CI',
        code: 'terraform fmt -check\nterraform validate\nterraform plan -out=tfplan\nterraform show -no-color tfplan > plan.txt   # attach to the PR for review\nterraform apply tfplan                      # applies exactly what was reviewed',
        explanation: 'Saving the plan guarantees the apply matches what reviewers approved, even if the code or cloud changed in between.',
      },
    ],
    cheatSheet: [
      ['terraform init', 'Prepares the working directory: providers, modules, backend.'],
      ['terraform plan', 'Dry run: shows changes without making them.'],
      ['terraform apply', 'Executes the plan against real infrastructure (asks first).'],
      ['terraform destroy', 'Deletes all tracked resources; plan -destroy previews it.'],
      ['terraform fmt', 'Rewrites config to canonical style; enforce with -check in CI.'],
      ['terraform validate', 'Syntax and consistency check; touches no provider or infra.'],
      ['+ / ~ / - / -/+', 'Create / update in place / destroy / replace (destroy + recreate).'],
      ['-auto-approve', 'Skips the confirmation prompt — for reviewed CI pipelines only.'],
      ['plan -out', 'Saves the plan so apply runs exactly what was reviewed.'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'terraform init — CLI', url: 'https://developer.hashicorp.com/terraform/cli/commands/init' },
      { title: 'terraform plan — CLI', url: 'https://developer.hashicorp.com/terraform/cli/commands/plan' },
      { title: 'terraform apply — CLI', url: 'https://developer.hashicorp.com/terraform/cli/commands/apply' },
    ],
  },

  'tf-resources': {
    overview: [
      'Resources are the nouns of Terraform: the servers, buckets, and records you manage. Data sources are the read-only counterparts — windows into infrastructure that exists outside your configuration.',
      'This lesson covers how resource blocks are addressed and referenced, how Terraform infers ordering from those references, when to declare dependencies explicitly, and how data sources let you consume information you do not own.',
    ],
    learn: [
      {
        heading: 'Blocks, addresses, and references',
        body: [
          'A resource block has two labels: resource "aws_instance" "web" names the type first, then a local name you choose. Together they form an address — aws_instance.web — that uniquely identifies the object everywhere else in the configuration. Types come from the provider; names are yours, so make them descriptive: "web" beats "i1".',
          'Resources talk to each other through references. Writing aws_vpc.main.id inside a subnet block does two things at once: it feeds the VPC\'s ID into the subnet, and it tells Terraform that the subnet depends on the VPC. That second effect — the implicit dependency — is the quiet genius of the design. Terraform builds a graph of every reference and creates resources in the only order that works, without you ever writing "first do this, then do that".',
          'Inputs and outputs of a block have different names for a reason. Arguments are what you set — the ami, the instance_type, the tags. Attributes are what Terraform learns after creation — the id, the public_ip, the arn. You write arguments; you read attributes. Confusing the two is the most common beginner error, and the error messages will teach you quickly.',
        ],
      },
      {
        heading: 'When the graph needs help: depends_on',
        body: [
          'Implicit dependencies cover nearly everything, because nearly every ordering relationship can be expressed as a reference. But some dependencies are real without being referential: a resource that must exist first for operational reasons, with no attribute flowing between them. For those cases, depends_on declares the ordering explicitly.',
          'Treat depends_on as a scalpel, not a habit. Sprinkling it everywhere hides the true shape of your graph and makes configurations harder to read — a reviewer should be able to see why things are ordered by following the references. Reach for it only when Terraform genuinely cannot infer what you know.',
        ],
      },
      {
        heading: 'Data sources: reading what you do not manage',
        body: [
          'Not everything in your world is managed by your configuration, and not everything should be. A data source is a read-only lookup: data "aws_ami" "latest" asks the provider to find an existing AMI and exposes its ID as data.aws_ami.latest.id. Terraform never creates, updates, or destroys it — it only reads.',
          'Data sources are how configurations stay decoupled. Instead of hard-coding an AMI ID that rots, you look up "the latest Amazon Linux 2023 image" at plan time. Instead of duplicating a VPC ID across teams, one team\'s config exposes it and another reads it. The pattern keeps each configuration owning exactly what it should and borrowing the rest.',
          'Two housekeeping blocks round out the picture. The terraform block configures Terraform itself — the required_version, the required_providers with their version pins, and the backend. Pin your provider versions with constraints like ~> 5.0, because an unpinned provider is a promise that tomorrow\'s release will behave exactly like today\'s, and no release keeps that promise forever.',
        ],
      },
    ],
    examples: [
      {
        title: 'References create dependencies',
        code: 'resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" }\n\nresource "aws_subnet" "app" {\n  vpc_id     = aws_vpc.main.id      # implicit dependency\n  cidr_block = "10.0.1.0/24"\n}\n\ndata "aws_ami" "al2023" {\n  most_recent = true\n  owners      = ["amazon"]\n  filter {\n    name   = "name"\n    values = ["al2023-ami-*-x86_64"]\n  }\n}',
        explanation: 'Referencing aws_vpc.main.id tells Terraform to create the VPC first. Data sources read existing objects without managing them.',
      },
    ],
    cheatSheet: [
      ['Resource address', 'type.name, e.g. aws_instance.web — unique identifier in config.'],
      ['Reference', 'type.name.attribute feeds values and creates an implicit dependency.'],
      ['Implicit dependency', 'Ordering Terraform infers from references; no declaration needed.'],
      ['depends_on', 'Explicit ordering for dependencies no reference can express.'],
      ['Data source', 'Read-only lookup of existing infra: data.<type>.<name>.<attr>.'],
      ['Argument vs attribute', 'Arguments are inputs you set; attributes are values exported after creation.'],
      ['terraform block', 'Configures Terraform itself: versions, providers, backend.'],
      ['required_providers', 'Pin provider versions (e.g. "~> 5.0") so releases cannot surprise you.'],
      ['~> 5.1', 'Pessimistic constraint: >= 5.1, < 6.0 (use ~> 5.1.0 for patch-only).'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Terraform resources', url: 'https://developer.hashicorp.com/terraform/language/resources' },
      { title: 'Terraform providers', url: 'https://developer.hashicorp.com/terraform/language/providers' },
      { title: 'Terraform data sources', url: 'https://developer.hashicorp.com/terraform/language/data-sources' },
    ],
  },

  'tf-variables': {
    overview: [
      'Hard-coded values make configurations brittle; every environment ends up a fork. Variables, locals, and outputs are how Terraform configurations become reusable — the same code, parameterized for dev, staging, and production.',
      'This lesson covers input variables and where their values come from, locals for internal reuse, outputs for exposing results, and the one thing everyone gets wrong about sensitive values.',
    ],
    learn: [
      {
        heading: 'Inputs: variables and where values come from',
        body: [
          'An input variable is declared with a variable block — a name, and optionally a type, a default, and a description. Inside the configuration you read it as var.region. The declaration is a contract: this configuration needs a region, and here is what happens if you do not provide one.',
          'Values arrive through a well-defined precedence. An explicit -var flag wins; then -var-file files; then terraform.tfvars and *.auto.tfvars, which load automatically; then environment variables prefixed TF_VAR_; and finally, if the variable has no default and nothing supplied a value, Terraform prompts interactively — or fails outright in CI, where there is nobody to ask. The layering is deliberate: committed defaults for the ordinary, environment variables for secrets, flags for the exceptional.',
          'Types are your early-warning system. Declaring type = string or a richer object shape means mistakes surface at validate time, with a clear message, instead of at apply time against a real cloud account. The available types — string, number, bool, list, set, map, object, tuple — cover everything from a region name to a full subnet specification.',
        ],
      },
      {
        heading: 'Locals and outputs: the internal wiring',
        body: [
          'Locals are named expressions computed once and reused: local.common_tags, referenced as local.common_tags wherever needed. They are not inputs — nobody passes them in — they are how you stop repeating yourself inside a configuration. A computed naming prefix, a merged tag map, a derived list: if you type it twice, make it a local.',
          'Outputs are the opposite direction: values a configuration exposes after apply. An output block publishes something — a load balancer\'s DNS name, a database endpoint — visible via terraform output and, crucially, consumable by parent modules. Outputs are the API of your infrastructure: they define what callers are allowed to depend on, and everything else stays internal.',
          'Marking a variable or output sensitive = true redacts it from plan and apply output, which keeps secrets out of CI logs and terminal scrollback. But understand precisely what it does not do: it does not encrypt the value in state. State still holds it in plaintext. Sensitive is a display control, not a security control — the real protection is an encrypted remote backend with tight access.',
        ],
      },
      {
        heading: 'Handling secrets and sensitive values',
        body: [
          'Marking a variable or output `sensitive = true` hides it from plan and apply output, but Terraform still writes the value to the state file in plain text. Treat state as sensitive: store it in an encrypted remote backend with tight access, and never commit `terraform.tfstate` or `.tfvars` files that contain secrets to version control.',
          'Better still, keep secrets out of variables. Read them at apply time from a secret manager with a data source (for example `aws_secretsmanager_secret_version`), or let the service generate and manage them; many AWS resources can create and rotate a database password in Secrets Manager for you. Terraform 1.10 added ephemeral values and resources, which are used during a run but never stored in plan or state, and 1.11 added write-only arguments for the same purpose.',
        ],
      },
    ],
    examples: [
      {
        title: 'Typed variable with validation',
        code: 'variable "environment" {\n  type = string\n  validation {\n    condition     = contains(["dev", "staging", "prod"], var.environment)\n    error_message = "environment must be dev, staging or prod."\n  }\n}\nvariable "db_password" {\n  type      = string\n  sensitive = true      # hidden in plan output (still stored in state)\n}\noutput "bucket_arn" { value = aws_s3_bucket.logs.arn }',
        explanation: 'Validation fails fast on bad input. sensitive hides values from output but not from state, so protect the state file.',
      },
    ],
    cheatSheet: [
      ['variable block', 'Declares an input; referenced as var.<name>.'],
      ['Value precedence', '-var > -var-file > terraform.tfvars/*.auto.tfvars > TF_VAR_* > default > prompt.'],
      ['terraform.tfvars', 'Auto-loaded variable values; other .tfvars need -var-file.'],
      ['TF_VAR_name', 'Environment variable source for input variables; good for CI secrets.'],
      ['local.<name>', 'Named expression computed once, reused internally; not an input.'],
      ['output', 'Value exposed after apply; the configuration\'s API to callers.'],
      ['sensitive = true', 'Redacts from CLI output only — state still holds plaintext.'],
      ['nullable = false', 'Forbids null so the default is always used.'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Terraform input variables', url: 'https://developer.hashicorp.com/terraform/language/values/variables' },
      { title: 'Terraform output values', url: 'https://developer.hashicorp.com/terraform/language/values/outputs' },
      { title: 'Terraform local values', url: 'https://developer.hashicorp.com/terraform/language/values/locals' },
    ],
  },

  'tf-expressions': {
    overview: [
      'Terraform configurations are not static documents — they compute. Expressions let you branch on environment, transform collections, and build strings from variables, all inside HCL.',
      'This lesson covers the expression toolkit: conditionals, for-expressions, the splat shorthand, the built-in functions you will actually use, and interpolation done right.',
    ],
    learn: [
      {
        heading: 'Branching and transforming',
        body: [
          'The ternary conditional — condition ? a : b — is Terraform\'s if statement, and it belongs in exactly the places a whole resource would be overkill. var.prod ? "m5.large" : "t3.micro" picks an instance type by environment in one line. Keep the branches simple; if the conditional sprawls, the logic probably deserves a local or a module input instead.',
          'For-expressions transform collections: [for s in var.names : upper(s)] takes a list and returns a list with each element uppercased. Swap the brackets for braces and you build a map instead. They are the workhorse for turning one shape of data into another — a list of subnet CIDRs into a map keyed by availability zone, a set of ports into security group rules.',
          'The splat expression is the common case made terse. aws_instance.web[*].id collects the id from every instance in the resource, exactly as if you had written the for-expression longhand. When you see [*], read it as "each of these, give me that attribute" — it is the idiom for fanning one resource\'s outputs out to many consumers.',
        ],
      },
      {
        heading: 'Functions worth memorizing',
        body: [
          'Terraform ships a standard library of functions, and a dozen of them do most of the work. length() counts elements. lookup(map, key, default) reads with a fallback. coalesce(a, b, c) returns the first argument that is neither null nor empty — the "use this, else that" pattern. jsondecode() and jsonencode() cross the boundary between JSON text and Terraform values. templatefile(path, vars) renders a file template — user-data scripts, policy documents — with variables injected.',
          'Two deserve special attention for defensive coding. try() evaluates its arguments in order and returns the first one that does not error, which tames optional attributes that may not exist. can() is its boolean sibling for validation. Together they let configurations tolerate the ragged edges of real provider data without collapsing.',
          'String interpolation — embedding ${ ... } inside quotes — glues it all together: "web-${var.env}". One piece of etiquette: where a bare reference works, use it. name = var.prefix is cleaner than name = "${var.prefix}", and modern Terraform will tell you so. Interpolation is for composition, not decoration.',
        ],
      },
      {
        heading: 'Dynamic blocks and testing expressions',
        body: [
          'Some resources contain repeated nested blocks, such as the ingress rules of a security group. A `dynamic` block generates them from a collection: `dynamic "ingress" { for_each = var.ports  content { from_port = ingress.value  to_port = ingress.value  protocol = "tcp"  cidr_blocks = ["10.0.0.0/8"] } }`. Use it sparingly: a few explicit blocks are easier to read than a clever loop.',
          'When an expression gets complicated, test it before using it in a resource. `terraform console` opens an interactive prompt where you can evaluate functions and variables against your configuration, for example `cidrsubnet("10.0.0.0/16", 8, 2)` returns `10.0.2.0/24`. Functions such as `try()` and `can()` handle optional values, and `lookup(map, key, default)` reads a map with a fallback.',
        ],
      },
    ],
    examples: [
      {
        title: 'for_each over a map',
        code: 'variable "buckets" {\n  default = { logs = "GLACIER", media = "STANDARD_IA" }\n}\nresource "aws_s3_bucket" "b" {\n  for_each = var.buckets\n  bucket   = "acme-${each.key}"\n}\noutput "names" { value = [for k, b in aws_s3_bucket.b : b.bucket] }',
        explanation: 'for_each keys instances by name (aws_s3_bucket.b["logs"]), so removing one entry does not shift or recreate the others, unlike count.',
      },
    ],
    cheatSheet: [
      ['condition ? a : b', 'Ternary conditional; keep branches simple.'],
      ['for-expressions', '[for x in list : f(x)] transforms lists; { } builds maps.'],
      ['Splat [*]', 'aws_instance.web[*].id — one attribute from every instance.'],
      ['length()', 'Element count for lists, maps, strings.'],
      ['lookup(map, key, default)', 'Map read with a fallback default.'],
      ['coalesce(a, b, c)', 'First non-null, non-empty argument.'],
      ['jsondecode / jsonencode', 'Convert between JSON text and Terraform values.'],
      ['templatefile(path, vars)', 'Render a template file with variables injected.'],
      ['try()', 'First argument that evaluates without error.'],
      ['${ ... }', 'String interpolation; prefer bare references where they work.'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Terraform expressions', url: 'https://developer.hashicorp.com/terraform/language/expressions' },
      { title: 'Terraform functions', url: 'https://developer.hashicorp.com/terraform/language/functions' },
      { title: 'Terraform for_each meta-argument', url: 'https://developer.hashicorp.com/terraform/language/meta-arguments/for_each' },
    ],
  },

  'tf-state-backends': {
    overview: [
      'State is Terraform\'s memory: the mapping between your configuration and the real infrastructure it manages. Everything Terraform does — planning, applying, destroying — is a conversation with state.',
      'This lesson explains why teams keep state remote and locked, how backends work, the commands for inspecting and repairing state, and the one rule you must never break.',
    ],
    learn: [
      {
        heading: 'Why remote state, and why locked',
        body: [
          'A state file on one engineer\'s laptop is a liability wearing a disguise. It diverges the moment two people apply, it leaks secrets to anyone with the disk, and it cannot be the single source of truth for a team. Remote state — in S3, Terraform Cloud, or any supported backend — puts one authoritative copy where every run can reach it, with encryption and access control the laptop never had.',
          'But shared state introduces a new failure mode: two applies racing each other, each reading the same state, each writing back its own version, one silently clobbering the other. State locking prevents it. Before an operation that writes state, Terraform takes a lock; anyone else attempting the same operation waits or fails fast. The S3 backend, for instance, coordinates through DynamoDB or native S3 locking. A stuck lock after a crashed run is the one time you will ever think about unlocking by hand — and even then, confirm no apply is actually running first.',
          'The backend block declares both halves of this: where state lives and how operations coordinate. It is the rare piece of Terraform configuration that cannot itself be parameterized — the backend must be known before anything else runs, so it takes only literal values.',
        ],
      },
      {
        heading: 'Reading, repairing, and respecting state',
        body: [
          'A handful of commands make state legible. terraform state list prints every tracked resource address — a quick inventory of what Terraform believes it owns. When reality and belief diverge, that divergence has a name: drift. Someone changed a security group in the console; a plan or refresh detects the drift, and the next apply reconciles it. Drift is not corruption — it is information, and Terraform is designed to absorb it.',
          'Sometimes the mapping itself needs surgery, and for that there are scalpels, not hammers. terraform state mv renames a resource\'s address in state — after you refactor a module, say — so Terraform does not destroy and recreate a perfectly good object just because its address changed. terraform state rm removes an address from state without touching the real resource, for the day you decide Terraform should stop managing something. And terraform import brings an existing, hand-built resource under management: you write the matching configuration, import the ID into state, and from then on Terraform owns it.',
          'The one rule: never edit terraform.tfstate by hand. The file is a database with invariants your editor cannot see; a stray comma or a well-meaning tweak can corrupt the mapping in ways that surface hours later as mysterious replacements. Use the state commands — they exist precisely so you never need the editor.',
          'Two corollaries follow. Never commit state to git: it holds secrets, shifting IDs, and the full topology of your infrastructure — a prime target wearing a version-control costume. And share values between configurations with terraform_remote_state, the read-only data source that lets one stack consume another\'s outputs without either owning the other.',
        ],
      },
      {
        heading: 'Moving and importing resources safely',
        body: [
          'Refactoring code changes resource addresses, and Terraform would otherwise destroy the old address and create a new one. A `moved` block tells it the resource was renamed: `moved { from = aws_instance.web  to = aws_instance.app }`. The plan then shows a move, not a replacement. Moved blocks are reviewable in pull requests, which makes them safer than running `terraform state mv` by hand.',
          'To bring existing infrastructure under Terraform, use an `import` block with the resource address and its ID, then run `terraform plan -generate-config-out=generated.tf` to produce starting configuration. Review and clean the generated code before applying. To stop managing a resource without deleting it, use a `removed` block (Terraform 1.7+) or `terraform state rm`. Take a state backup, and make sure versioning is on for the backend bucket, before any manual state change.',
        ],
      },
    ],
    examples: [
      {
        title: 'Remote state with S3-native locking',
        code: 'terraform {\n  backend "s3" {\n    bucket       = "acme-tfstate"\n    key          = "network/prod.tfstate"\n    region       = "eu-west-1"\n    encrypt      = true\n    use_lockfile = true    # Terraform 1.10+; no DynamoDB table needed\n  }\n}',
        explanation: 'Shared, encrypted remote state lets a team work safely; the lock stops two applies running at once. Enable bucket versioning to recover from mistakes.',
      },
    ],
    cheatSheet: [
      ['State', 'terraform.tfstate — the mapping between config and real infrastructure.'],
      ['Backend', 'Where state is stored and how operations coordinate (s3, remote, etc.).'],
      ['State locking', 'Prevents concurrent applies from corrupting shared state.'],
      ['terraform state list', 'Every tracked resource address — the managed inventory.'],
      ['terraform state mv', 'Rename an address in state without destroying the resource.'],
      ['terraform state rm', 'Stop managing a resource; the real object survives.'],
      ['terraform import', 'Bring an existing resource under Terraform management.'],
      ['Drift', 'Real infra changed outside Terraform; plan detects, apply reconciles.'],
      ['terraform_remote_state', 'Read-only data source for sharing outputs between stacks.'],
      ['Never hand-edit state', 'Use state commands; never commit state to git.'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Terraform state', url: 'https://developer.hashicorp.com/terraform/language/state' },
      { title: 'Terraform backends', url: 'https://developer.hashicorp.com/terraform/language/backend' },
      { title: 'Terraform remote state', url: 'https://developer.hashicorp.com/terraform/language/state/remote' },
    ],
  },

  'tf-modules': {
    overview: [
      'A module is Terraform\'s unit of reuse: a folder of configuration files with a clear contract of inputs and outputs. Every configuration you have ever written is already a module — the root module. Named modules just let you use the pattern deliberately.',
      'This lesson covers calling modules, choosing sources, versioning, designing good boundaries, and where provider configuration belongs.',
    ],
    learn: [
      {
        heading: 'Calling and composing',
        body: [
          'You call a module with a module block: module "vpc" { source = "./modules/vpc" } plus whatever input arguments the module declares. Inside, the module reads them as var.something; outside, you read its results as module.vpc.<output>. The symmetry is the whole idea — modules take inputs and return outputs, exactly like functions, and the root module is just the outermost call.',
          'The source argument is remarkably flexible: a local path for code you own, a registry address like "terraform-aws-modules/vpc/aws" for community code, a git URL for anything else. Whatever the source, pin the version. An unpinned module is a standing invitation for someone else\'s release to redesign your infrastructure overnight — version constraints are the cheapest insurance in the ecosystem.',
          'Modules compose. A module can call other modules, forming a tree rooted at your configuration. The discipline is to keep the tree shallow and each node honest: a vpc module that builds a network, a app module that deploys a service. Deep nesting turns the tree into a maze; flat composition keeps every layer readable.',
        ],
      },
      {
        heading: 'Designing modules worth reusing',
        body: [
          'A good module boundary is a cohesive unit with a clear contract — "a VPC," not "all of production." The test is whether you can describe what it does in one sentence and list its inputs on one hand. One resource per module is usually too fine; one module for everything is just the root module wearing a costume.',
          'Provider configuration belongs in the root module. Child modules should declare what they need and receive providers explicitly when they must — but the credentials, regions, and aliases live at the top, where a reviewer can see the full blast radius in one place. A child module quietly configuring its own provider is a child module that will surprise you in exactly the wrong environment.',
          'The public Terraform Registry at registry.terraform.io is where the community\'s modules live, with verified authorship marked. Treat registry modules like any third-party dependency: read the source, pin the version, and prefer the boring, widely-used ones. A module with ten thousand downloads and a clear README has been debugged by strangers on your behalf.',
        ],
      },
      {
        heading: 'Testing and publishing modules',
        body: [
          'A module used by many teams needs tests. `terraform validate` catches syntax and type errors; `terraform test` (Terraform 1.6+) runs `.tftest.hcl` files that plan or apply the module with test inputs and check assertions about the result, such as the bucket having encryption enabled. Variable `validation` blocks and `precondition` and `postcondition` checks inside resources give users clear errors at plan time.',
          'Publish modules with a version for every change, following semantic versioning: patch for fixes, minor for backward-compatible additions, major for breaking changes. Include a README with inputs, outputs and an example, and a `versions.tf` that declares the required Terraform and provider versions. Callers then pin a range such as `~> 2.3` and upgrade deliberately.',
        ],
      },
    ],
    examples: [
      {
        title: 'Call a versioned module',
        code: 'module "vpc" {\n  source  = "terraform-aws-modules/vpc/aws"\n  version = "~> 5.8"          # >= 5.8, < 6.0\n  name    = "prod"\n  cidr    = "10.0.0.0/16"\n  azs             = ["eu-west-1a", "eu-west-1b"]\n  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]\n}\noutput "vpc_id" { value = module.vpc.vpc_id }',
        explanation: 'Pinning the module version means upgrades are deliberate; module outputs are read as module.<name>.<output>.',
      },
    ],
    cheatSheet: [
      ['Module', 'Reusable container of .tf files; every config is the root module.'],
      ['module block', 'Calls a module: module "name" { source = "..." }; outputs read as module.name.<output>.'],
      ['source', 'Local path, registry address, or git URL.'],
      ['Version pinning', 'Pin module versions so releases cannot change infra unexpectedly.'],
      ['output', 'How a module exposes values to its caller.'],
      ['Good boundary', 'Cohesive unit, clear input/output contract — "a vpc", not "all of prod".'],
      ['Composition', 'Modules can call modules; keep the tree shallow.'],
      ['Registry', 'registry.terraform.io — public catalog of providers and modules.'],
      ['Provider config', 'Lives in the root module; children receive providers explicitly.'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Terraform modules', url: 'https://developer.hashicorp.com/terraform/language/modules' },
      { title: 'Terraform Registry', url: 'https://developer.hashicorp.com/terraform/registry' },
      { title: 'Developing modules', url: 'https://developer.hashicorp.com/terraform/language/modules/develop' },
    ],
  },

  'tf-meta-lifecycle': {
    overview: [
      'Most resources are declared once and exist once. Meta-arguments are how you break that rule with intent: create many copies, control replacement behavior, and generate repetitive blocks — all without copy-paste.',
      'This lesson covers count and for_each, the lifecycle block\'s guardrails, dynamic blocks, and why provisioners are the tool of last resort.',
    ],
    learn: [
      {
        heading: 'Many from one: count and for_each',
        body: [
          'The count meta-argument creates N copies of a resource, each addressable as <resource>[0], <resource>[1], and so on, with count.index available inside. It is simple and perfectly adequate when the copies are truly interchangeable — three identical workers, say. But count has a brittle heart: remove the middle item from the list and everything after it re-indexes, which Terraform reads as destroy-and-recreate churn across resources that never actually changed.',
          'for_each exists to fix exactly that. It creates one instance per key in a map or set, addressed by stable keys instead of positions: <resource>["api"], <resource>["worker"]. Inside, each.key and each.value expose the current entry. Remove "worker" from the map and only the worker is destroyed; the rest keep their identities. Prefer for_each whenever the instances have names — which, in production, is nearly always.',
        ],
      },
      {
        heading: 'Lifecycle: guardrails for the dangerous moments',
        body: [
          'The lifecycle block governs the moments Terraform would otherwise handle bluntly. create_before_destroy = true flips the replacement order: the new resource is created before the old one dies, closing the gap that would otherwise mean downtime. It is the difference between a rolling upgrade and an outage wearing a plan\'s clothing.',
          'prevent_destroy = true is the opposite instinct made declarative: Terraform will error rather than destroy this resource, full stop. Put it on the things that cannot come back — production databases, state buckets, the keys to the kingdom. It does not make the resource immortal; it makes destroying it a conscious, deliberate act instead of an accident.',
          'ignore_changes tells Terraform to stop reconciling specific attributes after creation — tags that another system mutates, say, or a password that an external rotation handles. Use it surgically: ignored attributes are invisible to drift detection, which is the point, but also the risk. Ignore the attribute, never the resource.',
        ],
      },
      {
        heading: 'Dynamic blocks and the provisioner warning',
        body: [
          'A dynamic block generates repeatable nested blocks from a collection — a dozen ingress rules from a list of ports, for example — the way for_each generates resources. It keeps configurations DRY precisely where copy-paste would otherwise breed: inside the repeated stanzas that differ only in values.',
          'Provisioners deserve their reputation as the last resort, and the reason is architectural: they are imperative commands that run only at create or destroy time, and Terraform does not track their effects in state. A provisioner that installs software leaves no record of having done so; the next plan cannot see it, the next engineer cannot audit it. Prefer provider resources, cloud-init user data, or a proper configuration tool — anything whose results live in the world Terraform understands. When nothing else fits, the terraform_data resource (successor to the older null_resource) at least gives the workaround a clean, provider-free home.',
        ],
      },
    ],
    examples: [
      {
        title: 'Lifecycle rules',
        code: 'resource "aws_db_instance" "main" {\n  # ...\n  lifecycle {\n    prevent_destroy       = true          # plan errors if it would be destroyed\n    ignore_changes        = [tags["LastBackup"]]\n  }\n}\nresource "aws_instance" "web" {\n  # ...\n  lifecycle { create_before_destroy = true }\n}',
        explanation: 'prevent_destroy protects stateful resources from an accidental replace; create_before_destroy avoids downtime when a resource must be recreated.',
      },
    ],
    cheatSheet: [
      ['count', 'N copies indexed count.index; brittle when the list changes shape.'],
      ['for_each', 'One instance per map/set key; stable identities — prefer over count.'],
      ['each.key / each.value', 'Current key and value inside a for_each resource.'],
      ['create_before_destroy', 'Replacement order: new resource first, no downtime gap.'],
      ['prevent_destroy', 'Terraform errors rather than destroying; guardrail for critical resources.'],
      ['ignore_changes', 'Stop reconciling listed attributes after creation.'],
      ['dynamic block', 'Generate repeated nested blocks from a collection.'],
      ['Provisioners', 'Last resort: imperative, untracked in state; prefer cloud-init or config tools.'],
      ['terraform_data', 'Modern replacement for null_resource; clean home for trigger-based workarounds.'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Terraform lifecycle meta-argument', url: 'https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle' },
      { title: 'Terraform depends_on meta-argument', url: 'https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on' },
      { title: 'Terraform count meta-argument', url: 'https://developer.hashicorp.com/terraform/language/meta-arguments/count' },
    ],
  },

  'tf-prod-security': {
    overview: [
      'Writing Terraform is the easy half. Running it in production — safely, repeatedly, with other humans — is the discipline this lesson is about: isolation, importing the past, automated guardrails, and pipelines that make the safe path the easy path.',
      'This lesson covers workspaces and their limits, bringing existing infrastructure under management, policy as code, security scanning, and the anatomy of a Terraform CI/CD pipeline you can trust.',
    ],
    learn: [
      {
        heading: 'Environments: workspaces and their limits',
        body: [
          'Workspaces give one configuration multiple named states — terraform workspace new staging, and the same code now manages a second environment, with terraform.workspace exposing the current name for conditional logic. They are convenient for lightweight variants: a developer\'s sandbox, a short-lived test rig.',
          'But workspaces are not isolation. They share the configuration, the backend, and the credentials; a mistake in one workspace is a typo away from another\'s state. For real environment separation — dev versus staging versus production — prefer separate configurations with separate state, separate backends, and ideally separate accounts. Workspaces are a convenience for variants; boundaries are for production.',
          'Whatever the layout, the past must be accounted for. Infrastructure built by hand before Terraform arrived does not vanish; terraform import brings it under management. You write the configuration to match reality, import the resource ID into state, and from that moment Terraform owns it. Modern Terraform even supports import blocks, so the import itself lives in code and is reviewed like everything else.',
        ],
      },
      {
        heading: 'Guardrails before apply: policy and scanning',
        body: [
          'Humans review plans; machines should too. Policy as code — Sentinel, OPA, or your cloud\'s native equivalent — evaluates every plan against rules before apply is allowed: no public storage buckets, only approved regions, mandatory tags. A violated policy fails the run the way a failed test fails a build, and the feedback arrives when it is cheapest — before anything is created.',
          'Static scanners like tfsec, Checkov, and Trivy play a complementary role: they read your configuration files and flag insecure patterns — open security groups, unencrypted storage, missing logging — with the specificity of a linter. Run them on every pull request, alongside fmt and validate. Between policy gates and scanners, the obvious mistakes never reach a human reviewer, which leaves reviewers free to think about the non-obvious ones.',
        ],
      },
      {
        heading: 'The pipeline you can trust',
        body: [
          'A safe Terraform pipeline has a fixed shape. First, fmt and validate — is it well-formed? Then plan, saved to a file — what exactly would change? Then policy and security scans against that plan — is it allowed? Then a human reviews the plan output in the pull request. And finally, apply runs the exact saved plan — not a fresh plan, the reviewed one — so what was approved is what happens.',
          'Credentials in this pipeline come from short-lived, injected secrets or OIDC federation, never from the repository. Hard-coding a key in a .tf file is not a shortcut; it is a breach with a commit hash. And when something does go wrong, remember there is no terraform rollback command: you revert the configuration in version control and apply the previous state of the code. Git history is the undo button — one more reason every change flows through it.',
          'Protect the state like the crown jewels, because that is what it is: secrets, topology, the complete map of your infrastructure. Encrypt it at rest, lock down who can read it, and enable versioning on the storage bucket so a corrupted state can be rewound. Run terraform plan on every pull request even when nothing seems Terraform-related — the plan is cheap, and the surprise it catches never is.',
        ],
      },
    ],
    examples: [
      {
        title: 'Scan and gate a plan',
        code: '$ terraform plan -out=tfplan && terraform show -json tfplan > plan.json\n$ checkov -f plan.json\nCheck: CKV_AWS_18 "Ensure the S3 bucket has access logging enabled"\n  FAILED for resource: aws_s3_bucket.logs\n$ trivy config .',
        explanation: 'Policy scanners catch insecure settings before apply. Run them in the pipeline and use OIDC roles for CI instead of stored cloud keys.',
      },
    ],
    cheatSheet: [
      ['Workspaces', 'Multiple named states for one config; convenience, not isolation.'],
      ['Environment isolation', 'Separate configs, state, and accounts per environment for real boundaries.'],
      ['terraform import', 'Bring existing unmanaged resources under Terraform management.'],
      ['Policy as code', 'Sentinel/OPA: automated plan guardrails (no public buckets, approved regions).'],
      ['tfsec / Checkov / Trivy', 'Static scanners catching insecure config before apply.'],
      ['CI credentials', 'Short-lived injected secrets or OIDC; never committed keys.'],
      ['Pipeline order', 'fmt/validate → plan (save) → policy+security scan → gated apply of that plan.'],
      ['Rollback', 'Revert config in git and apply; there is no terraform rollback command.'],
      ['State protection', 'Encrypt, restrict access, version the bucket — state holds secrets and topology.'],
    ],
    // Further reading: free public pages that go deeper than this
    // lesson (official docs and open-source project docs only —
    // never paywalled, never login-gated, never invented). Rendered
    // on the lesson page and named by the tutor, never read aloud.
    further_reading: [
      { title: 'Terraform Cloud variables', url: 'https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/variables' },
      { title: 'S3 backend', url: 'https://developer.hashicorp.com/terraform/language/backend/s3' },
      { title: 'HCP Terraform run tasks', url: 'https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/run-tasks' },
    ],
  },
};
