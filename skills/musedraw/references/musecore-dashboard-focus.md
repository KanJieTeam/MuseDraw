# MuseCore dashboard-focus

`dashboard-focus` is a bounded EasyV-style operational dashboard composition. It routes one operational question to one hero relation, then places named evidence panels and a bounded metric strip.

## Routes

- `spatial`: map/plan hero for location questions.
- `process`: stage bars for throughput/capacity questions.
- `trend`: one shared time axis, one emphasized series, explicit `unit` and `period`.
- `comparison`: aligned bars for comparable values; no decorative map or 3D substitute.
- `inventory`: bounded asset locator with explicit status.

Every numeric support panel must provide `values`, `unit`, and `period`. A realtime claim must declare `claims.mode: "live"`, a nonempty `claims.source`, and `freshness`; static snapshots are rejected. The responsive renderer reflows the hero, support evidence, and metric strip at 390, 1024, and 1440px without horizontal overflow.

The route is intentionally bounded: at most four summary metrics and four support panels. Unsupported or decorative heroes are rejected rather than styled around.
