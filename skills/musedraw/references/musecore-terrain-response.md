# Explicit terrain fields and ideal runoff response

`contour-field` takes a rectangular two-to-thirty-three-by-two-to-thirty-three
regular height grid, metre coordinates and one to ten increasing contour levels.
Both horizontal dimensions use the same metre scale. Marching Squares computes
actual isolines; its asymptotic determinant resolves alternating corners, and
an exact bilinear saddle keeps the four arms meeting at their saddle. Flat cells
are reported rather than decorated with imaginary contours. Up to six sample
annotations refer to actual grid vertices; claimed extrema must match the grid.
The renderer limits density and aspect ratio instead of distorting coordinates.
It does not infer rivers, landforms or real geographical coordinates.

`runoff-response` is an ideal discrete linear direct-runoff demonstration.
Supply one to sixteen **effective** rainfall depths in mm per time bin, a
two-to-sixteen-bin nonnegative response kernel in h⁻¹, a common time step and
catchment area. The kernel must satisfy `sum(kernel) * dtHours = 1`; there is no
silent normalization. The full `N + K - 1` convolution tail is retained, discharge
is bin-average m³/s and input/output volumes are checked for conservation.
A separately supplied rooted river tree is schematic; it does not determine
area, travel time or the response kernel. The program does not estimate losses,
baseflow, total-to-effective rainfall conversion or a real flood forecast.

```sh
node scripts/musedraw.mjs core example contour-field --out output/terrain.json
node scripts/musedraw.mjs core render output/terrain.json --out output/terrain
node scripts/musedraw.mjs core example runoff-response --out output/runoff.json
```

Keep source measurements and model assumptions distinct. The water-ink visual
language is a representation, not evidence of geospatial or predictive validity.
