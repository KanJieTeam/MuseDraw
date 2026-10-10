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

## Blue-and-white visual character

The current default is a mature enterprise-diagram style: white canvas, light-blue ownership containers, dark text and one primary-blue focus area. Use the role values in [capability-map.md](capability-map.md); do not change colors for every layer or cover the entire canvas in blue. Avoid overly thin body text and bold only headings.

Primary emphasis, light groups and white child modules form three levels. Use 1–1.5px lines, 2–4px corner radii, 8–12px between modules and 14–18px between layers. These values are a starting point for the current figure, not one compulsory scale for every figure. Use glows, gradients, heavy shadows, roof shapes, oversized arrows and marketing headings sparingly. Adjust when the user explicitly requests a presentation style; these are not absolute prohibitions.

A component view with many relationships may use a white field and thin lines rather than large solid-color areas. In grayscale, borders, font weight and spacing can preserve ownership hierarchy. Do not encode essential categories through color alone.

Design grouping and emphasis separately: light fields mean "belongs together"; primary blue means "current focus"; white child modules carry the concrete content. Not every large container needs a solid fill. Evaluate structure and skin separately when studying references. If the structure is useful but the rainbow palette, heavy color, branded icons or shadows are unsuitable, adopt the structure without copying the complete figure.

## Typography, density and hierarchy

For Chinese, prefer `Noto Sans SC, Microsoft YaHei UI, Microsoft YaHei, 微软雅黑, Arial, sans-serif` and verify the actual render. In a 1920px figure, module text is roughly 18–20px and titles 28–30px. Do not shrink text to 12px to fit. Wrap long names by word or concept, enlarge the canvas or separate the details.

Peer modules should align and share font size and padding, but need not have equal widths. Whitespace provides spacing, not decoration. Increase density appropriately when there are many components; do not put every short term in a large card. If body text in a phone-sized overview is unreadable, also deliver a detail view rather than claiming everything is readable.

## Check that it is not just another template

Capability and component views of the same input should differ in how they express relationships, not merely in color. For a new industry, change groups and relationships first; do not automatically apply the eight data-platform modules. When the user only objects to color, preserve the content list, relationships and object count.

Group similar templates into view families rather than selecting one at random: capability ownership, component/integration, instance deployment and client/framework details. Choose the family from actual facts and the reading task. Within a family, widths, density, support placement and routing change with content so that every figure does not become the same wall of cards.

Actually inspect the full figure, a dense detail and the intended reduced size. Check text and containers, connection endpoints, lines crossing text and emphasis in grayscale. Passing automated checks does not mean the user has approved the figure; seeing many examples does not establish superiority over other design tools.
