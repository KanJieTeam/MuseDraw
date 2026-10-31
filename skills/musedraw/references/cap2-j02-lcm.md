# LCM-first atom-count teaching

`reaction-lcm` reuses `reactionBalanceModel`; it adds a four-step least-common-multiple derivation, not another balance solver. Supply the same explicit neutral atom-count input as `reaction-balance`, change family to `reaction-lcm`, and add `pivotElement`.

The bounded method accepts exactly three species and two elements. The pivot must occur in exactly one species on each side. Its LCM fixes those two coefficients; the remaining element must directly give a positive integer coefficient equal to the existing solver's primitive ratio. Fractional propagation, additional species/elements, charges, unsupported fields and ambiguous ratios refuse. Use `reaction-balance` for other supported neutral-count problems. No freeform formula parser or prediction of chemical feasibility is added.

The source-derived phosphorus asset retains the declared ignition condition and empirical P₂O₅ as a formula unit. The four rows calculate atom counts, LCM, two pivot coefficients, and the remaining coefficient. A final independent count checks every element. Text is measured at fixed sizes; rows and page height expand. The red ellipse is constructed around the whole measured text rectangle, including its corners.

Before public registration, the standalone `scripts/cap2-j02-render.mjs` review route renders PNG, SVG, input and offline editor through the existing browser bundle. A scratch integration patch and bundle order accompany the output handoff. Registry source-case ownership remains separate from the figure's `compositionReference`.

`node --test skills/musedraw/tests/musecore/cap2-j02-lcm.test.mjs` checks recomputation, existing-solver equality and scope exits. Browser/font/oracle evidence is separate; none is aesthetic approval.

Ordinary CLI discovery uses this example’s declared reference. Shared family registration is included in the main integration; measured tests and package verification remain separate from aesthetic approval.
