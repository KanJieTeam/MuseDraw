<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/brand/wordmark-dark.svg">
  <img src="assets/brand/wordmark-light.svg" alt="MuseDraw" width="360">
</picture>

<h3>专业绘图助手</h3>

<p>把专业配图的设计方法，带进你的 AI 工作流。</p>

<p>
  <a href="https://github.com/KanJieTeam/MuseDraw/actions/workflows/check.yml"><img src="https://github.com/KanJieTeam/MuseDraw/actions/workflows/check.yml/badge.svg" alt="Repository checks"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-24292f?style=flat-square" alt="Apache-2.0"></a>
</p>

<p>
  <a href="#快速开始">快速开始</a> ·
  <a href="https://kanjieteam.github.io/MuseDraw/">图集</a> ·
  <a href="docs/usage.zh-CN.md">使用指南</a> ·
  <a href="#参与共建">参与共建</a> ·
  <a href="README.en.md">English</a>
</p>

</div>

---

MuseDraw 是一个开源专业绘图 Skill。将构图、配色、排版和图片制作流程带入你熟悉的 AI 智能体，用于技术方案、产品表达与科研配图，在原有对话中完成绘图与修改。

## 快速开始

安装 Skill，按提示选择你的客户端：

```bash
npx skills add KanJieTeam/MuseDraw
```

安装后，直接告诉智能体：**使用 MuseDraw，根据这份系统说明绘制架构图。** 随后附上资料、图的用途和风格要求即可。

几句话就能开始，构图、配色和排版由 MuseDraw 组织。图集是设计参考，不是模板题库；新的行业、内容与结构也可以画，无需提供坐标或逐个模块的绘制参数。

通过上述命令安装需要 Node.js 22.20+，以及具备文件读写与工具执行能力的智能体。绘图与 PNG 导出的运行条件见[使用指南](docs/usage.zh-CN.md)。

## 当前能力

| 视图 | 适合表达的内容 |
| :--- | :--- |
| 能力架构 | 功能分层、能力分组、贯穿各层的支撑体系 |
| 组件与集成 | 软件组件、接口、已知交互关系与系统边界 |
| 部署架构 | 已提供的实例、环境、网络及存储边界 |

交付 **PNG 图片与 SVG 源文件**。可以继续通过对话调整内容、构图和视觉风格；只改样式时，保留已确认的信息与关系。

[浏览 100 张原创架构图](https://kanjieteam.github.io/MuseDraw/)：放大查看、复制提示词，下载 PNG、SVG 或可逐个编辑的 drawio 文件。

当前可安装的技能为 [`musedraw`](skills/musedraw/SKILL.md)。科研方法、实验流程、算法示意与 Python/R 数据绘图是后续方向，尚未作为技能发布。

## 设计方法

- **信息优先。** 先确定读者、内容与关系，再选择视图和构图。
- **克制表达。** 用层级、留白与有限的强调色组织信息。
- **看图再交付。** 渲染后检查文字、边界和连线，不只检查生成代码。

## 参与共建

欢迎工程师、科研工作者、产品人员、设计师与开发者参与。可以改进设计规则、完善制作工具，或贡献一个从输入到图片交付的专业绘图工作流。

[阅读贡献指南](CONTRIBUTING.zh-CN.md) · [提出问题与建议](https://github.com/KanJieTeam/MuseDraw/issues)

首次贡献可以使用中文或英文。提交前运行 `python scripts/check.py`；涉及图的修改还需要实际看图。

## 开源许可

[Apache-2.0](LICENSE) · [品牌标识](assets/brand/README.md)

引入第三方素材时，请确认授权并注明来源。
