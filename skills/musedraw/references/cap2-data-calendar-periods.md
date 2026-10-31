# Declared calendar intervals

The existing `calendar` can optionally receive `periods`: one to four nonoverlapping, inclusive intervals with complete `id`, `label`, `start`, `end`, and `note`. Dates must be in the given Gregorian year (1900–2100). The optional renderer outlines precisely those cells, split at real week boundaries, and prints each interval's dates, day count, total, supplied-record count, and complete note. It never infers a vacation, outage, or cause from zero activity.

Supply the original calendar fields and daily observations. `missing:"reject"` refuses an omitted day; `missing:"zero"` explicitly means omitted dates are zero and is disclosed on the page. Unknown observations must not be silently replaced by zero. Values must be finite nonnegative numbers up to 1e12. Daily cells, monthly bars, total, longest positive streak, weekend share, and interval summaries derive from the same records. Zero annual total gives an undefined weekend share.

The bounded renderer measures text at fixed reading sizes; grid row spacing grows with font height. Full labels and notes are retained or text beyond the declared budget is rejected. It supports the three existing palettes. Intervals cannot overlap; their boundaries are annotations rather than additional data values.

`cap2-data-calendar-period-demo.json` is explicitly fictional development input. The studied d05 source prints monthly totals and a vacation annotation but supplies no complete daily table. No daily original values were inferred from color; this is a composition reference, not a complete source-data adaptation or source claim.

Integration: place `cap2-data-calendar-period-models.mjs` and `cap2-data-calendar-period-figures.mjs` after their quantitative/visual helpers and before `data-visuals.mjs`; import `cap2DataCalendarPeriodFigure` there and guard the start of `calendar(b)` with `if(Object.hasOwn(b,'periods'))return cap2DataCalendarPeriodFigure(b);`. The existing default remains on its existing route. Tests inject this guard without modifying shared entrypoints.

Run `node --test tests/musecore/cap2-data-calendar-period.test.mjs`. Optional environment variables `MUSECORE_NOTO_FONT` and `MUSECORE_CAP2_PERIOD_OUTPUT` select a local font and evidence directory. Tests cover independent civil-date enumeration, BigInt totals, leap and century boundaries, exact outline membership, malformed data, actual SVG text and mark intersections, font ascent +40, explicit refusal, and unchanged default SVG/PNG hashes. Passing checks does not establish aesthetic approval.
