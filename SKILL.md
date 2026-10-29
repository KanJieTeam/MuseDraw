# Use MuseDraw

MuseDraw supports visual creation from a brief or selected example: posters,
illustration, diagrams, scientific figures and frontend/UI. Its scene engine is
one production tool, not the boundary of the Skill's creative work.

To use this repository for a drawing task, read
[the MuseDraw skill](skills/musedraw/SKILL.md) and keep the whole
`skills/musedraw/` directory available (engine, themes, fonts manifest,
references). Its shared creative workflow is MuseCore: understand the brief,
jointly decide expression, visual conception and style, then make and deliver
the work. The proposal resolves content structure, main visual, visual language
and medium/asset responsibilities. Anti-default judgement runs throughout;
sketches and deeper review are used on demand. Project memory and validated
general methods are accumulated separately. See the Skill for the executable
routes and [MuseCore decisions](skills/musedraw/references/musecore.md) for complex
original compositions; this method is not a separately implemented AI model.
Use only the route needed for the task: image-generation/editing
tools for raster work, HTML/CSS/JavaScript for interfaces and suitable mixed
layouts, and the bundled scene engine for structured diagrams or native-vector
cases. Preserve the medium of an approved example. Do not force paintings or
webpages through SVG or a scene file. Actual raster synthesis depends on the
host's available image tool.

The user's words decide the content. Gallery examples are references, not facts
about the user's project; numbers in them are illustrative. Creating a diagram
is not permission to change the user's application, publish their data or
install unrelated software. First-time setup (`npm install` in the skill folder)
installs open-source fonts and Playwright and attempts to download Chromium.
It requires the corresponding network access and installation permission.

For scene work, follow the main Skill's render and review instructions, deliver
PNG by default and retain scene JSON and SVG. Address `checks.json` warnings;
with `--svg-only`, state that PNG and browser checks are incomplete. For image
work, deliver the requested bitmap and useful production prompts/assets; for a
webpage, deliver runnable source and browser previews. Do not describe a host
tool limitation as MuseDraw being restricted to architecture diagrams.

Replaying an existing scene in the same engine, theme, font and rendering
environment is distinct from a model interpreting a new request. Do not promise
pixel-identical output or universal model success from a short prompt. Old small
component-graph tools remain compatibility routes, not the main gallery engine.
See [usage](docs/usage.md) or [中文使用指南](docs/usage.zh-CN.md).
