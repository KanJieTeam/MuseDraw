# MuseDraw repository conventions

## Drawing requests

Read the complete [MuseDraw Skill](skills/musedraw/SKILL.md) before drawing.
Use its bundled `skills/musedraw/scripts/musedraw.mjs` scene engine: `quickstart
rag` for the shared-index RAG starter, or `render scene.json` for other diagrams.
The engine produces PNG and native editable draw.io directly; do not handwrite
draw.io XML or install third-party drawio exporters to make the PNG. A PNG-only
request selects `--no-drawio`. Keep execution details in the Skill, not in copied
user prompts. Inspect `preview.jpg` and checks before delivery; rerender only
after changes or unresolved issues. Follow the Skill's runtime reuse instructions.

## Contributions

- Keep the project positioning broad: a professional drawing assistant for research,
  office work, teaching and engineering. Only publish capabilities with a usable workflow.
- New gallery cases: a folder with `scene.json` and `prompt.md`; render with
  `npm run gallery`, open the PNG, and fix every `checks.json` warning before review.
- Preserve user facts and unchanged diagram content during style-only revisions.
- Use the project's configured contributor identity for commits. Do not add
  model names, generated-by signatures or model co-author trailers to code or commits.
- Use `feat/`, `fix/`, `docs/`, `test/`, `refactor/` or `chore/` for task branches.
  Branch names must not contain `codex`, case-insensitively. This does not prohibit
  accurate documentation of the actual Codex client.
- Run `python scripts/check.py` before proposing a contribution. Browser rendering
  is a separate check, not implied by offline test success.
- Community examples must be original or explicitly licensed for distribution.
  Public visibility does not grant permission to copy templates or screenshots.
- Never include credentials, private user artifacts or local absolute paths in
  published examples. Do not claim universal accuracy or token savings without a
  reproducible, fair experiment.
