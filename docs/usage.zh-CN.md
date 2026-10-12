# 使用 MuseDraw

[English](usage.md) · [返回 README](../README.md)

MuseDraw 是供现有 AI 智能体使用的 Skill。智能体理解你的需求，Skill 提供架构设计判断、原创案例与文件生成工作流。首版只覆盖软件架构图，但不局限于图集里的 100 个主题。

## 几句话即可开始

```text
用 MuseDraw 画一张客户互动营销应用架构图，突出渠道、活动、内容和消息服务。
通用参考，给产品方案汇报用，简洁、层次清楚。
```

用户提供目标、关键业务与已知关系，MuseDraw 组织构图、配色、排版和连线。不需要坐标、色值或完整节点清单；只有真实系统中缺少关键事实时才澄清。也可以直接给一个图集没有的新主题。

图集的“复制提示词”只是短需求示例，不保证不同模型生成逐像素相同的图。100 个精品案例用于借鉴设计方法；不会要求每张新图匹配一个编号。明确要复刻某张案例时，智能体可按需读取该案例的制作参考，用户仍不必输入制作参数。

## 1. 加载完整 Skill

先给智能体一句自然语言请求：

```text
用 https://github.com/KanJieTeam/MuseDraw 画一张数据中台架构图。
只依据下列事实，输出 PNG 和可编辑 SVG，并说明未完成的检查。
[你的架构需求]
```

智能体需要获得仓库、读取文件、执行工具和写入输出的能力与权限。它应：

1. 读取根目录 [SKILL.md](../SKILL.md)：这是导航入口，不是第二个可安装 Skill。
2. 完整读取 [skills/musedraw/SKILL.md](../skills/musedraw/SKILL.md)：可安装的 Skill 名为 `musedraw`。
3. 保留完整的 `skills/musedraw/` 文件夹，包括参考与脚本。按视图只加载相关参考，在适合时使用辅助工具。

URL 本身不是安装操作，网页摘要也不等于完整 Skill。不要默认普通聊天网页（例如豆包聊天页）具有可写的执行环境。宿主缺少所需工具时，应说明限制，不能声称已经渲染文件。

也可通过 Skills CLI 安装，需要 Node.js 22.20+：

```bash
npx skills add KanJieTeam/MuseDraw
```

交互选择智能体或客户端。CLI 安装的是指令与资源，能否执行仍取决于宿主。

## 2. 给需求材料，而不只给主题

说明读者、组件或能力、分组、已知关系和交付格式；有真实部署资料时再提供实例与网络。参考图片可引导视觉选择，但不能作为当前系统的事实来源。

根据读者的问题选视图：

| 视图 | 回答什么 | 适合的材料 |
| --- | --- | --- |
| 能力架构 | 有什么、归哪里？ | 分层、分组、贯穿支撑 |
| 组件与集成 | 各部分怎样协作？ | 组件、接口、已知交换与边界 |
| 部署架构 | 实际运行在哪里？ | 实例、环境、网络与存储 |

智能体应保留你提供的事实，不补协议、实例数量、性能或技术选型。没有真实系统材料时，请明确要求标为“通用参考”。

例如：

```text
画一张设备巡检软件的组件架构图。
移动端和调度网页使用统一 API；API 访问工单服务和现场记录服务。
两服务分别将结构化记录写入业务数据库；现场记录的照片保存到对象存储。
工单变更投递到消息服务，由通知服务订阅；身份服务校验 API 调用身份。
没有部署实例与网络资料。输出 PNG 和 SVG。
```

可对照[原创示例](../examples/inspection-platform/diagram.png)、[需求说明](../examples/inspection-platform/brief.md)与[检查记录](../examples/inspection-platform/review.md)。它是逻辑组件视图，不是部署图。

## 3. 生成并实际看图

默认交付 PNG 和 SVG，SVG 使用可编辑的原生文字与几何。

需求确实符合固定数据中台能力骨架时，可用内置渲染器；它需要 Python 3.10+，只使用标准库：

```bash
python skills/musedraw/scripts/render_capability.py examples/data-platform/brief.json output/data-platform.svg --theme blue
```

以上命令在仓库根目录运行。该渲染器不是通用拓扑或自动布局引擎。组件、集成和部署视图按实际需求设计原创 SVG，不强套能力表格，也不把模板默认模块加入用户系统。

示例使用中文标签。JSON 中可选的 `portalTitle`、`foundationTitle` 可以覆盖两个默认中文标题；标题应简短并适合所在列宽。其他内容由输入简报决定。

可选的 PNG 导出：

```bash
python scripts/export_png.py output/data-platform.svg output/data-platform.png
```

包装脚本复用已有 Node.js 22+、Playwright 和兼容浏览器，可查找仓库的 `node_modules/playwright`；必要时提供 `--playwright path/to/index.mjs` 或 `--browser path/to/chrome`。可复用已有 Chrome/Edge，不会静默安装缺失依赖。环境不能渲染 PNG 时，智能体应使用其他已有渲染工具，或如实报告缺少的输出与检查。

导出器保留已有 PNG 和检查文件，每次运行请选择尚未使用的输出路径。仅安装 Skill 文件夹时，可能没有仓库根目录的包装脚本；可按 Skill 指令使用内置 `preview.mjs`，或复用宿主已有渲染工具。

智能体应读取预览检查结果，再实际查看全图及放大局部，检查文字、分组、连线端点和穿越。容器边界等项目未检查时，应明确说明。脚本成功退出不代表审美验收，也不能证明架构语义正确。

无需另装 CAD 引擎。MuseDraw 本身不额外要求模型 API key 或 MCP server；宿主智能体自身的访问要求仍然适用。

## 4. 继续调整

仅改视觉时，保持系统内容：

```text
保持组件和关系不变。
降低蓝色饱和度、收紧间距、让分层标题更清楚。
输出更新后的 PNG 和 SVG。
```

改内容时，明确新增、删除或变更哪条关系。智能体按要求修改并重新渲染；SVG 也可进一步编辑。

## 当前范围与检查

首版未实现科研流程和 Python/R 统计图。部署设计指南不等于通用拓扑自动布局。案例检查记录只说明各自完成的检查与限制，不代表客户验收。

仓库验证使用：

```bash
python scripts/check.py
```

贡献修改前请读[贡献指南](../CONTRIBUTING.zh-CN.md)。
