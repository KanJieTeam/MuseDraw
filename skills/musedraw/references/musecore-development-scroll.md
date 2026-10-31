# Independent annual development metrics

Use the optional `development` branch of `family: "scroll"` for supplied personnel and revenue observations sharing an actual year axis. Existing single-series `scroll` inputs remain valid and unchanged. `double-hour-scroll` belongs to the separate `daily-time` capability for `j07-shier-shichen`; it is not a corporate year chart.

The source asset `decade-development-scroll.json` retains the explicitly supplied example-company figures and yearly inscriptions from [195 source SVG](../../../gallery/collections/visual-cases/195-decade-scroll/source.svg) and [author notes](../../../gallery/collections/visual-cases/195-decade-scroll/author-notes.md). These are fictional company records, not independently verified business observations or a forecast. The renderer carries a `compositionReference`, not a claim that arbitrary caller inputs came from this source.

## Input

Required top-level fields: `family: "scroll"`, vertical `title`, `subtitle`, `development`, `note`. Do not mix old `points/unit` into this branch. Unknown fields and null objects are rejected.

`development` contains `recordKind`, `source`, `years`, `personnel`, `revenue`:

- `recordKind` is `supplied-examples` or `supplied-records`; `source` is a required supplied provenance description. No current date or external company data is consulted.
- `years` has4–12 `{year,event}` records, with strictly increasing integer years1–9999. Actual gaps matter. A title such as “十年” does not define or override the elapsed interval.
- Both metrics have `{label,unit,values,growth,note?}`. Their `values` explicitly enumerate every shared year in order as `{year,value}`. A missing value is **null**, not an omitted record or0. Year alignment is verified. No currency is guessed or automatically converted; the caller supplies one consistent unit for each metric.
- Personnel is an integer count0…1e9. Revenue is an independent finite scalar:0 or1e−6…1e12 in its declared unit. These are bounded readable-composition/arithmetic ranges, not physical or accounting laws. Values are not inferred from the other metric, titles, milestones or source pixels.
- Each `growth` explicitly supplies `fromYear` and `toYear`, both present in the shared year list, with `toYear > fromYear`. The renderer does not choose a different first positive observation or silently repair a missing endpoint.

Text limits: title16 characters, subtitle220, source280, event36, metric label40, metric unit24, optional metric note160, note400. Title and event are single strings rendered vertically; explicit line breaks in them are refused. Complete labels/notes are retained and measured from actual font bounds. If real year gaps and full labels need more than3600px width, or text needs more than8000px height, split the period or use separate views. This is a composition limit rather than a mathematical limitation.

## Numeric semantics

Both plots use the same linear coordinate for a given year. They have **separate units, numeric scales and true zero baselines**; their heights cannot be compared to each other as a ratio. Personnel segments connect only adjacent supplied year records whose values are known, and break at an explicit null. The connecting ink is a guide between given observations, not invented intermediate annual values. Pen width is auxiliary visual weight; the exact counts are the positions and labels.

Revenue bars use revenue alone. A null produces no bar and visibly reads “未给”. A given0 remains a zero-height bar with a0 label. Positive low values retain their actual small height, without minimum-height inflation. All-null series remain explicitly unobserved and do not become a zero series. Cinnabar personnel points identify the first/last given observations, which can differ from the first/last year when values are unknown. Generic pale mountains are decoration, not terrain or data.

For each growth window, `n = toYear − fromYear`, not the number of rows. With positive start and positive end,

`CAGR = expm1((log(end) − log(start)) / n)`.

| Endpoints | Policy |
| --- | --- |
| start>0, end>0 | Calculate the finite rate, including negative rates and0. |
| start>0, end=0 | Exactly−100%. |
| start=0, end≥0 | Null rate, status `zero-initial`; CAGR is undefined, rather than0% or infinity. |
| Either endpoint null | Null rate, status `unknown-endpoint`; no replacement endpoint is chosen. |
| Equal/reversed/absent endpoint years | Refuse the window. |

An endpoint CAGR can be calculated despite an unknown interior record, but the missing observation remains missing in the plot. This is an equivalent compound change between endpoints, not an assertion that every year had that rate, that milestones caused growth, or that future results follow it. Each displayed summary identifies the metric, CAGR, start/end years, elapsed years, supplied endpoint values and unit. Rounded percentages use `≈`; unrounded rates and supplied values remain in metadata. A positive-to-zero result is displayed as exact−100%.

## Source195 facts

The source SVG caption explicitly defines the curve as **year-end personnel** and the ink blocks as **full-year revenue**; these temporal definitions are retained in the asset labels. All source years are2016…2026. The yearly events are:三人在出租屋创立、第一款产品上线、拿到第一笔投资、员工过五十人、转为远程优先办公、进入华东市场、年营收破亿、新加坡办公室开业、推出第二条产品线、员工过六百人、新总部启用.

| Year | Personnel | Revenue as printed | Common万 magnitude |
| --- | ---: | --- | ---: |
| 2016 | 3 | Not supplied | null |
| 2017 | 12 | 50万 | 50 |
| 2018 | 28 | 300万 | 300 |
| 2019 | 55 | 900万 | 900 |
| 2020 | 90 | 2100万 | 2100 |
| 2021 | 160 | 4800万 | 4800 |
| 2022 | 260 | 1.05亿 | 10500 |
| 2023 | 380 | 1.68亿 | 16800 |
| 2024 | 470 | 2.4亿 | 24000 |
| 2025 | 600 | 3.3亿 | 33000 |
| 2026 | 680 | 4.1亿 | 41000 |

The source does not name a currency, so the asset declares **万（币种未注明）**. Converting万/亿 to one common magnitude is not added measurement precision or an assumed CNY denomination. Missing2016 revenue is never set to0.

Personnel2016–2026 uses10 actual years: `(680/3)^(1/10)−1 = 0.7200408679002406`, displayed≈72.0%. Revenue2017–2026 uses9 actual years: `(41000/50)^(1/9)−1 = 1.1074491026662563`, displayed≈110.7%. The source SVG's72%/111% and author-note72.0%/110.7% are consistent rounded forms.

The candidate preserves the paper, vertical inscriptions, supplied decade title and source counts while adding two readable independent scales and explicit unknown values. It does not claim exact source reproduction or user aesthetic approval. Geometry checks and numeric correctness are distinct from visual review.
