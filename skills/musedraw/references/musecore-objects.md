# Teaching objects and geometric relationships

These are calculated teaching illustrations, not arbitrary picture generators.
Choose them when a reader needs to understand the stated time, ideal physical
relationship, scale or solid. Preserve the material and object language of the
chosen construction; supply content rather than page coordinates.

```sh
node scripts/musedraw.mjs core list --compact
node scripts/musedraw.mjs core example lens --out output/lens.json
node scripts/musedraw.mjs core render output/lens.json --out output/lens
```

Write the input on the user's behalf. Inspect the actual PNG at delivery size.
Keep its SVG, offline editor and content source. A teaching example is not an
observation or a measurement; identify hypothetical or idealised content.

## Choose by the relationship

| Family | Content and computed decisions | Boundary |
| --- | --- | --- |
| `clock` | Integer hour 0–23 and minute 0–59; optional `afterMinutes` 0–1440. Continuous hour-hand position, minute-hand position, digital reading and date carry share the same calculation. A comparison uses two clock faces. | Twelve-hour analogue dial and supplied 24-hour digital time. No seconds, timezones or calendar inference. |
| `reflection` | Incidence angle 0–80 degrees and mirror tilt −20..20 degrees. Compute the mirror tangent, normal, incident and reflected rays together; angles refer to the normal. Near-normal incidence uses one shared angle caption. | Ideal plane mirror, one plane, no refraction, scattering or curved surfaces. Grazing angles outside the range are refused. |
| `lever` | Two or three examples with class, positive effort/load arms and load force. Compute effort from balanced moments; dimension lines use the actual arms. Rounded factors use approximate rather than exact equality. | Ideal rigid lever at equilibrium. Class two requires effort arm longer than load arm; class three requires the reverse. Each panel has its own geometric scale. Arrows indicate direction, not force magnitude; pivot reaction is omitted, so this is not a complete free-body diagram. |
| `lens` | Positive focal length, object distance and object height; optional comparison distances. The thin-lens equation drives image distance, signed height, principal rays and the comparison table. Real and virtual images have distinct line conventions. | Ideal converging thin lens and paraxial rays only. Exact focal placement yields parallel rays and no fabricated finite image. Near-focus inputs that make the drawing unreadable are refused. Not an optical instrument design or a thick/diverging-lens model. |
| `ruler` | A positive quantity in mm, cm or m, display unit and integer ruler maximum 2–20. Object endpoint, dimension line, ten subdivisions per displayed unit and conversion row share one scale. | The quantity must fit the chosen range. This is a length-scale teaching diagram, not a calibrated screen ruler or a measurement instrument. |
| `magnitudes` | Three to fourteen labelled positive values between 1e−100 and 1e100, spanning at most 100 orders. Positions use log10 values; label tracks may move while numeric points stay fixed. | All items must represent the same quantity/unit. Zero and negative values are refused. Approximate supplied values remain marked approximate. Do not imply measured precision for illustrative examples. |
| `solids` | Three to six cubes, cuboids, cylinders or spheres with positive dimensions. Recompute object geometry, dimension annotations and volumes; three objects use one row. | Per-object local scale, not a common size comparison. Sphere auxiliary curves are explanatory, not edges. No arbitrary meshes, surface integration or formal CAD output. |
| `orthoview` | A 2–6 by 2–6 height map of integers 0–8, with 1–120 unit cubes. Derive exposed isometric faces and front/right/top projections from the same solid. An optional explicit-angle branch computes front/left/right/plan from one voxel coordinate system. Orthographic views share a unit scale. | Columns are filled continuously from the ground; no holes, overhangs or arbitrary polyhedra. Isometric scale is separate and stated. Unknown cells cannot be silently padded. |

### Explicit-angle solid comparisons

For `orthoview`, supply **both** `projectionConvention` (`"first-angle"` or
`"third-angle"`) and `gridRowOrder: "front-to-back"` to select the four-direction
comparison. Unknown values, either field alone, and unrelated fields are refused.
The optional source-derived input is `orthoview-first-angle.json`.

Coordinates are x right, y rear, z up. Front looks along +y; left along +x
(with screen right −y); right along −x (screen right +y); plan along −z
(screen right +x and screen up +y). Every projected square retains its occupied
voxel ray and nearest cube. The isometric camera is explicitly mapped back to
that same height grid. First angle places the left view right of the front and
plan below; third angle places the right view right of the front and plan above.
Changing convention changes panel positions, not the contents of a named view.
These placements follow [Autodesk's projection-angle explanation](https://help.autodesk.com/cloudhelp/ENU/Fusion-Drawing/files/GUID-0DB05CD9-BE99-4E45-9FBD-8B8AF1F297BF.htm).

The same bounded height-map domain applies: 2–6 rows/columns, integer heights
0–8, 1–120 grounded unit cubes. Four directions are a new comparison facility;
source 145 itself contains front/left/plan panels. Its nine-cube arrangement is
consistent with first angle; its left on-screen heights are 3, 2, 1.
No arbitrary CAD surfaces, overhangs, hidden measurements or formal drafting
compliance are inferred. Titles, subtitles and notes remain complete; text is
measured at fixed sizes, and the page expands with the content. Text that cannot
fit the bounded title/subtitle/note line budgets is refused rather than truncated.

Inputs with **neither** new field retain the legacy rendering, including its
accepted numeric projections and row orientation. That route presents independent
direction views; its right-at-right/plan-below layout does not promise a standard
first- or third-angle unfolding. Do not silently assign it the new coordinate
convention or reinterpret an existing input. `orthoview-convention.test.mjs`
checks independent ray identities, both conventions, the non-symmetric example,
maximum grounded solids, true scope exits and browser font-bound stress.

Titles, explanatory wording, units and whether an ideal model is appropriate
remain semantic responsibilities. A correct geometric calculation cannot validate
the premise of a real scientific claim.

## Reusable object mechanisms

- `teaching-objects.mjs`: clock geometry, reflected vectors, thin-lens image
  calculations, lever equilibrium, teaching surfaces and directed strokes.
- `solid-objects.mjs`: shared isometric projection, cuboid faces, solid measures,
  exposed voxel faces and three orthographic projections.
- Existing quantitative label tracks separate label placement from numeric
  position. Object geometry never moves to make a label appear correct.

Chalkboard, blueprint, Swiss magnitude scale and Bauhaus solid plates are
different material systems. They are not global defaults for technical reports.
Use a conventional report family when a report calls for that convention.

## Scientific sources and execution checks

The ideal thin-lens signs/equation follow [OpenStax Physics, lenses](https://openstax.org/books/physics/pages/16-3-lenses).
Balanced moments use the equilibrium relationship described in [OpenStax University Physics](https://openstax.org/books/university-physics-volume-1/pages/12-1-conditions-for-static-equilibrium).
Reflection angles are measured from the normal, as illustrated by [The Physics Classroom](https://www.physicsclassroom.com/mmedia/optics/lr.cfm).

`node tests/musecore/objects.test.mjs` checks known numeric results, independent
projection expectations, changed content, label reflow and scope exits, with
browser-measured rendering. This is execution evidence, not an aesthetic verdict
or proof of transfer through WorkBuddy or ZCode. Source identities and hashes in
the registry record a bounded related capability; they do not claim complete
parameterisation of the original source works.
