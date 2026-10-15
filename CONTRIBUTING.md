# Contributing to MuseDraw

[简体中文](CONTRIBUTING.zh-CN.md)

MuseDraw is a professional drawing assistant for research, office work, teaching and engineering. Contributions can improve scenes, styles, layout blocks, design guidance or documentation. You need not be a programmer to contribute an original example or clearer instructions.

## Start with a focused change

Choose a concrete improvement. Small fixes need no prior issue; discuss larger engine or workflow changes when useful. Read the [Skill](skills/musedraw/SKILL.md), [scene schema](skills/musedraw/references/scene-schema.md) and [gallery](gallery/README.md) for the current scene-engine workflow.

For a new case, copy a suitable gallery directory and supply:

```text
gallery/<case>/
  scene.json       # complete, editable source
  prompt.md        # short natural-language request and necessary facts
  diagram.svg     # rendered native vector output
  preview.jpg     # rendered gallery preview
```

Render with the main engine; the full PNG and `checks.json` support local review. Do not substitute a hand-edited image that cannot be reproduced from the scene. Keep content specific and mark illustrative data as example data. Gallery review states distinguish previews from cases that have received individual visual review.

## Render, inspect and check

With Node.js 22+, install the skill's fonts and Playwright once. Setup also attempts a Chromium download; use an environment with the necessary network access and installation permission:

```sh
npm --prefix skills/musedraw install
node skills/musedraw/scripts/musedraw.mjs render gallery/<case>/scene.json
python scripts/check.py
```

Use `npm run gallery` when the change affects the whole gallery, such as a shared engine or theme change. Rendering writes the case's generated outputs; retain any earlier version you need before rerendering. `node skills/musedraw/scripts/musedraw.mjs themes` lists available styles.

Open the full PNG, a dense area and the intended reduced viewing size. Read `checks.json` and fix every warning before review, including text overflow, collision, edge labels on nodes, node overlap and objects outside the canvas. Check facts, numeric consistency, connector endpoints and the [visual checklist](skills/musedraw/references/anti-ai-checklist.md). Preserve facts and relationships during style-only revisions. Process success is not aesthetic acceptance.

The offline Python check is separate from browser rendering. If using `--svg-only`, explicitly state that PNG and browser checks were not completed; that is not full figure verification. Do not invoke paid services just to contribute.

## Review and contribution boundaries

Explain the problem, resulting behavior and checks in your pull request. First contributions may be in English or Chinese; bilingual submissions are not required. Add new workflows only with a working route, examples and appropriate verification. Existing small-graph tools are compatibility routes; new gallery work uses the scene engine.

Contribute original work you can license under [Apache-2.0](LICENSE). Public visibility is not permission to redistribute templates, screenshots, proprietary assets or author prose. Include applicable permission and attribution for third-party material. Keep private data, credentials and local absolute paths out of scenes, prompts and assets.

Distinguish rerendering a supplied scene from a model interpreting a new request. Neither proves universal model accuracy, identical pixels across platforms, token savings or superiority over other tools. Report the actual environment and completed checks.

Use branch prefixes such as `feat/`, `fix/`, `docs/`, `test/`, `refactor/` or `chore/`. Branch names must not contain `codex`, case-insensitively. This restricts branch names, not accurate documentation of the Codex client.

## Gallery thumbnail maintenance

The list uses checked-in, content-addressed WebP thumbnails; the modal shows a
small image first, upgrades its raster preview in the background and loads SVG
only on the viewer's **高清** request. Original gallery downloads remain unchanged.
After changing gallery `preview.jpg` files, maintainers can install
`Pillow==12.3.0` and run `npm run gallery:previews`, then commit the generated
`assets/gallery/previews/` files and `previews.json`. Normal drawing, offline
checks and Pages builds do not need Pillow. Source/image hashes catch stale
thumbnails during checks.

README showcase maintenance: `npm run readme:showcase` regenerates the 1920x1080 overlapping photo collage and source-hash manifest; it uses the same optional Pillow dependency.
