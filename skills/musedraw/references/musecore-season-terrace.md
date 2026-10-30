# Seasonal longitude wheel and schematic terrain sections

`solar-terms-wheel` uses the supported twenty-four-term catalogue, fifteen-degree
longitude positions and an explicitly supplied pointer. The shared circular
geometry and variable-width ink band coordinate markers, labels and seasons.
It does not infer a year's term dates or exact crossing times by dividing a
calendar into equal pieces. A supplied pointer is a teaching parameter, not an
observation or ephemeris.

`terrace-section` draws two to five strictly descending representative heights on
one linear metre axis. Horizontal widths are dimensionless schematic weights,
not distance or area. Region names and adjacent boundary labels are supplied
annotations, not inferred administrative or topographic geometry. One regional
height is not an assertion about every location in that region. The section is
not a DEM, surveyed transect, geological model or hydropower estimate.

Inspect `core example solar-terms-wheel` or `core example terrace-section`, then
use `core render`. The thin construction layer reuses measured typography and
linear scales, while preserving distinct paper/ink and warm terrain materials.
Unsupported calendars, observations or terrain data shapes leave the route.
Passing geometry and arithmetic checks does not establish aesthetic quality.
