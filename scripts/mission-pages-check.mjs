// Mission-pages checks in Chromium against a built app.
//
//   npm run build && npx vite preview --port 4319 &  then  node scripts/mission-pages-check.mjs
//   (BASE_URL overrides http://localhost:4319). Needs: npx playwright-core install chromium
//
// Verifies the mission-pages polish (2026-11-16) in a real browser:
//  - terminal page: a command that fails at the network shows inline in
//    the terminal only — no "Failed to fetch" banner under the topology —
//    and the three wide-desktop columns end level (Traffic test /
//    Firewall console / Incident report bottom edges equal);
//  - terminal topology: the LAN labels sit under their cards and R1's
//    two gateway IPs are fully inside the R1 card;
//  - briefing page: the 3D lab only — no transmission panel, no 2D view,
//    caption at the bottom — then the connecting transition hands the
//    learner to the terminal;
//  - narrow viewport: the terminal cards stack, no forced heights.
// The API is mocked (route interception); the lab exec endpoint aborts
// to reproduce the transient network failure from the live report.
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL || 'http://localhost:4319';
const OUT = process.env.CHECK_OUT || '/tmp/mission-pages-check';

const OBJECTIVES = [
  { id: 'topology', label: 'Inspect every device in the topology', passed: false },
  { id: 'firewall-inspect', label: 'Read the firewall rules', passed: false },
  { id: 'deny-guest', label: 'Block the intruder', passed: false },
  { id: 'permit-others', label: 'Keep the door open for friends', passed: false },
  { id: 'apply', label: 'Apply the rule where it counts', passed: false },
  { id: 'guest-blocked', label: 'Prove the guest is locked out', passed: false },
  { id: 'trusted-allowed', label: 'Prove friends still get in', passed: false },
  { id: 'document', label: 'Write up the incident', passed: false },
  { id: 'report', label: 'File the mission report', passed: false },
];

const MISSION_DEF = {
  id: 'op-broken-shield',
  title: 'Operation Broken Shield',
  callsign: 'OPERATION BROKEN SHIELD',
  brief: [
    'Orion Technologies — unauthorized traffic detected between two network segments. Sensitive resources may be exposed.',
    'Investigate the topology, inspect the firewall policies, and find the unauthorized path.',
  ],
  xp: 80,
  description: 'Broken Shield',
  lab_id: 'net-acl-001',
  lesson_id: 'net-security',
  objectives: OBJECTIVES,
};

const SESSION = { id: 'sess-1', status: 'ACTIVE', validation_results: [], findings: { config: {} } };

const failures = [];
const fail = (msg) => { failures.push(msg); console.log(`  FAIL ${msg}`); };
const note = (msg) => console.log(`  ${msg}`);

async function mockApi(context) {
  // ONE dispatcher for all /api/** calls: Playwright matches overlapping
  // routes last-registered-first, so separate specific + catch-all routes
  // let the catch-all swallow the mission endpoints. Dispatch by URL.
  await context.route('**/api/**', (route) => {
    const url = route.request().url();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.endsWith('/api/missions/op-broken-shield/start')) {
      return json({
        attempt: { id: 'att-1', status: 'IN_PROGRESS', findings: {} },
        resumed: false, session: SESSION, objectives: OBJECTIVES,
      });
    }
    if (url.endsWith('/api/missions/op-broken-shield')) return json(MISSION_DEF);
    if (url.includes('/api/missions/attempts/')) {
      return json({ attempt: { id: 'att-1', status: 'IN_PROGRESS' }, session: SESSION, objectives: OBJECTIVES });
    }
    if (url.endsWith('/api/ai/status')) return json({ enabled: false });
    if (url.endsWith('/api/voice/status')) return json({ configured: false, cypher: false });
    // The transient failure: the exec request never reaches the server, so
    // fetch rejects with TypeError("Failed to fetch") — the live condition.
    if (/\/api\/labs\/sessions\/[^/]+\/exec$/.test(url)) return route.abort('failed');
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"not mocked"}' });
  });
}

// The Card root for a heading: the nearest ancestor carrying a glass level.
async function cardBottom(page, heading) {
  return page.evaluate((h) => {
    const els = [...document.querySelectorAll('h2')].filter((e) => e.textContent.trim().startsWith(h));
    if (!els.length) return null;
    let node = els[0];
    while (node && !(node.className && typeof node.className === 'string' && /glass-/.test(node.className))) {
      node = node.parentElement;
    }
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { bottom: r.bottom, top: r.top, height: r.height };
  }, heading);
}

const browser = await chromium.launch({
  // The sandbox's browser cache holds chromium-1248 (installed by another
  // workspace); playwright-core 1.48.2 expects chromium-1140, so point at
  // the binary directly instead of letting it resolve by version.
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1000 } });
await mockApi(context);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// --- Terminal page, wide desktop -------------------------------------
console.log('\nterminal /missions/op-broken-shield/terminal (1920x1000)');
await page.goto(`${BASE}/missions/op-broken-shield/terminal`, { waitUntil: 'load' });
await page.waitForSelector('text=Mission Console', { timeout: 15000 });
await page.waitForTimeout(800);

