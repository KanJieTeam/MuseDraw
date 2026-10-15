# Use MuseDraw

MuseDraw is a professional drawing skill for AI agents: research figures,
office diagrams, teaching visuals and system architecture, in 20 visual styles.

To use this repository for a drawing task, read
[the MuseDraw skill](skills/musedraw/SKILL.md) and keep the whole
`skills/musedraw/` directory available (engine, themes, fonts manifest,
references). The fastest way to learn the scene format is to copy the closest
case in [gallery/](gallery/README.md); each case has `scene.json` and a
one-line `prompt.md`.

The user's words decide the content. Gallery examples are references, not facts
about the user's project; numbers in them are illustrative. Creating a diagram
is not permission to change the user's application, publish their data or
install unrelated software. First-time setup (`npm install` in the skill folder)
installs open-source fonts and Playwright and attempts to download Chromium.
It requires the corresponding network access and installation permission.

Use `scripts/musedraw.mjs render scene.json` in the installed skill for new work;
`scripts/musedraw.mjs themes` lists the 20 styles. Deliver PNG and editable SVG,
retain the scene for follow-up edits, open the PNG and address `checks.json`
warnings. With `--svg-only`, state that PNG and browser checks are incomplete.

Replaying an existing scene in the same engine, theme, font and rendering
environment is distinct from a model interpreting a new request. Do not promise
pixel-identical output or universal model success from a short prompt. Old small
component-graph tools remain compatibility routes, not the main gallery engine.
See [usage](docs/usage.md) or [中文使用指南](docs/usage.zh-CN.md).
