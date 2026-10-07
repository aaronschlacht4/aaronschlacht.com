import { chromium } from 'playwright';
// Deterministic frames: Playwright's fake clock drives timers and rAF, so the
// loop can be stepped through regardless of how slow SwiftShader renders.
const out = process.argv[2];
const mode = process.argv[3] || 'loop';
const width = Number(process.argv[4] || 1440);
const pickLabel = process.argv[5] || 'Man’s Search';
const shots = JSON.parse(process.argv[6] || '[[1500,"s15"],[2700,"open"],[10900,"vip"]]');
const tag = process.argv[7] || `${mode}-${width}`;
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
p.on('console', (m) => m.type() === 'error' && errs.push(`console.error: ${m.text().slice(0, 300)}`));
if (mode === 'reduced') await p.emulateMedia({ reducedMotion: 'reduce' });
await p.clock.install();
await p.goto('http://localhost:4173/books', { waitUntil: 'networkidle' });
await p.waitForTimeout(5000);
if (mode === 'phone') {
  await p.screenshot({ path: `${out}/remake-${tag}.png` });
  console.log('phone page captured; demo mounted?', await p.locator('canvas').count());
  await b.close();
  process.exit(0);
}
const cell = p.locator('div.overflow-hidden:has(canvas)').last();
await cell.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
const box = await cell.boundingBox();
const pill = async () => (await cell.locator('.z-20').first().innerText().catch(() => '?')).replace(/\n/g, ' ');
const title = async () => (await p.locator('.truncate.text-\\[14px\\]').first().innerText().catch(() => '?'));
await p.clock.pauseAt(Date.now() + 10000);
let t = 0;
const run = async (ms) => { while (ms > 0) { const s = Math.min(50, ms); await p.clock.runFor(s); t += s; ms -= s; } };
const shot = async (name) => { await p.screenshot({ path: `${out}/remake-${tag}-${name}.png`, clip: box }); console.log(name, t, 'pill:', await pill(), '| title:', await title(), '| scrollY', await p.evaluate(() => window.scrollY)); };

if (mode === 'loop' || mode === 'reduced') {
  await p.getByRole('button', { name: pickLabel }).click();
  for (const [ms, name] of shots) { await run(ms - t); await shot(name); }
} else if (mode === 'vipoff') {
  await p.getByRole('switch', { name: /VIP/ }).click();
  await p.getByRole('button', { name: pickLabel }).click();
  for (const [ms, name] of shots) { await run(ms - t); await shot(name); }
} else if (mode === 'drag') {
  await p.getByRole('button', { name: pickLabel }).click();
  await run(100);
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await p.mouse.move(cx, cy); await p.mouse.down();
  for (let i = 1; i <= 10; i++) { await p.mouse.move(cx, cy - i * 30); await run(30); }
  await shot('held');
  await p.mouse.up();
  await run(200); await shot('released');
  await run(2600); await shot('drifting');
  await run(2500); await shot('home');
} else if (mode === 'click') {
  await p.getByRole('button', { name: pickLabel }).click();
  await run(100);
  // Notes from Underground stands 7th on the top row; a small drag over it must not open it.
  const nx = box.x + box.width * 0.313, ny = box.y + box.height * 0.08;
  await p.mouse.move(nx, ny); await run(50); await p.mouse.down(); await p.mouse.move(nx, ny + 8); await run(30); await p.mouse.up(); await run(100);
  console.log('after 8px drag, title:', await title());
  await p.mouse.move(nx, ny); await run(50);
  console.log('cursor over Notes:', JSON.stringify(await p.evaluate(() => document.body.style.cursor)));
  await p.mouse.down(); await p.mouse.up(); await run(100);
  console.log('after click, title:', await title());
  await run(1400); await shot('notes');
}
await b.close();
console.log(errs.length ? errs.join('\n') : 'no page errors');
