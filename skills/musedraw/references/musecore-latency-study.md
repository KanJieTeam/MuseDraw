# Finite seeded load studies

`lb-tail-latency` retains its existing finite supplied-request replay when the
input has no `study` property. The separate `seeded-lb-load-scan.json` example
uses an optional `study.kind: "seeded-fcfs"` branch. Explicit `null` is invalid.
This is a new ideal finite simulation with declared seeds, not recovery of
source 108's missing simulator, random draws or exact numerical curves.

The caller supplies 2–12 named FCFS single-worker servers, positive service rates
in .01–100 work units per declared time unit, 2–4 distinct routing policies,
2–8 strictly increasing offered loads in .05–1.2, 1–5 distinct nonzero uint32
seeds, 0–20000 warmup arrivals and 100–100000 measured arrivals. The selected
load and seed must occur in those lists. Titles, labels and notes are preserved;
layouts which cannot retain them at the reading size refuse.

The declared ideal assumptions are Poisson arrivals and independent exponential
work of mean one work unit. Service time is that job's work divided by the
chosen server's rate. Therefore lambda equals rho times the sum of rates under
this normalization. Specified pseudorandom streams approximate those ideal
distribution assumptions; deterministic reproducibility is not certification
that a finite PRNG stream is statistically independent or that a service is
well modelled by these assumptions.

The generator is `xorshift32-v1`, with unsigned shifts 13, 17 and 5. Uniform
variates use `(word+.5)/2^32`; exponential samples use `-log1p(-u)`.
Arrival, work and selection stream states are respectively `seed`,
`seed XOR 0x9e3779b9` and `seed XOR 0x85ebca6b`; a derived zero state becomes one.
Integer selection rejects words at or above `floor(2^32/n)*n`, where `n` is
the candidate count, then takes modulo `n`. Single choice selects one server; two-choice
selects two distinct candidates without replacement and chooses the one with
fewer unfinished jobs. Running jobs count as unfinished; ties use server input
order. Arrivals/work and the given selection draws are shared across policies
and loads for each seed. For each arrival, generation consumes the arrival word,
work word, single-choice draw, first two-choice draw and second two-choice draw
in that order (including any integer-rejection words). All three selection
arrays are generated even if the selected policy subset does not use one.
Equal-time completions are released before arrivals.
The explicit PRNG construction follows the class described in
[Marsaglia's original paper](https://www.jstatsoft.org/article/view/v008i14);
it is not a cryptographic generator or a randomness guarantee.

Each load starts empty. Warmup requests affect the queues but are excluded by
arrival index from the measured sample. Every measured request is followed to
completion, even after the last arrival; there is no latency censoring or
fixed observation-time cutoff. Quantiles are nearest rank `ceil(p*n)`.
Per-seed p99 values remain separate. Their median is a median of run summaries,
not a p99 of pooled requests. Thin lines/points show individual repetitions;
the thicker line shows that median. No confidence interval, bootstrap,
stationarity test or convergence claim is produced.

Equal-assignment policies have the analytic bottleneck condition
`rho < N*min(rate)/sum(rate)`. The example's six rate-one and two rate-half
servers give total capacity seven and boundary 4/7. At or above that boundary,
round-robin/random-single values are hollow and dashed finite observations,
not steady-state quantiles. At rho >= 1 all policies receive that finite-overload
marking. Other policies are not declared stable merely because they are below
one or because a finite p99 is small. See the primary-author
[two-choice survey](https://www.eecs.harvard.edu/~michaelm/postscripts/handbook2001.pdf)
for algorithm context; it does not validate this heterogeneous experiment or
the source author's stated p99 values. A separate table reports unfinished
jobs immediately after the last arrival, making finite accumulation visible.

The hard work budget is 16000000 policy-request operations, including warmup:
`(warmup+samples)*loads.length*seeds.length*policies.length`.
The default requests 10560000 such operations: 110000*8*3*4. Stream generation
is shared, rather than generating independent unrelated work per policy.
Browser rendering has a 20000 ms cooperative stop budget, checked every 2048
generation/replay arrivals and around sorting. It is not a hard real-time thread
termination promise; a blocking operation can finish before the next check.
Explicit callback cancellation is also supported by the JavaScript renderer
adapter. Measured duration belongs in verification/performance records and
does not enter deterministic SVG geometry. No test promises a fixed execution
time on a shared CI host, and failures are not automatically retried.

The figure is 2400 px wide, with a measured height budget of 7000 px. Too-close
true load positions, indistinguishable four-significant-digit tick labels,
oversized full labels or unsupported assumptions refuse rather than being
jittered, shortened or silently changed. Numeric display rounds to four
significant figures while metadata retains computed values. Floating-point
service intervals below representable resolution also refuse.

Use the original request replay for given individual jobs. Use another model
for real connections, non-FCFS service, retries, network delays, deadlines,
failures or production SLO conclusions. Source provenance and bounded related
capability do not constitute full source reproduction or aesthetic approval.
