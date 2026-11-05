# Cohort branch and rejoin

Use this family only when one declared cohort count splits into named paths and later joins a shared path. The input supplies integer counts, every edge amount, role labels, and source IDs. The renderer checks one reachable acyclic graph, one entry and one exit, and conservation at every split or rejoin.

It does not infer overlap, missing exits, conversion rates, or causal meaning. A path with an unknown amount must be refused or supplied before rendering. A zero is a reported count; an omitted value is not zero.

The output is an SVG/PNG flow figure with the entry, branch lanes, rejoin, exit, edge amounts, and a source ledger. This bounded family is not a general process editor: responsibility swimlanes, probabilistic trees, and multi-entry networks use other routes.
