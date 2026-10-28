import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Evidence collection, not an aesthetic score or an interaction test.
export async function captureUI({ target, out, chromium, executablePath,
  viewports = [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }],
  targets = [] }) {
  if (!target || !out) throw new Error('target and out are required');
  if (!viewports.length || viewports.some(v => !Number.isInteger(v.width) || !Number.isInteger(v.height) || v.width < 240 || v.height < 240 || v.width > 4096 || v.height > 4096)) {
    throw new Error('Each viewport must have integer dimensions from 240 to 4096');
  }
  if (new Set(viewports.map(v => `${v.width}x${v.height}`)).size !== viewports.length) throw new Error('Viewports must be unique');
  // Never replace a first draft's evidence on a later run.
  await fs.mkdir(out, { recursive: true });
  if ((await fs.readdir(out)).length) throw new Error('Output directory must be empty; use a new round directory');
  const url = /^(https?:|file:)/i.test(target) ? target : pathToFileURL(path.resolve(target)).href;
  const report = { version: 1, target: url, capturedAt: new Date().toISOString(),
    scope: 'Browser captures and measured defects only; aesthetics and interactions are not certified.', views: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const name = `${viewport.width}x${viewport.height}`;
      const view = { name, viewport, errors, targets: [] };
      report.views.push(view);
      try {
        const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        if (response && !response.ok()) throw new Error(`HTTP ${response.status()}`);
        await page.evaluate(() => Promise.race([
          document.fonts.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Font readiness timed out')), 10000)),
        ]));
        view.geometry = await page.evaluate(() => ({
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
          brokenImages: [...document.images].filter(img => img.getClientRects().length && (!img.complete || img.naturalWidth === 0)).map(img => img.getAttribute('src')),
        }));
        for (const selector of targets) {
          const found = page.locator(selector);
          const count = await found.count();
          const box = count === 1 && await found.isVisible() ? await found.boundingBox() : null;
          view.targets.push({ selector, count, box, fullyInFirstScreen: Boolean(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1) });
        }
        await page.screenshot({ path: path.join(out, `${name}.png`) });
        await page.screenshot({ path: path.join(out, `${name}-full.png`), fullPage: true });
        view.captures = [`${name}.png`, `${name}-full.png`];
        view.measuredDefects = Number(view.geometry.horizontalOverflow) + view.geometry.brokenImages.length + errors.length;
      } catch (error) {
        view.failure = error.message;
      } finally {
        await page.close();
      }
    }
  } catch (error) {
    report.failure = error.message;
    throw error;
  } finally {
    if (browser) await browser.close();
    await fs.writeFile(path.join(out, 'capture.json'), JSON.stringify(report, null, 2) + '\n');
  }
  return report;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('node capture-ui.mjs TARGET --out NEW_DIRECTORY [--targets SELECTORS_JSON] [--playwright MODULE_FILE] [--browser EXECUTABLE]');
    return;
  }
  const [target, ...args] = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--out', '--targets', '--playwright', '--browser'].includes(args[i]) || !args[i + 1]) throw new Error(`Invalid option: ${args[i]}`);
    options[args[i]] = args[i + 1];
  }
  const modulePath = options['--playwright'] || process.env.MUSEDRAW_PLAYWRIGHT;
  const { chromium } = await import(modulePath ? pathToFileURL(path.resolve(modulePath)).href : 'playwright');
  const targets = options['--targets'] ? JSON.parse(await fs.readFile(options['--targets'], 'utf8')) : [];
  if (!Array.isArray(targets) || targets.some(s => typeof s !== 'string')) throw new Error('Targets must be a JSON array of CSS selectors');
  const report = await captureUI({ target, out: options['--out'], targets, chromium,
    executablePath: options['--browser'] || process.env.MUSEDRAW_BROWSER });
  console.log(JSON.stringify(report));
  if (report.views.some(v => v.failure || v.measuredDefects)) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
