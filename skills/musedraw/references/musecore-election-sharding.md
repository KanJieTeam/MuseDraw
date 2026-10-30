# Bounded election traces and explicit ID sharding

`raft-election` checks a single candidate and round in a fixed three-to-seven
member set. Explicit terms, prior votes, last-log term/index, request arrivals
and response arrivals determine valid votes and the received majority. A later
higher-term response can cause step-down. Heartbeat reception checks the term
only. The whiteboard construction coordinates member states and ordered message
events; its event-order spacing does not claim proportional elapsed time. This
is not complete Raft, log replication, commitment or a liveness proof. See the
[Raft paper](https://raft.github.io/raft.pdf).

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
