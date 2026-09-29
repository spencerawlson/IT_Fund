// Reading content for the AI Engineering course, keyed by lesson (deck) id.
// Strings support `inline code` only. Aligned with src/data/academy/ai.js. Examples are
// provider-neutral: plain Python, JSON Schema, and pseudocode.

const code = (...lines) => lines.join('\n');

/** @type {Record<string, import('../schema').LessonContent>} */
export default {
  'ai-ml-basics': {
    overview: [
      'Machine learning builds programs from examples instead of hand-written rules. Spam filters, fraud scores and malware classifiers all work this way, and understanding how they are trained and measured tells you when to trust them.',
      'This lesson covers the three kinds of learning, regression and classification, features and labels, training with loss and gradient descent, overfitting and data splits, and the metrics that matter for security use cases.',
    ],
    learn: [
      {
        heading: 'Three ways to learn',
        body: [
          'Supervised learning uses labelled examples, inputs with known answers. Predicting a number (a house price) is regression; predicting a category (spam or not spam) is classification. Unsupervised learning finds structure without labels, such as clustering customers with k-means. Reinforcement learning learns by trial and reward; RLHF (reinforcement learning from human feedback) uses it to align language models with human preferences.',
          'A feature is an input variable the model uses; the label is the output you want to predict.',
        ],
      },
      {
        heading: 'How training works',
        body: [
          'A loss function measures how wrong the model\'s predictions are, and training minimises it. Gradient descent adjusts the parameters step by step in the direction that reduces the loss, with the learning rate setting the step size: too large and training diverges, too small and it crawls.',
        ],
      },
      {
        heading: 'Generalisation',
        body: [
          'Overfitting is memorising the training data and failing on new data: high training accuracy, low validation accuracy. Underfitting is a model too simple to capture the pattern, scoring poorly on both.',
          'Split data into train, validation and test sets. Train on the first, tune choices on the second, and measure true generalisation once on the third. Never tune on the test set, or its score is no longer honest.',
        ],
      },
      {
        heading: 'Measuring what matters',
        body: [
          'Accuracy misleads on imbalanced data. If 1% of transactions are fraud, a model that always says "not fraud" is 99% accurate and useless.',
          'For a malware detector, precision means few false alarms (of everything flagged, how much was really malicious), and recall means few missed threats (of all the malware, how much was caught). There is usually a trade-off, set by the decision threshold; F1 balances the two.',
        ],
      },
    ],
    examples: [
      {
        title: 'Train and evaluate a classifier honestly (scikit-learn)',
        code: code(
          'from sklearn.model_selection import train_test_split',
          'from sklearn.ensemble import RandomForestClassifier',
          'from sklearn.metrics import classification_report',
          '',
          'X_train, X_test, y_train, y_test = train_test_split(',
          '    X, y, test_size=0.2, stratify=y, random_state=42)',
          '',
          'model = RandomForestClassifier(n_estimators=200)',
          'model.fit(X_train, y_train)',
          'print(classification_report(y_test, model.predict(X_test)))   # precision, recall, F1',
        ),
        explanation: '`stratify=y` keeps the rare class proportion the same in both splits, which matters for imbalanced security data.',
      },
    ],
    cheatSheet: [
      ['Supervised', 'Labelled data: regression, classification'],
      ['Unsupervised', 'No labels: clustering (k-means)'],
      ['Reinforcement', 'Trial and reward (RLHF)'],
      ['Feature / label', 'Input variable / target output'],
      ['Loss', 'How wrong predictions are'],
      ['Gradient descent', 'Step downhill; learning rate = step size'],
      ['Overfitting', 'High train, low validation accuracy'],
      ['Train / val / test', 'Fit / tune / final honest score'],
      ['Precision', 'Few false alarms'],
      ['Recall', 'Few missed threats'],
      ['Imbalanced data', 'Accuracy misleads; use precision/recall/F1'],
    ],
  },

  'ai-dl-basics': {
    overview: [
      'Deep learning stacks many simple units into networks that learn their own features: edges and shapes in images, grammar and meaning in text. It is what made modern vision, speech and language models possible.',
      'This lesson covers neurons and activation functions, backpropagation, training vocabulary, the main architectures from CNNs to the Transformer, self-attention, transfer learning, dropout, and why GPUs matter.',
    ],
    learn: [
      {
        heading: 'Neurons and learning',
        body: [
          'Each neuron computes a weighted sum of its inputs plus a bias, then applies an activation function. The activation adds non-linearity, without which a deep network would collapse into one linear equation. ReLU, `max(0, x)`, is the common default.',
          'Parameters are the learned weights and biases; model size is quoted in parameters, such as 70B. Hyperparameters are settings chosen before training, like learning rate and batch size, and are tuned on the validation set.',
          'Backpropagation computes each weight\'s gradient of the loss using the chain rule, working backwards from the output; gradient descent then updates the weights. Andrej Karpathy\'s micrograd builds it from scratch in about a hundred lines and is the best way to see it click.',
        ],
      },
      {
        heading: 'Training vocabulary',
        body: [
          'An epoch is one full pass over the training data; a batch is the subset processed in one step. Dropout randomly disables neurons during training so the network cannot rely on any single path, reducing overfitting; it is turned off at inference time.',
          'GPUs run massive numbers of matrix operations in parallel, which is exactly what neural networks need. TPUs and other accelerators do the same.',
        ],
      },
      {
        heading: 'Architectures',
        body: [
          'Convolutional neural networks (CNNs) were the classic architecture for images, learning filters that detect local patterns; vision transformers now compete strongly.',
          'The Transformer, introduced in "Attention Is All You Need" (2017), underlies modern LLMs. Its self-attention mechanism lets every token weigh how relevant every other token is, capturing long-range context and processing sequences in parallel.',
          'Transfer learning starts from a pretrained model and adapts it to a new task, needing far less data and compute than training from scratch.',
        ],
      },
    ],
    cheatSheet: [
      ['Activation (ReLU)', 'Adds non-linearity: max(0, x)'],
      ['Backpropagation', 'Gradients via the chain rule'],
      ['Parameter', 'Learned weight or bias (e.g. 70B)'],
      ['Hyperparameter', 'Chosen before training (learning rate)'],
      ['Epoch / batch', 'Full pass / one step\'s subset'],
      ['Dropout', 'Random disabling to reduce overfitting'],
      ['CNN', 'Classic image architecture'],
      ['Transformer', '2017; basis of LLMs'],
      ['Self-attention', 'Every token weighs every other token'],
      ['Transfer learning', 'Adapt a pretrained model'],
      ['GPUs', 'Parallel matrix maths'],
    ],
  },

  'ai-llm-basics': {
    overview: [
      'Large language models predict text one token at a time, and that simple mechanism explains most of their strengths and failure modes. Knowing how tokens, context and sampling work makes you far better at using them and at building on them.',
      'This lesson covers tokens and context windows, pretraining, sampling and temperature, prompting techniques, hallucinations and knowledge cutoffs, embeddings, structured output, and open-weight versus closed models.',
    ],
    learn: [
      {
        heading: 'Tokens, context and training',
        body: [
          'A token is a chunk of text, often part of a word, and it is the unit models process. Pricing and limits are counted in tokens. The context window is the maximum number of tokens the model can consider at once, and it includes everything: system prompt, conversation, documents and the output itself.',
          'Pretraining teaches general language by predicting the next token across huge text corpora. Fine-tuning and RLHF then shape behaviour into a helpful assistant. A model knows nothing after its knowledge cutoff, so use search or retrieval for newer facts.',
        ],
      },
      {
        heading: 'Controlling output',
        body: [
          'Temperature controls sampling randomness: low values give focused, repeatable output; high values give more varied output.',
          'A system prompt sets the model\'s role and rules for the whole conversation, so put persistent guidance and constraints there. Few-shot prompting includes examples of the desired input and output; zero-shot gives none. Asking for structured JSON lets code reliably parse and validate the answer, and many APIs can enforce a schema through structured outputs or tool definitions.',
        ],
      },
      {
        heading: 'Hallucinations and embeddings',
        body: [
          'A hallucination is confident but false or fabricated output, a natural result of generating plausible text. Reduce it with grounding (RAG), by asking for citations, and by verifying claims that matter.',
          'An embedding is a vector representing meaning, so similar texts land close together in vector space. Embeddings power semantic search and retrieval-augmented generation.',
        ],
      },
      {
        heading: 'Choosing a model',
        body: [
          'Open-weight models can be downloaded and self-hosted; closed models are accessed only through an API. The trade-off is control and privacy against capability and managed operations.',
        ],
      },
    ],
    examples: [
      {
        title: 'A prompt that gets reliable, parseable output',
        code: code(
          'System: You are a SOC assistant. Classify each alert. Reply with JSON only,',
          '        matching {"severity": "low|medium|high", "reason": string}.',
          '',
          'User:   Example alert: 5 failed logins for one user in 10 minutes',
          'Assistant: {"severity": "low", "reason": "Typical mistyped password"}',
          '',
          'User:   Alert: 400 failed logins across 380 accounts from one IP in 5 minutes',
        ),
        explanation: 'Role and format in the system prompt, one example (few-shot), then the real input. Low temperature keeps the output consistent.',
      },
    ],
    cheatSheet: [
      ['Token', 'Text chunk; unit of pricing and limits'],
      ['Context window', 'Max tokens in + out at once'],
      ['Pretraining', 'Next-token prediction on huge corpora'],
      ['Temperature', 'Low = focused; high = varied'],
      ['System prompt', 'Persistent role and rules'],
      ['Few-shot / zero-shot', 'With / without examples'],
      ['Hallucination', 'Confident falsehood; ground and verify'],
      ['Knowledge cutoff', 'No data after this date'],
      ['Embedding', 'Meaning as a vector'],
      ['Structured output', 'JSON that code can validate'],
      ['Open-weight vs closed', 'Self-host control vs API capability'],
    ],
  },

  'ai-rag': {
    overview: [
      'Retrieval-augmented generation lets a model answer from your documents instead of its training data. It is the most common way to build a useful internal assistant, and the most common way to accidentally build a data leak.',
      'This lesson covers how RAG works, chunking, embeddings and vector databases, hybrid search and reranking, citations, RAG versus fine-tuning, access control, indirect prompt injection and evaluation.',
    ],
    learn: [
      {
        heading: 'How RAG works',
        body: [
          'RAG retrieves the passages most relevant to a question and adds them to the prompt, grounding the answer in your data without retraining anything. Offline, documents are split into chunks, each chunk is embedded, and the vectors are stored in a vector database. At query time, the question is embedded and the most similar chunks, usually by cosine similarity, are retrieved.',
          'Chunking matters. Chunks must be focused enough to be relevant and small enough to fit the context window, and chunk size and overlap strongly affect quality. Vector databases include pgvector, Pinecone, Weaviate and FAISS.',
        ],
      },
      {
        heading: 'Better retrieval',
        body: [
          'Hybrid search combines keyword search (BM25) with vector search: keywords catch exact terms like error codes and product names, while vectors catch meaning. A reranker then re-scores the retrieved chunks for relevance before they go into the prompt, improving precision.',
          'Ask the model to cite its sources so users can verify claims and spot hallucinations, and instruct it to say it does not know when the context lacks the answer.',
        ],
      },
      {
        heading: 'RAG or fine-tuning?',
        body: [
          'For fresh company facts, use RAG: update the documents and the answers change, with no retraining. Fine-tuning is better for teaching style, format or a narrow skill.',
        ],
      },
      {
        heading: 'Securing and evaluating RAG',
        body: [
          'The key control for enterprise RAG is enforcing each user\'s document permissions at retrieval time. Otherwise the assistant happily summarises documents the user was never allowed to open.',
          'Indirect prompt injection hides malicious instructions inside documents that get retrieved. Treat retrieved content as data, never as instructions, and limit what the model can do with it.',
          'Evaluate retrieval relevance (did we fetch the right chunks?) and answer faithfulness (does the answer stick to them?) separately, using a labelled set of real questions.',
        ],
      },
    ],
    architecture: {
      caption: 'A RAG pipeline. Permissions are enforced at retrieval, before anything reaches the prompt.',
      diagram: code(
        'Ingest:  documents -> chunk -> embed -> vector DB (+ ACL metadata per chunk)',
        '',
        'Query:   question',
        '           |-> embed ------------+',
        '           |-> keyword (BM25) ---+-> hybrid search, filtered by user ACL',
        '                                 |',
        '                                 v',
        '                       rerank top chunks',
        '                                 |',
        '                                 v',
        '       prompt = instructions + chunks (as data) + question',
        '                                 |',
        '                                 v',
        '                  answer with citations to chunk sources',
      ),
    },
    cheatSheet: [
      ['RAG', 'Retrieve passages into the prompt'],
      ['Chunking', 'Size and overlap drive quality'],
      ['Vector DB', 'pgvector, Pinecone, Weaviate, FAISS'],
      ['Cosine similarity', 'Angle between embeddings'],
      ['Hybrid search', 'BM25 keywords + vectors'],
      ['Reranker', 'Re-score chunks before prompting'],
      ['Citations', 'Verify claims; allow "I don\'t know"'],
      ['RAG vs fine-tune', 'Fresh facts vs style/skill'],
      ['Access control', 'Enforce user permissions at retrieval'],
      ['Indirect injection', 'Retrieved text is data, not instructions'],
      ['Evaluation', 'Retrieval relevance + answer faithfulness'],
    ],
  },

  'ai-apis-tools': {
    overview: [
      'Most AI features are built by calling a model API from your own code. The interesting part is everything around the call: letting the model use tools, streaming answers, controlling cost, handling rate limits and keeping keys safe.',
      'This lesson covers tool use and JSON Schema, streaming, prompt caching, rate limits and retries, cost control and model routing, API key handling, grounding and MCP.',
    ],
    learn: [
      {
        heading: 'Tool use',
        body: [
          'With tool use (function calling), the model does not run anything itself. It returns a request to call a named function with arguments; your code validates the arguments, runs the function, and sends the result back for the model to continue.',
          'Define each tool with a JSON Schema so the model produces valid, typed arguments, and still validate those arguments server-side: the model can be wrong, or manipulated.',
          'Grounding means tying answers to supplied sources or tool results, which reduces hallucination and makes citations possible. MCP (Model Context Protocol) is an open, standard way to expose tools and data to AI applications. Treat third-party MCP servers as untrusted code.',
        ],
      },
      {
        heading: 'Latency and cost',
        body: [
          'Streaming delivers tokens as they are generated, typically over Server-Sent Events, which greatly improves perceived latency. Prompt caching reuses an already processed prompt prefix across calls to cut cost and latency, so put stable content (system prompt, reference documents) first, and variable content last.',
          'APIs usually charge per input and output token, with output tokens typically priced higher. Set a maximum output length to cap cost and latency and prevent runaway responses, but check the stop reason, because too low a limit silently truncates answers. Model routing sends easy tasks to small, cheap models and hard ones to large models.',
        ],
      },
      {
        heading: 'Reliability and safety',
        body: [
          'HTTP 429 means you are rate limited. Retry with exponential backoff and jitter, and respect any `retry-after` header.',
          'API keys live on the server, never in browser code: anything shipped to the browser is public. Your front end calls your back end, which calls the model.',
        ],
      },
    ],
    examples: [
      {
        title: 'A tool definition (JSON Schema)',
        code: code(
          '{',
          '  "name": "lookup_ip_reputation",',
          '  "description": "Get the reputation score for an IPv4 address.",',
          '  "input_schema": {',
          '    "type": "object",',
          '    "properties": {',
          '      "ip": { "type": "string", "description": "IPv4 address, e.g. 203.0.113.7" }',
          '    },',
          '    "required": ["ip"]',
          '  }',
          '}',
        ),
        explanation: 'The model decides when to call it and fills in `ip`; your code validates the address before querying anything.',
      },
      {
        title: 'Retry 429s with exponential backoff and jitter',
        code: code(
          'import random, time',
          '',
          'def call_with_retry(send, max_attempts=5):',
          '    for attempt in range(max_attempts):',
          '        resp = send()',
          '        if resp.status_code != 429:',
          '            return resp',
          '        wait = float(resp.headers.get("retry-after", 2 ** attempt))',
          '        time.sleep(wait + random.uniform(0, 1))   # jitter spreads retries out',
          '    raise RuntimeError("rate limited: giving up")',
        ),
        explanation: 'Without jitter, every client retries at the same instant and triggers the limit again.',
      },
    ],
    cheatSheet: [
      ['Tool use', 'Model requests; your code runs and validates'],
      ['JSON Schema', 'Typed tool arguments'],
      ['Streaming', 'Tokens as generated (SSE)'],
      ['Prompt caching', 'Stable prefix first'],
      ['429', 'Backoff + jitter; honour retry-after'],
      ['API keys', 'Server only, never in the browser'],
      ['Pricing', 'Per input/output token (output dearer)'],
      ['Max output tokens', 'Cap cost; check the stop reason'],
      ['Model routing', 'Small models for easy tasks'],
      ['Grounding', 'Tie answers to sources or tool results'],
      ['MCP', 'Open protocol for tools; untrusted by default'],
    ],
  },

  'ai-finetune-eval': {
    overview: [
      'Changing a model\'s behaviour is expensive and easy to get wrong; knowing whether a change helped is harder still. Evals are to AI engineering what unit tests are to software: without them, every prompt tweak is a guess.',
      'This lesson covers when to fine-tune, LoRA and quantisation, distillation, catastrophic forgetting, building evals and golden datasets, LLM-as-a-judge, benchmark contamination and production logging.',
    ],
    learn: [
      {
        heading: 'When and how to fine-tune',
        body: [
          'Fine-tuning is the right tool for consistent style or format, or a narrow task that prompting cannot achieve. Try prompting and RAG first; they are cheaper and faster to iterate on.',
          'LoRA trains small low-rank adapter matrices instead of all the weights, which makes fine-tuning cheap enough for a single GPU; QLoRA adds 4-bit quantisation. Quantisation in general stores weights in lower precision (8-bit, 4-bit) to save memory, at some cost in quality.',
          'Catastrophic forgetting is fine-tuning eroding general abilities the model had before. Mitigate it with adapters, by mixing in general data, and with low learning rates. Distillation trains a small model to imitate a larger one, giving cheaper inference at some quality cost.',
        ],
      },
      {
        heading: 'Evals',
        body: [
          'An eval is a repeatable test set that measures model or application quality. Run it on every prompt or model change, like a unit test suite. A golden dataset is a curated set of inputs with expected outputs used for regression testing; grow it from real failures seen in production.',
          'LLM-as-a-judge uses a model to grade outputs against a rubric, which scales to thousands of cases. Calibrate it against human grades and watch for bias, such as favouring longer answers.',
          'Public benchmark scores can be inflated by contamination, when test data leaked into training. Build private evals from your own use cases.',
        ],
      },
      {
        heading: 'Production logging',
        body: [
          'Log prompts and outputs in production for debugging, evals, abuse detection and audits. Redact personal data and control access to the logs, which can be as sensitive as the data the application handles.',
        ],
      },
    ],
    examples: [
      {
        title: 'A tiny eval harness',
        code: code(
          'golden = [',
          '    {"input": "400 failed logins, 380 accounts, one IP", "expect": "high"},',
          '    {"input": "5 failed logins, one user", "expect": "low"},',
          ']',
          '',
          'def run_eval(classify):',
          '    passed = sum(classify(case["input"]) == case["expect"] for case in golden)',
          '    print(f"{passed}/{len(golden)} passed")',
          '    return passed / len(golden)',
        ),
        explanation: 'Run it before and after every prompt or model change; a drop in the score blocks the release, just like a failing test.',
      },
    ],
    cheatSheet: [
      ['Fine-tune when', 'Style, format, narrow task; try prompting/RAG first'],
      ['LoRA / QLoRA', 'Small adapters / plus 4-bit quantisation'],
      ['Quantisation', 'Lower-precision weights: less memory'],
      ['Distillation', 'Small model imitates a large one'],
      ['Catastrophic forgetting', 'Lost general ability; adapters, mixed data'],
      ['Eval', 'Repeatable quality test; run on every change'],
      ['Golden dataset', 'Expected outputs; grow from failures'],
      ['LLM-as-a-judge', 'Model grades; calibrate vs humans'],
      ['Contamination', 'Leaked test data inflates scores'],
      ['Production logs', 'Debug, eval, audit; redact PII'],
    ],
  },

  'ai-agents': {
    overview: [
      'An agent is a model in a loop, choosing tools and actions until a goal is met. That autonomy is powerful, and it is also what makes agents risky: an agent that can act can be tricked into acting.',
      'This lesson covers what agents are, workflows versus agents, orchestration patterns, memory and context engineering, least privilege and sandboxing, human-in-the-loop, the lethal trifecta, guardrails and evaluation.',
    ],
    learn: [
      {
        heading: 'Agents and workflows',
        body: [
          'An agent is an LLM in a loop: observe, think, act (call a tool), repeat until done. A workflow follows predefined code paths with model calls at fixed steps; an agent decides its own steps. Prefer the simplest workflow that works, and add autonomy only when the task truly needs it.',
          'In the orchestrator-worker pattern, a lead model splits a task and delegates subtasks to worker agents. It suits broad research, at the cost of more tokens.',
        ],
      },
      {
        heading: 'Memory and context',
        body: [
          'Agent memory persists useful information across steps or sessions: short-term memory is the context window; long-term memory is an external store or files. Context engineering means curating exactly what goes into the context at each step. Too much noise degrades reasoning, so summarise and prune.',
        ],
      },
      {
        heading: 'Limiting the blast radius',
        body: [
          'Give agents least-privilege credentials, scoped per tool, so a manipulated agent can only do limited damage. Sandbox code execution in isolated containers with no secrets and controlled network egress, because generated code may be buggy or malicious.',
          'Require human-in-the-loop approval for high-impact actions such as sending money, deleting data or emailing customers. Guardrails are checks that block or correct unsafe inputs, outputs or actions: input filters, output validators, tool allow-lists and rate limits.',
          'The "lethal trifecta" for data exfiltration is private data access, plus exposure to untrusted content, plus a way to send data out. An agent with all three can be instructed by a malicious web page to leak your data. Remove at least one leg to break the attack.',
        ],
      },
      {
        heading: 'Evaluating agents',
        body: [
          'Measure task success rate on realistic scenarios, plus cost, number of steps and safety. Read the transcripts, not just the final answers: an agent can reach the right answer by an unsafe route.',
        ],
      },
    ],
    examples: [
      {
        title: 'The agent loop with a human checkpoint (pseudocode)',
        code: code(
          'HIGH_IMPACT = {"send_email", "delete_record", "transfer_funds"}',
          '',
          'messages = [system_prompt, user_goal]',
          'for step in range(MAX_STEPS):                 # hard stop: no infinite loops',
          '    reply = model(messages, tools=ALLOWED_TOOLS)',
          '    if reply.is_final_answer:',
          '        return reply.text',
          '    call = reply.tool_call',
          '    validate(call.arguments)                     # never trust arguments blindly',
          '    if call.name in HIGH_IMPACT and not human_approves(call):',
          '        messages.append(tool_result(call, "Denied by reviewer"))',
          '        continue',
          '    messages.append(tool_result(call, run_in_sandbox(call)))',
        ),
        explanation: 'A step limit, argument validation, an allow-list of tools, sandboxed execution and human approval: five guardrails in fifteen lines.',
      },
    ],
    cheatSheet: [
      ['Agent', 'LLM in a loop choosing tools'],
      ['Workflow vs agent', 'Fixed paths vs model decides; prefer simple'],
      ['Orchestrator-worker', 'Lead splits and delegates'],
      ['Memory', 'Context (short) / external store (long)'],
      ['Context engineering', 'Curate, summarise, prune'],
      ['Least privilege', 'Scoped credentials per tool'],
      ['Sandbox', 'Isolated, no secrets, egress control'],
      ['Human-in-the-loop', 'Approve high-impact actions'],
      ['Lethal trifecta', 'Private data + untrusted content + exfil path'],
      ['Guardrails', 'Filters, validators, allow-lists, limits'],
      ['Agent evals', 'Success, cost, steps, safety; read transcripts'],
    ],
  },

  'ai-security': {
    overview: [
      'LLM applications add a new attack surface: anything the model reads can try to instruct it. The OWASP Top 10 for LLM Applications catalogues the main risks, and the defensive mindset is to assume the model can be manipulated and limit what that achieves.',
      'This lesson covers the 2025 OWASP LLM Top 10 risks, jailbreaks, supply chain and model file safety, vector store weaknesses, model extraction, MITRE ATLAS and the mitigation mindset.',
    ],
    learn: [
      {
        heading: 'Injection and output handling',
        body: [
          'Prompt injection is number one in the OWASP LLM Top 10 (2025): direct injection comes from the user, indirect injection from content the model reads. A jailbreak is a prompt crafted to bypass a model\'s safety behaviour, a form of injection aimed at policies.',
          'Improper output handling is passing model output unchecked into browsers, shells or SQL. Treat LLM output exactly like untrusted user input: encode it, validate it, and never execute it blindly.',
        ],
      },
      {
        heading: 'Leaking what should stay private',
        body: [
          'Sensitive information disclosure is the model revealing personal data, secrets or confidential information. Minimise what goes into the context, filter outputs and control access. System prompt leakage is attackers extracting hidden instructions, so never put credentials or security logic in prompts. Assume the system prompt will be read.',
          'Vector and embedding weaknesses (LLM08) are attacks through poisoned or leaked embeddings in RAG stores; apply access control and integrity checks to vector stores. Model inversion and extraction recover training data or clone a model through many queries; rate-limit, monitor query patterns, and never train on secrets.',
        ],
      },
      {
        heading: 'Supply chain and cost abuse',
        body: [
          'Models, datasets and plugins from third parties can be tampered with. Verify sources, pin versions, and scan model files. Prefer the safetensors format over pickle-based formats, which can execute code when loaded.',
          'Unbounded consumption is abuse that drives up cost or exhausts resources; use rate limits, quotas, maximum token limits and budget alerts.',
        ],
      },
      {
        heading: 'The defensive mindset',
        body: [
          'Assume prompt injection will sometimes succeed, and design so that a compromised model can do little: least privilege, human approval for high-impact actions, output validation and isolation. MITRE ATLAS is an ATT&CK-style knowledge base of attacks on AI systems; use it for AI threat modelling.',
        ],
      },
    ],
    cheatSheet: [
      ['LLM01', 'Prompt injection (direct and indirect)'],
      ['Jailbreak', 'Bypassing safety behaviour'],
      ['Sensitive info disclosure', 'Minimise context, filter output'],
      ['Improper output handling', 'Output is untrusted input'],
      ['System prompt leakage', 'No secrets or security logic in prompts'],
      ['LLM08', 'Vector and embedding weaknesses'],
      ['Supply chain', 'Verify, pin; safetensors over pickle'],
      ['Unbounded consumption', 'Rate limits, quotas, budgets'],
      ['Extraction / inversion', 'Rate-limit, monitor, no secrets in training'],
      ['MITRE ATLAS', 'Attacks on AI knowledge base'],
      ['Mindset', 'Assume injection; limit the damage'],
    ],
  },

  'ai-governance': {
    overview: [
      'AI governance is how an organisation decides which AI uses are acceptable, proves they are safe and fair, and meets new regulation. It is quickly becoming a standard part of security and risk roles.',
      'This lesson covers the NIST AI RMF, the EU AI Act, ISO/IEC 42001, bias and explainability, model cards, AI inventories and shadow AI, data protection with public tools, ownership and red teaming.',
    ],
    learn: [
      {
        heading: 'Frameworks and regulation',
        body: [
          'The NIST AI Risk Management Framework has four core functions: Govern, Map, Measure and Manage, with Govern cutting across the other three. The Generative AI Profile (NIST AI 600-1) extends it to generative models.',
          'The EU AI Act takes a risk-based approach with tiers: unacceptable risk (banned practices), high risk (strict obligations such as risk management, data governance, human oversight and documentation), limited risk (transparency duties) and minimal risk.',
          'ISO/IEC 42001 defines an AI management system, the AI counterpart to ISO 27001 for information security.',
        ],
      },
      {
        heading: 'Fairness and transparency',
        body: [
          'Algorithmic bias is systematically unfair outcomes for certain groups, often inherited from skewed training data. Explainability is being able to show why a model produced an output; SHAP and LIME explain feature contributions for classic machine learning.',
          'A model card documents a model\'s intended use, training data, limitations and evaluation results; datasheets do the same for datasets.',
        ],
      },
      {
        heading: 'Running AI governance',
        body: [
          'Maintain an AI inventory: you cannot govern or secure AI systems you do not know about. That includes shadow AI, staff pasting data into public tools, where confidential data may be retained or used for training. Provide approved enterprise tools with clear data policies instead of just banning.',
          'AI risk should be owned by business leadership with a cross-functional governance group of security, legal, privacy, data science and business owners. Red team AI systems, adversarially probing for harmful, unsafe or insecure behaviour, before launch and after major changes.',
        ],
      },
    ],
    cheatSheet: [
      ['NIST AI RMF', 'Govern, Map, Measure, Manage'],
      ['NIST AI 600-1', 'Generative AI Profile'],
      ['EU AI Act', 'Unacceptable, high, limited, minimal risk'],
      ['ISO/IEC 42001', 'AI management system'],
      ['Bias', 'Unfair outcomes, often from data'],
      ['Explainability', 'Why this output? SHAP, LIME'],
      ['Model card / datasheet', 'Model / dataset documentation'],
      ['AI inventory', 'Includes shadow AI'],
      ['Public AI tools', 'Data may be retained; use approved tools'],
      ['Ownership', 'Leadership + cross-functional group'],
      ['AI red teaming', 'Before launch and after changes'],
    ],
  },
};
