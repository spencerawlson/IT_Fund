import { describe, it, expect } from 'vitest';
import {
  INSTANCE_CAPACITY_REQ_S,
  MIN_INSTANCES,
  MAX_INSTANCES,
  ON_DEMAND_HOURLY,
  RESERVED_HOURLY,
  BURST_QUEUE,
  SERVICE_MODELS,
  LAYERS,
  ownerFor,
  checkResponsibility,
  responsibilityTable,
  desiredInstances,
  stepScaling,
  distributeAcrossAzs,
  createCloud,
  runningInstances,
  capacityFor,
  killAz,
  restoreAz,
  canReachDb,
  dbProbe,
  applyBurst,
  drainQueue,
  hourlyCost,
  monthlyCost,
  costPerThousandRequests,
  p95Ms,
  vpcConfig,
} from './cloud';

describe('cloud engine', () => {
  it('shared responsibility: the provider takes more layers as you go IaaS → PaaS → SaaS', () => {
    expect(ownerFor('iaas', 'hardware')).toBe('provider');
    expect(ownerFor('iaas', 'hypervisor')).toBe('provider');
    expect(ownerFor('iaas', 'os')).toBe('customer');
    expect(ownerFor('paas', 'os')).toBe('provider');
    expect(ownerFor('paas', 'runtime')).toBe('provider');
    expect(ownerFor('paas', 'apps')).toBe('customer');
    expect(ownerFor('saas', 'apps')).toBe('provider');
    expect(ownerFor('saas', 'data')).toBe('customer');
    expect(ownerFor('saas', 'access')).toBe('customer');
  });

  it('the customer always owns its data and access, on every model', () => {
    for (const model of SERVICE_MODELS) {
      expect(ownerFor(model.id, 'data')).toBe('customer');
      expect(ownerFor(model.id, 'access')).toBe('customer');
    }
  });

  it('checkResponsibility judges the drill answers', () => {
    expect(checkResponsibility('iaas', 'os', 'customer')).toBe(true);
    expect(checkResponsibility('iaas', 'os', 'provider')).toBe(false);
    expect(checkResponsibility('saas', 'apps', 'provider')).toBe(true);
    expect(checkResponsibility('paas', 'runtime', 'provider')).toBe(true);
    expect(checkResponsibility('paas', 'apps', 'provider')).toBe(false);
  });

  it('responsibilityTable covers every layer exactly once', () => {
    const table = responsibilityTable('paas');
    expect(table.map((row) => row.id)).toEqual(LAYERS.map((layer) => layer.id));
    expect(table.find((row) => row.id === 'os').owner).toBe('provider');
    expect(table.find((row) => row.id === 'data').owner).toBe('customer');
  });

  it('auto-scaling wants 2 instances at rest and 8 at a 360 req/s surge', () => {
    expect(desiredInstances(0)).toBe(MIN_INSTANCES);
    expect(desiredInstances(60)).toBe(2);
    expect(desiredInstances(90)).toBe(2);
    expect(desiredInstances(91)).toBe(3);
    expect(desiredInstances(360)).toBe(8);
    expect(desiredInstances(900)).toBe(MAX_INSTANCES);
  });

  it('scaling moves one instance per step toward the target', () => {
    expect(stepScaling(2, 8)).toBe(3);
    expect(stepScaling(8, 2)).toBe(7);
    expect(stepScaling(4, 4)).toBe(4);
  });

  it('the fleet spreads evenly across AZs — unless multi-AZ is off', () => {
    expect(distributeAcrossAzs(2, true)).toEqual({ 'AZ-A': 1, 'AZ-B': 1 });
    expect(distributeAcrossAzs(8, true)).toEqual({ 'AZ-A': 4, 'AZ-B': 4 });
    expect(distributeAcrossAzs(7, true)).toEqual({ 'AZ-A': 4, 'AZ-B': 3 });
    expect(distributeAcrossAzs(8, false)).toEqual({ 'AZ-A': 8, 'AZ-B': 0 });
  });

  it('a fresh cloud runs 2 instances with the DB primary in AZ-A', () => {
    const cloud = createCloud();
    expect(runningInstances(cloud)).toBe(2);
    expect(capacityFor(2)).toBe(2 * INSTANCE_CAPACITY_REQ_S);
    expect(cloud.db.primaryAz).toBe('AZ-A');
    expect(cloud.db.standbyAz).toBe('AZ-B');
    expect(cloud.db.replicaUp).toBe(true);
  });

  it('killing the primary AZ fails the DB over to the sync standby', () => {
    const cloud = createCloud();
    cloud.instances = 8;
    const result = killAz(cloud, 'AZ-A');
    expect(result.dbFailedOver).toBe(true);
    expect(cloud.db.primaryAz).toBe('AZ-B');
    expect(cloud.db.standbyAz).toBe('AZ-A');
    expect(runningInstances(cloud)).toBe(4);
    expect(result.events.join(' ')).toContain('DB failed over');
    expect(result.events.join(' ')).toContain('No data loss');
  });

  it('killing the replica AZ loses the replica — it cannot fail over', () => {
    const cloud = createCloud();
    const result = killAz(cloud, 'AZ-B');
    expect(result.dbFailedOver).toBe(false);
    expect(result.replicaLost).toBe(true);
    expect(cloud.db.replicaUp).toBe(false);
    expect(cloud.db.primaryAz).toBe('AZ-A');
    expect(result.events.join(' ')).toContain('FAILED as designed');
  });

  it('killing an AZ twice reports nothing the second time', () => {
    const cloud = createCloud();
    killAz(cloud, 'AZ-A');
    expect(killAz(cloud, 'AZ-A').events).toEqual([]);
  });

  it('restoring an AZ brings its instances back and rebuilds the standby', () => {
    const cloud = createCloud();
    cloud.instances = 8;
    killAz(cloud, 'AZ-A');
    expect(runningInstances(cloud)).toBe(4);
    const result = restoreAz(cloud, 'AZ-A');
    expect(runningInstances(cloud)).toBe(8);
    expect(result.events.join(' ')).toContain('multi-AZ protection restored');
  });

  it('restoring the replica AZ rebuilds the read replica', () => {
    const cloud = createCloud();
    killAz(cloud, 'AZ-B');
    expect(cloud.db.replicaUp).toBe(false);
    const result = restoreAz(cloud, 'AZ-B');
    expect(cloud.db.replicaUp).toBe(true);
    expect(result.events.join(' ')).toContain('Read replica rebuilt');
  });

  it('with multi-AZ off, killing AZ-A is a total outage', () => {
    const cloud = createCloud();
    cloud.multiAz = false;
    cloud.instances = 4;
    killAz(cloud, 'AZ-A');
    expect(runningInstances(cloud)).toBe(0);
  });

  it('the database is unreachable from the internet, reachable from the app tier', () => {
    expect(canReachDb('internet')).toBe(false);
    expect(canReachDb('app-tier')).toBe(true);
    expect(dbProbe('internet').allowed).toBe(false);
    expect(dbProbe('internet').reason).toContain('BLOCKED');
    expect(dbProbe('app-tier').allowed).toBe(true);
  });

  it('a burst piles onto the queue and drains at 68 per second', () => {
    const cloud = createCloud();
    expect(applyBurst(cloud)).toBe(BURST_QUEUE);
    expect(applyBurst(cloud, 60)).toBe(BURST_QUEUE + 60);
    expect(drainQueue(140, 1)).toBe(72);
    expect(drainQueue(140, 3)).toBe(0);
    expect(drainQueue(0, 1)).toBe(0);
  });

  it('reserved instances cost less per hour than pay-as-you-go', () => {
    expect(hourlyCost(8, 'on-demand')).toBeCloseTo(8 * ON_DEMAND_HOURLY);
    expect(hourlyCost(8, 'reserved')).toBeCloseTo(8 * RESERVED_HOURLY);
    expect(hourlyCost(8, 'reserved')).toBeLessThan(hourlyCost(8, 'on-demand'));
    expect(monthlyCost(2, 'on-demand')).toBeCloseTo(2 * ON_DEMAND_HOURLY * 730);
  });

  it('cost per 1,000 requests falls as traffic grows at a fixed fleet size', () => {
    const low = costPerThousandRequests(2, 'on-demand', 60);
    const high = costPerThousandRequests(2, 'on-demand', 120);
    expect(high).toBeLessThan(low);
    expect(costPerThousandRequests(2, 'on-demand', 0)).toBe(0);
  });

  it('p95 stays near 42 ms with spare capacity and climbs under overload or queue', () => {
    expect(p95Ms(60, 2, 0, 0.5)).toBe(42);
    expect(p95Ms(360, 2, 0, 0.5)).toBeGreaterThan(p95Ms(60, 2, 0, 0.5));
    expect(p95Ms(60, 8, 0, 0.5)).toBe(42);
    expect(p95Ms(60, 2, 140, 0.5)).toBeGreaterThan(p95Ms(60, 2, 0, 0.5));
    // Deterministic at a fixed jitter.
    expect(p95Ms(100, 2, 0, 0)).toBe(p95Ms(100, 2, 0, 0));
  });

  it('vpcConfig shows the subnets, the DB layout and the blocked internet probe', () => {
    const cloud = createCloud();
    const config = vpcConfig(cloud, { model: 'paas', deployment: 'public', pricing: 'on-demand' });
    expect(config).toContain('VPC 10.0.0.0/16');
    expect(config).toContain('10.0.1.0/24');
    expect(config).toContain('10.0.2.0/24');
    expect(config).toContain('10.0.3.0/24');
    expect(config).toContain('primary AZ-A');
    expect(config).toContain('internet probe: BLOCKED');
    expect(config).toContain('$0.20/hr');
  });
});
