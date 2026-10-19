# Scopes, representations and coordinate correspondence

Read only the section matching the relationship. These recipes extend the
[scientific atlas](scientific-atlas.md); they do not prescribe a new palette,
require another review pass, or infer scientific facts from a paper's appearance.
Use existing native objects, paths and connectors. The examples below describe
composition, not new scene fields or automatic physics/layout capabilities.

## A boundary changes what belongs to an analysis

An analysis boundary expresses **membership**, not necessarily a physical wall.
List the supplied members of each scope before placing its outline. Keep the
process objects and their forward route in one shared arrangement; a narrower
scope must not move or duplicate the process merely to fit another rectangle.
Put the scope name on its boundary rather than inside an extra process node.

For example, suppose a brief supplies `source → convert → deliver → use`, with
one analysis ending at delivery and another including use. The distinction is
the inclusion of `use`, not two differently coloured copies of the pipeline.
Draw return investments and outgoing losses as their actual separate relations.
An accounting outline is not another material-flow arrow.

Use native `zones` or outline `paths` around the declared members, with ordinary
connected edges for the process. Prefer a bracket when a large enclosure would
obscure the spine. On a membership-only edit, change the outline and its name;
leave the process, ports and other routes in place. These primitives do not
automatically calculate set membership or conserve an energy budget.

For a **physical region**, position carries a stronger claim: a reaction or
transport path must stay in its stated layer, and a cross-boundary path must
meet the named interface. Draw shared interfaces once when constructing adjacent
regions; independently shaped ribbons can leave false gaps or overlap. Current
`layers` and `laminate` do not automatically register arbitrary geological wedges,
asymmetric sections or an orthogonal view. Use supplied geometry with native
paths; do not substitute a material stack for an unrelated accounting scope.

Source studies: [analysis boundaries](https://www.nature.com/articles/s41560-024-01518-6/figures/1),
[spatial process regions](https://www.nature.com/articles/s41561-025-01678-4/figures/3).
A weighted Sankey is a different argument: quantities, not just membership,
determine its ribbon widths and require supplied data.

## A representation changes while element identity persists

Decide whether the operation preserves elements, aggregates them or creates new
ones. For a reorder/reshape, write a short element mapping first: for example,
`[[p,q],[r,s]] → [p,r,q,s]`. Preserve those identities and their encodings in both
views. If a feature or value changes, distinguish that change from position.
Matching colours alone are insufficient when two elements have the same value.

Use `tensor` for explicit arrays and native cells/text for a mapped sequence.
Keep an authoring map of source element IDs to destination positions; array
terminals are indexed by position, so a second tensor does not automatically
inherit semantic element identity. Draw correspondence only where it is needed
to follow the operation. Do not connect every cell with a line if matching short
IDs already make the mapping clear. A reshape arrow denotes a representation
operation, not a physical movement or a new graph bond.

For iterative graph computation, separate **topology**, **attached features** and
the **active update scope**. Put a small feature glyph beside its actual node;
show the nodes/edges used in that iteration without adding bonds to carry feature
labels. Repeat the supplied graph geometry and change only the named active set
or feature values. An architecture with several update rounds is not evidence
that every node updates in every round. Current `graph`/`tensor` objects can be
combined manually; they do not infer an update schedule or implement a general
per-node feature attachment API.

Source studies: [token representation changes](https://www.nature.com/articles/s42256-024-00864-0/figures/1),
[layered graph representations](https://www.nature.com/articles/s41524-026-02048-3/figures/1).
Continuous physical fields are a counterexample: a categorical cell grid must
not imply discrete classes or measured resolution that the model never supplied.

## Two coordinate domains refer to the same event

An apparatus has spatial coordinates; an energy diagram has an energy direction;
a measured response has its own axes. They can share identities without sharing
geometry. Place the actual event in its own domain, then mark its corresponding
feature in the other domain. Use thin non-directional guides for correspondence,
distinct from a beam, force, transition or signal arrow. A short matching event
ID can replace a guide that would cross unrelated objects.

Use supplied energy levels, event IDs or response positions. Do not generate a
smooth spectrum to complete the composition when no spectrum was supplied. The
engine has no dedicated energy-level or calibrated-response object: native paths
can draw an explicitly specified schematic; empirical curves need source data.
For an overview that truly shares geometry, use the [detail method](scientific-details.md)
instead of claiming this cross-domain association is a magnified crop.

For interval comparisons with compatible units, keep one shared axis and map
every supplied endpoint through that axis. Show the changed bound directly;
do not stretch each row to the same width. Pattern or a local outline can mark
an interval category without recolouring the entire panel. If calibration or
units differ, do not imply a common numerical scale.

Source studies: [transition and spectral correspondence](https://www.nature.com/articles/s41566-024-01395-1/figures/3),
[operating-window comparison](https://www.nature.com/articles/s41893-023-01237-y/figures/1).
These sources supply visual methods, not reusable levels, peak shapes, physical
laws or performance claims.
