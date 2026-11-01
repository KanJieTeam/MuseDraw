# MuseCore survival curve

This capability renders explicit time-to-event records as a step curve. Each record has a time and an event flag. An event lowers the curve; a false event is shown as a right-censor mark. The model computes risk sets, event counts, censor counts, and median time from supplied records without imputing outcomes or adding confidence intervals.

The input is intentionally narrow: 2–4 cohorts, 4–120 records per cohort, finite nonnegative times, and a shared time unit. The figure rejects unsupported claims and does not infer a population effect, hazard ratio, causal result, or confidence interval.
