# Declared chance models and measurement scales

`urn-trials` represents two to five categories containing one to thirty total
equally likely items, under an explicit independent with-replacement model.
One to 120 results are supplied observations, synthetic records or a labelled
deterministic teaching simulation. Missing results stay unknown. The pixel bag,
trial cells and scoreboard distinguish theoretical probability, observed
frequency and expected count. Expected count is not a promise; subjective words
are not converted to percentages. See
[independent events](https://openstax.org/books/introductory-statistics-2e/pages/3-2-independent-and-mutually-exclusive-events).

`measurement-scales` draws two to four explicitly declared scale examples.
Nominal categories have no invented ordering; ordinal order has no cardinal
distance. Interval examples require declared equal intervals and a conventional
zero, while ratio examples require an absence-of-quantity zero and nonnegative
values. Ratios against zero remain undefined. Values drive actual ruler
positions and common-zero lengths, not misleading doubled-area squares. The
model does not infer a scale from a variable name or authorize every statistical
operation; see
[levels of measurement](https://openstax.org/books/introductory-business-statistics-2e/pages/1-3-levels-of-measurement).

```sh
node scripts/musedraw.mjs core example urn-trials --out output/chance.json
node scripts/musedraw.mjs core render output/chance.json --out output/chance
node scripts/musedraw.mjs core example measurement-scales --out output/scales.json
```

Map facts to the example schema. Other sampling protocols, subjective likelihood
or undeclared measurement assumptions require a different route. Computation
and geometry checks remain separate from aesthetic approval.
