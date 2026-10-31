# Explicit dynamical models

`seir-scenarios` compares one to four supplied piecewise-constant transmission
schedules in a closed homogeneous SEIR model. Supply all initial compartments,
population, latency/removal rates and a finite horizon. RK4 splits at parameter
changes and checks nonnegativity, population conservation and half-step
agreement. Peaks are sampled numerical peaks within that horizon; endpoints are
not infinite-time final sizes. The newspaper construction coordinates the
compartment relationships, common-axis trajectories and scenario summaries.
This is neither parameter fitting nor an epidemic forecasting service.

The optional `analysis` block is demonstrated by
`assets/musecore/seir-window-comparisons.json`. Existing inputs without this
block retain the original model output and figure. Supply
`metric: "finite-mesh-I-fraction-maximum"` and one to three `comparisons`.
Each comparison has a unique bounded literal `id`, a `reference` window and a
`comparison` window, each `{scenario, startDay, endDay}`. The scenario must
already exist; finite endpoints satisfy `0 <= startDay < endDay <= durationDays`.
Windows are closed at both endpoints and need not coincide with display samples
or transmission changes. No layout coordinates or inferred policy labels apply.

In this optional branch, distinct supplied Numbers remain distinct: common
output samples, beta changes and query endpoints form an exact union. Query
endpoints become integration cuts; each interval uses the explicitly supplied
beta at its left endpoint. The original RK4 positivity, conservation, half-step
agreement and work bounds remain. If adjacent cuts cannot resolve a distinct
half-step time, the input explicitly rejects instead of merging them with an
epsilon. This optional stricter path does not change the older sampling path.

Window maxima use actual fine-grid evaluations, including the supplied endpoints;
exact equal computed values keep the earliest evaluation. These are numerical
window maxima, not continuous analytic peaks or a count of epidemic waves.
Output includes the sampled maximum/time, boundary location, sample count,
comparison minus reference in population fractions (displayed in percentage
points), ratio, relative change and time difference. At a zero reference maximum,
ratio and relative change are undefined; an all-zero window has no maximum time.
These values stay null with an explicit status, never infinity or invented zero.
An unrepresentable positive ratio also stays null with its own status. The figure
marks window-boundary maxima and preserves the complete caller title and note.

The new example is a synthetic teaching comparison, not original observations.
Source166 describes Euler with a 0.05-day step, whereas this route uses RK4 and a
half-step check: its rounded 34-day/53%/3.6 comparisons are not fitted targets.
An independent adaptive DOP853 calculation checks the trajectories and window
values in development. The source's separate asymptotic final-size-equation
panel is not implemented here; a finite endpoint must not be called a final size.

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
