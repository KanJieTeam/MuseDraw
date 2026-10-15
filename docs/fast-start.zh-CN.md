# 快速出图与故障定位

首次出图不必下载整套字体。优先复用已有 Playwright 和 Chrome/Edge；
系统字体模式保留主题的纸张、配色、线条和布局，字形可能与官方字体不同。
系统需要有能显示目标语言的字体，例如中文环境中的宋体、微软雅黑或思源字体。

## 中文 RAG 图：一条命令

```sh
node skills/musedraw/scripts/musedraw.mjs quickstart rag --lang zh --out output/rag --strict
```

这个入口使用 Skill 自带的场景，不依赖仓库图库或再次克隆。
默认没有标题、副标题、图号或项目署名；节点名称、分区和图例保留。
图号、标题和署名只在用户要求时添加。
模板描述文档与问题共享向量索引的通用工作流，未加入示例延迟、向量维度、
候选数量或数据库产品。用户提供不同事实时，应先修改场景再交付。

流程会打印阶段耗时，并在高清 PNG 前生成最大 1200×1000 的 `preview.jpg`。
先打开这个小预览，避免高清纸纹 PNG 超出聊天预览大小限制。
最终文件为 `diagram@2x.png`、原生可编辑 `diagram.drawio` 和 `checks.json`；
`run.json` 记录本次命令的阶段耗时，不包含智能体读文档或模型思考的时间。

再次运行会保留现有 `scene.json`，不会用模板覆盖用户修改。
系统字体模式下默认校验缓存：场景、渲染代码、浏览器或字体环境变化会使缓存失效；
任何输出文件被改动或缺失也会重新渲染。`--no-cache` 可强制刷新。

## 先探测，再安装最小运行依赖

```sh
node skills/musedraw/scripts/musedraw.mjs doctor --json
```

探测不会联网、安装软件或启动浏览器。已有模块可以通过
`--playwright <模块入口>` 或 `MUSEDRAW_PLAYWRIGHT` 指定，
已有浏览器可以通过 `--browser <可执行文件>` 或 `MUSEDRAW_BROWSER` 指定。
自动查找优先使用已安装的 Playwright Chromium，再找常见路径下的 Chrome/Edge。

缺少 Playwright 时，在仓库根目录安装最小运行依赖：

```sh
npm run setup
```

它禁用安装脚本，不下载 Chromium，也不安装主题字体。
若官方 npm 源不可达，可仅对这次最小安装指定镜像，不修改全局配置：

```sh
npm install --prefix skills/musedraw/output/runtime --no-save --ignore-scripts --no-audit --no-fund --fetch-timeout=15000 --fetch-retries=0 --registry=https://registry.npmmirror.com playwright@1.56.0
```

如果本机没有兼容浏览器，需要单独准备 Chrome/Edge 或 Playwright Chromium。
最小安装设置每次网络请求 15 秒超时且不自动重试，避免空闲连接耗尽等待时间；
这不是整个安装过程的总时限。网络受限时明确更换源或复用现有依赖。
不要用 `--svg-only` 的成功代替 PNG 和原生 draw.io 的验收。
需要严格复现官方字形时，再运行 `npm run setup:fonts`，并选择 `--font-mode bundled`。

## 自定义图与标题开关

```sh
node skills/musedraw/scripts/musedraw.mjs render scene.json --font-mode system --preview-first --cache --strict
```

新建场景使用 `"header": false, "footer": false`，关闭页眉并收紧顶部空白。
需要内置标题时设置 `header: true`，填写 `title`，必要时再填 `subtitle` 或 `figure`。
署名只填写用户指定的 `footer` 文本。渲染命令不会自动加主题署名；
原有明确填写的图号和署名仍会保留。`autoFit: false` 会保留用户指定坐标。

快速入口仍运行实际字形版面检查、静态 SVG 安全检查和原生 draw.io 导出。
预览是便于快速查看的小图，细小文字请在高清 PNG 中检查。
缓存和自动检查都不能代替审图、事实核对或真实编辑器中的编辑验收。
