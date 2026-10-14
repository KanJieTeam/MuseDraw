# Visual Decisions for Architecture Diagrams

## Choose a structure, not a mix of skins

| Reading task | Structure | Common mistake |
| --- | --- | --- |
| What capabilities does the platform have? | Horizontal layers and side support | A vivid color for every layer; arrows between every box |
| How do multiple business domains belong together? | Partitioned matrix with content-dependent widths | Equal-sized cards; long terms broken into vertical text |
| How do technical components collaborate? | System boundaries, components and explicit endpoints | Treating a technology-stack list as a collaboration view |
| How do multiple systems integrate? | External endpoints, platform domains and labeled exchanges | Large arrows and icons replacing concrete relationships |
| How is the system deployed? | Environment/network boundaries, instances and data endpoints | Module positions standing in for physical locations |
| How is a client, monolith or SDK organized? | Small layers, nested components and external dependencies | Adding gateways, microservices, cloud and governance sidebars by default |

Changing the colors of the same structure does not create a new design family. For tiny figures in a collection, use only the visible structure; do not infer engineering facts from thumbnails. Categories, titles and recommendation rankings do not establish professional quality.

## Choose a visual position

There is no compulsory blue-and-white default. The optional [style tokens](style-tokens.json) resolve seven starting families by semantic roles, not arbitrary shades. Choose from audience, use and reference:

| Family | Visual signature |
| --- | --- |
| 企业蓝白 / enterprise-blue | Compact matrix; strong shared header bands; meaningful blue domains and white leaves |
| 墨线技术 / technical-ink | White field, ink text, thin boundaries; relationships and technical identifiers lead |
| 青灰层带 / slate-teal | Quiet horizontal bands; side support follows actual coverage; restrained teal accents |
| 暖砂编辑 / editorial-sand | Warm paper tones, asymmetric emphasis and section breaks; ink carries structure |
| 森绿重点 / forest | A legible green focus with quiet surroundings, not a green card wall |
| 柔色分域 / soft-domains | Distinguishable domain areas and neutral leaves; color identifies ownership |
| 深色系统 / dark-system | Dark canvas, light rules, bright readable text and small accents |

Use `scripts/style_tokens.py` to resolve canvas, ink, muted, surface, border, accent, secondary, focus and inverse colors. These profiles are neither a subject allowlist nor seven mandatory layouts. A supplied mother reference takes precedence; full colored domain fields may be essential to its visual identity. Replacing all of them with pale cards loses fidelity.

For a reference-led/reproduction request, record the silhouette and occupied/empty ratio; bands, columns, nesting and width ratios; major color-area proportions; title/group/leaf typography; and connector grammar supported by the actual facts. Compare those five decisions side by side at the same reduced size. Merely using sampled colors or selecting a style category is not reference fidelity. Keep third-party reference images private unless redistribution rights are established; deliver native original work without third-party marks.

Primary emphasis, light groups and white child modules form three levels. Use 1–1.5px lines, 2–4px corner radii, 8–12px between modules and 14–18px between layers. These values are a starting point for the current figure, not one compulsory scale for every figure. Use glows, gradients, heavy shadows, roof shapes, oversized arrows and marketing headings sparingly. Adjust when the user explicitly requests a presentation style; these are not absolute prohibitions.

A component view with many relationships may use a white field and thin lines rather than large solid-color areas. In grayscale, borders, font weight and spacing can preserve ownership hierarchy. Do not encode essential categories through color alone.

Design grouping and emphasis separately. Light fields can mean ownership and a strong accent can mark focus, but a colored matrix can also deliberately encode domains. Evaluate the reference's large areas before replacing them. Do not impose a global color cap that homogenizes a monochrome technical drawing and a full-color enterprise matrix.

## Typography, density and hierarchy

Prefer `Inter, Noto Sans SC, PingFang SC, Microsoft YaHei UI, Microsoft YaHei, Arial, sans-serif`; use `IBM Plex Mono, SFMono-Regular, Consolas, Liberation Mono, monospace` for supplied ASCII technical identifiers. Verify actual available fonts; a stack alone does not make cross-platform rendering identical. For a roughly 1920px figure, an initial scale is title 44px, section 28px, body 20px, grouping label 18px, annotation 16px. Group labels can be smaller than content. Adjust to density and check actual glyph bounds. Do not shrink everything to fit a phone overview; provide a detail view when needed.

Preserve natural names. Do not compress every label to four Chinese characters or add Kafka, protocols, server counts or vendor names merely to look technical. Concrete content comes from supplied facts. An explicitly generic architecture may use useful example content, identified outside the artwork.

Peer modules should align and share font size and padding, but need not have equal widths. Whitespace provides spacing, not decoration. Increase density appropriately when there are many components; do not put every short term in a large card. If body text in a phone-sized overview is unreadable, also deliver a detail view rather than claiming everything is readable.

Use an 8px spacing rhythm and content-weighted widths where appropriate. Retain a final small remainder to close the outer edge. Do not blindly round existing nodes and routes: attached edges must stay attached. For truly 1px straight rules, half-pixel alignment can help at 1x when transforms permit it; verify rather than applying it to every shape. Favor stroke roles (boundary 1px, relationship 1.5px, focus 2px) over encoding noise. Keep the MuseDraw mark small and away from the title; no marketing copy, production metadata or disclaimers inside the artwork.

## Check that it is not just another template

Capability and component views of the same input should differ in how they express relationships, not merely in color. For a new industry, change groups and relationships first; do not automatically apply the eight data-platform modules. When the user only objects to color, preserve the content list, relationships and object count.

Group similar templates into view families rather than selecting one at random: capability ownership, component/integration, instance deployment and client/framework details. Choose the family from actual facts and the reading task. Within a family, widths, density, support placement and routing change with content so that every figure does not become the same wall of cards.

Actually inspect the full figure, a dense detail and the intended reduced size. Check text and containers, connection endpoints, lines crossing text and emphasis in grayscale. Passing automated checks does not mean the user has approved the figure; seeing many examples does not establish superiority over other design tools.

An ownership map can legitimately have no call arrows. A component diagram must preserve the supplied interactions; do not add invented connections to meet an arrow quota. Art-directed gallery studies are design references, not one-shot model scores. Shared tokens provide craft consistency, not identical compositions.
