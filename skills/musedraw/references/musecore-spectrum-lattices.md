# Wavelengths and declared lattice cells

`electromagnetic-spectrum` uses explicit wavelength boundaries on a logarithmic
axis. Frequency and photon energy follow the same wavelength through exact
physical constants. The visible enlargement declares its chosen wavelength
convention; approximate band names are not sharp universal physical boundaries.
The aurora construction links common-axis bands, selected wavelengths and the
visible detail rather than drawing decorative evenly spaced categories.

`bravais-lattices` projects the fourteen declared three-dimensional Bravais
types with supplied metric parameters and a stated conventional setting.
Projection, centring sites, edge lengths and cell counts share those parameters.
Rhombohedral primitive and hexagonal cells retain their distinct geometry.
See [IUCr's lattice terminology](https://dictionary.iucr.org/Bravais_lattice).
The Bauhaus construction coordinates actual cell projections and type labels.
It checks supported settings and specified degeneracies; it is not an arbitrary
crystal's highest-symmetry classifier or an atomic structure solver.

```sh
node scripts/musedraw.mjs core example electromagnetic-spectrum --out output/spectrum.json
node scripts/musedraw.mjs core render output/spectrum.json --out output/spectrum
node scripts/musedraw.mjs core example bravais-lattices --out output/lattices.json
```

Read the example's accepted fields before mapping facts. Unsupported crystal
settings or spectral inference require another route. Geometry and arithmetic
checks do not approve a new work's appearance.
