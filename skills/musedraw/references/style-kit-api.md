# Drawing kits for original work

The two current kits are [Swiss](style-kits/swiss.md) and
[Ink Wash](style-kits/ink-wash.md). Prepare a new work folder with
`scripts/style-kit.mjs`. This optional resource complements complete examples;
it neither selects the subject nor reflows an arbitrary whole page.

`make.mjs` runs in Node with no new dependencies and writes an ordinary scene.
Render that scene through `scripts/musedraw.mjs` as described in
[scene workflow](scene-workflow.md). For HTML use the copied `style.css`; these
scoped classes do not restyle the host page unless explicitly applied.

In Swiss HTML, `.muse-field` is a 12-column grid. Give direct children
`.muse-span-8`, `.muse-span-4` or `.muse-span-12` according to their actual roles;
the narrow view stacks them. Ink Wash's `.muse-field` is a two-field composition
that stacks on narrow screens. These are optional tools, not required page shapes.

## SVG marks

```js
const d = new Sheet('swiss', {width:1600, height:1100, title:''});
d.text(x, y, wording, {size:30, role:'body', fill:d.p.ink});
d.paragraph(x, y, wording, {width:320, size:28, leading:1.55});
d.vertical(x, y, wording, {size:76});
d.tool('wrench', {x, y, scale:1, rotate:0, tone:'ink'});
d.record({x, y, width:210, height:270, kind:'copy', label:'', heading:''});
d.callout({anchor:[ax,ay], label:[tx,ty], text:wording, side:'right'});
d.brush([[x1,y1],[x2,y2],[x3,y3]], {width:13, opacity:1});
d.path('M0 0H100', {stroke:d.p.ink, weight:2, arrow:false});
```

- Text roles: `display`, `body`, `mono`. Font fallbacks are system fonts; no
  remote font or commercial font is required. Chinese display falls back to
  Microsoft YaHei for Swiss and KaiTi/STKaiti/SimSun for Ink Wash.
- Tool kinds: `wrench`, `hammer`, `screwdriver`. These illustrative silhouettes
  share scale and ink roles; they are not dimensioned engineering drawings.
- Record kinds: `raw`, `copy`, `script`, `figure`. No data curve or statistic is
  invented in the figure frame. Fill it using the actual plot when needed.
  For raw/copy sheets, `heading` reserves an upper title region before the
  ruled content begins. `label` is a lower caption; neither is auto-fitted.
- `tone`: `ink`, `accent`, `muted` or another declared family colour. Colour
  semantics belong to the brief; do not infer priority or ownership from a name.
- `paragraph()` conservatively estimates character widths and returns the line
  count/height. It is not measured typesetting. Check actual rendered bounds.
- `callout()` computes a simple orthogonal leader from supplied coordinates.
  It does not discover anchors or avoid other objects. Recompose if it crosses
  a required label; do not present its existence as automatic collision safety.
- `brush()` varies outline weight along the given centreline. Use normal paths
  for data, exact mechanisms and connectors whose geometry carries facts.
- `svg()` returns editable artwork; `scene()` wraps it as a vector scene.
  Native-vector text may not be covered by scene graph checks. Inspect actual
  lettering and leaders when reviewing a new composition.

The original assets are part of MuseDraw under the repository licence. Resource
strategy was informed by [Han](https://github.com/you-want/han-design) and
[Guizang Social Card](https://github.com/op7418/guizang-social-card-skill): bundled
visual resources and task-sensitive choices, rather than a style adjective alone.
Their assets and sample layouts are not copied into these kits.
