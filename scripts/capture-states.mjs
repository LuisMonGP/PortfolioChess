import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('previews');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:4321/ ...');
  await page.goto('http://localhost:4321/', { waitUntil: 'domcontentloaded' });

  // Esperar a que la escena 3D termine de cargar y compilar
  await page.waitForFunction(() => {
    const loader = document.getElementById('loader');
    return window.__chess && loader && loader.classList.contains('done');
  }, { timeout: 30000 });

  console.log('Scene loaded. Capturing states...');

  const states = [
    { name: '01-hero', p: 0.0 },
    { name: '02-marmol', p: 0.25 },
    { name: '03-caballo', p: 0.50 },
    { name: '04-rey', p: 0.75 },
    { name: '05-completo', p: 1.0 },
  ];

  for (const s of states) {
    const data = await page.evaluate((progress) => {
      window.__chess.inspectState(progress);
      // forzar render inmediato de un frame
      return window.__chess.captureDataURL();
    }, s.p);

    const base64Data = data.replace(/^data:image\/png;base64,/, '');
    const filePath = path.join(outDir, `before-${s.name}.png`);
    fs.writeFileSync(filePath, base64Data, 'base64');

    const metrics = await page.evaluate(() => window.__chess.inspectState());
    console.log(`Saved ${s.name}:`, JSON.stringify(metrics.screenPos));
  }

  await browser.close();
  console.log('All states captured successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
