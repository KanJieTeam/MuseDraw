# MuseDraw repository conventions

- Keep the project positioning broad: a professional drawing assistant. Only publish
  capabilities that have a usable workflow; architecture is the first workflow.
- Preserve user facts and unchanged diagram content during style-only revisions.
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
