# Observed association and separately supplied causal hypotheses

`confounding-panel` retains a black-and-white newspaper composition: line styles and open markers distinguish two traces, while a separate common-cause fork is explicitly a hypothesis.

- Start from `assets/musecore/confounding-panel.json`. Supply two named nonnegative series over two to 24 explicitly ordered periods, with at least two known values per series. Null stays missing and breaks the line.
- The chart shows each column as a percentage of its own observed maximum. Equal height does not mean equal raw values; an all-zero column remains zero. Complete raw input remains in the editable input and metadata.
- Pearson correlation uses complete contemporaneous pairs only. Positive rescaling before the shared statistics calculation avoids underflow for tiny finite values. Insufficient pairs and zero variance leave r undefined.
- The optional three/four-object fork and mediator are supplied illustrative assumptions or hypotheses. Removing the hypothesis expands the chart; it does not silently invent an explanation.
- The crossed direct claim means that these records have not established it. It does not prove absence, conditional independence, adjustment success or an intervention effect.
- No temperature/control-variable data, significance test, uncertainty, time-series causality or automatic causal discovery is generated. In particular, the source example's claim that adjustment makes association disappear is not treated as a calculated result.
- Reject unsupported signed values, malformed provenance, relations or unreadable canvas capacity. Long supported text grows measured space instead of shrinking fonts.

Background on the evidential distinction: [NIST scatter-plot guidance](https://www.itl.nist.gov/div898/handbook/eda/section3/scatterp.htm). Render normally and judge the visible composition independently of numeric and geometry checks.
