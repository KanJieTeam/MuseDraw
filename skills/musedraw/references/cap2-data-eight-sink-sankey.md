# Eight explicit Sankey detail nodes (candidate)

The source d06 has three income sources, one monthly income node, three amount
groups and **eight** expense/savings detail nodes. All 15 node identities,
14 paths and amounts are supplied in its SVG. The existing model limit of
seven nodes in a column rejects this complete input, despite the already
available measured Sankey layout being able to allocate the required height.

This candidate reuses that model, exact decimal conservation and measured
layout. Its shared-file patch makes only two changes: the per-column maximum
becomes eight, and any eight-node column chooses the existing measured route.
It does not change the default legacy branch, raise the total node/edge limits,
add inferred paths or balance a missing amount. A ninth node still refuses.

The source fixture `assets/musecore/cap2-data-household-sankey-source.json`
retains all 15 nodes and 14 amounts. Each amount is printed explicitly in the
source; no undisclosed individual records or coordinate-decoded quantities are
introduced. Income and all final sinks independently sum to 18,000 yuan.
6,800 yuan fixed expenses is 37.8%, and 3,300 yuan savings is 18.3%; the source
headline's 38% and 18% are rounded whole percentages and stay labelled as such.
These remain supplied example data, not a real financial finding.

The existing measured route recalculates common band width, text bounds,
label tracks and page size. It still refuses below-resolution bands, invalid
topology, unmatched node amounts, excessive text or canvas limits. All its
other declared boundaries remain in force. Fonts never shrink to force eight
detail labels into the old fixed height.

```sh
node tests/musecore/cap2-data-eight-sankey-harness.mjs assets/musecore/cap2-data-household-sankey-source.json output/eight-sinks
node --test tests/musecore/cap2-data-eight-sankey.test.mjs
```

The harness applies the two source changes in browser memory only, until shared
integration. No new production module, bundle order or family registration is
needed. The fixture uses existing `sankey` / `amountFlowFamilies`.
`MUSECORE_CAP2_SANKEY_OUTPUT` records full test artifacts and
`MUSECORE_NOTO_FONT` supplies a local Noto Sans SC TTF for browser-only testing.
Tests cover exact independent integer flow accounting, 15 actual SVG nodes,
14 actual bands, common amount scale, port partitions, changed names/amounts,
system/Noto normal/+40 metrics, nine-node/imbalance refusals and exact legacy
SVG/PNG compatibility. These checks do not confer aesthetic approval or claim
a complete reproduction of the original's visual placement.
