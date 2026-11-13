#!/usr/bin/env node
// Local evidence packaging and accounting; this program does not judge aesthetics.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash, randomInt} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

const VERSION = 1;
const RUBRIC = 'musedraw-visual-review-1';
const RESERVED = new Set(['a', 'b', 'tie', 'abstain']);
const LIMIT = 64 * 1024 * 1024;
const ADVISORY = 'ADVISORY: visual preferences are contextual. Agreement, including exact agreement on a tiny calibration sample, is not production aesthetic certification. Objective geometry, factual and browser/function checks remain separate.';
const PROMPT = `# Independent visual comparison\n\nUse a fresh context that has received only this packet: images, unchanged briefs and this fixed rubric. Do not request creator reasoning, condition identities, prior votes or human labels. Inspect every actual image at its supplied scale. If independent image inspection is unavailable, report visualAccess:false and abstain on every case; do not invent observations. The manifest is an inventory, not a visual judgment.\n\nFor each case, compare a and b against its brief. Examine hierarchy and reading path, spatial relationships and density, legibility at the supplied viewing size, coherence and distinctive successful choices. Explain what is visible, where it is, and its effect on this brief. Do not use a numeric aesthetic score, universal font/palette bans, or assume newer work should win. Keep objective geometry, factual and browser/function failures separate; an image cannot establish working behavior.\n\nChoose a, b, tie, or abstain. A tie means inspected alternatives are equally suitable; abstain means the evidence or your ability is insufficient. For a/b/tie, cite every supplied image filename across observations; include a concrete location, visible observation and effect. State the reason for the choice, the strongest part to preserve, and uncertainty (use "none identified" when appropriate). Do not replace the choice with scores. An abstention needs an explicit reason and uncertainty; observations may be empty.\n\nReturn JSON using response-template.json. reviewer.id is an opaque reviewer name. independent:true attests to a fresh context restricted to the packet; this tool cannot verify that attestation or the truth of visual observations. Keep reports outside this packet.\n\n${ADVISORY}\n`;

