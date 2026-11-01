# MuseCore forest plot

`forest-plot` is a bounded scientific figure for comparing several explicitly supplied effect estimates with interval endpoints. Each row carries a source string so the rendered mark can be traced back to the input record. The reference line is supplied by the caller; the model does not assume zero is meaningful.

The renderer uses a horizontal interval, a square at the estimate, and an optional square-size weight. It does not label an interval as a confidence or prediction interval, does not pool rows, and does not infer heterogeneity, multiplicity, causality, or clinical meaning. If those claims are needed, the input must supply and label them in a different capability.

Accepted input is narrow: 4–24 rows; each row has a unique id, short label, finite `estimate`, `low <= estimate <= high`, and a non-empty source. `weight` is display-only. Unsupported fields, missing traceability, inverted intervals, non-finite numbers, or out-of-range text are rejected.

```powershell
node scripts/musedraw.mjs core render skills/musedraw/assets/musecore/forest-plot-demo.json --out <new-directory>
node --test skills/musedraw/tests/musecore/forest-plot.test.mjs
```
