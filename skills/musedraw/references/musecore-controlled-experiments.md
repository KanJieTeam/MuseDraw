# Small explicit experiment records

`friction-experiment` draws a declared horizontal constant-speed apparatus and
two to eight trials, each with one to six supplied readings or missing values.
One to six comparison pairs expose which listed factors changed. Missing data
remain missing; averages do not establish significance or causality. This route
requires pull and friction to be the only horizontal forces. Dry-sliding
approximations are qualified, not universal laws; see
[OpenStax on friction](https://openstax.org/books/university-physics-volume-1/pages/6-2-friction).

`germination-trial` uses explicit group conditions and observed seed counts.
Dots, denominators and percentages share the same observations. Zero tested
seeds yield an undefined proportion. Comparisons enumerate all changed factors:
immersing seeds can change both moisture and oxygen supply, so it cannot silently
be labelled an oxygen-only experiment. Unknown controls remain unknown.

```sh
node scripts/musedraw.mjs core example friction-experiment --out output/friction.json
node scripts/musedraw.mjs core render output/friction.json --out output/friction
node scripts/musedraw.mjs core example germination-trial --out output/seeds.json
```

The whiteboard and specimen constructions adapt their apparatus, tables and
annotations to the supplied records. Select the example schema before mapping
content. These are small descriptive teaching records, not statistical testing,
universal experimental-design validation or reconstructed measurements.
