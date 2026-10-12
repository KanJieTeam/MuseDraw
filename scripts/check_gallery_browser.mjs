import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// No browser dependency is installed by this checker. Pass an existing Playwright
// entry point, as with the repository's other browser checks.
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
const report = { checks: [], screenshots: [], officialEditor: { status: 'not-checked', verified: false }, downloads: [], httpAssets: [], warnings: [] };
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const editorOrigin = 'https://embed.diagrams.net';
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
  const mime = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.drawio': 'application/xml; charset=utf-8' };
  const repositoryReal = await fs.realpath(repo);
  server = http.createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let target = path.resolve(repo, `.${pathname}`);
      const relative = path.relative(repo, target);
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

async function noOverflow(selectors = ['html', 'body', '.site-header', '.collection-tools', '.case-grid']) {
  const overflow = await page.evaluate((selectors) => selectors.flatMap((selector) => [...document.querySelectorAll(selector)].filter((element) => element.clientWidth && element.scrollWidth > element.clientWidth + 1).map((element) => ({ selector, width: element.clientWidth, scrollWidth: element.scrollWidth }))), selectors);
  assert.deepEqual(overflow, [], 'Horizontal overflow');
}

async function screenshot(name) {
  await page.screenshot({ path: path.join(output, name), animations: 'disabled' });
  report.screenshots.push(name);
}

async function openCase(item) {
  if (await page.locator('#detail').evaluate((element) => element.open)) await page.locator('#close-detail').click();
  await page.locator(`[data-case="${item.id}"] .case-open`).click();
  await page.waitForFunction((number) => document.querySelector('#detail').open && document.querySelector('#detail-number').textContent.endsWith(number), item.number);
  await page.locator('#detail-image').evaluate(async (image) => { await image.decode(); if (!image.naturalWidth || !image.naturalHeight) throw new Error('Detail image has no decoded dimensions'); });
  assert.equal(new URL(await page.locator('#detail-image').getAttribute('src'), page.url()).href, new URL(item.svg, page.url()).href);
}

async function downloaded(locator, expected, expectedName, label) {
  const [download] = await Promise.all([page.waitForEvent('download'), locator.click()]);
  assert.equal(await download.failure(), null, label);
  assert.equal(download.suggestedFilename(), expectedName);
  const target = path.join(scratch, `download-${report.downloads.length}-${expectedName}`);
  await download.saveAs(target);
  const actual = await fs.readFile(target);
  assert.equal(hash(actual), expected.sha256, `${label}: downloaded bytes differ from the published file`);
  assert.equal(actual.length, expected.bytes);
  report.downloads.push({ label, filename: expectedName, bytes: actual.length, sha256: hash(actual) });
}

const protocolStub = `<!doctype html><meta charset="utf-8"><title>Local draw.io protocol fixture</title><p>This is a local protocol test, not the official editor.</p><script>
window.received=[];
addEventListener('message',event=>{if(event.source!==parent)return;let message;try{message=JSON.parse(event.data)}catch{return}window.received.push(message);if(message.action==='load'){window.loadedXml=message.xml;parent.postMessage(JSON.stringify({event:'load'}),'*')}});
parent.postMessage(JSON.stringify({event:'init'}),'*');
</script>`;

