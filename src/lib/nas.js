// NAS simulation engine — pure functions, no React, no DOM.
// The Visual Lab subject "NAS" (src/components/viz) drives this engine for
// its interactive simulator.
//
// Model (from the it-storage-memory lesson):
// - An 8-bay NAS appliance: hot-swap bays, redundant PSUs, four 2.5/10 GbE
//   ports, M.2 NVMe cache; serves files over SMB/NFS and block storage
//   over iSCSI, and backs things up.
// - RAID 0 stripes with no redundancy (lose 1 disk, lose all); RAID 1
//   mirrors 2 disks; RAID 5 stripes with one parity disk (survives 1
//   failure, min 3 disks); RAID 6 stripes with two parity disks (survives
//   2, min 4); RAID 10 is mirrored stripes (min 4, survives one failure
//   per mirror pair). A failed disk hot-swaps and rebuilds while the NAS
//   keeps serving — slower while it rebuilds.
// - A second failure during a rebuild is what kills an array: RAID 5
//   tolerates only one failure, so it is lost; RAID 6 tolerates two, so
//   it survives and the rebuild finishes.
//
// The disk size (4 TB) is a simulator model parameter, not a lesson fact:
// capacity figures scale linearly with it.

export const BAY_COUNT = 8;
export const DISK_SIZE_TB = 4;

export const RAID_LEVELS = [
  { id: 'raid0', label: 'RAID 0', minDisks: 2, tolerance: 0, blurb: 'Striped, no redundancy — lose one disk, lose the array.' },
  { id: 'raid1', label: 'RAID 1', minDisks: 2, tolerance: 1, blurb: 'Two disks, mirrored — one copy always survives.' },
  { id: 'raid5', label: 'RAID 5', minDisks: 3, tolerance: 1, blurb: 'Striped with parity — survives one disk failure.' },
  { id: 'raid6', label: 'RAID 6', minDisks: 4, tolerance: 2, blurb: 'Striped with dual parity — survives two failures, even mid-rebuild.' },
  { id: 'raid10', label: 'RAID 10', minDisks: 4, tolerance: 1, blurb: 'Mirrored stripes — survives one failure per mirror pair.' },
];

export const RAID_IDS = RAID_LEVELS.map((r) => r.id);

/** The RAID_LEVELS entry for an id, or the RAID 5 entry for an unknown id. */
export function raidInfo(raidId) {
  return RAID_LEVELS.find((r) => r.id === raidId) || RAID_LEVELS[2];
}

/** Clamp a disk count into what a RAID level accepts (RAID 10 needs an even count). */
export function clampDiskCount(raidId, count) {
  const info = raidInfo(raidId);
  let n = Math.max(info.minDisks, Math.min(BAY_COUNT, Math.floor(count) || info.minDisks));
  if (raidId === 'raid10' && n % 2 === 1) n -= 1;
  if (raidId === 'raid1') n = 2;
  return n;
}

/** Usable capacity in TB for a level with `diskCount` disks of `diskSizeTb`. */
export function usableCapacityTb(raidId, diskCount, diskSizeTb = DISK_SIZE_TB) {
  const n = clampDiskCount(raidId, diskCount);
  switch (raidId) {
    case 'raid0':
      return n * diskSizeTb;
    case 'raid1':
      return diskSizeTb;
    case 'raid5':
      return (n - 1) * diskSizeTb;
    case 'raid6':
      return (n - 2) * diskSizeTb;
    case 'raid10':
      return (n / 2) * diskSizeTb;
    default:
      return (n - 1) * diskSizeTb;
  }
}

/** Failures the level guarantees to survive. RAID 10's is per mirror pair. */
export function faultTolerance(raidId) {
  return raidInfo(raidId).tolerance;
}

/** A fresh array: every bay online, no rebuild running. */
export function createNas(raidId = 'raid5', diskCount = BAY_COUNT) {
  const raid = raidInfo(raidId).id;
  const n = clampDiskCount(raid, diskCount);
  return {
    raid,
    diskCount: n,
    diskSizeTb: DISK_SIZE_TB,
    disks: Array.from({ length: n }, (_, i) => ({ id: `Bay ${i + 1}`, status: 'online' })),
    rebuildProgress: 0,
  };
}

/** How many disks are failed (a rebuilding disk that fails counts as failed). */
export function failedCount(nas) {
  return nas.disks.filter((d) => d.status === 'failed').length;
}

function pairLost(nas) {
  // Mirror pairs are adjacent bays: (1,2), (3,4), (5,6), (7,8). A pair is
  // lost when neither of its disks is online — a rebuilding disk is not
  // healthy yet, so it counts against the pair just like a failed one.
  const down = (disk) => disk.status !== 'online';
  for (let i = 0; i + 1 < nas.disks.length; i += 2) {
    if (down(nas.disks[i]) && down(nas.disks[i + 1])) return true;
  }
  return false;
}

