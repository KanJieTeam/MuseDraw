# 名次变化（rank-shift）

`rank-shift` 用于比较同一组事项在两个明确提供的评审时点的名次变化。每条线连接同一事项的两个名次；较小的数值位于更高位置。蓝色表示名次前移，赭色表示后移，灰色表示不变。

它只计算 `beforeRank - afterRank`，不从名次推断分数、原因、胜负、建议或第三个时点。两个时期的名次必须完整、唯一且使用同一组对象；并列名次、缺失时点和需要因果解释的内容应退出该 family。

```bash
node scripts/musedraw.mjs core render skills/musedraw/assets/musecore/rank-shift-demo.json --out <new-directory>
node --test skills/musedraw/tests/musecore/rank-shift.test.mjs
```

适用场景包括项目优先级复评、候选事项排序变化和阶段性运营榜单。`source` 字段逐项保留输入出处，便于回查；示例数据仅用于演示读法。
