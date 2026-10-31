# Scopes, representations and coordinate correspondence

Read only the section matching the relationship. These recipes extend the
[scientific atlas](scientific-atlas.md); they do not prescribe a new palette,
require another review pass, or infer scientific facts from a paper's appearance.
Use existing native objects, paths and connectors. The examples below describe
composition, not new scene fields or automatic physics/layout capabilities.

## A boundary changes what belongs to an analysis

An analysis boundary expresses **membership**, not necessarily a physical wall.
List the supplied members of each scope before placing its outline. Keep the
process objects and their forward route in one shared arrangement; a narrower
scope must not move or duplicate the process merely to fit another rectangle.
Put the scope name on its boundary rather than inside an extra process node.

For example, suppose a brief supplies `source → convert → deliver → use`, with
one analysis ending at delivery and another including use. The distinction is
the inclusion of `use`, not two differently coloured copies of the pipeline.
Draw return investments and outgoing losses as their actual separate relations.
An accounting outline is not another material-flow arrow.

Use native `zones` or outline `paths` around the declared members, with ordinary
connected edges for the process. Prefer a bracket when a large enclosure would
obscure the spine. On a membership-only edit, change the outline and its name;
leave the process, ports and other routes in place. These primitives do not
automatically calculate set membership or conserve an energy budget.

For a **physical region**, position carries a stronger claim: a reaction or
transport path must stay in its stated layer, and a cross-boundary path must
meet the named interface. Draw shared interfaces once when constructing adjacent
regions; independently shaped ribbons can leave false gaps or overlap. Current
`layers` and `laminate` do not automatically register arbitrary geological wedges,
asymmetric sections or an orthogonal view. Use supplied geometry with native
paths; do not substitute a material stack for an unrelated accounting scope.

