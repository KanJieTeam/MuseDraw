# Claim trace

`claim-trace` is a bounded scientific/report composition for a reader who needs to inspect **what is claimed, which declared sources bear on it, and which limits remain** in one view.

## Accepted input

- `claims`: 3–8 explicit claims. Every claim declares `level` (`observed`, `inferred`, or `hypothesis`), a short label and detail, plus 1–3 explicit `limits` entries. Each limit points to a declared source ID.
- `sources`: 3–12 declared source records. A source has a `kind` (observation, experiment, review, model, dataset, protocol, record, measurement, or image), a status (`direct`, `indirect`, or `missing`), and a supplied detail.
- `links`: 3–32 explicit claim-to-source relations. The relation is `supports`, `contradicts`, `qualifies`, or `unclear`; the family never changes it into a causal arrow.
- An observed claim needs at least one direct supporting source. A detail containing Arabic numerals needs a direct source relation. Values are supplied by the caller and never computed by the family.
- Causal claims are out of scope. A hypothesis can be shown as a hypothesis and must retain a limitation; it is not promoted to a conclusion.

## What the page means

The left column lists the claim and its epistemic level. The middle column repeats the linked source records with source kind, status and declared relation. The right column keeps each claim's limitation and its source pointer visible. Arrows show the supplied registration relation only; they do not assert causality, confidence, correlation, completeness or evidence quality.

Source IDs and statuses are input records. The renderer does not verify authenticity, merge duplicate studies, estimate a number, or convert missing sources into negative evidence.

## Refusal cases

The model refuses missing claim links, unknown source or limit IDs, duplicate IDs, unsupported relation or source kinds, causal levels, observed claims without direct support, unsupported numeric details, overlong text, and more than eight claims. Split the report or choose a quantitative plot, evidence matrix, or causal design only when the input facts satisfy that other family's scope.

Run `node skills/musedraw/scripts/musecore.mjs example claim-trace-demo --out claim-trace.json` to copy the original fictional demonstration. Render with `node skills/musedraw/scripts/musecore.mjs render claim-trace.json --out out/claim-trace`.
