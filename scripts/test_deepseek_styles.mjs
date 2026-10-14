// Real-model content planning + installed style renderer regression.
// Offline by default. --execute is required before any provider request.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {normalizeScene, renderScene} from '../skills/musedraw/scripts/render_style.mjs';

export const ROOT = path.resolve(import.meta.dirname, '..');
const SKILL = path.join(ROOT, 'skills', 'musedraw');
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_SCENE_BYTES = 256 * 1024;
const TRANSIENT = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
export const hash = text => createHash('sha256').update(text).digest('hex');

function boundedInteger(value, minimum, maximum, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) throw Error(`Invalid ${name}`);
  return number;
}

export function options(argv) {
  const flags = new Set(['--execute', '--plan', '--check-credentials']);
  const values = new Set(['--credentials', '--model', '--endpoint', '--playwright', '--browser', '--python',
    '--concurrency', '--limit', '--offset', '--repeats', '--max-tokens', '--timeout-ms', '--output', '--commit']);
  const parsed = {};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (flags.has(argument)) parsed[argument.slice(2)] = true;
    else if (values.has(argument)) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw Error(`Missing value for ${argument}`);
      parsed[argument.slice(2)] = value;
    } else throw Error(`Unknown option ${argument}`);
  }
  if (parsed.execute && (parsed.plan || parsed['check-credentials'])) throw Error('Choose execution, planning or credential check');
  parsed.concurrency = boundedInteger(parsed.concurrency ?? 4, 1, 4, 'concurrency');
  parsed.offset = boundedInteger(parsed.offset ?? 0, 0, 10000, 'offset');
  parsed.limit = boundedInteger(parsed.limit ?? 10000, 1, 10000, 'limit');
  parsed.repeats = boundedInteger(parsed.repeats ?? 1, 1, 5, 'repeats');
  parsed['max-tokens'] = boundedInteger(parsed['max-tokens'] ?? 8192, 256, 32768, 'max-tokens');
  parsed['timeout-ms'] = boundedInteger(parsed['timeout-ms'] ?? 120000, 1000, 300000, 'timeout-ms');
  if (parsed.commit && !/^[a-f0-9]{40}$/i.test(parsed.commit)) throw Error('Commit must be a full SHA');
  return parsed;
}

export function sanitize(text, apiKey) {
  return apiKey ? String(text).split(apiKey).join('[REDACTED]') : String(text);
}

export function extractCredentials(data) {
  if (!data || typeof data !== 'object') throw Error('Credential file must contain a configuration object');
  const candidate = data.deepseek ?? data.DeepSeek ?? data.providers?.deepseek ?? data.models?.deepseek;
  const apiKey = typeof candidate === 'string' ? candidate
    : candidate?.apiKey ?? candidate?.api_key ?? candidate?.key ?? candidate?.token
      ?? data.DEEPSEEK_API_KEY ?? data.deepseekApiKey ?? data.deepseek_key;
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw Error('DeepSeek credential is not configured');
  return {apiKey: apiKey.trim()};
}

export function officialEndpoint(value = 'https://api.deepseek.com/v1') {
  const endpoint = new URL(value);
  if (endpoint.protocol !== 'https:' || endpoint.hostname !== 'api.deepseek.com' ||
      endpoint.port || endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      !['', '/', '/v1', '/v1/'].includes(endpoint.pathname)) throw Error('Use the official DeepSeek HTTPS endpoint');
  return `https://api.deepseek.com${endpoint.pathname.replace(/\/$/, '')}`;
}

