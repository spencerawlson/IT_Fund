// Brilliant-style hands-on steps mixed into guided lessons, keyed by deck id.
// Types:
//   order   { prompt, items (in the correct order), x }           tap items into sequence
//   numeric { prompt, answer, tolerance?, unit?, x }               type a number
//   widget  { widget: 'bits' | 'cidr' | 'hash', prompt, goal, x }  explore until the goal is met
// The first step of a deck opens its lesson as a hook; the rest are spread through it.

export default {
  // ---------- Python ----------
  'py-basics': [
    { type: 'widget', widget: 'bits', prompt: 'Every Python int is stored in binary. Flip the bits to make 42.', goal: { value: 42 }, x: 'bin(42) returns "0b101010": 32 + 8 + 2. Python writes binary literals the same way, so 0b101010 == 42.' },
    { type: 'numeric', prompt: 'What does `len("cyber") * 2` evaluate to?', answer: 10, x: 'len("cyber") is 5 characters, and 5 * 2 = 10.' },
  ],
  'py-flow': [
    { type: 'order', prompt: 'Arrange the lines so the program prints the even numbers from 0 to 4.', items: ['for i in range(5):', '    if i % 2 == 0:', '        print(i)'], x: 'The loop comes first, the condition is indented inside it, and print is indented inside the condition. Indentation defines the blocks.' },
    { type: 'numeric', prompt: 'How many times does `for i in range(2, 10, 3):` loop?', answer: 3, x: 'range(start, stop, step) yields 2, 5, 8. The next value, 11, is past the stop.' },
  ],
  'py-collections': [
    { type: 'numeric', prompt: 'What is `len({1, 2, 2, 3, 3, 3})`?', answer: 3, x: 'A set keeps only unique values: {1, 2, 3}.' },
    { type: 'numeric', prompt: 'What is `[10, 20, 30, 40][-2]`?', answer: 30, x: 'Negative indices count from the end: -1 is 40, so -2 is 30.' },
  ],
  'py-files-errors': [
    { type: 'order', prompt: 'Put the exception-handling blocks in the order Python requires.', items: ['try:', 'except ValueError:', 'else:', 'finally:'], x: 'try runs the risky code, except handles errors, else runs only if no error occurred, and finally always runs last.' },
  ],
  'py-automation': [
    { type: 'numeric', prompt: 'Your script requests a page that does not exist. Which HTTP status code comes back?', answer: 404, x: '404 Not Found is a 4xx client error. 5xx codes mean the server failed.' },
  ],
  'py-security-tools': [
    { type: 'widget', widget: 'hash', prompt: 'This is SHA-256 of the message. Change a single character and watch the hash.', goal: { change: true }, x: 'This is the avalanche effect: one tiny change flips about half the output bits. That is why hashes reveal tampering.' },
  ],

  // ---------- Network+ ----------
  'net-osi': [
    { type: 'order', prompt: 'Build the OSI model from Layer 1 (bottom) to Layer 7 (top).', items: ['Physical', 'Data Link', 'Network', 'Transport', 'Session', 'Presentation', 'Application'], x: '"Please Do Not Throw Sausage Pizza Away" runs from Layer 1 up to Layer 7.' },
    { type: 'order', prompt: 'Order the PDUs from Layer 1 up to Layer 4.', items: ['Bits', 'Frames', 'Packets', 'Segments'], x: 'Bits on the wire, frames at Data Link, packets at Network, segments (TCP) at Transport.' },
  ],
  'net-ports': [
    { type: 'order', prompt: 'Put the TCP three-way handshake in order.', items: ['Client sends SYN', 'Server replies SYN-ACK', 'Client sends ACK'], x: 'Only after the final ACK is the connection established and data can flow.' },
    { type: 'numeric', prompt: 'Which port number does HTTPS use?', answer: 443, x: 'HTTPS is TCP 443 (and UDP 443 for HTTP/3 over QUIC). Plain HTTP is 80.' },
  ],
  'net-devices-media': [
    { type: 'numeric', prompt: 'How many links does a full mesh of 5 devices need?', answer: 10, x: 'n(n-1)/2 = 5 × 4 / 2 = 10. That is why full mesh gets expensive fast.' },
  ],
  'net-ip-subnet': [
    { type: 'widget', widget: 'cidr', prompt: 'You need a subnet for 50 hosts, with as little waste as possible. Slide to the right prefix.', goal: { prefix: 26 }, x: '/26 leaves 6 host bits: 2^6 = 64 addresses, minus network and broadcast = 62 usable. /27 would give only 30.' },
    { type: 'widget', widget: 'bits', prompt: 'A /26 mask ends in the octet 11000000. Set those bits and read the decimal value.', goal: { value: 192 }, x: '128 + 64 = 192, so a /26 mask is 255.255.255.192.' },
    { type: 'numeric', prompt: 'How many usable hosts does a /28 give?', answer: 14, x: '4 host bits: 2^4 = 16 addresses, minus 2 = 14.' },
  ],
  'net-switch-route': [
    { type: 'order', prompt: 'Order these route sources from most to least trusted (lowest administrative distance first).', items: ['Connected (0)', 'Static (1)', 'eBGP (20)', 'OSPF (110)', 'RIP (120)'], x: 'When two sources know a route to the same prefix, the lower administrative distance wins.' },
    { type: 'numeric', prompt: 'What is the highest usable 802.1Q VLAN ID?', answer: 4094, x: 'The VLAN ID is 12 bits (0-4095). 0 and 4095 are reserved, so 1-4094 are usable.' },
  ],
  'net-services-wireless': [
    { type: 'order', prompt: 'Order the DHCP lease process.', items: ['Discover', 'Offer', 'Request', 'Acknowledge'], x: 'DORA. The client broadcasts Discover and Request because it has no IP address yet.' },
  ],
  'net-troubleshoot': [
    { type: 'order', prompt: 'Order the CompTIA troubleshooting methodology.', items: ['Identify the problem', 'Establish a theory of probable cause', 'Test the theory', 'Establish a plan of action', 'Implement the solution or escalate', 'Verify full system functionality', 'Document findings and outcomes'], x: 'This order appears almost word for word on the Network+ exam.' },
  ],
  'net-ops': [
    { type: 'order', prompt: 'Order recovery sites from fastest to slowest to bring online.', items: ['Hot site', 'Warm site', 'Cold site'], x: 'Hot sites are ready immediately and cost the most; cold sites are just space and power.' },
  ],

  // ---------- Security+ ----------
  'sec-crypto': [
    { type: 'widget', widget: 'hash', prompt: 'Hashing protects integrity. Tamper with the message by changing just one character.', goal: { change: true }, x: 'Any change produces a completely different digest, so comparing hashes detects tampering.' },
    { type: 'widget', widget: 'bits', prompt: 'Keys are just bits. Each bit doubles the search space. Set the highest bit of this byte.', goal: { value: 128 }, x: 'One bit, 128 in decimal. AES-256 has 2^256 possible keys, far beyond any brute force.' },
  ],
  'sec-governance': [
    { type: 'numeric', prompt: 'A $200,000 server has an exposure factor of 40%. What is the SLE in dollars?', answer: 80000, unit: '$', x: 'SLE = Asset Value × Exposure Factor = 200,000 × 0.4 = $80,000.' },
    { type: 'numeric', prompt: 'With that $80,000 SLE and an ARO of 0.5 (once every two years), what is the ALE?', answer: 40000, unit: '$', x: 'ALE = SLE × ARO = 80,000 × 0.5 = $40,000 a year. Controls costing more than that per year are hard to justify.' },
  ],
  'sec-ops': [
    { type: 'order', prompt: 'Order the NIST SP 800-61r2 incident response phases.', items: ['Preparation', 'Detection & Analysis', 'Containment, Eradication & Recovery', 'Post-Incident Activity'], x: 'Lessons learned from post-incident activity feed back into preparation.' },
    { type: 'order', prompt: 'Collect evidence in order of volatility, most volatile first.', items: ['CPU registers & cache', 'RAM', 'Swap / temp files', 'Disk', 'Remote logs', 'Archival media'], x: 'Capture what disappears first before it is gone.' },
  ],

  // ---------- Cybersecurity ----------
  'cy-linux': [
    { type: 'numeric', prompt: 'What octal mode gives the owner rw-, the group r--, and others ---?', answer: 640, x: 'r=4, w=2, x=1. Owner 4+2=6, group 4, others 0, so 640.' },
    { type: 'widget', widget: 'bits', prompt: 'Permissions are bits too. Set the three low bits (r, w, x) of "others" to all on.', goal: { value: 7 }, x: '4 + 2 + 1 = 7, which is full rwx. That is the last digit of chmod 777, which is almost always a mistake.' },
  ],
  'cy-frameworks': [
    { type: 'order', prompt: 'Order the Lockheed Martin Cyber Kill Chain.', items: ['Reconnaissance', 'Weaponization', 'Delivery', 'Exploitation', 'Installation', 'Command & Control', 'Actions on Objectives'], x: 'Break any link and the intrusion fails. The earlier you break it, the cheaper it is.' },
  ],
  'cy-pentest': [
    { type: 'order', prompt: 'Order the phases of a penetration test.', items: ['Planning & scoping', 'Reconnaissance', 'Scanning & enumeration', 'Exploitation', 'Post-exploitation', 'Reporting'], x: 'Scoping with written authorisation comes first; the report is the actual deliverable.' },
  ],

  // ---------- Cloud ----------
  'cl-concepts': [
    { type: 'order', prompt: 'Order these models from MOST to LEAST customer responsibility.', items: ['On-premises', 'IaaS', 'PaaS', 'SaaS'], x: 'Each step up hands more of the stack to the provider. Data and identity always stay yours.' },
  ],
  'cl-networking': [
    { type: 'widget', widget: 'cidr', prompt: 'Your VPC is 10.0.0.0/16. Slide to the prefix that gives each subnet 4,096 addresses.', goal: { prefix: 20 }, x: '/20 leaves 12 host bits: 2^12 = 4,096 addresses, so the /16 splits into 16 subnets. AWS reserves 5 IPs in each subnet.' },
  ],
  'cl-architecture': [
    { type: 'order', prompt: 'Order the DR strategies from cheapest (slowest) to most expensive (fastest).', items: ['Backup & restore', 'Pilot light', 'Warm standby', 'Multi-site active/active'], x: 'Pick the cheapest one that still meets the business RTO and RPO.' },
  ],
  'cl-sre': [
    { type: 'numeric', prompt: 'A 30-day month with a 99.9% availability SLO allows how many minutes of downtime?', answer: 43.2, tolerance: 0.5, unit: 'min', x: '30 × 24 × 60 = 43,200 minutes, and 0.1% of that is 43.2 minutes. That is your error budget.' },
  ],

  // ---------- AI Engineering ----------
  'ai-ml-basics': [
    { type: 'numeric', prompt: 'A malware model flags 50 files: 40 are truly malicious, 10 are clean. What is its precision (%)?', answer: 80, unit: '%', x: 'Precision = TP / (TP + FP) = 40 / 50 = 80%. It says nothing about the malware it missed; that is recall.' },
    { type: 'order', prompt: 'Order a basic ML workflow.', items: ['Collect & clean data', 'Split train / validation / test', 'Train the model', 'Tune on validation', 'Evaluate once on test', 'Deploy & monitor'], x: 'Touch the test set only once, at the end, or its score stops being honest.' },
  ],
  'ai-rag': [
    { type: 'order', prompt: 'Order a RAG pipeline, from indexing to answering.', items: ['Chunk documents', 'Embed chunks', 'Store in a vector index', 'Embed the user question', 'Retrieve the top-k chunks', 'Generate an answer with the chunks in context'], x: 'The first three steps run ahead of time (indexing); the last three run on every question.' },
  ],

  // ---------- CISSP ----------
  'cissp-mindset': [
    { type: 'order', prompt: 'Order the ISC2 Code of Ethics canons by priority.', items: ['Protect society, the common good, and the infrastructure', 'Act honourably, honestly, justly, responsibly, and legally', 'Provide diligent and competent service to principals', 'Advance and protect the profession'], x: 'When canons conflict, the higher one wins. Society comes before your employer.' },
  ],
  'cissp-d1': [
    { type: 'order', prompt: 'Order the NIST Risk Management Framework steps.', items: ['Prepare', 'Categorize', 'Select', 'Implement', 'Assess', 'Authorize', 'Monitor'], x: '"People Can See I Am Always Monitoring." Authorize is the executive decision to accept residual risk.' },
    { type: 'numeric', prompt: 'A risk has an ALE of $50,000. A control cuts it to $10,000 and costs $15,000 a year. What is the control’s annual value?', answer: 25000, unit: '$', x: '(ALE before − ALE after) − annual control cost = (50,000 − 10,000) − 15,000 = $25,000. It is positive, so the control is worth it.' },
  ],
  'cissp-d7': [
    { type: 'order', prompt: 'Order the DR test types from least to most disruptive.', items: ['Checklist / read-through', 'Structured walk-through (tabletop)', 'Simulation', 'Parallel', 'Full interruption'], x: 'Only run a full interruption test when you are confident, and with management approval.' },
  ],
  'cissp-d8': [
    { type: 'order', prompt: 'Order the CMMI maturity levels from 1 to 5.', items: ['Initial', 'Managed', 'Defined', 'Quantitatively Managed', 'Optimizing'], x: 'Maturity grows from ad hoc work to measured, continuously improving processes.' },
  ],

  // ---------- Terraform ----------
  'tf-core-workflow': [
    { type: 'order', prompt: 'Put the core Terraform workflow in order for a first run.', items: ['terraform init', 'terraform validate', 'terraform plan', 'terraform apply'], x: 'init downloads providers and sets up the backend, validate checks the config, plan previews the change, apply makes it real.' },
    { type: 'numeric', prompt: 'How many resources does a plan showing "2 to add, 1 to change, 0 to destroy" apply in total (add + change + destroy)?', answer: 3, x: 'A plan summarises the actions: 2 creates + 1 update + 0 deletes = 3 resource actions.' },
  ],
  'tf-prod-security': [
    { type: 'order', prompt: 'Order the stages of a safe Terraform CI pipeline.', items: ['terraform fmt and validate', 'terraform plan -out=plan', 'policy and security scan', 'human review of the plan', 'gated terraform apply plan'], x: 'Format and validate, produce a saved plan, scan it, let a human review it, then apply exactly that reviewed plan.' },
  ],

  // ---------- C++ ----------
  'cpp-basics': [
    { type: 'order', prompt: 'Put the C++ build pipeline in order, from source to running program.', items: ['Preprocess (#include, macros)', 'Compile to object code', 'Link objects and libraries', 'Run the executable'], x: 'The preprocessor expands includes and macros, the compiler produces object files, the linker combines them into an executable, then the OS runs it.' },
    { type: 'numeric', prompt: 'What does the expression 7 / 2 evaluate to in C++ when both operands are int?', answer: 3, x: 'Integer division truncates toward zero: 7 / 2 is 3. Use 7.0 / 2 to get 3.5.' },
  ],
  'cpp-stl': [
    { type: 'numeric', prompt: 'You push_back three elements onto an empty std::vector. What does v.size() return?', answer: 3, x: 'push_back appends to the end; size() reports the element count — here 3.' },
  ],

  // ---------- Go ----------
  'go-basics': [
    { type: 'order', prompt: 'Order the steps to create and build a new Go program.', items: ['go mod init example', 'write package main and func main', 'go mod tidy', 'go build'], x: 'Initialise the module, write the code, tidy dependencies into go.mod/go.sum, then compile the binary.' },
    { type: 'numeric', prompt: 'How many loop keywords does Go have?', answer: 1, x: 'Just `for` — it covers C-style loops, while-style (for cond {}) and infinite (for {}).' },
  ],
  'go-concurrency': [
    { type: 'order', prompt: 'Order the sync.WaitGroup pattern to wait for N goroutines.', items: ['wg.Add(n) before launching', 'launch each goroutine with defer wg.Done()', 'wg.Wait() blocks until the counter hits zero'], x: 'Add the count up front, each goroutine signals Done when it finishes, and Wait blocks until all have.' },
  ],

  // ---------- Rust ----------
  'rust-basics': [
    { type: 'order', prompt: 'Order the Cargo workflow to run a new Rust program.', items: ['cargo new app', 'write code in src/main.rs', 'cargo check', 'cargo run'], x: 'Scaffold the project, write the code, fast-check it compiles/borrows, then build-and-run.' },
    { type: 'numeric', prompt: 'How many values does the range 0..5 produce?', answer: 5, x: '0..5 is end-exclusive: 0, 1, 2, 3, 4 — five values. Use 0..=5 for inclusive.' },
  ],
  'rust-ownership': [
    { type: 'order', prompt: 'Order the borrowing rules from most to least permissive by count.', items: ['Any number of immutable &T references', 'Exactly one mutable &mut T reference', 'Never both at the same time'], x: 'Share freely OR mutate exclusively — the compiler forbids aliasing and mutation together, which is what prevents data races.' },
  ],

  // ---------- SQL ----------
  'sql-select': [
    { type: 'order', prompt: 'Put the SQL clauses in the order you write them in a query.', items: ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT'], x: 'Written order: choose columns, pick the table, filter rows, group them, filter groups, sort, then limit. (The DB evaluates FROM/WHERE first, but this is how you type it.)' },
    { type: 'numeric', prompt: 'A table has 5 rows; 2 of them have NULL in the "email" column. What does COUNT(email) return?', answer: 3, x: 'COUNT(column) ignores NULLs, so it counts the 3 non-NULL emails. COUNT(*) would return 5.' },
  ],
  'sql-transactions-security': [
    { type: 'order', prompt: 'Order a safe money-transfer transaction.', items: ['BEGIN', 'UPDATE accounts SET balance = balance - 100 (debit)', 'UPDATE accounts SET balance = balance + 100 (credit)', 'COMMIT'], x: 'Both updates happen atomically between BEGIN and COMMIT; if either fails you ROLLBACK, so money is never lost or created.' },
  ],

  // ---------- Docker ----------
  'docker-images': [
    { type: 'order', prompt: 'Order a cache-friendly Dockerfile for a Node app.', items: ['FROM node:20-alpine', 'WORKDIR /app', 'COPY package.json .', 'RUN npm install', 'COPY . .', 'CMD ["node", "server.js"]'], x: 'Copy and install dependencies BEFORE copying all source, so the install layer is cached and only re-runs when package.json changes.' },
  ],
  'docker-optimization-security': [
    { type: 'order', prompt: 'Order a multi-stage build that ships only the artifact.', items: ['FROM node AS build', 'RUN build the app', 'FROM nginx:alpine (slim runtime)', 'COPY --from=build the built files'], x: 'The heavy build tools stay in the build stage; the final image copies only the compiled output into a slim runtime — smaller and more secure.' },
  ],

  // ---------- Kubernetes ----------
  'k8s-workloads': [
    { type: 'order', prompt: 'Order the Kubernetes workload abstractions from smallest to largest.', items: ['Container', 'Pod', 'ReplicaSet', 'Deployment'], x: 'A Deployment manages a ReplicaSet, which keeps N Pods running, and each Pod runs one or more Containers.' },
  ],
  'k8s-networking': [
    { type: 'order', prompt: 'Order the path external HTTP traffic takes to reach a pod.', items: ['Client request', 'Ingress controller (host/path routing)', 'Service (stable virtual IP)', 'Pod'], x: 'Ingress routes by host/path to a Service, the Service load-balances to a healthy Pod by label selector.' },
  ],
};
