# Annual metro operating rhythm

Use the optional `annual` branch of `family: "metro"` for an explicitly supplied annual plan. The existing categorical metro branch remains3–7 ordered categories and is unchanged. This view does not infer task dependencies, resolve recurrence rules, optimize schedules or certify execution.

`annual-operating-rhythm.json` is a **new synthetic monthly plan**. Its ordinary task names and month assignments are not recovered original records. The visual composition references [192 source](../../../gallery/collections/visual-cases/192-operating-rhythm-metro/source.svg) and its [author notes](../../../gallery/collections/visual-cases/192-operating-rhythm-metro/author-notes.md). Only the four explicitly documented review dates, four business-line identities and Gregorian weekday-count check are reused as bounded source facts. The source's omitted tasks cannot be reconstructed.

## Input and refusal boundary

Top-level fields: `family: "metro"`, nonempty `title`, `subtitle`, `annual`, `note`. Do not combine `annual` with categorical `stages/routes/sharedStages`. Unknown fields and explicit null objects are rejected.

`annual` requires:

- `year`: Gregorian integer1600–9998. No current date is used. The model reuses `gregorianYear` for actual month lengths and leap-year validity.
- `months`: exactly12 objects `{month,label}`, explicitly enumerating1…12 in order. All supplied labels are preserved.
- `weekdayRule: "mon-fri-only"`: count every Monday–Friday civil date. These are not statutory working-day counts. No holidays, shifted workdays, location, time zones or daylight-saving assumptions are introduced.
- `basis: {kind,source}`: kind is `synthetic-plan` or `caller-supplied-plan`; source is a required provenance/limitation description. A supplied plan is not evidence of an event having occurred.
- `routes`:2–4 objects `{id,label,color,events,note?}`, with distinct IDs and explicit six-digit hex colors. Each route has0–24 ordinary events, at most2 per month. An event is `{id,month,label,note?}`; its precision is **month**, and the normalized `day` remains null. No exact day, intramonth order, duration or dependency is inferred.
- `reviews`:0–6 objects `{id,label,date,routeIds,note?}`. Each explicitly names all displayed route IDs; subset-participation meetings are outside this bounded composition. At most one review per month category is supported; split views for denser plans. Dates are exact valid `YYYY-MM-DD` strings in the selected year or immediately following January. Dates are supplied, never inferred from a quarterly label.

Title/subtitle/note budgets are90/180/300 characters. Route IDs and labels are at most40, optional route note90; event ID and label40, optional event note60; review ID40, label50, optional note90; month label24; basis.source220. All supplied text is rendered without truncation. Measured output exceeding8000px height is refused with a request to split views. These are readable-composition bounds, not limits on real calendar or organizational behavior.

## Drawing semantics

The year and12 labeled month categories remain explicit. A month with a shared review reserves additional room for its convergence bay, so category widths and intramonth offsets are **layout space, not elapsed-time or day positions**. The page always prints “月内位置仅排版”. Nodes are computed on their actual route polyline; they do not stay at an obsolete straight baseline near a bend. Colored lines identify work streams. A shared capsule means all displayed lines participate in a supplied alignment event; it is not a prerequisite edge, critical path, handoff or indication of task order.

A next-January review gets its own dashed context column and full date/year. It is excluded from the selected year's twelve weekday bars and total. Bars have one true zero baseline and a common count domain0–23. Each bar is an exact per-month Monday–Friday count, not a15-minute or pixel approximation.

The source author explicitly documents these dates:2027-04-05,2027-07-05,2027-10-04 and **2028-01-03**. All are Mondays. For2027 the monthly counts are21,20,23,22,21,22,22,22,22,21,22,23, totaling261. The source ordinary tasks have no explicit exact dates, duration records or dependency edges. Their source pixel positions are not converted into asserted day records. The new synthetic asset states this provenance directly.

`annualMetroModel` is a pure coordinate-free function. `renderAnnualMetro` measures complete text and expands route envelopes and review space; it does not shrink event text below20px to preserve a fixed page. Arbitrary inputs carry `compositionReference: "192-operating-rhythm-metro"`, not a claim that their facts came from that source. Geometric validation is not aesthetic approval or evidence that a real plan is feasible.
