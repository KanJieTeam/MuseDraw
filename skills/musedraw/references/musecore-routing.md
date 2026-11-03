# MuseCore 能力路由

路由器先回答“读者要看什么关系”，再选择窄能力。它不读取主题词猜风格，
也不把未知请求静默降级成卡片网格。

```powershell
node skills/musedraw/scripts/musedraw.mjs core route route-input.json
```

最小输入必须声明：

- `readerTask`：读者任务，如 `multi-panel-evidence`、`apparatus-measurement`、
  `swimlane` 或 `timeline`；
- `readerQuestion`：一句可观察的阅读问题；
- `evidenceType`：量化、状态、机制、装置、空间、图像、表格或流程；
- `hasRawData`、`hasSourceAsset`、`hasCoordinates`、`hasSharedSubstrate`：证据事实，
  不由路由器推断；
- `panelCount`、`objectCount`、`labelCount`：用于范围检查。

路由结果有三种：

- `route`：选择一个已有能力族；
- `preserve-source`：源图本身是证据，保留它并只添加受控标注；
- `refuse`：列出越界原因和可行替代路线。

当前路由只承诺选择能力，不替调用者填写内容。比如装置测量没有二维坐标时会
明确拒绝；多面板量化没有原始数据时不会从预览图反推；未知任务不会自动套用
四列卡片。路由通过后仍需运行对应能力的输入契约、浏览器几何审计和目标尺寸
人工审阅。
