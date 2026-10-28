# Comparing visual methods

The campaign target is at least **1,000 independent, actually produced pairs**
across posters, public websites, working UI, spatial dashboards, scientific
figures, office information, teaching, editorial/brand work, illustration and
presentations. A plan entry is not a completed comparison. No result count is
implied by this document.

Keep the actual brief, content, assets and baseline/candidate versions fixed
before creating each pair. Retain the first sources and all failures. Use separate
creator contexts where available, and record model, tool and revision budgets.
A critic call added only to one arm is extra inference cost, even when both
creators receive one revision. Report it; do not call the experiment equal-cost.

## A countable pair

One semantically distinct brief/content package, two actual delivered works,
their technical checks, and recorded inspection of the rendered images make one
comparison. A failed work remains a failure in the record. Multiple viewports,
judges, left/right swaps, seeds and revisions do not increase the independent
count. Renaming the same template is not a new subject.

Stratify actual subjects, language, density, asset availability, editing needs
and reading conditions. Keep method-development tasks separate from held-out
tasks. Once a failed task informs a rule, keep it for regression; do not continue
to call it unseen evidence. Report per-method-version and per-domain outcomes;
pooling changing rules into one headline win rate obscures regressions.

## Prepare and verify a source-hidden packet

The repository helper freezes supplied PNGs without rescaling, randomises A/B,
and keeps the identity key outside the review directory:

```sh
python scripts/prepare_visual_review.py --config comparison.json --out output/round-01
python scripts/prepare_visual_review.py --verify output/round-01/review
```

`comparison.json` contains the actual brief and two candidates:

```json
{
  "brief": "The complete frozen user brief and required facts.",
  "candidates": [
    {"id": "baseline", "images": {"desktop": "baseline/desktop.png", "mobile": "baseline/mobile.png"}},
    {"id": "candidate", "images": {"desktop": "candidate/desktop.png", "mobile": "candidate/mobile.png"}}
  ]
}
```

Paths resolve from the caller's current directory. Both candidates require the
same view names and image dimensions. For full-page captures only, optionally
set `fullPageViews` to the relevant view names: width must match but natural page
height may differ. Keep matching viewport captures too, since scaling full-page
images to the same height distorts type-size comparisons.

Give reviewers only `review/`, never `key.json`, source, creator reasoning or
previous verdicts. Inspect images for visible identity leakage before dispatch;
random filenames cannot remove text embedded in a picture. Verify hashes again
after reviewing. The manifest is a local integrity aid, not an authenticated
signature or proof that somebody viewed the images.

## Select a revision and retain uncertainty

Use the Skill's [visual revision method](../../skills/musedraw/references/design-review.md).
Keep technical failures separate from model preference and user preference.
Record win/tie/loss/uncertainty, visible causes, review disagreements and effort.
Independent contexts with the same model can still share biases or disagree.
Human calibration is needed before claiming broad audience preference.

Prefer a preserved earlier version when a later one regresses or lacks convincing
evidence. Never force a positive result to justify an agent architecture, a rule
library or the comparison count. The purpose is to find useful design decisions
and their limits.
