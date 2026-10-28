# Design comparison and the changes it supports

This is a development record, not a claim that MuseDraw outperforms another
project. Reference versions inspected on 2026-10-28:

| Project | Frozen source | Useful mechanism / remaining MuseDraw gap |
| --- | --- | --- |
| Taste | [12af471](https://github.com/Leonxlnx/taste-skill/tree/12af471f627f866411b4bd785b19646d3672784c) | Concrete direction and imagery choices, then browser inspection. MuseDraw still lacks a similarly developed, tested direction library and asset-discovery workflow. |
| Hallmark | [6033bab](https://github.com/Nutlope/hallmark/tree/6033bab2a8051b5454552d2e8e6cb8f27c483a42) | Early first-screen assessment, finished-theme references and reuse history. MuseDraw still lacks broad independent visual review and a reliable history of composition repetition. |
| Anthropic frontend-design | [dbd4588](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design/SKILL.md) | Subject-specific identity, type and layout planning, followed by critique of the actual result. Our advice needed more executable spatial choices. |

These projects target websites and interfaces. Their stylistic bans and media
quotas should not become universal rules for scientific figures, paintings,
posters or working applications. Popularity does not establish a visual win.

## What the actual comparisons show

The existing 2026-10-24 paired Taste run used separate creators with the same
model/settings and briefs. Its three subjects and changing guide versions do
not establish a stable win rate. Latch's first and edited outputs favoured
MuseDraw in that model review; the unfamiliar stock-workspace edit favoured
Taste. Later MuseDraw revisions used additional feedback and effort.

Reinspection of those actual captures found specific weaknesses: MuseDraw's
workshop page used decorative window chrome and equal-sized booking cards;
the stock workspace spent more phone space on its summary, with small auxiliary
type and resolved values still competing for attention. Both pages could pass
ordinary browser checks while retaining those defects.

This update revises the workshop example: start time and duration share a real
09:00–15:00 axis, labels remain outside short bars, extraneous window decoration
is removed, and smaller screens receive a separate composition. The 90, 90 and
30-minute bookings remain exactly as supplied. Room filtering, request validation,
input retention, local-demo confirmation and focus return were exercised at
1440, 768 and 390 pixels. First and revised sources/captures were retained locally.

This is a feedback-informed revision by the maintainer agent. No fresh outputs
were generated with the current three competitors and no independent preference
review was performed for this revision. Better time encoding and tested operation
are demonstrated; higher aesthetic quality or superiority is not established.

## What ships

- [Composition decisions](../skills/musedraw/references/frontend-composition.md):
  five conditional relationships, their failure modes and the runnable schedule.
- [Browser collector](../skills/musedraw/scripts/capture-ui.mjs): separate
  first-screen/full-page captures at three sizes, overflow, missing images,
  script errors and optional target visibility. It refuses to replace old evidence.
- [Browser regression](../skills/musedraw/tests/ui-capture/capture.test.mjs):
  deliberately broken and clean fixtures; also included by the optional browser
  mode of `scripts/check.py` and in the lightweight Skill distribution.

The collector does not score taste or test clicks. Human or image-based review
must still assess hierarchy, imagery, rhythm and relevance; task tests must
exercise the controls. The next comparative claim requires frozen current
versions, fresh briefs, equal model and revision budgets, retained failures and
source-hidden review. The present worked example is development evidence and
must be excluded from such a held-out test.
