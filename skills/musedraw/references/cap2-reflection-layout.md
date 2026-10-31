# Measured line boxes for the existing reflection construction (candidate)

This is a typography fallback for `reflection`, not a second reflection model.
`planeReflection` still computes all incident/reflected directions, normals and
mirror vectors. The original renderer remains the exact route when its type
fits the existing line spacing and single-line heading capacity.

`cap2ReflectionNeedsMeasuredLayout` checks the real font ascent and descent
against the original line spacing, detects an over-capacity/wrapped heading,
and detects punctuation-only lines. The existing reflection route invokes
`cap2ReflectionMeasuredFigure` only when those checks require it. It does not
use the font name, OS, source ID or a manually chosen per-input switch.

The fallback retains title, subtitle, fixed angle explanation and the complete
caller note. It balances note lines without isolated punctuation, measures the
side column, and moves the unchanged physical drawing down only as needed to
clear the heading. Angle captions reserve their measured rectangular footprint
against both bounding rays and the angle arcs. The canvas grows for the complete
footer; no type size is reduced.

The input grammar remains the existing `reflection` grammar. Unknown fields
still reject at the shared family. Its current ideal plane-mirror range remains
incidence 0–80° and mirror tilt −20–20°. The fallback admits up to seven note
lines, three title/subtitle lines and five side-explanation lines before refusing
excessive content. Reversibility and the three laws can be carried in a supplied
note, as the retained source-text adaptation demonstrates. No experiment, 3D
wave behavior, refraction or arbitrary-mirror solver is inferred.

Newly rendered fallback inputs carry `compositionReference` rather than a
`sourceCase` replay claim. The guard patch, default compatibility evidence,
Noto normal/+40 PNGs, source note adapter and numerical reflection/reverse-ray
oracle are supplied with the handoff. Execution checks are not aesthetic approval.
