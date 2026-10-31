# Complete routes through one junction

Experimental additive family `converging-pathways` adapts the reader task in
`s05-danbai-jiegou`: distinguish preparation routes, see their one shared output,
then follow the common continuation. A visible station ID appears exactly once.
The original `pathway-map` family remains unchanged.

Use the existing pathway-map input schema with `family: "converging-pathways"`.
The caller supplies every station, route label, colour, segment and note. The
family accepts 2–4 independent forward branches (origin, 1–6 intermediate
stations, junction) and a single forward suffix of 2–5 stations. Shared origins
must occupy adjacent branch rows. It discovers the common junction from IDs and
declared route endpoints, never from names. Missing connections, shared
intermediate stations, loops, unoriented knowledge links and other topologies
are rejected; use pathway-map for those tasks.

The program measures text, recomputes row gaps and canvas size, puts route names
and limitations next to their branch, and continues the common route to the
right. Labels and notes are preserved or rejected if they exceed bounded line
capacity; text is never shrunk. Distances and branch order do not encode time,
method quality or equivalence. Colours are caller-supplied categorical IDs.

This is a layout adaptation, not a new scientific model. The protein fixture
keeps the existing source adaptation's wording; it does not claim to cover all
experimental variants or reconstruct undisclosed steps. Development checks and
self-inspected PNGs do not establish aesthetic approval.

Integration order: pathway-models, equation-figures and visual-tools must exist
before cap2-convergence-models and cap2-convergence-figures. Add the latter family
factory to runtime's family registry. Keep the old pathway-map branch intact.
