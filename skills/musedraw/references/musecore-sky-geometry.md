# Ideal orbital and lunar geometry

Use `orbital-motion` to explain equal-time orbital motion and `moon-phases` to
connect supplied geometry to visible illumination. Neither family is an
ephemeris, a real observation, a lunar calendar or an eclipse model.

`orbital-motion` uses a single-centre ideal planar ellipse with eccentricity
0–0.8 and explicit model-length/period normalisation. It solves
`E − e sin(E) = M`, derives positions at equal time intervals, and computes
analytic swept areas for the supplied equal-duration windows. It also checks
the area of the actual filled polygon against the analytic area: error over
0.5% refuses and asks for more samples within the bounded sampling range.
Equal angles must not substitute for equal times. Bodies are schematic and
their displayed radii do not set orbital scale. Extreme eccentricity, excess
content or inadequate sampling exits rather than inventing geometry.

`moon-phases` takes identified elongations in degrees, starting at the new-moon
direction, plus an explicit observation hemisphere and teaching orientation.
Compute illumination, terminator, spatial position and each corresponding disc
from the same geometry. Elongation is distinguished from the Sun–Moon–Earth
phase angle. North/south teaching views do not assert the rotation of a real
sky image. Do not inherit approximate lunar dates from a reference or equate
the full-moon alignment in this planar diagram with an eclipse prediction.

```sh
node scripts/musedraw.mjs core example moon-phases --out output/moon.json
node scripts/musedraw.mjs core render output/moon.json --out output/moon
```

The mechanisms are grounded in [OpenStax's planetary-motion chapter](https://openstax.org/books/astronomy-2e/pages/3-1-the-laws-of-planetary-motion)
and [NASA's explanation of lunar phases](https://science.nasa.gov/moon/moon-phases/).
Pure geometry lives in `orbit-models.mjs` and `phase-models.mjs`. Inspect the
finished night-sky and paper-atlas views; tests do not certify their aesthetics.
