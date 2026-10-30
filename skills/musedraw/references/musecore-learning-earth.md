# Explicit trajectories and coupling plans

`rl-trajectory` accepts a supplied rectangular toy-grid trajectory with declared
state, action, reward, next state, termination and truncation. It reuses explicit
transition validation and computes finite recorded discounted reward sums.
Unknown reward stays unknown; no bootstrap or future reward is invented. Supplied
state values are not estimated. The overview coordinates agent/environment and
the actual path; a trace view retains individual steps. It does not train a
policy, search for optimality or infer reachability from the illustration.

`earth-coupling` coordinates three to six supplied components, a coupler, all
declared directed exchanges and integer-minute plan clocks. Reciprocal links and
component cycles are retained. Completed intervals are counted on `(0,T]`;
an optional initial marker at zero is separate. A partial final component interval
remains partial and an unknown timestep remains unknown. Grid and unit labels
are supplied descriptions, not dimensional conversion, physical simulation,
conservative remapping or conservation verification.

The component position field is a caller-selected named layout slot from a
bounded unique-slot whitelist. It is not a factual inference or proof that the
host needs no design judgement. Free coordinates and deleted exchanges are not
accepted as layout shortcuts. Inspect `core example rl-trajectory` or
`core example earth-coupling`, then `core render`. Tested execution and geometry
do not establish host aesthetic transfer or real model performance.
