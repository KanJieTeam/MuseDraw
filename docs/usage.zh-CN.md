# 使用 MuseDraw

[English](usage.md) · [返回 README](../README.md) · [在线图库](https://kanjieteam.github.io/MuseDraw/)

MuseDraw 是给 AI 智能体的视觉创作 Skill。描述想法、提供资料或选择案例后，智能体按作品需要选择制作媒介，并在对话中继续修改。

## MuseCore 创作路线

主线是**理解需求 → 协同形成作品方案 → 制作与交付**。表达判断、视觉立意、风格编排共同决定内容结构、主视觉、风格语言及素材与媒介分工；不是依次调用三个模型。去 AI 味贯穿判断和制作，草图与加深评审按需使用。项目事实与用户偏好单独保存，候选设计方法经新内容验证后再沉淀到共享资源。完整说明见 [MuseCore](../skills/musedraw/references/musecore.md)。这是 Skill 的创作方法，现有程序只自动执行各自支持的排版、制作与检查，不是任意内容的自动审美引擎。

更新到 0.4.1 后，在**实际安装的 Skill 目录**运行 `node scripts/skill-info.mjs`，应看到 `musecore-2026-10-29.1` 和入口文件哈希。仓库、下载包和宿主安装副本各有自己的文件；只改仓库不会刷新其他副本。更新正在使用的副本后，让智能体重新读取其中的 `SKILL.md` 和相关参考，或在新对话中使用更新版；现有对话不会自动清除记住的旧规则。

## 先按作品选择媒介

- 绘画、摄影感画面、纹理插画或图片编辑：使用宿主提供的图像生成／编辑工具，交付所需图片与制作提示、素材。图像合成能力取决于宿主；缺少该工具不代表 MuseDraw 只能画架构图。
- 网页、UI 和工作界面：制作可运行的 HTML/CSS/JavaScript 或沿用项目现有前端技术，交付源码与浏览器预览。
- 图示、结构化信息图、可编辑科研示意及原生矢量案例：使用 scene 引擎，默认交付 PNG，保留场景源文件与 SVG。

SVG 不是所有作品的必选格式。下面的渲染命令和场景检查适用于第三条路线；其他媒介遵循 [Skill](../skills/musedraw/SKILL.md) 对应的说明。选择图库案例后，使用复制提示中匹配的 Skill，避免沿用旧安装或旧会话中的图示导出指令。

## 安装与开始

需要 Node.js 22+，以及能读写文件、执行命令的智能体。安装一次 Skill，优先复用已有浏览器与运行依赖；缺少运行依赖时仅安装最小集：

```bash
npx skills add KanJieTeam/MuseDraw
npm install --prefix skills/musedraw/output/runtime --no-save --ignore-scripts --no-audit --no-fund --fetch-timeout=15000 --fetch-retries=0 playwright@1.56.0
```

路径以实际 Skill 安装位置为准。最小安装不下载字体和 Chromium；先用 `doctor --json` 检查可复用的运行环境与 Chrome/Edge。RAG 图可直接运行 `quickstart rag --out output/rag --strict`，默认用系统字体，先交付小尺寸 JPEG 预览，再输出高清 PNG，保留场景源文件与 SVG。其他图可在 `render` 后增加 `--font-mode system --preview-first --cache`。新图默认设置 `header: false, footer: false`，标题、图号和署名按需添加；命令行也会默认关闭页眉，只有 `header: true` 才显示标题和副标题。详见[快速出图指南](fast-start.zh-CN.md)。

只有需要官方字形时才运行完整的 `npm --prefix skills/musedraw install`，并选择 `--font-mode bundled`。完整安装包含主题字体并尝试下载 Chromium；系统字体模式需要能显示目标语言的字体，跨机器字形可能不同。

然后告诉智能体：

只需描述内容和风格。渲染、自动检查、交付 PNG 并保留场景源文件已是 Skill 的默认规则，不需要在每条需求后重复；图库复制按钮也只附上案例内容与风格。明确要求其他格式时，以你的要求为准。

默认就是 PNG，并保留 SVG 与场景源文件。
命令参数和执行路线维护在 Skill 内，不拼入复制需求。PNG 由内置引擎直接生成，
使用内置渲染器直接生成图片。

```text
用 MuseDraw 的“科研期刊”风格画一张技术路线图。
科学问题是肝星状细胞代谢重编程如何驱动肝纤维化。
三条研究内容是临床队列、细胞机制、动物验证，最后整合出机制与靶点。
```

也可以画采购审批泳道、课堂流程、OKR、项目甘特或系统架构。说明用途、已知内容与关系即可，不需要自己写坐标、颜色代码或 `scene.json`。真实项目使用你提供的事实；通用示例应明确标注，图中的示例数字不能当作研究结果或实际业务数据。

直接提供仓库 URL 时，智能体应复用已安装的 Skill，或获取仓库并读取[完整 Skill](../skills/musedraw/SKILL.md)。仓库 URL 本身不会给普通聊天网页增加执行能力。MuseDraw 不另行要求模型 API key，宿主自身的访问条件仍适用。

## 复用案例与继续编辑

精品案例直接复用 `scene.json`，按需求修改内容与受影响的模块，保留构图、层级和细节。
参考图片由智能体看图后用场景引擎绘制，不建立识别、转写契约或多源确认流程。
预览用于判断实际设计质量；自动检查只负责版面与文件正确性。

文字修改使用 `patch`，保留原版并输出变更记录，详见[编辑流程](../skills/musedraw/references/editing-workflow.md)。
系统字体、小预览、缓存和分阶段计时已是渲染默认行为。

## 选图和选风格

[在线图库](https://kanjieteam.github.io/MuseDraw/)包含 108 个当前 scene 引擎案例。按风格筛选，点开看大图、复制需求或下载 SVG 与场景 JSON；提示词可切换中文／English，复制与原样复刻说明会跟随语言选择。每个案例目录保留原始 `prompt.md`、完整来源 `scene.json`、SVG 和预览；双语需求见 [prompts.json](../gallery/prompts.json)。案例可借鉴布局，不限定新题材，也不提供你的项目事实。图库区分精选、已审图与待设计审阅的预览状态，不等于全部经过同等人工验收。

20 种风格的字体、线条、质感与标注方式见[风格图谱](../skills/musedraw/references/style-atlas.md)。直接说中文名、英文名或 ID 即可，例如“科研期刊”“商务墨蓝”“黑板教学”或 `blueprint`。未指定时，由智能体根据用途选择。

结构可用树、思维导图、时间线、甘特、矩阵、漏斗、循环、鱼骨、泳道和表格布局块，也可使用时序图或自由图元。智能体按[构图参考](../skills/musedraw/references/composition-patterns.md)与[场景格式](../skills/musedraw/references/scene-schema.md)制作，不需要用户填写内部参数。

## 继续修改与交付

```text
保持研究内容与关系不变，换成水墨宣纸风格。
```

```text
把动物验证移到细胞机制之后，保留其他内容。
```

智能体编辑已有场景，保留无关内容和稳定 ID，再重新渲染。默认交付 `diagram@2x.png`；保留 `scene.json` 供智能体继续修改，`diagram.svg` 作为矢量文件，检查结果写入 `checks.json`。

## 渲染与复刻

以下命令供智能体或开发者使用，`<skill>` 是实际安装目录：

```sh
node <skill>/scripts/musedraw.mjs validate path/to/scene.json
node <skill>/scripts/musedraw.mjs render path/to/scene.json --out output/new-run
node <skill>/scripts/musedraw.mjs render path/to/scene.json --theme 水墨宣纸 --out output/restyled
node <skill>/scripts/musedraw.mjs themes
```

`validate` 仅需 Node.js，无需安装字体或浏览器，也不写入产物。它检查场景结构与引用，错误中包含文件名和 JSON Pointer 字段路径。渲染命令也会在启动浏览器前执行同样的预检；预检通过仍需渲染并读取浏览器检查报告。详见[校验说明](../skills/musedraw/references/scene-schema.md#validate-before-rendering)。

默认输出到场景目录；用 `--out` 指向新目录可保留之前的版本。重渲染会写入该目录中的同名产物，先确认目标。完整仓库可用 `npm run gallery` 重新渲染全部图库。

同一份场景在相同引擎、主题、字体与渲染环境下可重复生成；跨平台字体或抗锯齿可能影响结果。给另一个模型一句话，让它重新理解并设计一张图，是另一项任务，不保证与案例逐像素相同，也不代表任意模型均成功。

没有浏览器时可加 `--svg-only`，并说明 PNG 与浏览器版面检查未完成。正常渲染后读取 `checks.json`，修复警告；自动检查通过、所需文件齐全即可交付小预览与产物，不强制读取完整 PNG、上传 CDN、执行 OCR 或调用视觉模型。只有用户明确要求、反馈可见缺陷或报告中出现无法从场景数据解决的具体问题时，才按需审图，优先使用 `preview.jpg`。自动检查通过不代表已目检、审美验收或事实正确，不能据此宣称“人工视觉检查通过”。

当前不是原始数据统计绘图工具，柱状图、散点图等请使用 matplotlib 或 ggplot。旧小型组件图引擎只作为[兼容路线](semantic-graph.zh-CN.md)保留，新工作使用 scene 引擎。贡献前阅读[贡献指南](../CONTRIBUTING.zh-CN.md)。
