# Night campaign objects

`river-run-poster` coordinates a supplied even total distance from four to twenty
kilometres, a same-path return course and an independently declared unscaled
curve. Paired kilometre labels derive from chainage, not measured screen length.
The river silhouette and curve are poster construction, not a surveyed map or a
claim about actual elevation, geographic distance or route safety. Event date,
start time, capacity and registration information are supplied separately.

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
