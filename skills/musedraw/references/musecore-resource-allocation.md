# MuseCore resource allocation

## 适用范围

`resource-allocation` 只处理横向资源、纵向工作流的显式分配账本。读者要回答：每条工作流用了哪些资源，以及每类资源还剩多少登记容量。资源数和工作流数均为 2–8；每个交叉单元必须提供数值和来源。

模型只计算每类资源的已登记负载、容量减负载后的余量和 `spare / balanced / over` 状态，不推断人员可用性、排班、交付承诺、质量、预测或因果关系。零分配也必须显式登记。

## 路由契约

调用者必须声明 `readerTask: "resource-allocation"`、`evidenceType: "quantitative"`、`hasRawData: true` 和 `resourceKind: "resource-workstream-load"`，并给出 `resourceCount`、`workstreamCount`。不满足这些条件时，路由器拒绝或要求改用自定义表示。

## 输出与复现

输入 JSON 由模型校验后交给 `resource-allocation` 图形族，输出 SVG、PNG 和离线 HTML。图面采用资源列、工作流行、负载条和余量账本；每个单元保留来源，不把余量画成建议。标签过长、数量超范围或存在缺失单元时直接拒绝，不靠缩小字号塞入。

## 视觉检查

先看横向资源列是否仍可比较，再看工作流行的总量和余量是否能回查到单元格。窄屏预览必须允许横向阅读但不能产生浏览器溢出；中文长标签和字体压力不得遮挡或越界。
