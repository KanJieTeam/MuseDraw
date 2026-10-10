# Contributing to MuseDraw

[简体中文](CONTRIBUTING.zh-CN.md)

MuseDraw is a research-figure assistant. This first release focuses on software architecture figures; broader research workflows are a direction to develop, not a capability already shipped. You can contribute design rules, examples, documentation and workflows without being a programmer.

## Start in three steps

1. Choose one concrete improvement: a clearer rule, an original example, a useful workflow or a documentation correction. An issue is useful for larger proposals, but is not required for a small fix.
2. Make a focused change. For a new example, add the four files below; for a design-rule change, show a small example or before/after evidence. A typo fix does not need a new figure.
3. Run `python scripts/check.py`, inspect the affected figure, and open a pull request explaining what changed, what stayed fixed and what you checked. Your first contribution may be in English or Chinese; a bilingual first PR is not required.

```text
skills/musedraw/             # implemented instructions, rules and tools
examples/<case>/
  brief.md                  # question, facts, relationships and unknowns
  diagram.svg               # original editable figure
  diagram.png               # rendered preview
  review.md                 # design choices, checks and limits
scripts/check.py            # standard-library local checks
```

A machine-readable brief such as `brief.json` may accompany these files; it does not replace the readable brief. Start from [data-platform](examples/data-platform/brief.md) or [inspection-platform](examples/inspection-platform/brief.md).

## Useful contribution directions

- Architecture: capability ownership, component/integration relationships, and deployment views supported by actual inputs. Small client or framework diagrams need not become enterprise platform matrices.
- Figure quality: readable labels, restrained emphasis, useful density, clear boundaries and connections that reach the right objects.
- Reproducible examples: an explicit brief, original SVG, usable preview and an honest review, including failures or unverified details.
- Workflow and documentation: clearer handoffs, language improvements and tested client instructions. Keep real Codex client references when relevant; its name is not prohibited in documentation.
- Future research figures: propose a concrete task and a working route from input to checked output. Publish a new Skill workflow only after its capability, example and verification actually exist; do not add an empty placeholder Skill.

## Review and acceptance

The common local command is:

```sh
python scripts/check.py
```

It is not a browser, font, architecture or aesthetic certification. The normal check does not require Playwright. For browser preview checks, follow the explicit command and prerequisites in the [usage guide](docs/usage.md); state when that optional step was not run. Do not silently install dependencies or use paid services for a contribution.

For figure changes, inspect the full preview, a dense area and the intended reduced viewing size. Check labels, containment, connector endpoints and line/text intersections. Compare the input facts and relationships with the SVG. When a user asks only for a style change, keep the content and relationships unchanged. A program passing does not establish that a user has approved the design.

The current capability renderer has a fixed data-platform skeleton and equal-width groups. Use it only when those roles fit the brief. Other structures use original SVG; do not invent modules, technology choices or deployment instances to fit the renderer. Unknown direction stays unknown. References and clearly labelled generic examples are not project facts.

## Original work and contribution boundaries

Contribute work you created and have the right to license under the project's [Apache-2.0 license](LICENSE). Public community pages may inform abstract design observations, but being publicly viewable is not a redistribution license. Do not copy community templates, screenshots, proprietary figure layouts, author prose or vendor assets into the repository without an explicit applicable permission and attribution. Prefer links and original text/geometric figures.

Keep private data, credentials and local machine paths out of briefs and assets. Describe missing facts instead of guessing them. No fair token benchmark has been completed: do not promise a percentage saving, superiority over other tools or journals, or compatibility with every client. Report the checks and environments you actually used.

Use branch prefixes such as `feat/`, `fix/`, `docs/`, `test/`, `refactor/` or `chore/`. Branch names must not contain `codex`, case-insensitively. This is a branch-naming rule, not a ban on explaining the Codex client.
