# Cross-scale mechanism chain

`mechanism-chain` is a bounded teaching representation for one declared molecular → cellular → organism path. It keeps the mechanism claim inspectable by requiring one input, one readout, and a single ordered chain of mediators.

Each node carries a scale, a supplied value, an interval, and one or more source IDs. Each edge records an effect (`activates`, `inhibits`, or `modulates`), an evidence mode (`perturbation`, `temporal`, `direct-measurement`, or `inferred-link`), and its own source IDs. The validator rejects cycles, branches, backwards scale transitions, missing source pointers, intervals that do not bracket the supplied value, and any topology that does not connect every stage.

The figure uses one horizontal zero-based reading path. Node cards show the declared reading and interval; edge labels retain the declared effect and evidence mode; the ledger repeats source pointers so a reviewer can move from a visual claim to its supplied evidence. Scale bands distinguish molecular, cellular, and organism stages without implying that a higher scale is more certain.

The model deliberately does not estimate mediation, dose response, statistical significance, or causal identification. `inferred-link` is a declared evidence mode and remains visibly weaker than a direct measurement. Values, intervals, and source identities are supplied by the caller.

Demo input: [`mechanism-chain-demo.json`](../assets/musecore/mechanism-chain-demo.json). Browser and rejection coverage: [`mechanism-chain.test.mjs`](../tests/musecore/mechanism-chain.test.mjs).
