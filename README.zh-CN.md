<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/brand/wordmark-dark.svg">
  <img src="assets/brand/wordmark-light.svg" alt="MuseDraw" width="360">
</picture>

<p><strong>从几句话，到一张可编辑的图</strong></p>
<p>面向 AI 智能体的绘图 Skill。20 种风格，覆盖科研、办公、教学与工程。</p>

<p>
  <a href="https://kanjieteam.github.io/MuseDraw/">在线图库 ↗</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="docs/usage.zh-CN.md">使用文档</a> ·
  <a href="README.en.md">English</a>
</p>

</div>

[![MuseDraw 作品拼贴：24 张案例交错叠放，涵盖架构、流程、教学、科研与工作计划](assets/gallery/readme-showcase.jpg)](https://kanjieteam.github.io/MuseDraw/)

## 快速开始

在支持 Skill、能读写文件并执行命令的智能体中安装：

```bash
npx skills add KanJieTeam/MuseDraw
```

然后描述想画的内容与关系，例如：

```text
用 MuseDraw 的「终端暗色」风格画 GitOps 发布流水线：
提交 → 测试 → 构建 → GitOps 同步 → 灰度发布，标出失败回滚。
```

需要 Node.js 22+、Playwright 与兼容浏览器。智能体会优先复用现有环境；系统字体即可出图。
Git 下载缓慢时可用[轻量 Skill 包](https://kanjieteam.github.io/MuseDraw/downloads/musedraw-skill.zip)，安装细节见[快速出图指南](docs/fast-start.zh-CN.md)。

## 可交付，也可继续改

- **PNG + 原生 draw.io**：文字、图形、连线可逐个编辑；说“只需 PNG”即可跳过 draw.io。
- **保留场景源文件**：后续改内容、换风格，在同一份 `scene.json` 上继续。
- **默认只画内容**：不附加标题或署名；自动检查溢出、碰撞、边界与原生导出。

在图库选风格、复制需求，或下载现成 draw.io。[查看 20 种风格](skills/musedraw/references/style-atlas.md) · [浏览全部 108 例](gallery/README.md)

科研示意新例：[位点对照](gallery/106-site-occupancy/prompt.md) · [薄片转移](gallery/107-material-transfer/prompt.md) · [共享表征](gallery/108-shared-representation/prompt.md)。

## 文档与共建

[使用文档](docs/usage.zh-CN.md) · [快速出图](docs/fast-start.zh-CN.md) · [贡献指南](CONTRIBUTING.zh-CN.md) · [反馈问题或风格需求](https://github.com/KanJieTeam/MuseDraw/issues)

欢迎贡献案例、主题与布局。MuseDraw 面向结构和关系图；原始数据统计图请使用专业绘图库。

[Apache-2.0](LICENSE) · [第三方许可](NOTICE)
