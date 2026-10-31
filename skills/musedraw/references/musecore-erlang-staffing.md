# Conditional Erlang C staffing

`erlang-staffing` calculates 1–12 independently stationary M/M/c teaching
scenarios. The caller explicitly selects
`model: "stationary-mm-c-fcfs-no-abandonment"`: Poisson arrivals, identical
independent exponential service times, one FCFS queue, unlimited waiting room,
no abandonment. This is a conditional mathematical model, not a guarantee about
a real contact centre or an executed schedule.

Each scenario supplies `hourlyCalls` (integer 0–6000), `meanServiceSeconds`
(1–3600), `answerWithinSeconds` (0–3600), `targetFraction` (0.000001–1),
`unavailableFraction` (0–0.95) and `maxAgents` (integer 1–2000). Service/deadline
seconds support three decimal places, targets six, unavailable fractions three.
The integer hourly-call grammar is a program boundary; fractional physical rates
are not claimed impossible. Units are fixed by these field names. Unknown fields,
implicit unit conversion, fractional people, excessive text/counts or unsupported
queue assumptions are rejected. Labels do not imply temporal continuity.

For offered load `A = hourlyCalls × meanServiceSeconds / 3600`, test only
integers `N > A`. Use Erlang B recurrence `B₀=1`,
`Bₙ=A Bₙ₋₁/(n+A Bₙ₋₁)` and then
`C=Bₙ/(1−A/N+(A/N)Bₙ)`. The waiting-time tail gives
`SL=1−C exp(−(N−A) × answerWithinSeconds / meanServiceSeconds)`.
The first tested integer meeting the target is selected. Log-domain recurrence
and tail comparison retain very small probabilities; a rounded displayed
percentage is not the target test. Shrinkage is an explicit separate arithmetic
assumption: scheduled people are `ceil(N×1000/(1000−lossPermille))`, evaluated
with integers so 1/(1−0.8) produces 5, rather than a floating-point ceil of 6.
For zero-deadline comparisons near a target boundary, a BigInt stationary
normalizer checks the rational inequality exactly; no epsilon accepts a target.

Primary references: the [NPTEL M/M/m/∞ lesson](https://archive.nptel.ac.in/content/storage2/courses/117103017/module3/lec2/1.html)
states the stationary condition `λ/μ < m`. The [NPTEL collected lecture PDF](https://archive.nptel.ac.in/content/storage2/courses/111103022/module8/lec3.pdf)
contains Erlang B recurrence and C material on PDF pages 200–201; it is a
combined document, despite its URL path. Chromy, Misuth and Kavacky,
[Erlang C Formula and its Use in the Call Centers (2011)](https://advances.vsb.cz/index.php/AEEE/article/view/34/pdf),
PDF page 2 / printed page 8, equations (5) and (8), gives the waiting-time
distribution and the threshold service fraction; equation (1) gives direct C.
Tests additionally use an independent direct power/factorial normalizer, rather
than duplicating production recurrence.

Zero arrivals return `no-demand`, zero people and unspecified service fraction.
For positive arrivals and finite deadline, exact 100% returns
`unattainable-target`; no finite minimum or staffing count is invented. A failed
bounded search returns `capacity-limit`, null people and the actual cap check.
If `maxAgents ≤ A`, that check is explicitly unstable and its SL remains null.
Failed/undefined results are drawn as missing results, not zero-height successes.

Source 198 supplies the single explicit peak: 520 calls/hour, mean 240 seconds,
80% within 20 seconds, and 30% unavailable time. It computes minimum online
40 and scheduled 58. Independent 70-digit direct calculation gives SL(39)
≈0.74100079592067993302 and SL(40)≈0.81653731204540284984.
SL(35)≈0.09179050938796988889 is poor service but `35 > 104/3` is stable in
this model. The original's statement that this necessarily causes indefinitely
growing queues is therefore not adopted as a calculated conclusion. Other hours
and the original's 485 person-hour total are not reconstructed from its curve.

The drawing keeps a whiteboard, actual candidate service curve and target line,
same-zero online/scheduled bars, and the given-demand derivation. It performs no
simulation, abandonment calculation, cross-scenario queue carry-over, multi-skill
routing, roster assignment or daily staffing total. Full numeric candidates and
scope remain in SVG geometry metadata. `compositionReference` identifies a visual
reference, not the provenance of arbitrary caller data. New scripts are
`erlstaff-models.mjs` and `erlstaff-figures.mjs`; factory
`erlangStaffingFamilies(h)` uses existing SVG/visual tools, quantitative scales and
equation text measurement. The production test calls `editorHtml`,
`MuseCore.render` and `MuseCore.audit` without a private fallback.
