# 参与 MuseDraw

[English](CONTRIBUTING.md)

MuseDraw 将视觉创作与设计方法带进 AI 智能体。可以贡献作品、界面、场景、构图方法、设计指导或文档；提供原创案例、完善使用说明，不一定需要编程。

## 从一项具体改进开始

小修正不要求先开 issue；较大的引擎或工作流变更可先讨论。阅读 [Skill](skills/musedraw/SKILL.md)、[场景格式](skills/musedraw/references/scene-schema.md)和[图库](gallery/README.md)，了解当前 scene 主工作流。

按作品选择媒介。绘画可以保留图像与制作提示；界面需要可运行的
HTML/CSS/JavaScript 和浏览器预览，都不必转换成 SVG。说明必要事实、
素材授权、实际工具要求与检查，让其他贡献者能复现工作流；重新生成
图像与复用已保存素材要分别描述。

新增原生场景图库案例时，可复制适合的目录，提供：

```text
gallery/<case>/
  scene.json       # 完整、可编辑的来源
  prompt.md        # 简短自然语言需求与必要事实
  diagram.svg     # 渲染的原生矢量图
  preview.jpg     # 渲染的图库预览
```

使用主引擎渲染，全尺寸 PNG 和 `checks.json` 用于本地审阅。不能用无法从场景复现的手工精修图片替代渲染结果。内容使用具体名词，说明性数字标为示例数据。图库区分待审预览和已逐张审图的案例状态。

## 渲染、看图、检查

需要 Node.js 22+。首次安装 Skill 的字体和 Playwright；安装还会尝试下载 Chromium，需要相应网络与安装权限：

```sh
npm --prefix skills/musedraw install
node skills/musedraw/scripts/musedraw.mjs render gallery/<case>/scene.json
python -m pip install -r requirements-ci.txt
python scripts/check.py
```

完整回归检查需要 Python 3.11+，以及 `requirements-ci.txt` 锁定的绘图和图片依赖。
CI 在两个操作系统和 Pages 验证前都会显式安装，不依赖 Anaconda 或运行器预装包。
CI 中 Matplotlib 使用无界面的 Agg 后端。

共享引擎或主题改动影响全部图库时，使用 `npm run gallery`。渲染会写入案例中的生成文件，需要保留旧版本时先另存。运行 `node skills/musedraw/scripts/musedraw.mjs themes` 可查看风格列表。

实际查看全尺寸 PNG、密集局部和预期缩小尺寸。阅读 `checks.json`，在送审前修复全部警告，包括文字溢出、碰撞、连线标签压框、节点重叠和超出画布。核对事实、数字一致性、连线端点，并使用[视觉检查表](skills/musedraw/references/anti-ai-checklist.md)。仅改风格时保留内容与关系。程序运行成功不等于审美验收。

离线 Python 检查与浏览器渲染是不同环节。使用 `--svg-only` 时，必须说明 PNG 与浏览器检查未完成，不能当作完整图示验收。不为贡献调用付费服务。

## 审阅与贡献边界

在 PR 中说明问题、修改后行为与实际完成的检查。首次贡献可使用中文或英文，不要求双语。新工作流应具备可运行路径、案例与相应验证。旧小型组件图工具是兼容路线，新图库使用 scene 引擎。

贡献应由你原创，并有权按 [Apache-2.0](LICENSE) 授权。公开可见不等于可再分发；引入模板、截图、专有素材或作者文案前，需确认适用授权并注明来源。不把私有数据、凭据或本机绝对路径带入场景、需求和资产。

重渲染已有场景与模型理解新需求应分别描述；不能据此承诺任意模型准确率、跨平台逐像素一致、token 节省或超过其他工具。只报告实际环境与完成的检查。

分支使用 `feat/`、`fix/`、`docs/`、`test/`、`refactor/` 或 `chore/` 等前缀，名称不得包含 `codex`，不区分大小写。这只限制分支命名，不禁止准确说明 Codex 客户端。

## 图库缩略图维护

列表使用已提交的 WebP 小图，文件名带内容哈希。弹窗先显示小图，再后台升级为
大预览；用户点击“高清”后才加载 SVG，原始下载文件保持不变。
修改图库 `preview.jpg` 后，维护者安装 `Pillow==12.3.0`，运行
`npm run gallery:previews`，提交生成的 `assets/gallery/previews/` 与
`previews.json`。普通场景绘图不要求 Pillow；完整仓库回归会安装它，执行图片检查。
检查会核对源图哈希，防止修改案例后继续使用旧缩略图。

README 合集维护：`npm run readme:showcase` 重建 1920×1080 交错叠放的照片拼贴及其源图哈希记录，使用同一可选 Pillow 依赖。
