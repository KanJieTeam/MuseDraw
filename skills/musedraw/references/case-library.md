# Visual examples · choose an expression that fits the content

Use these author-supplied examples for posters, information graphics, explanations,
teaching figures and scientific multi-panel compositions. They include 180 native
vector artworks and their original briefs. All are included; front-page suggestions
are a browsing aid, not a limit on which examples may be used.

## Find and prepare one example

Search the small bundled registry instead of reading 180 descriptions:

```sh
node <skill>/scripts/case-library.mjs --search "补书"
node <skill>/scripts/case-library.mjs --search "科研" --limit 8
node <skill>/scripts/case-library.mjs --id p01-guji-xiufu --out output/book-workshop
```

The full repository contains the source library at
`gallery/collections/visual-cases`. A lightweight Skill installation contains the
searchable registry. To add the artwork once, download the
[visual case pack](https://kanjieteam.github.io/MuseDraw/downloads/musedraw-visual-cases.zip)
and its [SHA-256 manifest](https://kanjieteam.github.io/MuseDraw/downloads/musedraw-visual-cases.json),
verify the hash and extract it into a dedicated directory. Pass its `visual-cases`
folder with `--library`, or put that folder under `assets/case-library/` in the
installed Skill. Do not repeatedly clone or download the collection for each job.
If this optional resource is unavailable, continue using the applicable composition
method rather than treating the entire Skill as unavailable.

Read the selected `design.md` and `prompt.md`; inspect its preview when choosing
an expression or when the user requests visual comparison. `author-notes.md`
retains the author’s design reasoning with obsolete export notes omitted.
It does not override the current Skill or independently validate scientific claims.

Search results mark a `contentDriven` family when that source already has a
bounded MuseCore implementation. For changed data or item counts, inspect that
family's scope and use its `core example` / `core render` route when it fits;
the installed runtime does not need the optional artwork pack for this route.
This marker is source provenance, not a recommendation to force any new brief
into that family. An exact source replay retains the vector route below.

For an unchanged replay, use the existing vector route:

```sh
node <skill>/scripts/musedraw.mjs render output/book-workshop/scene.json --out output/book-workshop/rendered
```

The source PNG is the author's supplied rendering. The scene preserves native SVG
text and geometry, adding only the matching theme/size metadata required by the
renderer. Fonts available on the receiving machine can change a fresh rendering.
Keep that distinction when comparing a replay with the supplied PNG.

## Adapt a design decision, not just its colours

- **Subject as composition:** the book-repair poster is a repaired book cover;
  the jazz poster uses rhythmic dots. Find an object or action inherent in the new
  brief before borrowing a visual metaphor. Do not keep a book cover for an
  unrelated product merely because its colours are attractive.
- **Relationships as geometry:** projected layers show correspondence and search
  descent; parallel routes show branches and convergence; a split comparison and
  a sequential argument require different arrangements. Choose from the relation,
  not a universal card grid.
- **Evidence across panels:** the tail-latency and microscopy examples give each
  panel a different evidential role. Shared subjects keep their identities and
  appropriate scales across panels; a secondary chart should answer a real question.
- **Hierarchy within density:** the calendar and ranking examples highlight a
  specific pattern while retaining comparison context. Richness can come from
  meaningful detail, not additional glow, frames or explanatory paragraphs.
- **Material belongs to a subject:** chalk, stitching, paper and river branches
  carry content in their respective examples. Treat them as conditional resources,
  not a required treatment for every diagram.
- **Classification becomes action:** the weekly planner connects priorities to
  actual time blocks. When new facts change durations, counts or relationships,
  recompute the geometry instead of preserving the old conclusion.

## Keep the artwork and the facts separable

These are editable source examples, not 180 parameterised layout algorithms.
For revisions, copy the example first and edit its `nativeSvg` or use the matching
native composition/chart tool. Preserve approved artwork that is unrelated to the
requested change. Theme swapping does not restyle fixed vector artwork.

Update dates and weekday labels together. Keep calendar cells and totals, waterfall
endpoints, graph paths, schedules, plate positions and result lists consistent with
the new data. Illustrative values, synthetic scientific images and simulations stay
identified as such; an original author's calculation note is not an independent
reproduction of its result. Domain-specific claims still need appropriate sources.

A poster's title is part of its composition. Do not apply the ordinary document
figure's no-header default to remove an approved poster headline. Similarly, keep
the panel labels and necessary legends of an approved scientific figure. Use the
user's requested artifact and editing needs to choose the output.
