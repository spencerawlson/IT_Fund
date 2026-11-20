// Brilliant-style hands-on steps mixed into guided lessons, keyed by deck id.
// Types:
//   order   { prompt, items (in the correct order), x }           tap items into sequence
//   numeric { prompt, answer, tolerance?, unit?, x }               type a number
//   widget  { widget: 'bits' | 'cidr' | 'hash', prompt, goal, x }  explore until the goal is met
// The first step of a deck opens its lesson as a hook; the rest are spread through it.

export default {
  // ---------- Python ----------
  'py-basics': [
    { uuid: '6a4f89a7-e1f1-4040-b904-ba2aff82cc8e', rev: 1, type: 'widget', widget: 'bits', prompt: 'Every Python int is stored in binary. Flip the bits to make 42.', goal: { value: 42 }, x: 'bin(42) returns "0b101010": 32 + 8 + 2. Python writes binary literals the same way, so 0b101010 == 42.' },
    { uuid: '35523068-b24c-406b-86f5-7b963876c599', rev: 1, type: 'numeric', prompt: 'What does `len("cyber") * 2` evaluate to?', answer: 10, x: 'len("cyber") is 5 characters, and 5 * 2 = 10.' },
  ],
  'py-flow': [
    { uuid: '5f5fac8f-51a9-491f-82c6-3c75c15a4068', rev: 1, type: 'order', prompt: 'Arrange the lines so the program prints the even numbers from 0 to 4.', items: ['for i in range(5):', '    if i % 2 == 0:', '        print(i)'], x: 'The loop comes first, the condition is indented inside it, and print is indented inside the condition. Indentation defines the blocks.' },
    { uuid: '5add7f62-963a-420a-aa8b-0b0661ac52ca', rev: 1, type: 'numeric', prompt: 'How many times does `for i in range(2, 10, 3):` loop?', answer: 3, x: 'range(start, stop, step) yields 2, 5, 8. The next value, 11, is past the stop.' },
  ],
  'py-collections': [
    { uuid: 'd506bc05-6a51-4c3b-95be-8179d52a53ac', rev: 1, type: 'numeric', prompt: 'What is `len({1, 2, 2, 3, 3, 3})`?', answer: 3, x: 'A set keeps only unique values: {1, 2, 3}.' },
    { uuid: '5c9ee6d7-ecce-4c8c-92e6-ec0546484e26', rev: 1, type: 'numeric', prompt: 'What is `[10, 20, 30, 40][-2]`?', answer: 30, x: 'Negative indices count from the end: -1 is 40, so -2 is 30.' },
  ],
  'py-files-errors': [
    { uuid: '2d8d9454-6743-427c-91ff-3bd1face2faf', rev: 1, type: 'order', prompt: 'Put the exception-handling blocks in the order Python requires.', items: ['try:', 'except ValueError:', 'else:', 'finally:'], x: 'try runs the risky code, except handles errors, else runs only if no error occurred, and finally always runs last.' },
  ],
  'py-automation': [
    { uuid: '5d7b0e7c-4119-4681-935b-441352c596b2', rev: 1, type: 'numeric', prompt: 'Your script requests a page that does not exist. Which HTTP status code comes back?', answer: 404, x: '404 Not Found is a 4xx client error. 5xx codes mean the server failed.' },
  ],
  'py-security-tools': [
    { uuid: '3c0a2734-acfc-4152-a74f-0ed3245d42b1', rev: 1, type: 'widget', widget: 'hash', prompt: 'This is SHA-256 of the message. Change a single character and watch the hash.', goal: { change: true }, x: 'This is the avalanche effect: one tiny change flips about half the output bits. That is why hashes reveal tampering.' },
  ],

  // ---------- Network+ ----------
  'net-osi': [
    { uuid: '6b0d03e4-8c71-43b9-b45b-58bdea00baa6', rev: 1, type: 'order', prompt: 'Build the OSI model from Layer 1 (bottom) to Layer 7 (top).', items: ['Physical', 'Data Link', 'Network', 'Transport', 'Session', 'Presentation', 'Application'], x: '"Please Do Not Throw Sausage Pizza Away" runs from Layer 1 up to Layer 7.' },
    { uuid: '82d30700-960c-43dc-a5dd-b3ed7fa95148', rev: 1, type: 'order', prompt: 'Order the PDUs from Layer 1 up to Layer 4.', items: ['Bits', 'Frames', 'Packets', 'Segments'], x: 'Bits on the wire, frames at Data Link, packets at Network, segments (TCP) at Transport.' },
  ],
  'net-ports': [
    { uuid: 'b332e211-6171-4790-89fa-20e92062376a', rev: 1, type: 'order', prompt: 'Put the TCP three-way handshake in order.', items: ['Client sends SYN', 'Server replies SYN-ACK', 'Client sends ACK'], x: 'Only after the final ACK is the connection established and data can flow.' },
    { uuid: '705d1730-1017-4e4c-8c63-a451cf5e8cd0', rev: 1, type: 'numeric', prompt: 'Which port number does HTTPS use?', answer: 443, x: 'HTTPS is TCP 443 (and UDP 443 for HTTP/3 over QUIC). Plain HTTP is 80.' },
  ],
  'net-devices-media': [
    { uuid: '2ab24cec-3937-4418-ada6-773e0493a232', rev: 1, type: 'numeric', prompt: 'How many links does a full mesh of 5 devices need?', answer: 10, x: 'n(n-1)/2 = 5 × 4 / 2 = 10. That is why full mesh gets expensive fast.' },
  ],
  'net-ip-subnet': [
    { uuid: 'dbb01d25-a04c-4a20-8b2f-1c1e16858c61', rev: 1, type: 'widget', widget: 'cidr', prompt: 'You need a subnet for 50 hosts, with as little waste as possible. Slide to the right prefix.', goal: { prefix: 26 }, x: '/26 leaves 6 host bits: 2^6 = 64 addresses, minus network and broadcast = 62 usable. /27 would give only 30.' },
    { uuid: '7eea9ab2-374b-4b1b-b095-768c9512f9bd', rev: 1, type: 'widget', widget: 'bits', prompt: 'A /26 mask ends in the octet 11000000. Set those bits and read the decimal value.', goal: { value: 192 }, x: '128 + 64 = 192, so a /26 mask is 255.255.255.192.' },
    { uuid: '5a894073-adad-4243-b4e4-e969de3d3bb2', rev: 1, type: 'numeric', prompt: 'How many usable hosts does a /28 give?', answer: 14, x: '4 host bits: 2^4 = 16 addresses, minus 2 = 14.' },
  ],
  'net-switch-route': [
    { uuid: '48fef015-2e14-4c3b-81b6-0e32c60e9550', rev: 1, type: 'order', prompt: 'Order these route sources from most to least trusted (lowest administrative distance first).', items: ['Connected (0)', 'Static (1)', 'eBGP (20)', 'OSPF (110)', 'RIP (120)'], x: 'When two sources know a route to the same prefix, the lower administrative distance wins.' },
    { uuid: '8974b155-2292-49db-9d11-75ef1eb8b899', rev: 1, type: 'numeric', prompt: 'What is the highest usable 802.1Q VLAN ID?', answer: 4094, x: 'The VLAN ID is 12 bits (0-4095). 0 and 4095 are reserved, so 1-4094 are usable.' },
  ],
  'net-services-wireless': [
    { uuid: 'd13c36e0-60c9-4839-9c0a-2772f314fff8', rev: 1, type: 'order', prompt: 'Order the DHCP lease process.', items: ['Discover', 'Offer', 'Request', 'Acknowledge'], x: 'DORA. The client broadcasts Discover and Request because it has no IP address yet.' },
  ],
  'net-troubleshoot': [
    { uuid: '800a0565-3529-4c66-8e0c-630b148394f8', rev: 1, type: 'order', prompt: 'Order the CompTIA troubleshooting methodology.', items: ['Identify the problem', 'Establish a theory of probable cause', 'Test the theory', 'Establish a plan of action', 'Implement the solution or escalate', 'Verify full system functionality', 'Document findings and outcomes'], x: 'This order appears almost word for word on the Network+ exam.' },
  ],
  'net-ops': [
    { uuid: '4a70c03a-9c97-41d9-a9e6-5a244eb3b58c', rev: 1, type: 'order', prompt: 'Order recovery sites from fastest to slowest to bring online.', items: ['Hot site', 'Warm site', 'Cold site'], x: 'Hot sites are ready immediately and cost the most; cold sites are just space and power.' },
  ],

  // ---------- Security+ ----------
  'sec-crypto': [
    { uuid: 'b99feb18-03b1-4a53-b406-03129f154c86', rev: 1, type: 'widget', widget: 'hash', prompt: 'Hashing protects integrity. Tamper with the message by changing just one character.', goal: { change: true }, x: 'Any change produces a completely different digest, so comparing hashes detects tampering.' },
    { uuid: 'bf2145ea-bfe1-463d-bd8f-f69230963f02', rev: 1, type: 'widget', widget: 'bits', prompt: 'Keys are just bits. Each bit doubles the search space. Set the highest bit of this byte.', goal: { value: 128 }, x: 'One bit, 128 in decimal. AES-256 has 2^256 possible keys, far beyond any brute force.' },
  ],
  'sec-governance': [
    { uuid: 'be0c0c34-1430-45cf-872b-fd3d11325981', rev: 1, type: 'numeric', prompt: 'A $200,000 server has an exposure factor of 40%. What is the SLE in dollars?', answer: 80000, unit: '$', x: 'SLE = Asset Value × Exposure Factor = 200,000 × 0.4 = $80,000.' },
    { uuid: 'b4233e3d-e404-414e-b7cc-36a737c16c0a', rev: 1, type: 'numeric', prompt: 'With that $80,000 SLE and an ARO of 0.5 (once every two years), what is the ALE?', answer: 40000, unit: '$', x: 'ALE = SLE × ARO = 80,000 × 0.5 = $40,000 a year. Controls costing more than that per year are hard to justify.' },
  ],
  'sec-ops': [
    { uuid: '3edf16b3-8905-46a4-bbce-51a40b3fc2b0', rev: 1, type: 'order', prompt: 'Order the NIST SP 800-61r2 incident response phases.', items: ['Preparation', 'Detection & Analysis', 'Containment, Eradication & Recovery', 'Post-Incident Activity'], x: 'Lessons learned from post-incident activity feed back into preparation.' },
    { uuid: '09c634b9-2562-46e8-a71f-8267ef7de762', rev: 1, type: 'order', prompt: 'Collect evidence in order of volatility, most volatile first.', items: ['CPU registers & cache', 'RAM', 'Swap / temp files', 'Disk', 'Remote logs', 'Archival media'], x: 'Capture what disappears first before it is gone.' },
  ],

  // ---------- Cybersecurity ----------
  'cy-linux': [
    { uuid: 'ec323e5b-11a6-40f2-9623-407cacfb452f', rev: 1, type: 'numeric', prompt: 'What octal mode gives the owner rw-, the group r--, and others ---?', answer: 640, x: 'r=4, w=2, x=1. Owner 4+2=6, group 4, others 0, so 640.' },
    { uuid: 'a2c3493e-df76-479d-95d0-6d2a38fffa0f', rev: 1, type: 'widget', widget: 'bits', prompt: 'Permissions are bits too. Set the three low bits (r, w, x) of "others" to all on.', goal: { value: 7 }, x: '4 + 2 + 1 = 7, which is full rwx. That is the last digit of chmod 777, which is almost always a mistake.' },
  ],
  'cy-frameworks': [
    { uuid: '097ec9df-7189-4090-ba04-b5f755b8d99b', rev: 1, type: 'order', prompt: 'Order the Lockheed Martin Cyber Kill Chain.', items: ['Reconnaissance', 'Weaponization', 'Delivery', 'Exploitation', 'Installation', 'Command & Control', 'Actions on Objectives'], x: 'Break any link and the intrusion fails. The earlier you break it, the cheaper it is.' },
  ],
  'cy-pentest': [
    { uuid: '37896274-6c18-4b65-8b83-f5f82b154e2a', rev: 1, type: 'order', prompt: 'Order the phases of a penetration test.', items: ['Planning & scoping', 'Reconnaissance', 'Scanning & enumeration', 'Exploitation', 'Post-exploitation', 'Reporting'], x: 'Scoping with written authorisation comes first; the report is the actual deliverable.' },
  ],

  // ---------- Cloud ----------
  'cl-concepts': [
    { uuid: 'c17729b9-8366-452e-9fec-275a456dee9a', rev: 1, type: 'order', prompt: 'Order these models from MOST to LEAST customer responsibility.', items: ['On-premises', 'IaaS', 'PaaS', 'SaaS'], x: 'Each step up hands more of the stack to the provider. Data and identity always stay yours.' },
  ],
  'cl-networking': [
    { uuid: '8dbb188a-2563-4a14-a4b7-9a4b76d694a6', rev: 1, type: 'widget', widget: 'cidr', prompt: 'Your VPC is 10.0.0.0/16. Slide to the prefix that gives each subnet 4,096 addresses.', goal: { prefix: 20 }, x: '/20 leaves 12 host bits: 2^12 = 4,096 addresses, so the /16 splits into 16 subnets. AWS reserves 5 IPs in each subnet.' },
  ],
  'cl-architecture': [
    { uuid: 'fef7f4b3-2ac9-4f47-97d8-2338db5f4ec0', rev: 1, type: 'order', prompt: 'Order the DR strategies from cheapest (slowest) to most expensive (fastest).', items: ['Backup & restore', 'Pilot light', 'Warm standby', 'Multi-site active/active'], x: 'Pick the cheapest one that still meets the business RTO and RPO.' },
  ],
  'cl-sre': [
    { uuid: 'cd93d211-317e-43b8-8d53-0d9db0d1f0d4', rev: 1, type: 'numeric', prompt: 'A 30-day month with a 99.9% availability SLO allows how many minutes of downtime?', answer: 43.2, tolerance: 0.5, unit: 'min', x: '30 × 24 × 60 = 43,200 minutes, and 0.1% of that is 43.2 minutes. That is your error budget.' },
  ],

  // ---------- AI Engineering ----------
  'ai-ml-basics': [
    { uuid: 'e74a683c-0a6f-4d7d-8d8d-24ccd1f850b6', rev: 1, type: 'numeric', prompt: 'A malware model flags 50 files: 40 are truly malicious, 10 are clean. What is its precision (%)?', answer: 80, unit: '%', x: 'Precision = TP / (TP + FP) = 40 / 50 = 80%. It says nothing about the malware it missed; that is recall.' },
    { uuid: '3f6d8bf7-8e68-4302-813d-598a5972f147', rev: 1, type: 'order', prompt: 'Order a basic ML workflow.', items: ['Collect & clean data', 'Split train / validation / test', 'Train the model', 'Tune on validation', 'Evaluate once on test', 'Deploy & monitor'], x: 'Touch the test set only once, at the end, or its score stops being honest.' },
  ],
  'ai-rag': [
    { uuid: '16b8b531-4892-4010-be46-a6df93e9cec9', rev: 1, type: 'order', prompt: 'Order a RAG pipeline, from indexing to answering.', items: ['Chunk documents', 'Embed chunks', 'Store in a vector index', 'Embed the user question', 'Retrieve the top-k chunks', 'Generate an answer with the chunks in context'], x: 'The first three steps run ahead of time (indexing); the last three run on every question.' },
  ],

  // ---------- CISSP ----------
  'cissp-mindset': [
    { uuid: '331f229f-ef15-428f-af96-d064955922c2', rev: 1, type: 'order', prompt: 'Order the ISC2 Code of Ethics canons by priority.', items: ['Protect society, the common good, and the infrastructure', 'Act honourably, honestly, justly, responsibly, and legally', 'Provide diligent and competent service to principals', 'Advance and protect the profession'], x: 'When canons conflict, the higher one wins. Society comes before your employer.' },
  ],
  'cissp-d1': [
    { uuid: '848ea0c8-1db9-4335-9680-f12098a8a63d', rev: 1, type: 'order', prompt: 'Order the NIST Risk Management Framework steps.', items: ['Prepare', 'Categorize', 'Select', 'Implement', 'Assess', 'Authorize', 'Monitor'], x: '"People Can See I Am Always Monitoring." Authorize is the executive decision to accept residual risk.' },
    { uuid: 'd3fa6912-2e71-42f5-b61e-c33687d737ca', rev: 1, type: 'numeric', prompt: 'A risk has an ALE of $50,000. A control cuts it to $10,000 and costs $15,000 a year. What is the control’s annual value?', answer: 25000, unit: '$', x: '(ALE before − ALE after) − annual control cost = (50,000 − 10,000) − 15,000 = $25,000. It is positive, so the control is worth it.' },
  ],
  'cissp-d7': [
    { uuid: 'ae9ab177-4952-4faa-95fb-79adeabf121e', rev: 1, type: 'order', prompt: 'Order the DR test types from least to most disruptive.', items: ['Checklist / read-through', 'Structured walk-through (tabletop)', 'Simulation', 'Parallel', 'Full interruption'], x: 'Only run a full interruption test when you are confident, and with management approval.' },
  ],
  'cissp-d8': [
    { uuid: 'a163d6db-d3f3-4fe5-8e68-423b44b043de', rev: 1, type: 'order', prompt: 'Order the CMMI maturity levels from 1 to 5.', items: ['Initial', 'Managed', 'Defined', 'Quantitatively Managed', 'Optimizing'], x: 'Maturity grows from ad hoc work to measured, continuously improving processes.' },
  ],

  // ---------- Terraform ----------
  'tf-core-workflow': [
    { uuid: '79d3697e-a2cf-4b0a-8d2b-40ecc8c7b25c', rev: 1, type: 'order', prompt: 'Put the core Terraform workflow in order for a first run.', items: ['terraform init', 'terraform validate', 'terraform plan', 'terraform apply'], x: 'init downloads providers and sets up the backend, validate checks the config, plan previews the change, apply makes it real.' },
    { uuid: 'b924b0a4-ed3c-4ad3-9611-20d451343bf3', rev: 1, type: 'numeric', prompt: 'How many resources does a plan showing "2 to add, 1 to change, 0 to destroy" apply in total (add + change + destroy)?', answer: 3, x: 'A plan summarises the actions: 2 creates + 1 update + 0 deletes = 3 resource actions.' },
  ],
  'tf-prod-security': [
    { uuid: 'b852aa0d-8b4a-46a5-a525-25432e48acd0', rev: 1, type: 'order', prompt: 'Order the stages of a safe Terraform CI pipeline.', items: ['terraform fmt and validate', 'terraform plan -out=plan', 'policy and security scan', 'human review of the plan', 'gated terraform apply plan'], x: 'Format and validate, produce a saved plan, scan it, let a human review it, then apply exactly that reviewed plan.' },
  ],

  // ---------- C++ ----------
  'cpp-basics': [
    { uuid: '0d430e19-4e9b-4389-a06b-b605e6739e87', rev: 1, type: 'order', prompt: 'Put the C++ build pipeline in order, from source to running program.', items: ['Preprocess (#include, macros)', 'Compile to object code', 'Link objects and libraries', 'Run the executable'], x: 'The preprocessor expands includes and macros, the compiler produces object files, the linker combines them into an executable, then the OS runs it.' },
    { uuid: '4123705c-31eb-4a9f-8831-b1419eaccabb', rev: 1, type: 'numeric', prompt: 'What does the expression 7 / 2 evaluate to in C++ when both operands are int?', answer: 3, x: 'Integer division truncates toward zero: 7 / 2 is 3. Use 7.0 / 2 to get 3.5.' },
  ],
  'cpp-stl': [
    { uuid: '34aef8d3-665d-4da0-ade7-9f245470006e', rev: 1, type: 'numeric', prompt: 'You push_back three elements onto an empty std::vector. What does v.size() return?', answer: 3, x: 'push_back appends to the end; size() reports the element count — here 3.' },
  ],

  // ---------- Go ----------
  'go-basics': [
    { uuid: '61bee163-90f5-4005-a5f9-da60a2d35c01', rev: 1, type: 'order', prompt: 'Order the steps to create and build a new Go program.', items: ['go mod init example', 'write package main and func main', 'go mod tidy', 'go build'], x: 'Initialise the module, write the code, tidy dependencies into go.mod/go.sum, then compile the binary.' },
    { uuid: '4b542676-abde-4d29-8236-9fd4ad7a8fb3', rev: 1, type: 'numeric', prompt: 'How many loop keywords does Go have?', answer: 1, x: 'Just `for` — it covers C-style loops, while-style (for cond {}) and infinite (for {}).' },
  ],
  'go-concurrency': [
    { uuid: 'd6585cef-fc8c-4e32-a599-e5e3b8974e92', rev: 1, type: 'order', prompt: 'Order the sync.WaitGroup pattern to wait for N goroutines.', items: ['wg.Add(n) before launching', 'launch each goroutine with defer wg.Done()', 'wg.Wait() blocks until the counter hits zero'], x: 'Add the count up front, each goroutine signals Done when it finishes, and Wait blocks until all have.' },
  ],

  // ---------- Rust ----------
  'rust-basics': [
    { uuid: '3a988444-4cc7-4d95-9635-427d09173e93', rev: 1, type: 'order', prompt: 'Order the Cargo workflow to run a new Rust program.', items: ['cargo new app', 'write code in src/main.rs', 'cargo check', 'cargo run'], x: 'Scaffold the project, write the code, fast-check it compiles/borrows, then build-and-run.' },
    { uuid: '197b5ac4-8621-458f-82bb-355eee02f7d2', rev: 1, type: 'numeric', prompt: 'How many values does the range 0..5 produce?', answer: 5, x: '0..5 is end-exclusive: 0, 1, 2, 3, 4 — five values. Use 0..=5 for inclusive.' },
  ],
  'rust-ownership': [
    { uuid: 'c2d5b77a-d759-4533-8ecd-c863d85bdfb7', rev: 1, type: 'order', prompt: 'Order the borrowing rules from most to least permissive by count.', items: ['Any number of immutable &T references', 'Exactly one mutable &mut T reference', 'Never both at the same time'], x: 'Share freely OR mutate exclusively — the compiler forbids aliasing and mutation together, which is what prevents data races.' },
  ],

  // ---------- SQL ----------
  'sql-select': [
    { uuid: 'd446bd79-3527-49b8-99f8-241d3c9f67df', rev: 1, type: 'order', prompt: 'Put the SQL clauses in the order you write them in a query.', items: ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT'], x: 'Written order: choose columns, pick the table, filter rows, group them, filter groups, sort, then limit. (The DB evaluates FROM/WHERE first, but this is how you type it.)' },
    { uuid: 'c9fe6460-1f7d-4194-a5bb-cc1a7c919ebb', rev: 1, type: 'numeric', prompt: 'A table has 5 rows; 2 of them have NULL in the "email" column. What does COUNT(email) return?', answer: 3, x: 'COUNT(column) ignores NULLs, so it counts the 3 non-NULL emails. COUNT(*) would return 5.' },
  ],
  'sql-transactions-security': [
    { uuid: 'aa49869f-97c1-4f53-8962-488582eba09d', rev: 1, type: 'order', prompt: 'Order a safe money-transfer transaction.', items: ['BEGIN', 'UPDATE accounts SET balance = balance - 100 (debit)', 'UPDATE accounts SET balance = balance + 100 (credit)', 'COMMIT'], x: 'Both updates happen atomically between BEGIN and COMMIT; if either fails you ROLLBACK, so money is never lost or created.' },
  ],

  // ---------- Docker ----------
  'docker-images': [
    { uuid: 'a10041c2-7c21-481d-8651-916857a29f23', rev: 1, type: 'order', prompt: 'Order a cache-friendly Dockerfile for a Node app.', items: ['FROM node:20-alpine', 'WORKDIR /app', 'COPY package.json .', 'RUN npm install', 'COPY . .', 'CMD ["node", "server.js"]'], x: 'Copy and install dependencies BEFORE copying all source, so the install layer is cached and only re-runs when package.json changes.' },
  ],
  'docker-optimization-security': [
    { uuid: '396137b5-5974-4180-8b4c-6db2d1f8878c', rev: 1, type: 'order', prompt: 'Order a multi-stage build that ships only the artifact.', items: ['FROM node AS build', 'RUN build the app', 'FROM nginx:alpine (slim runtime)', 'COPY --from=build the built files'], x: 'The heavy build tools stay in the build stage; the final image copies only the compiled output into a slim runtime — smaller and more secure.' },
  ],

  // ---------- Kubernetes ----------
  'k8s-workloads': [
    { uuid: '1e400449-16d8-400a-811d-14c4a86ba897', rev: 1, type: 'order', prompt: 'Order the Kubernetes workload abstractions from smallest to largest.', items: ['Container', 'Pod', 'ReplicaSet', 'Deployment'], x: 'A Deployment manages a ReplicaSet, which keeps N Pods running, and each Pod runs one or more Containers.' },
  ],
  'k8s-networking': [
    { uuid: 'a50eab51-a0f8-4d05-852c-d2530f00aba3', rev: 1, type: 'order', prompt: 'Order the path external HTTP traffic takes to reach a pod.', items: ['Client request', 'Ingress controller (host/path routing)', 'Service (stable virtual IP)', 'Pod'], x: 'Ingress routes by host/path to a Service, the Service load-balances to a healthy Pod by label selector.' },
  ],

  // ---------- Git ----------
  'git-staging-commits': [
    { uuid: '5d6fc329-2ed5-451c-92d1-4202b314e377', rev: 1, type: 'order', prompt: 'Order the steps to record and share a change in Git.', items: ['Edit a file (working directory)', 'git add (stage the change)', 'git commit (record a snapshot)', 'git push (share to the remote)'], x: 'Changes flow working directory → staging area → local repo → remote. A commit is local until you push.' },
  ],
  'git-conflicts': [
    { uuid: 'ae5bc51d-cec0-4d60-9413-c4db1a033cee', rev: 1, type: 'order', prompt: 'Order the steps to resolve a merge conflict.', items: ['git merge triggers a conflict', 'Edit the file, removing <<<<<<< ======= >>>>>>>', 'git add the resolved file', 'git commit to finish the merge'], x: 'You edit to the correct result and delete all three markers, then staging marks it resolved and the commit completes the merge.' },
  ],

  // ---------- Introduction to Information Technology ----------
  'it-what-is-it': [
    { uuid: '37bd51fc-9cc9-4ce2-9b1b-f4facffe4a94', rev: 1, type: 'order', prompt: 'Put the input–process–output–storage cycle in order.', items: ['Input: data goes in', 'Process: the CPU works on it', 'Output: a result comes out', 'Storage: the result is saved'], x: 'Every computer job follows the same cycle — in, work, out, keep — whether it is an email or a database query.' },
  ],
  'it-binary-basics': [
    { uuid: '6376cb14-d3b6-4f6f-8871-b050806074a4', rev: 1, type: 'widget', widget: 'bits', prompt: 'Flip the bits to make 13 — the first number in the lesson.', goal: { value: 13 }, x: '1101 is 8 + 4 + 1 = 13. Each position doubles as you move left: 1, 2, 4, 8.' },
    { uuid: '7d70c026-78ff-44a1-9df3-723e398dca2a', rev: 1, type: 'numeric', prompt: 'What is binary 1010 in decimal?', answer: 10, x: '8 + 2 = 10. Only the 8 and 2 positions hold a 1.' },
  ],
  'it-hardware': [
    { uuid: 'deef6c64-7d02-47be-bea0-44d7290befb1', rev: 1, type: 'numeric', prompt: 'What is the maximum RAM a 32-bit system can address, in GB?', answer: 4, unit: 'GB', x: '2^32 addresses is about 4 GB. A 64-bit system can address far more memory than any machine will hold for decades.' },
    { uuid: 'bb829691-bb37-4dc5-8365-56098b22e3cb', rev: 1, type: 'order', prompt: 'Put the CPU cycle in order.', items: ['Fetch the instruction', 'Decode what it means', 'Execute it'], x: 'The CPU repeats fetch → decode → execute billions of times a second. That cycle is what "running a program" means.' },
  ],
  'it-storage-memory': [
    { uuid: '2130f870-f153-4abe-8f1d-bda73c080a92', rev: 1, type: 'order', prompt: 'Order the memory hierarchy from fastest to slowest.', items: ['Registers', 'Cache (L1/L2/L3)', 'RAM', 'SSD', 'Hard drive'], x: 'Each level is faster but smaller than the one below it. Data moves up the ladder when it is needed and down again when it is not.' },
    { uuid: 'bd23ad2d-6cc9-4e37-a21c-a9d3e85980b2', rev: 1, type: 'numeric', prompt: 'How many KB are in 1 MB?', answer: 1024, unit: 'KB', x: 'Computers count in powers of two: 1 KB is 1,024 bytes and 1 MB is 1,024 KB.' },
  ],
  'it-os-boot': [
    { uuid: '99af46b1-868f-48ad-a716-b346c8a6c28c', rev: 1, type: 'order', prompt: 'Put the boot sequence in order.', items: ['POST checks the hardware', 'Firmware finds the boot device', 'Bootloader loads the kernel', 'Kernel starts services', 'Login screen appears'], x: 'Booting is a relay race — each stage hands off to the next. A failure at any stage stops the machine there.' },
    { uuid: 'e633925c-9316-4ac8-9ad4-7ec2075a3384', rev: 1, type: 'numeric', prompt: 'How many primary partitions can an MBR disk have?', answer: 4, x: 'Four entries fit in the MBR table. To have more, one primary becomes an extended partition holding logical partitions.' },
  ],
  'it-files-cli': [
    { uuid: 'ae436ee2-dd8f-40b2-aaec-d6dcbd49f616', rev: 1, type: 'numeric', prompt: 'What is the maximum size of a single file on FAT32, in GB?', answer: 4, unit: 'GB', x: 'FAT32 caps a single file at 4 GB and has no permissions — one reason it survives only on USB sticks and cameras.' },
    { uuid: 'cc6ffb29-fb71-48a0-9e79-b8ee44deac35', rev: 1, type: 'order', prompt: 'Order the steps to find and read a file from the terminal.', items: ['Open the terminal', 'cd to the folder', 'ls to check the file is there', 'cat the file to read it'], x: 'Know where you are, check what is there, then read it. pwd tells you where you are if you ever get lost.' },
  ],
};
