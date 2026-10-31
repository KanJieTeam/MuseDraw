# Declared threshold bands

Experimental family `threshold-bands` carries the `o09-nianxiujia` reader task:
locate an input threshold interval and read its supplied amount. The existing
monthly `leave-plan` construction answers a separate question and remains intact.

Call `node scripts/cap2-tierband.mjs input.json --out output/thresholds` from the
installed Skill root. This additive CLI reuses the existing browser engine and
writes input JSON, native SVG, PNG, checks and an offline editable page. The
normal registered route is also available:
`node scripts/musedraw.mjs core render assets/musecore/cap2-leave-thresholds.json --out output/thresholds`.

Inputs contain title, subtitle, inputUnit, outputUnit, a two-number display
domain, 1–6 bands, conditions (0–5 supplied statements), sourceText, note, and
optional probes (at most 12). Each band has id, label, min, max, amount, color,
and note. Numbers are nonnegative, at most 100000, with up to two decimals.
`max: null` explicitly means an unbounded final upper endpoint. Every interval
is `[min, max)`: lower inclusive, upper exclusive. Bands must arrive in order
and cannot overlap. Every supplied band must intersect the displayed domain.

Each probe has id, label, value, and note. Matching checks the supplied full
rules even when the input lies outside the displayed domain. An unlisted range
returns `amount: null`; an explicit zero amount returns zero. No omitted rule
is filled or extrapolated. Complete supplied labels and notes are displayed.
The program does not infer eligibility, authority, legal entitlement, accrual,
proration or missing exceptions from an interval hit.

The horizontal position and width preserve the supplied numeric input scale.
Bar heights share one zero-based amount scale. Unknown ranges use a pale
background and question mark; an explicit zero uses a coloured baseline.
Continuation chevrons distinguish a clipped display range from a finite rule.
Actual font ascent and descent determine page height and label rows. A band
too narrow for its amount at fixed reading size explicitly rejects; change the
domain or representation, never the data or font size.

The source fixture preserves the original author's declared bands and text as
a source adaptation, not a verification of current law. A library-points
transfer fixture tests new content, fractional thresholds, a true zero, a rule
gap and an out-of-view lookup. Tests and PNG self-review do not establish
aesthetic approval or complete source reproduction.

Exports: `cap2TierBandModel`, `cap2TierBandFamilies`, `cap2RenderTierBands`.
Bundle the model and figure after svg/visual-tools/equation-figures and before
runtime. Register only the new family. Provenance metadata names a
`compositionReference`; it does not assign the source case to new caller facts.
