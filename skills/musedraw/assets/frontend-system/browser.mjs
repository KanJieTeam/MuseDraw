import { deriveContent, selectItems, selectionSummary } from './model.mjs';

const WORDS = {
  en: { browse:'Browse the collection', programme:'Explore the programme', kept:'Reading list', itinerary:'My itinerary', search:'Search title, subject or ID', category:'Subject', all:'All subjects', results:'shown', empty:'No matches. Try another term or reset the filters.', reset:'Reset filters', keep:'Keep', remove:'Remove', details:'Read details', close:'Close', source:'Source', noSaved:'Nothing kept yet. Choose an item to begin.', local:'Kept on this device. No registration, reservation or submission is made.', unavailable:'Device storage is unavailable. This selection lasts for this page only.', conflicts:'Time overlap', noConflicts:'No overlapping times in this selection.', savedOnly:'Show kept items only', allItems:'Show all items', clear:'Clear this list', date:'Dates', items:'items', record:'Record', session:'Session', selection:'Selection updated', image:'Image', footer:'Experimental composition kit · fictional demonstration content' },
  'zh-CN': { browse:'浏览资料目录', programme:'查看活动节目', kept:'阅读单', itinerary:'我的行程', search:'搜索标题、主题或编号', category:'主题', all:'全部主题', results:'项结果', empty:'没有找到匹配项。请更换关键词或重置筛选。', reset:'重置筛选', keep:'留存', remove:'移除', details:'阅读详情', close:'关闭', source:'来源', noSaved:'还没有留存内容。先选择一个条目。', local:'仅保存在这台设备上，不会报名、预约或提交资料。', unavailable:'设备存储不可用，本次选择仅在当前页面保留。', conflicts:'时间重叠', noConflicts:'当前选择没有时间重叠。', savedOnly:'仅看已留存', allItems:'查看全部条目', clear:'清空列表', date:'活动日期', items:'项', record:'资料', session:'活动', selection:'已更新选择', image:'图像', footer:'实验性编排工具 · 虚构示例内容' }
};
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
// Symbol.for shares allocation across separately installed module copies and
// classic bundles in the same realm. Reserve on mount, even before attachment.
const MOUNT_SEQUENCE = Symbol.for('musedraw.frontend-system.mount-sequence.v1');
function allocatePrefix(ownerDocument) {
  const state = globalThis[MOUNT_SEQUENCE] ||= {value:0};
  let prefix;
  do { prefix = `mfs-${++state.value}`; }
  while (['top','collection','query','category','dialog-title'].some(suffix => ownerDocument.getElementById(`${prefix}-${suffix}`)));
  return prefix;
}
const dateText = (date, locale, options = { month:'short', day:'numeric' }) => new Intl.DateTimeFormat(locale, {...options, timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));