Source studies: [analysis boundaries](https://www.nature.com/articles/s41560-024-01518-6/figures/1),
[spatial process regions](https://www.nature.com/articles/s41561-025-01678-4/figures/3).
A weighted Sankey is a different argument: quantities, not just membership,
determine its ribbon widths and require supplied data.

## A representation changes while element identity persists

Decide whether the operation preserves elements, aggregates them or creates new
ones. For a reorder/reshape, write a short element mapping first: for example,
`[[p,q],[r,s]] → [p,r,q,s]`. Preserve those identities and their encodings in both
views. If a feature or value changes, distinguish that change from position.
Matching colours alone are insufficient when two elements have the same value.

Use `tensor` for explicit arrays and native cells/text for a mapped sequence.
Keep an authoring map of source element IDs to destination positions; array
terminals are indexed by position, so a second tensor does not automatically
inherit semantic element identity. Draw correspondence only where it is needed
to follow the operation. Do not connect every cell with a line if matching short
IDs already make the mapping clear. A reshape arrow denotes a representation
operation, not a physical movement or a new graph bond.

For iterative graph computation, separate **topology**, **attached features** and
the **active update scope**. Put a small feature glyph beside its actual node;
show the nodes/edges used in that iteration without adding bonds to carry feature
labels. Repeat the supplied graph geometry and change only the named active set
or feature values. An architecture with several update rounds is not evidence
that every node updates in every round. Current `graph`/`tensor` objects can be
combined manually; they do not infer an update schedule or implement a general
per-node feature attachment API.

Source studies: [token representation changes](https://www.nature.com/articles/s42256-024-00864-0/figures/1),
[layered graph representations](https://www.nature.com/articles/s41524-026-02048-3/figures/1).
Continuous physical fields are a counterexample: a categorical cell grid must
not imply discrete classes or measured resolution that the model never supplied.

## Supplied values share coordinates, not necessarily a colour scale

For a small, explicitly supplied value grid within an explanation, keep row and
column identities and orientation fixed across views. Map the values through a
declared range before assigning cell fills. Comparable raw panels share that
range; a signed difference has its own scale and a meaningful zero. A red/blue
palette alone does not establish that values are signed. Keep supplied fixed
bounds even when one panel does not reach them; do not independently normalise
each panel to make it look more dramatic.

Compute a difference only where both operands are known numbers. Preserve a
missing input as missing in the result, rather than replacing it with zero or
removing its row or column. In JavaScript, check for `null` before subtraction:
numeric coercion otherwise turns it into zero. Give missing cells a separate
neutral mark and legend, distinct from the numerical zero colour. Coverage,
uncertainty and exclusion are different quantities; blank space does not tell
you which one applies.

Use native cell nodes with explicit fills and labels. For a compact missing
mark, `label: "× NA"` keeps the mark and text in the same exported cell group;
an independent overlaid path does not automatically move with that cell.
Choose readable text against the actual cell fill. These are authoring choices:
`tensor` accepts explicit colours, but does not calculate numerical scales,
propagate missingness or validate the arithmetic. Real statistical charts and
continuous fields still need their source data and an appropriate plotting
backend.

Source studies: [expression and signed synergy](https://www.nature.com/articles/s41592-023-02040-5/figures/4),
[distinct quantities and colour legends](https://www.nature.com/articles/s41587-022-01636-0/figures/4).
Their visible encodings are references, not reusable measurements or inferred
missing-value definitions.

## Two coordinate domains refer to the same event

An apparatus has spatial coordinates; an energy diagram has an energy direction;
a measured response has its own axes. They can share identities without sharing
geometry. Place the actual event in its own domain, then mark its corresponding
feature in the other domain. Use thin non-directional guides for correspondence,
distinct from a beam, force, transition or signal arrow. A short matching event
ID can replace a guide that would cross unrelated objects.

Use supplied energy levels, event IDs or response positions. Do not generate a
smooth spectrum to complete the composition when no spectrum was supplied. The
engine has no dedicated energy-level or calibrated-response object: native paths
can draw an explicitly specified schematic; empirical curves need source data.
For an overview that truly shares geometry, use the [detail method](scientific-details.md)
instead of claiming this cross-domain association is a magnified crop.

For interval comparisons with compatible units, keep one shared axis and map
every supplied endpoint through that axis. Show the changed bound directly;
do not stretch each row to the same width. Pattern or a local outline can mark
an interval category without recolouring the entire panel. If calibration or
units differ, do not imply a common numerical scale.

Source studies: [transition and spectral correspondence](https://www.nature.com/articles/s41566-024-01395-1/figures/3),
[operating-window comparison](https://www.nature.com/articles/s41893-023-01237-y/figures/1).
These sources supply visual methods, not reusable levels, peak shapes, physical
laws or performance claims.


### Sankey 与 CPM 的数值域

`sankey` 金额与 `critical-path` 持续时间以输入 Number 的规范十进制表示（`String(value)`，含指数表示）为给定值，不恢复 JSON 原始词法或猜测计算表达式。内部用共同十进制整数尺度核账和正逆推：`0.1`、`0.2` 的合计与 `0.3` 相等；显式给定的 `0.30000000000000004` 与 `0.3` 不相等。整数域不容许差一单位；不以总金额或总工期放大的 epsilon 抹去可表达差异。

输入金额、持续时间及金额聚合/项目时刻不得超过 `Number.MAX_SAFE_INTEGER`，超过时明确拒绝，避免不安全整数和 Infinity 进入图形。CPM 返回的 ES/EF/LS/LF/float 从同一精确结果转为 Number；只有精确零总时差为关键任务，关键边还必须满足前项精确 EF 等于后项精确 ES。输出仍受 Number 表示与显示格式精度限制；不增添业务上的“近关键”阈值。其余依赖域仍为给定 DAG 的完成→开始、零滞后关系，不支持日历、资源约束或 SS/FF 等类型。Sankey 只核验给定金额的守恒，不从预算推执行实际、资金来源追踪或审批状态。

若派生 CPM 时刻或余量转回 Number 后不能无损保留其规范十进制值，也明确拒绝（例如接近最大安全整数时再加 0.1），不让正余量变成 0。极小的正持续时间、工期、余量与轴刻度如经既有格式化变为 0，关键路径分支改用完整指数串；不缩字号，不修改通用数字格式器。
