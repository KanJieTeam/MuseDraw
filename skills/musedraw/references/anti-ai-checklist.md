# Anti-AI checklist · 去 AI 味检查表

Use this for requested design review or new gallery/style publishing. It is not
a required step for every drawing: ordinary deliveries use the automatic-first
policy in SKILL.md, with no mandatory image-reading or external vision call.
Every item is something the old MuseDraw gallery did and readers recognised
instantly as generated.

## The six tells reviewers flag first · 最常被一眼认出的六个 AI 痕迹

Found in our own gallery (OKR tree, onboarding columns) and removed:

1. **Micro-label above every title** — a tiny coloured line (“当前 46/120 · 38%”,
   “核心问题”) stacked on each box. Use a real column header once, or put the
   number where it can be compared (a bar, a big figure).
2. **Middle-dot strings** — “行业标杆客户攻坚 · 销售一部”. Two facts need two
   positions (name left, owner right-aligned), not a separator.
3. **Slogan titles** — “目标拆到人，进度看得见”, “Where the 120,000 go”. A
   figure title names the thing: “2027 年度 OKR 进度”, “PRISMA 2020 flow diagram”.
   Save the argument for the subtitle, and say it as a fact.
4. **Quantities written as text** — progress, durations and shares belong on a
   scale: bars with a time marker, a day axis, a proportional width.
5. **Equal pastel columns** — three identical cards in blue / green / orange.
   If the content has time, use a time axis; if it has rank, use size.
6. **Decorative arrows** — a dashed arrow from a heading down to a box through
   empty space carries no information. Delete it or make it a real dependency.

## Content 内容

- [ ] **No placeholder nouns.** No “服务A / 模块甲 / 业务系统 / 数据节点 / Service 1”.
  Real names, real tools, real roles. A generic example is still specific.
- [ ] **Numbers reconcile.** PRISMA, CONSORT, funnels and budgets add up. Say
  “illustrative” next to invented values or briefly in the delivery note; do not
  add an unsolicited subtitle just to label examples.
- [ ] **Every arrow says something.** Verbs or payloads (“写入 WAL”, “OTLP”,
  “5 chunks”), not “调用 / 访问 / 交互” on every line. Unlabelled is fine when
  the legend explains the kind.
- [ ] **The figure makes one clear claim.** Express it through the content and
  relationships; add an in-image subtitle only when the user requests one.
- [ ] **Something explains why.** A margin note, a numbered step list, a
  callout: one or two sentences a person would actually say.

## Composition 构图

- [ ] **Not a wall of equal boxes.** Size, weight or tone shows what matters;
  at most one or two focal elements (`accent`).
- [ ] **Reading direction is obvious** — left→right, top→bottom, or a loop
  with numbered steps. A stranger can find step 1 in two seconds.
- [ ] **Whitespace is structural.** No dead band under the header, no empty
  quarter of the canvas, no boxes crammed against a zone edge.
- [ ] **Alignment.** Peers share a baseline or a column; connectors are
  straight where they can be (ports align with the target’s centre).
- [ ] **No orphans.** Every node is connected, grouped or explained.

## Craft 工艺

- [ ] `checks.json` has no warnings — or each remaining one is deliberate.
- [ ] Text at the intended display size is readable (look at `preview.jpg`
  at 50 %). Body ≥ 12 px at 1×.
- [ ] Line crossings are few and cross at right angles; no line runs under a label.
- [ ] Colour has meaning and a legend. Grayscale still reads (try `newsprint`).
- [ ] One type family for words, one for code/identifiers. No fake bold, no
  mixed CJK fallbacks (install fonts with `npm install`).

## Tell-tale signs to delete

Gradient blobs behind nothing · icons on every box · drop shadows on flat
styles · rainbow per-box colours · ALL-CAPS everywhere · centred everything ·
“智能 / 一体化 / 全方位” filler · decorative arrows into empty space ·
a logo bigger than the title.
