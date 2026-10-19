# Connect an overview to the right kind of detail

Use when a figure has an overview and a local view. First identify what the
second view means; visual proximity alone does not establish correspondence.

| Relation | Keep consistent | Express it with |
| --- | --- | --- |
| Same geometry at another display size | Identity, orientation, relative positions and shapes | One source geometry, a uniform transform and non-directional leaders |
| Selected nodes from a larger graph | Node IDs, selected positions and all internal relations | A derived subgraph, not an independently redrawn network |
| Another representation or model | Supplied sample/region/part IDs and the actual mapping | A labelled mapping arrow when it is a transformation; do not claim a pixel crop |
| A different sample, depth or time | Supplied sample/ROI/interval IDs and calibration | Index or interval association; not an invented geometric registration |

A microscopy image, molecular structure, simulation field or measured curve
needs its source asset/data. A native schematic is not evidence that these have
been reconstructed. Do not infer a physical magnification from display size.

## Derived graph view

For a scientific graph with explicit points and links, define the topology once.
`graph-view` derives a selected view from that source, including every original
link with both endpoints selected. It keeps a uniform fit of the point geometry
and copies identities/colours instead of asking the host to redraw them.

```json
{"type":"graph-view","id":"local","source":"network",
 "select":["D","E","F","H"],
 "x":780,"y":300,"w":360,"h":270,"padding":24,
 "guidePoints":["D","H"],"labelSize":18}
```

`source` names a direct `type:"scientific",kind:"graph"` block in the same
scene. `select` contains that block's original point IDs, not generated SVG IDs.
No repeated point/link arrays are needed. Use explicit names on the source
points; editing a name, position, colour or internal relation then updates the
derived view from the same definition.

Point captions accept `labelPos:"above"|"below"|"left"|"right"|"none"`
and `labelGap` in nonnegative finite pixels. Defaults remain `above` and `6`.
Choose a side clear of incident bonds instead of placing a caption on a vertical
bond; `none` hides only the caption, preserving the point and its relations.
For example, `{"id":"D","x":0.8,"y":0.8,"label":"D","labelPos":"right","labelGap":8}`.
Derived views preserve the caption anchor and include its text extent in their
padded fit. They uniformly scale source positions and gaps while `labelSize`
sets the derived reading size; they do not automatically choose a clear side.
Browser checks report `text-edge-collision` when a graph point caption crosses
an authored connector, including incident bonds and links inside the same
module. Move that caption to a clear side and rerender. This check covers graph
point captions, not every free annotation or the figure's aesthetic quality.

A complete starting scene (original illustrative topology, no measurements):

```json
{"theme":"journal","size":[1100,600],"header":false,"footer":false,
 "autoFit":false,"blocks":[
  {"type":"scientific","kind":"graph","id":"network",
   "x":60,"y":70,"w":540,"h":320,"diameter":12,"size":16,
   "points":[{"id":"A","x":0.1,"y":0.5,"label":"A"},
     {"id":"B","x":0.45,"y":0.2,"label":"B"},
     {"id":"C","x":0.45,"y":0.8,"label":"C"},
     {"id":"D","x":0.8,"y":0.5,"label":"D"}],
   "links":[{"from":"A","to":"B"},{"from":"A","to":"C"},
     {"from":"B","to":"D"},{"from":"C","to":"D"}]},
  {"type":"graph-view","id":"local","source":"network",
   "select":["B","C","D"],"x":720,"y":270,"w":320,"h":290,
   "padding":25,"labelSize":18,"guidePoints":["B","C"]}]}
```

Replace the source points/links and selection with the user's facts, set the
two frames, then render a first draft. The helper fits the selected geometry;
do not hand-compute a second point array or inspect implementation code to
predict its scale. Judge reading size from the draft and adjust the detail
frame if necessary. Frames above illustrate the API, not a universal layout.

The optional two `guidePoints` join matching source and derived nodes with thin
non-directional native connectors. They express correspondence, not influence,
material movement or a new graph bond. Place the inset so these guides do not
cut through unrelated labels or bonds in either view. Prefer two selected
points on the sides facing the other view; extrema of the selection are not
automatically a good pair. If straight guides still obscure the argument,
omit them and use matching IDs, or place explicit native guide paths in the
clear space around the objects. Omitting them does not invent a transition.

This is an **induced subgraph**, not a crop: an unselected point is absent even
if it would lie inside the selected points' bounding rectangle. It does not
clip images, material layers or arbitrary paths, infer neighbours, register
different specimens, or generate a physical scale bar. Keep free native paths
for supplied irregular objects; their ability to draw a shape is separate from
automatic registration.

## Make the extra view useful

- Give the overview enough space to establish context. The detail needs readable
  objects and labels, not a miniature repeat that is harder to read.
- Preserve the user's requested detail. When inventing a composition, add an
  inset only for a specific local question; do not repeat the whole argument.
- Let position, boundaries and identity labels establish correspondence. A
  second palette or a generic paragraph cannot substitute for it.
- Separate action paths from guides through arrow semantics and line weight.
  Source apparatus/identity colours can persist while a quantitative response
  uses its own explicit scale.

## Apparatus and contact details

When the figure explains a physical interaction, make the supplied relationship
visible on the object. A beam should reach its intended sample, a picked-up
part should meet the pickup surface, and a released part should show the
specified separation. A nearby arrow or explanatory sentence cannot establish
contact. In matched states, retain material colours and object identity while
changing the relevant interface or pose.

Treat optical paths, electronic signals, state transitions and correspondence
guides as different relations. Automatic graph routing must not substitute for
specified reflection angles or an apparatus path. A 3D projection is useful when
it exposes a layer or contact; its decoration does not supply a scientific model.
Use free native geometry for these supplied shapes. This graph-view helper does
not compute contact mechanics, reflection or 3D registration.

Visual references illustrating different relationships:
[multiscale interface modelling](https://www.nature.com/articles/s41524-025-01941-7/figures/1),
[depth-indexed sampling](https://www.nature.com/articles/s43247-026-03618-5/figures/1),
[an apparatus with linked evidence](https://www.nature.com/articles/s41566-023-01304-y/figures/1).
These teach composition; they do not supply reusable scientific data or artwork.
