# Explicit pathways and shared stations

`pathway-map` draws one to six named routes across two to thirty globally
identified stations. Each route declares two to twelve stations in order and,
separately, which consecutive station pairs actually connect. A missing segment
remains missing. A shared station ID is drawn once as an interchange; matching
labels alone do not merge identities. Combined ordering must be acyclic and
fit at most twenty-four layout columns. Loops, compartment models and numerical
area encodings are outside this family.

Declare the meaning: business flow, knowledge links or method stages. Knowledge
links must be unoriented. A route's spatial ordering is a reading aid; station
distance does not encode duration, quantity or causal strength. Supplied notes
remain annotations, not measurements inferred from geometry. An optional query
finds a fewest-segment path only over present connections, respecting directed
routes; disconnected endpoints are explicitly unreachable.

```sh
node scripts/musedraw.mjs core example pathway-map --out output/pathways.json
node scripts/musedraw.mjs core render output/pathways.json --out output/pathways
```

Choose this family for a network of named paths and real shared stations,
rather than choosing it only because a reference uses metro colours. It does
not infer biochemical pathways, commercial outcomes or missing relationships.

Source-subject examples also include `biology-knowledge-map`,
`mechanics-knowledge-map`, `protein-structure-routes` and `sales-handoff-map`.
Use the relevant input rather than replacing its subject with the generic
observability example. Knowledge routes remain unoriented; commercial cycle
notes remain supplied examples rather than duration encodings.

Layout may reverse a route on the page to keep shared identities together and
reduce unused space. Its legend states the reading direction, and segment
arrows still follow the supplied endpoints. Semantic order is recorded
separately from actual layout columns; horizontal position across different
routes is not a universal timeline. Missing connections stay missing.
