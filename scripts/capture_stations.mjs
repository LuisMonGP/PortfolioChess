import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function capture() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  console.log('Navigating...');
  await page.goto('http://localhost:4321/');

  await page.waitForFunction(() => window.__chess && window.__chess.heroes && window.__chess.heroes.bust, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  const outDir = path.resolve('captures');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const stations = [
    { p: 0.0, name: 'station_0_hero' },
    { p: 0.25, name: 'station_1_marmol' },
    { p: 0.50, name: 'station_2_caballo' },
    { p: 0.75, name: 'station_3_rey' },
    { p: 1.0, name: 'station_4_tablero' },
  ];

  for (const s of stations) {
    await page.evaluate((progress) => {
      window.__chess.inspectState(progress);
    }, s.p);

    await new Promise(r => setTimeout(r, 500));

    const state = await page.evaluate(() => window.__chess.inspectState());
    console.log(`Station ${s.p}:`, JSON.stringify(state));

    const dataUrl = await page.evaluate(() => window.__chess.captureDataURL());
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(outDir, `${s.name}.png`), Buffer.from(base64Data, 'base64'));
    console.log(`Saved ${s.name}.png`);
  }

  await browser.close();
  console.log('Capture finished successfully!');
}

capture().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
