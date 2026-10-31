# Supplied image-layer comparisons

`image-build-comparison` compares explicitly supplied additive layer stacks in
one unit. It draws a common zero baseline, proportional layer heights, exact
per-stack sums, declared image-ratio pairs and declared artifact-copy endpoints.
The bundled example is `assets/musecore/image-build-comparison.json`.

Use 2–4 stacks, each with 1–6 positive base-to-top layers. Supply exactly one
`final-image`, at least one `comparison-image`, and optionally `excluded-stage`
stacks. Values have at most three decimal places and are summed as integer
thousandths of the single supplied unit. Excluded stages are summed separately;
they are never added to the final image. No unit conversion is inferred.

Each comparison explicitly names a comparison image and the final image. The
displayed ratio is final/comparison; ratios above 100% remain valid and do not
mean optimization. Each copy explicitly names an excluded source stage, the
final image and its target layer. This arrow means supplied artifact transfer,
not transfer of the entire source size, a byte-flow amount, conservation, or an
inferred relationship between all layers. Inputs have no placement fields.

The program does not execute Docker, parse a Dockerfile, inspect actual image
sizes, determine inherited layers, validate builds or guarantee optimization.
`evidenceKind` must explicitly identify a source illustration, given record or
synthetic teaching example. Unknown fields, endpoints, roles, incompatible units,
nonpositive sizes and excess counts/text are rejected. A layer below the bounded
shared-scale display resolution is also rejected rather than enlarged locally.

Source 113, “镜像分层剖面”, supplies illustrative 919 MB single-stage and 119 MB
final-image totals. The latter is 119/919 ≈ 12.9% of the former. The discarded
builder is explicitly 931 MB. Its three operations have no textual per-operation
sizes, so this input uses one 931 MB aggregate and keeps those three operations
as notes. The wheel artifact targets the explicitly labeled 61 MB final layer;
the arrow does not claim that all 931 MB are copied. Composition references in
render metadata describe the visual reference, not the provenance of every new
caller input. Original artwork remains unchanged.

The official [Docker multi-stage-build documentation](https://docs.docker.com/build/building/multi-stage/)
explains separate `FROM` stages and selective `COPY --from` of artifacts. That
general mechanism does not establish the example's numeric sizes or a real build
result. All source sizes here are illustrative, rather than measured images.

Production dependency order: `imagebuild-models.mjs`, then
`imagebuild-figures.mjs`; the latter uses `el`, visual tools and
`equationTextPlan`/`equationDrawPlan`, so equation figures must precede it in the
browser bundle. Factory: `imagebuildFamilies(h)`. Tests use production
`editorHtml`, `MuseCore.render` and `MuseCore.audit`, not a private renderer.
