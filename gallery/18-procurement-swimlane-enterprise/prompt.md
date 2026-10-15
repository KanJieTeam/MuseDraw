# 采购审批跨部门泳道图：协作矩阵

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 商务墨蓝 · Enterprise Navy (`enterprise`) |
| 状态 Status | 精选 · flagship |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「商务墨蓝」风格画采购审批跨部门泳道图：五个角色沿横向八阶段协作，显示预算退回、超过 5 万元加签、发货验收和三单匹配付款。用紫色阶段栏、粉色操作块和浅灰泳道区分层级。

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/18-procurement-swimlane-enterprise/scene.json
```

`scene.json` 保存内容、布局与本例的配色及模块样式。默认交付 PNG 和原生可编辑 draw.io。
示例中的数字与机构设定用于说明；按自己的事实替换内容即可。图面默认不显示页眉、图号或署名。

The scene preserves content, layout and this case's local visual tokens. Its default exports are PNG and native editable draw.io. Example values are illustrative.
