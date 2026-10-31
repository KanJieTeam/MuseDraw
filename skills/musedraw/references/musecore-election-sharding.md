# Bounded election traces and explicit ID sharding

`raft-election` checks a single candidate and round in a fixed three-to-seven
member set. Explicit terms, prior votes, last-log term/index, request arrivals
and response arrivals determine valid votes and the received majority. A later
higher-term response can cause step-down. Heartbeat reception checks the term
only. The whiteboard construction coordinates final member states with explicitly
supplied event times and a complete per-peer ledger. This is not complete Raft,
log replication, commitment or a liveness proof. See the
[Raft paper](https://raft.github.io/raft.pdf).


The time axis is piecewise linear in milliseconds. All uncompressed spans share
one common pixels-per-millisecond slope. A gap between adjacent supplied moments
exceeding both 20 ms and eight times the lower median positive gap is compressed;
each such span is visibly marked `//` and its complete start/end times are printed.
Compression changes scale, not supplied times, and does not prove that no
unrecorded events occurred. Ticks identify the piecewise mapping; event endpoints
remain attached to their exact input times. Message connections represent the
given campaign/reception context, not an asserted outbound-send time, network
transmission delay or successful RPC. The first-majority time and elapsed interval
from the explicitly given start are distinct from the final total vote count.
An absent majority stays absent; higher-term step-down remains visible.

The private layout keeps at least 12 px between adjacent uncompressed event
moments, increasing width when needed. Complete labels retain their fixed type
sizes; long names can enlarge the member cluster. The readable-composition
budgets are 4200 px wide and 7000 px high. Inputs whose measured labels or exact time
spacing exceed those budgets are explicitly refused with the required size and
a request to shorten caller labels or split the trace. These are presentation
limits, not protocol laws or new model input bounds. Offline markers sit outside
member-label ink; the full ledger spans the page below both upper objects. The
prior equal-spaced event-order construction was an honest different convention;
the new milliseconds view does not recast it as false data. Original caller
content and the single-round model are unchanged.

`id-sharding` calculates the declared teaching rule
`slot = user_id % (databases * tablesPerDatabase)`, then derives database and
table identity. Decimal ID strings use exact integer arithmetic. Explicit record
weights drive the displayed sample load. An optional new configuration compares
actual database/table destinations, rather than claiming a universal migration
fraction. Blue routes, storage objects and the routed list share the same
mapping. It is neither a production router nor a guarantee of whole-dataset
balance, consistent hashing or safe online migration.

```sh
node scripts/musedraw.mjs core example raft-election --out output/election.json
node scripts/musedraw.mjs core render output/election.json --out output/election
node scripts/musedraw.mjs core example id-sharding --out output/sharding.json
```

Use a different route for unsupported simultaneous event ordering, multi-round
consensus, arbitrary sharding expressions or unknown membership. Inspect the
actual diagram; model consistency does not establish aesthetic or operational
approval.
