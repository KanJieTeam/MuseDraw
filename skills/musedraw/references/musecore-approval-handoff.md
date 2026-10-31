# Approval branches and handoff dependencies

`approval-workflow` displays explicitly declared business flow and responsibility:
one to six roles, three to twelve nodes, two to twenty-four labelled edges,
at most two decisions, one return edge and three nodes per forward level.
The forward graph must be acyclic with the stated unique start. Decision
branches and control/data edges are input facts; the program does not invent
policy, legal conditions or approval outcomes. An optional current record
distinguishes waiting, processing, returned and finished; an approved/rejected
outcome requires an explicit finished record. Return paths and bypasses use
separate routing so a label cannot replace the relationship it should show.
Choose paper or aurora only after the content fits this bounded graph.

`handoff-checklist` accepts one to twelve named people and zero to twenty tasks.
Each task names distinct owner/receiver identities, its declared status and up
to four explicit blocking prerequisites, with at most forty dependencies overall.
The program computes completed, open, blocked and actionable counts from the
same acyclic dependency graph. A task cannot be marked handed over while its
blocking prerequisites remain unfinished. An empty list has no completion
percentage. It does not infer employment obligations, access revocation or
whether a document has actually been accepted.

```sh
node scripts/musedraw.mjs core example approval-workflow --out output/approval.json
node scripts/musedraw.mjs core render output/approval.json --out output/approval
node scripts/musedraw.mjs core example handoff-checklist --out output/handoff.json
```

Keep names, policy and status grounded in the brief. Use another composition
when the graph exceeds these limits; do not delete responsibilities to fit it.

`procure-to-pay` retains the source example’s nine operations, ten declared
connections and five responsibility labels. It is a horizontal relationship
view, not a recreation of five physical swimlanes. The original approval tiers,
matching tolerance and dates remain supplied annotations; conflicting boundary
amounts are not resolved by the renderer, and no actual approval state or
accounting deadline is calculated.
