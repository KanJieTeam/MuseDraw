const $ = (id) => document.getElementById(id);
const viewNames = { capability: '能力架构', component: '组件与集成', deployment: '部署与网络' };
const favoriteKey = 'musedraw.gallery.favorites.v1';
const editorOrigin = 'https://embed.diagrams.net';
let items = [], view = 'all', onlyFavorites = false, current, opener, editorSession;
let scale = 1, offset = { x: 0, y: 0 }, drag, toastTimer;
let favorites = new Set();
try { const stored = JSON.parse(localStorage.getItem(favoriteKey) || '[]'); if (Array.isArray(stored)) favorites = new Set(stored.filter((x) => Number.isInteger(x) && x >= 1 && x <= 100)); } catch { /* Browsing works without storage. */ }

function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2500);
}
async function copy(text, success) {
  try { await navigator.clipboard.writeText(text); notify(success); }
  catch { notify('复制不可用，请选中内容手动复制。'); }
}
function filtered() {
  const term = $('search').value.trim().toLocaleLowerCase();
  return items.filter((item) => (view === 'all' || item.view === view) && (!onlyFavorites || favorites.has(item.id)) && (!term || `${item.number} ${item.title} ${item.family} ${item.theme}`.toLocaleLowerCase().includes(term)));
}
function render() {
  const visible = filtered();
  $('grid').replaceChildren();
  for (const item of visible) {
    const card = document.createElement('article');
    card.className = 'case-card';
    const open = document.createElement('button');
    open.className = 'case-open';
    open.setAttribute('aria-label', `查看 ${item.number} ${item.title}`);
    const art = document.createElement('div'); art.className = 'case-art';
    const img = document.createElement('img');
    img.src = item.thumbnail; img.alt = item.title; img.loading = 'lazy'; img.decoding = 'async'; img.width = 960; img.height = Math.round(960 * item.height / item.width);
    img.addEventListener('error', () => { img.alt = `${item.title}（预览暂时不可用，可打开详情下载）`; });
    art.append(img);
    const caption = document.createElement('div'); caption.className = 'case-caption';
    const number = document.createElement('span'); number.className = 'case-number'; number.textContent = item.number;
    const title = document.createElement('h2'); title.textContent = item.title;
    caption.append(number, title);
    const category = document.createElement('p'); category.className = 'case-category'; category.textContent = viewNames[item.view];
    open.append(art, caption, category);
    open.addEventListener('click', () => openDetail(item, open));
    const star = document.createElement('button'); star.className = 'favorite';
    star.textContent = favorites.has(item.id) ? '★' : '☆';
    star.setAttribute('aria-pressed', String(favorites.has(item.id))); star.setAttribute('aria-label', `${favorites.has(item.id) ? '取消收藏' : '收藏'} ${item.title}`);
    star.addEventListener('click', () => {
      if (favorites.has(item.id)) favorites.delete(item.id); else favorites.add(item.id);
      try { localStorage.setItem(favoriteKey, JSON.stringify([...favorites])); } catch { notify('浏览器不允许保存收藏，关闭后将不会保留。'); }
      const nextFocusId = item.id;
      render();
      $('grid').querySelector(`[data-case="${nextFocusId}"] .favorite`)?.focus({ preventScroll: true });
    });
    card.dataset.case = String(item.id); card.append(open, star); $('grid').append(card);
  }
  $('result-count').textContent = `${visible.length} / ${items.length} 张`;
  $('favorite-count').textContent = String(favorites.size);
  $('empty').hidden = visible.length !== 0;
}
function fit() { scale = 1; offset = { x: 0, y: 0 }; applyTransform(); }
function applyTransform() { $('detail-image').style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`; $('zoom-value').value = `${Math.round(scale * 100)}%`; }
function zoom(factor) { scale = Math.max(.5, Math.min(8, scale * factor)); applyTransform(); }
function openDetail(item, focusElement, writeHash = true) {
  current = item; if (focusElement) opener = focusElement;
  $('detail-number').textContent = `COLLECTION 01 / ${item.number}`;
  $('detail-title').textContent = item.title;
  $('detail-family').textContent = item.family;
  $('detail-theme').textContent = item.theme;
  $('detail-image').src = item.svg; $('detail-image').alt = item.title;
  for (const format of ['drawio', 'svg', 'png']) { const a = $(`download-${format}`); a.href = item[format]; a.download = `MuseDraw-${item.number}.${format}`; }
  $('prompt').textContent = item.prompt;
  const reference = $('download-reference');
  reference.hidden = !item.reference;
  if (item.reference) { reference.href = item.reference; reference.download = `MuseDraw-${item.number}-reference.json`; }
  else reference.removeAttribute('href');
  const list = filtered(); const index = list.findIndex((x) => x.id === item.id);
  $('previous').disabled = index <= 0; $('next').disabled = index < 0 || index >= list.length - 1;
  fit();
  if (!$('detail').open) $('detail').showModal();
  if (writeHash) history.replaceState(null, '', `#case-${item.number}`);
}
function closeDetail() {
  if ($('editor').open) closeEditor();
  $('detail').close(); history.replaceState(null, '', location.pathname + location.search);
  if (opener?.isConnected) opener.focus({ preventScroll: true });
}
function navigate(delta) { const list = filtered(); const index = list.findIndex((x) => x.id === current?.id); if (list[index + delta]) openDetail(list[index + delta]); }
function hashDetail() { const match = location.hash.match(/^#case-(\d{3})$/); const item = match && items.find((x) => x.number === match[1]); if (item) openDetail(item, undefined, false); }
function downloadXml(xml, filename) {
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
async function openEditor() {
  const item = current;
  $('editor-title').textContent = `${item.number} · ${item.title}`;
  $('editor-fallback').href = item.drawio; $('editor-fallback').download = `MuseDraw-${item.number}.drawio`;
  $('editor-loading').hidden = false; $('editor-frame').replaceChildren(); $('editor').showModal();
  $('editor-loading').querySelector('p').textContent = '正在打开 draw.io…';
  const session = { item, frame: null, xml: null, closed: false, modified: false, timer: null }; editorSession = session;
  try {
    const response = await fetch(item.drawio); if (!response.ok) throw new Error('File unavailable');
    session.xml = await response.text();
    if (session.closed || editorSession !== session) return;
    const frame = document.createElement('iframe'); session.frame = frame;
    frame.title = `在 draw.io 编辑 ${item.title}`;
    frame.referrerPolicy = 'no-referrer';
    frame.src = `${editorOrigin}/?embed=1&proto=json&spin=1&libraries=1&lang=zh&saveAndExit=1`;
    $('editor-frame').append(frame);
    session.timer = setTimeout(() => { if (editorSession === session && !$('editor-loading').hidden) $('editor-loading').querySelector('p').textContent = 'draw.io 连接较慢或暂时不可达。可以先下载文件离线编辑。'; }, 20000);
  } catch { if (editorSession === session) { $('editor-loading').querySelector('p').textContent = '暂时无法打开编辑器，请先下载文件。'; } }
}
function closeEditor() {
  if (editorSession?.modified && !window.confirm('这次编辑尚未下载。关闭会丢弃未保存的修改，确定关闭吗？')) return;
  if (editorSession) { editorSession.closed = true; clearTimeout(editorSession.timer); }
  editorSession = null; $('editor-frame').replaceChildren(); $('editor').close(); $('edit').focus();
}
window.addEventListener('message', (event) => {
  const session = editorSession;
  if (!session || event.origin !== editorOrigin || event.source !== session.frame?.contentWindow || typeof event.data !== 'string' || event.data.length > 5_000_000) return;
  let message; try { message = JSON.parse(event.data); } catch { return; }
  if (!message || typeof message !== 'object' || Array.isArray(message)) return;
  if (message.event === 'init' && session.xml) session.frame.contentWindow.postMessage(JSON.stringify({ action: 'load', xml: session.xml, title: session.item.title, autosave: 1 }), editorOrigin);
  if (message.event === 'load') { clearTimeout(session.timer); $('editor-loading').hidden = true; }
  if (message.event === 'autosave') session.modified = true;
  if (message.event === 'save' && typeof message.xml === 'string') {
    const doc = new DOMParser().parseFromString(message.xml, 'application/xml');
    if (doc.querySelector('parsererror') || !['mxfile', 'mxGraphModel'].includes(doc.documentElement.nodeName)) { notify('编辑器返回的文件无效，未下载。'); return; }
    downloadXml(message.xml, `MuseDraw-${session.item.number}-edited.drawio`); notify('已下载修改后的 drawio 文件。');
    session.modified = false;
    session.frame.contentWindow.postMessage(JSON.stringify({ action: 'status', message: '已下载', modified: false }), editorOrigin);
    if (message.exit) closeEditor();
  }
  if (message.event === 'exit') closeEditor();
});
$('edit').addEventListener('click', openEditor); $('close-editor').addEventListener('click', closeEditor);
$('editor').addEventListener('cancel', (event) => { event.preventDefault(); closeEditor(); });
$('close-detail').addEventListener('click', closeDetail);
$('detail').addEventListener('cancel', (event) => { event.preventDefault(); closeDetail(); });
$('detail').addEventListener('click', (event) => { if (event.target === $('detail')) { const box = $('detail').getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDetail(); } });
$('previous').addEventListener('click', () => navigate(-1)); $('next').addEventListener('click', () => navigate(1));
$('copy-prompt').addEventListener('click', () => copy(current.prompt, '已复制提示词，几句需求即可开始画图。'));
$('share').addEventListener('click', () => copy(location.href, '已复制案例链接。'));
$('install').addEventListener('click', () => copy('npx skills add KanJieTeam/MuseDraw', '已复制安装命令。'));
$('zoom-out').addEventListener('click', () => zoom(1 / 1.25)); $('zoom-in').addEventListener('click', () => zoom(1.25)); $('fit').addEventListener('click', fit);
$('fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('viewport').requestFullscreen(); fit(); } catch { notify('此浏览器暂不支持全屏，可用放大按钮查看。'); } });
$('viewport').addEventListener('wheel', (event) => { event.preventDefault(); zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
$('viewport').addEventListener('pointerdown', (event) => { if (event.button !== 0) return; drag = { x: event.clientX, y: event.clientY, initial: { ...offset } }; $('viewport').setPointerCapture(event.pointerId); $('viewport').classList.add('dragging'); });
$('viewport').addEventListener('pointermove', (event) => { if (!drag) return; offset = { x: drag.initial.x + event.clientX - drag.x, y: drag.initial.y + event.clientY - drag.y }; applyTransform(); });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('viewport').addEventListener(type, () => { drag = null; $('viewport').classList.remove('dragging'); });
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !$('detail').open && event.target !== $('search') && event.target.tagName !== 'INPUT') { event.preventDefault(); $('search').focus(); }
  if ($('detail').open && !$('editor').open && !['INPUT','TEXTAREA'].includes(event.target.tagName)) { if (event.key === 'ArrowRight') navigate(1); if (event.key === 'ArrowLeft') navigate(-1); }
});
$('search').addEventListener('input', render);
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => {
  view = button.dataset.view;
  for (const other of document.querySelectorAll('[data-view]')) { const active = other === button; other.classList.toggle('active', active); other.setAttribute('aria-pressed', String(active)); }
  render();
});
$('favorites').addEventListener('click', () => { onlyFavorites = !onlyFavorites; $('favorites').setAttribute('aria-pressed', String(onlyFavorites)); render(); });
$('reset').addEventListener('click', () => { $('search').value = ''; onlyFavorites = false; $('favorites').setAttribute('aria-pressed', 'false'); document.querySelector('[data-view="all"]').click(); });
$('reload').addEventListener('click', () => location.reload());
window.addEventListener('hashchange', hashDetail);
try {
  const response = await fetch('manifest.json'); if (!response.ok) throw new Error('Collection unavailable');
  const data = await response.json();
  if (!Array.isArray(data.items) || data.items.length !== 100) throw new Error('Incomplete collection');
  const paths = ['thumbnail', 'svg', 'png', 'drawio'];
  if (data.items.some((item) => !Number.isInteger(item.id) || !/^\d{3}$/.test(item.number) || !viewNames[item.view] || typeof item.prompt !== 'string' || !item.prompt.trim() || item.prompt.length > 180 || (item.reference !== undefined && item.reference !== `cases/${item.number}/design.json`) || paths.some((key) => typeof item[key] !== 'string' || !/^cases\/\d{3}\/(preview\.png|diagram\.(svg|png|drawio))$/.test(item[key])))) throw new Error('Invalid collection');
  items = data.items; render(); hashDetail();
} catch { $('result-count').textContent = '图集未加载'; $('load-error').hidden = false; }
