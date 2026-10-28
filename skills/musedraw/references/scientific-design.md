# Scientific composition · objects before process boxes

For measured results, statistical comparisons and report charts, use
[data figures](data-figures.md) and an available plotting tool. This reference
addresses scientific objects and mechanisms; those are not substitutes for
the report's actual data plots.

Use for reference-led Nature-style method figures, mechanisms, devices and
multi-panel scientific schematics. Read this short guide and the matching
example's method; ordinary responsibility flows still use semantic flow.

## Select a visual argument

For faithful reference work, inspect the full-resolution figure when the paper
provides a public download link. A cached 685px gallery thumbnail can hide
prime/subscript marks, small bonds and interval endpoints. Keep that thumbnail
for fast browsing; use the original for fine drawing. Do not silently substitute
a generic graph or change counts/topology when the thumbnail is ambiguous.
This is a bounded source lookup, not OCR or a new image-analysis service.
If the image reader reduces a whole figure, inspect a crop of the ambiguous
object or notation at its native resolution. Keep the full image for placement;
use the crop for individual atoms, branches or scripts. Change only that region,
then inspect that region of the output. Do not repeat the whole design workflow
or demand this step for ordinary non-reference drawings.

Identify the physical/data object, the main change or computation, and the one
relationship the reader needs to see. Keep a dominant overview or object and
subordinate detail. Repeated states keep the same identities, geometry and
palette; use a separate encoding for the change. A material colour is not a
generic "focus" colour that can be swapped independently in each panel.

Before selecting a physical primitive, check what the reader will infer from
its position, attachment and boundary. A reagent present in a flow does not
establish a deposited coating, immobilisation, binding or reaction mechanism.
When the brief supplies only a reagent's identity, encode it with labelled
markers in the fluid or a categorical colour; do not turn it into a wall layer.
An apparatus outline may establish containment without claiming a material,
measured thickness or fabricated construction. Likewise, reusing geometry for
comparison is not evidence that two specimens or chambers have identical
physical structures. Only assert that equivalence when the source supplies it.
Preserve this distinction in both the overview and its detail; removing a
sentence while retaining the unsupported physical depiction does not fix it.

The shipped original worked examples demonstrate composition rather than prescribing
a universal palette or exact model topology:

- `assets/design-examples/scientific/graph-learning/`: a resource-update loop
  above a graph/context encoder with two heads and a joint readout.
- `assets/design-examples/scientific/shared-trunk/`: one processing spine with
  alternative input representations and explicit local object mechanisms.

Run `node <skill>/scripts/musedraw.mjs designs --json` for the matching tags,
source/method and preview paths. Read only the closest method and scene. Inspect
its small preview when this is a reference/design learning task. Copy its native
scene to the task folder, then change actual objects and relationships. The
examples are concept illustrations, not measured data or validated science.
An unrelated mechanism needs its own arrangement; borrowing typography or an
object symbol does not justify retaining another model's branches.

## Choose the figure's visual grammar

Use the physical or computational relationship to choose a composition. These
are observations from distinct figure families, not a universal Nature style:

| Relationship | Drawing action | Keep stable or supplied |
|---|---|---|
| Mechanical change over time | Draw the same section repeatedly; let the boundary bend, contact or recover | Material colours, fixed supports and electrode positions |
| Contact, transfer and peeling | Show the actual touching faces, then the released layer and retained pattern | Which material moves and which surface keeps the pattern |
| Energy transitions and optical paths | Separate aligned energy levels from the spatial beam path; annotate the actual transition | Source-provided level order, direction and optical components |
| Competition for a binding site | Place actors on one shared locus, then show alternative occupancy at that locus | Site identity, biological actor identity and the stated mechanism |
| Molecular transformation | Keep unchanged fragments in place and show the changed bonds or groups locally | Supplied structure, bond order and atom identity; do not invent chemistry |
| Spatial transport or budget | Anchor routes to a supplied spatial base, then attach values to their routes | Actual geography, quantities and the meanings of width/colour |

The existing paths, native groups and scientific objects can express these
actions. They do not automatically infer a molecular structure, mechanical
model, map or energy diagram from a title. Complex spatial substrates need
appropriate source geometry. The simple object vocabulary is not a substitute
for that evidence.