export function buildTasks(manifest, extras) {
  if (!Array.isArray(manifest?.items) || manifest.items.length !== 100 || extras?.version !== 1 || !Array.isArray(extras.tasks)) throw Error('Expected the frozen 100 briefs and extra scenarios');
  const ids = new Set();
  const tasks = manifest.items.map(item => ({id: `gallery-${String(item.id).padStart(3, '0')}`,
    title: item.title, style: item.style, view: item.view, prompt: item.prompt, source: 'gallery-short-brief',
    requireNoEdges: item.view === 'capability'}));
  tasks.push(...extras.tasks.map(task => ({...task, source: 'new-scenario'})));
  if (new Set(manifest.items.map(item => item.id)).size !== 100 || manifest.items.some(item => !Number.isInteger(item.id) || item.id < 1 || item.id > 100)) throw Error('Gallery IDs must cover 1–100');
  for (const task of tasks) {
    if (!/^[a-z][a-z0-9-]{0,79}$/.test(task.id) || ids.has(task.id)) throw Error('Task IDs must be unique safe identifiers');
    ids.add(task.id);
    if (typeof task.prompt !== 'string' || !task.prompt.trim() || task.prompt.length > 300 ||
        /#[0-9a-f]{6}|全部.*坐标|productionBrief/i.test(task.prompt)) throw Error('Use a short natural user brief, not a production specification');
    if (typeof task.title !== 'string' || !task.title.trim() || typeof task.style !== 'string' || !task.style) throw Error('Task title and family are required');
    if (task.view && !['capability', 'component', 'integration', 'deployment'].includes(task.view)) throw Error('Unsupported task view');
    if (task.contextScene) normalizeScene(task.contextScene);
  }
  return tasks;
}

export async function loadWorkflow() {
  const definitions = [
    ['skills/musedraw/SKILL.md', 'skill'],
    ['skills/musedraw/references/style-families.md', 'style'],
    ['skills/musedraw/references/capability-map.md', 'capability'],
    ['skills/musedraw/references/architecture-views.md', 'relationships'],
    ['skills/musedraw/references/visual-decisions.md', 'visual'],
    ['skills/musedraw/references/style-tokens.json', 'tokens'],
    ['skills/musedraw/scripts/render_style.mjs', 'renderer'],
  ];
  const documents = {}, files = [];
  for (const [relative, role] of definitions) {
    const text = await fs.readFile(path.join(ROOT, relative), 'utf8');
    documents[role] = text;
    files.push({path: relative, role, bytes: Buffer.byteLength(text), sha256: hash(text)});
  }
  const source = documents.renderer;
  const start = source.indexOf('export function normalizeScene(raw) {');
  const end = source.indexOf('\nexport function composeScene(', start);
  if (start < 0 || end < start) throw Error('Installed renderer schema could not be loaded');
  documents.schema = source.slice(start, end);
  return {documents, files, loadedBytes: files.reduce((total, file) => total + file.bytes, 0)};
}

export function buildMessages(task, workflow) {
  const view = task.view ?? task.contextScene?.view ?? 'capability';
  const relationshipView = view !== 'capability';
  const reading = relationshipView ? workflow.documents.relationships : workflow.documents.capability;
  const system = `你在执行安装版 MuseDraw 工作流的“内容整理与风格选择”阶段，之后真实调用同包的确定性绘图工具。
先读取以下 Skill、风格家族、设计说明和绘图工具的实际输入约束。你输出语义 scene 与 presentation 风格选择，不输出 SVG、坐标、颜色、字体或程序代码。
只使用用户给出的真实系统事实；用户明确说通用参考时可以设计适当示例能力，不将示例当作真实系统。不要复制图库案例的文案或凭空补协议、厂商、性能、部署实例。
架构归属关系用容器，edges 仅含用户明确的节点依赖。style-only 请求保留现有 title/view、所有 group/node 的 id/label/归属及边，不增删内容。
用户只说墨蓝等风格名称时，从现有上下文取内容，不要求编号、坐标、色值或长提示。
必须输出单个 JSON 对象 {"scene":语义内容,"presentation":{"family":"用户选择的自然风格名或兼容ID","variant":"quiet或banded或compact","density":"normal或compact或comfortable"}}，无代码围栏或其他文字。
scene 的键：title、view、sections、top、bottom、supports、edges。sections 每项为 {id?,title,groups:[{id?,title,items:[string|{id?,label}]}]}；top/bottom 为同样的单 group；supports 是最多两个 group 加 side:left/right；edges:{from,to,label?,direction?:forward|none} 引用已有 item IDs。所有 ID 唯一。
presentation 由你根据用户说的风格名、视图、信息量选择。家族不改变业务内容，子风格不是案例编号。用户指定轻一点选 quiet，指定紧凑选 compact；不在 presentation 内补色值或坐标。
本题目标标题为“${task.title}”，将 scene.title 保留为这个标题。已确认的上下文是事实，不用图库内容代替。
本题所需阅读视图为 ${view}，scene.view 使用该值；它是执行侧的视图分类，不要求用户填写技术参数。
\n--- INSTALLED SKILL ---\n${workflow.documents.skill}
\n--- STYLE FAMILIES ---\n${workflow.documents.style}
\n--- RELEVANT VIEW ---\n${reading}
\n--- VISUAL DECISIONS ---\n${workflow.documents.visual}
\n--- ACTUAL RENDERER NORMALIZATION ---\n${workflow.documents.schema}
\n现在仅输出 scene/presentation JSON；scene 可传给 normalizeScene，presentation 会由工具解析，排版与色彩由工具执行。`;
  const messages = [{role: 'system', content: system}];
  if (task.contextScene) {
    messages.push({role: 'user', content: '下面是当前已经确认的图纸内容。之后只修改视觉风格，不更改这些事实、对象身份和关系。'});
    messages.push({role: 'assistant', content: JSON.stringify(normalizeScene(task.contextScene))});
  }
  if (task.requireNoEdges) messages[0].content += '\n本题是没有明确运行调用事实的能力归属视图，edges 必须为空；不要为了让图像架构而添加箭头。';
  messages.push({role: 'user', content: task.prompt});
  return messages;
}

const visualKeys = new Set(['x', 'y', 'width', 'height', 'coordinates', 'box', 'palette', 'colors', 'fill', 'stroke', 'font', 'fontSize', 'font-size', 'svg']);
export function parseScene(content) {
  if (typeof content !== 'string' || Buffer.byteLength(content) > MAX_SCENE_BYTES) throw Error('Model scene is missing or too large');
  const raw = JSON.parse(content);
  function inspect(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (visualKeys.has(key)) throw Error('Model output contains visual coordinates or styling instead of content');
      inspect(child);
    }
  }
  inspect(raw);
  return normalizeScene(raw);
}

