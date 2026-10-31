# Ideal circuits and horizontal force

Use `ohmic-circuit` for a declared ideal fixed-resistance relationship and
`force-motion` for explicitly supplied horizontal forces. Both generate the
physical object and quantitative comparison from the same input.

`ohmic-circuit` takes 1–3 alternative positive finite resistances and 2–9
nonnegative voltages. Current follows `I = U / R`; a selected resistance and
voltage set the illustrated circuit and meters. The ammeter is in series and
the voltmeter parallel to the resistor. Alternative resistances are separate
ideal cases, not simultaneous parallel branches. Curves share zero axes and
the numerical table uses the same values. Do not pass noisy measurements into
this ideal-prediction view, imply temperature independence for a real material,
or invent data from a photographed apparatus.

## Optional supplied observation records

`ohmic-circuit` with `view: "supplied-observations"` uses a separate bounded
model, `observationCircuitModel`. The source-derived `ohmic-observations.json`
retains source 144's twelve **author-simulated** current values. These are
teaching records, not new measurements. Omitting `view` retains the existing
`model: "ideal-ohmic"` forward-prediction route unchanged.

Supply `recordKind` (`author-simulated-experiment` or `supplied-observations`),
`units: "SI"`, and `fit: {"kind": "least-squares-through-origin"}`. Give 2–9
strictly increasing common `voltagesV` within 0–60 V, and 1–3 unique `series`,
each with `id`, `label` and one explicit `currentsA` value per voltage. Currents
must be finite and within 0–20 A. Optional `nominalResistanceOhm` is a descriptive
0.1–10000 Ω reference; it never generates or fits records. No missing observations
are filled and differing voltage grids are not resampled.

The explicitly chosen fit minimizes `Σ(I − kU)²` through the origin:
`k = Σ(UI) / Σ(U²)`, with a positive representable denominator. The slope's
finite reciprocal is displayed separately from the nominal reference. A zero
slope has `inverseSlopeOhm: null` and a visible no-finite-inverse state; it does
not establish a real open circuit or infinite resistance. Numeric underflow,
unrepresentable reciprocals, unknown units/fits and malformed records are refused.
The fit does not by itself prove that a real material obeys Ohm's law. No free
intercept, significance test, uncertainty, temperature correction or meter-loading
model is inferred. [OpenStax, Ohm's law](https://openstax.org/books/university-physics-volume-2/pages/9-4-ohms-law)
explains the ideal relation; the origin constraint here is an explicit caller
choice. It is not the unconstrained regression in `pairedStats`.

`selected` supplies `seriesId` and `voltageIndex` for the **record** highlighted
in graph/table. `setup` separately declares
`kind: "series-rheostat-ammeter-parallel-voltmeter"`, `switchPosition` (`open`
or `closed`) and a complete `note` distinguishing apparatus from records. This
catalogue draws A in series and V across the fixed resistor, with the supplied
switch posture and a series rheostat. Its meters have role labels, no numeric
record readouts or current-flow arrow; it is not asserted to be the sampled
circuit state. Source 144 draws an open switch, which is kept explicit.

The journal panels preserve all raw samples and complete caller labels/notes.
All point coordinates, table values and selection identities share those records.
Coincident records keep the same centre and use distinct circle styles, without
jitter. Fonts remain fixed; measured text expands the page within declared line
budgets, and overflow is refused rather than truncated. The bounded apparatus
is not an arbitrary circuit solver. `ohmic-observations.test.mjs` independently
checks the decimal-unit algebra, source inverses 5.00/10.03 Ω, isolated record
changes, nominal-reference independence, zero slope, actual SVG/table identities,
font pressure and real scope rejections. Execution is not aesthetic approval.

`force-motion` is restricted to `horizontal-1d` with an explicit SI mass, all
given signed horizontal forces and an explicit vertical-equilibrium assumption.
Each of 1–4 cases has at most four forces, at most two in either direction.
Compute the sum and acceleration, attach every arrow to the actual body and
use one Newton scale for force lengths. A separate shared acceleration scale
serves the comparison. Zero force/result has no fabricated finite arrow;
extreme ratios that cannot remain visible refuse. It does not infer friction,
gravity balance, two-dimensional components, motion direction or velocity.

```sh
node scripts/musedraw.mjs core example force-motion --out output/force.json
node scripts/musedraw.mjs core render output/force.json --out output/force
```

The pure models are `idealOhmicCircuit` and `horizontalForceModel`; the figure
modules own the journal panels and body/formula composition. Inspect the actual
image as well as arithmetic and topology. Execution is not aesthetic approval.

## Optional ideal force–acceleration relations

`force-motion` can additionally take an explicit `relation`. Omitting the field
keeps the existing case model and composition unchanged. The independent
`newton-force-relations` example supplies the source's 0.5, 1 and 2 kg conditions
and a 0–10 N net-force interval alongside a separately given 2 kg force example.
The relation conditions are never inferred from `cases` or treated as observed data.

```json
"relation": {
  "kind": "acceleration-vs-net-force",
  "model": "ideal-constant-mass",
  "netForceRangeN": [0, 10],
  "masses": [
    {"id": "half", "label": "m = 0.5 kg", "massKg": 0.5},
    {"id": "one", "label": "m = 1 kg", "massKg": 1},
    {"id": "two", "label": "m = 2 kg", "massKg": 2}
  ],
  "note": "Explicit ideal conditions, not measurement records."
}
```

The family still requires `units: "SI"`, `dimension: "horizontal-1d"` and
`verticalBalance: true`. Each relation mass is an explicitly fixed positive
0.05–1000 kg condition; 1–4 distinct masses are supported. Net force endpoints
are signed finite Newton values within −2000–2000 N. These and the 20:1
nonzero-condition mass ratio are this composition's readability bounds, not
physical limits of Newton's law.

There are two branches. An increasing interval must span at least 0.01 N
(with machine-precision tolerance at the boundary). Each ideal straight segment
is computed exactly from its two endpoints with `a = netForce / mass`; no
sampling, fitted observations or extrapolation outside the interval is added.
Equal endpoints instead give a single force condition: only the corresponding
condition points are drawn, and no slope is asserted. At `[0, 0]` all positive
masses share one zero point; every supplied mass label remains visible. The
20:1 slope limit does not apply to that coincident-zero condition.

This addition does not infer velocity, displacement, time evolution, friction,
measurements or a changing mass. See [OpenStax, Newton's second law](https://openstax.org/books/university-physics-volume-1/pages/5-3-newtons-second-law)
for the constant-mass net-force relationship. `forceRelationModel` and
`forceAccelerationMps2` share the same pure computation with the existing cases.
