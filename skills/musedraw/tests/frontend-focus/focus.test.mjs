import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const argument = name => {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  if (!process.argv[index + 1] || process.argv[index + 1].startsWith('--')) {
    throw new Error(`${name} requires a path`);
  }
  return process.argv[index + 1];
};
if (process.argv.includes('--help')) {
  console.log('node <skill>/tests/frontend-focus/focus.test.mjs [--playwright MODULE_FILE] [--browser EXECUTABLE]');
  process.exit(0);
}
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  if (!['--playwright', '--browser', '--chromium'].includes(flag)) throw new Error(`Unknown option: ${flag}`);
  argument(flag);
}
const modulePath = argument('--playwright') || process.env.MUSEDRAW_PLAYWRIGHT || process.env.PLAYWRIGHT_MODULE;
const executablePath = argument('--browser') || argument('--chromium') || process.env.MUSEDRAW_BROWSER || process.env.CHROMIUM_PATH;
const { chromium } = await import(modulePath ? pathToFileURL(path.resolve(modulePath)).href : 'playwright');
const script = new URL('../../scripts/ui/focus-preservation.js', import.meta.url);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
let passed = 0;

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Use a real local-file origin without creating an extra fixture on disk.
  await page.goto(script.href);
  await page.setContent(`<!doctype html><html lang="en"><body>
    <label>Outside <input id="outside"></label><section id="region"></section>
    <script src="${script.href}"></script></body></html>`);
  assert.equal(await page.evaluate(() => location.protocol), 'file:');
  assert.equal(await page.evaluate(() => typeof FocusPreservation.update), 'function');
  passed++;

  const reset = async () => page.evaluate(() => {
    document.querySelector('#outside').blur();
    document.querySelector('#region').innerHTML = '<button data-focus-key="review">Review</button><button data-focus-key="next">Next record</button><h2 tabindex="-1" id="detail-heading">Record details</h2>';
  });
  const test = async (name, exercise) => {
    await reset();
    await exercise();
    passed++;
    console.log(`PASS ${name}`);
  };

  await test('replacement restores the same identity to a new node', async () => {
    const result = await page.evaluate(() => {
      const region = document.querySelector('#region');
      const previous = region.querySelector('[data-focus-key="review"]');
      previous.focus();
      const restored = FocusPreservation.update(region, () => { region.innerHTML = '<button data-focus-key="review">Review updated</button><button data-focus-key="next">Next record</button>'; });
      return { restored, replaced: document.activeElement !== previous, key: document.activeElement.dataset.focusKey };
    });
    assert.deepEqual(result, { restored: true, replaced: true, key: 'review' });
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.focusKey), 'next');
  });

  await test('removed target uses the supplied successor', async () => {
    const result = await page.evaluate(() => {
      const region = document.querySelector('#region');
      region.querySelector('[data-focus-key="review"]').focus();
      return FocusPreservation.update(region, () => { region.innerHTML = '<button data-focus-key="next">Next record</button>'; }, { fallback: () => region.querySelector('[data-focus-key="next"]') });
    });
    assert.equal(result, true);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.focusKey), 'next');
  });

  await test('disabled target falls back to a programmatically focusable heading', async () => {
    const result = await page.evaluate(() => {
      const region = document.querySelector('#region');
      region.querySelector('[data-focus-key="review"]').focus();
      return FocusPreservation.update(region, () => { region.innerHTML = '<button data-focus-key="review" disabled>Confirmed</button><h2 tabindex="-1" id="detail-heading">Record details</h2>'; }, { fallback: () => region.querySelector('#detail-heading') });
    });
    assert.equal(result, true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'detail-heading');
  });

  await test('focus originally outside is never moved into the region', async () => {
    const result = await page.evaluate(() => {
      const region = document.querySelector('#region');
      document.querySelector('#outside').focus();
      return FocusPreservation.update(region, () => { region.innerHTML = '<button data-focus-key="review">Updated</button>'; }, { fallback: () => region.querySelector('button') });
    });
    assert.equal(result, false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'outside');
  });

  await test('a deliberate new focus destination during render is respected', async () => {
    const result = await page.evaluate(() => {
      const region = document.querySelector('#region');
      region.querySelector('[data-focus-key="review"]').focus();
      return FocusPreservation.update(region, () => {
        region.innerHTML = '<button data-focus-key="review">Updated</button>';
        document.querySelector('#outside').focus();
      });
    });
    assert.equal(result, false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'outside');
  });

  await test('stable id works without data-focus-key', async () => {
    const result = await page.evaluate(() => {
      const region = document.querySelector('#region');
      region.innerHTML = '<button id="review-action">Review</button>';
      region.firstElementChild.focus();
      return FocusPreservation.update(region, () => { region.innerHTML = '<button id="review-action">Updated</button>'; });
    });
    assert.equal(result, true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'review-action');
  });

  await test('duplicate identities use an explicit fallback rather than the wrong record', async () => {
    const result = await page.evaluate(() => {
      const region = document.querySelector('#region');
      region.querySelector('[data-focus-key="review"]').focus();
      return FocusPreservation.update(region, () => { region.innerHTML = '<button data-focus-key="review">First</button><button data-focus-key="review">Second</button><h2 tabindex="-1" id="detail-heading">Details</h2>'; }, { fallback: () => region.querySelector('#detail-heading') });
    });
    assert.equal(result, true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'detail-heading');
  });

  await test('hidden fallback is rejected', async () => {
    const result = await page.evaluate(() => {
      const region = document.querySelector('#region');
      region.querySelector('[data-focus-key="review"]').focus();
      return FocusPreservation.update(region, () => { region.innerHTML = '<button hidden id="hidden-action">Hidden</button>'; }, { fallback: () => region.querySelector('#hidden-action') });
    });
    assert.equal(result, false);
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'BODY');
  });

  assert.deepEqual(errors, []);
  console.log(`PASS ${passed} browser checks; no page errors. Classic script: ${path.basename(fileURLToPath(script))}`);
} finally {
  await browser.close();
}
