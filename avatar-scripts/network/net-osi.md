# OSI & TCP/IP Models: Layers, PDUs and Encapsulation — Avatar Tutor Script

**Lesson ID:** net-osi
**Track:** Network+
**Estimated runtime:** ~5 minutes (~745 words)

## Spoken script

**[HOOK — 0:00]**
Next time a colleague says "that is a Layer 2 problem," would you know exactly
where to look? The OSI model is the shared language of networking. Speak it, and
troubleshooting stops being guesswork.

**[WHY IT MATTERS — ~0:15]**
Every network conversation you will ever debug — a page loading, a switch
forwarding a frame — can be described in layers. That gives you two things: a
shared vocabulary with every engineer you will work with, and a ladder to climb
when something breaks, starting at the cable and working up. This lesson covers
the seven OSI layers, the four-layer TCP/IP model, the name of the data unit at
each layer, and encapsulation.

**[SECTION — The seven OSI layers — ~0:50]**
Think of the seven layers as an assembly line. The upper three serve software
directly; the lower four move the data. Each station has a single job, done well.

At the top, Layer 7, the Application layer, is where users live: the protocols
your applications speak every day — HTTP, DNS, SMTP. Below it, Layer 6,
Presentation, is the translator. It makes sure both endpoints understand each
other: encoding, compression, encryption — TLS, JPEG, UTF-8. Layer 5, Session,
opens conversations between applications, keeps them going, and closes them
gracefully — RPC, NetBIOS.

Then the lower four. Layer 4, Transport, delivers end to end and steers data to
the right application by port number — TCP and UDP. Layer 3, the Network layer,
carries packets between networks and chooses paths through routers — IP, ICMP.
Layer 2, Data Link, organises bits into frames addressed by MAC address —
Ethernet, switches. And Layer 1, Physical, moves raw bits as electrical pulses,
light or radio waves — cables, connectors, hubs.

One sentence memorises the order from the wire up: Please Do Not Throw Sausage
Pizza Away.

**[SECTION — PDUs and encapsulation — ~2:10]**
Each layer gives its unit of data its own name — its protocol data unit. Bits at
Layer 1. Frames at Layer 2. Packets at Layer 3. And at Layer 4, segments when
TCP delivers them reliably, datagrams when UDP sends them best-effort. The exam
loves asking for these by name, so learn the set cold.

Here is why the names change. As data descends the stack, every layer wraps what
it received in its own header — and Layer 2 appends a trailer as well. Envelopes
within envelopes. That is encapsulation. At the destination the process reverses:
each layer strips its own header and passes the payload upward, until the
original message emerges intact.

A router shows you encapsulation in miniature. It discards the arriving frame,
reads the destination IP from the packet inside, then builds a fresh frame to
carry it across the next link. New envelope, same letter.

**[SECTION — The TCP/IP model — ~3:10]**
The internet itself runs on a leaner blueprint: four layers, each absorbing one
or more OSI layers. The Application layer folds OSI's top three into one — HTTP,
DNS, SMTP, TLS. Transport aligns directly with OSI Layer 4 — TCP, UDP. The
Internet layer maps to OSI Layer 3 — IP, ICMP, addressing and routing. And the
Link layer, sometimes called Network Access, absorbs OSI's bottom two —
Ethernet, Wi-Fi.

Every protocol you will ever configure lives in this model. Yet engineers still
speak OSI daily. Why? Because "that is a Layer 2 problem" or "it is failing at
Layer 7" tells a colleague exactly where to look.

**[COMMON MISTAKES — ~3:55]**
Three traps. First, the PDU names: segments live at Layer 4 with TCP, packets
at Layer 3, frames at Layer 2, bits at Layer 1. Do not call a packet a frame.
Second, TLS. It does encryption, so people file it under Layer 7 — but it is a
Presentation-layer job at Layer 6. Third, nobody asks you to choose between the
models. TCP/IP is what the internet runs on; OSI is how engineers talk about
it. Know both, and notice which one a question is using.

**[RECAP — ~4:30]**
Seven layers: Application, Presentation, Session, Transport, Network, Data Link,
Physical. The data unit at each layer: bits, frames, packets, and segments for
TCP or datagrams for UDP. Encapsulation wraps a header around the data going
down; decapsulation strips headers coming up — and routers re-frame packets hop
by hop. The TCP/IP model has four layers: Link, Internet, Transport,
Application. And from the wire up: Please Do Not Throw Sausage Pizza Away.

## On-screen visuals

- HOOK: the seven-layer OSI stack graphic, layers highlighting one by one from
  the wire up.
- The seven OSI layers SECTION: the colour-coded stack card — badge, layer name,
  PDU tag and example protocols per layer — with the mnemonic strip at the base.
- PDUs and encapsulation SECTION: the encapsulation architecture diagram —
  headers nesting layer by layer, the Ethernet FCS trailer at Layer 2, and the
  router's frame-swap sequence.
- The TCP/IP model SECTION: the four-layer TCP/IP stack beside the seven OSI
  layers, colour bands showing how layers fold together.
- COMMON MISTAKES: the PDU name table and a TLS placement callout at Layer 6.
- RECAP: the cheat-sheet rows as a clean summary card.