For analysis boundaries, element-preserving representation changes, local graph
update scopes or event-to-response correspondence, use only the matching
[scope and mapping recipe](scientific-mappings.md). These relationships need
different geometry; another set of equally styled process boxes cannot express
their membership, element mapping or coordinate association.

Give the primary object the most room. Place short labels next to its parts;
use a detail view only where an interaction would otherwise be hidden. Preserve
the reference's white field and local tinted regions: a lightly coloured data
block does not imply that its entire panel should have a coloured background.
Use one consistent projection within a physical assembly, visible contact
boundaries, and finer lines for guides than for material silhouettes.

Primary examples for the different grammars:
[constrained cell states](https://www.nature.com/articles/s41592-026-03216-5/figures/5),
[transfer printing](https://www.nature.com/articles/s41928-026-01670-9/figures/1),
and [spatial flux budget](https://www.nature.com/articles/s43247-026-04133-3/figures/4).
The data and scientific claims in those works are not reusable example facts.

## Let spatial membership explain transport

For a material section or apparatus, establish the solid/fluid regions, contacts
and passable interfaces before placing transport. Keep a continuous substrate
when a route, opening or contact is the relationship the reader needs to see.
A pore is a visible opening in the barrier, rather than an arrow painted across
an uninterrupted wall. In a qualitative size-exclusion illustration, small
particles fit that opening and retained large particles stay upstream; these
relative sizes do not imply measured dimensions or filtration performance.

Keep the complete transport mark, including its stroke width and arrowhead,
in the region it represents; cross a boundary only at the stated interface or
opening. Water decorations inside an impermeable layer can imply a false route
even when the main arrow is correct. Distinguish transport from annotation:
a thin label leader may cross a wall to name an internal part, and a locating
line links a detail to its source without representing flow. Resolve ambiguity
through endpoint, line treatment and placement, rather than banning all such
crossings. Ordinary checks do not infer material membership or validate a
transport mechanism; free paths also do not follow an edited material boundary.

For an explicitly supplied two-port section with serial, full-span layers, the
experimental [open-section constructor](open-channel.md) emits open wall paths
and shared fixed geometry for removal states. It covers that narrow geometry;
it does not validate transport physics or arbitrary apparatus.

## Editable scientific object vocabulary

In a normal scene, a block is a frame containing a native illustration:

```json
{"type":"scientific","id":"features","kind":"tensor",
 "x":80,"y":120,"w":100,"h":120,
 "cells":[["soft","warm"],["focus","soft"],["warm","neutral"]],
 "palette":{"focus":"#548591","soft":"#D9E8E4","warm":"#CCA17E"}}
```

All kinds need `id,kind,x,y,w,h`; optional `size` is label type size. `palette`
maps `ink,neutral,focus,soft,warm` or your own role names to explicit colours.
Use the reference's object/category mappings; do not assign a new hue per box.

| kind | Parameters | What it depicts |
|---|---|---|
| `graph` | `points:[{id,x,y,label?,labelPos?,labelGap?,fill?,stroke?,diameter?}]`, `links:[{from,to,directed?,color?,width?,dash?}]`, optional `diameter` | An explicitly supplied graph; point positions are frame fractions |
| `network` | `layers:[3,5,4,2]`, optional `diameter` | A fully connected adjacent-layer schematic; unsuitable for arbitrary GNN topology |
| `manifold` | optional explicit `points:[{id,x,y,fill?,stroke?,diameter?}]` in the unit disk and `links:[{from,to,color?,width?}]` | A spherical wireframe with visible great circles; a conceptual coordinate representation, not a plain circle or a calculated embedding |
| `tensor` | rectangular `cells` of colour-role names or CSS colours, `depth` 1–6, pixel `offset:[dx,dy]`, `cellStroke` | Explicit feature cells/sheets; no inferred numerical scale |
| `sequence` | `tracks:[{label?,backbone?,segments:[{start,end,fill?,label?}]}]`, `bandHeight`, `links:[{from:[track,x],to:[track,x],color?,width?}]` | Supplied intervals and alignment guides; start/end/x are frame fractions |
| `layers` | `layers:[{label?,fill?,pattern?:"grid"}]`, `projection:[dx,dy]`, `separation` in pixels | Consistent projected top/front/side faces, first array item at the top; grid is native lattice on the projected top face |
| `cycle` | `steps:[{label,fill?}]`, `startAngle` degrees, `thickness` in pixels | Tapered circular movement geometry, not a set of process cards |
| `formula` | `runs:[{text,sub?,sup?,vector?,italic?}]`; each script is a string or another run array, at most two script levels; optional `enclosure:"circle"` or `"box"` | Native text with real script positions and a separate vector arrow; no TeX runtime |
| `laminate` | `layers:[{id,fill,label?,thickness?}]` (2–8), `deflection` 0–0.4, `gap` px, optional `electrodes:{layer,width?,fill?}`, `labelSide:"none"` or `"right"`, explicit `load:"F"` | A layered section with fixed ends and a smooth central bend; no material simulation |
| `duplex` | explicit `sites:[{id,at,marks:[strandId],fill?,label?}]`; optional `strands:[{id,fill},{id,fill}]`, `turns`, `phase`, `amplitude`, `strandWidth`, `markerRadius`, `markerOffset`, `rungs` | Two continuous native backbones and independently editable paired site markers; no inferred sequence, methylation outcome or binding mechanism |

Graph point captions default above the point. Use a point's `labelPos` to choose
a side clear of its incident links; use `labelGap` for clearance rather than
moving the point or changing topology. The supported sides, defaults and
collision response are in [point caption placement](scientific-details.md#derived-graph-view).

For paired site markers and condition comparisons, read the short
[substrate comparison method](scientific-comparisons.md). Reuse one substrate
geometry, then change only the explicitly supplied marks or actor states.

For a repeated physical section, declare the materials once and use a state row:

```json
{"type":"scientific","kind":"laminate","id":"section",
 "x":70,"y":420,"w":960,"h":180,"size":18,
 "layers":[{"id":"film","fill":"#C6DFDC","thickness":5},
           {"id":"active","fill":"#EBC8A1","thickness":4},
           {"id":"base","fill":"#D8DFE8","thickness":9}],
 "gap":2,"electrodes":{"layer":1,"width":18,"fill":"#3C4749"},
 "states":[{"id":"rest","label":"静止","deflection":0},
           {"id":"load","label":"受压","deflection":0.3,"load":"F"},
           {"id":"release","label":"卸载","deflection":0}]}
```

`states` holds 1–6 equal comparison frames and replaces top-level `deflection`.
Electrode layer indices start at zero. Thickness/gap/width are drawing pixels;
deflection is centre displacement divided by that frame's height. All frames
reserve the same bend range: changing deflection keeps the end positions and
electrodes fixed. Labels remain inside the frame. Keep the row wide enough for
slender sections. The supplied deformation is schematic, not a force/displacement
law. Use `layers` for a projected exploded overview, `laminate` for its section
states. An explicit `load:"F"` (one Latin letter) draws the vector symbol and
its downward force arrow at that frame's actual top-material surface. Omit it
for unloaded frames; force is not inferred from curvature. Do not hand-calculate every
curve and fixed end when this object describes the intended relationship.
If a material is explicitly a mesh, show that identity in its overview with
`layers[].pattern:"grid"`; a solid coloured band with a mesh label is
insufficient. The lattice is schematic, not measured pore size or conductivity.
An unloaded elastic schematic returns to its stated resting contour unless
the brief supplies residual deformation or hysteresis.
Attach a load symbol to a visible force arrow acting on the material, and place
a state variable beside the state it identifies. An isolated formula in empty
space does not express that relationship. Frame names and consistent geometry
already show the comparison; do not repeat construction instructions as footer
sentences such as “same materials and endpoints in every frame”.

For example, layer state `v_i^l` uses `runs:[{"text":"v","sub":"i","sup":"l"}]`.
Input dimension `v_i ∈ ℝ^{d_v}` uses
`runs:[{"text":"v","sub":"i"},{"text":" ∈ ","italic":false},{"text":"ℝ","sup":[{"text":"d","sub":"v"}]}]`.
A vector output `y_{α₂}` uses
`runs:[{"text":"y","vector":true,"sub":[{"text":"α","sub":"2"}]}]`.
Give formulas enough frame width and height at the intended type size; they do
not shrink or replace their scientific symbols to fit. An `enclosure` keeps the
circle/box and scripts inside one native module; `palette.soft` sets its fill.
`T`, `l`, prime, vector arrow and tilde have different meanings; preserve the
source's actual choice. Do not approximate one with another Unicode character.
For a tiny ambiguous symbol, inspect just that high-resolution region before
changing it. Read the original figure caption when available. If figure and
caption use different notation, record the discrepancy; a faithful image
replication preserves the visible glyph rather than silently interpreting it.
A unique script can be changed through `patch`, for example
`[{"id":"state","field":"sup","expect":"T","value":"l"}]`.
An ambiguous match fails instead of changing several scientific symbols.

When replicating ball-and-stick objects, preserve visible branch geometry,
small and large atom sizes, and bond endpoints. A regular ring or denser random
graph is not a substitute. For a wireframe containing only points, omit
`links`; adding star-shaped bonds invents relationships. Ambiguous occluded
detail belongs in the private replication record, not in fabricated chemistry.

Do not use decorative cells, nodes or interval lengths as experimental evidence.
Keep supplied counts/topologies exact when they carry meaning. State geometry
is schematic unless actual dimensions/data are provided.

## Compose at actual endpoints

Each block exports a native group; its text and shapes remain separate editable
objects. The whole-object terminal is `block.id`. A graph point terminal is
`block.id + '-' + encodeURIComponent(point.id)`; feature cells use
`block.id-sheet-L-cell-R-C`; network units use `block.id-layer-L-unit-N`;
projected `kind:"layers"` layers use `block.id-layer-N`. Numbers are zero-based. Stable IDs make
renaming independent from geometry.

A `laminate` with `electrodes` exports the actual contact nodes
`block.id-electrode-left` and `block.id-electrode-right`. Its material layer
paths are shapes, not `-layer-N` connection terminals. In `object-views`, replace
`block.id` with the documented `object-views` entity node ID, for example
`device-rest-patch-electrode-left`. In a laminate's own `states` array the
prefix is `block.id-state-` plus `encodeURIComponent(state.id)`. Connect a lead
to its electrode node; a whole-object anchor is not an electrical contact.
Right-side laminate labels pack near layer ends with clearance around a declared
electrode's horizontal lead. Enlarge the frame if those rows cannot fit; this
local clearance does not route or avoid arbitrary external connectors.

Use normal scene `edges` with actual `from/to` IDs for processing, causal or
feedback relations. Connect the complete resource when the resource is consumed;
connect an actual layer/point when that is the destination. A local alignment
guide, magnification leader or cycle arrow is an editable shape, not an attached
causal edge. These meanings must remain distinct.

Trace each stated input through its first actual consumer. A feature array
drawn beside an arrow is not connected unless its own terminal is on that
path. When showing a transformation, preserve unaffected intervals, identities
and variable names; when showing states, let a colour follow the encoded
material/state instead of repeating a previous frame's colour by default.
Place a task/path label on its actual branch: a molecular-level branch must
not inherit an atom-level destination merely because both start from the same
condition features. Reusing a line style does not make two consumers equivalent.

When a reference contains a circular arrow loop or a geometric wireframe, use
the matching `cycle` or `manifold` object when its geometry fits. They retain
the curved arrow silhouette and coordinate planes that a generic curved
connector or plain circle would lose. Use custom paths for a genuinely different
object, and preserve its identity rather than substituting an easier symbol.

Use node labels for bounded captions; disconnected free text has no knowledge
of a nearby box's interior. Preserve the reference's simple type hierarchy and
physical proportions before adding detail. Dense journal artwork and screen
diagrams have different final-size needs; inspect at the intended size.

## Learning and delivery

For this reference-learning task, compare the actual image and output: silhouette,
panel proportions, object placement, topology, colour roles, label hierarchy and
fine linework. Preserve first attempts. Record missing capabilities separately
from content mistakes. Automated checks establish measured geometry/export
health; they cannot judge resemblance, scientific truth or editorial quality.
Routine non-review deliveries retain the normal automatic-first policy.

Method sources: [Nature Figure's contract](https://github.com/Yuan1z0825/nature-skills/blob/main/skills/nature-figure/references/figure-contract.md),
[observed figure families](https://github.com/Yuan1z0825/nature-skills/blob/main/skills/nature-figure/references/nature-2026-observations.md),
and [asset adaptation](https://github.com/Yuan1z0825/nature-skills/blob/main/skills/nature-figure/references/asset-adaptation.md).
This implementation is original; those documents are studied as design-method
references, not incorporated as a requirement for journal submission.
