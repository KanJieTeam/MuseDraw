import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile, spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
import {protectedPage, previewDocument} from './preview.mjs';

const preview = path.join(path.dirname(fileURLToPath(import.meta.url)), 'preview.mjs');
const flags = process.argv.slice(2);
if (!flags.includes('--playwright')) throw new Error('Pass existing Playwright and optional --browser paths');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'figure-preview-test-'));
const svg = bounds => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 160"><rect width="300" height="160" fill="white"/><text id="label" x="100" y="80" font-size="20">Test</text>${bounds ? `<metadata id="layout-metadata">${JSON.stringify({bounds})}</metadata>` : ''}</svg>`;
for (const fixture of [
  {name:'no-bounds', bounds:null, passed:null, code:0},
  {name:'good-bounds', bounds:[{id:'label',box:[90,50,120,50]}], passed:true, code:0},
  {name:'overflow', bounds:[{id:'label',box:[90,50,20,50]}], passed:false, code:1}
]) {
  const source = path.join(temp, `${fixture.name}.svg`), output = path.join(temp, `${fixture.name}.png`);
  await fs.writeFile(source, svg(fixture.bounds));
  const result = spawnSync(process.execPath, [preview, source, output, ...flags], {encoding:'utf8'});
  assert.equal(result.status, fixture.code, result.stderr || result.stdout);
  const checks = JSON.parse(await fs.readFile(`${output}.checks.json`, 'utf8'));
  assert.equal(checks.passed, fixture.passed);
  assert.equal(checks.containerBoundsChecked, !!fixture.bounds);
  assert.ok(checks.notChecked.includes('semantic-relations'));
  if (!fixture.bounds) assert.ok(checks.warnings.length);
  if (fixture.name === 'overflow') assert.ok(checks.overflow.length);
  console.log(`PASS ${fixture.name}`);
}

// A harmless sentinel would add a DOM marker and remove its script if it executed.
const script = '<script>globalThis.musedrawScriptMarker=1;const marker=document.createElementNS("http://www.w3.org/2000/svg","text");marker.id="script-marker";document.querySelector("svg").append(marker);document.currentScript.remove();</script>';
const insert = body => svg(null).replace('</svg>', `${body}</svg>`);
const negativeFixtures = [
  {name:'inline-script-marker', source:insert(script)},
  {name:'foreign-object', source:insert('<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">HTML</div></foreignObject>')},
  {name:'event-attribute', source:svg(null).replace('<svg ', '<svg onload="globalThis.musedrawScriptMarker=1" ')},
  {name:'external-href', source:insert('<use href="https://example.invalid/asset.svg"/>')},
  {name:'external-css-url', source:insert('<rect style="fill:url(https://example.invalid/a)"/>')},
  {name:'escaped-css-url', source:insert('<style>rect{fill:u\\72l(https://example.invalid/a)}</style>')},
  {name:'escaped-presentation-url', source:insert('<rect fill="u\\72l(https://example.invalid/a)"/>')},
  {name:'integration-point-child', source:insert('<desc><div id="probe">Static probe</div></desc>')},
  {name:'dynamic-svg', source:insert('<set attributeName="href" to="https://example.invalid/a"/>')},
  {name:'css-animation', source:insert('<style>@keyframes move{to{opacity:0}}text{animation:move 1s}</style>')},
  {name:'entity-declaration', source:'<!DOCTYPE svg [<!ENTITY marker "test">]>' + svg(null)},
  {name:'duplicate-id', source:insert('<rect id="label"/>')},
  {name:'missing-fragment', source:insert('<use href="#absent"/>')},
  {name:'invalid-viewbox', source:svg(null).replace('0 0 300 160', '0 0 NaN 160')}
];
const run = promisify(execFile);
for (let first=0; first<negativeFixtures.length; first+=3) {
  await Promise.all(negativeFixtures.slice(first, first+3).map(async fixture => {
    const source = path.join(temp, `${fixture.name}.svg`), output = path.join(temp, `${fixture.name}.png`);
    await fs.writeFile(source, fixture.source);
    const result = await run(process.execPath, [preview, source, output, ...flags], {encoding:'utf8',timeout:30000}).then(
      value => ({...value,status:0}),
      error => ({status:error.code,stdout:error.stdout || '',stderr:error.stderr || error.message})
    );
    assert.ok(Number.isInteger(result.status) && result.status !== 0, `${fixture.name}: ${result.stderr || result.stdout}`);
    await assert.rejects(fs.access(output), {code:'ENOENT'});
    await assert.rejects(fs.access(`${output}.checks.json`), {code:'ENOENT'});
    assert.ok(!result.stdout.includes('"passed"'), 'rejected input must not emit a pretend layout result');
    console.log(`PASS rejected-${fixture.name} (no PNG or checks result)`);
  }));
}

// Test the production browser guards even if the preflight were bypassed by a bug.
const option = name => flags[flags.indexOf(name) + 1];
const {chromium} = await import(pathToFileURL(path.resolve(option('--playwright'))).href);
const browser = await chromium.launch({headless:true,...(flags.includes('--browser') ? {executablePath:option('--browser')} : {})});
try {
  const page = await protectedPage(browser);
  await page.setContent(previewDocument(insert(script).replace('<svg ', '<svg onload="globalThis.musedrawScriptMarker=1" ')));
  const observed = await page.evaluate(() => ({
    marker:globalThis.musedrawScriptMarker,
    markerElement:!!document.querySelector('#script-marker'),
    textCount:document.querySelectorAll('text').length
  }));
  assert.equal(observed.marker, undefined);
  assert.equal(observed.markerElement, false);
  assert.equal(observed.textCount, 1); // Automation evaluation remains usable.
  console.log('PASS protected-page-inline-code-disabled (no DOM marker; automation evaluate works)');
} finally {await browser.close();}
console.log(`Test artifacts retained at ${temp}`);
