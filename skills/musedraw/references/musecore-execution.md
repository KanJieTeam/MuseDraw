# Symbolic histories and bounded execution

Use `git-history` for a two-branch teaching comparison and `loop-trace` for a
small structured integer loop. The terminal material supports code and state;
it is not a reason to turn an ordinary report into a terminal screenshot.

```sh
node scripts/musedraw.mjs core example loop-trace --out output/loop.json
node scripts/musedraw.mjs core render output/loop.json --out output/loop
```

`git-history` accepts one to three common commits and one to four commits on
each diverged branch, distinct symbolic branch names and an explicit merge
commit. The model constructs every parent edge. Merge preserves both branch
tips as parents; rebase creates new symbolic identities and records each original
commit's correspondence. Nodes, arrows, references and mapping use the same
model. It does not execute Git, compute object hashes, inspect files, resolve
conflicts or prove patch equivalence. Do not feed an arbitrary repository DAG
into this linear two-branch model.

`loop-trace` accepts an integer initial index, nonzero step, bound and one of
`<`, `<=`, `>`, `>=`. The accumulator has an explicit initial value and one closed
action: add the index, its square or a supplied constant. It computes every
condition, body term, accumulator and update, including the last failed
condition. Zero iterations leave the body visibly unexecuted. Wrong-way steps,
more than twelve iterations and numeric/text limits refuse. This is not an
interpreter for arbitrary program text; do not replace unsupported actions with
plausible code or silently truncate a trace.

Pure models live in `history-models.mjs` and `loop-models.mjs`; figure modules
own the measured layout. Preserve input, PNG, SVG and offline editor, inspect
the actual work, and keep aesthetic approval separate from execution tests.
