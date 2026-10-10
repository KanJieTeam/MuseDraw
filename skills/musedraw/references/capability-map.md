# Platform Capability Architecture

Capability ownership is not actual data flow or physical deployment.

## Choose the structure

- Horizontal layers with support on both sides: separate consumption, services, storage, processing and sources; governance and security span multiple layers. Suitable for data platforms.
- Partitioned matrix: parallel business domains contain their own capabilities. Set widths by content, rather than forcing equal-sized regions.
- Narrow layer labels with wide module bands: useful for many technical layers with few modules per layer. Labels on the left establish the order.
- Software data-flow or integration paths: when the question is where data comes from and where it goes, draw a separate path view with actual sources, processing components and destinations—not just a capability table.

Use containers for containment, alignment for peers, and arrows only for explicit inputs, outputs or calls. The height of a cross-layer support column expresses its coverage; do not connect it to every cell.

Distinguish main containers, component nodes, cross-cutting capabilities, external systems and shared foundations. They may share a color family, but position, boundaries and headings must keep their roles distinct. Nesting within a layer does not prove physical deployment; a database symbol at the bottom does not prove a product choice. When the brief includes detailed calls, add a path view rather than forcing every capability into a single chain.

## Original role-based palettes

| Role | Blue | Cyan-blue |
| --- | --- | --- |
| Primary emphasis | `#2B65CF` | `#1487B4` |
| Body text and secondary headings | `#284E88` | `#21627C` |
| Groups | `#E5EDF9` | `#E3F2F7` |
| Light background | `#F2F6FC` | `#F3F9FC` |
| Borders | `#ADC6ED` | `#A6D4E4` |
| Canvas and child modules | `#FFFFFF` | `#FFFFFF` |

Choose one family, not an entire community-template skin. Use light fields for groups, moderately saturated blue for the main platform and dark colors for text. Primary blue fields use white text; child modules use white fields and dark text. Use 1–1.5px borders, 2–4px corner radii and no shadows. Icons identify categories and share one outline style; do not copy vendor assets.

For a 1920px figure: title 28–30px, platform headings 22–24px, categories 19–21px and modules 18–20px. Do not shrink text to 12px to fit; enlarge the canvas or separate the details. Keep one short concept per line, and do not wrap Chinese character by character. Use 16px padding, 8–12px between modules and 14–18px between layers. Bold only group headings.

## JSON input

The current renderer implements only a data-platform skeleton, not automatic layout for all the structures above. It fixes the unified portal, two support columns, sources and platform infrastructure; groups in the same layer have equal widths. Use it only when those roles match the user's content. If the content differs, has no sidebars or needs unequal-width domains, draw native SVG using the actual groups. Do not invent modules to fit the helper. Content-dependent widths are a design requirement, not an implemented renderer feature.

See [assets/data-platform.json](../assets/data-platform.json): `title/subtitle/note` define scope; `portal` is a short list; `left/right` use `{title,groups:[{title,items}]}` for cross-cutting support; `layers` use `{title,focus?,columns?,groups:[{title,items}]}` for main layers; `sources/foundation` hold sources and shared foundations. Items are short strings or two-line arrays.

Change facts in JSON and colors in the theme. If the renderer rejects long text, reflow it rather than blindly shrinking the font. [preview.mjs](../scripts/preview.mjs) checks actual rendered text bounds. Do not claim professional acceptance without the user's approval.
