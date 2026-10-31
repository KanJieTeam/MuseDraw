# Explicit distance input and UPGMA reconstruction

`dated-phylogeny` keeps its original supplied-tree mode. A mutually exclusive
`reconstruction` object enables a bounded UPGMA view. In this mode the top-level
fields are only `family`, `title`, `subtitle`, `note`, and `reconstruction`.
The object contains `method: "upgma-average-linkage"`, `evidenceKind`,
`distanceUnit`, `tips`, and `distances`. Supplied `nodes`, root IDs, node ages,
chronology bands, calibration and other fields cannot be mixed into this mode.
The pure helper exports only `upgmaDistanceModel`; the render factory remains
`phylogenyFamilies`. The original `datedPhylogenyModel` stays a forward-tree API.

Supply two to ten unique tips and every cell of a square matrix in that tip
order. Each tip has an ID, a complete label and a scientific-name string that
may be empty; names are not used to infer relationships. Distances must be
finite Numbers from zero through 1,000,000, exactly symmetric, with exactly zero
diagonal. Missing values are rejected. These bounds are this route's domain,
not a claim that larger or fractional scientific distances are impossible.
Evidence must be explicitly `synthetic-teaching`, `caller-supplied`, or
`source-constructed-example`. The default five-tip matrix is new synthetic
teaching data, not an observed primate dataset.

Each Number's canonical decimal string becomes an exact rational. This does
not recover the caller's pre-parse numeric spelling or the IEEE binary
expansion. Cluster distance is the arithmetic mean of all original sample
pairs across the two clusters; this weights leaves, not child clusters equally.
The least mean is selected by exact rational comparison. For an exact tie,
sort the complete IDs inside each cluster, serialize that ID tuple as canonical
JSON, sort the two cluster keys, and choose the first canonical pair key by
UTF-16 code-unit lexical order. Merge records retain the count of equally
minimal pairs. `0.3` and `0.30000000000000004` remain different inputs.

A node's height is the selected mean distance divided by two, in the declared
distance unit. It is **not an absolute divergence date**. No time calibration,
geological band, molecular-clock fit or proof is generated. Zero-distance and
equal-height branches keep their actual zero extent; the deterministic binary
order used for ties is not extra biological resolution. All-zero input has one
zero axis mark, without an invented positive scale. Triangle inequalities and
ultrametricity are not silently assumed to hold for the given matrix.

Exact numerators and denominators remain available beside readable numeric
approximations. Positive values that would become zero, nonfinite heights, or
conversions losing more than one part in a million of relative precision are
rejected with an explicit rescaling request. Selection never uses that drawing
precision bound as a tie tolerance. Numeric matrix values stay complete and on
one line; measured column width may enlarge the page. Exact merge fractions
that cannot fit one readable detail line require an explicitly rescaled input
unit or a dedicated view; their digits are never wrapped into ambiguous pieces. Fixed-size long labels
wrap and increase row height. Inputs exceeding the readable line/page budget
are rejected rather than truncated or reduced in font size. Full user titles,
subtitles and notes remain visible. No free layout coordinates are accepted.

The paper-and-ink view coordinates a calculated merge tree, the **original
input matrix in its original order**, and a merge ledger. It does not replace
the input matrix with tree-derived MRCA ages. Sequence alignment, inferred
observations, missing-data imputation, bootstrap/support probabilities,
reticulation and biological or clinical conclusions are outside this route.
Use the supplied-tree mode when a separately justified dated topology is the
actual input.

```sh
node scripts/musedraw.mjs core render assets/musecore/upgma-distance-teaching.json --out output/upgma
```

The default matrix yields merge heights `3/2`, `5/2`, `15/4`, `55/12`. Its final
mean is `55/6` across six original pairs. Equal child-cluster weighting would
instead give `37/4` and height `37/8`; that is WPGMA and is not substituted here.
An independent Python Fraction implementation using the cluster-size update
recurrence verifies 250 separately supplied matrices; each reversed input order
is also checked. A stored exact-result digest makes that oracle evidence
available to the standalone Node regression without a Python dependency. SciPy
average linkage independently matches the five-tip result. Production browser
checks verify actual input-cell text, branch endpoints, zero branches, labels,
complete notes and measured font-pressure layouts.

The [SciPy linkage documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.cluster.hierarchy.linkage.html)
defines average linkage over all cross-cluster object pairs and distinguishes
it from equal child-cluster weighting. Its tie warning also explains why this
route specifies its own deterministic tie rule; agreement with another
implementation's tie ordering is not assumed.

Source composition reference: `168-primate-phylogeny`, `source.svg` SHA256
`56f9d936929ad7fb5c5d601087414fee1319fc4c382b1aaf4806f1e8fc017fce`.
The author states that the example distances were constructed as twice the
MRCA age. The separate ten-tip consistency fixture is therefore labelled
`source-constructed-example`: recovering its nine numerical heights is only a
source consistency check, not independent evidence from observed genetic data,
proof of a molecular clock, or a reconstruction of calibrated absolute dates.
The default independent five-tip example is kept separate from that fixture.
Geometry and numerical checks do not grant aesthetic or scientific approval.
