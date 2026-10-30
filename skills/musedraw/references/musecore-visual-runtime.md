# MuseCore colour and mixed-media compositions

Use an executable family when its content structure fits. Keep the selected
case's relationship between type, imagery and space; do not apply a palette
to an unrelated box layout. These tools share measurement, content validation
and delivery with the technical-report runtime, while drawing different objects.

```sh
node scripts/musedraw.mjs core list
node scripts/musedraw.mjs core example specimen --out output/leaves-input.json
node scripts/musedraw.mjs core render output/leaves-input.json --out output/leaves
```

The host writes the content input. Do not ask the user for coordinates or JSON.
Inspect the actual PNG at the delivery size. Every example has fictional,
illustrative or simulated content; replace facts and preserve uncertainty.

## Select a family

| Family / example | Input and visual decisions | Boundary |
| --- | --- | --- |
| `rhythm` | Overscale headline, 3–12 rows of explicit notes in 2–8 beats. Each note has `at` in `[0, beats)` and `strength` in `(0, 1]`; dot area represents strength. Integer `accentBeats` are zero-based beat positions. | A music/activity visual, not automatic transcription or a performance score. The main title and footer have bounded text budgets. |
| `specimen` | 3–9 selected leaf objects in 2 or 3 columns. Original leaf drawings, Chinese names and scientific labels remain linked. Grid and drawing scale recompute from count. | Only the nine supplied simplified leaf illustrations. Do not label one as another species or present them as diagnostic botanical plates. New subjects need appropriate drawings/assets. |
| `metro` | 2–4 identified routes across 3–7 ordered categorical stages. Only explicitly named `sharedStages` converge; a capsule marks the shared station. Per-route events stay on the original track. | Not arbitrary networks, branching transit maps or elapsed-time charts. Parallel tracks do not imply extra dependencies. A shared-stage label belongs to the shared station. |
| `colour` | Three labelled primary shapes and 1–3 explicit mixed-colour examples. Overlap lenses are calculated; mixed colours are supplied, not inferred. | A bounded teaching composition, not a physical pigment or light simulator. Do not automatically substitute an additive/subtractive colour model. |
| `calendar` | A real year, dated nonnegative values, unit, palette and data status. Recompute weekdays, leap days, annual/monthly sums, longest nonzero run and weekend share. | `missing` must explicitly be `zero` or `reject`. Do not confuse missing observations with zero. Colours use disclosed numeric intervals; this is not a statistical test. |
| `plate` | 4–16 labelled rows × 6–24 columns of numeric values, an explicit scale/range, hit threshold and direction, and disjoint positive/negative control columns. Recompute hit positions/list, sample histogram and Z-prime. | Input values must already be in the declared scale. Do not infer normalization, activity percentages, experimental efficacy or statistical significance. Controls are excluded from the hit list and sample histogram. |
| `riso` | Two labelled nonnegative sequences on strictly increasing numeric `x`, with units, data status and a note. A common zero baseline, overlapping ink areas and sharp outlines retain comparability. Peaks, including ties, come from data. | Not stacked totals or causal evidence. The visual connection interpolates between given observations, not a fitted or validated model. |
| `editorial-page` | Native HTML/CSS plus an existing generated raster asset. Presets `terracotta`, `ink-wash` and `swiss` coordinate display type, material, crop/contain behaviour and content blocks. Desktop width is 1600px; narrow screens stack the page. | Preset subjects are respectively repair still life, imagined rain garden and seed specimen. Text may change within that subject. For a different subject, use appropriate imagery and the image/frontend authoring route. No model creates a new painting through this program. |

Source case identities are recorded in `assets/musecore/index.json`. The leaf
object module retains original native vector drawings. The other native visual
families recompute their figures from content instead of replaying the source's
page coordinates. The editorial route preserves existing generated raster assets
while the text and page layout remain native HTML.

## Delivery

Native-vector families produce PNG, SVG, input JSON and an offline editor with
SVG download. The editorial family produces PNG, `diagram.html`, `editor.html`
and the content JSON. Its HTML is the editable/runnable work, not an SVG wrapper;
the generated image is embedded so the file works offline. Edit content through
the retained JSON and rerender; the HTML source can also be revised directly.

The CLI writes an explicit `outputs` list into `checks.json`. Use those files;
an older file of another medium in a reused directory is not part of this run.
Reuse the host's installed Playwright/browser; no downloads are automatic.

`report` currently composes only 720px technical figures. It refuses to shrink
posters or imagery into that slot. Design an appropriate wide page, report or
interface when mixing these families instead of silently reducing text size.

## Checks and evidence

Numerical/identity tests verify note and accent positions, specimen identity,
route identity, dates and sums, hit criteria, control statistics and peak
positions. Geometry checks and narrow-page checks are separate. None establishes
general aesthetic improvement or replaces viewing the actual work.

For control columns, Z-prime is `1 - 3*(sd_positive + sd_negative) /
abs(mean_positive - mean_negative)` using sample standard deviations of supplied
values. Equal means produce an undefined result. No pass/fail interpretation of
that metric is inferred by the program. The histogram counts non-control wells.

These are development families, not 180 parameterised cases. Remaining artworks
keep the existing [case library](case-library.md) source/adaptation route. A
source case, replay and content-driven family are different coverage states.

Run the dedicated browser/data checks with an existing runtime:

```sh
node tests/musecore/visual.test.mjs
```
