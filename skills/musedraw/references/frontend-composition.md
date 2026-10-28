# From a visual direction to a built page

Use when an original page looks interchangeable or the user asks for stronger
visual design. Preserve a supplied design system. These are composition options,
not compulsory layouts or a house style.

## Choose what occupies the space

Name the strongest available material and give it a job in the composition.
Decide its relationship to text, not just its colour. Write a compact private note:
subject material → spatial relationship → what the viewer can understand from it.
Include how that relationship changes on a phone. For example:

| Available material / job | Executable composition | When it fails |
| --- | --- | --- |
| A real schedule; compare duration and availability | Shared time axis, bookings positioned by start and duration; names and full time ranges alongside. On a phone keep the axis and reflow labels, or use a readable agenda with explicit times. | Equal-height booking cards imply no duration; tiny scaled-down desktop labels destroy reading. |
| An object whose construction matters | Give the object the dominant area; align one supporting text column to its meaningful boundary. Put details next to the relevant parts, not in a detached feature grid. | A decorative cutaway adds no explanation; the object is too small to identify. |
| A collection; choose and inspect one item | Large selected work with an index of real peers; selection changes the displayed work and its facts. Stack the selected work and index in a deliberate mobile order. | The index dominates the work; a collage crops away what visitors need to judge. |
| A route; understand stops and their sequence | One continuous path joins the actual stops; selection reveals the nearby explanation. Connect the overview to a readable itinerary rather than repeating isolated destination cards. | Diagrammatic placement looks like measured geography; map, selected detail and times disagree. |
| An event; decide whether to attend | Combine its title with its specific subject material; keep date, location and attendance action readable in the first useful view. Use the same motif for the programme instead of generic feature cards. | A spectacular image obscures dates or replaces the subject with an unrelated mood. |
| A working queue; act on an exception | Lead with the unresolved condition and its source evidence, then the records and action. Give ordinary and resolved values less emphasis. | A promotional hero delays work; a resolved zero still looks more urgent than an unknown value. |

These options were informed by local schedule and stock-workspace comparisons;
they are not proof that a particular layout wins every brief. Do not introduce
missing facts, photographs or measurements to make an option fit.

The [runnable schedule example](../assets/frontend/latch/index.html) demonstrates
the first relationship with a fictional workshop: a shared 09:00–15:00 scale,
90/90/30-minute bookings, room filtering and an honest local request form. Open
the HTML directly. Its geometry is one worked decision, not a default page to
reskin for every subject. It has no backend, external imagery or network imports.

The [runnable route example](../assets/frontend/island-walk/index.html) joins an
original three-stop schematic to a selected description and two actual demo
itineraries. Its [method and limits](../assets/frontend/island-walk/method.md)
explain what can transfer. It is a worked spatial decision, not an approved
travel service or a new default visual style.

## Make material carry the identity

Set actual type roles, colour roles and image crops for this material. A palette
name such as “editorial” is insufficient. Specify where the image can be cropped,
which words must remain intact, and which alignment joins text and object.
Use supplied or authorised imagery where it helps; do not turn a photograph or
painting into crude geometry merely because code is available. Use the image
route when that is the desired medium. Conversely, a real interactive schedule
can be a stronger product visual than a stock photograph of a workshop.

Before expanding the page, inspect the key composition at its intended desktop
and narrow sizes. If the subject is recognisable only from the heading, or the
primary material is unreadable, fix its size, relationship or production route.
Do not patch that failure with texture, more badges or a fashionable font.

## Preserve evidence and change one cause

For a requested comparison, keep the first draft and equal-size captures. Name
the visible defect, change the decision causing it, and recapture. Keep functional
checks separate from visual judgement. A new draft made after feedback is a
development revision, not a fair victory over an unchanged competitor.

An optional collector saves first-screen/full-page PNGs at three widths plus
geometry, broken images and page-script errors. It uses an existing Playwright
module and Chromium; it installs nothing:

```sh
node <skill>/scripts/capture-ui.mjs path/to/index.html --out output/review-01 --playwright <module-file> --browser <executable>
```

The output directory must be empty so a later run cannot erase first evidence.
Optionally pass `--targets targets.json`, a JSON array of CSS selectors for the
actual subject, action or evidence. Strings collect evidence only. An explicit
object requires one visible match and can set a minimum bounding-box width or
height in CSS pixels for this task; `atWidths` limits it to a nonempty subset of
the configured viewport widths (omitting it applies the contract at every width).
For example, this task-specific phone requirement catches a schedule squeezed
into a narrow desktop-grid column even when the page has no horizontal overflow:

```json
[".reserve", { "selector": ".schedule", "minWidth": 320, "minHeight": 200, "atWidths": [390] }]
```

Missing, multiple, hidden or undersized contract targets appear in
`view.contractDefects`, add to `measuredDefects` and make the CLI exit with status
1. Invalid contract fields, dimensions or viewport scopes are rejected before an
output directory is created. These conditional thresholds are supplied by the
task, not built-in aesthetic rules; passing them proves neither readability nor
visual quality. The report also records whether each unique target fits in the
first screen; being below the fold is not automatically wrong.
The collector does not click controls, score taste, prove accessibility or assess
occlusion, contrast and clipped descendants. Inspect the PNGs and exercise the
real task.
For animated work, also inspect its normal motion; these captures use reduced
motion to keep the still comparison legible.

Research references: [Taste](https://github.com/Leonxlnx/taste-skill),
[Hallmark](https://github.com/Nutlope/hallmark), and
[Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design).
Their selection, subject grounding and screenshot review are useful mechanisms;
their website-specific style prohibitions are not universal visual laws.
