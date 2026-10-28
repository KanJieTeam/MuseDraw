# An explicit open section

Use this experimental constructor only for a supplied qualitative section with
one left port, one right port and serial layers that explicitly span the channel.
It does not infer a device, seal, transport mechanism or scientific performance.
Other geometries need a different construction.

A development comparison exposed a closed housing line with a flow arrow drawn
through it. Another version left gaps above and below supposedly serial media.
The existing prose warning did not prevent either mistake. This constructor
makes those particular relationships explicit in the emitted native geometry;
it is not evidence of better overall scientific or aesthetic judgement.

```js
import { openChannel } from '../scripts/engine/open-channel.mjs';

const supplied = {
  id: 'section', width: 500, height: 150, portLength: 35,
  inlet: [60, 90], outlet: [60, 90], strokeWidth: 2,
  partitions: [
    { id: 'screen', x: 120, width: 25, spansChannel: true },
    { id: 'replaceable', x: 340, width: 50, spansChannel: true },
  ],
};
const section = openChannel(supplied);
const replacing = openChannel({ ...supplied,
  partitions: supplied.partitions.filter(p => p.id !== 'replaceable'),
});
```

Import paths above are relative to this guide; adapt them to the build script.
Coordinates are drawing units, not physical dimensions. The local origin is the
upper-left inner boundary. Each port supplies its top and bottom, not a centre and
radius. The returned `wallPaths` have `d` and `fill: 'none'`: preserve that fill
when emitting SVG paths, otherwise SVG's implicit fill can close an open path.
Apply the returned `strokeWidth` and your chosen stroke colour. The two paths
leave the ports open instead of painting arrows over a rectangular end cap.

Returned `partitions` are native rectangles at `y: 0` and the full channel height.
Only supply `spansChannel: true` when the brief supports that relationship.
Texture and apertures remain the creator's responsibility: white dots are not
automatically real holes, and this helper does not validate light or fluid paths.
Use the existing material-footprint method where an actual interior aperture is
required. Do not add full-height layers just to satisfy this constructor.

Keep one local model and transform the whole group for repeated states. Remove
only the specified replaceable layer; fixed parts and wall paths should remain
identical. Use `ports.inlet` and `ports.outlet` as geometric anchors, then check
flow arrows, labels, callouts and the removed object in the actual render. The
constructor cannot check a separately drawn arrow or prevent later SVG edits
from contradicting its output.

Its regressions check open emitted paths, full-span sections and unchanged fixed
parts under removal. A thousand varied geometry fixtures are **not** a thousand
independent creative comparisons or an aesthetic score.
