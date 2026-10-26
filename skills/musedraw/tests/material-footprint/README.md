# Material footprint tests

Run from the repository root with Node.js, without browser dependencies:

```sh
node --test skills/musedraw/tests/material-footprint/material-footprint.test.mjs
```

The tests cover polygon fill membership, hole winding under reflection,
concave outer/hole geometry, source-to-view vertex correspondence, explicit
single-source updates and rejection of bounded invalid input. They inspect
the serialized path's fill behavior rather than merely counting paths.

Use finite drawing coordinates at diagram scale. Path output is rounded to
six decimal places and validation uses fixed tolerances. These tests make no
claim of topology robustness for arbitrarily precise or nearly degenerate
geometry. Browser/native export verification is separate from these Node tests.
