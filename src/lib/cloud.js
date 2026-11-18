// Cloud simulation engine — pure functions, no React, no DOM.
// The Visual Lab subject "Cloud" (src/components/viz) drives this engine
// for its interactive simulator.
//
// Model (from the cl-architecture lesson):
// - Service models shift who runs each layer: IaaS (provider: hardware +
//   hypervisor), PaaS (provider: + OS + runtime), SaaS (provider: + apps).
//   The customer always owns its data and who can access it, on every
//   model. That is the shared responsibility model.
// - Deployment models: public, private, hybrid.
// - Elasticity is growing AND shrinking automatically with demand;
//   scalability is only the ability to grow. Horizontal scaling adds
//   instances; vertical scaling grows one instance.
// - Regions hold availability zones (AZs): fault-isolated slices of one
//   region. A multi-AZ database keeps a synchronous standby in a second
//   AZ and fails over automatically; an async read replica offloads reads
//   and can never fail over — it is not a standby.
// - VPC 10.0.0.0/16: public subnet 10.0.1.0/24, app subnet 10.0.2.0/24,
//   data subnet 10.0.3.0/24; one security group per tier; the database
//   has no public IP and only accepts traffic from the app tier.
// - Loose coupling via a queue (SQS): a burst piles up and drains at a
//   fixed rate while the fleet catches up; each drained message is one
//   serverless invocation.
// - Cost: pay-as-you-go per instance-hour, or reserved instances at a
//   lower hourly rate in exchange for a commitment.

export const INSTANCE_CAPACITY_REQ_S = 45;
export const MIN_INSTANCES = 2;
export const MAX_INSTANCES = 8;
export const ON_DEMAND_HOURLY = 0.1;
export const RESERVED_HOURLY = 0.06;
export const QUEUE_DRAIN_PER_S = 68;
export const BURST_QUEUE = 140;
export const HOURS_PER_MONTH = 730;
export const AZS = ['AZ-A', 'AZ-B'];

export const SERVICE_MODELS = [
  { id: 'iaas', label: 'IaaS', blurb: 'Provider runs hardware + hypervisor. You run the OS, apps and data.' },
  { id: 'paas', label: 'PaaS', blurb: 'Provider runs the platform (OS + runtime). You bring the code and data.' },
  { id: 'saas', label: 'SaaS', blurb: 'Provider runs everything, apps included. You still own data + access.' },
];

export const LAYERS = [
  { id: 'hardware', label: 'Hardware + network' },
  { id: 'hypervisor', label: 'Hypervisor / virtualisation' },
  { id: 'os', label: 'Operating system' },
  { id: 'runtime', label: 'Runtime / platform' },
  { id: 'apps', label: 'Applications' },
  { id: 'data', label: 'Data' },
  { id: 'access', label: 'Access + identity' },
];

export const DEPLOYMENT_MODELS = [
  { id: 'public', label: 'Public', blurb: 'Shared cloud, multi-tenant — the cheapest way to run.' },
  { id: 'private', label: 'Private', blurb: 'One tenant only — dedicated hardware, your control, higher cost.' },
  { id: 'hybrid', label: 'Hybrid', blurb: 'Public + private (or on-prem) joined together — keep sensitive data private, burst the rest.' },
];

const PROVIDER_LAYERS = {
  iaas: ['hardware', 'hypervisor'],
  paas: ['hardware', 'hypervisor', 'os', 'runtime'],
  saas: ['hardware', 'hypervisor', 'os', 'runtime', 'apps'],
};

/** Who runs this layer under this service model: 'provider' | 'customer'. */
export function ownerFor(modelId, layerId) {
  const providerLayers = PROVIDER_LAYERS[modelId] || [];
  return providerLayers.includes(layerId) ? 'provider' : 'customer';
}

/** The shared-responsibility drill: is this owner right for this layer? */
export function checkResponsibility(modelId, layerId, owner) {
  return ownerFor(modelId, layerId) === owner;
}

/** Every layer with its owner under one service model. */
export function responsibilityTable(modelId) {
  return LAYERS.map((layer) => ({ ...layer, owner: ownerFor(modelId, layer.id) }));
}

/**
 * How many instances the auto-scaling group wants for this traffic: one
 * instance handles 45 req/s, the fleet never drops below 2 or above 8.
 * A 360 req/s surge wants 8 — the fleet in the verified artifact.
 */
