# Atom accounting and electron transfer

`reaction-balance` computes the unique primitive positive integer ratio for
three to five explicitly supplied neutral species containing two to four
supported elements. Species supply their atom counts rather than a freeform
formula parser. Exact rational elimination finds the one-dimensional nullspace;
each coefficient must be at most eight and each balanced side at most 48 atoms.
Ambiguous ratios, charged species and unsupported fields refuse. Atom packages
and the before/after table use the same calculated counts. A formula unit is
not presented as a molecule, and circles do not claim a molecular geometry.
Conservation is necessary for a reaction equation; it does not predict that a
proposed reaction happens. The scope follows the distinction in
[OpenStax's equation-balancing explanation](https://openstax.org/books/chemistry/pages/4-1-writing-and-balancing-chemical-equations).

`ionic-transfer` uses an explicit teaching catalog: Li, Na, Mg, Al, K and Ca
cations with F, O, Cl and S anions. Supply the simplest positive formula-unit
ratio, with at most five atoms/ions. The model derives charge, shell counts and
every transferred electron from that ratio; lost and gained electrons and total
charge must agree. Li⁺ retains its two-electron shell. The electron dots are
counts, not trajectories. It is not a universal octet-rule solver, oxidation
state inference engine or crystal lattice model; see
[ionic bonding](https://openstax.org/books/chemistry-2e/pages/7-1-ionic-bonding).

```sh
node scripts/musedraw.mjs core example reaction-balance --out output/reaction.json
node scripts/musedraw.mjs core render output/reaction.json --out output/reaction
node scripts/musedraw.mjs core example ionic-transfer --out output/ions.json
```

The whiteboard and aurora constructions coordinate labels, particles, electron
identities and relations. Inspect the finished work; arithmetic checks do not
approve its appearance or establish experimental evidence.
