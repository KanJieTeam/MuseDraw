# Declared rack layouts and HTTP categories

`aisle-layout` coordinates a top view and a section of the same explicitly named
racks. Two to five rows, one to twelve racks per row and front-to-back equipment
airflow are declared. Facing fronts, facing backs and mixed orientation determine
the illustrated aisle category. Service shading stops at the actual overlap of
adjacent rows; floor/ceiling service is shown only when supplied. The section
references actual rack IDs rather than an invented cut line. Flow arrows are
schematic, not CFD, temperature, energy or cooling-performance calculations.

`http-status` groups selected codes from its supported, checked HTTP catalogue by
response class. It keeps large five-column category typography and measured
code/name/meaning pairs. It does not infer root cause or blame from the first
digit: 403 does not require prior login, and 404 can conceal existence. The
catalogue is bounded; unsupported codes leave this route rather than receiving
invented definitions. Caller notes remain caller-supplied interpretation.

Inspect `core example aisle-layout` or `core example http-status`, then use
`core render`. Geometry, shared object identity and known-code checks are
execution evidence, not a certification of infrastructure, server behaviour or
visual quality. Existing spatial and numeric-bar families are not substitutes
when their data semantics do not fit these tasks.
