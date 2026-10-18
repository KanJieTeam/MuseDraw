# Two mapping modes with one processing trunk

Private candidate. Original concept schematic; no real sequencing experiment, genomic coordinates, sample counts, event frequencies or measured accuracy are shown. Segment lengths and graph positions are symbolic. This is not SVPG or a claim about its implementation.

## Select this recipe
Use when two input representations feed the same identification, filtering and merging operations, followed by one incremental graph output. Read the central downward spine first; the smaller lateral object diagrams explain the local relationships used by that spine. The two inputs are alternative modes, not evidence that biological samples are pooled.

## Compose and adapt
1. Show each representation as an actual object: a segmented linear path with mapped fragment strips, or a branching graph with alternative routes. Do not duplicate a full pipeline for each input mode.
2. Place shared operations once in the central spine. The arrows from input to output remain native source/target edges.
3. Put gap alignment and path consistency next to identification. Put discontinuous support and insertion-relative-to-path next to filtering. Their thin non-directional leaders indicate an explanatory view, not additional processing steps.
4. Merge only events that meet the supplied compatibility criterion. The two coral intervals illustrate overlap qualitatively; they do not imply a threshold, locus length or observed count.
5. Keep the graph identity into the output: existing path vertices retain their teal encoding and the inserted alternative retains its coral encoding.

## Replacement points
- Modes: linear-mode, graph-mode, mapped-input. The linear reference and fragment strips have explicit native node IDs. Graph points and links are explicit.
- Shared operations: identify, filter, merge. Preserve their IDs when replacing labels; reconnect edges if the actual method has different shared boundaries.
- Local evidence: gap-detail with gap-* nodes/edges; insertion-detail, path-detail scientific graph blocks; support-detail with support-* nodes/edges; interval-a and interval-b.
- Output: updated-graph.points/links. Change topology explicitly when adding or removing a branch.
- All central edges, input edges, object graph bonds, alignment lines and explanatory leaders use scene.edges. Arrowless leaders carry a different meaning from directed execution arrows.

## Boundary and remaining work
This recipe does not infer a biological structural variant from a drawn gap, specify alignment scores, declare a filter threshold or validate a genome graph. A graph insertion is a conceptual branch, not a faithful nucleotide sequence. The blue selected-route overlay follows a continuous alternative path; this symbolises an allowed alignment, not observed read support. The compatible-interval detail shows the inputs to merging; the output graph shows the resulting new route without inventing a quantitative scale. Compound motifs export as native module groups that can move together; their component shapes remain individually editable.

Render scene.json with the bundled MuseDraw engine. This original worked example teaches composition; do not promote it as a user-approved gallery case automatically.

## Native endpoint contract
The motif's overall endpoint is its block `id` (for example `object-graph` or `updated-graph`). Use it when the whole resource is the input or output. An actual part endpoint is `block.id + '-' + encodeURIComponent(partId)`: graph point `a` in `path-detail` is `path-detail-a`; a tensor cell is, for example, `latent-sheet-0-cell-0-0`. Connect to the real part when that part, rather than the whole module, is the scientific destination. Stable IDs preserve identity across renames; do not derive them from a displayed label.

Graph bonds and all directed processing paths are connected native edges. Pure sequence alignment curves and cycle-motion geometry, if added, are editable shapes and must not be described as causal connected edges. Module grouping does not make an illustrative scientific mechanism validated.

Provenance is stored in scene metadata and this method; it is intentionally absent from the drawing. preview.jpg is the current checked preview; no user aesthetic approval is implied.
