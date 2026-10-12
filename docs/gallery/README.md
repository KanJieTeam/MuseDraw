# MuseDraw 图集

[在线浏览](https://kanjieteam.github.io/MuseDraw/) · [返回项目](../../README.md)

100 张原创架构图，作为构图与表达的精品参考，可直接浏览、放大、复制提示词或下载源文件。MuseDraw 也可以绘制全新的主题和结构，使用时无需先选案例。

普通使用只需几句话：说清要表达什么、主要内容和给谁看，构图、配色、分组与连线由 MuseDraw Skill 组织。图集中“复制提示词”只复制这样的简短需求，你可以直接改写；案例需求是例子，不保证不同模型与执行环境产生与展示图逐像素相同的结果。

| 文件 | 用途 |
| --- | --- |
| `diagram.drawio` | 在 draw.io / diagrams.net 中改文字、移动模块、调整连线与分组 |
| `diagram.svg` | 原生矢量图，用于网页或矢量设计工具 |
| `diagram.png` | 图片交付与插入文档 |
| `prompt.txt` | 几句话的绘图需求，与页面显示及复制的提示词相同 |
| `design.json` | 结构与设计信息、公开参考链接及 `productionBrief` 高级制作规格；不是用户提示词 |

详情中的“制作参考”可按需下载 `design.json`，供深入研究该案例的结构与制作规格。页面不会默认加载或展示其中的长规格；复制需求也不会附带坐标、色值、画布尺寸或案例编号。

点击“在 draw.io 中编辑”才会加载第三方 diagrams.net 编辑器并传入当前公开案例。保存后下载新的 drawio 文件，不覆盖图集；无需账号。也可下载文件，在本机 draw.io 编辑。

SVG 与 drawio 使用不同的渲染和文本度量，字体与细线可能略有差异。drawio 文件里的文字、模块、父子分组和有向关系都是原生对象，不是整张图片包装。

本图集的原创文件使用 [Apache-2.0](../../LICENSE)。设计参考网站保留其自身权利；本库不分发第三方模板、研究截图或本地研究记录。

本地预览：在仓库根目录运行 `python -m http.server 4173`，打开 <http://localhost:4173/docs/gallery/>。

仓库检查：`python scripts/check.py`。浏览器交互检查另见 `scripts/check_gallery_browser.mjs`。

重新导出：`python scripts/export_drawio.py docs/gallery`；严格对比原生对象与 SVG：`python scripts/check_drawio.py docs/gallery --report output/gallery-structure.json`。导出工具针对 MuseDraw 图集中已声明节点、父域、连线路由的原生 SVG，不是任意 SVG 通用转换器。

在 draw.io 中双击文字编辑；选中模块的边框可整体移动模块及其文字。文字本身也是独立的原生子对象，可以单独调整位置。
