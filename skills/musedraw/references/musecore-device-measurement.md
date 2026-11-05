# Device measurement

This bounded family draws a 2D apparatus only when component geometry is supplied explicitly. Components must remain disjoint so labels and paths have a readable physical locus. It separates measurement, control, and reference paths and keeps readings tied to a detector component and source record. It refuses missing geometry, invented paths, unknown component references, invalid roles, overlapping apparatus nodes, and unmeasured numeric values. It does not infer dimensions, wavelengths, scale, or physical laws from labels.

```powershell
node --test skills/musedraw/tests/musecore/device-measurement.test.mjs
node scripts/musedraw.mjs render skills/musedraw/assets/musecore/device-measurement-demo.json --out output/device-measurement
```