/**
 * Whether the array is lost. The count that matters is disks that are not
 * online: a rebuilding disk is not healthy yet, so a second failure during
 * a rebuild counts against the tolerance exactly like a second failure at
 * rest — that is the rule that loses a RAID 5 array and spares a RAID 6
 * one. RAID 0 dies on any failure; RAID 1 dies only when both mirrors are
 * down; RAID 5 dies on a second down disk; RAID 6 on a third; RAID 10 dies
 * when both disks of one mirror pair are down.
 */
export function isLost(nas) {
  const down = nas.disks.filter((d) => d.status !== 'online').length;
  switch (nas.raid) {
    case 'raid0':
      return down >= 1;
    case 'raid1':
      return down >= 2;
    case 'raid5':
      return down >= 2;
    case 'raid6':
      return down >= 3;
    case 'raid10':
      return pairLost(nas);
    default:
      return down >= 2;
  }
}

/** OPTIMAL | DEGRADED | REBUILDING | LOST — derived from the disks, never stored. */
export function arrayStatus(nas) {
  if (isLost(nas)) return 'LOST';
  if (nas.disks.some((d) => d.status === 'rebuilding')) return 'REBUILDING';
  if (nas.disks.some((d) => d.status === 'failed')) return 'DEGRADED';
  return 'OPTIMAL';
}

/**
 * Fail one disk. A failed disk stays failed until it is hot-swapped; the
 * array status follows from the failure rules (see isLost).
 */
export function failDisk(nas, index) {
  const disk = nas.disks[index];
  if (!disk || disk.status === 'failed') return nas;
  disk.status = 'failed';
  if (!nas.disks.some((d) => d.status === 'rebuilding')) nas.rebuildProgress = 0;
  return nas;
}

/**
 * Hot-swap a failed disk: the bay gets a fresh disk and a rebuild starts.
 * Refused on a lost array — there is nothing left to rebuild.
 */
export function hotSwapDisk(nas, index) {
  const disk = nas.disks[index];
  if (!disk || disk.status !== 'failed' || isLost(nas)) return nas;
  disk.status = 'rebuilding';
  return nas;
}

/** Advance a running rebuild by `step` (0–100). At 100 the new disks come online. */
export function advanceRebuild(nas, step) {
  if (!nas.disks.some((d) => d.status === 'rebuilding')) return nas;
  nas.rebuildProgress = Math.min(100, nas.rebuildProgress + step);
  if (nas.rebuildProgress >= 100) {
    for (const disk of nas.disks) if (disk.status === 'rebuilding') disk.status = 'online';
    nas.rebuildProgress = 0;
  }
  return nas;
}

/** Switch RAID level: the array is re-initialised (new RAID, fresh disks). */
export function setRaid(nas, raidId) {
  const fresh = createNas(raidId, nas.diskCount);
  nas.raid = fresh.raid;
  nas.diskCount = fresh.diskCount;
  nas.disks = fresh.disks;
  nas.rebuildProgress = 0;
  return nas;
}

/** Change how many bays the array uses: fresh disks, same RAID level. */
export function setDiskCount(nas, count) {
  const fresh = createNas(nas.raid, count);
  nas.diskCount = fresh.diskCount;
  nas.disks = fresh.disks;
  nas.rebuildProgress = 0;
  return nas;
}

/**
 * The NVMe cache hit rate the workload settles at: repeated reads hit the
 * cache, writes and cold reads do not. No cache, no hits.
 */
export function targetCacheHitRate(cacheEnabled, readMix) {
  if (!cacheEnabled) return 0;
  return Math.round(35 + readMix * 0.55);
}

/**
 * Serving throughput in MB/s. A healthy array serves near the 10 GbE link;
 * a degraded one serves slower, a rebuilding one slower still, a lost one
 * serves nothing. `jitter` in [0, 1) varies the result ±10% — pass a fixed
 * value in tests for determinism.
 */
export function throughputMBps(nas, loadPct, jitter = Math.random()) {
  const status = arrayStatus(nas);
  if (status === 'LOST') return 0;
  const base = 950 * Math.max(0, Math.min(100, loadPct)) / 100;
  const factor = status === 'REBUILDING' ? 0.4 : status === 'DEGRADED' ? 0.6 : 1;
  const spread = 0.9 + jitter * 0.2;
  return Math.round(base * factor * spread);
}

/** The live storage config for the current setup — the panel the subject shows. */
export function nasConf(nas, cacheEnabled) {
  const info = raidInfo(nas.raid);
  return [
    '# NAS storage — updates live',
    `raid_level   ${info.label}   # ${info.blurb}`,
    `disks        ${nas.diskCount} x ${nas.diskSizeTb} TB hot-swap bays`,
    `usable       ${usableCapacityTb(nas.raid, nas.diskCount, nas.diskSizeTb)} TB`,
    `tolerates    ${faultTolerance(nas.raid)} disk failure${faultTolerance(nas.raid) === 1 ? '' : 's'}`,
    `status       ${arrayStatus(nas)}`,
    `cache        M.2 NVMe ${cacheEnabled ? 'on' : 'off'}`,
    'network      4 x 2.5/10 GbE  # SMB/NFS file serving, iSCSI VM storage',
    'power        redundant PSUs',
  ].join('\n');
}
