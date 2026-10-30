# Workload, coverage and leave

These views calculate supplied work and calendar declarations. They do not
infer staffing policy, public holidays, labour-law entitlements or service levels.

```sh
node scripts/musedraw.mjs core example workforce --out output/work.json
node scripts/musedraw.mjs core render output/work.json --out output/work
```

`workforce` takes 1–12 nonoverlapping UTC-day demand slots with integer minute
boundaries, task counts, minutes per task and a productive-time fraction. It
computes workload and the ceiling of workload divided by productive minutes;
optional scheduled people expose the numerical gap. The result is an arithmetic
lower bound, not a queueing/service-level guarantee. Missing roster counts stay
unspecified. Zero demand has zero theoretical staffing.

Optional recurring daily coverage uses 1–8 explicitly offset shifts. Each gives
its local start minute, duration of 1–1440 minutes, people and fixed offset
within ±840 minutes in 15-minute increments. Split cross-midnight intervals,
compute simultaneous coverage and preserve uncovered minutes. The supplied
reference date does not turn fixed offsets into a daylight-saving time service.
Do not infer offsets from office names or claim an uncovered interval is staffed.

`leave-plan` covers one month in 2000–2100 and 1–8 people. The input supplies
the ISO weekday work pattern, explicit holidays/extra workdays, each quota and
prior use, and at most one half/full-day request per person/date. Approved and
planned requests remain distinct. A request on a declared nonworkday stays
visible and consumes zero; approved spending and the projected spending with
plans are computed separately. Negative remaining allowance stays negative.
Calendar totals use person-days, not an unexplained mixture of days and people.
Conflicting overrides, impossible dates and unsupported fractions refuse.

The pure `workforce-models.mjs` and `leave-models.mjs` calculations can support
other views. The figure modules own the whiteboard comparison, coverage arcs
and calendar/allowance layout. Inspect the actual PNG at delivery size.
