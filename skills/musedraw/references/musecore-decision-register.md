# 决策登记册（decision-register）

用于跨团队评审、产品取舍、合规例外和运营排班等“需要有人在某个时间点做出明确决定”的工作面。输入保留每条决定的 `status`、`owner`、`dueDay`、`impact`、`confidence` 与 `nextStep`；图形只做机械派生：逾期当且仅当 `status !== decided && dueDay < todayDay`。

数据契约：`decisions` 允许 0–12 项；状态只能是 `proposed`、`decided`、`blocked`；影响和信心是 0–100 的整数，0 是有效值。`todayDay` 与 `dueDay` 是相对整数偏移，不解释成自然日、工时或优先级。空册仍渲染三列并显示空状态。

```sh
node scripts/musedraw.mjs core render skills/musedraw/assets/musecore/decision-register-demo.json --out output/decision-register
```

拒绝边界包括：未知字段、重复 id、缺少责任人或下一步、非法状态、非整数或超出 0–100 的分数、超过 12 条记录。图形不从标题推断优先级，不把影响分数当作排序依据，也不把相对天数改写成具体日期。
