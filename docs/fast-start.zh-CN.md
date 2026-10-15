# 快速出图与故障定位

执行路线统一维护在 [Skill 开头](../skills/musedraw/SKILL.md)，仓库内的智能体
也会从 [AGENTS.md](../AGENTS.md) 进入同一工作流。用户只需描述内容、风格和
格式偏好，不需要把安装命令、导出参数或验收清单写进每条提示词。

## 只需 PNG

在需求里加一句“只需 PNG”，或点击图库的“快速 PNG”。智能体会在内部选择：

```sh
node skills/musedraw/scripts/musedraw.mjs quickstart rag --lang zh --out output/rag --no-drawio --strict
```

其他图使用 `render scene.json --font-mode system --preview-first --cache --no-drawio`。
它跳过原生对象采集与 draw.io 序列化，仍运行浏览器版面检查并生成 PNG、小预览与
场景源文件。默认模式仍交付双文件；同目录已有的 drawio 不会被删除，也不会被
当作本次更新结果交付。切回默认模式时会重新导出，PNG 模式的缓存不能代替双文件缓存。

PNG 直接由内置 scene 引擎渲染，不依赖 draw.io 网页、桌面软件或第三方导出包。
`checks.json` 的 `drawio.durationMs` 记录实际原生导出耗时；PNG 模式记录跳过原因。
跳过此步骤通常不会省下数分钟，智能体绕路查资料、安装工具和重复审图才需要优先排查。

同一份 Skill 会同时讲快速路径与自定义构图。内置 RAG starter 应直接运行，
不需要先读 scene schema、style atlas、主题 JSON 和导出源码；后面的自定义教程
不应变成这条路径的前置步骤。`v0.3.0` 或“今天拉取”也不能证明当前副本含最新修复，
应核对上游提交，并更新宿主实际加载的 Skill 副本。
如果任务仍耗时数分钟，把任务总耗时与 `run.json` 的阶段计时分开看；
渲染只用数秒时，剩余时间应在宿主推理、安装或工具调用中继续定位。

## 首次使用不必克隆图库

优先复用已安装的当前 Skill。缺少引擎时可下载
[轻量 Skill ZIP](https://kanjieteam.github.io/MuseDraw/downloads/musedraw-skill.zip)，
对照[构建信息](https://kanjieteam.github.io/MuseDraw/downloads/musedraw-skill.json)中的
SHA-256 后解压到专用 Skill 目录。包中保留全部主题、引擎、参考文档和 starter，
不含图库、Git 历史、字体和运行依赖；字体仍可选，运行依赖按需最小安装。
Git 克隆失败一次后应切换下载路径，避免反复后台重试、清目录或全局终止 Git。
下载包随在线图库的主线部署更新，manifest 提供来源提交和归档校验值；
主线刚合并而 Pages 尚未部署时，下载包会暂时落后于主线。

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
