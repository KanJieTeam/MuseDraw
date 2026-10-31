# Bounded teaching circulation maps

`blood-circulation` shows a declared normal adult four-chamber heart and pulmonary
and systemic paths with ten to twelve supported stations. Flow direction and
relative oxygenation are separate encodings. Pulmonary arteries carry the
lower-oxygen side; arterial/venous naming follows direction relative to the
heart, not a universal red/blue rule. The map is schematic, not anatomy to scale,
haemodynamic calculation or a congenital/fetal circulation model.
A bridged crossing is a non-junction: the crossing route follows the raised
bridge, without an additional straight segment through the other route. The
white chevron in the legend and on every directed edge denotes blood-flow
direction; it does not denote a pressure, velocity or duration.

`metabolism-metro` draws supplied shared station IDs, an explicit cycle, declared
linear main/branch routes and compartment membership. A shared metabolite keeps
one identity at its junction. Route thickness is not measured flux. The renderer
owns the loop geometry, branch tracks, station placement and full annotation
boxes; those boxes must clear curves as well as straight lines. It does not infer
missing reactions, ATP balances, stoichiometry, fatty-acid activation/shuttles or
biochemical feasibility from a line diagram. The teaching example does not claim
complete metabolic coverage.

Use `core example blood-circulation` or `core example metabolism-metro`, inspect
the catalogue and bounded JSON schema, then run `core render`. Unsupported
physiology, arbitrary networks or excessive annotations require another route.
Numerical, identity and geometry assertions are execution evidence, not a
scientific validation or approval of visual quality.
