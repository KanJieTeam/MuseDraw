# Local independent visual review

`scripts/visual-review.mjs` packages real PNG comparisons and checks review records.
It invokes no model, image service, browser or network request and uses only Node
built-ins. It does not judge aesthetics. All results are advisory. Agreement on a
tiny calibration sample, even exact agreement, is not production aesthetic
certification. Keep factual, geometry and browser/function checks separate.

The bundled default prompt is a starting procedure, not a calibrated model of
any user's taste. When a project tests a custom prompt, use those exact frozen
bytes for later comparisons; results from that prompt do not validate another
prompt or a different host model.

Use this when an independent comparison is requested; see
[design-review.md](design-review.md) for the revision method. Do not require it for
every drawing. A reviewer needs an independent fresh context and actual image
inspection. If that is unavailable, record the review as unavailable and abstain;
do not invent observations. The report's independence and image-access fields
are declarations recorded by the host, not proof of independence or sight.

## Prepare two anonymous packets

Keep source images, preparation input, private maps, reports and human labels
outside the reviewer packets. The examples below describe original synthetic
panels, not distributed screenshots. Supply your authorised actual PNGs.

Example `trial/cases.json`:

```json
{
  "schemaVersion": 1,
  "cases": [{
    "id": "panel-example",
    "brief": "Two equally sized color panels for a packaging test.",
    "candidates": [
      {"id": "condition-one", "images": [{"view": "full", "path": "sources/one.png"}]},
      {"id": "condition-two", "images": [{"view": "full", "path": "sources/two.png"}]}
    ]
  }]
}
```

Input image paths are relative to `cases.json`. Each case has exactly two private
candidate IDs, with matching view names and equal pixel dimensions per view.
Add matched `narrow` or `detail` views when needed. IDs and view names use letters,
digits, `.`, `_` and `-`; candidate IDs cannot be `a`, `b`, `tie` or `abstain`.
Use the unchanged user brief, without creator rationale or condition identities.

For full-page screenshots with different content lengths, explicitly add
`"heightMode": "natural"` to **both** candidates' image entries for that view:
`{"view":"full","path":"sources/one.png","heightMode":"natural"}`. Natural mode
requires equal pixel widths and records each actual height; bytes are never
cropped, padded or rescaled. Asymmetric declarations, unknown modes and unequal
widths fail. Other views retain equal dimensions by default. Equal pixel width
does not prove equal browser scale or viewport: the host must preserve capture
settings, including viewport, zoom and device scale, across both candidates.

```sh
node skills/musedraw/scripts/visual-review.mjs prepare --input trial/cases.json --packet trial/packet-one --private trial/map-one.json --order forward
node skills/musedraw/scripts/visual-review.mjs prepare --input trial/cases.json --packet trial/packet-two --private trial/map-two.json --order reverse
```

Default order is random independently per case. Explicit forward/reverse orders
counterbalance the same two candidates for separate reviewers. Public IDs become
`case-001`, etc. Images become `images/case-001/a-full.png` and `b-full.png`; those
filenames carry no condition identity. Private maps retain source paths and the
candidate correspondence. The packet contains only images, briefs, the fixed
reviewer prompt (`REVIEW.md`), a manifest and a response template.

PNG bytes are copied exactly. Structure, chunk CRCs and compressed scanline framing
are checked; images, briefs and the rubric are bound into the packet digest.
Standard non-interlaced PNG screenshots are supported. Text/EXIF/ICC profiles,
animation and unknown chunks are rejected rather than silently rewriting pixels
or color profiles. JPEG/WebP and interlaced PNG are not supported in this version.
Capture a suitable PNG with the established rendering route when necessary.

For an experiment with a separately developed frozen reviewer prompt, append
`--rubric trial/frozen-prompt.md` to **both** prepare commands. Its exact bytes
replace `REVIEW.md` and its hash becomes part of the packet digest. Freeze that
prompt before viewing held-out cases or labels. It must retain the independent
inspection procedure and fixed rubric; keep held-out human choices, creator
reasoning and previous reviewer votes out of it. Preparation has no human-label
input and rejects unknown input fields. The tool cannot detect secrets written
into the brief, prompt or visible image content; inspect those public inputs for
identity leakage before giving the packet to a reviewer.

All output paths must be new. There is no overwrite switch. An interrupted write
can leave an incomplete packet; retain it for diagnosis or choose a new output.

## Record an actual review

Give each fresh reviewer only its packet and permission to inspect those images.
Keep it away from the source tree, private maps, labels and the other reviewer's
response. Host isolation establishes that boundary; JSON declarations cannot.
The default fixed rubric asks for visible location, observation, effect, strongest
part to preserve and uncertainty against the brief, without numerical aesthetic
scores or universal palette/font bans. Inspect the images at the supplied scale.

