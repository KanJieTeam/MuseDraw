# MuseCore volcano plot

This original bounded capability renders a differential-result scatter as effect size against `-log10(p)`. It computes the transformed score, threshold lines, quadrant counts, and a small set of labels from supplied records. It does not invent multiple-testing correction, confidence intervals, biological meaning, or causality.

The input is intentionally narrow: 8–160 observations, finite effects in `[-8,8]`, p-values in `[1e-12,1]`, a declared p-value threshold and absolute-effect threshold, and labels of at most 28 characters. The renderer refuses missing direction coverage, unsupported fields, and claims outside the supplied measurements.