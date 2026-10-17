// Phone-size checks in Chromium (Android) and WebKit (iOS) against a built app.
//
//   npm run build && npx vite preview --port 4319 &  then  node scripts/mobile-check.mjs
//   (BASE_URL overrides http://localhost:4319). Needs: npx playwright-core install chromium webkit
//
// Catches the mobile regressions found by hand on 2026-10-17: sideways overflow, a wrapped landing
// header, acronym underlines WebKit silently refused to draw, and tap-to-explain.
import { chromium, webkit, devices } from 'playwright-core';

const BASE = process.env.BASE_URL || 'http://localhost:4319';
const PAGES = ['/', '/app', '/academy/courses', '/academy/lessons/py-basics', '/practice', '/library', '/academy/roadmap', '/signin', '/pricing'];
const PHONES = { chromium: [chromium, devices['Pixel 7']], webkit: [webkit, devices['iPhone 13']] };

const failures = [];
const fail = (msg) => { failures.push(msg); console.log(`  FAIL ${msg}`); };

async function underlineDrawn(page) {
  // Pixel-diff a strip under the first visible acronym with and without its highlight. Animation is
  // off (see newContext below); two highlight-free shots must match, or the result means nothing.
  const box = await page.evaluate(() => {
    for (const r of CSS.highlights?.get('acronym') || []) {
      const b = r.getBoundingClientRect();
      if (b.width > 8 && b.top > 0 && b.bottom < innerHeight) return { x: b.left, y: b.bottom - 5, width: b.width, height: 8 };
    }
    return null;
  });
  if (!box) return null;
  const withHl = await page.screenshot({ clip: box });
  await page.evaluate(() => { window.__hl = CSS.highlights.get('acronym'); CSS.highlights.delete('acronym'); });
  await page.waitForTimeout(100);
  const without = await page.screenshot({ clip: box });
  await page.waitForTimeout(300);
  const control = await page.screenshot({ clip: box });
  await page.evaluate(() => CSS.highlights.set('acronym', window.__hl));
  if (!without.equals(control)) return 'unstable';
  return !withHl.equals(without);
}

for (const [engine, [type, device]] of Object.entries(PHONES)) {
  console.log(`\n${engine} (${device.viewport.width}x${device.viewport.height})`);
  const browser = await type.launch();
  const context = await browser.newContext({ ...device, reducedMotion: 'reduce' });
  // Ambient background off: its CSS animation would make the pixel comparison meaningless.
  await context.addInitScript(() => { try { localStorage.setItem('itfund-ambient-bg', 'off'); } catch { /* ignore */ } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  for (const path of PAGES) {
    errors.length = 0;
    await page.goto(BASE + path, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      acronyms: CSS.highlights?.get('acronym')?.size ?? 0,
      h1: !!document.querySelector('h1'),
    }));
    console.log(`  ${path}  overflow=${m.overflow}px acronyms=${m.acronyms} errors=${errors.length}`);
    if (m.overflow > 1) fail(`${engine} ${path}: page scrolls sideways by ${m.overflow}px`);
    if (errors.length) fail(`${engine} ${path}: page error: ${errors[0]}`);
    if (!m.h1) fail(`${engine} ${path}: page did not render a heading`);
  }

  // Landing header: brand and buttons each on one line.
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const header = await page.evaluate(() =>
    [...document.querySelectorAll('header span, header a')].filter((e) => e.offsetHeight).map((e) => [e.innerText.trim(), e.getBoundingClientRect().height]));
  for (const [text, h] of header) if (h > 40) fail(`${engine} landing header "${text}" wraps (${Math.round(h)}px tall)`);

  // Underlines actually painted (WebKit once dropped them all).
  const drawn = await underlineDrawn(page);
  console.log(`  underline drawn: ${drawn}`);
  if (drawn === false) fail(`${engine}: acronym underlines are registered but not drawn`);
  if (drawn === 'unstable') fail(`${engine}: underline check inconclusive (page still animating)`);
  if (drawn === null) fail(`${engine}: no visible acronym on the landing page`);

  // Tap a plain-text acronym: tooltip appears; tap elsewhere: it closes.
  await page.goto(BASE + '/app', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const pt = await page.evaluate(() => {
    for (const r of CSS.highlights.get('acronym')) {
      const b = r.getBoundingClientRect();
      if (b.width && b.top > 100 && b.bottom < innerHeight - 120 && !r.startContainer.parentElement.closest('a,button')) {
        return { t: r.toString(), x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
    }
    return null;
  });
  if (!pt) fail(`${engine}: no tappable acronym on /app`);
  else {
    await page.touchscreen.tap(pt.x, pt.y);
    await page.waitForTimeout(400);
    const tip = (await page.locator('[role=tooltip]').count()) ? await page.locator('[role=tooltip]').textContent() : null;
    console.log(`  tap ${pt.t} -> ${tip ? tip.slice(0, 60) : 'NO TOOLTIP'}`);
    if (!tip?.startsWith(`${pt.t}:`)) fail(`${engine}: tapping ${pt.t} did not explain it`);
    const vw = device.viewport.width;
    const box = tip && await page.locator('[role=tooltip]').boundingBox();
    if (box && (box.x < 0 || box.x + box.width > vw)) fail(`${engine}: tooltip runs off screen`);
    await page.touchscreen.tap(vw / 2, 60);
    await page.waitForTimeout(300);
    if (await page.locator('[role=tooltip]').count()) fail(`${engine}: tooltip did not close on tapping elsewhere`);
  }
  await browser.close();
}

if (failures.length) {
  console.log(`\n${failures.length} mobile check(s) failed`);
  process.exit(1);
}
console.log('\nAll mobile checks passed');
