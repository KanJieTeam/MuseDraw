# Condition comparison

Use this family when the reader must compare states of one declared substrate
or object while holding the substrate identity and numeric scale constant.

The input must declare a substrate, its source, a measured baseline, a shared
scale, and 2–4 conditions. Every condition carries a source and an explicit
state: `measured`, `missing`, `planned`, or `conditional`. Only supplied values
are plotted. `missing` and `planned` are placeholders, and `conditional` uses
an explicit range. A condition may name a changed substrate segment, but that
segment must exist in the declared substrate.

The family refuses missing sources, inconsistent substrate IDs, duplicate
segments/conditions, values outside the shared scale, unsupported states,
conditional rows without an ordered in-scale range, and values inferred from
labels. Colour separates state from identity; it never names the sample.
The demo values in `condition-comparison-demo.json` are fictional development
data and are not a Nature result.

```sh
node --test tests/musecore/condition-comparison.test.mjs
node scripts/musedraw.mjs render assets/musecore/condition-comparison-demo.json --out output/condition-comparison
```
