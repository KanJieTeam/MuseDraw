# 同哈希的可选取模迁移对照

沿用 `hash-ring`，不增加新的环算法 family。原默认输入没有 `moduloComparison` 时保持原 SVG/PNG；节点/键/选中键和固定32位教学哈希不变。

构成参考源105一致性哈希；原SVG SHA-256：`3881cb3403fca9cfed82a348ddb5d6a6c7921332bda8fbb9f20128aacd55eb43`。原作者说明每节点8虚拟点、24键、MD5前32位与筛选种子k12，给出加入D后环6迁移、mod3→4有20迁移；这是特选样本而非平均结论。完整原始key-ID/编码/generator未随case SVG/说明提供，不反解像素或搜索ID来凑6/20。新 `hash-ring-modulo-comparison.json` 明确为合成教学输入，保留现教学哈希与每节点3虚拟点，实际计算3/12与10/12，不声称源MD5复现。

可选字段：

```json
"moduloComparison": {
  "beforeOrder": ["A", "B", "C"],
  "afterOrder": ["A", "B", "C", "D"],
  "note": "完整调用者比较注记"
}
```

缺省关闭；显式null、空对象、未知字段拒绝。两份顺序必须准确列出相应状态每个物理节点ID各一次，不自动按颜色/标签排序。数组从0索引；保留节点相对顺序须不变，新增可明确插入任意位置、删除可来自任意位置，同时重排保留节点超出本范围。note为1–300 Unicode字，根note与比较note完整保留，超排版预算退出。

原范围仍为每状态2–5物理节点、恰一次加入或移除、1–4虚拟点/节点、4–24唯一标识键。独立 `hashModuloComparisonModel` 也验证这些前提，不接给定迁移数、用户坐标、MD5、复制、容量权重或失败探测。

两策略共用每键同一个固定uint32教学哈希：环取顺时针第一个虚拟点，取模计算 `hash % beforeOrder.length` 与 `hash % afterOrder.length` 后映射到物理ID。比较物理ID判断迁移，不把余数索引相同误认物理节点相同。逐键保留哈希、两种前后节点、余数索引与两个迁移布尔；汇总分母始终是同一键总数，完整整数分数不伪造相等百分比。0迁移、相等、环迁移更多均允许；不推数据字节、耗时、均衡保证或生产性能优势。

可选构成保留原双环、键角度与选中标记，中心仅显示真实加入/移除事件和箭头；两策略迁移数在下方并列，避免环数重复压过取模。全部逐键证据增加取模前后归属；完整顺序和两份注记可读，实际字体度量控制换行，固定字号，不删键或缩字号填版。

验证包括1000次独立BigInt哈希/最短顺时针模距离/直接除法余量oracle、加入/删除/中间插入与移除、0迁移、相等和环4/4而取模0/4反例。边界ID是显式筛选的合成测试夹具，不是来源样本或总体平均。正式测试只经 `editorHtml/MuseCore.render/audit`，核对真实物理归属、完整文字、标记与计数，普通/+40分别检查。独立Skill无gallery时仅来源hash检查明确skip，其他测试必须执行。audit不代表审美批准。

教学哈希仍为FNV-1a over UTF-16 code units再固定avalanche混合，不是密码哈希或生产分区器。顺时针所有权/虚拟节点背景见 [Dynamo原论文](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)，本能力不复现Dynamo完整架构。源105 reported6/20来自本地原稿说明，不将其作为新计算的性能保证。

repo外证据：`outputs/musecore-consistent-hash-gap-runtime-20261031` 保留原源/旧CLI、真实范围拒绝、scratch契约、首稿、独立oracle、普通/+40和最终生产/Noto/兼容记录。开发候选与正式registry证据区分。