function fail(message) { throw new Error(message); }
function obj(value, name) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object.`); }
function keys(value, allowed, name) { obj(value, name); for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`Unknown ${name} field: ${key}.`); }
function str(value, name, min = 1) { if (typeof value !== 'string' || value.trim().length < min) fail(`${name} must be nonempty text (minimum ${min} characters).`); return value; }
function list(value, name, min = 1) { if (!Array.isArray(value) || value.length < min) fail(`${name} must be an array with at least ${min} entries.`); return value; }
function unique(values, name) { if (new Set(values).size !== values.length) fail(`Duplicate ${name}.`); }
function canonical(value) { if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`; if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`; return JSON.stringify(value); }
function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function safeId(value, name) { str(value, name); if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(value)) fail(`${name} must be a short portable identifier.`); return value; }
function inside(parent, target) { const rel = path.relative(parent, target); return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel)); }
async function absolute(target) { const resolved = path.resolve(target); try { return await fs.realpath(resolved); } catch (error) { if (error.code !== 'ENOENT') throw error; const parent = path.dirname(resolved); if (parent === resolved) throw error; return path.join(await absolute(parent), path.basename(resolved)); } }
async function outside(packet, target, label) { if (inside(await absolute(packet), await absolute(target))) fail(`${label} must stay outside the reviewer packet.`); }
async function absent(target) { try { await fs.lstat(target); } catch (error) { if (error.code === 'ENOENT') return; throw error; } fail(`Refusing to overwrite existing output: ${target}`); }
async function readJson(target) { try { return JSON.parse(await fs.readFile(target, 'utf8')); } catch (error) { fail(`Cannot read JSON ${target}: ${error.message}`); } }
async function writeNew(target, value) { await fs.mkdir(path.dirname(target), {recursive: true}); await fs.writeFile(target, json(value), {flag: 'wx'}); }
async function regular(target) { const stat = await fs.lstat(target); if (!stat.isFile() || stat.isSymbolicLink()) fail(`Expected a regular file without symlinks: ${target}`); if (stat.size > LIMIT) fail(`File is too large: ${target}`); return fs.readFile(target); }

// Screenshots only: validate PNG structure, CRCs and decompressed scanline framing.
// Reject metadata instead of silently changing color profiles or re-encoding pixels.
const CRC_TABLE = Array.from({length: 256}, (_, i) => { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
export function crc32(bytes) { let c = 0xffffffff; for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export function inspectPng(bytes) {
  if (bytes.length > LIMIT || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) fail('Expected an actual PNG screenshot.');
  const allowed = new Set(['IHDR','PLTE','IDAT','IEND','tRNS','sRGB','gAMA','cHRM','pHYs','bKGD','sBIT']);
  const seen = new Set(), data = []; let offset = 8, width, height, depth, color, ended = false, closedData = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) fail('Truncated PNG chunk.');
    const length = bytes.readUInt32BE(offset), end = offset + 12 + length;
    if (end > bytes.length) fail('Truncated PNG data.');
    const type = bytes.toString('ascii', offset + 4, offset + 8), payload = bytes.subarray(offset + 8, end - 4);
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) fail('PNG CRC mismatch.');
    if (!allowed.has(type)) fail(`PNG chunk ${type} is unsupported or may expose metadata. Supply a metadata-free, non-animated PNG screenshot; bytes are never silently rewritten.`);
    if (seen.size === 0 && type !== 'IHDR') fail('PNG must start with IHDR.');
    if (type !== 'IDAT' && seen.has(type)) fail(`Duplicate PNG ${type} chunk.`);
    if (type === 'IHDR') {
      if (length !== 13) fail('Invalid PNG header.');
      width = payload.readUInt32BE(0); height = payload.readUInt32BE(4); depth = payload[8]; color = payload[9];
      const depths = {0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
      if (!width || !height || width * height > 40000000 || !depths[color]?.includes(depth) || payload[10] || payload[11] || payload[12]) fail('Unsupported PNG dimensions, color format or interlacing.');
    }
    if (type === 'IDAT') { if (closedData) fail('PNG IDAT chunks must be consecutive.'); data.push(payload); }
    else if (data.length) closedData = true;
    if (type === 'PLTE' && (data.length || length === 0 || length % 3 || length > 768)) fail('Invalid PNG palette.');
    if (type === 'IEND') { if (length || !data.length || end !== bytes.length) fail('Invalid PNG end or trailing bytes.'); ended = true; }
    seen.add(type); offset = end;
  }
  if (!ended || (color === 3 && !seen.has('PLTE'))) fail('Incomplete PNG screenshot.');
  const channels = {0:1,2:3,3:1,4:2,6:4}[color], stride = Math.ceil(width * channels * depth / 8) + 1, size = stride * height;
  if (size > 256 * 1024 * 1024) fail('PNG expands beyond the local review limit.');
  let raw; try { raw = inflateSync(Buffer.concat(data), {maxOutputLength: size + 1}); } catch { fail('PNG has invalid compressed image data.'); }
  if (raw.length !== size) fail('PNG scanline size mismatch.');
  for (let row = 0; row < height; row++) if (raw[row * stride] > 4) fail('Invalid PNG scanline filter.');
  return {width, height};
}

function template(manifest) {
  return {schemaVersion: VERSION, packetDigest: manifest.packetDigest, reviewer: {id: 'REPLACE', independent: true, visualAccess: true}, cases: manifest.cases.map(c => ({caseId: c.caseId, choice: 'abstain', observations: [], reason: 'REPLACE with visible evidence or an explicit inability to inspect.', preserve: 'REPLACE after inspection, or unavailable.', uncertainty: 'REPLACE with limitations.'}))};
}

export async function prepare({input, packet, private: privateFile, order = 'random', rubric}) {
  if (!['random','forward','reverse'].includes(order)) fail('order must be random, forward or reverse.');
  packet = await absolute(packet); privateFile = await absolute(privateFile); input = await absolute(input);
  await outside(packet, privateFile, 'Private mapping'); await outside(packet, input, 'Preparation input');
  await absent(packet); await absent(privateFile);
  if (inside(privateFile, packet)) fail('Private map cannot be an ancestor of the packet.');
  let prompt = Buffer.from(PROMPT);
  if (rubric) { await outside(packet, rubric, 'Rubric input'); prompt = await regular(rubric); str(prompt.toString('utf8'), 'rubric', 20); }
  const spec = await readJson(input); keys(spec, ['schemaVersion','cases'], 'input');
  if (spec.schemaVersion !== VERSION) fail('input.schemaVersion must be 1.');
  list(spec.cases, 'cases'); unique(spec.cases.map(c => c.id), 'input case ID');
  const publicCases = [], privateCases = [], files = [];
  for (let index = 0; index < spec.cases.length; index++) {
    const c = spec.cases[index]; keys(c, ['id','brief','candidates'], 'case'); safeId(c.id, 'case.id'); str(c.brief, 'brief');
    list(c.candidates, 'candidates', 2); if (c.candidates.length !== 2) fail('Each case requires exactly two candidates.');
    unique(c.candidates.map(v => v.id), 'candidate ID');
    const caseId = `case-${String(index + 1).padStart(3, '0')}`, ordered = [...c.candidates];
    if (order === 'reverse' || (order === 'random' && randomInt(2))) ordered.reverse();
    const candidates = {}, mapping = {}, viewLists = [];
    for (let j = 0; j < ordered.length; j++) {
      const candidate = ordered[j], label = j === 0 ? 'a' : 'b';
      keys(candidate, ['id','images'], 'candidate'); safeId(candidate.id, 'candidate.id'); if (RESERVED.has(candidate.id)) fail('Candidate IDs cannot be a, b, tie or abstain.');
      list(candidate.images, 'candidate.images'); unique(candidate.images.map(v => v.view), 'view');
      candidates[label] = []; mapping[label] = {candidateId: candidate.id, images: []};
      for (const image of candidate.images) {
        keys(image, ['view','path','heightMode'], 'image'); safeId(image.view, 'image.view'); str(image.path, 'image.path');
        if ('heightMode' in image && image.heightMode !== 'natural') fail('image.heightMode must be natural when supplied.');
        const source = await absolute(path.resolve(path.dirname(input), image.path)); await outside(packet, source, 'Source image');
        const bytes = await regular(source), dimensions = inspectPng(bytes), filename = `images/${caseId}/${label}-${image.view}.png`;
        const item = {view: image.view, file: filename, sha256: hash(bytes), ...dimensions, ...(image.heightMode ? {heightMode:image.heightMode} : {})};
        candidates[label].push(item); mapping[label].images.push({...item, source}); files.push({filename, bytes});
      }
      candidates[label].sort((a,b) => a.view.localeCompare(b.view)); mapping[label].images.sort((a,b) => a.view.localeCompare(b.view));
      viewLists.push(candidates[label].map(v => v.view));
    }
    if (canonical(viewLists[0]) !== canonical(viewLists[1])) fail(`View sets differ in ${c.id}.`);
    for (let j = 0; j < candidates.a.length; j++) {
      const a = candidates.a[j], b = candidates.b[j];
      if (a.heightMode !== b.heightMode) fail(`Asymmetric heightMode in ${c.id}/${a.view}.`);
      if (a.width !== b.width || (a.heightMode !== 'natural' && a.height !== b.height)) fail(`Same-scale image dimensions differ in ${c.id}/${a.view}. Natural height still requires equal width.`);
    }
    publicCases.push({caseId, brief: c.brief, candidates}); privateCases.push({caseId, privateCaseId: c.id, candidates: mapping});
  }
  const base = {schemaVersion: VERSION, kind: 'anonymous-visual-review', rubricVersion: RUBRIC, rubricSha256: hash(prompt), cases: publicCases};
  const manifest = {...base, packetDigest: hash(canonical(base))};
  const mapping = {schemaVersion: VERSION, kind: 'private-visual-review-mapping', packetDigest: manifest.packetDigest, cases: privateCases};
  // Both destinations are exclusively created. An interrupted write leaves a visible
  // incomplete artifact; it is never silently overwritten or used as a valid packet.
  await fs.mkdir(path.dirname(packet), {recursive: true}); await fs.mkdir(packet);
  for (const file of files) { const target = path.join(packet, file.filename); await fs.mkdir(path.dirname(target), {recursive: true}); await fs.writeFile(target, file.bytes, {flag:'wx'}); }
  await fs.writeFile(path.join(packet, 'manifest.json'), json(manifest), {flag:'wx'});
  await fs.writeFile(path.join(packet, 'REVIEW.md'), prompt, {flag:'wx'});
  await fs.writeFile(path.join(packet, 'response-template.json'), json(template(manifest)), {flag:'wx'});
  await writeNew(privateFile, mapping);
  return {advisory: ADVISORY, packetDigest: manifest.packetDigest, cases: publicCases.length, packet, private: privateFile};
}

async function inventory(root, prefix = '') {
  const output = [];
  for (const entry of await fs.readdir(path.join(root, prefix), {withFileTypes:true})) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) fail(`Symlinks are forbidden in a reviewer packet: ${relative}`);
    if (entry.isDirectory()) { const children = await inventory(root, relative); if (!children.length) fail(`Unexpected empty packet directory: ${relative}`); output.push(...children); }
    else if (entry.isFile()) output.push(relative); else fail(`Unexpected packet entry: ${relative}`);
  }
  return output.sort();
}

export async function verifyPacket(packet) {
  packet = await absolute(packet); const manifest = await readJson(path.join(packet, 'manifest.json'));
  keys(manifest, ['schemaVersion','kind','rubricVersion','rubricSha256','cases','packetDigest'], 'manifest');
  if (manifest.schemaVersion !== VERSION || manifest.kind !== 'anonymous-visual-review' || manifest.rubricVersion !== RUBRIC) fail('Unsupported packet format or rubric.');
  const {packetDigest, ...base} = manifest; if (packetDigest !== hash(canonical(base))) fail('Packet manifest digest mismatch.');
  list(manifest.cases, 'manifest.cases'); unique(manifest.cases.map(c => c.caseId), 'manifest case ID');
  const expected = ['manifest.json','REVIEW.md','response-template.json'];
  for (let index = 0; index < manifest.cases.length; index++) {
    const c = manifest.cases[index]; keys(c, ['caseId','brief','candidates'], 'manifest case');
    if (c.caseId !== `case-${String(index + 1).padStart(3,'0')}`) fail('Public case IDs must be anonymous sequential IDs.');
    str(c.brief, 'manifest brief'); keys(c.candidates, ['a','b'], 'manifest candidates');
    for (const label of ['a','b']) {
      list(c.candidates[label], `candidate ${label} images`); unique(c.candidates[label].map(i => i.view), 'manifest view');
      for (const image of c.candidates[label]) {
        keys(image, ['view','file','sha256','width','height','heightMode'], 'manifest image'); safeId(image.view, 'view');
        if ('heightMode' in image && image.heightMode !== 'natural') fail('Unknown manifest heightMode.');
        if (image.file !== `images/${c.caseId}/${label}-${image.view}.png`) fail('Unsafe or non-anonymous image filename.');
        const bytes = await regular(path.join(packet, image.file)), dimensions = inspectPng(bytes);
        if (hash(bytes) !== image.sha256 || dimensions.width !== image.width || dimensions.height !== image.height) fail(`Stale or tampered image: ${image.file}`);
        expected.push(image.file);
      }
    }
    if (canonical(c.candidates.a.map(i => [i.view,i.width,i.heightMode ?? null,i.heightMode === 'natural' ? null : i.height])) !== canonical(c.candidates.b.map(i => [i.view,i.width,i.heightMode ?? null,i.heightMode === 'natural' ? null : i.height]))) fail('Packet views, height modes or image dimensions differ.');
  }
  if (canonical(await inventory(packet)) !== canonical(expected.sort())) fail('Packet has unexpected or missing files. Keep private maps, reports and human labels outside it.');
  if (hash(await regular(path.join(packet, 'REVIEW.md'))) !== manifest.rubricSha256) fail('Frozen reviewer prompt changed.');
  if ((await regular(path.join(packet, 'response-template.json'))).toString() !== json(template(manifest))) fail('Response template changed.');
  return manifest;
}

async function verifyMap(privateFile, packet, manifest) {
  await outside(packet, privateFile, 'Private mapping'); const mapping = await readJson(privateFile);
  keys(mapping, ['schemaVersion','kind','packetDigest','cases'], 'private map');
  if (mapping.schemaVersion !== VERSION || mapping.kind !== 'private-visual-review-mapping' || mapping.packetDigest !== manifest.packetDigest) fail('Private mapping does not match this frozen packet.');
  list(mapping.cases, 'private map cases'); unique(mapping.cases.map(c => c.caseId), 'private mapping public case'); unique(mapping.cases.map(c => c.privateCaseId), 'private case ID');
  if (mapping.cases.length !== manifest.cases.length) fail('Private mapping has missing or extra cases.');
  for (const c of manifest.cases) {
    const privateCase = mapping.cases.find(v => v.caseId === c.caseId); if (!privateCase) fail('Missing private case mapping.');
    keys(privateCase, ['caseId','privateCaseId','candidates'], 'private case'); safeId(privateCase.privateCaseId, 'private case ID'); keys(privateCase.candidates, ['a','b'], 'private candidates');
    for (const label of ['a','b']) {
      const v = privateCase.candidates[label]; keys(v, ['candidateId','images'], 'private candidate'); safeId(v.candidateId, 'private candidate ID');
      if (RESERVED.has(v.candidateId)) fail('Reserved private candidate ID.');
      list(v.images, 'private candidate images');
      const stripped = v.images.map(image => { keys(image, ['view','file','sha256','width','height','heightMode','source'], 'private image'); str(image.source, 'source'); const {source, ...rest} = image; return rest; });
      if (canonical(stripped) !== canonical(c.candidates[label])) fail('Private image mapping differs from frozen packet.');
    }
    if (privateCase.candidates.a.candidateId === privateCase.candidates.b.candidateId) fail('Duplicate private candidate mapping.');
  }
  return mapping;
}

function validateReport(manifest, report) {
  keys(report, ['schemaVersion','packetDigest','reviewer','cases'], 'report');
  if (report.schemaVersion !== VERSION || report.packetDigest !== manifest.packetDigest) fail('Report is stale or belongs to a different packet.');
  keys(report.reviewer, ['id','independent','visualAccess'], 'reviewer'); safeId(report.reviewer.id, 'reviewer.id');
  if (report.reviewer.id === 'REPLACE' || typeof report.reviewer.independent !== 'boolean' || typeof report.reviewer.visualAccess !== 'boolean') fail('Reviewer identity and explicit independence/visual access attestations are required.');
  list(report.cases, 'report.cases'); unique(report.cases.map(c => c.caseId), 'report case');
  if (report.cases.length !== manifest.cases.length) fail('Report has missing or extra cases.');
  const available = report.reviewer.independent && report.reviewer.visualAccess;
  for (const result of report.cases) {
    keys(result, ['caseId','choice','observations','reason','preserve','uncertainty'], 'report case');
    const c = manifest.cases.find(c => c.caseId === result.caseId); if (!c) fail(`Unknown report case: ${result.caseId}`);
    if (!RESERVED.has(result.choice)) fail(`Unknown choice in ${result.caseId}.`);
    if (!available && result.choice !== 'abstain') fail('Independent visual review unavailable: every choice must abstain.');
    for (const field of ['reason','preserve','uncertainty']) { str(result[field], field, field === 'reason' ? 12 : 3); if (/^REPLACE\b/.test(result[field])) fail('Unfilled response template.'); }
    list(result.observations, 'observations', result.choice === 'abstain' ? 0 : 1);
    const allowed = [...c.candidates.a, ...c.candidates.b].map(i => i.file), cited = new Set();
    for (const observation of result.observations) {
      keys(observation, ['evidence','location','observation','effect'], 'observation'); list(observation.evidence, 'evidence'); unique(observation.evidence, 'evidence filename');
      for (const file of observation.evidence) { if (!allowed.includes(file)) fail(`Unknown evidence filename in ${c.caseId}: ${file}`); cited.add(file); }
      str(observation.location, 'location', 3); str(observation.observation, 'visual observation', 12); str(observation.effect, 'effect', 8);
    }
    if (result.choice !== 'abstain' && allowed.some(file => !cited.has(file))) fail(`Observations must cite all presented images in ${c.caseId}.`);
  }
  return {advisory: ADVISORY, valid: true, available, packetDigest: manifest.packetDigest, reviewer: report.reviewer.id, cases: report.cases.length, abstentions: report.cases.filter(c => c.choice === 'abstain').length, limits: 'Valid structure, hashes and reviewer attestations do not establish truthful inspection, independence or aesthetic correctness.'};
}

export async function check({packet, report, private: privateFile}) {
  await outside(packet, report, 'Reviewer report'); const manifest = await verifyPacket(packet);
  if (privateFile) await verifyMap(privateFile, packet, manifest);
  return validateReport(manifest, await readJson(report));
}

function signature(candidate) { return canonical(candidate.images.map(i => ({view:i.view,sha256:i.sha256,width:i.width,height:i.height,heightMode:i.heightMode ?? null})).sort((a,b) => a.view.localeCompare(b.view))); }

async function collect(bundleFile) {
  const bundle = await readJson(bundleFile); keys(bundle, ['schemaVersion','reviews'], 'bundle');
  if (bundle.schemaVersion !== VERSION) fail('bundle.schemaVersion must be 1.'); list(bundle.reviews, 'bundle.reviews');
  const reviews = [], cases = new Map(), reviewerIds = new Set(), packetDirs = [];
  for (const item of bundle.reviews) {
    keys(item, ['packet','private','report'], 'bundle review'); for (const field of ['packet','private','report']) str(item[field], `bundle ${field}`);
    const resolve = value => path.resolve(path.dirname(bundleFile), value), packet = resolve(item.packet), privateFile = resolve(item.private), reportFile = resolve(item.report);
    await outside(packet, bundleFile, 'Bundle'); await outside(packet, reportFile, 'Reviewer report');
    const manifest = await verifyPacket(packet), mapping = await verifyMap(privateFile, packet, manifest), report = await readJson(reportFile), checked = validateReport(manifest, report);
    if (reviewerIds.has(report.reviewer.id)) fail('Duplicate reviewer ID: repeated votes are not independent reviewers.'); reviewerIds.add(report.reviewer.id);
    const identities = new Map();
    for (const c of mapping.cases) {
      const candidates = Object.values(c.candidates).map(v => ({id:v.candidateId,signature:signature(v)})).sort((a,b) => a.id.localeCompare(b.id));
      const publicCase = manifest.cases.find(v => v.caseId === c.caseId), identity = canonical({brief:publicCase.brief,candidates,rubricSha256:manifest.rubricSha256});
      identities.set(c.privateCaseId, identity);
      if (!cases.has(c.privateCaseId)) cases.set(c.privateCaseId, {identity,candidateIds:candidates.map(v => v.id),votes:[]});
      if (cases.get(c.privateCaseId).identity !== identity) fail(`Stale images, brief, rubric or swapped private identity mismatch for ${c.privateCaseId}.`);
      const result = report.cases.find(v => v.caseId === c.caseId), choice = ['a','b'].includes(result.choice) ? c.candidates[result.choice].candidateId : result.choice;
      cases.get(c.privateCaseId).votes.push({reviewer:report.reviewer.id,choice,publicChoice:result.choice,available:checked.available,packetDigest:manifest.packetDigest});
    }
    reviews.push({reviewer:report.reviewer.id,available:checked.available,cases:[...identities.keys()].sort()}); packetDirs.push(packet);
  }
  const allCaseIds = [...cases.keys()].sort();
  for (const review of reviews) if (canonical(review.cases) !== canonical(allCaseIds)) fail(`Reviewer ${review.reviewer} has a missing or extra comparison case.`);
  // Cross-packet checks prevent a map, report or bundle hidden in another packet.
  for (const packet of packetDirs) for (const item of bundle.reviews) for (const key of ['private','report']) await outside(packet, path.resolve(path.dirname(bundleFile), item[key]), `Bundle ${key}`);
  return {cases, reviews, packetDirs};
}

function summarize(collected) {
  const cases = [...collected.cases].map(([caseId,c]) => {
    const counts = Object.fromEntries([...c.candidateIds,'tie','abstain'].map(v => [v,0])); for (const vote of c.votes) counts[vote.choice]++;
    const active = Object.keys(counts).filter(v => v !== 'abstain' && counts[v] > 0), cast = c.votes.length - counts.abstain;
    const agreement = active.length === 0 ? 'unavailable' : active.length === 1 ? 'unanimous-among-cast-votes' : 'disagreement';
    const majority = active.find(v => counts[v] > cast / 2) ?? null;
    return {caseId,candidateIds:c.candidateIds,counts,cast,abstentions:counts.abstain,agreement,consensus:active.length === 1 ? active[0] : null,majority,votes:c.votes};
  });
  return {schemaVersion:VERSION,advisory:ADVISORY,reviewers:collected.reviews.map(({reviewer,available}) => ({reviewer,available})),cases,disagreementCases:cases.filter(c => c.agreement === 'disagreement').map(c => c.caseId),limits:'Abstentions do not vote. Consensus means agreement among cast votes, with coverage shown separately. Reversed positions are reconciled using private candidate IDs and frozen per-view image hashes. Votes are not ground truth.'};
}

export async function consensus({bundle, out}) {
  const collected = await collect(path.resolve(bundle)); if (out) { for (const packet of collected.packetDirs) await outside(packet, out, 'Consensus output'); await absent(out); }
  const result = summarize(collected); if (out) await writeNew(out, result); return result;
}

export async function calibrate({bundle, labels, out}) {
  const collected = await collect(path.resolve(bundle));
  for (const packet of collected.packetDirs) { await outside(packet, labels, 'Private human labels'); if (out) await outside(packet, out, 'Calibration output'); }
  if (out) await absent(out);
  const human = await readJson(labels); keys(human, ['schemaVersion','labels'], 'human labels'); if (human.schemaVersion !== VERSION) fail('human labels.schemaVersion must be 1.');
  list(human.labels, 'human labels'); unique(human.labels.map(v => v.caseId), 'human label case');
  if (human.labels.length !== collected.cases.size) fail('Human labels have missing or extra cases.');
  for (const label of human.labels) {
    keys(label, ['caseId','choice'], 'human label'); const c = collected.cases.get(label.caseId); if (!c) fail(`Unknown human label case: ${label.caseId}`);
    if (![...c.candidateIds,'tie','abstain'].includes(label.choice)) fail(`Unknown human choice for ${label.caseId}.`);
  }
  const summary = summarize(collected), byReviewer = collected.reviews.map(review => {
    let matched = 0, mismatched = 0, abstentions = 0, humanAbstentions = 0;
    const cases = human.labels.map(label => {
      const vote = collected.cases.get(label.caseId).votes.find(v => v.reviewer === review.reviewer);
      if (label.choice === 'abstain') humanAbstentions++;
      if (vote.choice === 'abstain') abstentions++;
      let outcome; if (label.choice === 'abstain') { outcome = 'human-abstained'; }
      else if (vote.choice === 'abstain') { outcome = 'reviewer-abstained'; }
      else if (vote.choice === label.choice) { matched++; outcome = 'match'; } else { mismatched++; outcome = 'mismatch'; }
      return {caseId:label.caseId,humanChoice:label.choice,reviewerChoice:vote.choice,outcome};
    });
    return {reviewer:review.reviewer,matched,mismatched,comparable:matched+mismatched,reviewerAbstentions:abstentions,humanAbstentions,agreementRate:matched+mismatched ? matched/(matched+mismatched) : null,cases};
  });
  const result = {...summary,kind:'human-label-calibration',humanCases:human.labels.length,byReviewer,limits:'Agreement rates count matching choices only, not aesthetic magnitude or certified quality. Human abstentions and reviewer abstentions are excluded from the denominator and counted explicitly. This sample may be tiny or unrepresentative; calibration does not establish production aesthetic validity or reveal a universal taste rule.'};
  if (out) await writeNew(out, result); return result;
}

const HELP = `Local advisory visual review (Node built-ins only; metadata-free PNG screenshots)\n\nprepare --input cases.json --packet NEW_DIRECTORY --private NEW_MAP.json [--order random|forward|reverse] [--rubric FROZEN_PROMPT.md]\ncheck --packet DIRECTORY --report report.json [--private map.json] [--out NEW.json]\nconsensus --bundle reviews.json --out NEW.json\ncalibrate --bundle reviews.json --labels PRIVATE_HUMAN.json --out NEW.json\n\nKeep maps, reports, bundles and human labels outside every reviewer packet. Reviewers must have fresh independent contexts and inspect the actual images. This CLI invokes no models or network services. ${ADVISORY}\n`;

export async function main(argv = process.argv.slice(2)) {
  if (!argv.length || argv[0] === '--help' || argv[0] === 'help') { console.log(HELP); return; }
  const command = argv[0], required = {prepare:['input','packet','private'],check:['packet','report'],consensus:['bundle','out'],calibrate:['bundle','labels','out']}[command];
  if (!required) fail('Unknown command. Use --help.');
  const allowed = {prepare:[...required,'order','rubric'],check:[...required,'private','out'],consensus:required,calibrate:required}[command], options = {};
  for (let i = 1; i < argv.length; i += 2) { const key = argv[i].replace(/^--/, ''); if (!argv[i].startsWith('--') || !allowed.includes(key) || !argv[i+1] || argv[i+1].startsWith('--') || key in options) fail(`Invalid or repeated argument: ${argv[i]}`); options[key] = argv[i+1]; }
  for (const key of required) if (!options[key]) fail(`Missing --${key}.`);
  let result;
  if (command === 'prepare') result = await prepare(options);
  else if (command === 'check') { if (options.out) { await outside(options.packet, options.out, 'Check output'); await absent(options.out); } result = await check(options); if (options.out) await writeNew(options.out, result); }
  else result = await ({consensus,calibrate}[command])(options);
  console.log(json(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(`visual-review: ${error.message}`); process.exitCode = 1; });
