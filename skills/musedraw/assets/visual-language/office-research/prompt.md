# 科研配对观察

使用 MuseDraw 的 Journal / 科研期刊 风格制作一张 1800×1200 的横版报告页。

左图保留编号与配对关系，右图以相同行序比较变化量。只陈述读数，不添加因果或显著性推断。

具体数字、日期、单位和原始顺序见同目录 `data.json`。全部为虚构演示数据，保留这一说明。先看 `preview.jpg`，再结合 `index.html` 与 `study.css` 使用。标题是可修改的编辑判断，换数据时须重新核实；生成脚本只重新计算数值摘要，不替作者验证标题结论。

从已安装 Skill 的根目录重建：

```sh
python scripts/build_office_report.py assets/visual-language/office-research/data.json --out output/research-report
```

使用全新输出目录。文字和布局通过 HTML/CSS 修改，图表通过数据及 Python 绘图代码修改。用浏览器等待字体与图表加载后，截取 `.report` 元素导出 PNG。原始数据、计算结果与图表文件均保留；不要求图像生成服务。需可用的 Python/Matplotlib 和中文字体，字体替换后检查换行。此构图用于短报告页，密集段落或不同读图问题应调整布局。
