# Database Selection — RDS, Aurora, DynamoDB and Migration — Avatar Tutor Script

**Lesson ID:** saa-databases
**Track:** AWS Solutions Architect – Associate (SAA-C03)
**Estimated runtime:** ~6 minutes (~790 words)

## Spoken script

**[HOOK — 0:00]**
Database selection is the exam's purest test of architectural judgement: a dozen
managed engines, each with a workload it dominates and several it merely
survives. The questions describe access patterns, and the correct answer is
the engine built for that pattern.

**[WHY IT MATTERS — ~0:25]**
The decision framework: match the data model and the
access pattern first, and let cost and operations follow. The same discipline
saves you from the two classic failures — a relational database sharded into
misery by key-value traffic, and a NoSQL store contorted around joins it was
never built for.

**[SECTION — Relational: RDS and Aurora — ~0:50]**
RDS is managed relational database service: you
keep your engine — PostgreSQL, MySQL, MariaDB, Oracle, SQL Server — and AWS
handles patching, backups, and failover mechanics. Choose it when the workload
is relational but ordinary: moderate throughput, standard availability, a
budget that appreciates RDS's lower price. Aurora is the cloud-native
sibling: same wire compatibility with PostgreSQL and MySQL, but a distributed
storage layer with higher throughput, faster failover, and auto-growing
storage.

Scaling reads and surviving failure are separate mechanisms. Read replicas
are asynchronous copies that absorb read traffic — including across regions —
and can be promoted to standalone primaries; they do not fail over
automatically. Multi-AZ standby is the failover mechanism: a synchronous copy
in another zone that takes over automatically but serves no reads. Aurora
unifies more of this: a reader endpoint load-balances reads across replicas
while the cluster manages failover internally. Two features solve specific
pain the exam likes to probe. Aurora Serverless v2 scales capacity in
fine-grained units for variable load — pay for the ACUs you use, not the
instance you sized. RDS Proxy sits between application fleets and the database
as a connection pooler: thousands of Lambda invocations share a small pool of
connections instead of overwhelming the engine with a connection storm.

**[SECTION — Purpose-built engines — ~2:10]**
DynamoDB is the serverless NoSQL answer for key-value access at any scale:
single-digit-millisecond reads and writes, flexible schema, throughput that
scales without servers. The design discipline is the partition key —
high-cardinality keys spread load evenly, while a low-cardinality key funnels
traffic into a hot partition that throttles. Billing follows the access
pattern: provisioned capacity with auto scaling for predictable workloads,
on-demand for spiky or unknown traffic; Global Tables replicate across regions
for active-active applications.

Caching layers sit in front of the database, not beside it. DAX is DynamoDB's
dedicated in-memory cache, dropping reads to microseconds for the hottest keys.
ElastiCache is the general cache: Redis for rich data structures — sorted sets,
pub/sub, persistence — Memcached for simple multithreaded key-value caching.
The remaining engines each own a pattern: Neptune traverses relationships in
milliseconds for fraud detection; DocumentDB serves MongoDB-compatible
documents; Timestream is built for time-series telemetry; Redshift is the
petabyte OLAP warehouse for complex joins. Millisecond graph traversals mean
Neptune, petabyte joins mean Redshift, flexible-schema millisecond reads mean
DynamoDB.

**[SECTION — Migration with minimal downtime — ~3:25]**
Moving a production database is a migration, not a copy, and the exam cares
about the downtime. AWS Database Migration Service performs the full load of
existing data and then continuously replicates changes — change data capture —
so the cutover window shrinks to minutes: the classic answer for migrating
Oracle to Aurora PostgreSQL without extended outage. The Schema Conversion
Tool handles the heterogeneous half, translating schemas and flagging the
constructs that need human attention.

The RDS-versus-DynamoDB decision recurs across the exam. Choose RDS when the
workload needs the relational model: complex joins, ad-hoc SQL, transactions
across entities. Choose DynamoDB when the access pattern is key-based at
scale: known query shapes, single-digit-millisecond latency, flexible schema.
Encrypt the database, and plan for it early: an existing unencrypted RDS
instance cannot be flipped in place — the path is snapshot, copy the snapshot
with encryption enabled, restore — which is why new databases launch encrypted
by default.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: read replicas scale reads; they do not fail over
automatically — Multi-AZ does. Two: the partition key is DynamoDB's design
discipline — a low-cardinality key means hot partitions and throttling. Three:
Redis versus Memcached is a features question — sorted sets, pub/sub, and
persistence mean Redis; plain multithreaded caching means Memcached.

**[RECAP — ~5:05]**
Match the engine to the access pattern. RDS keeps your relational engine
managed; Aurora adds cloud-native throughput, auto-growing storage, and
Serverless v2. Read replicas scale reads, Multi-AZ survives failure, RDS Proxy
pools connections. DynamoDB owns key-value at any scale; DAX caches it to
microseconds; Redis serves rich structures, Memcached plain speed; Neptune,
DocumentDB, Timestream, and Redshift each own their pattern. Migrate with DMS
and SCT, and encrypt early — there is no in-place flip.

## On-screen visuals

- HOOK: a row of engines — relational, key-value, graph, warehouse — each
  lighting up beside the access pattern it dominates.
- RELATIONAL SECTION: RDS as a managed engine with patching and backups
  handled; Aurora's distributed storage layer; read replicas absorbing reads
  beside a Multi-AZ standby waiting to fail over; RDS Proxy pooling Lambda
  connections.
- ENGINES SECTION: DynamoDB partition keys spreading load evenly versus a hot
  partition glowing; DAX dropping latency to microseconds; Redis sorted sets
  powering a leaderboard; the pattern-to-engine matching table — Neptune for
  graphs, Redshift for petabyte joins.
- MIGRATION SECTION: DMS performing a full load then streaming change data
  capture with a minutes-long cutover window; the RDS-versus-DynamoDB decision
  frame; the snapshot-copy-restore encryption path.
- COMMON MISTAKES: three trap cards — "replicas do not fail over", "hot
  partitions are a key design problem", "Redis means features".
- RECAP: the cheat-sheet terms as a clean summary card.
