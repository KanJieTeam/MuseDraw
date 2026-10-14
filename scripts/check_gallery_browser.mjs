import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Use an explicitly supplied, existing Playwright installation.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flags = process.argv.slice(2);
const option = (name, fallback) => {
  const index = flags.indexOf(name);
  if (index === -1) return fallback;
  assert.ok(flags[index + 1] && !flags[index + 1].startsWith('--'), `${name} requires a value`);
  return flags[index + 1];
};
const playwrightPath = option('--playwright');
assert.ok(playwrightPath, 'Pass --playwright path/to/existing/playwright/index.mjs');
const output = path.resolve(repo, option('--output', 'output/gallery-qa'));
await fs.mkdir(output, { recursive: true });
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'musedraw-gallery-qa-'));
const scratchReal = await fs.realpath(scratch);
const report = { checks: [], screenshots: [], downloads: [], httpAssets: [] };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
let server, browser, page;

async function check(name, fn) {
  try {
    const detail = await fn();
    report.checks.push({ name, status: 'passed', ...(detail ? { detail } : {}) });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({ name, status: 'failed', error: error.message });
    throw error;
  }
}

async function serveRepository() {
  const serveRoot = path.resolve(repo, option('--site', '.'));
  const mime = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const repositoryReal = await fs.realpath(serveRoot);
  server = http.createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let target = path.resolve(serveRoot, `.${pathname}`);
      const relative = path.relative(serveRoot, target);
      if (relative.startsWith('..') || path.isAbsolute(relative)) { response.writeHead(403).end(); return; }
      if ((await fs.stat(target)).isDirectory()) target = path.join(target, 'index.html');
      const realTarget = await fs.realpath(target);
      const realRelative = path.relative(repositoryReal, realTarget);
      if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) { response.writeHead(403).end(); return; }
      const bytes = await fs.readFile(realTarget);
      response.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(404).end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${server.address().port}/docs/gallery/`;
}

async function fetchBytes(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function sourceBytesMatch(actual, expected, format) {
  if (actual.equals(expected)) return true;
  if (!['svg', 'scene'].includes(format)) return false;
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    return decoder.decode(actual).replace(/\r\n/g, '\n') === decoder.decode(expected).replace(/\r\n/g, '\n');
  } catch { return false; }
}

async function noOverflow(selectors = ['html', 'body', '.style-card', '#preview', '#copy-dialog']) {
  const overflow = await page.evaluate(selectors => selectors.flatMap(selector => [...document.querySelectorAll(selector)]
    .filter(element => element.clientWidth && element.scrollWidth > element.clientWidth + 1)
    .map(element => ({ selector, width: element.clientWidth, scrollWidth: element.scrollWidth }))), selectors);
  assert.deepEqual(overflow, [], 'Horizontal overflow');
}

async function screenshot(name) {
  await page.screenshot({ path: path.join(output, name), animations: 'disabled' });
  report.screenshots.push(name);
}

async function openPreview(item) {
  await page.locator(`[data-preview="${item.id}"]`).click();
  await page.waitForFunction(() => document.querySelector('#preview').open);
  await page.locator('#preview-image').evaluate(async image => {
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Preview did not decode');
  });
  const source = new URL(await page.locator('#preview-image').getAttribute('src'), page.url()).href;
  assert.ok([item.svg, item.png].some(file => new URL(file, page.url()).href === source), 'Preview must use the selected current example');
}

async function download(locator, expected, label, format) {
  const [download] = await Promise.all([page.waitForEvent('download'), locator.click()]);
  assert.equal(await download.failure(), null, label);
  assert.equal(path.extname(download.suggestedFilename()), format === 'scene' ? '.json' : `.${format}`);
  const target = path.join(scratch, `download-${report.downloads.length}${path.extname(download.suggestedFilename())}`);
  await download.saveAs(target);
  const actual = await fs.readFile(target);
  assert.equal(hash(actual), expected.sha256, `${label}: downloaded bytes differ from the published file`);
  assert.equal(actual.length, expected.bytes);
  report.downloads.push({ label, filename: download.suggestedFilename(), bytes: actual.length, sha256: hash(actual) });
}

try {
  const requestedUrl = option('--url') || await serveRepository();
  assert.ok(/^https?:$/.test(new URL(requestedUrl).protocol), '--url must be HTTP or HTTPS');
  const { chromium } = await import(pathToFileURL(path.resolve(playwrightPath)).href);
  browser = await chromium.launch({ headless: true, args: ['--disable-lcd-text', '--font-render-hinting=none'], ...(option('--browser') ? { executablePath: path.resolve(option('--browser')) } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, acceptDownloads: true, reducedMotion: 'reduce' });
  const errors = [], externalRequests = [], apiRequests = [];
  const observe = async (context, allowedOrigin) => {
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (!['http:', 'https:'].includes(url.protocol)) { await route.continue(); return; }
      if (url.origin !== allowedOrigin) {
        externalRequests.push(request.url());
        await route.abort();
      } else {
        if (!['GET', 'HEAD'].includes(request.method()) || /\/(?:api|v1|chat|completions)(?:\/|$)/.test(url.pathname)) apiRequests.push(request.url());
        await route.continue();
      }
    });
    context.on('page', opened => opened.on('pageerror', error => errors.push(error.message)));
  };
  await observe(context, new URL(requestedUrl).origin);
  page = await context.newPage();
  await page.goto(requestedUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('.style-card').length === 2);
  const galleryUrl = page.url();
  const manifest = JSON.parse((await fetchBytes(new URL('manifest.json', galleryUrl))).toString('utf8'));
  const localManifest = JSON.parse(await fs.readFile(path.join(repo, 'docs/gallery/manifest.json'), 'utf8'));
  assert.deepEqual(manifest, localManifest, 'Served manifest differs from the source checkout');
  const items = manifest.items;
  assert.deepEqual(items.map(item => [item.id, item.name]), [['sketch', '手绘线稿'], ['planes', '终端色域']]);
  report.styleCount = items.length;
  const assets = new Map(), copied = new Map();

  await check('two-current-examples-published-assets-match-source', async () => {
    for (const item of items) for (const format of ['scene', 'svg', 'png', 'thumbnail']) {
      const source = item[format];
      assert.match(source, /^examples\/(sketch|planes)\/(document\.json|diagram\.(svg|png)|preview-1200\.png)$/);
      const remote = await fetchBytes(new URL(source, galleryUrl));
      const local = await fs.readFile(path.join(repo, 'docs/gallery', source));
      assert.ok(sourceBytesMatch(remote, local, format), `${item.id}/${format}: HTTP content differs from source`);
      assert.ok(remote.length > 0);
      if (format === 'scene') {
        const document = JSON.parse(remote.toString('utf8'));
        assert.equal(document.presentation.style, item.name);
        assert.ok(document.scene.nodes.length > 0 && document.scene.edges.length > 0);
      }
      const entry = { id: item.id, format, bytes: remote.length, sha256: hash(remote), sourceComparison: remote.equals(local) ? 'byte-exact' : 'text-crlf-to-lf-only' };
      report.httpAssets.push(entry); assets.set(`${item.id}/${format}`, entry);
    }
    return { styles: 2, files: 8 };
  });

  await check('desktop-layout-and-two-decoded-thumbnails', async () => {
    await noOverflow();
    for (const item of items) {
      const image = page.locator(`.style-card img[src="${item.thumbnail}"]`);
      assert.equal(await image.count(), 1);
      await image.evaluate(async image => { await image.decode(); if (!image.naturalWidth || !image.naturalHeight) throw new Error('Thumbnail did not decode'); });
    }
    await screenshot('desktop.png');
    return { decodedThumbnails: 2, viewport: '1440x1000' };
  });

  await check('style-briefs-copy-through-real-clipboard', async () => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(galleryUrl).origin });
    for (const item of items) {
      await page.evaluate(() => navigator.clipboard.writeText('QA clipboard before copy'));
      await page.locator(`[data-copy-style="${item.id}"]`).click();
      await page.waitForFunction(async () => (await navigator.clipboard.readText()) !== 'QA clipboard before copy');
      // Windows clipboard uses CRLF; textarea values use LF on every platform.
      const text = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
      assert.ok(text.includes('https://github.com/KanJieTeam/MuseDraw'), 'Copied request must identify the current repository');
      assert.ok(text.includes(item.name), 'Copied request must identify the selected style');
      assert.ok(text.includes(item.prompt), 'Copied request must include the natural language brief');
      assert.doesNotMatch(text, /productionBrief|api[_-]?key|\b(?:x|y|width|height)\s*[:=]\s*\d/i);
      copied.set(item.id, text);
    }
    return { nativeClipboardStyles: items.map(item => item.id) };
  });

  await check('clipboard-permission-denial-opens-selectable-manual-copy', async () => {
    const fallback = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await observe(fallback, new URL(galleryUrl).origin);
    await fallback.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')) } });
      document.execCommand = () => false;
    });
    const original = page;
    try {
      page = await fallback.newPage();
      await page.goto(galleryUrl, { waitUntil: 'networkidle' });
      for (const item of items) {
        await page.locator(`[data-copy-style="${item.id}"]`).click();
        await page.locator('#copy-dialog').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#copy-text').inputValue(), copied.get(item.id));
        assert.equal(await page.locator('#copy-text').evaluate(element => element.selectionEnd - element.selectionStart), copied.get(item.id).length, 'Manual request must be selected for copying');
        await noOverflow();
        await page.locator('#close-copy').click();
        assert.equal(await page.locator('#copy-dialog').evaluate(element => element.open), false);
      }
      await page.locator('[data-copy-style="sketch"]').click();
      await page.locator('#copy-dialog').waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#copy-dialog').evaluate(element => element.open), false);
      return { deniedClipboardPermission: true, blockedLegacyCopy: true, exactSelectableText: true };
    } finally { await fallback.close(); page = original; }
  });

  await check('preview-zoom-fit-close-and-escape-for-both-styles', async () => {
    for (const item of items) {
      await openPreview(item);
      const transform = () => page.locator('#preview-image').evaluate(image => getComputedStyle(image).transform);
      const initial = await transform();
      await page.locator('#zoom-in').click();
      assert.notEqual(await transform(), initial, 'Zoom in must change the image transform');
      await page.locator('#fit').click();
      assert.equal(await transform(), initial, 'Fit must reset the preview');
      await page.locator('#zoom-out').click();
      assert.notEqual(await transform(), initial, 'Zoom out must change the image transform');
      await page.locator('#fit').click();
      await noOverflow(['html', '#preview']);
      await screenshot(`desktop-preview-${item.id}.png`);
      await page.locator('#close-preview').click();
      assert.equal(await page.locator('#preview').evaluate(element => element.open), false);
      await openPreview(item);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#preview').evaluate(element => element.open), false);
    }
    return { previewStyles: 2, decodedImages: 2 };
  });

  await check('real-downloads-svg-png-and-editable-document-for-both-styles', async () => {
    for (const item of items) for (const format of ['svg', 'png', 'scene']) {
      const locator = page.locator(`.style-card a[download][href="${item[format]}"]`);
      assert.equal(await locator.count(), 1, `${item.id}/${format} download must be present`);
      await download(locator, assets.get(`${item.id}/${format}`), `${item.id}/${format}`, format);
    }
    return { byteExactBrowserDownloads: 6 };
  });

  await check('mobile-390-layout-decoded-images-preview-and-copy', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await noOverflow();
    await screenshot('mobile.png');
    for (const item of items) {
      await openPreview(item);
      await noOverflow(['html', '#preview']);
      await screenshot(`mobile-preview-${item.id}.png`);
      await page.keyboard.press('Escape');
      await page.locator(`[data-copy-style="${item.id}"]`).click();
      await page.waitForFunction(async expected => (await navigator.clipboard.readText()).replace(/\r\n/g, '\n') === expected, copied.get(item.id));
      assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), copied.get(item.id));
    }
    return { viewport: '390x844', previewStyles: 2 };
  });

  await check('static-page-has-no-external-network-api-calls-or-runtime-errors', async () => {
    assert.deepEqual(externalRequests, []);
    assert.deepEqual(apiRequests, []);
    assert.deepEqual(errors, []);
    assert.equal(await page.locator('iframe').count(), 0);
    return { externalRequests: 0, apiRequests: 0, runtimeErrors: 0 };
  });
  report.status = 'passed';
  console.log(`Gallery browser QA: passed; ${report.checks.length} checks, ${report.downloads.length} byte-exact downloads.`);
} catch (error) {
  report.status = 'failed'; report.error = error.message;
  if (page && !page.isClosed()) await screenshot('failure.png').catch(() => {});
  console.error(`Gallery browser QA failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  const currentReal = await fs.realpath(scratch).catch(() => null);
  const tempReal = await fs.realpath(os.tmpdir());
  const relative = currentReal && path.relative(tempReal, currentReal);
  assert.ok(currentReal === scratchReal && relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(scratch).startsWith('musedraw-gallery-qa-'), 'Refusing an unverified scratch cleanup');
  await fs.rm(scratch, { recursive: true, force: true });
}
