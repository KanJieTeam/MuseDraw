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
