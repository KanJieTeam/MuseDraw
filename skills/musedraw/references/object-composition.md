# Objects and relationships · 对象与关系的设计方法

Use the section matching the relationship in the brief. These methods complement
the 20 themes; they do not replace a requested style. They transfer composition,
not the appearance of a particular paper. Do not read all linked papers while
drawing. Scientific figures also contain measured images and plots that this
diagram workflow must not fabricate.

## Choose the visual evidence

Before drawing, identify the **thing that persists**, the **relationship that
changes**, and what the reader must be able to **see rather than read**. A method
is useful only if it makes that relationship visible. An ordinary responsibility
flow still belongs in a swimlane; don't add specimens or scientific decorations.

| Relationship | Visual evidence | Use |
| --- | --- | --- |
| Feedback changes a resource | An arrow lands on the resource being updated | Closed loop |
| An object is transformed/reorganized | Corresponding objects before and after | Object transformation |
| Several routes share work | One shared trunk, separate incoming/outgoing branches | Shared trunk |
| Conditions change an outcome | Same objects and positions; only actual changes differ | Matched comparison |
| A small part needs explanation | A marked source region and an anchored detail view | Overview and detail |
| Parts support/contain/stack | Layer order, contact and containment | Layers and cross-section |

## Closed loop · 闭环

Separate the input, the working cycle and the output. Put the feedback label on
the returning edge and make its destination the **actual updated object**:
new labels update a training set; retraining updates the classifier. Do not close
an attractive ring on an arbitrary neighbouring step. If the brief has two
different outcomes, keep both endpoints distinct. Ownership remains visible in
lanes or groups when the task involves people.

For a small cycle use `cycle`; for branches, exits and responsibility use ordinary
nodes/edges or `swimlane`. A node containing only “feedback” hides the mechanism.
Keep the return channel outside the main reading path, with enough space for its
condition. Example transfer: a repair acceptance failure returns to the stated
repair step, while acceptance success reaches closure by the stated owner.

