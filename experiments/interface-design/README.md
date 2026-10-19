# Interface design study · experimental

This branch studies frontend interfaces and large-screen dashboards separately
from MuseDraw's diagram engine. It does not add a website-generation Skill or
change the default diagram workflow. Designs here still need user review.

| Track | Minimum study target | Deliverable for a prototype |
|---|---|---|
| Frontend / UI | 10,000 distinct references actually viewed | Runnable HTML/CSS/JS and desktop/mobile previews |
| Large-screen dashboard | 10,000 distinct references actually viewed | Runnable HTML/CSS/JS, declared display size and preview |

These are targets, not acquired or learned counts. Collection, visual study and
user selection have separate records in the local research application. A
download does not increment the visual-study count. A repeated view does not
increment the number of distinct references.

For these two tracks, usage counts are optional. Preserve the actual field and
meaning when published; otherwise record “not published”. Likes, views and
project stars are not uses. An official gallery, community listing or award is
source evidence, not proof that every item is good. Keep failures and weak
examples as counterexamples. References remain local unless redistribution is
explicitly licensed; original prototypes may be shared for review.

Use [frontend decisions](frontend-method.md) for an interface trial and
[dashboard decisions](dashboard-method.md) for a screen trial. Only load the
matching guide. No default `.drawio` export is needed for either track. Ordinary
diagrams continue to use MuseDraw's PNG + native editable draw.io workflow.

## Compare the capability, not two cherry-picked screenshots

Give two fresh agents the same brief and model settings. Let one use its usual
approach and give the other only the relevant guide. Preserve the first drafts,
timings, functional failures and screenshots before feedback. Test the same
viewport, content, keyboard path and narrow layout. Record source/code size and
external dependencies; avoid extra setup that makes one route slower.

Review task clarity, hierarchy, distinctive but relevant expression, density,
consistency and interaction states independently of layout correctness. A single
pair is exploratory evidence, not a broad success rate or proof of better taste.
An informed revision is not another cold-start success.

Preserved exploratory first drafts:

- [Cycling registration](trials/cycling/trial.json): same event facts, local-only
  registration validation and desktop/mobile previews.
- [Cold-chain duty desk](trials/cold-chain/trial.json): four fixed device readings,
  offline versus last-known temperature, filters, selection and acknowledgment
  that leaves the exception active. Both unedited drafts passed the independent
  browser checks. The user's aesthetic selection remains pending.

These are comparison records, not approved templates or demonstrated aesthetic
wins. Their presence does not establish that the study targets have been met.

## Current source boundaries

- [EasyV public marketplace](https://easyv.cloud/market): public template metadata
  and previews are available. One verified partition reported 884 entries; that
  does not establish a 10,000-item corpus.
- [v0 templates](https://v0.app/templates): public case-level `uses` and
  `likeCount` are separate. The verified first listing contains 24 cases; a
  visible Load More control is not proof of an accessible pagination API.
- [Anthropic's frontend-design Skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md):
  a design-method source, not a visual case or evidence that this project has
  acquired another model's capabilities. The guides here are original summaries,
  not a bundled copy of that Skill.

Do not guess private pagination APIs or bypass blocked access to reach a quota.
Expand verified sources and keep the remaining gap visible.
