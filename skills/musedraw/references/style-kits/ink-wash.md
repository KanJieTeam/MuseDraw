# Ink Wash · make ink weight and intervals carry the subject

Use for original explanatory work, covers or report figures in MuseDraw's
Ink Wash family. It is a contemporary working language, not an authoritative
style for all Chinese cultures or periods. A painting still needs an appropriate
image tool; the vector kit makes editable drawings rather than painterly images.

## Coordinate the decisions

- **Start from a relevant contour.** A tool's long handle, an opened record or a
  winding path can organise the picture. Do not add mountains, bamboo, a seal
  or splashes merely because the request says 国风.
- **Concentrate ink where the subject needs attention.** Pair one dark mass or
  weight-bearing stroke with quieter edges and open paper. A wash can belong
  to an object; it should not become an unrelated background blob.
- **Place text in the intervals the drawing creates.** A vertical display can
  balance a horizontal object, while annotations remain horizontal and near
  their anchors. Vertical writing is a choice, not a rule for every label.
- **Keep evidence exact.** Use conventional body/number fonts for instructions,
  dates, axes and units. Brush edges may express an object or display gesture;
  never jitter measured paths, labels or data coordinates.
- **Use vermilion for a reason.** A proofing note, exception or changed part can
  carry it. An invented signature seal or token red circle adds no meaning.

Choose the reading field: a horizontal handscroll for a journey; an open-leaf
study for one object and marginal notes; or a sparse dark-to-light field with a
separate evidence column. Content must change the silhouette and reading path,
not just the text in an old layout.

## Working resources

```sh
node <skill>/scripts/style-kit.mjs --style ink-wash --out output/new-work
```

`marks.mjs` provides the same editable object vocabulary as the Swiss kit, with
quiet outlines, ink-weight variation and separate display/evidence type roles.
`style.css` provides corresponding HTML roles and a responsive vertical heading.
The module does not turn every work into a scroll or choose the page layout.

```js
import {Sheet} from './marks.mjs';
const d = new Sheet('ink-wash', {width:1600, height:1100});
d.record({x:160, y:300, width:240, height:320, kind:'raw'});
d.vertical(1360,180,'原始记录', {size:78});
// Place supplied facts and the actual relationships around this subject.
```

Use `brush(points, options)` for a meaningful gesture or contour, keeping the
supplied centreline and endpoints. Use ordinary `path()` for precise
relationships. `callout()` attaches a label to an explicit object anchor.
See the [drawing API](../style-kit-api.md) for signatures and limitations.

## Adaptation and review

Do not uniformly fade the whole work: dark ink establishes the focal object,
body text stays readable, and genuinely secondary marks retreat. For long copy,
change the open field or choose the evidence-column move; do not squeeze all
instructions into narrow calligraphy columns. If a brush/display font is missing,
use the stated system fallback and inspect actual line breaks.

Inspect both the whole image and its required details. A recognisable ink palette
does not establish successful composition. Status: working resources and
development studies, with no demonstrated cross-host aesthetic benefit yet.
