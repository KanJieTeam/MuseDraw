# Office moves and declared escalation policies

`office-move` combines a declared schedule with shipment destinations: one to
four departments, one to six destination zones, zero to twelve shipment records
and one to twelve activities. Explicit local datetimes and a fixed UTC offset
define at most 31 days; activity dependencies form an acyclic graph. Real time
intersections and dependency timing conflicts are reported separately. A
zero-duration milestone stays zero. Planned and received box totals remain
separate and come from the same records. Box counts do not imply volumes,
vehicle loading capacity, safety approval or readiness of the new premises.

`oncall-escalation` draws one to eight declared policy steps, beginning at zero
minutes with strictly increasing thresholds through 1440 minutes. The trigger
datetime and fixed offset determine displayed deadlines, including midnight
crossings. An optional observation says when the record was checked and whether
an explicit acknowledgement had occurred. A reached threshold does not prove a
notification was delivered. Under this model an acknowledgement at exactly a
threshold stops that step; later steps also stop. With no observation, steps
remain conditional rather than becoming invented execution history. It does
not infer an SLA, actual response, staffing coverage or legal obligations.

```sh
node scripts/musedraw.mjs core example office-move --out output/move.json
node scripts/musedraw.mjs core render output/move.json --out output/move
node scripts/musedraw.mjs core example oncall-escalation --out output/oncall.json
```

Both families own the layout and marks, using the original riso and terracotta
languages. The fixed-offset model does not implement historical zone or DST
rules. Supply explicit next-day dates; do not guess a date from a smaller clock.
