# Platform Capability Architecture

Capability ownership is not actual data flow or physical deployment.

## Choose the structure

- Horizontal layers with support on both sides: separate consumption, services, storage, processing and sources; governance and security span multiple layers. Suitable for data platforms.
- Partitioned matrix: parallel business domains contain their own capabilities. Set widths by content, rather than forcing equal-sized regions.
- Narrow layer labels with wide module bands: useful for many technical layers with few modules per layer. Labels on the left establish the order.
- Software data-flow or integration paths: when the question is where data comes from and where it goes, draw a separate path view with actual sources, processing components and destinations—not just a capability table.

Use containers for containment, alignment for peers, and arrows only for explicit inputs, outputs or calls. The height of a cross-layer support column expresses its coverage; do not connect it to every cell.

Distinguish main containers, component nodes, cross-cutting capabilities, external systems and shared foundations. They may share a color family, but position, boundaries and headings must keep their roles distinct. Nesting within a layer does not prove physical deployment; a database symbol at the bottom does not prove a product choice. When the brief includes detailed calls, add a path view rather than forcing every capability into a single chain.

## Optional legacy palettes

The table below describes the helper's compatibility `--theme` mode, not a compulsory MuseDraw style. Use the seven named families in [visual-decisions.md](visual-decisions.md) and `--style` when appropriate. A user's visual reference takes precedence over these defaults.

| Role | Blue | Cyan-blue |
| --- | --- | --- |
| Primary emphasis | `#2B65CF` | `#1487B4` |
| Body text and secondary headings | `#284E88` | `#21627C` |
| Groups | `#E5EDF9` | `#E3F2F7` |
| Light background | `#F2F6FC` | `#F3F9FC` |
| Borders | `#ADC6ED` | `#A6D4E4` |
| Canvas and child modules | `#FFFFFF` | `#FFFFFF` |

Choose deliberate semantic roles. In legacy blue/cyan mode, light fields indicate groups and saturated fields use white text. Other families may use ink-only boundaries, dark surfaces or full colored domains. Preserve the reference's intended color-area proportions. Icons identify categories and share one outline style; do not copy vendor assets.

The legacy renderer's type scale remains unchanged for compatibility. New named-style figures start from the hierarchy in [visual-decisions.md](visual-decisions.md): title44, section28, body20, grouping18, annotation16 at roughly1920px. Measure actual glyphs and adjust to density. Keep natural names; do not force every label into a four-character abbreviation or wrap Chinese character by character.

## JSON input

The renderer still implements one data-platform skeleton, not automatic layout for all the structures above. It fixes the portal, two support columns, sources and infrastructure. Legacy `--theme` uses equal widths; optional `--style` uses content-weighted grid widths and named role palettes. Use the helper only when those roles match the brief. If the subject needs other regions or no sidebars, design native SVG instead. Tokens and weighted widths are not a graph-layout or routing engine; do not invent modules to fit the helper.

See [assets/data-platform.json](../assets/data-platform.json): `title/subtitle/note` define scope; `portal` is a short list; `left/right` use `{title,groups:[{title,items}]}` for cross-cutting support; `layers` use `{title,focus?,columns?,groups:[{title,items}]}` for main layers; `sources/foundation` hold sources and shared foundations. Items are short strings or two-line arrays.

Change facts in JSON and colors in the theme. If the renderer rejects long text, reflow it rather than blindly shrinking the font. [preview.mjs](../scripts/preview.mjs) checks actual rendered text bounds. Do not claim professional acceptance without the user's approval.
