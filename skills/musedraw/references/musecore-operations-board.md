# Operations board

`operations-board` is a bounded composition for a recurring operational view:
one current headline, two to four status signals, one measured trend, and two
to eight explicit work items. The page reads from current state to direction,
then to the queue that can be acted on.

The input must provide every value, unit, state, owner and due label. The
program does not infer live status, causality, priority, ownership or a missing
deadline. `steady`, `watch` and `critical` are display states supplied by the
caller; they are not computed risk scores.

Queue states `now`, `next` and `held` mean current work, next work and held work.
`held` is displayed as “暂挂”, independently of the supplied due label. It does
not assert that a deadline has passed. Queue order stays as registered; the
renderer does not silently prioritize or sort tasks.

The queue is content-sized. Long Chinese labels wrap at a fixed readable size
and increase the row height; the page refuses unsupported states or malformed
trend values instead of shrinking text or dropping items. The composition is a
wide board intended for a desktop or slide viewport. On narrow screens it stays
complete inside a horizontal viewing surface rather than clipping the right
columns.

Demo input:

```sh
node scripts/musedraw.mjs core example operations-board-demo --out output/operations-board.json
node scripts/musedraw.mjs core render output/operations-board.json --out output/operations-board
node --test skills/musedraw/tests/musecore/operations-board.test.mjs
```

The geometry audit checks text containment and line placement. It does not
declare an aesthetic approval; visual review remains separate.
