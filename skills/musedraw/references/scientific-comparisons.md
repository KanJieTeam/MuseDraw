# Compare conditions on the same scientific object

Use when differences are site occupancy, actor presence/absence, or a supplied
qualitative abundance change. Show the differences on the object itself; keep
the substrate, phase, scale, label anchors and actor identities stable.

## Paired-strand object

```json
{"type":"scientific","kind":"duplex","id":"substrate",
 "x":80,"y":80,"w":360,"h":100,"turns":2.5,"phase":30,
 "amplitude":14,"strandWidth":2,"markerRadius":4,"markerOffset":6,
 "strands":[{"id":"a","fill":"#405BB7"},{"id":"b","fill":"#405BB7"}],
 "sites":[{"id":"site1","at":0.1,"marks":["a"]},
          {"id":"site2","at":0.5,"marks":["a","b"]},
          {"id":"site3","at":0.9,"marks":[]}],
 "palette":{"warm":"#CC5C56"}}
```

The module frame and all lengths are scene pixels. `turns` is 1–12 (default 3),
`phase` is degrees (default 0), `amplitude` is pixels (default min(h×.16,20)),
`strandWidth` defaults to 1.5, and `markerRadius` to 4. `markerOffset` defaults
to 0; a positive value moves the glyph vertically away from the centreline,
leaving the exact site and backbone unchanged. Marked sites at a crossover
cannot use an outward offset: move the site to a distinguishable location.
`rungs` is an explicit 0–48 count of illustrative crossbars, default 0.
These are drawing parameters, never nucleotide lengths or measured quantities.
`turns` counts full sine periods, not the apparent enclosed openings between
the two curves. Do not copy an example's period/phase merely because it has the
same number of sites. Match the reference's actual silhouette and open ends.

The default strand IDs are `a,b`. A site's `at` is a fraction of the usable
horizontal backbone, and `marks` names the actual strand IDs, not screen
"upper" and "lower": a strand changes vertical order along a wave. An empty
marks array means the brief explicitly shows no marker there. For an unlabelled
source cartoon, the IDs identify drawing curves; they do not establish a
biological strand direction. Preserve the visible marker side using the curve
that passes through that location, and keep this mapping across conditions.
The engine does
not infer biological absence, an unknown result, or a complementary mark.
Use a separate labelled view for unknown state rather than turning it into an
unmarked outcome. Marker fill uses `site.fill`, then `palette.warm`.
An optional short `site.label`, such as `"Me"`, is live white text inside each
marked circle. Its size follows the marker radius; an overlong label fails
instead of changing marker geometry. Use a shared legend for a long name.
Use `site.name` for a short external site name such as p, q or r. The engine
aligns it to the exact site x, even when no marker is present. It rejects crowded
labels or insufficient frame space rather than moving the site. `siteNames:false`
hides only these names. In object views they appear at the first labelled
occurrence, unless a pose explicitly sets `showSiteNames`.
Do not read SVG circle coordinates merely to position these labels.

Site markers are native circles with stable terminals
`blockId-site-encodeURIComponent(siteId)-encodeURIComponent(strandId)`.
Backbones and optional rungs are native paths. Each site is an exact endpoint
of the smooth cubic representation, so its marker is anchored to the specified
strand rather than an approximate freehand curve. Overlapping markers, unsafe
colours and insufficient frame space fail early; enlarge the frame or adjust
explicit site positions rather than silently dropping marks.

## Compose the comparison

For example, two conditions can share the complete native duplex definition:

```json
{"type":"object-views","id":"comparison","x":50,"y":40,"w":1000,"h":300,
 "entities":[{"id":"template","extent":[0.9,0.7],
   "scientific":{"kind":"duplex","turns":2,"amplitude":18,
     "sites":[{"id":"p","at":0.1,"marks":["a"]},
              {"id":"q","at":0.6,"marks":["a"]}]}}],
 "views":[{"id":"initial","items":[{"entity":"template","at":[0.5,0.5]}]},
          {"id":"paired","items":[{"entity":"template","at":[0.5,0.5],
            "state":{"marks":{"q":["a","b"]}}}]}]}
```

Only the explicitly requested mark at q is added; geometry and the mark at p
are shared. These are supplied schematic states, not inferred chemistry.

1. Define the meaning of the site marker and actor colours from the supplied
   source. Red can identify a chemical mark; it does not universally mean error.
2. Define one `object-views` entity with `scientific:{kind:"duplex",...}` and
   shared `extent`. Repeat it at the same local `at` in each view; a pose can
   override only `state:{marks:{siteId:[strandIds]}}`. Keep site IDs even when
   marks are empty. The engine shares backbone geometry and rejects changing
   phase, colours or sites through a view's state.
3. Keep actors as simple named native objects. Presence/absence or qualitative
   size changes need evidence in the brief. An ellipse is a schematic protein
   glyph, not a validated protein structure or a measured abundance.
4. Give parent conditions space for their actual subcases. A parent with two
   scenarios can span two columns while all scenarios share stage baselines.
   Use short group headings or fine separators; no card background is required.
5. Put process arrows between the stages they connect. A source that says
   "recruit" in text does not establish a physical protein–substrate complex.
   Draw a binding contact, inhibition edge or biochemical result only when the
   supplied mechanism actually specifies it.
6. Use one shared identity legend. Its glyphs and colours must match the main
   figure. Keep repeated explanations in the caption, not underneath every cell.

## What is learned from the source

The [Nature Plants condition model](https://www.nature.com/articles/s41477-026-02396-4/figures/6)
uses five scenario columns under four parent conditions, fixed DNA cartoons,
protein presence/relative sizes and changed methylation marks. Its figure does
not depict a resolved physical binding topology; the caption identifies the
biochemical mechanism as a question for future work. This source supports the
comparison method, not a generic rule about any new protein or dose.

The [Nature Figure adaptation method](https://github.com/Yuan1z0825/nature-skills/blob/main/skills/nature-figure/references/asset-adaptation.md)
separates structural reuse from style inheritance. Apply that distinction here:
borrowing a palette or shared baseline does not justify reusing the source's
genotypes, methylation results or scientific conclusions.

For a requested visual review, compare the rendered site counts, backbone
phase, actor identities and stage alignment against the supplied brief or
image. Geometry checks alone cannot certify the mechanism or aesthetics.