Reference: [active-learning chemical prediction, Fig. 1](https://www.nature.com/articles/s43588-026-01063-0).

## Object transformation · 对象变化

Show a small recognizable object at each state: a document with its fields,
paired landmarks, a material layer, a grouped collection. Assign its identity
once; reuse its geometry and visual encoding. Move, group, split or combine only
what the brief changes. Stage labels name the operation, while the drawing shows
the result. Do not use random dots as fake data or change sample counts merely
to make a panel fuller.

Use `object-views` for repeated native shapes or compound scientific objects.
A scientific entity holds `scientific:{kind,...}`; the view supplies its frame
and stable native module ID. Duplex poses change only existing site marks;
laminate poses change only deflection and load. This makes the unchanged
substrate a code invariant rather than a request to redraw it carefully.
Define a persistent object's
`extent` once on its entity, and give each view only its position. This keeps a
locating pin or document from changing size when the host describes another
state. Use per-view size only when the brief actually changes size or scale.
Keep local coordinates comparable
between views and connect states only when the brief specifies a transition.
For example, assembly can show the same base, lid and two locating pins separated,
aligned and assembled. Documents can regroup by project without changing their
types. Irregular objects may use original `paths`; do not import a paper image
into the editable file.

Reference: [ELD landmark detection, Fig. 1](https://www.nature.com/articles/s41592-024-02199-5).

## Shared trunk · 共用主干

Draw shared work once. Branches join at the first genuinely shared operation and
leave at the last. Put branch-specific work near its branch, not in duplicated
full pipelines. A common processing step does not automatically mean samples,
accounts or materials are physically mixed; preserve separate identities where
the brief requires them. Distinguish a data source from the operation using it.

Use ordinary connected edges with explicit ports and one central spine; give
details their own subordinate area. A short side label can explain a special
operation. Don't repeat the entire pipeline to fill symmetrical columns.

Shared inputs or output types do not make two processing chains identical.
Keep each branch's actual operators and order, even when the branches have
different lengths. Don't add a padding step, merge different transformations
or duplicate a shared resource to make the layout symmetrical.

Keep parameters distinct from the samples or signals being processed. For example,
a threshold can sit beside the comparison that uses it, with a separate relation;
it is not another step in the signal path. Likewise, a reference input should
reach the operation that consumes it rather than an attractive nearby junction.
Use position, a short label or a distinct line treatment to make the role clear.

Reference: [SVPG, Fig. 1](https://www.nature.com/articles/s41592-026-03219-2).

## Matched comparison · 同构对照

Regular matching panels are appropriate here. Start from one geometry, duplicate
it with stable entity IDs, and change only the stated condition or result.
Keep the same role colours, scale, order and label positions. Show the difference
in the affected object, contact, occupancy or connection, rather than colouring
an entire card differently. Don't give each condition an unrelated palette.

`object-views` can place matching states without inventing transition arrows.
If the difference is quantitative, use the supplied values on a common scale;
do not substitute illustrative quantities. Keep uncertainty visible as stated.

For occupancy or localization changes inside a filled object, make the internal
parts distinct entities in the same view and list them after the opaque shell.
Reuse their size and colour; change their positions or presence only as stated.
Use entity `labelPos:"inside"` for an instrument's in-box text; `showLabel` alone
controls repetition, not placement. See the [object-view fields](scene-schema.md#object-views--transformations-and-matched-comparisons).

Reference: [VIM paralogue regulation, Fig. 6](https://www.nature.com/articles/s41477-026-02396-4).

## Overview and detail · 总览与局部

Keep the overview readable. Mark the exact source region, place its detail close
by, and join the two with thin **non-directional leaders**. A magnification leader
is not a causal arrow. Repeat identifiable boundaries in the detail so the reader
can locate it. Labels belong beside the corresponding object or contact; move
long explanations into document prose rather than adding a commentary sidebar.

Use `zones`, `paths` and `lines` for the selection and leaders, ordinary `nodes`
for graph objects, and `notes` only when a short anchored clarification is needed.
Do not add “zoom” as a process step or invent magnification ratios.
For a graph subset, use the [derived-view method](scientific-details.md) to keep
its topology and positions attached to one source. Distinguish this from an
image crop, a model transformation and a different sample/time/depth association.

Reference: [layered-device overview, Fig. 1](https://www.nature.com/articles/s41563-026-02751-y).

## Layers and cross-section · 分层与剖面

Make order and contact visible. For a stack use a consistent projection, aligned
edges and small separation. If physical thickness is unknown, use schematic
thicknesses without a scale or quantitative implication. Distinguish an exploded
view from an assembled section; don't turn every conceptual support layer into
physical material. Layer labels use short leaders on one side rather than
repeating centred text on every slab. Use depth only to clarify structure.

Use native `parallelogram`, `box`, `cylinder` and original `paths`, or repeated
`object-views` for assembly states. Contacts and return paths must still follow
the brief. A shadow cannot substitute for layer order.

For supplied perforated or cut-out parts, define actual material and empty
regions before adding depth or surface effects. Reuse that footprint across
views instead of painting white patches over separate solid sheets. The optional
[polygon footprint helper](material-footprint.md) transforms an explicit outer
polygon and named holes; it does not infer shapes, extrude solids or simulate
contact. Source edits require regenerating each view.

Reference: [elastocaloric device, Fig. 1](https://www.nature.com/articles/s41560-026-02122-6).

## Visual roles that survive a change

- Choose one colour meaning per family of objects: identity **or** state. If
  colour identifies a material in one view, that material keeps it in all views.
  Use position, shape or labels for the other dimension. Rich palettes are fine
  when they distinguish actual roles; white space is not a category colour.
- Use strong line/shape contrast for the main object, lighter boundaries for
  context, and small accents for the actual difference. Not every process needs
  a filled rectangle. The 20 named styles provide the type and line treatment.
- A repeated object stays identifiable after an edit. Reuse IDs, names and colour
  mapping; change the requested part. Never “improve simplicity” by deleting an
  exception, reducing a count or substituting a note for a required path.
- Validate facts/relationships separately from geometry. For review, compare the
  corresponding states and trace the return/branch/detail relation. A clean
  `checks.json` cannot establish these meanings or certify taste.

These are six working methods, not a claim to cover all Nature figures or to
have trained the host model. Test new content and keep user-approved results as
examples; don't turn every failure into another global prohibition.
