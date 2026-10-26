# Measured callout lanes for native vector scenes

Use `scripts/layout-callouts.mjs` before the ordinary scene renderer when a
light-background `type:"vector"` scene needs long labels in declared empty left
and right lanes. It appends dark text and thin arrowless leaders. It does not
recognize scientific parts: the caller supplies the original subject bounding
box, exact text, true anchor coordinates and each label's side.

Prefer direct labels inside a cell or part when complete names fit at the
intended reading size. External lanes can add unnecessary tracing across other
cells; orderly margins alone are not an improvement. Ordinary role workflows
keep their existing nodes and attached edges rather than using this tool.

```sh
node scripts/layout-callouts.mjs input.scene.json input.plan.json --out output/callouts-r1 --playwright output/runtime/node_modules/playwright/index.mjs
node scripts/musedraw.mjs render output/callouts-r1/scene.json --out output/callouts-r1/render --playwright output/runtime/node_modules/playwright/index.mjs --strict
```

Both commands also accept `--browser <Chromium/Chrome/Edge executable>`. Reuse an
existing Playwright module; no installation is needed. Module paths are relative
to the working directory or absolute; the installed bare package `playwright`
is also accepted. Scene/plan JSON may have a UTF-8 BOM.

The native scene requires `theme`, `size:[W,H]` and `nativeSvg` with matching
width, height, viewBox and `data-theme`. Its artwork must stay in the declared
subject box, apart from its full-canvas light background. Supply a plan such as:

```json
{
  "subjectBBox":{"x":210,"y":110,"w":180,"h":380},
  "blankSides":["left","right"],
  "fontSize":18,
  "fontFamily":"Segoe UI, Microsoft YaHei, sans-serif",
  "margin":18,"gutter":20,"gap":14,
  "annotations":[
    {"id":"housing","text":"Outer housing around the instrument","anchor":[214,190],"side":"left"}
  ]
}
```

Both blank sides must be explicitly declared. IDs are unique ASCII letters
followed by letters, digits, underscore or hyphen; anchors lie in the subject
box. Margin/gutter/gap default to 28/32/12 px; gutter is at least 16 px. Left
width is `subject.x-gutter-margin`; right width is
`W-margin-(subject.x+subject.w+gutter)`. Both lanes use vertical bounds
`[margin,H-margin]`. Choose the intended final reading size before layout; the
18 px fixture is a technical wrapping example, not a print/readability standard.

The tool measures real browser canvas glyphs, wraps at words or grapheme
boundaries, and packs each side in anchor-Y order. It preserves original SVG
bytes before the closing root and supplied anchors, never shrinks fonts or
deletes text, and rejects insufficient width/height. Report line text plus
`breakAfter` reconstructs every original code unit, including spaces/newlines.
Use the same browser and system fonts for measurement and render. Font fallback
is measured; the first named font's installation is not guaranteed.

The output directory must be new. Existing directories are rejected without
changing their files. A failed new run writes `report.json` with `passed:false`
and no scene; a successful run writes the annotated `scene.json` and measured
`report.json`. Read both this report and renderer `checks.json`. Engine vector
checks alone do not establish lane geometry or factual accuracy.

Leaders reach the subject boundary horizontally, then cross the empty gutter
diagonally to the label port. They remain free editable vector geometry, not
node-attached connectors or causal edges. Same-height anchors emit
`DUPLICATE_ANCHOR_Y` because subject-side horizontal segments may coincide.
The method does not route around arbitrary obstacles, inspect subject artwork,
or certify scientific anchors. It only arranges the declared empty side lanes.

In a repository checkout, run the dependency-free invariants, then the optional
real-browser/engine tests (fixtures are excluded from the lightweight install):

```sh
node --test tests/callout-layout/layout.test.mjs
MUSEDRAW_PLAYWRIGHT=output/runtime/node_modules/playwright/index.mjs node --test tests/callout-layout/*.test.mjs
```

In PowerShell, set `$env:MUSEDRAW_PLAYWRIGHT` before the second command. Browser
tests are skipped when that variable is unset; inspect the skip count. They
write fresh artifacts under `output/callout-layout-tests/`.
