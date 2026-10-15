# 使用 MuseDraw

[English](usage.md) · [返回 README](../README.md) · [图库](../gallery/README.md)

MuseDraw 是给 AI 智能体的专业绘图 Skill，覆盖科研、办公、教学与工程图示。当前主工作流是 scene 引擎：智能体理解几句话的需求，选择构图和风格，生成场景，渲染并实际看图后默认交付 PNG 与原生可编辑 draw.io。

## 安装与开始

需要 Node.js 22+，以及能读写文件、执行命令的智能体。首次安装 Skill，并在安装后的 `skills/musedraw/` 目录安装字体与渲染依赖：

```bash
npx skills add KanJieTeam/MuseDraw
npm --prefix skills/musedraw install
```

第二条命令中的路径以实际 Skill 安装位置为准；在仓库根目录执行时可直接使用以上路径。安装包含开源字体、Playwright，并尝试下载 Chromium，需要网络和相应安装权限。后续绘图可复用安装结果。

然后告诉智能体：

```text
用 MuseDraw 的“科研期刊”风格画一张技术路线图。
科学问题是肝星状细胞代谢重编程如何驱动肝纤维化。
三条研究内容是临床队列、细胞机制、动物验证，最后整合出机制与靶点。
```

也可以画采购审批泳道、课堂流程、OKR、项目甘特或系统架构。说明用途、已知内容与关系即可，不需要自己写坐标、颜色代码或 `scene.json`。真实项目使用你提供的事实；通用示例应明确标注，图中的示例数字不能当作研究结果或实际业务数据。

直接提供仓库 URL 时，智能体应复用已安装的 Skill，或获取仓库并读取[完整 Skill](../skills/musedraw/SKILL.md)。仓库 URL 本身不会给普通聊天网页增加执行能力。MuseDraw 不另行要求模型 API key，宿主自身的访问条件仍适用。

## 选图和选风格

[图库](../gallery/README.md)包含 100 个当前 scene 引擎案例，每个目录有一句话需求 `prompt.md`、完整来源 `scene.json`、SVG 和预览。案例可借鉴布局，不限定新题材，也不提供你的项目事实。图库区分精选、已审图与待设计审阅的预览状态，不等于全部经过同等人工验收。

20 种风格的字体、线条、质感与标注方式见[风格图谱](../skills/musedraw/references/style-atlas.md)。直接说中文名、英文名或 ID 即可，例如“科研期刊”“商务墨蓝”“黑板教学”或 `blueprint`。未指定时，由智能体根据用途选择。

结构可用树、思维导图、时间线、甘特、矩阵、漏斗、循环、鱼骨、泳道和表格布局块，也可使用时序图或自由图元。智能体按[构图参考](../skills/musedraw/references/composition-patterns.md)与[场景格式](../skills/musedraw/references/scene-schema.md)制作，不需要用户填写内部参数。

## 继续修改与交付

```text
保持研究内容与关系不变，换成水墨宣纸风格。
```

```text
把动物验证移到细胞机制之后，保留其他内容。
```

智能体编辑已有场景，保留无关内容和稳定 ID，再重新渲染。默认交付 `diagram@2x.png` 和原生可编辑的 `diagram.drawio`；`scene.json` 与 `diagram.svg` 作为来源与矢量辅助保留，检查结果写入 `checks.json`。PNG 保留纸张纹理、模糊与发光等视觉效果；draw.io 提供可编辑图形、文字与关联边，不承诺所有效果与 PNG 完全一致。

## 渲染与复刻

以下命令供智能体或开发者使用，`<skill>` 是实际安装目录：

```sh
node <skill>/scripts/musedraw.mjs render path/to/scene.json --out output/new-run
node <skill>/scripts/musedraw.mjs render path/to/scene.json --theme 水墨宣纸 --out output/restyled
node <skill>/scripts/musedraw.mjs themes
```

默认输出到场景目录；用 `--out` 指向新目录可保留之前的版本。重渲染会写入该目录中的同名产物，先确认目标。完整仓库可用 `npm run gallery` 重新渲染全部图库。

同一份场景在相同引擎、主题、字体与渲染环境下可重复生成；跨平台字体或抗锯齿可能影响结果。给另一个模型一句话，让它重新理解并设计一张图，是另一项任务，不保证与案例逐像素相同，也不代表任意模型均成功。

没有浏览器时可加 `--svg-only`，并说明 PNG、原生 draw.io 与浏览器版面检查未完成。不要把 SVG-only 输出视为已看图验收。正常渲染后应打开 PNG，阅读 `checks.json`，修复文字溢出、碰撞、连线标签压框、节点重叠和越界等警告，再检查事实、连线与[视觉清单](../skills/musedraw/references/anti-ai-checklist.md)。脚本成功不等于审美验收。

当前不是原始数据统计绘图工具，柱状图、散点图等请使用 matplotlib 或 ggplot。旧小型组件图引擎只作为[兼容路线](semantic-graph.zh-CN.md)保留，新工作使用 scene 引擎。贡献前阅读[贡献指南](../CONTRIBUTING.zh-CN.md)。
