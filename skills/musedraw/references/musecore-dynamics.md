# Explicit dynamical models

`seir-scenarios` compares one to four supplied piecewise-constant transmission
schedules in a closed homogeneous SEIR model. Supply all initial compartments,
population, latency/removal rates and a finite horizon. RK4 splits at parameter
changes and checks nonnegativity, population conservation and half-step
agreement. Peaks are sampled numerical peaks within that horizon; endpoints are
not infinite-time final sizes. The newspaper construction coordinates the
compartment relationships, common-axis trajectories and scenario summaries.
This is neither parameter fitting nor an epidemic forecasting service.

`repressilator` integrates the symmetric six-equation Elowitz–Leibler model
with explicit initial mRNA/protein values and parameters. Beta is a degradation
rate ratio. Circuit, trajectories and phase view use the same calculated state.
A constant solution remains constant; oscillation is not guaranteed. The route
does not model a GFP reporter, stochastic expression or a calibrated organism.
See the [original model](https://doi.org/10.1038/35002125).

```sh
node scripts/musedraw.mjs core example seir-scenarios --out output/seir.json
node scripts/musedraw.mjs core render output/seir.json --out output/seir
node scripts/musedraw.mjs core example repressilator --out output/oscillator.json
```

Keep the explicit hypothetical-data notice. Use another scientific workflow
when uncertainty inference or experimental validation is required. Numerical
checks validate this bounded calculation, not the appearance of a new figure.
