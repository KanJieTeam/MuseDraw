# Area completion and triangle angle construction

`completing-square` takes a monic equation `x² + kx = c` with bounded positive
integer `k` and `c`, plus the variable's stated meaning and unit. It constructs
the positive length solution at a common geometric scale, divides the linear
term into two strips and computes the exact missing square. Odd coefficients
retain rational strip widths and areas. Both real algebraic roots remain in
the explanation; a negative root is not drawn as a positive physical length.
The area diagram has an explicit readable ratio bound. Other coefficient signs
or a geometry outside this range require another construction.

`triangle-angles` constructs a nondegenerate Euclidean triangle from an explicit
horizontal base length, two base angles and three distinct vertex labels. Each
angle must be 20–140 degrees, including the derived apex. The actual coordinates
generate the angle arcs, side lengths and apex-parallel proof. An obtuse shape
is not replaced by the same acute template; text and geometry reflow together.
It does not prove a statement about arbitrary supplied coordinates or about
spherical triangles.

```sh
node scripts/musedraw.mjs core example completing-square --out output/square.json
node scripts/musedraw.mjs core render output/square.json --out output/square
node scripts/musedraw.mjs core example triangle-angles --out output/angles.json
```

Exact fractions and approximate geometric readings have distinct labels.
Passing the arithmetic and geometry checks does not establish aesthetic quality.
