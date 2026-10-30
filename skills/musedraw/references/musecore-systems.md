# Bounded engineering process models

Use these constructions to explain the stated mechanism. One calculation
produces the objects, trajectory and numerical summary; the host cannot edit a
caption independently to claim a different result. Write the input for the user,
then inspect the actual PNG at delivery size. Keep the editable content, SVG and
offline editor. All bundled example events are fictional.

```sh
node scripts/musedraw.mjs core list --compact
node scripts/musedraw.mjs core example token-bucket --out output/bucket.json
node scripts/musedraw.mjs core render output/bucket.json --out output/bucket
```

## Choose by mechanism

| Family | Content and computed decisions | Boundary |
| --- | --- | --- |
| `error-budget` | Window of 1–129600 minutes; explicit observation cutoff inside the window; availability target 0.5–1; zero to twelve identified unavailable intervals. Merge overlapping/touching intervals, compute allowance, actual spending, signed remainder and exhaustion time. Plot only through the observed cutoff. | Time-based availability only; not a request-based SLI or an inferred release policy. Incidents must lie wholly within observation. Overspend stays negative. Zero allowance is explicit. Duration display rounds to seconds; two fields mean minutes:seconds, three mean hours:minutes:seconds. The primary number has an authored 132–240px range, otherwise refuses. |
| `token-bucket` | Integer capacity 1–20, initial tokens 0..capacity, continuous refill 0–1000 tokens/second, duration up to 3600 seconds and 1–32 identified ordered requests. Requests have a time and integer cost 1–1000000. One selected request determines the illustrated bucket state. The trajectory and full execution table use the same simulation. | Refill caps at capacity; a denied request consumes nothing. Equal timestamps follow input order. A cost greater than capacity is legitimately denied. This is a local teaching model, not an atomic distributed limiter, deployment configuration or abuse-prevention guarantee. |
| `hash-ring` | Two to five physical nodes per state, exactly one membership addition or removal, 1–4 virtual points per node and 4–24 identified keys. Stable IDs determine fixed 32-bit positions; compare clockwise successor ownership, counts and actual sample migration. One key is highlighted in both rings. | Fixed teaching hash: FNV-1a over UTF-16 code units followed by an avalanche mix. Not a cryptographic hash or a production partitioner. No replication, weighted capacity, failure detector or balance guarantee. Persistent token and key positions remain unchanged. The migration fraction describes only supplied keys. Exact token collisions refuse rather than invent an ordering. |
| `rolling-update` | Integer replicas 1–12; integer surge and unavailable allowances 0..replicas, not both zero. Generate a bounded abstract plan with separate create, ready and retire steps. Old-ready, new-pending and new-ready objects determine activity and availability counts in every row. | Educational serialized plan, not a Kubernetes controller simulation. New objects all become ready at a separate step; removal is immediate. No probe timing, resources, terminating grace periods, failures, deadlines or pauses. Step index is not elapsed time; no downtime or capacity guarantee for a real deployment follows from this diagram. |

Ordinary technical-report requests should use report constructions rather than
inherit the poster, neon, chalkboard or terminal material of these teaching views.
Do not force unsupported semantic content into a family because its style looks
similar. Text must fit the declared typography; otherwise simplify with consent,
split the explanation or select another medium.

## Shared mechanisms

`system-models.mjs` provides interval union, time-budget trajectories, bounded
token simulation, stable hash ownership and abstract rollout planning. These
coordinate-free functions can feed another view. Geometry and material belong
to the composition; the reusable model contains no page positions.

The budget convention is grounded in [Google's SRE workbook](https://sre.google/workbook/error-budget-policy/).
The token model follows the refill/capacity/consumption mechanism in [Redis documentation](https://redis.io/docs/latest/develop/use-cases/rate-limiter/nodejs/).
The ring illustrates clockwise ownership with virtual nodes as discussed in the
[Dynamo paper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf),
without reproducing its full architecture. The rollout count constraints are
related to [Kubernetes Deployment documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/);
the simplified planner does not reproduce controller behaviour.

## Execution evidence

`node tests/musecore/systems.test.mjs` checks hand-calculated events, overlapping
outages, zero/exact exhaustion, continuous refill, simultaneous requests,
membership locality, changed content, actual browser layout and scope exits.
Enumerated rollout settings and larger hash-key sets are algorithm checks, not
additional artworks. Registry source identities/hashes preserve provenance and
identify a bounded related capability. Aesthetic approval and independent host
transfer remain separate from these execution checks.
