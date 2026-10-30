# Given-graph search and finite request replay

`hnsw-search` searches a supplied two-dimensional nested graph, at most eighteen
nodes and three layers, using Euclidean distance. Upper layers use a greedy
single candidate; the bottom uses an explicit search width. Coordinates determine
distances, projected positions, trace and the finite exhaustive comparison.
The default `view: "overview"` keeps the layered graph central. Set `view:
"trace"` in a second copy of the same input for the complete point and visit
record; render it into a separate output directory.
It does not construct an HNSW index or establish general ANN recall or speed.
Per-layer checks are trace counts, not measured CPU calls. Equal-distance set
differences need not mean a worse nearest distance. The aurora construction uses
one projection scale across layers.

`lb-tail-latency` replays up to twenty-four explicit requests on two to six
single-worker FCFS servers. Arrival order, work and supplied service rates drive
assignments and completion times. Policies are round-robin, least unfinished
requests, or explicitly supplied one/two-server choices. Exact arrival-time ties
have a declared order. Finite-sample quantiles use nearest rank; an empty sample
has none. Empirical CDFs are steps. A common time scale and separate policy panels
expose queueing and tails without assuming a winning algorithm. This is not a
connection-level production model or steady-state performance guarantee.
Its default overview keeps the common-axis plots together; `view: "trace"`
renders all request-level records separately. Both views use the same inputs and
calculated assignments.

```sh
node scripts/musedraw.mjs core example hnsw-search --out output/search.json
node scripts/musedraw.mjs core render output/search.json --out output/search
node scripts/musedraw.mjs core example lb-tail-latency --out output/latency.json
```

Keep the given-graph and synthetic/supplied-request context. Unsupported index
construction, retry, network and timeout semantics need another route. Inspect
actual plots; checked calculation does not approve aesthetic quality.
