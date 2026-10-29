# Relationship constructions · 关系到图形的制作资源

Use only for a new explanatory composition when its main relationship has not
been given a spatial form. These are **candidate design resources**, not validated
aesthetic improvements or a replacement for MuseCore. Keep the selected style
and production medium. A diagram can use a straightforward sequence; a measured
chart keeps its data encoding; an approved layout or local edit needs no new
construction study. Posters and paintings do not automatically need this table.

## Select a construction, not another page template

Find the verb and objects the reader needs to understand first. Select a matching
operation below, or devise one with the same semantic care. Read that card's
`asserts`, `doesNotAssert` and `failure` before borrowing its geometry. The
machine-readable cards are in [relation-operations.json](relation-operations.json).

| Meaning needed | Candidate operation | Important distinction |
| --- | --- | --- |
| Several contributions act on one result | `joint-surface`: distinct marks act across the same result surface | Only use spanning marks when the brief supports joint influence across it; do not divide results into exclusive owners. |
| Several inputs reach one destination | `converge`: separate paths reach the same receiver | Common destination is not proof of mutual influence or simultaneous processing. |
| A requirement applies across activities | `scope-field`: a low-emphasis field spans the affected objects | The field names scope, not an extra last activity; retain a separate main reading path. |
| A proposal selects routes with a shared delivery | `choice-rejoin`: branches join before shared checking | Do not make the check a sibling alternative; mark optional/combined routes with words. |
| Experience changes a resource or decision | `feedback-target`: the return ends on the changed object | A decorative ring, arbitrary corner or unrelated capability is not the target. |
| Ordered steps | `sequence`: successive objects on a clear axis | Use this directly for genuine order; no metaphor or extra visual operation is needed. |
| Conditions change the same object | `matched-change`: corresponding objects preserve identity and scale | Alter only the stated change; do not imply measurements from illustrative geometry. |

`joint-surface` and `converge` are different answers, not stylistic variants of
the same assertion. If neither fits, invent another construction. These small
studies do not automatically explain an abstract relationship without labels.

## Inspect or make a small editable study

All paths below are relative to the installed Skill; the helper uses Node only.

```sh
node scripts/relation-study.mjs list
node scripts/relation-study.mjs show joint-surface
node scripts/relation-study.mjs emit joint-surface --theme bauhaus --out output/relation-study
node scripts/musedraw.mjs render output/relation-study/scene.json --out output/relation-study/render
```

`emit` writes a small original `study.svg`, an `index.html` containing the same
inline SVG, the vector `scene.json`, and its `decision.json`. It refuses to replace
an existing output path. No browser, model, network or font install is needed to
emit. PNG rendering uses the existing scene engine. The examples deliberately
omit full-page titles, sidebars, project content and theme component effects.
They are diagram fragments, **not automatic layouts for arbitrary new content**.

For a scene, adapt the native SVG geometry and labels or reconstruct it with
ordinary paths/lines/objects when attached graph edges matter. SVG primitive
coordinates are in the emitted source; there is no hidden renderer. For HTML,
copy the inline SVG fragment into the page, or translate it to positioned elements.
For plotting, preserve the actual encoding instead. `emit` reads the selected
theme's palette only for the study; it does not change theme defaults or introduce
a new style policy.

## Carry the decision into the whole work

Keep the selected construction's role, not its sample coordinates or English
labels. Decide how it fits the actual type, image, space and material of the work.
Other relationships can use familiar, quieter lines, brackets or alignment.
Do not make every object compete with the main construction. Keep essential
labels readable and near the operation; the rest can sit outside it. A text-led
work can legitimately make typography the main visual.

When the user requests testing, compare the first render with the intended
relation and record mismatches separately from geometry checks. Return to the
proposal when the construction says the wrong thing. A thumbnail or text-hidden
view can help inspect mass and emphasis but cannot certify meaning or taste.
This resource adds no new mandatory judge, revision loop or numeric colour gate.