export function parsePlan(content) {
  if (typeof content !== 'string' || Buffer.byteLength(content) > MAX_SCENE_BYTES) throw Error('Model plan is missing or too large');
  const raw = JSON.parse(content);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !raw.scene || !raw.presentation
      || Object.keys(raw).some(key => !['scene', 'presentation'].includes(key))) throw Error('Model must choose both scene and presentation');
  const presentation = raw.presentation;
  if (!presentation || typeof presentation !== 'object' || Array.isArray(presentation)
      || typeof presentation.family !== 'string' || !presentation.family.trim() || presentation.family.length > 60
      || !['quiet', 'banded', 'compact'].includes(presentation.variant)
      || !['normal', 'compact', 'comfortable'].includes(presentation.density)
      || Object.keys(presentation).some(key => !['family', 'variant', 'density'].includes(key))) throw Error('Invalid model presentation choice');
  return {scene: parseScene(JSON.stringify(raw.scene)), presentation: {...presentation, family: presentation.family.trim()}};
}

export function parseCompletion(result) {
  if (result?.choices?.[0]?.finish_reason === 'length') throw Error('Model output reached its completion-token limit');
  return parsePlan(result?.choices?.[0]?.message?.content);
}

function semanticInventory(scene) {
  const groups = [], nodes = [];
  const append = (group, parent) => {
    groups.push({id: group.id, title: group.title, parent});
    for (const item of group.items) nodes.push({...item, parent: group.id});
  };
  for (const section of scene.sections) {
    groups.push({id: section.id, title: section.title, parent: null});
    for (const group of section.groups) append(group, section.id);
  }
  for (const group of scene.supports) append(group, group.side);
  for (const key of ['top', 'bottom']) if (scene[key]) append(scene[key], key);
  const byId = values => [...values].sort((a, b) => a.id.localeCompare(b.id));
  const edges = scene.edges.map(({from, to, label, direction}) => ({from, to, label, direction}))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return {title: scene.title, view: scene.view, groups: byId(groups), nodes: byId(nodes), edges};
}

export function evaluateScene(task, scene) {
  const inventory = semanticInventory(scene), failures = [];
  if (scene.title !== task.title) failures.push('Requested title was not preserved');
  if (task.view && scene.view !== task.view) failures.push('Requested architecture view was not preserved');
  const labels = [...inventory.nodes.map(node => node.label), ...inventory.groups.map(group => group.title)];
  for (const required of task.requiredLabels ?? []) if (!labels.some(value => value.includes(required))) failures.push(`Missing explicitly requested content: ${required}`);
  for (const requirement of task.requirements ?? []) {
    const any = requirement.anyOf?.some(fragment => labels.some(value => value.includes(fragment)));
    const all = requirement.allOf?.length > 0 && requirement.allOf.every(fragment => labels.some(value => value.includes(fragment)));
    if (!any && !all) failures.push(`Missing requested capability: ${requirement.label}`);
  }
  if (task.requireNoEdges && scene.edges.length) failures.push('Capability-only task gained unsupported runtime edges');
  if (task.contextScene && JSON.stringify(inventory) !== JSON.stringify(semanticInventory(normalizeScene(task.contextScene)))) failures.push('Style-only edit changed content, IDs, membership or relationships');
  return {passed: failures.length === 0, failures, nodeCount: inventory.nodes.length,
    edgeCount: inventory.edges.length, contextPreservationChecked: Boolean(task.contextScene),
    notChecked: ['architectural-truth', 'professional-aesthetic-quality', 'full-reference-fidelity']};
}

