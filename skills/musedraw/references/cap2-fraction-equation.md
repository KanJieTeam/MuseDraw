# Constant-denominator affine equation lesson (candidate)

`fraction-equation` covers the actual T03 reader task missing from the existing
integer `equation-balance` family: native stacked fractions, a computed least
common multiple applied to every term, signed distributivity, equivalent
transposition, coefficient collection, nonzero division and substitution into
the original fractions. Existing integer algebra tiles remain a separate,
correct construction.

Supply a real-domain Latin variable and one or two terms on each side. Each term
has explicit `sign` (+1 or −1), integer `a` (−9..9), `b` (−18..18), constant integer
`denominator` (1..12), and complete `label`/`note`. The numerator is `a*x+b`;
text is never evaluated. Title (90), subtitle (180), variable meaning (100),
term label (25), term note (120), and final note (300 characters) are bounded.
Unknown fields, zero or variable denominators, nonlinear powers and excess terms
refuse. No input silently changes its algebra or drops caller text.

The exact rational helpers are reused. All five steps recompute; coefficient
cancellation produces an explicit identity or no-solution branch and never
attempts division by zero. Caller term notes are annotations, not trusted
algebra. The fixed explanatory rows are derived from supplied structure.

All native fraction numerators, denominator baselines, bars, prose rows and
canvas height use actual font ascent/descent. Fractions occupy a single original
formula row; each derived formula must fit one line at the declared type size.
A formula exceeding the bounded width refuses instead of splitting algebra or
shrinking type. Prose balances within its bounded line capacity.

Metadata uses `compositionReference`, without claiming arbitrary changed content
is a source replay. The sample has source coefficients and reproduces its five
algebra steps; the source circle, exact whitespace and hand-drawn curves are not
reproduced. No aesthetic approval is inferred from automated geometry checks.

For independent preview:
`node skills/musedraw/scripts/cap2-fraction-render.mjs input.json --out directory`.
Use `--noto font-file` or `MUSECORE_NOTO_FONT` to embed Noto SC/CJK. The browser
test requires actual Noto via that generic variable, its legacy alias, or a
standard installation path, and fails clearly when absent; it never skips.

The normal registered route is:
`node scripts/musedraw.mjs core render assets/musecore/cap2-fraction-equation.json --out output/fraction-equation`.
The model/figure modules and normal runtime registration are included. `cap2-fraction.test.mjs` verifies independent BigInt
rational arithmetic, minimal LCM, intermediate residual equivalence, all-real and
no-solution boundaries, 12 Noto normal/+40 PNGs, complete caller text, refusal
records and old integer-family SVG/PNG byte compatibility.
