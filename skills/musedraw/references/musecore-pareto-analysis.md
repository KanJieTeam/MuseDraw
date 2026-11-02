# Pareto analysis

`pareto-analysis` is a bounded view for one explicitly supplied additive category set. It keeps the caller's category order, draws the supplied values as bars, and calculates a cumulative share line from those values. A declared `targetShare` is a reading reference only; it is not a quality threshold, recommendation, causal claim, or forecast.

Use it when the reader needs to see both the size of each recorded category and where the cumulative total reaches a declared reference share. Do not use it for unrelated populations, causal attribution, severity ranking, or values that cannot be added on one unit scale.

Required fields:

- `family: "pareto-analysis"`
- `title`, `subtitle`, `categoryLabel`, `valueLabel`, `unit`, `dataStatus`, `note`
- `targetShare` strictly between 0 and 1
- `items`: 3–16 objects with unique IDs, labels, nonnegative `value`, and `source`

The model refuses a zero total, duplicate IDs, unsupported fields, missing source traceability, negative values, or more than 16 categories. The renderer does not silently sort, group, or invent an “other” category. Add that category explicitly if it exists in the input.

The demo is synthetic and should be treated as a layout example, not a measured result:

```text
node scripts/musecore.mjs render skills/musedraw/assets/musecore/pareto-analysis-demo.json --out output/pareto-analysis
```

Inspect the bars, line, labels, source mapping, and note at the delivery size. The generated checks expose the total, cumulative values, target line, and each source traceability record.
