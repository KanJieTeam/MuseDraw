# Leaf exhibition source input

`cap2-leaf-exhibition-source.json` uses the existing `specimen` route directly. It retains the p04 source's nine reviewed native leaf drawings, exhibition total30, remaining21, November1–December15 date labels, daily09:00–17:00, venue and admission copy. Date labels have no year; no year, weekday, actual opening or availability is inferred. Exhibition/venue information remains the source's example copy.

The generic `specimen.json` is a correct alternate specimen sheet. Its generic subtitle/footer did not carry these exhibition facts. This source input restores the reader's exhibition task using the existing subtitle/footer fields; it adds no renderer, model, botanical drawings or new species inference. Unknown species still require a separately reviewed drawing. Source composition association does not mean complete reconstruction or aesthetic approval.

Exhibition totals are supplied copy; the renderer does not parse prose to compute total-minus-displayed counts. The source fixture's30−9=21 and transfer fixture's18−6=12 are checked independently. The tested input keeps the subtitle and footer to one line at their established type sizes. A failed two-line footer with overlapping Noto text boxes is retained as evidence; this input does not fix that existing multi-line typography limitation or claim a family-wide font guarantee.

Run the ordinary route: `node skills/musedraw/scripts/musedraw.mjs core render skills/musedraw/assets/musecore/cap2-leaf-exhibition-source.json --out <directory>`. The additive example is registered; the existing specimen family and its source association remain available.
