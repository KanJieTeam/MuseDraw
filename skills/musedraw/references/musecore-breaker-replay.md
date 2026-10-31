# Custom circuit-breaker teaching replay

`circuit-breaker-replay` computes a **custom, sequential, instantaneous teaching
policy**. Structured parameters and supplied downstream outcomes determine
admission, sliding-window checks, probe progress and state transitions. Guard
captions are generated from those same parameters; they are not executable
free text. This is not a Resilience4j implementation or a production breaker.

## Contract and calculation

Supply `family`, `title`, `subtitle`, `evidenceKind`, `policy`, `requests`,
`assumptions` and `note`. `view` defaults to `overview`; `detail` uses exactly
the same computation and shows every request. Evidence kind is one of
`source-transcribed-example`, `synthetic-teaching-example`, or
`caller-given-observations`; this is a caller declaration, not evidence
verification by the renderer. At most three explicit assumption statements
are allowed. Notes and assumptions remain visible in both views.

The model starts closed. It supports these explicit policy fields:

| Field | Accepted input and meaning |
| --- | --- |
| `windowSize` | Integer 1–100. The last N admitted outcomes recorded while closed. |
| `minimumCalls` | Integer 1–windowSize. No closed-state threshold check before this many window samples. |
| `failureThreshold` | Decimal in (0,1], at most six fractional digits. Open when failures/samples is at least the threshold. Integer cross-products decide exact equality. |
| `cooldownSeconds` | 0–3600 seconds, at most three fractional digits. Converted to integer milliseconds. |
| `cooldownBoundary` | Required `strict-after` (elapsed > wait) or `at-or-after` (elapsed ≥ wait). No hidden boundary choice. |
| `halfOpenProbeLimit` | Integer 1–20. All these sequential probes must succeed to close and clear the closed-state window. |
| `halfOpenPolicy` | Only `any-failure-opens`. Any failed probe immediately reopens and resets the waiting origin. |

`requests` contains 1–180 items. Each has `atSeconds` in 0–86400, at most three
fractional digits, and `downstreamResult` equal to `success`, `failure`, or
`null`. Times are nondecreasing; requests at the same time are processed in
input-array order. Each admitted call completes immediately before the next
request is considered. No concurrency or completion-time inference occurs.

The algorithm first decides whether to admit a request. An admitted request
requires a concrete downstream result; a rejected request requires `null`
because the downstream was not called. Null never becomes success or failure.
If a parameter change would admit an originally rejected request whose result
is missing, the counterfactual calculation is rejected. Supply a separately
declared synthetic scenario rather than inventing that missing outcome.

While open, the next request checks the selected cooldown boundary. An expired
wait changes open to half-open before that request is admitted. A failed
probe may then change half-open back to open on the **same request and same
timestamp**. Ordered event IDs retain both transitions without inventing a
positive duration between them. No background timer transition is produced
without a request. A final incomplete probe cycle remains half-open.

Outputs retain every request's before/admission/after states, actual result,
window sample/failure counts and source request indices, successful probes
counted in the current cycle, ordered transitions and totals. Window and
probe counts are snapshots after that request: closing clears both; an open
or half-open row may retain the most recent closed-state window. Failure
counts are not added to forwarded counts: `forwarded = successful + failed`,
and `total requests = forwarded + rejected`.

## Views and scope

The overview combines the three-state graph, actual policy values, computed
request-state/result strips and event summaries. Equal-width cells are
**request sequence**, not elapsed duration or continuous state occupancy.
Explicit request times appear separately. There are at most 90 cells per
row. The overview lists up to eight event groups and identifies an overflow;
the detail view retains every request and all before/admission/after states,
times, results and counters, including same-request intermediate states.

Change `"view":"overview"` to `"view":"detail"` in the editable input to
open the full record. Detail uses up to three columns of 60 rows; type size
stays fixed and row height follows measured font ascent/descent. No caller
coordinates or hand-edited source positions are accepted. Geometry checks
and actual containment checks do not establish aesthetic approval.

This bounded model has no slow calls, timeouts, concurrent in-flight calls,
exception classification, random downstream generator, real network calls,
distributed coordination, asynchronous probes, background half-open timer,
configuration validation for a library, or production safety guarantee.
It does not infer a policy from outcomes or from guard prose.

## Source 102 and explicit adaptations

`assets/musecore/circuit-breaker-replay.json` uses the illustrative
`102-circuit-breaker` source. Its SVG explicitly supplies a 20-call window,
50% failure threshold, 15-second waiting label, five half-open probes, and
the custom any-failure/all-success rule. Ninety request cells have an
explicit success/failure/rejection color legend. Transcription and direct
counting yield 49 successes, 11 failures and 30 rejections, so 60 were
forwarded. The source prints event labels at 30, 46, 62 and 66 seconds.

The asset separately displays three **adaptation assumptions**: minimum
calls is 20; each graphical request slot's left endpoint is used as its
instantaneous request time; and waiting uses strict-after. The source does
not separately specify these rules. Under these explicit assumptions the
computed outcomes and event labels agree with the supplied picture; that
agreement does not recover or validate the original author's algorithm.
The source does not distribute its random generator or seed value. Its
85% failure-probability description is not used to regenerate outcomes or
to invent downstream results for blocked requests.

The author notes claim the any-failed-probe rule agrees with Resilience4j.
The official [CircuitBreaker documentation](https://resilience4j.readme.io/docs/circuitbreaker),
section *Failure rate and slow call rate thresholds*, instead describes
evaluating the configured failure/slow-call thresholds after permitted
half-open calls complete. Its minimum-call rule and request-triggered versus
automatic half-open distinction are also documented there. This capability
therefore preserves the source rule **as a named custom teaching policy**,
without adopting its equivalence claim.

Original SVG SHA-256:
`57d3e52dc63964e3145802790ed6feaa4ad5918b6b6b44d180f136c1621ac792`.
`compositionReference` denotes composition provenance, not the factual
origin of arbitrary caller inputs. The repository source-hash check skips
only when a standalone Skill has no gallery; source-input facts, independent
arithmetic/transition oracle and production browser checks still execute.

```sh
node scripts/musedraw.mjs core render assets/musecore/circuit-breaker-replay.json --out output/breaker
node --test tests/musecore/breaker-source.test.mjs
```

The independent test oracle recomputes each decision by rescanning immutable
full history and the latest reset/probe-cycle events; it does not use the
product's sliding array, shift or accumulated counters. BigInt comparisons
check thresholds and time boundaries. Hand calculations cover minimum
samples, equality, eviction, reset, zero waiting, same-second order and
unfinished probes. Browser tests additionally inspect actual SVG marks and
text boxes, rather than accepting geometry metadata alone.
