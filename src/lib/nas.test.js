import { describe, it, expect } from 'vitest';
import {
  BAY_COUNT,
  DISK_SIZE_TB,
  RAID_LEVELS,
  raidInfo,
  clampDiskCount,
  usableCapacityTb,
  faultTolerance,
  createNas,
  failedCount,
  isLost,
  arrayStatus,
  failDisk,
  hotSwapDisk,
  advanceRebuild,
  setRaid,
  setDiskCount,
  targetCacheHitRate,
  throughputMBps,
  nasConf,
} from './nas';

describe('NAS engine', () => {
  it('lists the five RAID levels with their minimum disks', () => {
    expect(RAID_LEVELS.map((r) => r.id)).toEqual(['raid0', 'raid1', 'raid5', 'raid6', 'raid10']);
    expect(raidInfo('raid5').minDisks).toBe(3);
    expect(raidInfo('raid6').minDisks).toBe(4);
    expect(raidInfo('raid10').minDisks).toBe(4);
    expect(raidInfo('nope').id).toBe('raid5');
  });

  it('clamps disk counts per level (RAID 10 even, RAID 1 exactly 2)', () => {
    expect(clampDiskCount('raid5', 2)).toBe(3);
    expect(clampDiskCount('raid6', 3)).toBe(4);
    expect(clampDiskCount('raid10', 5)).toBe(4);
    expect(clampDiskCount('raid10', 7)).toBe(6);
    expect(clampDiskCount('raid1', 8)).toBe(2);
    expect(clampDiskCount('raid0', 99)).toBe(BAY_COUNT);
  });

  it('usable capacity follows the RAID maths on 4 TB disks', () => {
    expect(usableCapacityTb('raid0', 8)).toBe(32);
    expect(usableCapacityTb('raid1', 2)).toBe(4);
    expect(usableCapacityTb('raid5', 8)).toBe(28);
    expect(usableCapacityTb('raid6', 8)).toBe(24);
    expect(usableCapacityTb('raid10', 8)).toBe(16);
    expect(usableCapacityTb('raid5', 4)).toBe(12);
    expect(DISK_SIZE_TB).toBe(4);
  });

  it('fault tolerance is 0 / 1 / 1 / 2 / 1 per level', () => {
    expect(faultTolerance('raid0')).toBe(0);
    expect(faultTolerance('raid1')).toBe(1);
    expect(faultTolerance('raid5')).toBe(1);
    expect(faultTolerance('raid6')).toBe(2);
    expect(faultTolerance('raid10')).toBe(1);
  });

  it('starts OPTIMAL with every bay online', () => {
    const nas = createNas('raid5', 8);
    expect(nas.disks).toHaveLength(8);
    expect(arrayStatus(nas)).toBe('OPTIMAL');
    expect(failedCount(nas)).toBe(0);
    expect(isLost(nas)).toBe(false);
  });

  it('RAID 0 loses the array on a single disk failure', () => {
    const nas = createNas('raid0', 4);
    failDisk(nas, 0);
    expect(arrayStatus(nas)).toBe('LOST');
    expect(isLost(nas)).toBe(true);
  });

  it('RAID 1 survives one failure and loses on the second', () => {
    const nas = createNas('raid1', 2);
    failDisk(nas, 0);
    expect(arrayStatus(nas)).toBe('DEGRADED');
    failDisk(nas, 1);
    expect(arrayStatus(nas)).toBe('LOST');
  });

  it('one failure degrades RAID 5; hot-swap rebuilds it back to OPTIMAL', () => {
    const nas = createNas('raid5', 8);
    failDisk(nas, 2);
    expect(arrayStatus(nas)).toBe('DEGRADED');
    expect(failedCount(nas)).toBe(1);
    hotSwapDisk(nas, 2);
    expect(arrayStatus(nas)).toBe('REBUILDING');
    advanceRebuild(nas, 40);
    expect(arrayStatus(nas)).toBe('REBUILDING');
    expect(nas.rebuildProgress).toBe(40);
    advanceRebuild(nas, 60);
    expect(arrayStatus(nas)).toBe('OPTIMAL');
    expect(nas.disks[2].status).toBe('online');
    expect(nas.rebuildProgress).toBe(0);
  });

  it('a second failure DURING a RAID 5 rebuild loses the array', () => {
    const nas = createNas('raid5', 8);
    failDisk(nas, 0);
    hotSwapDisk(nas, 0);
    expect(arrayStatus(nas)).toBe('REBUILDING');
    advanceRebuild(nas, 50);
    failDisk(nas, 3);
    // One disk failed, one still rebuilding: two down disks, past RAID 5's
    // tolerance of one.
    expect(failedCount(nas)).toBe(1);
    expect(arrayStatus(nas)).toBe('LOST');
    expect(isLost(nas)).toBe(true);
    // A lost array cannot be hot-swapped back.
    hotSwapDisk(nas, 3);
    expect(nas.disks[3].status).toBe('failed');
  });

  it('the same second failure during a RAID 6 rebuild does NOT lose the array', () => {
    const nas = createNas('raid6', 8);
    failDisk(nas, 0);
    hotSwapDisk(nas, 0);
    expect(arrayStatus(nas)).toBe('REBUILDING');
    advanceRebuild(nas, 50);
    failDisk(nas, 3);
    // One disk failed, one still rebuilding: two down disks, within RAID 6's
    // tolerance of two.
    expect(failedCount(nas)).toBe(1);
    expect(arrayStatus(nas)).toBe('REBUILDING');
    expect(isLost(nas)).toBe(false);
    // The rebuild finishes; the second failed disk still needs a hot-swap.
    advanceRebuild(nas, 50);
    expect(arrayStatus(nas)).toBe('DEGRADED');
    hotSwapDisk(nas, 3);
    advanceRebuild(nas, 100);
    expect(arrayStatus(nas)).toBe('OPTIMAL');
  });

  it('RAID 6 loses only on a third failure', () => {
    const nas = createNas('raid6', 8);
    failDisk(nas, 0);
    failDisk(nas, 1);
    expect(arrayStatus(nas)).toBe('DEGRADED');
    failDisk(nas, 2);
    expect(arrayStatus(nas)).toBe('LOST');
  });

  it('RAID 10 survives failures in different mirror pairs, not the same pair', () => {
    const across = createNas('raid10', 8);
    failDisk(across, 0);
    failDisk(across, 2);
    expect(arrayStatus(across)).toBe('DEGRADED');
    const same = createNas('raid10', 8);
    failDisk(same, 0);
    failDisk(same, 1);
    expect(arrayStatus(same)).toBe('LOST');
  });

  it('failing an already-failed disk and hot-swapping a healthy disk are no-ops', () => {
    const nas = createNas('raid5', 8);
    failDisk(nas, 0);
    failDisk(nas, 0);
    expect(failedCount(nas)).toBe(1);
    hotSwapDisk(nas, 1);
    expect(nas.disks[1].status).toBe('online');
    advanceRebuild(nas, 50);
    expect(nas.rebuildProgress).toBe(0);
  });

  it('switching RAID re-initialises the array with the new level', () => {
    const nas = createNas('raid5', 8);
    failDisk(nas, 0);
    setRaid(nas, 'raid6');
    expect(nas.raid).toBe('raid6');
    expect(arrayStatus(nas)).toBe('OPTIMAL');
    expect(usableCapacityTb(nas.raid, nas.diskCount)).toBe(24);
    setRaid(nas, 'raid1');
    expect(nas.diskCount).toBe(2);
    expect(usableCapacityTb(nas.raid, nas.diskCount)).toBe(4);
  });

  it('changing the disk count rebuilds the array fresh', () => {
    const nas = createNas('raid5', 8);
    failDisk(nas, 0);
    setDiskCount(nas, 4);
    expect(nas.diskCount).toBe(4);
    expect(arrayStatus(nas)).toBe('OPTIMAL');
    expect(usableCapacityTb(nas.raid, nas.diskCount)).toBe(12);
  });

  it('cache hit rate rises with reads and is zero with the cache off', () => {
    expect(targetCacheHitRate(false, 80)).toBe(0);
    expect(targetCacheHitRate(true, 80)).toBeGreaterThan(targetCacheHitRate(true, 20));
    expect(targetCacheHitRate(true, 80)).toBe(79);
  });

  it('throughput falls when degraded or rebuilding and stops when lost', () => {
    const healthy = createNas('raid5', 8);
    const degraded = createNas('raid5', 8);
    failDisk(degraded, 0);
    const rebuilding = createNas('raid5', 8);
    failDisk(rebuilding, 0);
    hotSwapDisk(rebuilding, 0);
    const lost = createNas('raid0', 4);
    failDisk(lost, 0);
    const full = throughputMBps(healthy, 100, 0.5);
    expect(full).toBe(950);
    expect(throughputMBps(degraded, 100, 0.5)).toBeLessThan(full);
    expect(throughputMBps(rebuilding, 100, 0.5)).toBeLessThan(throughputMBps(degraded, 100, 0.5));
    expect(throughputMBps(lost, 100, 0.5)).toBe(0);
    expect(throughputMBps(healthy, 0, 0.5)).toBe(0);
  });

  it('nasConf names the level, capacity, tolerance and status', () => {
    const nas = createNas('raid6', 8);
    const conf = nasConf(nas, true);
    expect(conf).toContain('RAID 6');
    expect(conf).toContain('24 TB');
    expect(conf).toContain('OPTIMAL');
    expect(conf).toContain('M.2 NVMe on');
    expect(nasConf(nas, false)).toContain('M.2 NVMe off');
  });
});
