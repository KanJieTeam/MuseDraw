# 2027 年度 OKR 目标树

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 商务墨蓝 · Enterprise Navy (`enterprise`) |
| 状态 Status | 精选 · flagship |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「商务墨蓝」风格画年度 OKR 目标树：新业务收入由 1.2 亿增至 2.4 亿元，下接四个关键结果，再接具体举措与负责团队。保留当前完成度、风险状态和 50% 时间标记，以黄紫分支区分目标组。

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/16-okr-tree-enterprise/scene.json
```

`scene.json` 保存内容、布局与本例的配色及模块样式。默认交付 PNG 和原生可编辑 draw.io。
示例中的数字与机构设定用于说明；按自己的事实替换内容即可。图面默认不显示页眉、图号或署名。

The scene preserves content, layout and this case's local visual tokens. Its default exports are PNG and native editable draw.io. Example values are illustrative.
