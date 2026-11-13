// Original experimental MuseDraw frontend systems. No DOM or external runtime.
export const SYSTEMS = Object.freeze({
  specimen: { task: 'Public catalogue: find, inspect and keep a local reading list', collection: 'records', maxItems: 24 },
  signal: { task: 'Public programme: compare timed sessions and keep a local itinerary', collection: 'sessions', maxItems: 24 }
});

function fail(where, message) { throw new Error(`${where}: ${message}`); }
function object(value, where, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(where, 'expected an object');
  for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`${where}.${key}`, 'unsupported field; keep product logic outside this bounded presentation kit');
}
function string(value, where, max, optional = false) {
  if (optional && value === undefined) return;
  if (typeof value !== 'string' || !value.trim() || [...value].length > max) fail(where, `expected nonempty text of at most ${max} characters`);
}
function textUnits(value) { return [...value].reduce((n, ch) => n + (/[^\u0000-\u02ff]/u.test(ch) ? 1.8 : 1), 0); }
export function minutes(value) { const [h, m] = value.split(':').map(Number); return h * 60 + m; }
export function overlaps(a, b) { return a.date === b.date && minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end); }
export function validateContent(content) {
  object(content, 'content', ['version', 'system', 'locale', 'brand', 'page', 'image', 'items']);
  if (content.version !== 1) fail('content.version', 'only version 1 is supported');
  if (!Object.hasOwn(SYSTEMS, content.system)) fail('content.system', 'choose specimen or signal; dashboards, checkout and arbitrary page sections are outside scope');
  if (!['en', 'zh-CN'].includes(content.locale)) fail('content.locale', 'choose en or zh-CN');
  object(content.brand, 'brand', ['name', 'kicker']);
  string(content.brand.name, 'brand.name', 60); string(content.brand.kicker, 'brand.kicker', 100);
  object(content.page, 'page', ['kicker', 'title', 'intro', 'actionLabel', 'sectionTitle', 'footer']);
  string(content.page.kicker, 'page.kicker', 120); string(content.page.title, 'page.title', 180);
  string(content.page.intro, 'page.intro', 900); string(content.page.actionLabel, 'page.actionLabel', 60);
  string(content.page.sectionTitle, 'page.sectionTitle', 120); string(content.page.footer, 'page.footer', 500);
  if (content.image !== undefined) {
    object(content.image, 'image', ['src', 'alt', 'width', 'height', 'credit', 'fit', 'position']);
    string(content.image.src, 'image.src', 240); string(content.image.alt, 'image.alt', 400); string(content.image.credit, 'image.credit', 400);
    if (/^(?:[a-z]+:|\/|\\)|(?:^|[\/\\])\.\.(?:[\/\\]|$)/i.test(content.image.src) || !/\.(?:svg|png|jpe?g|webp)$/i.test(content.image.src)) fail('image.src', 'use a local relative SVG, PNG, JPEG or WebP inside the input directory; remote URLs and parent traversal are unsupported');
    for (const key of ['width', 'height']) if (!Number.isInteger(content.image[key]) || content.image[key] < 80 || content.image[key] > 12000) fail(`image.${key}`, 'expected an integer from 80 to 12000');
    if (!['cover', 'contain'].includes(content.image.fit)) fail('image.fit', 'declare cover or contain');
    if (!['center', 'top', 'bottom', 'left', 'right'].includes(content.image.position)) fail('image.position', 'choose center, top, bottom, left or right');
  } else if (content.system === 'signal') fail('image', 'signal needs a subject image; use specimen for a text-only catalogue or choose another production route');
  if (!Array.isArray(content.items) || content.items.length < 1 || content.items.length > 24) fail('items', 'supply 1–24 items; do not truncate a larger collection to fit');
  const ids = new Set(), categories = new Set(), dates = new Set();
  content.items.forEach((item, i) => {
    const where = `items[${i}]`, specific = content.system === 'specimen' ? ['year', 'creator', 'format'] : ['date', 'start', 'end', 'place', 'cost'];
    object(item, where, ['id', 'title', 'summary', 'category', 'source', 'detail', ...specific]);
    string(item.id, `${where}.id`, 48);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(item.id) || ids.has(item.id)) fail(`${where}.id`, 'use a unique ASCII letter/digit/underscore/hyphen identity');
    ids.add(item.id);
    string(item.title, `${where}.title`, 180); string(item.summary, `${where}.summary`, 700);
    string(item.category, `${where}.category`, 60); string(item.source, `${where}.source`, 400); categories.add(item.category);
    if (item.detail !== undefined) {
      if (!Array.isArray(item.detail) || item.detail.length > 5) fail(`${where}.detail`, 'supply at most 5 text paragraphs');
      item.detail.forEach((p, j) => string(p, `${where}.detail[${j}]`, 1200));
    }
    if (content.system === 'specimen') {
      if (!Number.isInteger(item.year) || item.year < 1000 || item.year > 2200) fail(`${where}.year`, 'supply an explicit year from 1000 to 2200');
      string(item.creator, `${where}.creator`, 160); string(item.format, `${where}.format`, 160);
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || Number.isNaN(Date.parse(item.date)) || new Date(`${item.date}T00:00:00Z`).toISOString().slice(0, 10) !== item.date) fail(`${where}.date`, 'supply a real YYYY-MM-DD civil date');
      for (const key of ['start', 'end']) if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item[key])) fail(`${where}.${key}`, 'supply 24-hour HH:MM');
      if (minutes(item.end) <= minutes(item.start)) fail(where, 'end must follow start on the same civil day; overnight or timezone conversion needs another route');
      string(item.place, `${where}.place`, 180); string(item.cost, `${where}.cost`, 100); dates.add(item.date);
    }
  });
  if (categories.size > 6) fail('items.category', 'at most 6 supplied categories; larger taxonomies need the host app');
  if (dates.size > 7) fail('items.date', 'signal supports at most 7 civil days');
  return content;
}

