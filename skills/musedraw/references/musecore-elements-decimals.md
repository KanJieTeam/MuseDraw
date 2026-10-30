# Element selection and decimal place value

`first-elements` selects two to twenty unique entries from a fixed, verified
catalogue of atomic numbers 1–20. Period/group positions and counts derive from
that catalogue. A focus must be selected; atomic weights are an explicit option.
Weight values and uncertainty notation follow
[CIAAW](https://ciaaw.org/atomic-weights.htm). Boron and silicon use the stated
metalloid treatment. The red/black Swiss grid is not a complete periodic table,
a universal element-classification rule or an isotope-mass calculator.

`decimal-placevalue` accepts a decimal string from 0.0 to 3.99 with one or two
fractional digits. Integer hundredths drive the filled units, ten-by-ten detail,
tenths columns, hundredths cells and place-value decomposition. Small whole-unit
thumbnails explicitly declare their different display scale. The route refuses
negative values, excess precision and arbitrary equations; it does not silently
round them to fit the drawing.

```sh
node scripts/musedraw.mjs core example first-elements --out output/elements.json
node scripts/musedraw.mjs core render output/elements.json --out output/elements
node scripts/musedraw.mjs core example decimal-placevalue --out output/decimal.json
```

These constructions own their object drawing and reflow. Keep factual content
within their declared scope and inspect the finished figure. Passing a count or
layout check is separate from aesthetic approval.
