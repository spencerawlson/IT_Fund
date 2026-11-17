import { describe, it, expect } from 'vitest';
import {
  AP_POWER_W,
  STANDARDS,
  standardById,
  standardsForBand,
  channelsForBand,
  NON_OVERLAPPING_24,
  overlapFactor,
  channelsOverlap,
  DEFAULT_NEIGHBOURS,
  interferencePercent,
  planSelfInterference,
  planInterference,
  signalDbm,
  signalQuality,
  distanceFactor,
  effectiveThroughputMbps,
  planThroughputMbps,
  formatRate,
  associateClient,
  ROAM_THRESHOLD_DBM,
  SECURITY,
  securityById,
  evilTwinRisk,
  evilTwinResult,
  authenticate8021X,
  POE,
  poeById,
  poeSufficient,
  apConfigText,
} from './accessPoint';

describe('access point standards', () => {
  it('lists the six 802.11 standards from the lesson with the right rates', () => {
    expect(STANDARDS.map((s) => s.id)).toEqual(['b', 'g', 'a', 'n', 'ac', 'ax']);
    expect(standardById('b').maxMbps).toBe(11);
    expect(standardById('g').maxMbps).toBe(54);
    expect(standardById('a').maxMbps).toBe(54);
    expect(standardById('a').band).toBe('5 GHz');
    expect(standardById('n').wifi).toBe('Wi-Fi 4');
    expect(standardById('n').maxMbps).toBe(600);
    expect(standardById('ac').wifi).toBe('Wi-Fi 5');
    expect(standardById('ac').maxMbps).toBe(6900);
    expect(standardById('ax').wifi).toBe('Wi-Fi 6');
    expect(standardById('ax').maxMbps).toBe(9600);
    expect(standardById('nope')).toBeNull();
  });

  it('offers only the standards a band can run', () => {
    expect(standardsForBand('2.4 GHz').map((s) => s.id)).toEqual(['b', 'g', 'n', 'ax']);
    expect(standardsForBand('5 GHz').map((s) => s.id)).toEqual(['a', 'n', 'ac', 'ax']);
    expect(standardsForBand('6 GHz').map((s) => s.id)).toEqual(['ax']);
  });

  it('lists the channels per band', () => {
    expect(channelsForBand('2.4 GHz')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(channelsForBand('5 GHz')).toContain(36);
    expect(channelsForBand('5 GHz')).toContain(165);
    expect(channelsForBand('6 GHz')).toContain(1);
    expect(NON_OVERLAPPING_24).toEqual([1, 6, 11]);
  });
});

describe('channel overlap and interference', () => {
  it('only 1, 6 and 11 are non-overlapping on 2.4 GHz', () => {
    expect(channelsOverlap(1, 6, '2.4 GHz')).toBe(false);
    expect(channelsOverlap(1, 11, '2.4 GHz')).toBe(false);
    expect(channelsOverlap(6, 11, '2.4 GHz')).toBe(false);
    expect(channelsOverlap(1, 2, '2.4 GHz')).toBe(true);
    expect(channelsOverlap(1, 3, '2.4 GHz')).toBe(true);
    expect(channelsOverlap(1, 5, '2.4 GHz')).toBe(true);
    expect(overlapFactor(1, 2, '2.4 GHz')).toBeCloseTo(0.8);
    expect(overlapFactor(1, 3, '2.4 GHz')).toBeCloseTo(0.6);
    expect(overlapFactor(1, 6, '2.4 GHz')).toBe(0);
  });

  it('5 GHz channels do not overlap unless they are the same channel', () => {
    expect(channelsOverlap(36, 40, '5 GHz')).toBe(false);
    expect(channelsOverlap(36, 36, '5 GHz')).toBe(true);
    expect(overlapFactor(36, 36, '5 GHz')).toBe(1);
    expect(overlapFactor(36, 40, '5 GHz')).toBe(0);
  });

  it('neighbour interference falls as the channel moves away from the neighbours', () => {
    // Neighbours sit on 2.4 GHz channels 3 (75) and 8 (60).
    expect(interferencePercent(3, '2.4 GHz')).toBe(75);
    expect(interferencePercent(11, '2.4 GHz')).toBe(24);
    expect(interferencePercent(1, '2.4 GHz')).toBe(45);
    expect(interferencePercent(6, '2.4 GHz')).toBe(66);
    // 5 GHz has room: channel 40 dodges both 5 GHz neighbours.
    expect(interferencePercent(36, '5 GHz')).toBe(55);
    expect(interferencePercent(40, '5 GHz')).toBe(0);
    expect(interferencePercent(149, '5 GHz')).toBe(40);
    expect(DEFAULT_NEIGHBOURS.length).toBe(4);
  });
});

describe('channel plans', () => {
  it('1, 6, 11 has zero self-interference; 1, 2, 3 is 96%', () => {
    expect(planInterference([1, 6, 11], '2.4 GHz')).toBe(0);
    expect(planInterference([1, 2, 3], '2.4 GHz')).toBe(96);
    expect(planInterference([6, 6, 6], '2.4 GHz')).toBe(100);
    expect(planInterference([1, 6, 6], '2.4 GHz')).toBe(60);
    expect(planInterference([36, 40, 44], '5 GHz')).toBe(0);
    expect(planInterference([36, 36, 44], '5 GHz')).toBe(60);
  });

  it('plan throughput: 54 Mbps clean on g, 7 Mbps on the 1-2-3 plan', () => {
    expect(planThroughputMbps({ standardId: 'g', band: '2.4 GHz', channels: [1, 6, 11] })).toBe(54);
    expect(planThroughputMbps({ standardId: 'g', band: '2.4 GHz', channels: [1, 2, 3] })).toBe(7);
    expect(planThroughputMbps({ standardId: 'g', band: '2.4 GHz', channels: [6, 6, 6] })).toBe(5);
    expect(planThroughputMbps({ standardId: 'g', band: '2.4 GHz', channels: [1, 6, 11], poeOk: false })).toBe(27);
  });

  it('a legacy 802.11b client caps the whole cell at 11 Mbps', () => {
    expect(planThroughputMbps({ standardId: 'g', band: '2.4 GHz', channels: [1, 6, 11], legacyB: true })).toBe(11);
    expect(planThroughputMbps({ standardId: 'ax', band: '5 GHz', channels: [36, 40, 44], legacyB: true })).toBe(11);
    expect(effectiveThroughputMbps({ standardId: 'g', band: '2.4 GHz', channel: 11, distanceM: 5, legacyB: true })).toBe(9);
  });

  it('effective throughput falls with interference and distance', () => {
    expect(effectiveThroughputMbps({ standardId: 'g', band: '2.4 GHz', channel: 11, distanceM: 5 })).toBe(42);
    expect(effectiveThroughputMbps({ standardId: 'g', band: '2.4 GHz', channel: 3, distanceM: 5 })).toBe(18);
    expect(effectiveThroughputMbps({ standardId: 'g', band: '2.4 GHz', channel: 11, distanceM: 5, poeOk: false })).toBe(21);
    expect(effectiveThroughputMbps({ standardId: 'ac', band: '5 GHz', channel: 40, distanceM: 5 })).toBe(6900);
    expect(effectiveThroughputMbps({ standardId: 'nope', band: '2.4 GHz', channel: 6, distanceM: 5 })).toBe(0);
  });

  it('formats gigabit rates as Gbps', () => {
    expect(formatRate(54)).toBe('54 Mbps');
    expect(formatRate(6900)).toBe('6.9 Gbps');
    expect(formatRate(1000)).toBe('1 Gbps');
    expect(formatRate(9600)).toBe('9.6 Gbps');
  });
});

describe('signal and roaming', () => {
  it('signal falls with distance and faster on 5/6 GHz', () => {
    expect(signalDbm(1, '2.4 GHz')).toBe(-30);
    expect(signalDbm(10, '2.4 GHz')).toBe(-50);
    expect(signalDbm(25, '2.4 GHz')).toBe(-58);
    expect(signalDbm(10, '5 GHz')).toBe(-56);
    expect(signalDbm(10, '6 GHz')).toBe(-59);
  });

  it('grades signal quality at the usual boundaries', () => {
    expect(signalQuality(-45)).toBe('Excellent');
    expect(signalQuality(-55)).toBe('Good');
    expect(signalQuality(-65)).toBe('Fair');
    expect(signalQuality(-75)).toBe('Poor');
    expect(signalQuality(-85)).toBe('No signal');
  });

  it('distance negotiates the rate down', () => {
    expect(distanceFactor(-50)).toBe(1);
    expect(distanceFactor(-60)).toBe(0.8);
    expect(distanceFactor(-70)).toBe(0.5);
    expect(distanceFactor(-80)).toBe(0.25);
    expect(distanceFactor(-90)).toBe(0.1);
  });

  it('the client picks the strongest AP at or above -75 dBm — and nobody below it', () => {
    expect(ROAM_THRESHOLD_DBM).toBe(-75);
    expect(associateClient({ 'AP-1': -50, 'AP-2': -60, 'AP-3': -80 })).toBe('AP-1');
    expect(associateClient({ 'AP-1': -60, 'AP-2': -50 })).toBe('AP-2');
    expect(associateClient({ 'AP-1': -80, 'AP-2': -85 })).toBeNull();
    expect(associateClient({ 'AP-1': -74, 'AP-2': -76 })).toBe('AP-1');
    expect(associateClient({ 'AP-1': -75 })).toBe('AP-1');
  });
});

describe('security', () => {
  it('ranks WEP broken, WPA weak, WPA2/WPA3 the standards', () => {
    expect(SECURITY.map((s) => s.id)).toEqual(['open', 'wep', 'wpa', 'wpa2', 'wpa3', 'wpa3-enterprise']);
    expect(securityById('wep').verdict).toBe('Broken');
    expect(securityById('wep').encryption).toBe('RC4');
    expect(securityById('wpa').verdict).toBe('Weak');
    expect(securityById('wpa2').encryption).toBe('AES-CCMP');
    expect(securityById('wpa3').auth).toBe('SAE');
    expect(securityById('wpa3-enterprise').auth).toBe('802.1X / EAP');
    expect(securityById('nope')).toBeNull();
  });

  it('evil twin: open and WEP lose 3 clients, WPA3 and enterprise lose none', () => {
    expect(evilTwinResult('open', 5).stolen).toBe(3);
    expect(evilTwinResult('open', 5).blocked).toBe(false);
    expect(evilTwinResult('wep', 5).stolen).toBe(3);
    expect(evilTwinResult('wpa', 5).stolen).toBe(2);
    expect(evilTwinResult('wpa2', 5).stolen).toBe(1);
    expect(evilTwinResult('wpa3', 5).stolen).toBe(0);
    expect(evilTwinResult('wpa3', 5).blocked).toBe(true);
    expect(evilTwinResult('wpa3-enterprise', 5).stolen).toBe(0);
    expect(evilTwinResult('wpa3-enterprise', 5).blocked).toBe(true);
    expect(evilTwinResult('wpa3-enterprise', 5).note).toContain('certificate');
    // Never steals more clients than are connected.
    expect(evilTwinResult('open', 2).stolen).toBe(2);
    expect(evilTwinResult('open', 0).stolen).toBe(0);
  });

  it('evil-twin risk follows the security mode', () => {
    expect(evilTwinRisk('open')).toBe('Critical');
    expect(evilTwinRisk('wep')).toBe('Critical');
    expect(evilTwinRisk('wpa')).toBe('High');
    expect(evilTwinRisk('wpa2')).toBe('Medium');
    expect(evilTwinRisk('wpa3')).toBe('Blocked');
    expect(evilTwinRisk('wpa3-enterprise')).toBe('Blocked');
  });

  it('802.1X: enterprise accepts with a valid EAP method, everything else rejects', () => {
    const accept = authenticate8021X({ securityId: 'wpa3-enterprise', eapMethod: 'EAP-TLS', username: 'spencer' });
    expect(accept.result).toBe('Access-Accept');
    expect(accept.reason).toContain('spencer');
    const peap = authenticate8021X({ securityId: 'wpa3-enterprise', eapMethod: 'PEAP', username: 'spencer' });
    expect(peap.result).toBe('Access-Accept');
    expect(authenticate8021X({ securityId: 'wpa2', eapMethod: 'EAP-TLS', username: 'spencer' }).result).toBe('Access-Reject');
    expect(authenticate8021X({ securityId: 'wpa3-enterprise', eapMethod: 'PEAP', username: '' }).result).toBe('Access-Reject');
    expect(authenticate8021X({ securityId: 'wpa3-enterprise', eapMethod: 'EAP-MD5', username: 'spencer' }).result).toBe('Access-Reject');
  });
});

describe('PoE power', () => {
  it('the 4x4 AP draws 25 W — 802.3af cannot feed it', () => {
    expect(AP_POWER_W).toBe(25);
    expect(POE.map((p) => p.id)).toEqual(['af', 'at', 'bt']);
    expect(poeById('af').watts).toBe(15.4);
    expect(poeById('at').watts).toBe(30);
    expect(poeById('bt').watts).toBe(60);
    expect(poeSufficient('af')).toBe(false);
    expect(poeSufficient('at')).toBe(true);
    expect(poeSufficient('bt')).toBe(true);
    expect(poeById('nope')).toBeNull();
  });
});

describe('AP config text', () => {
  it('renders a hostapd-style config from the current settings', () => {
    const text = apConfigText({ ssid: 'R2C-WiFi', band: '2.4 GHz', channel: 6, standardId: 'g', securityId: 'wpa3-enterprise', ssidBroadcast: true, poeId: 'at' });
    expect(text).toContain('ssid=R2C-WiFi');
    expect(text).toContain('channel=6');
    expect(text).toContain('wpa_key_mgmt=WPA-EAP');
    expect(text).toContain('ieee8021x=1');
    expect(text).toContain('802.11g');
    expect(text).toContain('WPA3-Enterprise');
    expect(text).toContain('30 W');
  });

  it('flags a hidden SSID as not-security and an under-powered AP', () => {
    const text = apConfigText({ ssid: 'R2C-WiFi', band: '5 GHz', channel: 40, standardId: 'ac', securityId: 'wpa2', ssidBroadcast: false, poeId: 'af' });
    expect(text).toContain('ignore_broadcast_ssid=1');
    expect(text).toContain('NOT security');
    expect(text).toContain('UNDER-POWERED');
    expect(text).toContain('wpa_key_mgmt=WPA-PSK');
  });
});
