import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { captureUI } from '../../scripts/capture-ui.mjs';

const modulePath = process.env.MUSEDRAW_PLAYWRIGHT;
const { chromium } = await import(modulePath ? pathToFileURL(path.resolve(modulePath)).href : 'playwright');
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'musedraw-capture-'));
const cli = fileURLToPath(new URL('../../scripts/capture-ui.mjs', import.meta.url));
async function runCLI(target, out, targetsFile) {
  const args = [cli, target, '--out', out, '--targets', targetsFile];
  if (modulePath) args.push('--playwright', path.resolve(modulePath));
  if (process.env.MUSEDRAW_BROWSER) args.push('--browser', process.env.MUSEDRAW_BROWSER);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args);
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}
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
  assert.deepEqual(view.contractDefects, []);
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

  // A leftover desktop grid can squeeze the subject without page overflow.
  const layout = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Subject contract</title><style>body{margin:0}.main-grid{display:grid;grid-template-columns:minmax(0,1fr) 330px;margin:20px}.schedule{height:140px;overflow:hidden}.tiny{height:4px}#hidden{display:none}#all-widths{height:130px}@media(min-width:500px){#phone-only{display:none}}</style><main class="main-grid"><section class="schedule"><h1>Schedule</h1></section><aside>Booking</aside></main><div class="tiny"></div><div id="phone-only">Phone agenda</div><div id="all-widths"></div><div id="hidden">Hidden</div><i class="duplicate"></i><i class="duplicate"></i>';
  await fs.writeFile(fixture, layout);
  const scoped = [{ selector: '.schedule', minWidth: 320, minHeight: 140, atWidths: [390] },
    { selector: '#phone-only', atWidths: [390] }, { selector: '#all-widths', minHeight: 120 }];
  const contractOptions = { ...options, viewports: [{ width: 390, height: 844 }, { width: 768, height: 1024 }] };
  const narrow = await captureUI({ ...contractOptions, out: path.join(root, 'narrow'), targets: [...scoped,
    { selector: '.tiny', minHeight: 10 }, { selector: '#absent', atWidths: [390] },
    { selector: '.duplicate', atWidths: [390] }, { selector: '#hidden', atWidths: [390] }] });
  assert.equal(narrow.views[0].geometry.horizontalOverflow, false);
  assert.equal(narrow.views[0].targets[0].box.width, 20);
  assert.deepEqual(narrow.views[0].contractDefects.map(d => d.kind), ['minWidth', 'minHeight', 'missing', 'multiple', 'hidden']);
  assert.equal(narrow.views[0].measuredDefects, 5);
  assert.deepEqual(narrow.views[1].contractDefects.map(d => d.kind), ['minHeight']); // Omitted scope applies at every width.
  assert.equal(narrow.views[1].measuredDefects, 1);
  assert.equal(narrow.views[1].targets[1].box, null); // Out-of-scope hidden target remains evidence only.
  const evidenceOnly = await captureUI({ ...options, out: path.join(root, 'evidence-only'), targets: ['.schedule', '#hidden', '#absent', '.duplicate'] });
  assert.equal(evidenceOnly.views[0].measuredDefects, 0);

  const targetsFile = path.join(root, 'targets.json');
  await fs.writeFile(targetsFile, JSON.stringify(scoped));
  const narrowCLI = await runCLI(fixture, path.join(root, 'narrow-cli'), targetsFile);
  assert.equal(narrowCLI.code, 1, narrowCLI.stderr);
  assert.equal(JSON.parse(narrowCLI.stdout).views.find(v => v.viewport.width === 390).contractDefects[0].kind, 'minWidth');
  await fs.writeFile(fixture, layout.replace('</style>', '@media(max-width:500px){.main-grid{grid-template-columns:minmax(0,1fr)}}</style>'));
  const repaired = await captureUI({ ...contractOptions, out: path.join(root, 'repaired'), targets: scoped });
  assert.ok(repaired.views.every(v => v.measuredDefects === 0));
  assert.equal(repaired.views[0].targets[0].box.width, 350);
  const repairedCLI = await runCLI(fixture, path.join(root, 'repaired-cli'), targetsFile);
  assert.equal(repairedCLI.code, 0, repairedCLI.stderr);

  // Reject mistaken contracts at both entry points before creating evidence.
  const invalidTargets = [null, [{ selector: '.schedule', minWidht: 320 }], [{ selector: '.schedule', minWidth: -1 }],
    [{ selector: '.schedule', minHeight: '120' }], [{ selector: '' }], [null],
    [{ selector: '.schedule', atWidths: [1440] }], [{ selector: '.schedule', atWidths: [] }],
    [{ selector: '.schedule', atWidths: [390, 390] }]];
  for (const [index, targets] of invalidTargets.entries()) {
    const out = path.join(root, `invalid-api-${index}`);
    await assert.rejects(captureUI({ ...contractOptions, out, targets }), /Targets|target|Target/);
    await assert.rejects(fs.stat(out), { code: 'ENOENT' });
  }
  for (const [index, targets] of [[{ selector: '.schedule', minWidht: 320 }], [{ selector: '.schedule', atWidths: [500] }]].entries()) {
    await fs.writeFile(targetsFile, JSON.stringify(targets));
    const out = path.join(root, `invalid-cli-${index}`);
    const result = await runCLI(fixture, out, targetsFile);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /target|Target/);
    await assert.rejects(fs.stat(out), { code: 'ENOENT' });
  }
  console.log('PASS actual browser: existing evidence, immutable captures, narrow subject without overflow, explicit target contracts, scoped viewports, repaired layout, CLI exit codes and invalid configuration before output');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
