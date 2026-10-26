# Anti-AI checklist · 去 AI 味检查表

Read once before composing a new design and apply it while building the scene.
Unchanged replays and local edits do not require another design pass. This is
composition guidance, not a new QA pipeline: ordinary deliveries keep the
automatic-first policy in SKILL.md, without mandatory image reading, uploads,
OCR or external vision calls. Follow an explicit user style/reference over
these defaults. These rules reduce known failure patterns; they do not certify taste.

## 创作时先判断这些 · Design decisions before drawing

需要表现闭环、对象变化、共用主干、条件对照、局部放大或分层关系时，读
[对象与关系的设计方法](object-composition.md) 中对应一节。它给出可见的表达
办法：让读者看到对象和关系怎样变化，而不是再添加一套配色或装饰卡片。

### 先画关系，再选容器

- **结构来自内容。** 流程先明确起点、分支、回流与终点；跨部门协作先明确
  谁负责哪一步；架构先明确边界、包含与依赖；计划先明确先后、时长和并行。
  把这些关系画出来，再考虑装饰。不能把所有需求都变成「几列卡片＋说明文字」。
- **不是每个节点都需要一张卡片。** 活动、判断、角色、支撑平台、产出可以用
  不同的图形或空间位置表达；一个分组标题加细线，往往就够表达边界。避免
  大框套中框再套小卡片，让读者先看到框架、后费力寻找关系。
- **规整要有依据。** 同级对象可以等宽、等色、对齐；有时间、数量或层级差异时，
  用位置、尺度或分区表达差异。不要为了「不呆板」随机错位、缩放或倾斜。
- **对齐也会暗示关系。** 年度目标可以共享年份列；没有日期的工作线单独组织，
  不因数量恰好相同就排在年份正下方，暗示未给出的逐年安排。已有目标、工作线与
  共同支撑符合 [计划构图](plan-composition.md) 的条件时，可以直接用该方法。

### 让动作落到对象上

- 起笔时先在内部确定「对象 → 操作 → 实际部位 → 可见证据」。例如闸门下降
  应由通道被实体截断表现，数组复制应落到对应单元；不把这行构图要求写进图里。
  已给出实体接触、穿过或容纳关系时，先画使关系成立的轮廓、开口或内外边界。
  纯模块依赖仍可用矩形，不能从一个名称猜测器件或分子结构。
- 用较少细节表现辅助源、读出和背景，让主要操作区清楚；不靠统一放大主体
  决定主次。若问题包含装入、置入、取出、再封装等对象变化，保留读者需要追踪的
  中间状态，不能为了一个大主体把必需过程压成含混的箭头说明。
- 部件引线落到部件，开口标注落到实际空隙，不能落在附近的运输箭头上。
  路径类型可直接标在相应线段旁；图中已经清楚表达时，不再用重复图例争抢注意力。
  内部思路看似正确不等于输出成立，图上的边界、落点和标签仍要与输入事实对应。

### 层级要对应信息，不能靠涂黑制造重点

- 先确定读者先看什么、沿哪里读、最后得到什么。用主路径、分区、空间和字号
  建立层级，再用颜色加强；不要把所有标题和正文都加粗、居中。
- **判断节点不等于视觉主角。** 菱形能放下文字即可，不能因为它是判断就做成
  全图最大的黑色块。重要的共享资源、关键瓶颈或最终产出，才按内容需要突出。
- **图仍然应当像图。** 不要把流程改成网站功能介绍卡片，把架构改成后台
  控制台，把计划改成 KPI 仪表盘。用户要求表格、看板、仪表盘时遵从其需求。

### 配色不是换一套「高级色」

- 不默认给并列模块轮流涂蓝、绿、橙，也不把所有图统一成灰底＋黑块＋单一
  暗色强调。低饱和、莫兰迪色、黑金和渐变都不是审美合格的凭据。
- 每种明显不同的色彩应有作用：区分角色/类别、说明状态、标记一条路径，或
  表达参考作品中成立的层级。同类保持一致；无需区分的地方留给纸面和线条。
  彩色作品可以丰富，克制作品也可以有对比，不用机械限定只能一种强调色。
- 参考已认可作品时，学习整套配合：色彩面积比例、明暗关系、字体粗细、边框、
  容器形态与留白。只抄两个色值、沿用相同卡片，不能迁移作品的审美。
- 质感来自一致的边缘、线宽、间距、对齐和恰当的层叠。确有模块层级或参考
  依据时可用轻微阴影；不要普遍加阴影、纸纹、玻璃效果或伪立体来补救构图。

### 减少文案负担，保留事实

- 节点以短名称或动宾短语为主，例如「财务核对预算」。补充文字只放必要条件、
  数字、责任人或限定。删掉反复解释同一件事的副标题、口号、角标和套话。
- **不靠删事实换简洁。** 保留用户要求的名称、金额、阈值、时间、例外和关系；
  长句可拆成节点与分支条件，不能偷换含义。用户提供占位名称时也要原样保留。
- 名称能在部件或网格内完整读清时，就近放置；不要为了外侧对齐，增加穿过其他
  对象的查找引线。确需长部件标注且原生矢量两侧留空时，可用
  [实测标注排版](callout-layout.md) 换行与排布；空间不足调整构图，不缩字或删名。
  工具只能排文字，标注仍须落在真实部位或开口，不能用运输箭头代替落点。
