# Historical newspaper and invention chronology

`history-newspaper` uses a newspaper hierarchy and dated event column. `invention-timeline` uses a shared linear year axis with machine-type illustrations. Choose by the reader's task, not merely a preference for paper texture.

- Defaults: `assets/musecore/history-newspaper.json`, `assets/musecore/invention-timeline.json`.
- Catalogue mode resolves named events against a finite sourced catalogue. Supplied-record mode is explicit; it does not certify the author's historical claims.
- The newspaper computes elapsed Gregorian days between declared events, excluding the start date. Context and interpretation panels retain their declared source references and roles.
- The invention axis preserves numerical year positions. Same-year events retain the same time coordinate; measured labels may occupy separate tracks with connecting leaders.
- Machine forms illustrate types and are not scale drawings, performance measurements or engineering reconstructions. Missing causal connections remain absent.
- The defaults distinguish the 1764 spinning jenny and the 1769 separate-condenser patent. They do not inherit the source image's questionable dates or manufacture causal/effectiveness claims to fill space.
- Reject invalid catalogue IDs, dates, relations or overflow. Do not move an event's year to improve spacing or treat chronological order alone as causation.

Use normal core rendering, retaining the input and source references. Inspect the page at its intended display size. These are development compositions, not a complete historical account or independent aesthetic proof.
