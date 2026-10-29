# Composed office and research report pages

Use this optional visual system for a report page or report illustration that
combines a headline, a real data field and a clear visual subject. It includes
two original 1800×1200 HTML/CSS compositions and actual Matplotlib charts.
These are adaptable seeds, not a universal report renderer or a claim of
better aesthetics than an unaided model.

For a report that develops one of the existing named styles, see the Riso
rhythm and Ink Wash evidence compositions in [visual language](visual-language.md).
Those have distinct layouts, retained data and their own complete source examples;
they are not palette switches applied to the two seeds below.

## Choose a composition

- **Scene report:** a substantial supplied illustration occupies the upper
  right; a two-line headline opens the upper left. A lower evidence strip
  connects a calculated observation to the measured data. Use it when the
  subject has a useful spatial/object representation. The bundled city-block
  artwork is an AI-generated conceptual illustration; it is not a measured
  site and must not be relabelled as one.
- **Ledger report:** a large total and its allocation/reserve distinction
  occupy the left. A common-scale horizontal comparison occupies the right;
  two editorial notes explain how to use it. Use it for nonnegative budget
  allocations whose items plus reserve actually equal the total. Do not use
  it for transactions, overlapping categories or signed cash-flow changes.

These share display/body/numeric type roles, botanical ink and clay colours,
contrast and page rhythm. Their structures differ because their content
differs. Do not insert an illustration into the ledger merely to fill space,
or keep the city illustration for an unrelated subject.

Rendered examples: [scene report](../assets/report-spreads/preview-urban.png)
and [ledger report](../assets/report-spreads/preview-budget.png). These show
the original demonstrations, not a benchmark against an unaided model.

## Start with the complete seed

Copy the selected JSON from `assets/report-spreads/`, retaining the original
when exploring. Replace its actual facts, headline, publication and notes.
For a scene report, supply the real artwork path relative to the input JSON
and explain its factual role in `illustrationNote`. If the task needs new
painting or imagery, follow [image work](image-work.md) to obtain that asset;
do not silently draw a placeholder in place of the requested medium.

```sh
python <skill>/scripts/build_report.py <skill>/assets/report-spreads/urban-demo.json --out output/city-report
python <skill>/scripts/build_report.py <skill>/assets/report-spreads/budget-demo.json --out output/budget-report
```

Use a fresh output directory. The builder keeps `input.json`, derived values,
chart PNG/SVG, the copied illustration where needed, `seed.css` and editable
`index.html`. It reuses the plotting helper's installed Python/Matplotlib
environment and fonts. Headline text and notes remain editable HTML; the
inserted illustration remains a raster asset. The chart is editable through
the data and plotting code, not by pretending the whole page is native SVG.

Open the HTML with an available host browser, wait for fonts and actual
images, and export the `.report` element at 1800×1200. Inspect the result
before delivering PNG plus the editable task directory. Chinese examples
use installed DengXian/Microsoft YaHei, with declared fallbacks; other
machines may need the corresponding font choice adjusted before export.
No font installation or network image download is required for the bundled
examples.

The demonstration seeds fit short two-line headlines, 2–3 measurement
series or 2–6 budget categories. Dense paragraphs, long headlines or a new
reading task may need a different composition. Edit the copied CSS/HTML
when that is appropriate rather than deleting facts or shrinking everything
to preserve this seed. A missing focus observation cannot become a number;
the builder refuses it. The budget never silently absorbs a discrepancy
into reserve.

All supplied demonstration measurements and budget figures are fictional.
Retain that identification when replaying them. Replace the factual content
and its provenance together when producing a real report.