Copy `response-template.json` outside the packet, fill its `packetDigest` unchanged,
and replace every placeholder. A minimal substantive example for the synthetic
panels is:

```json
{
  "schemaVersion": 1,
  "packetDigest": "COPY_THE_EXACT_DIGEST_FROM_THE_TEMPLATE",
  "reviewer": {"id": "reviewer-one", "independent": true, "visualAccess": true},
  "cases": [{
    "caseId": "case-001",
    "choice": "tie",
    "observations": [{
      "evidence": ["images/case-001/a-full.png", "images/case-001/b-full.png"],
      "location": "Entire panel",
      "observation": "Both panels have a uniform fill and equal outer dimensions.",
      "effect": "Neither shows a hierarchy advantage for the supplied packaging brief."
    }],
    "reason": "The supplied brief gives neither uniform color an advantage.",
    "preserve": "Preserve the equal panel dimensions.",
    "uncertainty": "These synthetic panels cannot establish aesthetic quality."
  }]
}
```

Use `a` or `b` for a preference, `tie` for inspected alternatives equally suitable
for this brief, or `abstain` for insufficient evidence or inability to inspect.
For a/b/tie, observations must cite every image supplied for that case. References
to nonexistent files, other cases or source filenames fail validation. Include
concrete visible observations, their locations and effects; evidence references
alone cannot establish the truth of a claim. Arbitrary score fields are rejected.
For an unavailable independent reviewer, set `independent:false` or
`visualAccess:false` as appropriate and abstain on every case. Observations may be
empty for abstentions; state the reason and uncertainty explicitly.

```sh
node skills/musedraw/scripts/visual-review.mjs check --packet trial/packet-one --report trial/review-one.json --private trial/map-one.json
```

`check` verifies frozen bytes, complete cases, allowed choices, filename evidence,
mandatory observation fields and matching private correspondence when supplied.
It rejects changed prompts, stale reports, changed images, unknown/duplicate
cases and unexpected packet files. It does not verify that the reviewer actually
saw an image or made an accurate observation. Digests detect changes relative to
the frozen report/map records; they are not signatures against a person replacing
the entire packet and all trusted records.

## Reconcile orders and calibrate separately

Example `trial/reviews.json` (paths relative to that bundle):

```json
{
  "schemaVersion": 1,
  "reviews": [
    {"packet": "packet-one", "private": "map-one.json", "report": "review-one.json"},
    {"packet": "packet-two", "private": "map-two.json", "report": "review-two.json"}
  ]
}
```

```sh
node skills/musedraw/scripts/visual-review.mjs consensus --bundle trial/reviews.json --out trial/consensus.json
```

Consensus maps a/b back to private candidate IDs and checks that their per-view
image hashes, dimensions, brief and rubric agree across packets. A `b` vote in
forward order and an `a` vote in reverse order agree when they select the same
image. Candidate identity mismatches, changed screenshots, missing cases and
duplicate reviewer IDs fail. Repeated judges and extra views do not multiply the
number of independent content comparisons. Distinct IDs do not prove independence.

Output includes counts, every mapped vote, abstention coverage, strict agreement
among cast votes, any majority and explicit disagreements. A majority can coexist
with disagreement. A single cast vote plus abstentions is labelled agreement
among cast votes with its limited coverage, never unanimous independent evidence.
All abstentions produce `unavailable`. A further vote is not ground truth.

Only after reports are frozen, separately supply `trial/human-labels.json`:

```json
{
  "schemaVersion": 1,
  "labels": [{"caseId": "panel-example", "choice": "condition-two"}]
}
```

```sh
node skills/musedraw/scripts/visual-review.mjs calibrate --bundle trial/reviews.json --labels trial/human-labels.json --out trial/calibration.json
```

Human labels use private case/candidate IDs, or `tie`/`abstain`. Every comparison
case needs exactly one valid label. Labels and generated results must stay outside
every packet. Calibration reports matches, mismatches and agreement rates per
reviewer; human and reviewer abstentions are excluded from denominators and counted
explicitly. A zero denominator produces `null`, never a perfect score. Agreement
rate measures choice matching on this sample; it is not an aesthetic magnitude or
proof of a universal preference. Development examples used to change the prompt
are not held-out evaluation. Report the actual content count and disagreement.

Run the original synthetic failure-mode tests with:

```sh
node --test skills/musedraw/tests/visual-review/visual-review.test.mjs
```