export function deriveContent(content) {
  validateContent(content);
  const items = content.items, titleUnits = textUnits(content.page.title);
  const categories = [...new Set(items.map(item => item.category))];
  const dates = [...new Set(items.map(item => item.date).filter(Boolean))].sort();
  return {
    system: content.system, count: items.length, categories, dates,
    titleMode: titleUnits > 92 ? 'extended' : titleUnits > 48 ? 'long' : 'display',
    density: items.length > 12 ? 'dense' : 'open',
    filterMode: categories.length > 1 ? 'categories' : 'search',
    imageFrame: !content.image ? 'none' : content.image.width / content.image.height < 0.85 ? 'portrait' : content.image.width / content.image.height > 1.7 ? 'panorama' : 'landscape',
    yearRange: content.system === 'specimen' ? [Math.min(...items.map(item => item.year)), Math.max(...items.map(item => item.year))] : null,
    groups: content.system === 'signal' ? dates.map(date => ({ date, count: items.filter(item => item.date === date).length })) : categories.map(category => ({ category, count: items.filter(item => item.category === category).length }))
  };
}

export function selectItems(content, {query = '', category = '', savedOnly = false, saved = []} = {}) {
  const q = query.trim().normalize('NFKC').toLocaleLowerCase(content.locale);
  const selected = new Set(saved);
  return content.items.filter(item => (!category || item.category === category) && (!savedOnly || selected.has(item.id)) && (!q || [item.id, item.title, item.summary, item.category, item.creator, item.place, item.year, item.source].filter(x => x !== undefined).join(' ').normalize('NFKC').toLocaleLowerCase(content.locale).includes(q)));
}

export function selectionSummary(content, saved) {
  const known = new Set(content.items.map(item => item.id));
  const ids = [...new Set(saved)].filter(id => known.has(id));
  const chosen = content.items.filter(item => ids.includes(item.id));
  const conflicts = [];
  if (content.system === 'signal') for (let a = 0; a < chosen.length; a++) for (let b = a + 1; b < chosen.length; b++) if (overlaps(chosen[a], chosen[b])) conflicts.push([chosen[a].id, chosen[b].id]);
  return { ids, count: ids.length, conflicts };
}
