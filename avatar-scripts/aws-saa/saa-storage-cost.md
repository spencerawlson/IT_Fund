# Storage and Data Cost Optimisation — Tiering, Hidden Meters and Query Economics — Avatar Tutor Script

**Lesson ID:** saa-storage-cost
**Track:** AWS Solutions Architect – Associate (SAA-C03)
**Estimated runtime:** ~6 minutes (~792 words)

## Spoken script

**[HOOK — 0:00]**
Storage bills hide in the details: the tier an object sits in, the requests
made against it, the transfers that move it, and the queries that scan it. S3
is cheap per gigabyte and expensive per mistake.

**[WHY IT MATTERS — ~0:25]**
The discipline is lifecycle thinking: data has a temperature, and every
temperature has a price. Get the lifecycle right and the bill takes care of
itself. Get it wrong and you pay retrieval penalties, request charges, and
query bills that dwarf the storage itself.

**[SECTION — Tiering as a strategy — ~0:50]**
S3 lifecycle policies automate the temperature curve: recent logs sit in
Standard, age into Infrequent Access after 30 days, then Glacier Flexible,
finally Deep Archive for the seven-year compliance tail. Each tier trades
retrieval speed for price and carries a minimum storage duration — 30 days for
IA, 90 for Glacier Flexible, 180 for Deep Archive — billed pro-rata if you
delete early. Tiering data you will retrieve next week into Deep Archive is not
savings; it is a penalty with extra steps.

Choose the tier by access pattern, not by price tag alone. S3 Intelligent-Tiering
moves objects between frequent and infrequent tiers automatically — the answer
when patterns are unknown or shifting, for a small monitoring fee. Standard-IA
versus One Zone-IA is a durability question: One Zone-IA is cheaper because it
stores in a single AZ, suitable only for reproducible data like transcoded
media. Glacier Deep Archive, at roughly a dollar per terabyte-month, is the
cheapest retention for the annual-audit backup set — 12-to-48-hour retrieval
that annual audits easily tolerate. Two subtleties catch people: small objects
in Glacier tiers incur minimum billable sizes, so aggregate tiny files first;
and Object Lock in Compliance mode makes retention a cost commitment — objects
cannot be deleted early by anyone, so an over-long retention period bills in
full.

**[SECTION — The hidden meters: requests and transfer — ~2:10]**
S3 charges per request as well as per byte, and high-request workloads can
spend more on GETs and LISTs than on storage. The fixes are architectural:
fewer, larger objects instead of millions of tiny ones; lifecycle rules instead
of application-driven transitions; CloudFront in front of hot objects so the
edge absorbs repeat requests.

Incomplete multipart uploads are pure waste: every part uploaded so far is
billed until the upload completes or is aborted — add a lifecycle rule that
aborts incomplete uploads after N days on every bucket that takes large
uploads. Replication doubles the storage bill plus cross-region transfer fees,
so replicate selectively with prefix or tag filters. Data transfer has its own
geography: into AWS is free, out to the internet is billed, between AZs is
billed, same-region AWS-to-AWS transfers are generally free. CloudFront reduces
the egress bill two ways: cached content serves from the edge, and price
classes trim the edge footprint. EBS snapshots bill incrementally per
gigabyte-month of changed blocks — snapshot retention policies matter as much
as snapshot schedules.

**[SECTION — Data-format and query economics — ~3:25]**
Athena bills per terabyte scanned, which makes data format a cost decision.
Partitioning by date lets queries skip entire prefixes; columnar formats like
Parquet let queries read only the columns they need; compression shrinks
everything. The same query over CSV can cost orders of magnitude more than over
partitioned Parquet — the exam's data-lake cost question is always answered
with format and partitioning, never with a bigger budget.

EBS rightsizing follows the same "measure, then tune" loop: CloudWatch reveals
actual IOPS and throughput, gp3 lets you dial provisioned IOPS and throughput
independently of volume size, and unused provisioned IOPS on io volumes are
money for nothing. S3 Storage Lens gives organisation-wide insight into usage
and cost drivers across every bucket. Cost-allocation tags, activated in the
Billing console, let Cost Explorer break spend down by team or project. And the
AWS Pricing Calculator models the architecture's cost before it is built.

**[COMMON MISTAKES — ~4:40]**
Three traps. One: tiering soon-to-be-retrieved data into Deep Archive —
minimum durations and retrieval costs turn the "savings" into a penalty. Two:
forgetting the abort rule for incomplete multipart uploads — abandoned parts
bill as Standard storage. Three: answering an Athena cost question with a
bigger budget instead of partitioning and Parquet.

**[RECAP — ~5:05]**
Data has a temperature and every temperature has a price. Lifecycle policies
walk objects down the tiers — Standard, IA, Glacier Flexible, Deep Archive —
respecting minimum durations. Watch the hidden meters: request costs favour
fewer larger objects, incomplete multipart uploads need an abort rule, and
transfer geography decides the egress bill. Make Athena cheap with
partitioning, Parquet, and compression; right-size EBS with gp3 tuning; and
keep it visible with Storage Lens, cost-allocation tags, and the Pricing
Calculator.

## On-screen visuals

- HOOK: a magnifying glass over an S3 bill revealing the hidden line items —
  tier, requests, transfers, queries.
- TIERING SECTION: the temperature curve from Standard down to Deep Archive
  with minimum durations labelled; Intelligent-Tiering auto-moving objects; the
  early-delete penalty warning; Object Lock as a cost commitment seal.
- HIDDEN METERS SECTION: a request counter outpacing the storage bytes; an
  abandoned multipart upload billing silently until an abort rule clears it;
  a transfer geography map — free in, billed out, billed between AZs.
- QUERY SECTION: the same query priced over CSV versus partitioned Parquet;
  a gp3 volume with IOPS and throughput dials tuned independently; Storage Lens
  as an organisation-wide dashboard.
- COMMON MISTAKES: three trap cards — "do not Deep-Archive warm data",
  "abort incomplete uploads", "partition and Parquet before budget".
- RECAP: the cheat-sheet terms as a clean summary card.
