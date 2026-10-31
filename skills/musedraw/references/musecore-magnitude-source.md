# 从原子到可观测宇宙：给定的长度尺度

`atom-to-observable-universe.json` 使用现有 `magnitudes` family。来源为 `gallery/collections/visual-cases/151-orders-of-magnitude/source.svg` 中写出的 11 个近似值；不从原图像素反推数据，不替换六单位默认 `magnitudes.json`。

|对象与所指长度|原稿给定值，m|范围与精度|
|---|---:|---|
|氢原子直径|1 × 10⁻¹⁰|量级示例；不是原子的硬边界|
|病毒尺寸|1 × 10⁻⁷|原稿未指定物种和量取方向，仅为尺寸示例|
|红细胞直径|7 × 10⁻⁶|近似值|
|沙粒尺寸|1 × 10⁻³|原稿未指定粒形和量取方向，仅为尺寸示例|
|人的身高|1.7|示例，不是人口统计平均值|
|珠穆朗玛峰雪面高程|8.849 × 10³|保留 SVG 的整米近似值；说明文的 8848.86 m 不被伪装为同一精度|
|地球平均直径|1.27 × 10⁷|直径，非半径；源给近似值|
|日地平均距离|1.5 × 10¹¹|距离，非轨道直径或某一时刻的间距|
|1 光年|9.46 × 10¹⁵|距离单位，非时间|
|银河系直径|9.5 × 10²⁰|所选教学近似，不定义所有银河系边界|
|可观测宇宙直径|8.8 × 10²⁶|源给近似，非整个宇宙大小或最新精确估计|

全部使用 `approximate: true`；图中 `≈` 与注释承担近似限定。所有点按 `log10(value)` 使用同一轴尺度定位；标签可避让，数值点不随标签移动。横向距离不表示对象的实际长度。标题按实测宽度在 57–150 px 范围调整，保持原 57 px 排版的行数上限；字框控制后续位置与画布。这里覆盖给定长度的对数比较，不声称原作品全部构成已复刻。

核对依据：

- [IUPAC：Bohr radius](https://goldbook.iupac.org/terms/view/B00693)：约 5.29 × 10⁻¹¹ m；两倍半径仅支持氢原子直径的量级示例，不建立硬边界。
- [OpenStax：病毒形态与分类](https://openstax.org/books/biology-2e/pages/21-1-viral-evolution-morphology-and-classification)：病毒的大小、形态存在变化，100 nm 不能推广到所有病毒。
- [OpenStax：红细胞](https://openstax.org/books/anatomy-and-physiology/pages/18-3-erythrocytes)：典型直径约 7–8 μm。
- [USGS：sand](https://apps.usgs.gov/thesaurus/term-simple.php?code=1011&thcode=2)：沙粒是粒径范围，1 mm 是范围内示例。
- [中国外交部：2020 珠峰高程公告](https://www.mfa.gov.cn/gjhdq_676201/gj_676203/yz_676205/1206_676812/xgxw_676818/202012/t20201208_9301006.shtml)：8848.86 m 雪面高程，取整米为原 SVG 的 8849 m。
- [PAGASA：地球平均直径](https://www.pagasa.dost.gov.ph/learnings/faqs-and-trivias)：约 12742 km；[NASA：Earth facts](https://science.nasa.gov/earth/facts/) 给出日地平均距离约 1.5 亿 km，并区分地球赤道直径。资产保留源给的近似精度。
- [NASA：光年](https://science.nasa.gov/exoplanets/what-is-a-light-year/)：距离单位，约 9.46 万亿 km。
- [NASA：银河系的大小](https://science.nasa.gov/universe/exoplanets/our-milky-way-galaxy-how-big-is-space/)：约十万光年宽。
- [NASA：How Big Is Space?](https://www.nasa.gov/science-research/astrophysics/how-big-is-space-we-asked-a-nasa-expert-episode-61/)：区分可观测宇宙和未知的整个宇宙；源给 8.8 × 10²⁶ m 作为其自身的近似值保留。
