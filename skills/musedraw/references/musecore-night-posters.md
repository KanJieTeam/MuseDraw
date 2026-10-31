# Night campaign objects

`river-run-poster` coordinates a supplied even total distance from four to twenty
kilometres, a same-path return course and an independently declared unscaled
curve. Paired kilometre labels derive from chainage, not measured screen length.
The river silhouette and curve are poster construction, not a surveyed map or a
claim about actual elevation, geographic distance or route safety. Event date,
start time, capacity and registration information are supplied separately.

The distance headline uses the bundled, unmodified TeX Gyre Heros Cn Bold OTF.
Its fixed 680px type size is measured with the same face used by SVG; a shorter
distance naturally takes less width. Only the bounded `0123456789K` display
alphabet uses local line-metric overrides, derived from its actual glyph bounds
with a three-pixel reserve. Glyphs are neither squeezed nor cropped. Other type
roles and the lunar poster retain their existing fonts. Attribution, GFL/LPPL
terms, original manifest and complete-package location accompany the font and
are embedded in the exported SVG metadata.

Normal `core render` and the offline editor prepare this local font before
rendering. Browser API callers, including loops that switch from another
family, must use `await MuseCore.prepare(input)` before `MuseCore.render(input)`.
Preparation is idempotent, validates the river input before loading its font,
and needs no network. Other current families need no font preparation and keep
their synchronous render behavior. Direct river rendering before successful
preparation throws an explicit error; it never measures a fallback face first.
The standalone SVG carries the same font data and face metrics, so it does not
depend on the editor's programmatically loaded face.

`lunar-night-poster` reuses the existing explicit moon-phase geometry. Focus phase,
illuminated side and teaching orientation control the large Moon, phase strip
and title together. An activity date is event text; the renderer does not infer
the actual phase, visibility, weather or local observing conditions on that date.
Surface marks are illustration, not measured topography or a lighting model.

Inspect `core example river-run-poster` or `core example lunar-night-poster`, then
use `core render`. Shared Gregorian date validation and phase functions are
reused, not replaced by an invented calendar or sky predictor. The layouts own
object scale and title/event hierarchy. Unsupported routes, observations or
overflow leave the family. Passing input and geometry checks does not approve
visual quality or establish a real-world event.
