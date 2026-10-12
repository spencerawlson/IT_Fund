# Highly Available Compute — Multi-AZ, Load Balancing and Route 53 — Avatar Tutor Script

**Lesson ID:** saa-ha-compute
**Track:** AWS Solutions Architect – Associate (SAA-C03)
**Estimated runtime:** ~6 minutes (~798 words)

## Spoken script

**[HOOK — 0:00]**
Resilient architectures assume failure. An Availability Zone will eventually
have a bad day, and the exam expects your designs to survive it without a human
being paged: traffic reroutes, unhealthy instances are replaced, the database
fails over on its own.

**[WHY IT MATTERS — ~0:25]**
The details matter — ALB versus NLB, Multi-AZ versus read replica — because
the exam distinguishes designs by exactly these choices. Pick wrong and the
architecture looks resilient but fails when tested.

**[SECTION — Designing for the zone that fails — ~0:50]**
The minimum viable resilient network spans two Availability Zones; production
VPCs routinely span three. Every tier that can be multi-AZ should be: compute
in an Auto Scaling group across zones, data in a replicated store, nothing
stateful on a single instance. Surviving an AZ failure with no manual
intervention is answered by this shape every time.

State is the enemy of horizontal scaling: a web application storing sessions
on local disk breaks the moment the load balancer sends a returning user to a
different instance, so sessions move to ElastiCache or DynamoDB. Where affinity is genuinely required, configure
stickiness at the load balancer — a deliberate choice, not an accident of local
disks. RDS Multi-AZ provides automatic failover to a synchronous standby in
another zone; the standby takes no reads and exists solely to be promoted.
Read replicas are a different tool: asynchronous copies that absorb read
traffic and can be promoted manually, including across regions. Automatic
failover means Multi-AZ, read scaling means replicas. For Aurora, a reader
endpoint load-balances reads across replicas while the cluster handles failover
itself.

**[SECTION — Balancing and scaling the fleet — ~2:05]**
Load balancers come in three flavours, chosen by layer. The Application Load
Balancer works at Layer 7: path- and host-based routing for HTTP and HTTPS,
the default for web tiers. The Network Load Balancer works at Layer 4: static
IP addresses, ultra-low latency, preserved client source IP, millions of
requests per second — the choice for TCP workloads and fixed IPs. The Gateway
Load Balancer exists for one job: chaining third-party virtual appliances like
firewalls into the traffic path.

Auto Scaling groups keep the fleet at the right size and the right health. A
target-tracking policy holds a metric at a set value — request count per target
is the canonical example — scaling out under load and in on calm. Health checks
do the janitorial work: failed instances are terminated and replaced without
being asked. Lifecycle hooks pause those transitions for custom actions —
warming a cache on launch, draining connections on termination. Scale-in
deserves the same care: the load balancer's deregistration delay gives
in-flight requests time to finish before the target is removed. And for the
legacy application that cannot scale at all: an Auto Scaling group with
minimum, maximum, and desired all set to one, spread across zones — it cannot
grow, but it auto-recovers.

**[SECTION — DNS as a control plane — ~3:15]**
Route 53 is more than a phone book; its routing policies are failover
machinery. Failover routing pairs a primary record with a secondary, flipping
traffic when health checks declare the primary unhealthy — the standard shape
for active/passive designs. Weighted routing splits traffic by proportion, the
tool for blue/green and canary releases. Latency-based routing sends each user
to the region that answers fastest.

Health checks are the senses of this system: they must monitor what users
actually experience — a check against the application endpoint, not just a ping
of the host. Target-group health checks decide whether a load balancer sends
traffic to an instance; Route 53 health checks decide whether DNS sends traffic
to a region. For disciplined failover at organisational scale, Route 53
Application Recovery Controller adds readiness checks — continuous verification
that the recovery environment can take over — and routing controls, the
switches operators flip during an event. Geolocation routing answers by the
user's location; geoproximity adds a bias knob to steer traffic by distance.

**[COMMON MISTAKES — ~4:35]**
Three traps. One: read replicas do not fail over automatically — that is
Multi-AZ's job. Two: stickiness is a deliberate load-balancer configuration,
not an accident of local disks. Three: health checks must test the application
endpoint, not the host.

**[RECAP — ~5:00]**
No single point of failure is the whole lesson. Spread across two or three
Availability Zones, move state into ElastiCache or DynamoDB, and let Multi-AZ
standbys fail over automatically while read replicas scale reads. Choose the
balancer by layer — ALB for HTTP, NLB for TCP and fixed IPs, GWLB for appliance
chains — and let target-tracking policies and health checks run the fleet. Use
Route 53 routing policies as failover machinery, with health checks aimed at
what users experience and ARC readiness checks for the disciplined version.

## On-screen visuals

- HOOK: a two-AZ diagram with one zone going dark while traffic reroutes to
  the other — "no single point of failure" as the caption.
- MULTI-AZ SECTION: state moving from a local disk to ElastiCache; an RDS
  Multi-AZ standby promoting on failure beside a read replica absorbing reads.
- BALANCING SECTION: three balancer cards — ALB at Layer 7, NLB at Layer 4
  with static IPs, GWLB chaining appliances; an ASG scaling on request-count-
  per-target with a lifecycle hook pausing a launch.
- DNS SECTION: Route 53 routing policies — failover flipping primary to
  secondary, weighted splitting blue/green, latency-based sending users to the
  nearest region; health checks pointed at an application endpoint.
- COMMON MISTAKES: three trap cards — "replicas do not fail over", "stickiness
  is configured, not accidental", "check the app, not the host".
- RECAP: the cheat-sheet terms as a clean summary card.
