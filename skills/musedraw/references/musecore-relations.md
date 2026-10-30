# Boundaries, messages, responsibilities and declared inventory

Use the reader's question and explicit relationships to choose a construction.
These families do not share a compulsory card layout: C4 uses bounded software
objects, messages use lifelines, DACI compares role assignments, and inventory
uses counted objects. Fictional bundled inputs are demonstrations.

```sh
node scripts/musedraw.mjs core example message-sequence --out output/messages.json
node scripts/musedraw.mjs core render output/messages.json --out output/messages
```

## Choose the relationship

| Family | Inputs and computed decisions | Exit conditions and meaning |
| --- | --- | --- |
| `architecture` | One explicit system boundary for a container view, or one container boundary for a component view. Internal objects, supporting people/systems/containers and directed links retain distinct types. A bounded connected DAG generates a layout skeleton; secondary relationships remain visible. | 2–10 internal objects, up to four secondary internal relationships, four layout levels, five leaves and three children per layout parent. Supporting objects each have one direct internal link. Cycles, parallel/reversed endpoint pairs, mixed internal abstraction levels and disconnected graphs refuse. This is a bounded architecture view, not a general C4 validator or deployment model. |
| `message-sequence` | One or two panels, each with 2–5 identified participants and 1–12 ordered messages. Labels, explicit initial/after-message states and participant count determine the spacing. A reply names its earlier, reverse-direction message. | Message order is supplied; vertical distance is typographic, not elapsed time. States are supplied assertions, not inferred protocol transitions. Unknown/self endpoints and invalid replies refuse. Fixed 28px message labels allow at most eight lines; 23px states allow at most six. Text or canvas overflow refuses. |
| `daci` | Identified people and four explicit assignment lists. Driver and approver each contain exactly one ID; contributors/informed may be empty. Count each list, compute unique people and display cross-role membership separately. Role definitions and supplied contributions remain distinct. | Up to 24 people and 16 assignments in either plural role; unknown/duplicate IDs refuse. People may have multiple roles. Status is explicit, optional and never inferred from assignments. The chart does not judge the quality of a decision or certify an organisation's governance. |
| `backup-inventory` | 1–9 identified copies, each declaring medium, location, offsite flag, present/planned state and whether it is the original. Count only present copies, their declared medium categories and their offsite flags; preserve planned copies separately. Optional bytes/bytes-per-second compute an ideal transfer duration. | Exactly one present original is required. The original counts among copies. Meeting 3/2/1 count thresholds is not proof of independent media, offline/immutable protection or recoverability. A location name does not imply offsite status. Ideal transfer time is not an RTO; no RPO is inferred from a schedule. |

## Content mapping

Keep the source's required facts. For architecture, `level` sets the abstraction
and `scope` the boundary: do not mix application containers with their components.
Supporting `before` objects send a given relationship into the boundary; `after`
objects receive one. These layout bands do not assert chronological precedence.
Every visible arrow corresponds to an input link, including secondary links.

In message sequences, `replyTo` is optional. Use it only when the source really
identifies a reply; a dashed reply line is not a timeout or a slower message.
Do not invent states merely to fill a lifeline. Independent panels have their own
participant and message IDs; they do not imply missing actions between them.

For DACI, provide the actual person IDs rather than writing “several people” into
a count. A person listed twice across different roles remains one unique person.
For inventory, `medium` is a declared category ID, optionally resolved through
`media`; different names alone cannot establish physical independence.

## Production and evidence

The runtime owns typography, measured wrapping, object positions, relationships
and counts. Inspect the actual PNG at the intended size; preserve input, SVG and
offline editor. Do not silently shrink text, remove edges or replace missing
facts with plausible-looking content to get a passing export.

`architecture-models.mjs`, `sequence-models.mjs` and
`responsibility-models.mjs` expose coordinate-free computations. The matching
figure modules implement the visual material. Tests exercise both content
changes and scope exits; execution success does not imply aesthetic acceptance
or independent transfer to another host.

The abstraction boundaries follow the official [C4 container](https://c4model.com/diagrams/container)
and [component](https://c4model.com/diagrams/component) descriptions. DACI role
definitions follow [Atlassian's team playbook](https://www.atlassian.com/team-playbook/plays/daci).
The distinction between stored copies and a verified recovery process is
consistent with [Canadian Centre for Cyber Security backup guidance](https://www.cyber.gc.ca/en/guidance/tips-backing-your-information-itsap40002).
