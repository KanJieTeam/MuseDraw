# Use MuseDraw

MuseDraw is a professional drawing assistant delivered as an Agent Skill. Its first
public workflow produces component diagrams in **手绘线稿** and **终端色域**.

To use this repository for a drawing task, read
[the MuseDraw skill](skills/musedraw/SKILL.md), then load only the references and
helpers relevant to the request. Keep the complete `skills/musedraw/` directory
available; the entrypoint alone is not the whole workflow.

Short natural-language requests are sufficient to start; the agent handles
composition, palette and layout. The two public styles share installed drawing
code and accept new subjects, components and relationships; the showcased topics
do not limit the workflow.

For these diagrams, read the [semantic graph workflow](skills/musedraw/references/graph-workflow.md).
The agent writes semantic content and invokes the installed renderer; it does
not ask the user for coordinates or draw a case-specific replacement SVG.
Follow-up content edits operate on the existing document. Deliver PNG, native
editable SVG and `document.json`, with the checks actually completed.

Replaying a saved semantic document with the same drawing version and fonts
is distinct from generating a new diagram from a short request. Preserve that
distinction; neither the examples nor their verification guarantee identical
output from every model. See [implementation and limits](docs/semantic-graph.zh-CN.md).

The user's brief determines the content. Repository examples are generic
references, not facts about their system. Creating or updating a diagram is not
permission to change the user's application, publish their data, or install
unrelated software.

For installation and host requirements, see [中文使用指南](docs/usage.zh-CN.md)
or [English usage](docs/usage.md). The host needs file access and tool execution;
PNG uses existing Node.js 22+, Playwright, Chromium-compatible browser and fonts.
MuseDraw itself requires no additional model API key.
