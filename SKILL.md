# Use MuseDraw

MuseDraw is a professional drawing assistant delivered as an Agent Skill. Its first
workflow covers software and data-platform architecture diagrams.

To use this repository for a drawing task, read
[the MuseDraw skill](skills/musedraw/SKILL.md), then load only the references and
helpers relevant to the request. Keep the complete `skills/musedraw/` directory
available; the entrypoint alone is not the whole workflow.

Short natural-language requests are sufficient to start; the agent handles
composition, palette and layout. The 100 curated examples are optional design
references, not a list of the only subjects MuseDraw can draw.

The user's brief determines the content. Repository examples are generic
references, not facts about their system. Creating or updating a diagram is not
permission to change the user's application, publish their data, or install
unrelated software.

For installation and host requirements, see [usage](docs/usage.md).