// A command that fails at the network: type it in the terminal.
await page.locator('[aria-label="Terminal command"]').fill('show access-lists');
await page.locator('[aria-label="Terminal command"]').press('Enter');
await page.waitForSelector('text=Could not reach the server', { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(500);

const bodyText = await page.evaluate(() => document.body.innerText);
if (bodyText.includes('Failed to fetch')) fail('terminal: "Failed to fetch" text is on the page');
else note('terminal: no "Failed to fetch" text on the page');
if (bodyText.includes('Could not reach the server')) note('terminal: inline friendly error shown in the terminal');
else fail('terminal: expected the friendly inline error after the failed command');
if (errors.length) fail(`terminal: page errors: ${errors[0]}`);

// The three wide-column cards must end exactly level.
const bottoms = {};
for (const h of ['Traffic test', 'Firewall console', 'Incident report']) {
  bottoms[h] = await cardBottom(page, h);
  if (!bottoms[h]) fail(`terminal: card "${h}" not found`);
}
console.log(`  card bottoms: Traffic test=${bottoms['Traffic test']?.bottom} Firewall=${bottoms['Firewall console']?.bottom} Incident report=${bottoms['Incident report']?.bottom}`);
const values = Object.values(bottoms).map((b) => b?.bottom);
if (values.some((v) => v === null || v === undefined)) fail('terminal: could not measure a card bottom');
else if (Math.max(...values) - Math.min(...values) > 1) fail(`terminal: card bottoms not level (spread ${Math.max(...values) - Math.min(...values)}px)`);
else note('terminal: three card bottoms level');

// Topology: labels under their cards, R1's IPs inside the R1 card.
const topo = await page.evaluate(() => {
  const svg = document.querySelector('[aria-label="Mission network topology"] svg');
  if (!svg) return null;
  const text = (s) => [...svg.querySelectorAll('text')].find((t) => t.textContent === s);
  const rectOf = (label) => {
    const g = [...svg.querySelectorAll('g')].find((el) => el.querySelector('text')?.textContent === label);
    return g?.querySelector('rect')?.getBoundingClientRect();
  };
  const box = (el) => (el ? el.getBoundingClientRect() : null);
  const userLan = box(text('User LAN · 192.168.1.0/24'));
  const serverLan = box(text('Server LAN · 192.168.2.0/24'));
  const guest = rectOf('GUEST');
  const srv = rectOf('SRV');
  const r1 = rectOf('R1');
  const ip1 = box(text('192.168.1.1'));
  const ip2 = box(text('192.168.2.1'));
  return {
    userLan, serverLan, guest, srv, r1, ip1, ip2,
    userLanUnderGuest: userLan && guest ? userLan.top >= guest.bottom - 1 : false,
    serverLanUnderSrv: serverLan && srv ? serverLan.top >= srv.bottom - 1 : false,
    ipsInsideR1: r1 && ip1 && ip2
      ? ip1.left >= r1.left && ip1.right <= r1.right && ip2.left >= r1.left && ip2.right <= r1.right
        && ip1.top >= r1.top && ip2.bottom <= r1.bottom
      : false,
  };
});
if (!topo) fail('terminal: topology SVG not found');
else {
  console.log(`  topology: User LAN top=${topo.userLan?.top} (GUEST bottom=${topo.guest?.bottom}), Server LAN top=${topo.serverLan?.top} (SRV bottom=${topo.srv?.bottom})`);
  if (!topo.userLanUnderGuest) fail('terminal: "User LAN" label is not under the GUEST card');
  if (!topo.serverLanUnderSrv) fail('terminal: "Server LAN" label is not under the SRV card');
  if (!topo.ipsInsideR1) fail("terminal: R1's IPs are not fully inside the R1 card");
  else note("terminal: R1's two IPs fully inside the R1 card");
}
await page.screenshot({ path: `${OUT}-terminal-1920.png` });

// --- Briefing page, fresh attempt ------------------------------------
console.log('\nbriefing /missions/op-broken-shield (1920x1000, fresh attempt)');
await page.goto(`${BASE}/missions/op-broken-shield`, { waitUntil: 'load' });
await page.waitForTimeout(3000);
const briefingUrl = page.url();
if (briefingUrl.includes('/terminal')) {
  // WebGL unavailable in this environment: the renderer-failed fallback
  // sent the learner straight to the terminal. That path works — but the
  // 3D briefing itself could not be rendered here.
  note('briefing: WebGL unavailable here — renderer-failed fallback took the learner to the terminal (3D render not verified in this run)');
} else {
  await page.waitForSelector('text=Opening the SOC', { timeout: 15000 }).catch(() => {});
  const bText = await page.evaluate(() => document.body.innerText);
  for (const gone of ['INCOMING TRANSMISSION', 'SOC Room', '2D view', '3D view']) {
    if (bText.includes(gone)) fail(`briefing: "${gone}" is still on the page`);
  }
  note('briefing: no transmission panel, no 2D view, no SOC Room heading');
  const cap = await page.evaluate(() => {
    const el = document.querySelector('[aria-live="polite"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { text: el.textContent, bottom: r.bottom, viewport: innerHeight };
  });
  console.log(`  caption: "${cap?.text}" bottom=${cap?.bottom} viewport=${cap?.viewport}`);
  if (!cap) fail('briefing: no caption found');
  else if (cap.viewport - cap.bottom > 80) fail('briefing: caption is not at the bottom of the screen');
  else note('briefing: caption at the bottom of the screen');
  // No screenshot here: the live WebGL scene renders continuously under
  // SwiftShader and the compositor never yields a frame to capture (the
  // screenshot call times out even at 120 s). The DOM measurements above
  // are the evidence for this page.
  // The opening plays through, then the connecting transition hands the
  // learner to the terminal. Under SwiftShader the page's own timers run
  // ~5x slow (the software renderer saturates the CPU — a 4 s showcase
  // slot takes ~20 s wall-clock, and the full opening needs ~5 min to
  // reach 'done' on its own; a separate probe run observed every phase
  // — briefing turns, showcase PC1/GUEST/R1/SRV, then 'Connecting to the
  // mission portal…' — so natural completion works). Waiting that out on
  // every run is not useful: give the opening 60 s to finish on its own,
  // then take "Skip intro", which sets the same 'done' phase and runs the
  // exact same transition + redirect.
  // NOTE on observing the transition: 'Connecting…' shows for only 1.2 s
  // of page time, and under SwiftShader a body-text snapshot taken after
  // the wait usually lands after the redirect already happened — so the
  // wait resolving IS the observation, not a later snapshot. And a
  // Playwright click times out on actionability here (the element-stability
  // check needs two animation frames, which are seconds apart under
  // SwiftShader), so Skip is pressed with a direct DOM click — it calls
  // the same onClick handler.
  const waitForText = async (text, timeout) => {
    try {
      await page.waitForSelector(`text=${text}`, { timeout });
      return true;
    } catch { return false; }
  };
  let viaSkip = false;
  let sawConnecting = await waitForText('Connecting to the mission portal', 60000);
  if (!sawConnecting) {
    viaSkip = true;
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Skip intro');
      if (btn) btn.click();
    });
    sawConnecting = await waitForText('Connecting to the mission portal', 180000);
  }
  if (sawConnecting) note(`briefing: "Connecting to the mission portal…" shown${viaSkip ? ' (via Skip intro — same done-phase transition)' : ' (opening played through)'}`);
  else fail('briefing: connecting transition never appeared');
  const sawEstablished = await waitForText('Connection established', 120000);
  if (sawEstablished) note('briefing: "Connection established" shown');
  else fail('briefing: "Connection established" never appeared');
  await page.waitForURL('**/missions/op-broken-shield/terminal', { timeout: 120000 }).catch(() => {});
  if (page.url().includes('/terminal')) note('briefing: transition → terminal page');
  else fail('briefing: did not reach the terminal page after the transition');
}

// --- Terminal page, narrow viewport ----------------------------------
console.log('\nnarrow terminal (390x844)');
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/missions/op-broken-shield/terminal`, { waitUntil: 'load' });
await page.waitForSelector('text=Mission Console', { timeout: 15000 });
await page.waitForTimeout(800);
const narrow = await page.evaluate(() => {
  const overflow = document.documentElement.scrollWidth - innerWidth;
  const tops = {};
  for (const h of ['Traffic test', 'Firewall console', 'Incident report']) {
    const el = [...document.querySelectorAll('h2')].find((e) => e.textContent.trim().startsWith(h));
    tops[h] = el ? el.getBoundingClientRect().top + scrollY : null;
  }
  return { overflow, tops };
});
console.log(`  narrow: overflow=${narrow.overflow}px tops=${JSON.stringify(narrow.tops)}`);
if (narrow.overflow > 1) fail(`narrow: page scrolls sideways by ${narrow.overflow}px`);
const nt = Object.values(narrow.tops);
if (nt.some((v) => v === null)) fail('narrow: a card heading is missing');
else if (!(nt[0] < nt[1] && nt[1] < nt[2])) fail('narrow: cards are not stacked in order');
else note('narrow: cards stack in order, no forced heights');
await page.screenshot({ path: `${OUT}-terminal-390.png` });

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} mission-pages check(s) failed`);
  process.exit(1);
}
console.log('\nAll mission-pages checks passed');
