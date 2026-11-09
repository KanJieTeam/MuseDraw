# MuseCore dashboard-focus

`dashboard-focus` is a bounded operational dashboard composition. It routes one operational question to one hero relation, then places named evidence panels and a bounded metric strip.

## Routes

- `spatial`: map/plan hero for location questions.
- `process`: stage bars for throughput/capacity questions.
- `trend`: equally spaced ordered observations on one shared value axis, one emphasized series, explicit `unit` and `period`.
- `comparison`: aligned bars for comparable values; no decorative map or 3D substitute.
- `inventory`: bounded asset locator with explicit status.

Every numeric support panel must provide `values`, `unit`, and `period`. A realtime claim must declare `claims.mode: "live"`, a nonempty `claims.source`, and `freshness`; static snapshots are rejected. The responsive renderer reflows the hero, support evidence, and metric strip at 390, 1024, and 1440px without horizontal overflow.

The route is intentionally bounded: at most four summary metrics and four support panels. Unsupported or decorative heroes are rejected rather than styled around.

## Spatial positions and status

The spatial input supplies normalized layout positions in `0..100`, with x
increasing rightward and y downward. It supplies no geographic base geometry;
the output explicitly labels a coordinate schematic and never invents rivers,
land parcels or other map features. Desktop and responsive output use the same
coordinate semantics. For a geographic map or floor plan, use a route with
caller-supplied geometry.

Point labels must be unique because the existing `bindsTo` record links use
those labels. Each point must declare `normal`, `warning`, `critical`, `unknown`
or `offline`; absent or unsupported status is refused. Unknown and offline have
distinct neutral markers, not a normal-state color. The renderer keeps the
given positions; markers that would hide each other, or labels that cannot fit
without overlap, require a split view or another representation.

## Trend labels

Every series must have a distinct label and the same number of observations.
Provide `hero.periods` when each observation has a known time or category label;
its unique labels must match the series length. These are equally spaced labels,
not parsed timestamps or an elapsed-time scale. Use another chart when unequal
elapsed intervals matter.

The plot displays numeric ticks and a line-style key for every series. Long
period labels use observation numbers with a complete numbered label key below
the plot. If `periods` is absent, the axis explicitly uses observation numbers;
the renderer never invents point times from the prose `period` description.
