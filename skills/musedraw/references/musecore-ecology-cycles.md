# Declared feeding webs and primary insect stages

`food-web` draws three to ten supplied organisms and two to eighteen feeding
links. Arrows explicitly run from food to consumer. For acyclic input it computes
bounded producer-to-terminal paths and retains multiple path positions for
omnivores. These positions are not measured diet-weighted trophic levels. Cycles
are marked; strongly connected component ranks arrange the drawing but do not
invent a trophic hierarchy or chain count. A terminal is terminal only in the
given graph. Relations are not inferred from animal names. See
[NOAA on food webs](https://www.noaa.gov/education/resource-collections/marine-life/aquatic-food-webs).

`insect-cycle` compares one to three rows from a verified teaching catalogue:
butterflies, grasshoppers, dragonflies and ladybirds. Explicit complete/incomplete
metamorphosis must agree with the catalogue and primary stage sequence.
Reproduction leads to next-generation eggs, not the same individual returning to
an egg. Supplied or synthetic durations remain distinct from unknown durations;
their complete sum is not automatically generation time or an egg-laying date.
The notebook construction uses stage-specific morphology symbols and a separate
reproduction return. It is not a catalogue of all insect development types.

```sh
node scripts/musedraw.mjs core example food-web --out output/web.json
node scripts/musedraw.mjs core render output/web.json --out output/web
node scripts/musedraw.mjs core example insect-cycle --out output/insects.json
```

These are small teaching constructions, not biological identification, measured
energy budgets or population predictions. Inspect the final work; graph and
count checks remain separate from aesthetic approval.
