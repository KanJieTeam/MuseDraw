# Supplied molecular and fluorescence records

`proteomics-panels` coordinates six independently supplied panel objects: samples,
an explicit amino-acid sequence, chromatogram points, mass-spectrum sticks,
candidate records and supplied volcano results. It computes ideal K/R-not-P
digestion, coordinate mapping, supplied-score order and declared p/fold threshold
comparisons. It does not search a spectrum, identify a protein, infer FDR, perform
a statistical test or create a molecular linkage between independent panels.
Feature identities and p-value types are supplied records, not discoveries made
from the drawn peaks.

`calcium-traces` accepts supplied ROI positions, fluorescence records, neuropil
coefficient, inclusive baseline window and event rule. Corrected fluorescence is
`Fcell - alpha * Fneu`; F0 is the unweighted mean of observed corrected samples
inside that window. Nulls remain gaps. Events are sampled upward threshold
crossings with the supplied refractory interval, not spikes or firing rates.
Optional time matching compares supplied reference times; those references are
not independently verified ground truth. ROI circles are position schematics,
not an image or automatic segmentation. No registration, deconvolution, clinical
inference or unimplemented sliding-quantile/rise-rate algorithm is implied.

Inspect `core example proteomics-panels` or `core example calcium-traces`, then
use `core render`. Coordinated panels and shared trace scales use the same input
records; unsupported algorithms or excessive content leave these bounded routes.
Mechanical tests do not approve scientific interpretation or aesthetic quality.
