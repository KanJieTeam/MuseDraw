# Categorical comparison and explicit small samples

Use `categorical-bars` for category/series values and `sample-summary` for
actual individual observations. A histogram, arbitrary score table or an
assessment workflow is not automatically the same input structure.

`categorical-bars` accepts 2–10 explicit categories and 1–3 named series.
Positive, negative and missing values retain their meaning. Series share one
zero baseline and scale; negative bars extend to the other side. `null` remains
missing rather than becoming zero. Optional tally marks are counted strokes,
not unquantified texture. Labels, rows and bar geometry are measured together;
unknown categories, unsupported fields and text overflow refuse.

`sample-summary` accepts 1–4 groups, 1–24 observations per group and at most
60 entries overall. Observations are finite values within ±1,000,000 or `null`;
every group needs at least one observed value. Compute observed/missing counts,
sum, mean, median, extrema and optional explicitly directed threshold counts.
The threshold denominator excludes missing entries. Do not reconstruct people,
measurements or a distribution from an aggregate mean. Weights are unsupported.

The `groups` view plots individual observations on a shared scale and puts
summary markers on their own tracks. Repeated values remain separate points.
The `balance` view requires a single nonnegative group with 2–8 entries and at
least two observations; surplus/deficit and each transfer come from the real
mean. Transfer amounts conserve total quantity. Display rounding never changes
the underlying arithmetic or silently converts an approximate equality into
an exact one. Do not use this small-sample view for inferential statistics.

```sh
node scripts/musedraw.mjs core example sample-summary --out output/sample.json
node scripts/musedraw.mjs core render output/sample.json --out output/sample
```

Pure calculations live in `category-models.mjs` and `sample-models.mjs`. Keep
the finished image and editable input/source; inspect both data encoding and
appearance, with aesthetic acceptance separate from mechanical test success.
