# Bounded instrument geometry

`wind-tunnel` draws five explicitly ordered rectangular sections: settling,
contraction, test, diffuser and fan. Length and height share a scale; supplied
depth remains a separate numerical dimension. Area ratio and side diffuser
half-angle derive from those dimensions. Screens and an optional NACA0012 test
section must fit the declared clearances. The smooth contraction wall is a
drawing profile, not an optimized flow design. This route predicts no speed,
uniformity, pressure recovery, loading or fan performance and is not a validated
fabrication drawing or CFD result.

`light-sheet` uses a declared ideal paraxial Gaussian narrow-axis section,
explicit refractive index, vacuum wavelengths and 1/e² intensity waist radius.
Excitation, sheet plane and detection have declared orthogonal axes. Beam
envelope, Rayleigh length and thickness/length curves use the same parameters.
Twice the Rayleigh length is a stated confocal-length convention, not a guaranteed
usable microscope field. Objective and camera bodies are schematic symbols.
No resolution, quantitative signal, light toxicity, aberration or actual optical
prescription is inferred; lattice, scanned and Bessel sheets leave this route.

```sh
node scripts/musedraw.mjs core example wind-tunnel --out output/tunnel.json
node scripts/musedraw.mjs core render output/tunnel.json --out output/tunnel
node scripts/musedraw.mjs core example light-sheet --out output/sheet.json
```

Read the example schema and its geometry limits before mapping content. The
blueprint and dark instrument constructions own their coordinated objects and
labels. Passing geometry and formula checks does not approve their appearance
or validate a real instrument.
