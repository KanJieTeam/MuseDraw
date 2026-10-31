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
