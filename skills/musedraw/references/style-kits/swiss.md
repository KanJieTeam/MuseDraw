# Swiss · draw the subject at graphic scale

Use for an original Swiss poster, explanatory drawing or report figure. This
is MuseDraw's working interpretation, not a historical definition. Keep the
user's content and medium. New subjects do not need a new template program.

## Coordinate the decisions

- **Choose one large visible action.** A borrowed object leaves a rack and returns;
  a preserved source produces an editable copy; a section reveals a hidden part.
  Draw that object and action before deciding where supporting text belongs.
- **Let the accent do that action.** Red may identify a return path, a changed
  copy or a physical join. It need not colour the heading or a footer stripe.
  Existing category, safety or data colours retain their actual meanings.
- **Give type a role against the object.** A compact bold Chinese headline can
  oppose a long object silhouette. Dates/limits align in a separate precise
  field. Do not add an unrelated English slogan to make the page look designed.
- **Use an axis, not a wall of cards.** Align shared reading roles; let the new
  silhouette, amount of content and final size determine the columns and crop.

Three different moves are available: a specimen beside type for recognition;
an object sequence with a common edge for tracking change; a large section with
direct labels for understanding construction. Select from the reader's task.
They do not all need the same header, central rectangle or lower loop.

## Working resources

```sh
node <skill>/scripts/style-kit.mjs --style swiss --out output/new-work
```

The new folder contains `marks.mjs`, `style.css` and `make.mjs`. The module owns
coordinated type roles and editable tool/document drawings. You own the subject,
scale, arrangement and relationships. `style.css` provides the corresponding
HTML roles without prescribing a complete page.

```js
import {Sheet} from './marks.mjs';
const d = new Sheet('swiss', {width:1600, height:1100});
// Pick the object because it belongs to this brief, not to fill an empty area.
d.tool('wrench', {x:110, y:240, scale:1.7});
d.callout({anchor:[250,550], label:[470,560], text:'归还到原位'});
// d.scene() is an ordinary native-vector scene for the bundled renderer.
```

Useful marks: `tool(kind, geometry)` for wrench/hammer/screwdriver;
`record({...})` for raw/copy/script/figure sheets; `paragraph()` for bounded
copy; `callout()` for a supplied real anchor. Record drawings are document
motifs, not charts: the `figure` frame contains no invented data.
The compact API is in [drawing kit](../style-kit-api.md).

## Adaptation and review

If text grows, change column allocation, line breaks or object scale before
reducing reading size. A larger number is only useful when the brief contains
that number. Keep arrow endpoints on real objects. Caption a diagrammatic
motif as illustrative when it could be mistaken for measurements.

Inspect the actual output: does the main action survive a thumbnail, and can
the required wording be read at the delivery size? A successful export and a
recognisable style are separate from a successful composition.

Status: working resources and development studies; cross-host aesthetic benefit
has not been established. Existing [complete studies](../style-studies.md)
remain available when their image/type relationship fits.
