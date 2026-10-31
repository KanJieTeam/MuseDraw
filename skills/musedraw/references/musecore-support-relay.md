# Fixed-offset support relay

`global-support-relay` draws caller-supplied daily local shifts under 1–3
explicit offset scenarios. It compares their exact UTC union, gaps and overlaps;
the profiles count active shifts, **not people**. Each center has at most one
active shift at an instant. The night-sky UTC rings and linked city colours
derive from `o08-quanqiu-kefu`; the two default scenarios retain its three
09:00–17:00 local shifts and +8/0/−8 versus +8/+1/−7 hour offsets.

```sh
node scripts/musedraw.mjs core render assets/musecore/global-support-relay.json --out output/relay
node tests/musecore/support-relay.test.mjs
```

Inputs contain 1–6 identified centers with labels, six-digit colours and 0–3
local windows each; 1–3 scenarios each supply exactly one integer-minute offset
for every center. Offsets range −840..840 minutes. `recurringDaily:true` is
required. `title`, `subtitle` and `note` remain explicit supplied text.
Their budgets are 120/320/1000 characters and at most 4/3/6 explicit lines;
center/scenario labels allow 40/48 characters and two explicit lines. Empty
explicit lines are rejected. Font wrapping may create additional measured lines.

Windows are half-open `[startMinute,endMinute)`. Start is 0..1439 and end is
0..1440; end 1440 means 24:00. End below start crosses midnight. Equal endpoints
are rejected: use an empty window list for no coverage, or 0..1440 for all day.
Windows of one center may touch but must not overlap. A full-day window stays
full-day after any offset. The model splits only at exact converted integer
endpoints; it does not infer minute facts from quarter-hour samples. Coverage
plus gaps is 1440 minutes, and coverage plus extra simultaneous shift-minutes
equals the sum of supplied shift durations. Overlap duration counts elapsed
minutes with two or more shifts, without multiplying by their count.

The default winter scenario has 1440 covered minutes, no gap and no overlap.
The supplied summer offsets give 1380 covered minutes, a 00:00–01:00 UTC gap
and an 08:00–09:00 UTC overlap. These are conditional calculations from the
source plan, not evidence that any real support organization operates it.
Europe/US transition weeks require separate caller-supplied offsets. The
program performs no date, IANA zone or DST lookup, shift optimization, meeting
planning, workload, headcount, handover, queueing or service-level prediction.

Numeric UTC offsets express local time relative to UTC; conversion here uses
UTC = local − offset. See [RFC 3339 §4.2](https://www.rfc-editor.org/rfc/rfc3339#section-4.2).
Location-based civil-time transition rules are a different model; see the
[IANA tz database theory](https://data.iana.org/time-zones/tzdb/theory.html).
Source-specific facts and visual decisions remain in the original
`gallery/collections/visual-cases/o08-quanqiu-kefu/author-notes.md`.

Long labels and notes extend the page using measured font bounds. Rendering
checks do not certify staffing adequacy, operational safety or aesthetic quality.
