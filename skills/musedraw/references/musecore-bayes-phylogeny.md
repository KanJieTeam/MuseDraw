# Explicit Bayesian updates and dated trees

`beta-binomial-update` uses a supplied Beta prior, shapes 1–50, and a declared
common-probability Bernoulli model. Inputs are up to 400 successes/failures or an
explicit binary sequence of at most eighty observations. Sequential panels need
given checkpoints; totals do not imply an observation order. Posterior density,
mean and equal-tail credible intervals come from the same calculation. An
optional fixed 95% Wilson interval remains a frequentist comparison, distinct
from the posterior interval. Zero trials preserve the prior. The normalized
likelihood shape is labelled as a likelihood, not a posterior belief.

This route does not choose a prior, infer causality, handle dependent trials,
estimate clinical effects or calculate HPD intervals. The blackboard construction
links observations, the update equation and calculated curves.

`dated-phylogeny` displays an explicitly supplied rooted tree with two to twelve
extant tips at age zero, node ages and optional age intervals. Shared time
coordinates determine branch lengths;
derived common-ancestor ages are not genetic distances. Paper-and-ink branches,
labels and the age view remain tied to those supplied facts. It is a forward
display, not topology inference, molecular-clock fitting, a conversion of
pairwise distances into dates or evidence that a proposed tree is correct.
Extinct tips, reticulation and branches compressed beyond the declared minimum
leave this bounded display. Overlapping marginal age intervals are not a joint
chronology.

```sh
node scripts/musedraw.mjs core example beta-binomial-update --out output/bayes.json
node scripts/musedraw.mjs core render output/bayes.json --out output/bayes
node scripts/musedraw.mjs core example dated-phylogeny --out output/tree.json
```

Map content only after reading the accepted example schema. Unsupported priors,
missing outcomes, incompatible ages or unprovided tree relations must take a
different route. Numerical and geometry checks do not approve aesthetic quality.
