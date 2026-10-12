# Caching and Content Delivery — CloudFront, Edge and Caching Strategies — Avatar Tutor Script

**Lesson ID:** saa-caching-cdn
**Track:** AWS Solutions Architect – Associate (SAA-C03)
**Estimated runtime:** ~5 minutes (~768 words)

## Spoken script

**[HOOK — 0:00]**
Performance on AWS is rarely about bigger instances; it is about putting data
closer to the request. Edge caches absorb global traffic, in-memory caches
absorb database load, and each layer you add multiplies the capacity of the
layers beneath it.

**[WHY IT MATTERS — ~0:25]**
A cache is a performance decision with a correctness bill attached — stale data
and thundering herds are the price of speed. The exam places caching questions
in both the performance and cost domains, because they are the same exercise:
identify the repeated work, and intercept it as close to the requester as
possible.

**[SECTION — CloudFront as the front door — ~0:50]**
CloudFront is the content delivery network: a global mesh of edge locations
that cache responses close to viewers, so a user in Sydney does not wait on an
origin in Virginia. It serves static assets by default and accelerates dynamic
content too, and private S3 origins stay private through Origin Access Control
— the bucket policy grants access to the CloudFront distribution, never to the
public.

Restricted content uses signed URLs or signed cookies: time-limited, optionally
IP-bound tokens that grant access without exposing the origin. When deployments
change content, invalidation purges the edge cache — effective but metered,
which is why versioned filenames are the cleaner pattern: new names bypass the
cache naturally, no purge required. Origin failover adds resilience: a
secondary origin takes over when health checks fail. Edge compute splits by
weight: CloudFront Functions run lightweight JavaScript at viewer request and
response; Lambda@Edge runs full Lambda at more trigger points, including
origin request and response, for heavier work like authentication flows. Simple
and viewer-facing means CloudFront Functions; complex or origin-touching means
Lambda@Edge.

**[SECTION — When the CDN is not enough — ~2:05]**
CloudFront speaks HTTP and HTTPS. For everything else — gaming protocols, VoIP,
custom TCP and UDP — Global Accelerator provides two static anycast IP
addresses that route each user to the optimal AWS endpoint. The static IPs
solve real operational problems: client firewalls can allowlist them, DNS
propagation delay disappears from failover, and users get the AWS backbone
instead of the public internet from the nearest edge.

Route 53's latency-based routing is the DNS-layer complement: each user
resolves to the region with the lowest measured latency. API Gateway caching
plays the same role one layer up, caching API responses at the gateway so
repeated identical calls never reach the backend. Price classes are
CloudFront's cost lever: restrict the distribution to fewer edge locations —
North America and Europe only, say — when the audience is regional and the
global footprint is wasted spend. Performance design and cost design are the
same exercise here, which is why the exam places caching questions in both
domains.

**[SECTION — Caching inside the architecture — ~3:15]**
Behind the edge, application caches protect the database. Cache-aside is the
default strategy for read-heavy workloads: the application checks the cache,
falls back to the database on a miss, and populates the cache with the result
— the catalog page that is read a thousand times for every write. ElastiCache
implements both strategies: Redis for data structures and persistence,
Memcached for simple multithreaded speed.

Every cache introduces two failure modes the exam probes. Stale data: TTLs must
reflect how fresh the answer needs to be, and invalidation must be a designed
path, not an afterthought. Thundering herd: when a popular key expires, a
thousand simultaneous misses slam the database — mitigated with jittered TTLs,
staggered expirations, or request coalescing. Two cost details hide in caching
designs. Cross-AZ data transfer is billed, so chatty services should sit in the
same AZ as their cache. And DAX versus ElastiCache is a scoping question: DAX
is DynamoDB's dedicated microsecond cache, ElastiCache the generalist.

**[COMMON MISTAKES — ~4:35]**
Three traps. One: CloudFront Functions versus Lambda@Edge is a scope question
— lightweight viewer logic is Functions, origin-touching or heavy work is
Lambda@Edge. Two: invalidation is metered — versioned filenames beat purging
the cache after every deployment. Three: chatty cache traffic across AZs is
billed — keep the application tier and its cache in the same AZ.

**[RECAP — ~5:00]**
Put data closer to the request. CloudFront is the front door for HTTP — OAC
keeps S3 origins private, signed URLs restrict content, versioned filenames
beat invalidations, and Functions handle light edge logic while Lambda@Edge
takes the heavy work. Global Accelerator covers non-HTTP traffic with static
anycast IPs. Inside the architecture, cache-aside protects the database, TTLs
and herd protection keep caches honest, cross-AZ transfer costs shape
placement, and DAX is DynamoDB's specialist while ElastiCache is the
generalist.

## On-screen visuals

- HOOK: a request travelling from a user to an edge cache to the origin, with
  each cache layer multiplying the capacity beneath it.
- CLOUDFRONT SECTION: the global edge mesh with a user in Sydney served from a
  nearby edge; OAC granting the distribution access to a private bucket; a
  signed URL with an expiry timer; CloudFront Functions versus Lambda@Edge
  trigger points.
- BEYOND CDN SECTION: Global Accelerator's two static anycast IPs routing to
  the optimal endpoint; latency-based DNS routing; API Gateway caching at the
  gateway; price classes trimming the edge footprint.
- INSIDE SECTION: the cache-aside flow — check cache, fall back to DB, populate
  on miss; a thundering herd slamming the database with mitigation options;
  chatty services kept in the same AZ as their cache.
- COMMON MISTAKES: three trap cards — "scope decides Functions versus
  Lambda@Edge", "version filenames, do not purge", "cache traffic pays per AZ".
- RECAP: the cheat-sheet terms as a clean summary card.
