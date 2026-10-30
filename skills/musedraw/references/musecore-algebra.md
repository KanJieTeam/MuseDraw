# Exact affine equations and two discrete quantities

`equation-balance` uses a structured affine equation `a*x + b = c*x + d`
with bounded integer coefficients, a stated real domain, variable meaning and
unit. It does not parse or execute freeform code. Signed algebra tiles, each
equivalent step, the reduced rational answer and substitution check share the
same exact arithmetic. Distinguish a unique solution, identity and contradiction;
do not divide by zero or turn a fractional result into a false exact decimal.
The whiteboard is a mathematical representation, not a physical balance whose
unknown weights must be positive.

`two-quantities` accepts two named object types with distinct integer unit
coefficients, a total object count and a total associated quantity. The bounded
discrete model requires a nonnegative integral solution, with at most forty
objects. The model derives both counts; each drawn object and its associated
unit dots come from those counts and coefficients. Zero objects/coefficient
and reversed type order retain their meaning. Impossible totals or fractional
object counts refuse. Names and coefficients are supplied; the program does
not assume chickens, rabbits or a fixed number of legs.

```sh
node scripts/musedraw.mjs core example equation-balance --out output/equation.json
node scripts/musedraw.mjs core render output/equation.json --out output/equation
```

`equation-models.mjs` provides the shared exact rational operations used by
both models. The native whiteboard/chalk objects, text and marks are computed
together; inspect the result at its intended size and keep editable source.
