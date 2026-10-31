# Explicit deployment hosts

`deployment` accepts an optional `deploymentTree` view. The existing input with
`zones` remains a separate unchanged branch. This bounded view answers which
software instance is hosted where, and which explicitly supplied instance calls
or replicates to which other instance. It does not certify real configuration,
permissions, failover, availability, security or formal C4 conformance.

Use `assets/musecore/order-service-deployment-hosts.json` as the source-specific
example. The source is `115-c4-deployment`; its preserved SVG SHA-256 is
`ee056a695075dc678bc8641422d5868242a3928d6b1bb01dd5014cbf5d8e137b`.
The example retains the source's region, three availability zones, Kubernetes
node pools and managed database hosts, Web/API/database instances, sample
versions, and all twelve relations. Every API accesses the A primary; the primary
replicates synchronously to B and asynchronously to C. “Production environment”
is the source author's declared example label, not an independently verified
deployment. The source legend is not reconstructed as a separate panel.

## Input contract

- `deploymentTree.infrastructure`: exactly one `region` with `parent: null`, two
  to four `az` children, and one `service-host` plus one `data-host` child per AZ.
  Every infrastructure object supplies `id`, `parent`, `kind`, `label`, `detail`.
  Parent IDs define the hierarchy; input coordinates are not accepted.
- `deploymentTree.instances`: one to three ordered `service` instances on each
  service host, and exactly one `data` instance on each data host. Every instance
  supplies `id`, `host`, `kind`, `label`, `detail`. Array order within a service
  host is the explicit vertical order; it does not infer relationships.
- `actor`: `id`, `label`, `detail`; drawn outside the region. `entry` additionally
  supplies `host`, which must identify the region.
- `links`: two to twenty-eight explicitly identified `request` or `replication`
  relations with `id`, `from`, `to`, `label`, `kind`. Supported requests are
  actor→entry, entry→first service, consecutive services on the same host, and
  last service→any supplied database. Replication connects database instances in
  different AZs. Missing relationships stay missing. All object and relation IDs
  are unique across this bounded input.
- `title`, `subtitle`, `note` and all caller object/relation text remain complete.
  Text is nonempty and bounded: title/subtitle 180 Unicode code points, note 400,
  object label/detail 220, relationship label 120, IDs 32. Explicit empty lines
  and text outside measured rendering capacity refuse.

The pure `deploymentHostModel(input)` validates and returns the explicit tree,
instances and relationships without page coordinates. Unknown fields, null tree,
unknown parent/host/endpoint, incompatible instance/host types, duplicate IDs,
skipped service-order request edges, unsupported hierarchy and excess content
are rejected. These are construction limits, not laws about possible deployment.
No name such as “read-only” is parsed into permissions. An inconsistent caller
label remains a caller statement, not a validated operational property.

`renderHostedDeployment(input)` measures all text with existing visual tools.
Nested boundaries and common service rows recompute from parent/host relations
and content. Exact matching JDBC target+label may share a visible corridor;
every relation ID and complete source→target path remains separately available
in SVG metadata and relation groups. Common lines do not merge relation identity.
Cross-zone endpoints are attached to the actual supplied database, not its local
zone's database. Relationship text uses visible opaque backings after the paths.
Fixed text sizes are retained; the measured 3200×6000 px canvas budget refuses
rather than abbreviating labels or lowering type size.

The original three-AZ candidate is taller than the former simplified default
because it includes host and region facts. Its current rendering is not a
pixel reproduction or an automatic aesthetic verdict. Arbitrary regions,
recursive infrastructure trees, disconnected host types, arbitrary cyclic
software graphs, infrastructure discovery and real runtime execution are out
of scope. For a different topology, use another route instead of changing facts.

[C4's deployment definition](https://c4model.com/diagrams/deployment) describes
mapping software instances to deployment nodes, including nested infrastructure.
The source relationships and sample versions come from the preserved source SVG
and author notes, not from assumptions about product defaults.

`node --test tests/musecore/deployment-hosts.test.mjs` independently checks tree
and host containment, exact edge identities, source/target attachments, no
unrelated software-object penetration, complete caller text, quantity changes,
removed relations, null/invalid input, +40 ascent and the old branch. The test
runs the current production browser bundle plus the isolated new modules, so it
can also verify the view before shared registration. It does not modify dispatch.
