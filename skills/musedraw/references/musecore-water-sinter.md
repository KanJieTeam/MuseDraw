# Water-state relationships and supplied sintering records

`water-transitions` is a water-only teaching catalogue. `sintering-record` displays explicitly supplied sample records and independently declared schematic stage windows. These are different scientific tasks with separate assumptions.

## Water transitions

- Default: `assets/musecore/water-transitions.json`. Retain all three state roles and select two to six unique catalogue transitions with verified everyday examples.
- Direction encodes the change of state; colour encodes heat absorbed/released by the water, not rate or heat quantity. Water vapour itself is invisible; visible mist contains droplets.
- Numerical markers near 0/100°C appear only with the explicit 101.325 kPa rounded teaching reference. The reference is not a complete pressure-temperature phase diagram and never classifies an arbitrary sample solely from temperature.
- Reject unsupported substances, invented examples, duplicate roles and unprovided pressure assumptions. Omit the optional number axis when no reference is supplied.

## Sintering records

- Default: `assets/musecore/sintering-record.json`. Declare synthetic-teaching or supplied-record data, three to 40 increasing time samples, and one to three ordered, non-overlapping annotated stage windows.
- Temperature and relative-density nulls break the corresponding line; no zero-fill or interpolation hides missingness. Straight connectors do not establish continuous kinetics, and equal endpoint temperatures do not prove a real furnace hold.
- Stage boundaries and grain/pore symbol counts are explicit annotations, not conclusions computed from temperature/density. The structure panels are schematic, not microscopy or porosity measurements.
- Volume shrinkage from endpoint density ratios requires explicit constant mass and theoretical density; linear shrinkage additionally requires isotropy. Missing assumptions leave the value uncomputed. A density decrease retains negative shrinkage.
- Reject invalid units, sample order and stage windows. Do not infer a furnace recipe, mould allowance, material success, strength or process safety.

Export with the normal core renderer and retain the complete declared input. Review visual hierarchy and delivery-size readability separately from factual arithmetic and geometric checks.
