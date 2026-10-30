# Equal intervals and explicit local maps

`interval-spacing` compares placement along one finite line or one closed
circumference. Supply exact integer length and spacing in the same unit,
an object kind and one to five endpoint/topology variants. Length must divide
exactly; each variant contains two to forty objects. A line explicitly includes
both ends, just one end or neither. A loop has one shared start/end location.
The program calculates counts and positions; its marks are not decorative
estimates. Linear distance and circumference share a scale. It does not round
remainders, handle multiple perimeters or infer site planting rules.

`compass-map` accepts three to ten named landmarks with integer east/north
coordinates, zero to eighteen explicit undirected straight road segments and
up to four named road lines. North is up and both coordinate axes use the same
scale. Directions use eight half-open 45-degree sectors; they are not a claim
that every route is a cardinal bearing. An optional route computes a shortest
path only over supplied edges, using coordinate-derived lengths. Disconnected
destinations are shown as unreachable. Intersections and intermediate landmarks
must be explicit junctions with split segments; roads do not silently connect.
This is a fictional local Cartesian teaching map, not a navigation service.

```sh
node scripts/musedraw.mjs core example interval-spacing --out output/spacing.json
node scripts/musedraw.mjs core render output/spacing.json --out output/spacing
node scripts/musedraw.mjs core example compass-map --out output/map.json
```

The whiteboard and metro constructions own their marks, type and placements.
Change facts in the example rather than positioning icons by hand. Check the
result at its intended viewing size; mechanical checks do not approve aesthetics.
