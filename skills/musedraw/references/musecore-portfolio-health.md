# Portfolio health map

`portfolio-health` is a bounded office view for one question: **which workstreams are in which phase and supplied health state, and what should be checked next?**

The caller supplies 2–5 ordered phases, 2–4 health states (each explicitly tagged `stable`, `watch`, `blocked`, or `unknown`), and 1–16 workstreams. Every workstream must name its phase, health state, owner, next milestone, signal, and integer `dueDay`. `todayDay` is the comparison origin; overdue and “14 days” labels are calculated mechanically.

The composition is a phase-by-health map with a checkpoint rail. Rows are phases; columns are supplied states; cards remain in their declared cell. The renderer does not infer health, priority, risk, causation, progress, or staffing from words. A cell may contain at most four workstreams; overflow is rejected so the caller can split the view or choose a list.

Use another family for a risk likelihood × impact matrix, a single-question operational dashboard, a period × capacity gap, a decision register, or a dependency schedule. This family outputs SVG and PNG through the existing browser runtime.