export function desiredInstances(trafficReqS) {
  return Math.min(
    MAX_INSTANCES,
    Math.max(MIN_INSTANCES, Math.ceil(trafficReqS / INSTANCE_CAPACITY_REQ_S)),
  );
}

/** One auto-scaling step: the fleet moves one instance toward its target. */
export function stepScaling(current, desired) {
  if (current < desired) return current + 1;
  if (current > desired) return current - 1;
  return current;
}

/** How the fleet spreads across the AZs: balanced when multi-AZ is on,
 * everything in AZ-A when it is off — one AZ is a single point of failure. */
export function distributeAcrossAzs(count, multiAz) {
  if (!multiAz) return { 'AZ-A': count, 'AZ-B': 0 };
  const a = Math.ceil(count / 2);
  return { 'AZ-A': a, 'AZ-B': count - a };
}

/** A fresh cloud: 2 instances, multi-AZ on, DB primary in AZ-A with a
 * sync standby and an async read replica in AZ-B. */
export function createCloud() {
  return {
    instances: MIN_INSTANCES,
    multiAz: true,
    azDown: { 'AZ-A': false, 'AZ-B': false },
    db: { primaryAz: 'AZ-A', standbyAz: 'AZ-B', replicaAz: 'AZ-B', replicaUp: true },
    queueDepth: 0,
    served: 0,
    dropped: 0,
    invocations: 0,
  };
}

/** Instances actually running — a down AZ loses its share of the fleet. */
export function runningInstances(cloud) {
  const dist = distributeAcrossAzs(cloud.instances, cloud.multiAz);
  let running = 0;
  for (const az of AZS) {
    if (!cloud.azDown[az]) running += dist[az];
  }
  return running;
}

/** Request capacity of the running fleet, in req/s. */
export function capacityFor(running) {
  return running * INSTANCE_CAPACITY_REQ_S;
}

/**
 * Kill one AZ: its instances go dark and traffic shifts to the survivor.
 * If the AZ held the database primary, the synchronous standby is
 * promoted — automatic failover, no data loss. If it held the read
 * replica, the replica is simply lost: a replica is an async copy, not a
 * standby, so it cannot fail over and reads fall back to the primary.
 */
export function killAz(cloud, azId) {
  if (cloud.azDown[azId]) return { events: [], dbFailedOver: false, replicaLost: false };
  cloud.azDown[azId] = true;
  const dist = distributeAcrossAzs(cloud.instances, cloud.multiAz);
  const events = [`${azId} is DOWN — ${dist[azId]} instance(s) lost. Traffic shifts to the surviving AZ.`];
  let dbFailedOver = false;
  let replicaLost = false;
  if (cloud.db.primaryAz === azId) {
    const newPrimary = cloud.db.standbyAz;
    cloud.db.primaryAz = newPrimary;
    cloud.db.standbyAz = azId;
    dbFailedOver = true;
    events.push(`DB failed over — sync standby in ${newPrimary} promoted to primary. No data loss (synchronous replication).`);
  }
  if (cloud.db.replicaAz === azId && cloud.db.replicaUp) {
    cloud.db.replicaUp = false;
    replicaLost = true;
    events.push(`Read replica in ${azId} is lost — replica failover FAILED as designed: replicas are async copies, not standbys. Reads fall back to the primary.`);
  }
  return { events, dbFailedOver, replicaLost };
}

/** Bring an AZ back: its instances return, and the standby or replica
 * that lived there is rebuilt. */
export function restoreAz(cloud, azId) {
  if (!cloud.azDown[azId]) return { events: [] };
  cloud.azDown[azId] = false;
  const dist = distributeAcrossAzs(cloud.instances, cloud.multiAz);
  const events = [`${azId} is back — ${dist[azId]} instance(s) running again.`];
  if (cloud.db.standbyAz === azId) {
    events.push(`Standby rebuilt in ${azId} — multi-AZ protection restored.`);
  }
  if (cloud.db.replicaAz === azId && !cloud.db.replicaUp) {
    cloud.db.replicaUp = true;
    events.push(`Read replica rebuilt in ${azId} — reads spread out again.`);
  }
  return { events };
}

/**
 * Can this source reach the database? The DB sits in the private subnet
 * 10.0.3.0/24 with no public IP; its security group only allows the app
 * tier (10.0.2.0/24). A probe from the internet is blocked at the door.
 */
export function canReachDb(source) {
  return source !== 'internet';
}