try {
  const requestedUrl = option('--url') || await serveRepository();
  assert.ok(/^https?:$/.test(new URL(requestedUrl).protocol), '--url must be an HTTP or HTTPS gallery URL');
  const { chromium } = await import(pathToFileURL(path.resolve(playwrightPath)).href);
  browser = await chromium.launch({ headless: true, args: ['--disable-lcd-text', '--font-render-hinting=none'], ...(option('--browser') ? { executablePath: path.resolve(option('--browser')) } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, acceptDownloads: true, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    window.__galleryQaEditorEvents = [];
    window.addEventListener('message', (event) => {
      if (event.origin !== 'https://embed.diagrams.net' || event.source !== document.querySelector('#editor-frame iframe')?.contentWindow || typeof event.data !== 'string') return;
      try { const data = JSON.parse(event.data); window.__galleryQaEditorEvents.push(data.event); } catch { /* The application rejects malformed protocol messages. */ }
    });
  });
  page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.goto(requestedUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('.case-card').length === 100);
  // Resolve the Pages root's real browser redirect before fetching relative files.
  const galleryUrl = page.url();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(galleryUrl).origin });
  const manifestBytes = await fetchBytes(new URL('manifest.json', galleryUrl));
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert.equal(manifest.items.length, 100, 'The gallery must contain exactly 100 original cases');
  const items = manifest.items;
  const localManifest = JSON.parse(await fs.readFile(path.join(repo, 'docs/gallery/manifest.json'), 'utf8'));
  assert.deepEqual(manifest, localManifest, 'The served gallery manifest differs from the checked-out source');
  report.caseCount = items.length;
  const assets = new Map();
  await check('all-100-published-assets-match-source-bytes', async () => {
    const work = items.flatMap((item) => ['thumbnail', 'svg', 'png', 'drawio'].map((format) => ({ item, format, source: item[format] })));
    for (let first = 0; first < work.length; first += 8) {
      await Promise.all(work.slice(first, first + 8).map(async ({ item, format, source }) => {
        assert.match(source, /^cases\/\d{3}\/(preview\.png|diagram\.(svg|png|drawio))$/, 'Asset must be a public gallery-relative path');
        const remote = await fetchBytes(new URL(source, galleryUrl));
        const local = await fs.readFile(path.join(repo, 'docs/gallery', source));
        assert.ok(remote.equals(local), `Case ${item.number} ${format}: HTTP bytes differ from source`);
        assert.ok(remote.length > 0, `${source} is empty`);
        const entry = { number: item.number, format, bytes: remote.length, sha256: hash(remote) };
        report.httpAssets.push(entry); assets.set(`${item.id}/${format}`, entry);
      }));
    }
    report.httpAssets.sort((a, b) => a.number.localeCompare(b.number) || a.format.localeCompare(b.format));
    return { cases: 100, files: work.length };
  });
  await check('desktop-layout-and-all-100-decoded-thumbnails', async () => {
    await noOverflow();
    for (const item of items) {
      const image = page.locator(`[data-case="${item.id}"] .case-art img`);
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(async (element) => { await element.decode(); if (!element.naturalWidth || !element.naturalHeight) throw new Error('Thumbnail did not decode'); });
      assert.equal(new URL(await image.getAttribute('src'), galleryUrl).href, new URL(item.thumbnail, galleryUrl).href);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot('desktop.png');
    return { decodedThumbnails: 100, viewport: '1440x1000' };
  });
  await check('view-filters-search-and-empty-state', async () => {
    for (const view of ['capability', 'component', 'deployment']) {
      await page.locator(`[data-view="${view}"]`).click();
      assert.equal(await page.locator('.case-card').count(), items.filter((item) => item.view === view).length);
      assert.equal(await page.locator(`[data-view="${view}"]`).getAttribute('aria-pressed'), 'true');
    }
    await page.locator('[data-view="all"]').click();
    await page.locator('#search').fill(items[1].title);
    assert.ok(await page.locator('.case-card').count() > 0);
    assert.equal(await page.locator('.case-card').count(), items.filter((item) => `${item.number} ${item.title} ${item.family} ${item.theme}`.toLocaleLowerCase().includes(items[1].title.toLocaleLowerCase())).length);
    await page.locator('#search').fill('NO_MATCH_qa_86b231da');
    assert.equal(await page.locator('.case-card').count(), 0);
    assert.equal(await page.locator('#empty').isVisible(), true);
    await page.locator('#reset').click();
    assert.equal(await page.locator('.case-card').count(), 100);
    await page.keyboard.press('/');
    assert.equal(await page.locator('#search').evaluate((element) => document.activeElement === element), true);
  });
  await check('favorites-survive-refresh', async () => {
    for (const id of [2, 100]) await page.locator(`[data-case="${id}"] .favorite`).click();
    assert.equal(await page.locator('#favorite-count').textContent(), '2');
    await page.locator('#favorites').click();
    assert.equal(await page.locator('.case-card').count(), 2);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelectorAll('.case-card').length === 100);
    assert.equal(await page.locator('#favorite-count').textContent(), '2');
    for (const id of [2, 100]) assert.equal(await page.locator(`[data-case="${id}"] .favorite`).getAttribute('aria-pressed'), 'true');
    await page.locator('#favorites').click();
    await page.locator('[data-case="100"] .favorite').click();
    assert.equal(await page.locator('.case-card').count(), 1);
    assert.equal(await page.locator('#favorite-count').textContent(), '1');
    await page.locator('#favorites').click();
  });
  await check('detail-svg-zoom-pan-fit-and-fullscreen', async () => {
    await openCase(items.find((item) => item.id === 2));
    await noOverflow(['#detail', '.detail-bar', '.detail-body', '.detail-info', '.zoom-bar']);
    await screenshot('desktop-detail.png');
    await page.locator('#zoom-in').click();
    assert.equal(await page.locator('#zoom-value').textContent(), '125%');
    const viewport = await page.locator('#viewport').boundingBox();
    const x = viewport.x + viewport.width / 2, y = viewport.y + viewport.height / 2;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 55, y + 30, { steps: 5 }); await page.mouse.up();
    const translated = await page.locator('#detail-image').evaluate((image) => { const matrix = new DOMMatrix(getComputedStyle(image).transform); return [matrix.e, matrix.f]; });
    assert.ok(translated[0] > 40 && translated[1] > 20, 'Dragging must pan the drawing');
    await page.locator('#fit').click();
    assert.equal(await page.locator('#zoom-value').textContent(), '100%');
    assert.equal(await page.locator('#detail-image').evaluate((image) => getComputedStyle(image).transform), 'matrix(1, 0, 0, 1, 0, 0)');
    await page.mouse.move(x, y); await page.mouse.wheel(0, -200);
    await page.waitForFunction(() => document.querySelector('#zoom-value').textContent === '112%');
    await page.locator('#fit').click();
    await page.locator('#fullscreen').click();
    await page.waitForFunction(() => document.fullscreenElement?.id === 'viewport');
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => !document.fullscreenElement);
  });
  await check('prompt-and-share-use-real-clipboard', async () => {
    const item = items.find((entry) => entry.id === 2);
    await page.locator('#copy-prompt').click();
    await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('已复制提示词'));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), item.prompt);
    await page.locator('#share').click();
    await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('已复制案例链接'));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), page.url());
  });
  await check('real-downloads-cases-002-099-100-all-formats', async () => {
    for (const id of [2, 99, 100]) {
      const item = items.find((entry) => entry.id === id); await openCase(item);
      for (const format of ['drawio', 'svg', 'png']) await downloaded(page.locator(`#download-${format}`), assets.get(`${id}/${format}`), `MuseDraw-${item.number}.${format}`, `${item.number}/${format}`);
    }
    return { browserDownloads: 9, allCaseHttpByteComparisons: 400 };
  });
  await check('hash-deep-link-and-detail-navigation', async () => {
    await page.goto(new URL('#case-099', galleryUrl).href, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#detail').open && document.querySelector('#detail-number').textContent.endsWith('099'));
    await page.keyboard.press('ArrowRight');
    assert.equal(new URL(page.url()).hash, '#case-100');
    assert.equal(await page.locator('#next').isDisabled(), true);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#detail').open && document.querySelector('#detail-number').textContent.endsWith('100'));
    await page.locator('#previous').click();
    assert.equal(new URL(page.url()).hash, '#case-099');
    await page.locator('#close-detail').click();
    assert.equal(new URL(page.url()).hash, '');
  });
  await check('mobile-layout-thumbnail-and-detail', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('.case-art img').first().evaluate((image) => image.decode());
    await noOverflow();
    await screenshot('mobile.png');
    await openCase(items.find((item) => item.id === 2));
    await noOverflow(['html', '#detail', '.detail-bar', '.detail-body', '.detail-info', '.zoom-bar', '.download-actions']);
    await screenshot('mobile-detail.png');
    await downloaded(page.locator('#download-svg'), assets.get('2/svg'), 'MuseDraw-002.svg', 'mobile-002/svg');
    await page.locator('#close-detail').click();
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await check('narrow-phone-and-tablet-layout', async () => {
    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow();
      await openCase(items.find((item) => item.id === 2));
      await noOverflow(['html', '#detail', '.detail-bar', '.detail-body', '.detail-info', '.zoom-bar', '.download-actions']);
      await page.locator('#close-detail').click();
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    return { widths: [320, 768] };
  });

  // A real request to the official embed is always attempted. Its result is
  // reported independently: a local protocol fixture never verifies diagrams.net.
  await openCase(items.find((item) => item.id === 2));
  const officialResponses = [], officialFailures = [];
  const responseListener = (response) => { if (response.url().startsWith(editorOrigin) && response.request().isNavigationRequest()) officialResponses.push(response.status()); };
  const failureListener = (request) => { if (request.url().startsWith(editorOrigin)) officialFailures.push(request.failure()?.errorText || 'Unknown network failure'); };
  page.on('response', responseListener); page.on('requestfailed', failureListener);
  await page.locator('#edit').click();
  try {
    await page.waitForFunction(() => document.querySelector('#editor').open && document.querySelector('#editor-loading').hidden && window.__galleryQaEditorEvents.includes('init') && window.__galleryQaEditorEvents.includes('load'), null, { timeout: 20000 });
    const frame = page.frames().find((entry) => entry.url().startsWith(editorOrigin));
    assert.ok(frame, 'Official editor frame is absent');
    const drawing = frame.locator('.geDiagramContainer svg').first();
    await drawing.waitFor({ state: 'visible', timeout: 10000 });
    assert.ok(await drawing.locator('text, foreignObject').count() > 0, 'Official editor did not render diagram labels');
    report.officialEditor = { status: 'loaded-and-rendered', verified: true, navigationHttpStatuses: officialResponses, protocolEvents: await page.evaluate(() => window.__galleryQaEditorEvents.slice()) };
    await screenshot('official-editor.png');
    console.log('PASS official-diagrams-net-loaded-and-rendered');
  } catch (error) {
    report.officialEditor = { status: 'unverified', verified: false, reason: error.message, navigationHttpStatuses: officialResponses, requestFailures: officialFailures, protocolEvents: await page.evaluate(() => window.__galleryQaEditorEvents.slice()) };
    report.warnings.push('The official diagrams.net editor was not verified. Local protocol checks below are a separate test, not evidence of official editing.');
    console.log('UNVERIFIED official-diagrams-net-editor');
  } finally {
    page.off('response', responseListener); page.off('requestfailed', failureListener);
  }
  await page.locator('#close-editor').click();
  await page.route(`${editorOrigin}/**`, (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: protocolStub }));
  await check('local-editor-protocol-init-load-and-origin-guards', async () => {
    let downloadCount = 0;
    const onDownload = () => downloadCount++;
    page.on('download', onDownload);
    try {
      await page.locator('#edit').click();
      await page.waitForFunction(() => document.querySelector('#editor-loading').hidden);
      const frame = page.frames().find((entry) => entry.url().startsWith(editorOrigin));
      assert.ok(frame, 'Local protocol fixture frame is absent');
      const loaded = await frame.evaluate(() => window.received.find((message) => message.action === 'load'));
      const original = (await fs.readFile(path.join(repo, 'docs/gallery', items.find((item) => item.id === 2).drawio))).toString('utf8');
      assert.equal(loaded.xml, original); assert.equal(loaded.title, items.find((item) => item.id === 2).title); assert.equal(loaded.autosave, 1);
      await page.evaluate(() => {
        const source = document.querySelector('#editor-frame iframe').contentWindow;
        const save = JSON.stringify({ event: 'save', xml: '<mxfile><diagram/></mxfile>' });
        window.dispatchEvent(new MessageEvent('message', { origin: 'https://evil.invalid', source, data: save }));
        window.dispatchEvent(new MessageEvent('message', { origin: 'https://embed.diagrams.net', source: window, data: save }));
        window.dispatchEvent(new MessageEvent('message', { origin: 'https://embed.diagrams.net', source, data: 'malformed-json' }));
        window.dispatchEvent(new MessageEvent('message', { origin: 'https://embed.diagrams.net', source, data: 'x'.repeat(5_000_001) }));
        for (const data of ['null', 'false', '42', '"text"', '[]']) window.dispatchEvent(new MessageEvent('message', { origin: 'https://embed.diagrams.net', source, data }));
      });
      await frame.evaluate(() => parent.postMessage(JSON.stringify({ event: 'save', xml: '<html/>' }), '*'));
      await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('文件无效'));
      assert.equal(downloadCount, 0, 'An untrusted or invalid message caused a download');
      assert.deepEqual(runtimeErrors, [], 'Malformed protocol data caused an uncaught JavaScript error');
      assert.equal(await page.locator('#editor').evaluate((element) => element.open), true);
      return { fixture: 'local mocked protocol, not official editing', loadedSourceBytes: Buffer.byteLength(original), rejected: ['wrong-origin', 'wrong-source', 'invalid-json', 'null-or-primitive-json', 'oversized-message', 'invalid-xml-root'] };
    } finally { page.off('download', onDownload); }
  });
  await check('local-editor-unsaved-close-cancel-and-confirm', async () => {
    const frame = page.frames().find((entry) => entry.url().startsWith(editorOrigin));
    await frame.evaluate(() => parent.postMessage(JSON.stringify({ event: 'autosave', xml: window.loadedXml }), '*'));
    await page.waitForFunction(() => window.__galleryQaEditorEvents.at(-1) === 'autosave');
    const canceledDialog = page.waitForEvent('dialog');
    const canceledClose = page.locator('#close-editor').click();
    const canceled = await canceledDialog;
    assert.equal(canceled.type(), 'confirm'); assert.match(canceled.message(), /尚未下载/);
    await canceled.dismiss(); await canceledClose;
    assert.equal(await page.locator('#editor').evaluate((element) => element.open), true);
    assert.equal(await page.locator('#editor-frame iframe').count(), 1);
    const acceptedDialog = page.waitForEvent('dialog');
    const acceptedClose = page.locator('#close-editor').click();
    const accepted = await acceptedDialog; await accepted.accept(); await acceptedClose;
    assert.equal(await page.locator('#editor').evaluate((element) => element.open), false);
    assert.equal(await page.locator('#editor-frame iframe').count(), 0);
    await page.locator('#edit').click();
    await page.waitForFunction(() => document.querySelector('#editor-loading').hidden);
    return { fixture: 'local mocked protocol, not official editing', canceledClosePreservedFrame: true, confirmedCloseRemovedFrame: true };
  });
  await check('local-editor-protocol-save-download-status-and-exit', async () => {
    const frame = page.frames().find((entry) => entry.url().startsWith(editorOrigin));
    const original = await frame.evaluate(() => window.loadedXml);
    const modified = original.replace(/(<\/(?:mxfile|mxGraphModel)>)/, '<!-- Local protocol QA round trip -->$1');
    assert.notEqual(modified, original, 'The protocol save fixture must change the original XML');
    const [download] = await Promise.all([page.waitForEvent('download'), frame.evaluate((xml) => parent.postMessage(JSON.stringify({ event: 'save', xml }), '*'), modified)]);
    assert.equal(await download.failure(), null); assert.equal(download.suggestedFilename(), 'MuseDraw-002-edited.drawio');
    const target = path.join(scratch, 'protocol-edited.drawio'); await download.saveAs(target);
    const saved = await fs.readFile(target); assert.equal(saved.toString('utf8'), modified);
    report.downloads.push({ label: 'local-protocol-edited', filename: download.suggestedFilename(), bytes: saved.length, sha256: hash(saved), fixture: true });
    await frame.waitForFunction(() => window.received.some((message) => message.action === 'status' && message.modified === false));
    await frame.evaluate(() => parent.postMessage(JSON.stringify({ event: 'exit' }), '*'));
    await page.waitForFunction(() => !document.querySelector('#editor').open && !document.querySelector('#editor-frame iframe'));
    assert.equal(await page.locator('#edit').evaluate((element) => document.activeElement === element), true);
    return { fixture: 'local mocked protocol, not official editing', bytesMatched: true };
  });
  await check('no-gallery-javascript-runtime-errors', async () => assert.deepEqual(runtimeErrors, []));
  if (flags.includes('--require-official-editor')) assert.equal(report.officialEditor.verified, true, 'The required official diagrams.net verification did not complete');
  report.status = report.officialEditor.verified ? 'passed' : 'passed-with-unverified-official-editor';
  console.log(`Gallery browser QA: ${report.status}; ${report.checks.length} checks, ${report.downloads.length} real browser downloads.`);
} catch (error) {
  report.status = 'failed'; report.error = error.message;
  if (page && !page.isClosed()) await screenshot('failure.png').catch(() => {});
  console.error(`Gallery browser QA failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  // Only remove the exact directory that this run created, after validating its
  // resolved identity and containment. Repository assets and reports are retained.
  const currentReal = await fs.realpath(scratch).catch(() => null);
  const tempReal = await fs.realpath(os.tmpdir());
  const tempRelative = currentReal && path.relative(tempReal, currentReal);
  assert.ok(currentReal === scratchReal && tempRelative && !tempRelative.startsWith('..') && !path.isAbsolute(tempRelative) && path.basename(scratch).startsWith('musedraw-gallery-qa-'), 'Refusing to remove an unverified scratch directory');
  await fs.rm(scratch, { recursive: true, force: true });
}
