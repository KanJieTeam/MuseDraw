# Conditional shadow geometry

`shadow-height` calculates one to three unknown vertical-object heights from a
supplied reference height and measured shadows. Same instant, horizontal ground,
vertical objects and parallel light must all be explicitly declared. Exact
hundredth-unit arithmetic determines the height ratio, and a common drawing
scale determines triangles and dimensions. Nonterminating values show a fraction
and approximation. Missing reference facts, unsupported proportions or extreme
size differences require another view. The drawing does not verify field
conditions or the accuracy of measurements.

`sun-shadow` projects a given pole's shadow from two to nine explicit solar-angle
records. Azimuth is clockwise from north; shadow vectors point opposite the sun.
Labels such as a clock time remain labels, not inferred solar coordinates.
Below-horizon, horizon and zenith states are distinct. Positive elevations below
five degrees leave this bounded view rather than being clipped into a fictitious
finite shadow. See [NOAA's solar-angle terminology](https://gml.noaa.gov/grad/solcalc/glossary.html).

```sh
node scripts/musedraw.mjs core example shadow-height --out output/height.json
node scripts/musedraw.mjs core render output/height.json --out output/height
node scripts/musedraw.mjs core example sun-shadow --out output/shadows.json
```

The whiteboard constructions coordinate objects, rays, dimensions, plan-view
vectors and records. Neither calculates ephemerides from a date/location nor
models uneven terrain, atmospheric refraction or navigation. Inspect the final
work; checked geometry is separate from aesthetic approval.