// Mount only inside the supplied root. Existing host controls, routing and business
// logic remain the host's responsibility. This module performs no network requests.
export function mountFrontendSystem(root, content, options = {}) {
  if (!(root instanceof HTMLElement)) throw new TypeError('A dedicated HTMLElement root is required');
  const derived = deriveContent(content), w = WORDS[content.locale], prefix = allocatePrefix(root.ownerDocument);
  const isSignal = content.system === 'signal', listLabel = isSignal ? w.itinerary : w.kept;
  const key = options.storageKey || `mfs-v1:${content.system}:${content.brand.name}:${content.items.map(item => item.id).join(',')}`;
  let storage, storageFailed = false, saved = [], query = '', category = '', savedOnly = false, returnFocus = null, returnIdentity = null, modalMode = '';
  try { storage = options.storage === undefined ? window.localStorage : options.storage; saved = JSON.parse(storage?.getItem(key) || '[]'); if (!Array.isArray(saved)) saved = []; } catch { storageFailed = true; }
  saved = selectionSummary(content, saved).ids;
  const picture = () => content.image ? `<figure class="mfs-picture"><img src="${esc(content.image.src)}" alt="${esc(content.image.alt)}" width="${content.image.width}" height="${content.image.height}" style="object-fit:${content.image.fit};object-position:${content.image.position}"><figcaption>${esc(content.image.credit)}</figcaption></figure>` : '';
  const headline = `<p class="mfs-eyebrow">${esc(content.page.kicker)}</p><h1 class="mfs-title">${esc(content.page.title)}</h1>`;
  const jump = `<a class="mfs-primary" href="#${prefix}-collection">${esc(content.page.actionLabel)} <span aria-hidden="true">↗</span></a>`;
  const dates = derived.dates.length ? `<span>${esc(dateText(derived.dates[0], content.locale))}${derived.dates.length > 1 ? ` — ${esc(dateText(derived.dates.at(-1), content.locale))}` : ''}</span>` : '';
  const hero = isSignal ? `<section class="mfs-hero mfs-signal-hero">${picture()}<div class="mfs-hero-copy">${headline}<p class="mfs-intro">${esc(content.page.intro)}</p>${jump}</div><div class="mfs-date-strip"><span class="mfs-eyebrow">${esc(w.date)}</span>${dates}<span>${derived.count} ${esc(w.items)} / ${derived.dates.length} ${content.locale === 'en' ? 'days' : '天'}</span></div></section>` : `<section class="mfs-hero mfs-specimen-hero"><div>${headline}<p class="mfs-catalogue-range">${String(derived.count).padStart(2, '0')} <span>${esc(w.items)} / ${derived.yearRange.join('–')}</span></p></div><div class="mfs-hero-side"><p class="mfs-intro">${esc(content.page.intro)}</p>${jump}${picture()}</div></section><div class="mfs-taxonomy" aria-label="${esc(w.category)}">${derived.groups.map((group, i) => `<span><b>${String(i + 1).padStart(2, '0')}</b>${esc(group.category)}<small>${group.count}</small></span>`).join('')}</div>`;
  root.classList.add('mfs'); root.dataset.system = content.system; root.dataset.title = derived.titleMode; root.dataset.density = derived.density; root.dataset.frame = derived.imageFrame;
  root.lang = content.locale;
  root.innerHTML = `<a class="mfs-skip" href="#${prefix}-collection">${esc(isSignal ? w.programme : w.browse)}</a><header class="mfs-header"><a class="mfs-brand" href="#${prefix}-top"><span class="mfs-brand-mark" aria-hidden="true">${isSignal ? '↗' : '⊞'}</span><span>${esc(content.brand.name)}<small>${esc(content.brand.kicker)}</small></span></a><nav aria-label="${content.locale === 'en' ? 'Page' : '页面'}"><a href="#${prefix}-collection">${esc(isSignal ? w.programme : w.browse)}</a><button class="mfs-kept" type="button" data-action="selection">${esc(listLabel)} <span data-count>${saved.length}</span></button></nav></header><main id="${prefix}-top">${hero}<section class="mfs-collection" id="${prefix}-collection" tabindex="-1"><div class="mfs-section-heading"><p class="mfs-eyebrow">${isSignal ? 'PROGRAMME / ' : 'COLLECTION / '}${String(derived.count).padStart(2,'0')}</p><h2>${esc(content.page.sectionTitle)}</h2></div><div class="mfs-workspace"><form class="mfs-filters" role="search"><label for="${prefix}-query">${esc(w.search)}</label><input id="${prefix}-query" name="query" type="search" autocomplete="off" placeholder="${esc(content.locale === 'en' ? 'Type to explore…' : '输入关键词…')}">${derived.categories.length > 1 ? `<label for="${prefix}-category">${esc(w.category)}</label><select id="${prefix}-category" name="category"><option value="">${esc(w.all)}</option>${derived.categories.map(c => `<option>${esc(c)}</option>`).join('')}</select>` : ''}<button class="mfs-text-button" type="button" data-action="savedOnly" aria-pressed="false">${esc(w.savedOnly)}</button><button class="mfs-reset" type="reset">${esc(w.reset)} ↺</button><p class="mfs-local-note">${esc(w.local)}</p></form><div class="mfs-results"><p class="mfs-result-count" role="status" aria-live="polite" data-results-count></p><div data-results></div></div></div></section></main><footer class="mfs-footer"><p>${esc(content.page.footer)}</p><span>${esc(content.brand.name)}</span></footer><p class="mfs-notice" role="status" aria-live="polite" data-notice></p><dialog class="mfs-dialog" aria-labelledby="${prefix}-dialog-title"><button class="mfs-dialog-close" type="button" data-action="close">${esc(w.close)} <span aria-hidden="true">×</span></button><div data-dialog-body></div></dialog>`;
  const results = root.querySelector('[data-results]'), resultCount = root.querySelector('[data-results-count]'), dialog = root.querySelector('dialog'), notice = root.querySelector('[data-notice]');
  const itemById = id => content.items.find(item => item.id === id);
  const saveButton = item => `<button class="mfs-save" type="button" data-action="save" data-id="${item.id}" aria-pressed="${saved.includes(item.id)}" aria-label="${esc(`${saved.includes(item.id) ? w.remove : w.keep}: ${item.title}`)}"><span aria-hidden="true">${saved.includes(item.id) ? '−' : '+'}</span><span>${esc(saved.includes(item.id) ? w.remove : w.keep)}</span></button>`;
  const detailButton = item => `<button class="mfs-item-title" type="button" data-action="detail" data-id="${item.id}">${esc(item.title)}<span aria-hidden="true">↗</span></button>`;
  function renderResults() {
    const items = selectItems(content, {query, category, savedOnly, saved});
    resultCount.textContent = content.locale === 'en' ? `${items.length} of ${derived.count} ${w.results}` : `${items.length} / ${derived.count} ${w.results}`;
    if (!items.length) { results.innerHTML = `<div class="mfs-empty"><p>${esc(w.empty)}</p><button type="button" data-action="reset">${esc(w.reset)}</button></div>`; return; }
    if (!isSignal) results.innerHTML = `<ol class="mfs-records">${items.map(item => `<li class="mfs-record" data-item="${item.id}"><div class="mfs-record-index"><span>${esc(item.id)}</span><strong>${item.year}</strong><small>${esc(item.category)}</small></div><div class="mfs-record-copy">${detailButton(item)}<p>${esc(item.summary)}</p><div class="mfs-meta"><span>${esc(item.creator)}</span><span>${esc(item.format)}</span></div></div>${saveButton(item)}</li>`).join('')}</ol>`;
    else results.innerHTML = derived.dates.map((date, dayIndex) => {
      const sessions = items.filter(item => item.date === date).sort((a,b) => a.start.localeCompare(b.start));
      if (!sessions.length) return '';
      return `<section class="mfs-day"><header class="mfs-day-heading"><span class="mfs-day-number">${String(dayIndex + 1).padStart(2, '0')}</span><div><h3>${esc(dateText(date, content.locale, {month:'long',day:'numeric'}))}</h3><p>${esc(dateText(date, content.locale, {weekday:'long'}))}</p></div></header><ol class="mfs-sessions">${sessions.map(item => `<li class="mfs-session" data-item="${item.id}"><div class="mfs-time"><strong>${item.start}</strong><span>— ${item.end}</span></div><div class="mfs-session-copy"><span class="mfs-category">${esc(item.category)}</span>${detailButton(item)}<p>${esc(item.summary)}</p></div><div class="mfs-session-place"><span>${esc(item.place)}</span><small>${esc(item.cost)}</small></div>${saveButton(item)}</li>`).join('')}</ol></section>`;
    }).join('');
  }
  function summaryMarkup() {
    const summary = selectionSummary(content, saved);
    return isSignal ? `<p class="mfs-conflicts${summary.conflicts.length ? ' has-conflicts' : ''}">${summary.conflicts.length ? `${esc(w.conflicts)}: ${summary.conflicts.map(pair => pair.map(id => esc(itemById(id).title)).join(' / ')).join('; ')}` : esc(w.noConflicts)}</p>` : '';
  }
  function selectionMarkup() {
    const items = content.items.filter(item => saved.includes(item.id));
    return `<p class="mfs-eyebrow">${esc(content.brand.kicker)}</p><h2 id="${prefix}-dialog-title">${esc(listLabel)} <span>${items.length}</span></h2><p class="mfs-local-note">${esc(storageFailed ? w.unavailable : w.local)}</p>${summaryMarkup()}${items.length ? `<ol class="mfs-selection-list">${items.map(item => `<li><div><button class="mfs-item-title" type="button" data-action="detail" data-id="${item.id}">${esc(item.title)} ↗</button><p>${isSignal ? `${item.date} · ${item.start}–${item.end} · ${esc(item.place)}` : `${item.year} · ${esc(item.creator)}`}</p></div>${saveButton(item)}</li>`).join('')}</ol><button class="mfs-text-button" data-action="clear" type="button">${esc(w.clear)}</button>` : `<p class="mfs-empty">${esc(w.noSaved)}</p>`}`;
  }
  function showDialog(mode, id, trigger) {
    if (!dialog.open) {returnFocus = trigger; returnIdentity = trigger?.dataset.id ? {action:trigger.dataset.action, id:trigger.dataset.id} : null;}
    modalMode = mode;
    const item = itemById(id);
    root.querySelector('[data-dialog-body]').innerHTML = mode === 'selection' ? selectionMarkup() : `<p class="mfs-eyebrow">${esc(isSignal ? w.session : w.record)} / ${esc(item.id)}</p><h2 id="${prefix}-dialog-title">${esc(item.title)}</h2><p class="mfs-detail-summary">${esc(item.summary)}</p><dl class="mfs-detail-meta">${(isSignal ? [[w.date,`${item.date} · ${item.start}–${item.end}`],[content.locale === 'en'?'Place':'地点',item.place],[content.locale === 'en'?'Cost':'费用',item.cost]] : [[content.locale === 'en'?'Year':'年份',item.year],[content.locale === 'en'?'Creator':'创作者',item.creator],[content.locale === 'en'?'Format':'形式',item.format]]).map(([label,value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><div class="mfs-detail-body">${(item.detail || []).map(p => `<p>${esc(p)}</p>`).join('')}</div><p class="mfs-source"><b>${esc(w.source)}</b><br>${esc(item.source)}</p><div class="mfs-dialog-actions">${saveButton(item)}<button class="mfs-text-button" type="button" data-action="selection">${esc(listLabel)} →</button></div>`;
    if (!dialog.open) dialog.showModal();
    root.querySelector('.mfs-dialog-close').focus();
  }
  function updateSelection() {
    const summary = selectionSummary(content, saved); saved = summary.ids;
    try { storage?.setItem(key, JSON.stringify(saved)); if (!storage) storageFailed = true; } catch { storageFailed = true; }
    root.querySelector('[data-count]').textContent = String(saved.length);
    renderResults();
    // Update controls in an open detail without replacing the dialog/focus owner.
    for (const button of dialog.querySelectorAll('[data-action="save"]')) button.outerHTML = saveButton(itemById(button.dataset.id));
    if (dialog.open && modalMode === 'selection') root.querySelector('[data-dialog-body]').innerHTML = selectionMarkup();
    notice.textContent = `${w.selection}. ${storageFailed ? w.unavailable : w.local}`;
    const detail = {...summary, system:content.system};
    root.dispatchEvent(new CustomEvent('mfs:selection-change', {bubbles:true, detail}));
    options.onSelectionChange?.(detail);
  }
  const form = root.querySelector('form');
  function reset() { query = ''; category = ''; savedOnly = false; form.reset(); root.querySelector('[data-action="savedOnly"]').setAttribute('aria-pressed','false'); renderResults(); }
  function onInput(event) { if (event.target.name === 'query') {query = event.target.value; renderResults();} }
  function onChange(event) { if (event.target.name === 'category') {category = event.target.value; renderResults();} }
  function onReset() { query = ''; category = ''; savedOnly = false; root.querySelector('[data-action="savedOnly"]').setAttribute('aria-pressed','false'); renderResults(); }
  function onSubmit(event) { event.preventDefault(); }
  function onClick(event) {
    const button = event.target.closest('[data-action]'); if (!button || !root.contains(button)) return;
    const {action, id} = button.dataset;
    if (action === 'detail') showDialog('detail', id, button);
    else if (action === 'selection') showDialog('selection', null, button);
    else if (action === 'close') dialog.close();
    else if (action === 'save') { const wasInDialog = dialog.contains(button); saved = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id]; updateSelection(); const replacement = (wasInDialog ? dialog : results).querySelector(`[data-action="save"][data-id="${id}"]`); (replacement || (wasInDialog ? root.querySelector('.mfs-dialog-close') : form.querySelector('input'))).focus(); }
    else if (action === 'savedOnly') { savedOnly = !savedOnly; button.setAttribute('aria-pressed',String(savedOnly)); renderResults(); }
    else if (action === 'clear') { saved = []; updateSelection(); root.querySelector('.mfs-dialog-close').focus(); }
    else if (action === 'reset') { reset(); form.querySelector('input').focus(); }
  }
  function onClose() { const replacement = returnIdentity ? results.querySelector(`[data-action="${returnIdentity.action}"][data-id="${returnIdentity.id}"]`) : null; if (returnFocus?.isConnected) returnFocus.focus(); else (replacement || root.querySelector('[data-action="selection"]')).focus(); }
  root.addEventListener('click', onClick); form.addEventListener('input',onInput); form.addEventListener('change',onChange); form.addEventListener('reset',onReset); form.addEventListener('submit',onSubmit); dialog.addEventListener('close',onClose);
  renderResults();
  if (storageFailed) notice.textContent = w.unavailable;
  return {
    derived,
    getSelection: () => selectionSummary(content,saved),
    setSelection(ids) { if (!Array.isArray(ids)) throw new TypeError('Selection must be an array of item IDs'); saved = ids; updateSelection(); },
    destroy() { if (dialog.open) dialog.close(); root.removeEventListener('click',onClick); form.removeEventListener('input',onInput); form.removeEventListener('change',onChange); form.removeEventListener('reset',onReset); form.removeEventListener('submit',onSubmit); dialog.removeEventListener('close',onClose); root.replaceChildren(); root.classList.remove('mfs'); for (const key of ['system','title','density','frame']) delete root.dataset[key]; }
  };
}
