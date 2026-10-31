# Seven-step source procedures

These two inputs use the existing `pathway-map` renderer. No additional family,
production adapter, bundle entry or guard is required.

```sh
node scripts/musedraw.mjs core render assets/musecore/cap2-office-seal-process-source.json --out output/seal-source
node scripts/musedraw.mjs core render assets/musecore/cap2-office-departure-process-source.json --out output/departure-source
node --test tests/musecore/cap2-office-procedure-source.test.mjs
```

The composition is one explicitly directed route with seven stations and six
given consecutive segments. All seven labels, supplied responsibilities,
station notes, route explanations and full policy text remain editable input.
The displayed spacing does not encode time. The source fixtures retain example
policy statements; they are not actual applications or employment records.

The seal input transcribes the seven steps and three rules of
`o05-yongyin-shenpi`. Contract documents require legal review in that source. The
source does not supply a non-contract bypass or return target; neither is
invented. Step 6 retains the example stamp annotation as text rather than
purporting to reproduce an authorized seal.

The departure input transcribes the seven steps of `o10-lizhi-jiaojie`, including
multi-party responsibility labels and original deadlines. Its arrows preserve
the source display order; they do not make wage payment or issuance of a
certificate conditional on completion of preceding tasks. There are no invented
receivers, completion statuses, dates or personal deadlines.

The source's 30-day statement needs scope: Article 37 also provides three-day
notice during probation. Article 50 describes the termination certificate and
15-day archive/social-insurance transfer; Article 9 of the wage-payment rules
describes settlement upon lawful termination. These distinctions are explicit
annotations rather than calculations or a complete employment-law procedure.
Primary references: [Labour Contract Law, Articles 37 and 50](https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/bgt/art/2023/art_0abfdd261c03417b949df19d869add8d.html),
[Interim Wage Payment Provisions](https://rsj.sh.gov.cn/trlzyhshbzbgz_17256/20200617/t0035_1388318.html).

Provenance and composition references are separate. The actual source subjects
for these inputs are o05/o10. The existing renderer's fixed geometry metadata
`sourceCases` names `114-observability-metro` and `o06-xiansuo-huikuan`; that is a
pre-existing family composition reference, not provenance for this content.
This input-only addition does not change that shared field or move any source
claim. The original SVG, author notes and PNG remain audit evidence, not newly
redistributed illustrations.

The test independently walks literal consecutive edges, checks all source labels
and responsibility/rule phrases, and confirms that a missing segment stays a
gap with an unreachable query. Unsupported statuses/receivers, duplicate IDs,
loops, unknown stations and nonconsecutive or reversed edges are rejected.
Real browser checks cover full text, station identities, direction, audit
findings and actual text containment under normal and +40 ascent pressure.
Set `MUSECORE_NOTO_FONT` to an available Noto Sans SC font and
`MUSECORE_CAP2_PROCEDURE_OUTPUT` to an evidence directory to save inputs, SVGs,
checks and PNGs. Oversized notes explicitly fail rather than truncate. A changed
caller procedure also renders; passing tests is not aesthetic approval.
