# Incident evidence and planned log storage

`incident-review` coordinates a newspaper timeline, impact counts and referenced
evidence/actions. Supply two to twenty minute-precision events at an explicit
fixed offset, an impact window up to 48 hours, and contiguous observed bins.
Discovery and acknowledgement are calculated only when explicitly identified.
Zero requests yield no failure percentage. Conclusions distinguish reported
causes from hypotheses; chronology does not prove causality. Planned/done action
status is supplied, not evidence that the action fixed anything.

`log-tiering` calculates planned retained capacity for one to six contiguous
half-open age ranges starting at zero. Inputs specify GB or GiB, daily volume,
stored/raw fraction and replica count. An optional explicit baseline can produce
a negative saving. Ink mountains represent age order only; capacity comparison
uses a common numerical scale. This is not an access-distribution estimate,
recovery guarantee or measurement of an operating storage system.

```sh
node scripts/musedraw.mjs core example incident-review --out output/incident.json
node scripts/musedraw.mjs core render output/incident.json --out output/incident
node scripts/musedraw.mjs core example log-tiering --out output/storage.json
```

Keep observation sources, scope and synthetic-data notices. Unsupported event
precision, discontinuous windows, units or missing references must take another
route rather than being guessed. Inspect the final newspaper or ink composition;
arithmetic and geometry checks do not establish aesthetic quality.
