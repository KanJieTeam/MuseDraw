// Checks a local review package through file://; no server or login is needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';

const flags = process.argv.slice(2);
const get = name => flags.includes(name) ? flags[flags.indexOf(name) + 1] : undefined;
for (const name of ['--page', '--output', '--playwright']) assert.ok(get(name), `${name} is required`);
const entry = path.resolve(get('--page')), output = path.resolve(get('--output'));
const packageRoot = path.dirname(entry);
try { await fs.access(output); throw Error('Use a new check-output directory'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await fs.mkdir(output, {recursive: true});
const {chromium} = await import(pathToFileURL(path.resolve(get('--playwright'))).href);
const browser = await chromium.launch({headless: true, ...(get('--browser') ? {executablePath: get('--browser')} : {})});
const page = await browser.newPage({viewport: {width: 1800, height: 1200}});
const runtimeErrors = [], remoteRequests = [], report = {passed: false, checks: []};
page.on('pageerror', error => runtimeErrors.push(error.message));
page.on('request', request => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
async function check(name, test) {
  await test(); report.checks.push(name);
}
try {
  await page.goto(pathToFileURL(entry).href, {waitUntil: 'load'});
  await check('twelve cases and truthful revision status', async () => {
    assert.equal(await page.locator('[data-case]').count(), 12);
    assert.equal(await page.locator('[data-changed="true"]').count() + await page.locator('[data-changed="false"]').count(), 12);
  });
  await check('all reference, previous and current images load offline', async () => {
    const images = await page.locator('.comparison img').evaluateAll(items => items.map(im => ({src: im.getAttribute('src'), complete: im.complete, width: im.naturalWidth})));
    assert.ok(images.length >= 24);
    assert.ok(images.every(im => im.complete && im.width > 0), JSON.stringify(images.filter(im => !im.complete || !im.width)));
    report.images = images.length;
  });
  await check('all local source and report links resolve inside package', async () => {
    for (const href of await page.locator('a[href]').evaluateAll(items => items.map(a => a.getAttribute('href')))) {
      if (href.startsWith('#') || /^https?:/.test(href)) continue;
      const url = new URL(href, pathToFileURL(entry));
      assert.equal(url.protocol, 'file:');
      const target = fileURLToPath(url), relative = path.relative(packageRoot, target);
      assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
      assert.ok((await fs.stat(target)).isFile(), href);
    }
  });
  await check('reference framing preserves intrinsic aspect ratio', async () => {
    for (const image of await page.locator('.crop img').all()) {
      const dimensions = await image.evaluate(im => ({w: im.getBoundingClientRect().width, h: im.getBoundingClientRect().height, nw: im.naturalWidth, nh: im.naturalHeight}));
      assert.ok(Math.abs(dimensions.w / dimensions.h - dimensions.nw / dimensions.nh) < .01,
        'A cropped reference image is distorted by inherited image constraints');
    }
  });
  await check('all enlargement dialogs open and actual size uses native pixels', async () => {
    for (const button of await page.locator('[data-view]').all()) {
      await button.click();
      assert.equal(await page.locator('#viewer').evaluate(dialog => dialog.open), true);
      await page.locator('#viewer-image').evaluate(im => im.decode());
      await page.locator('#size-toggle').click();
      const image = await page.locator('#viewer-image').evaluate(im => ({rendered: im.getBoundingClientRect().width, natural: im.naturalWidth}));
      assert.ok(Math.abs(image.rendered - image.natural) < 1);
      await page.locator('#viewer-close').click();
    }
  });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({path: path.join(output, 'desktop.png')});
  await check('390px viewport does not overflow horizontally', async () => {
    await page.setViewportSize({width: 390, height: 844});
    await page.evaluate(() => scrollTo(0, 0));
    const widths = await page.evaluate(() => ({page: document.documentElement.scrollWidth, viewport: innerWidth}));
    assert.ok(widths.page <= widths.viewport, JSON.stringify(widths));
    await page.screenshot({path: path.join(output, 'mobile.png')});
  });
  await check('no script errors or automatic network requests', async () => {
    assert.deepEqual(runtimeErrors, []); assert.deepEqual(remoteRequests, []);
  });
  report.passed = true;
  report.notAssessed = ['aesthetic approval', 'architecture truth', 'model reproduction', 'draw.io editing'];
} catch (error) {
  report.error = error.message; process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify(report));