export function evaluatePresentation(task, actual, expected) {
  const failures = [];
  if (actual.id !== expected.id) failures.push('Model selected a different visual family');
  if (task.variant && actual.variant.id !== expected.variant.id) failures.push('Model did not preserve the requested sub-style');
  if (task.density && actual.density !== expected.density) failures.push('Model did not preserve the requested density');
  return {passed: failures.length === 0, failures, actualFamily: actual.id, actualVariant: actual.variant.id,
    actualDensity: actual.density, expectedFamily: expected.id};
}

async function limitedBody(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  while (true) {
    const {value, done} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw Error('Provider response exceeded the archive byte limit'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function requestProvider({url, apiKey, body, execute, fetchImpl = fetch, timeoutMs = 120000,
  archive = async () => {}, wait = sleep}) {
  if (!execute) throw Error('Provider requests require explicit execution');
  if (!apiKey) throw Error('DeepSeek credential is not configured');
  for (let attempt = 1; attempt <= 3; attempt++) {
    const started = Date.now(); let status = null, raw = '', error = null, retry = false;
    try {
      const response = await fetchImpl(url, {method: body ? 'POST' : 'GET', redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs), headers: {Authorization: `Bearer ${apiKey}`,
          ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})});
      status = response.status;
      raw = await limitedBody(response);
      if (!response.ok) {
        error = `Provider returned HTTP ${status}`;
        retry = TRANSIENT.has(status);
      }
    } catch (failure) {
      error = sanitize(failure.message, apiKey);
      retry = failure.name === 'TimeoutError' || failure.name === 'AbortError' || failure instanceof TypeError;
    }
    const record = {attempt, status, elapsedMs: Date.now() - started, error, transient: retry,
      responseBytes: Buffer.byteLength(raw), responseSha256: hash(raw), raw: sanitize(raw, apiKey)};
    await archive(record);
    if (!error) return {raw: sanitize(raw, apiKey), status, attempts: attempt};
    if (!retry || attempt === 3) throw Error(`${error}; attempts=${attempt}`);
    await wait(Math.min(10000, 1000 * 2 ** (attempt - 1)));
  }
}

export function chooseModel(raw, requested) {
  const data = JSON.parse(raw);
  const models = (data.data ?? []).map(item => item.id).filter(value => typeof value === 'string');
  if (requested) {
    if (!models.includes(requested)) throw Error('Requested model is not advertised by the provider');
    return {model: requested, advertisedModels: models};
  }
  const preferred = ['deepseek-flash', 'deepseek-v4-flash'].find(model => models.includes(model));
  if (!preferred) throw Error('No advertised Flash model; specify --model from the recorded provider model list');
  return {model: preferred, advertisedModels: models};
}

export async function runPool(tasks, concurrency, worker) {
  boundedInteger(concurrency, 1, 4, 'concurrency');
  const results = new Array(tasks.length); let cursor = 0;
  await Promise.all(Array.from({length: Math.min(concurrency, tasks.length)}, async () => {
    while (cursor < tasks.length) {
      const index = cursor++;
      results[index] = await worker(tasks[index], index);
    }
  }));
  return results;
}

function styleTokens(task, view, python) {
  const arguments_ = [path.join(SKILL, 'scripts', 'style_tokens.py'), task.style, '--view', view];
  for (const key of ['variant', 'density']) if (task[key]) arguments_.push(`--${key}`, task[key]);
  return JSON.parse(execFileSync(python, arguments_, {encoding: 'utf8', env: {...process.env, PYTHONUTF8: '1'}, timeout: 15000}));
}

async function saveJson(destination, value) {
  await fs.writeFile(destination, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
}

async function readCredentials(filename) {
  if (!filename) throw Error('Provide --credentials or MUSEDRAW_CREDENTIALS_PATH');
  const info = await fs.stat(filename);
  if (info.size > 1024 * 1024) throw Error('Credential configuration is too large');
  return extractCredentials(JSON.parse(await fs.readFile(filename, 'utf8')));
}

export async function main(argv = process.argv.slice(2)) {
  const args = options(argv);
  if (args['check-credentials']) {
    await readCredentials(args.credentials ?? process.env.MUSEDRAW_CREDENTIALS_PATH);
    console.log(JSON.stringify({provider: 'deepseek', configured: true, networkRequests: 0}));
    return;
  }
  const manifestText = await fs.readFile(path.join(ROOT, 'docs/gallery/manifest.json'), 'utf8');
  const extrasText = await fs.readFile(path.join(ROOT, 'scripts/deepseek-style-briefs.json'), 'utf8');
  const tasks = buildTasks(JSON.parse(manifestText), JSON.parse(extrasText));
  const selected = tasks.slice(args.offset, args.offset + args.limit).flatMap(task =>
    Array.from({length: args.repeats}, (_, repeat) => ({...task, runId: `${task.id}-r${repeat + 1}`, repeat: repeat + 1})));
  if (!selected.length) throw Error('No tasks selected');
  const workflow = await loadWorkflow();
  if (!args.execute) {
    console.log(JSON.stringify({mode: 'offline-plan', provider: 'deepseek', taskCount: selected.length,
      galleryBriefs: tasks.filter(task => task.source === 'gallery-short-brief').length,
      extraScenarios: tasks.filter(task => task.source === 'new-scenario').length,
      loadedBytes: workflow.loadedBytes, loadedFiles: workflow.files, concurrency: args.concurrency,
      networkRequests: 0, rawFailuresRetained: true, visualAcceptanceRequired: true}, null, 2));
    return;
  }
  if (!args.playwright) throw Error('Execution requires an existing --playwright module');
  const endpoint = officialEndpoint(args.endpoint);
  const {apiKey} = await readCredentials(args.credentials ?? process.env.MUSEDRAW_CREDENTIALS_PATH);
  const commit = args.commit ?? execFileSync('git', ['rev-parse', 'HEAD'], {cwd: ROOT, encoding: 'utf8', timeout: 10000}).trim();
  if (!/^[a-f0-9]{40}$/i.test(commit)) throw Error('Could not establish the current commit');
  const rootOutput = path.resolve(ROOT, args.output ?? 'output/deepseek-style-regression');
  if (!rootOutput.startsWith(path.join(ROOT, 'output') + path.sep)) throw Error('Use a private subdirectory of output');
  const run = path.join(rootOutput, new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8));
  await fs.mkdir(rootOutput, {recursive: true});
  await fs.mkdir(run, {recursive: false});
  await saveJson(path.join(run, 'frozen-plan.json'), {version: 1, createdAt: new Date().toISOString(), commit,
    provider: 'deepseek', endpoint, credentialsConfigured: true, workflow: workflow.files,
    loadedBytes: workflow.loadedBytes, manifestSha256: hash(manifestText), extrasSha256: hash(extrasText),
    tasks: selected, concurrency: args.concurrency, transientRetries: 2, maxTokens: args['max-tokens'],
    evaluationBoundary: 'Model plans content; installed deterministic renderer executes it. Not a full tool-using-agent or aesthetic benchmark.'});
  const discovery = await requestProvider({url: endpoint + '/models', apiKey, execute: true,
    timeoutMs: args['timeout-ms'], archive: record => saveJson(path.join(run, `model-discovery-${record.attempt}.json`), record)});
  const model = chooseModel(discovery.raw, args.model);
  await saveJson(path.join(run, 'model.json'), model);
  const {chromium} = await import(pathToFileURL(path.resolve(args.playwright)).href);
  const browser = await chromium.launch({headless: true, ...(args.browser ? {executablePath: args.browser} : {})});
  let results;
  try {
    results = await runPool(selected, args.concurrency, async task => {
      const directory = path.join(run, task.runId);
      await fs.mkdir(directory, {recursive: false});
      const started = Date.now();
      const messages = buildMessages(task, workflow);
      const request = {model: model.model, messages, temperature: 0, max_tokens: args['max-tokens'],
        response_format: {type: 'json_object'}, stream: false};
      await saveJson(path.join(directory, 'request.json'), request);
      const record = {id: task.id, repeat: task.repeat, prompt: task.prompt, style: task.style,
        requestSha256: hash(JSON.stringify(request)), inputBytes: Buffer.byteLength(JSON.stringify(messages)),
        usage: null, contentChecks: null, layoutChecks: null, passed: false, visualAcceptance: 'not-reviewed'};
      try {
        const response = await requestProvider({url: endpoint + '/chat/completions', apiKey, body: request,
          execute: true, timeoutMs: args['timeout-ms'], archive: attempt => saveJson(path.join(directory, `attempt-${attempt.attempt}.json`), attempt)});
        const result = JSON.parse(response.raw);
        record.usage = result.usage ?? null;
        record.model = result.model ?? model.model;
        record.systemFingerprint = result.system_fingerprint ?? null;
        record.responseId = result.id ?? null;
        record.attempts = response.attempts;
        const plan = parseCompletion(result);
        const {scene, presentation} = plan;
        await saveJson(path.join(directory, 'plan.json'), plan);
        await saveJson(path.join(directory, 'scene.json'), scene);
        record.contentChecks = evaluateScene(task, scene);
        const tokens = styleTokens({style: presentation.family, variant: presentation.variant, density: presentation.density}, scene.view, args.python ?? 'python');
        const expected = styleTokens(task, scene.view, args.python ?? 'python');
        record.presentationChecks = evaluatePresentation(task, tokens, expected);
        await saveJson(path.join(directory, 'tokens.json'), tokens);
        await saveJson(path.join(directory, 'expected-tokens.json'), expected);
        const render = await renderScene(browser, scene, tokens, path.join(directory, 'render'));
        const svg = await fs.readFile(path.join(directory, 'render/diagram.svg'), 'utf8');
        const allowedColors = new Set([...Object.values(tokens.colors), ...Object.values(tokens.detailColors)]);
        const unexpectedColors = [...new Set(svg.match(/#[0-9A-F]{6}/gi) ?? [])].filter(color => !allowedColors.has(color.toUpperCase()));
        record.layoutChecks = {...render.checks, palettePassed: unexpectedColors.length === 0, unexpectedColors,
          family: tokens.family, variant: tokens.variant, density: tokens.density};
        record.passed = record.contentChecks.passed && record.presentationChecks.passed && record.layoutChecks.passed === true && !unexpectedColors.length;
        record.rendered = true;
      } catch (error) {
        record.error = sanitize(error.message, apiKey);
        // Render failures can leave useful PNG/SVG/checks. Preserve them verbatim.
        try {record.layoutChecks ??= JSON.parse(await fs.readFile(path.join(directory, 'render/checks.json'), 'utf8'));} catch {}
      }
      record.elapsedMs = Date.now() - started;
      await saveJson(path.join(directory, 'result.json'), record);
      console.log(JSON.stringify({id: task.runId, passed: record.passed, elapsedMs: record.elapsedMs,
        usage: record.usage, error: record.error ?? null}));
      return record;
    });
  } finally {await browser.close();}
  const usageTotals = {prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, measuredCalls: 0};
  for (const result of results) if (result.usage) {
    usageTotals.measuredCalls++;
    for (const key of ['prompt_tokens', 'completion_tokens', 'total_tokens']) if (Number.isFinite(result.usage[key])) usageTotals[key] += result.usage[key];
  }
  const summary = {version: 1, commit, provider: 'deepseek', model: model.model, tasks: results.length,
    renderedCount: results.filter(result => result.rendered).length,
    structuralPassed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).map(result => ({id: result.id, repeat: result.repeat,
      error: result.error ?? [...(result.contentChecks?.failures ?? []), ...(result.presentationChecks?.failures ?? []),
        ...(result.layoutChecks?.unexpectedColors?.length ? ['Renderer introduced colors outside the selected family'] : [])]})),
    usageTotals, visualAcceptance: 'not-reviewed', elapsedSumMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
    notChecked: ['professional-aesthetic-quality', 'all-architecture-semantics', 'other-agent-execution', 'token-savings-comparison'], results};
  await saveJson(path.join(run, 'summary.json'), summary);
  console.log(JSON.stringify({run: path.relative(ROOT, run).split(path.sep).join('/'), tasks: summary.tasks,
    structuralPassed: summary.structuralPassed, failed: summary.failed.length, usageTotals, visualAcceptance: 'not-reviewed'}));
  if (summary.failed.length) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main().catch(error => {console.error(error.message); process.exitCode = 1;});
}
