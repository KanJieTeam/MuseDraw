# Scene 主工作流与旧组件图兼容

MuseDraw 当前面向科研、办公、教学与工程，主入口为 [Skill](../skills/musedraw/SKILL.md) 和 [100 案例图库](../gallery/README.md)。使用方法见[使用指南](usage.zh-CN.md)。新图使用 scene 引擎，不再以旧两种组件风格定义当前能力。

## 当前场景引擎

[musedraw.mjs](../skills/musedraw/scripts/musedraw.mjs) 读取 `scene.json`，结合 20 种主题生成原生 SVG、2× PNG、预览与版面检查。智能体负责理解事实、选择图型、构图与强调；引擎负责字体、颜色、线条、质感和图形渲染。

场景可以组合布局块、时序图和自由图元。[场景格式](../skills/musedraw/references/scene-schema.md)与[风格图谱](../skills/musedraw/references/style-atlas.md)说明可用字段和风格；图库中的每个案例都提供场景与短需求，不需要为每个业务另写绘图脚本。

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/59-nsfc-roadmap-journal/scene.json --out output/roadmap
node skills/musedraw/scripts/musedraw.mjs themes
```

同一份场景、引擎版本、主题、字体与渲染环境可重渲染。案例场景的重做，不等于任意模型只凭短需求都会推理出相同构图。版面检查也不证明研究结论、业务事实或审美已验收。

## 旧组件图路线

[render_graph.mjs](../skills/musedraw/scripts/render_graph.mjs) 仅为已有小型组件图用户保留，具体格式与限制见[旧图工作流](../skills/musedraw/references/graph-workflow.md)。其 `document.json`、`flow` / `planes` 和两种旧风格属于该兼容接口，不能直接当作新引擎的 scene 格式或 20 种主题。

旧路线的节点改名、增删组件和关系等操作仍面向已有文档。新图、图库案例及新风格选择均使用 scene 引擎；旧验证结果不自动构成新引擎或全部新案例的模型验收结果。
