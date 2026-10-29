# Complete compositions in the existing twenty styles

Use a complete work to make a named style concrete. The small registry includes
28 original compositions across the twenty existing families: editable reports,
posters, concept drawings, teaching figures and runnable pages. These are starting
works with explicit production media, not a universal style switch or proof that
every host/model will produce the same quality.

Find one without loading every example:

```sh
node <skill>/scripts/style-library.mjs --style blueprint
node <skill>/scripts/style-library.mjs --search "会议"
node <skill>/scripts/style-library.mjs --id blueprint-rainwater --out output/rainwater-study
node <skill>/scripts/style-library.mjs --id product-minutes --out output/meeting-study
```

The new output directory contains only the chosen work and its local dependencies.
Read its `prompt.md` and `design.md` where supplied; earlier poster/report methods
are in [visual language](visual-language.md). Open the actual preview before
deciding what belongs in a new subject. Keep useful material/type relationships,
and rebuild the spatial argument when the task needs another arrangement.

## Choose the relevant resource

| Family | Original complete work | Useful production decision |
| --- | --- | --- |
| Newsprint | [chair structure](../assets/visual-language/newsprint-chair/design.md) | One decomposed subject, aligned assembly axes, hatching and real part anchors |
| Blueprint | [rainwater section](../assets/visual-language/blueprint-rainwater/design.md) | A section makes paths spatial; main supply and overflow remain distinguishable |
| Enterprise | [renewal discussion](../assets/visual-language/enterprise-renewals/design.md) | Lead with the decision, then retain responsibility and next action in the comparison |
| Product | [meeting workbench](../assets/visual-language/product-minutes/design.md) | The source discussion and resulting decisions remain simultaneously readable |
| Pastel | [observation workbook](../assets/visual-language/pastel-hypothesis/design.md) | Soft fields carry different reading roles rather than identical cards |
| Terracotta | [repair event](../assets/visual-language/terracotta-repair/design.md) | Material colours belong to a specific still life and repair detail |
| Metro | [research journeys](../assets/visual-language/metro-learning/design.md) | Interchanges and shared tracks express actual shared work; track length is not time |
| Observatory | [trace reading](../assets/visual-language/observatory-trace/design.md) | Signal identity persists through common-scale intervals and their reading notes |
| Aurora | [sound instrument](../assets/visual-language/aurora-sound/design.md) | Glass depth separates a readable control surface from operable keys |
| Neon | [night ride](../assets/visual-language/neon-night-ride/design.md) | Large display type and one energetic route carry the pace; supporting text remains sharp |
| Terminal | [local release rehearsal](../assets/visual-language/terminal-release/design.md) | A real input produces real local checks and a downloadable file, not staged activity |
| Chalkboard | [area proof](../assets/visual-language/chalkboard-area/design.md) | The same object supports a visual argument and its exact equations |
| Whiteboard | [fieldwork day](../assets/visual-language/whiteboard-fieldwork/design.md) | People, the changing record and its retry loop form the composition |
| C4 | [literature containers](../assets/visual-language/c4-literature/design.md) | Typed entities, actual boundaries and connected dependencies carry this notation |

Swiss, Riso, Ink Wash, Editorial, Bauhaus and Journal have complete poster/report
examples in [visual language](visual-language.md#nine-complete-starting-compositions).

## A second subject can change the composition

Four same-creator development works explore another spatial argument inside
their existing families. They are not independent preference tests:

- [Newsprint / umbrella](../assets/visual-language/newsprint-umbrella/design.md)
  keeps one continuous silhouette and its shaft instead of decomposing the chair.
- [Blueprint / heat transfer](../assets/visual-language/blueprint-heat/design.md)
  uses two isolated channels and a separating wall instead of the rainwater site.
- [Chalkboard / slope](../assets/visual-language/chalkboard-slope/design.md)
  reads changes from coordinates instead of counting area tiles.
- [Whiteboard / review](../assets/visual-language/whiteboard-review/design.md)
  aligns an annotated source and responses instead of a four-step journey.

Choose between these moves from what the new content needs to explain. A shared
palette and letterform relationship can survive while decomposition becomes a
continuous object, a path becomes a section, or a sequence becomes correspondence.

## Let material belong to the subject

[Mend what matters](../assets/visual-language/terracotta-material/design.md)
adds an original photographic asset to the same Terracotta family as the graphic
repair event. Linen fibres, a visible patch and worn wood make the specific
subject readable. Keep text outside the bitmap when exact wording must remain
editable. A diagram of causal relationships needs its own appropriate medium;
this is an asset choice for tactile event/brand work, not a request to photograph
every report. The saved image, its source prompt and the complete layout ship
together so a receiving agent can replay the chosen work before making changes.

## Keep the medium usable

For the vector studies, render the copied `scene.json` using the existing scene
CLI. The complete `nativeSvg` is editable artwork; changing its theme name alone
does not restyle it, and its free paths are not node-attached connectors.

For the HTML studies, open the copied `index.html`. They have inline CSS/JavaScript
and include every local image. Adapt both the semantic content and the code.
`data.json` records the example input; the runnable page contains the same input
in its `study-data` JSON block. Keep them in agreement when editing. These pages
need no backend. Actual clipboard/audio availability depends on the browser.
The saved examples use fictional activities and records; retain that context.

The trace figure is built from supplied intervals rather than manually stretched
bars. To produce a new trace PNG from changed data:

```sh
python <skill>/scripts/plot_trace.py trace-data.json --out output/new-trace.png
python <skill>/scripts/plot_trace.py trace-data.json --compact --out output/new-trace-mobile.png
```

Keep the updated chart, recorded data and page input together. The root begins
at relative time zero, children stay within that interval, and overlapping
durations must not be summed as though they were serial.

**Change the reading arrangement when the viewing field changes.** In the narrow
Enterprise page, a table row becomes a labelled brief preserving its owner,
unresolved item and next action. The trace uses another plot frame over the same
intervals so its end points remain visible. The night-route canvas preserves its
aspect ratio and increases label size rather than stretching its geometry. These
are three content-specific adaptations; merely shrinking the desktop artifact
would lose the information or expression that made it useful.

The nine newer HTML works were checked at desktop/narrow widths; eight include
operable controls tested with pointer and keyboard. These are local production
and interaction checks, not independent aesthetic rankings. The ten vector
works were rendered and self-reviewed; generic geometry checks do not certify
their conceptual accuracy or beauty. System-font fallbacks can alter a replay.

To rerun the bundled interaction checks with a host's installed Playwright and
Chromium (no browser download is required):

```sh
node <skill>/tests/style-library/browser.mjs --playwright <playwright-module-file> --browser <chromium-executable> --out output/style-interactions
```

Use a new output directory. The test serves only local study files on a temporary
loopback port, exercises controls and writes results and downloaded sample notes.
