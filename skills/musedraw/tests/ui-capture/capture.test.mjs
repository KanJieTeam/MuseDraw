import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { captureUI } from '../../scripts/capture-ui.mjs';

const modulePath = process.env.MUSEDRAW_PLAYWRIGHT;
const { chromium } = await import(modulePath ? pathToFileURL(path.resolve(modulePath)).href : 'playwright');
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'musedraw-capture-'));
try {
  const fixture = path.join(root, 'index.html');
  await fs.writeFile(fixture, '<!doctype html><title>Capture fixture</title><style>body{margin:0}.wide{width:900px;height:20px}#later{margin-top:1000px}</style><h1>Fixture</h1><div class="wide"></div><img src="missing.png" alt="Missing"><button id="later">Later</button><script>throw new Error("fixture error")</script>');
  const options = { target: fixture, out: path.join(root, 'first'), chromium,
    executablePath: process.env.MUSEDRAW_BROWSER, viewports: [{ width: 390, height: 844 }], targets: ['h1', '#later', '#absent', 'body, h1'] };
  const report = await captureUI(options);
  const view = report.views[0];
  assert.equal(view.geometry.horizontalOverflow, true);
  assert.deepEqual(view.geometry.brokenImages, ['missing.png']);
  assert.deepEqual(view.errors, ['fixture error']);
  assert.equal(view.measuredDefects, 3);
  assert.deepEqual(view.targets.map(t => t.fullyInFirstScreen), [true, false, false, false]);
  assert.deepEqual(view.targets.map(t => t.count), [1, 1, 0, 2]);
  for (const capture of view.captures) assert.ok((await fs.stat(path.join(options.out, capture))).size > 100);
  const first = await fs.readFile(path.join(options.out, 'capture.json'), 'utf8');
  await assert.rejects(captureUI(options), /must be empty/);
  assert.equal(await fs.readFile(path.join(options.out, 'capture.json'), 'utf8'), first);
  await assert.rejects(captureUI({ ...options, out: path.join(root, 'bad'), viewports: [{ width: -1, height: 844 }] }), /dimensions/);

  await fs.writeFile(fixture, '<!doctype html><title>Clean</title><h1>Clean page</h1><button>Continue</button>');
  const clean = await captureUI({ ...options, out: path.join(root, 'clean'), targets: ['button'] });
  assert.equal(clean.views[0].measuredDefects, 0);
  assert.equal(clean.views[0].targets[0].fullyInFirstScreen, true);
  const failed = await captureUI({ ...options, target: path.join(root, 'absent.html'), out: path.join(root, 'failure') });
  assert.ok(failed.views[0].failure);
  assert.equal(failed.views[0].captures, undefined);
  console.log('PASS actual browser: overflow, missing image, page error, target visibility/count, PNGs, immutable evidence, invalid dimensions, clean page and navigation failure');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
