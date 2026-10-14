# Repeat a drawing, or carry its visual language to new content

These are different jobs. Choose from the user's intent, not from the convenience
of the existing helper.

## Repeat the same drawing

Use the selected native source and its declared generation command when available.
Keep text, geometry, relationships and styles fixed. Record a SHA-256 of the
source and tool versions. A different assistant need not rediscover the design.
Render with the same fonts and renderer when comparing pixels. Delivering the
stored PNG proves that the asset was copied, not that a model reproduced it.

An identical SVG hash establishes identical source bytes. It does not establish
identical font rendering on every computer. Native draw.io import/editing also
needs a separate test; SVG/PNG layout checks do not certify that editor.

## Use the style for a different drawing

A short request and the existing conversation are enough. The agent extracts
facts and selects a visual grammar; the user does not supply coordinates.

Separate the reusable decisions from example content:

- Reading order and hierarchy: a main path and its branches, ownership fields,
  or concrete deployment boundaries, according to the new facts.
- Shape roles: distinguish a person, execution component, storage and external
  boundary when those roles exist. Do not repeat the reference's instances.
- Typography, line character, major color areas, spacing rhythm and small brand
  mark: keep a recognizable treatment, not the example's exact dimensions.
- Labels and connections: take these from the new request; never inherit its
  business nouns, server counts or protocols from an example.

The published graph route does not implement every composition. If a topology
is rejected, retain the supplied facts and report the unsupported layout rather
than hand-drawing a replacement and claiming it uses the reproducible route.
Legacy grouped/token helpers are compatibility utilities, not additional
published or model-verified styles.

## Test the promise that is actually being made

1. Same source: render it in a fresh output directory and check source identity,
   actual font bounds, connections and preview sizes.
2. New content: run a genuinely different short brief, check that supplied facts
   survived and the old example's content did not leak.
3. Revision: change a name, add a component and alter a relationship; compare
   unchanged objects, then inspect the rendered result.
4. Other assistant/model: record the host, model, input and unedited first output.

Report these separately. A portable Skill can be read by compatible tool-using
agents; this is not a guarantee that every chatbot can execute local tools or
that every model will make identical design decisions. Visual acceptance is a
human judgment, not the result of counting colors or passing XML checks.