/** A database probe, with the reason the door opens or stays shut. */
export function dbProbe(source) {
  if (source === 'internet') {
    return { allowed: false, reason: 'BLOCKED — DB has no public IP; its security group only allows the app tier (10.0.2.0/24).' };
  }
  return { allowed: true, reason: 'Allowed — the app tier (10.0.2.0/24) is the only source the DB security group trusts.' };
}

/** Add a burst of queued work (SQS): it piles up and drains over time. */
export function applyBurst(cloud, size = BURST_QUEUE) {
  cloud.queueDepth += size;
  return cloud.queueDepth;
}

/** Drain the queue for `seconds` at the fixed drain rate; never below 0. */
export function drainQueue(depth, seconds, rate = QUEUE_DRAIN_PER_S) {
  return Math.max(0, depth - rate * seconds);
}

/** What the fleet costs per hour at this pricing. */
export function hourlyCost(instances, pricing) {
  const rate = pricing === 'reserved' ? RESERVED_HOURLY : ON_DEMAND_HOURLY;
  return instances * rate;
}

/** What the fleet costs per month (730 hours) at this pricing. */
export function monthlyCost(instances, pricing) {
  return hourlyCost(instances, pricing) * HOURS_PER_MONTH;
}

/** Cost per 1,000 requests served — 0 when nothing is being served. */
export function costPerThousandRequests(instances, pricing, trafficReqS) {
  if (trafficReqS <= 0) return 0;
  return (hourlyCost(instances, pricing) / (trafficReqS * 3600)) * 1000;
}

/**
 * p95 latency in ms. A fleet with spare capacity answers in ~42 ms; every
 * req/s past capacity adds ~1.8 ms, and every queued message adds up to
 * 1.5 ms (capped at 400 ms). `jitter` in [0, 1) varies the result ±10% —
 * pass a fixed value in tests for determinism.
 */
export function p95Ms(trafficReqS, running, queueDepth, jitter = 0.5) {
  const overload = Math.max(0, trafficReqS - capacityFor(running));
  const queuePenalty = Math.min(400, queueDepth * 1.5);
  const base = 42 + overload * 1.8 + queuePenalty;
  const spread = 0.9 + jitter * 0.2;
  return Math.round(base * spread);
}

/** The live VPC config for the current setup — the panel the subject shows. */
export function vpcConfig(cloud, { model, deployment, pricing }) {
  const dist = distributeAcrossAzs(cloud.instances, cloud.multiAz);
  const lines = [
    '# VPC 10.0.0.0/16 — region with 2 availability zones',
    'vpc 10.0.0.0/16',
    '  subnet public  10.0.1.0/24   # internet gateway, WAF + L7 load balancer',
    '  subnet app     10.0.2.0/24   # auto-scaling group, no public IPs',
    '  subnet data    10.0.3.0/24   # database, private — no route from the internet',
    '',
    `# service model: ${model}  ·  deployment: ${deployment}  ·  pricing: ${pricing}`,
    `auto-scaling group  min ${MIN_INSTANCES}  max ${MAX_INSTANCES}  desired ${cloud.instances}`,
    `  AZ-A: ${dist['AZ-A']} instance(s)${cloud.azDown['AZ-A'] ? '  [DOWN]' : ''}    AZ-B: ${dist['AZ-B']} instance(s)${cloud.azDown['AZ-B'] ? '  [DOWN]' : ''}`,
    `  scale on traffic: 1 instance per ${INSTANCE_CAPACITY_REQ_S} req/s`,
    '',
    `database  primary ${cloud.db.primaryAz}  sync standby ${cloud.db.standbyAz}  read replica ${cloud.db.replicaAz}${cloud.db.replicaUp ? '' : ' [LOST]'}`,
    '  TLS 1.3 in transit · AES-256 at rest · IAM + monitoring',
    '',
    'security groups (one per tier):',
    '  alb-sg  allow 443 from 0.0.0.0/0',
    '  app-sg  allow from alb-sg only',
    '  db-sg   allow 5432 from app-sg only   # internet probe: BLOCKED',
    '',
    `queue (SQS)  depth ${Math.round(cloud.queueDepth)}  drains ${QUEUE_DRAIN_PER_S}/s  ·  serverless: pay per invocation`,
    `cost  $${hourlyCost(cloud.instances, pricing).toFixed(2)}/hr  ·  $${monthlyCost(cloud.instances, pricing).toFixed(2)}/mo`,
  ];
  return lines.join('\n');
}
