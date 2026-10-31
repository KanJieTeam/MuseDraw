# Source priority policy text

`cap2-office-priority-source.json` supplies o02's complete3x3 policy matrix and all four given response/recovery/resolution targets and employee examples to the existing `service-priority` family. No production module or guard is required.

Keep the terms distinct: P1/P2 say recovery, P3 says resolution, and P4 says completion. Workday wording stays literal; no calendar date, elapsed-hour conversion or work calendar is inferred. These are source example targets, not universal ITIL standards or commitments.

No source example supplies a complete pair of impact/urgency input IDs. The examples therefore stay inside their source priority action text. `tickets:[]` explicitly says this input contains no requests to classify; displayed zero counts refer to that supplied list, not real-world observations or an absence of incidents. The note discloses this scope. New real requests need explicit caller-supplied impact and urgency IDs.

Run `node scripts/musedraw.mjs core render assets/musecore/cap2-office-priority-source.json --out output/priority-source`. Tests: `node --test tests/musecore/cap2-office-priority-source.test.mjs`. Optional `MUSECORE_NOTO_FONT` and `MUSECORE_CAP2_PRIORITY_OUTPUT` select a local font and evidence directory. Verification covers the independent literal matrix, all original time/example phrases, all9actual SVG cells, changed given policy text and tickets, invalid references, measured text in policy boxes at ascent0/+40, and unchanged ordinary default SVG. This is an input adaptation, not a source-layout reproduction or aesthetic approval.