- 不为了图显得「丰富」虚构指标、技术选型、百分比或政策。没有时长的数据用
  顺序表达；有明确时长再用比例。简短的事实列表也不必硬改成条形图。
- 默认没有图外标题、副标题、图号、Logo、生成工具署名。分区名、泳道角色、
  时间刻度和必要图例属于图内信息，按实际需要保留。
- 不把绘图要求抄回画布。例如「四种状态，同一对象、材料与端点不变」应通过
  状态名、同色材料和对齐的端点表现；不再配一段说明图是怎样画的。公式、载荷
  等标记靠近实际对象或作用箭头，不能作为悬空的装饰。

### 三个失败对照 · What to change, not just what to avoid

| 常见失败 | 应调整的设计 |
| --- | --- |
| 架构图：三排等宽浅灰容器，每个容器再塞相同白卡片 | 按真实边界分组，用层级位置表达支撑关系；减少重复框，显出主干与共享资源 |
| 流程图：所有动作居中直排，一个巨大深色判断节点 | 按实际流向安排分支与汇合；有责任分工就用角色分区，判断节点保持与活动相称 |
| 时间计划：表格每行画同样长的彩条，旁边塞说明段落 | 有时长就按比例、有并行就对齐时间；只有阶段顺序时用阶段路径，不虚构时间轴 |

这些是判断标准，不是三张固定模板。先做一套有内容依据的构图并渲染；不要
在出第一张图之前枚举大量风格、读完整图库或输出一篇设计论证。用真实成图
接受用户判断，不能把自动检查通过写成「审美优秀」。

## The six tells reviewers flag first · 最常被一眼认出的六个 AI 痕迹

Found in our own gallery (OKR tree, onboarding columns) and removed:

1. **Micro-label above every title** — a tiny coloured line (“当前 46/120 · 38%”,
   “核心问题”) stacked on each box. Use a real column header once, or put the
   number where it can be compared (a bar, a big figure).
2. **Middle-dot strings** — “行业标杆客户攻坚 · 销售一部”. Two facts need two
   positions (name left, owner right-aligned), not a separator.
3. **Slogan titles** — “目标拆到人，进度看得见”, “Where the 120,000 go”. A
   figure title names the thing: “2027 年度 OKR 进度”, “PRISMA 2020 flow diagram”.
   Omit page headings by default; add a title/subtitle only when requested.
4. **Numbers without a readable comparison** — align exact values for a short
   summary; use common scales within a unit when magnitude or duration matters.
   Do not invent a percentage, completion track or shared scale for unlike units.
5. **Equal pastel columns** — three identical cards in blue / green / orange.
   If the content has time, use a time axis; if it has rank, use size.
6. **Decorative arrows** — a dashed arrow from a heading down to a box through
   empty space carries no information. Delete it or make it a real dependency.

## Content 内容

- [ ] **No invented filler nouns.** Preserve the user's names, including supplied
  placeholders. When creating a generic example, use specific names and real roles.
- [ ] **Numbers reconcile.** PRISMA, CONSORT, funnels and budgets add up. Say
  “illustrative” next to invented values or briefly in the delivery note; do not
  add an unsolicited subtitle just to label examples.
- [ ] **Every arrow says something.** Verbs or payloads (“写入 WAL”, “OTLP”,
  “5 chunks”), not “调用 / 访问 / 交互” on every line. Unlabelled is fine when
  the legend explains the kind.
- [ ] **The figure makes one clear claim.** Express it through the content and
  relationships; add an in-image subtitle only when the user requests one.
- [ ] **Explain only what needs explanation.** Add a short note when a relation
  would otherwise be misunderstood. Do not manufacture a sidebar of commentary.

## Composition 构图

- [ ] **Not a wall of equal boxes.** Peers may match; different roles and levels
  remain distinguishable. Give emphasis to content, not an arbitrary dark card.
- [ ] **Reading direction is obvious** — left→right, top→bottom, or a loop
  with numbered steps. A stranger can find step 1 in two seconds.
- [ ] **Whitespace is structural.** Remove accidental dead bands and crowding;
  deliberate empty space may give a focal object room. Do not fill it merely to
  satisfy an area quota.
- [ ] **Alignment.** Peers share a baseline or a column; connectors are
  straight where they can be (ports align with the target’s centre).
- [ ] **No orphans.** Every node is connected, grouped or explained.

## Craft 工艺

- [ ] `checks.json` has no warnings — or each remaining one is deliberate.
- [ ] Text is readable at the intended delivery size, after preview scaling.
  Branch guards, role names, supplied actions and units are required content,
  not tiny footnotes. Reflow or increase space before reducing those labels.
  When visual review is requested, use the bounded preview first.
- [ ] Line crossings are few and cross at right angles; no line runs under a label.
- [ ] Colour has meaning; add a legend only where needed to understand encoding.
  Shape and position still carry meaning without colour.
- [ ] Use consistent type for words; a separate code face is optional for
  identifiers. Reuse fonts covering the language; follow SKILL.md runtime reuse
  instead of installing the full font library for design review.

## Tell-tale signs to delete

Gradient blobs behind nothing · icons on every box · drop shadows on flat
styles · rainbow per-box colours · ALL-CAPS everywhere · centred everything ·
“智能 / 一体化 / 全方位” filler · decorative arrows into empty space ·
a logo bigger than the title.
