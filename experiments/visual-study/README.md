# Contributor visual-study queue (experimental)

This local, standard-library Python tool divides a large reference manifest among
contributors. It records observations for human review. It does **not** train a
model, automatically establish design expertise, validate scientific results, or
recognize a downloaded image as completed learning.

No server, dependency installation, network request or original-image redistribution
is required. Keep the SQLite database and generated task packages in private local
storage. Public visibility of a reference does not grant permission to redistribute
its image. Do not commit reference packages, private observations or databases.

## Prepare the queue

Use Python 3.10 or newer from this directory. JSONL is streamed in batches of 500;
use it for large imports. Existing JSON arrays or `items`/`cases` manifests up to
16 MiB are also supported. Input `id`/`url` aliases are accepted; any local `path`
field is discarded rather than stored or exported.

```sh
python study_queue.py --db private-study.sqlite3 import manifest.jsonl --domain research
```

Each JSONL line needs the source page, exact image fingerprint and subject domain:

```json
{"caseID":"example-001","sourceURL":"https://example.org/paper/figures/1","sha256":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef","domain":"research","version":1}
```

Importing the same case and content is idempotent. A changed URL, SHA, domain or
version under an existing case ID is rejected. Use a new case ID for a genuinely
different reference version; existing claims and observations remain auditable.
An import error rolls back its current 500-row batch, while earlier committed
batches remain. It is safe to correct the source and rerun.

## Assign a portable batch

```sh
python study_queue.py --db private-study.sqlite3 claim --contributor alice --size 20 --lease-seconds 86400 --domain research --out alice-batch
```

The output contains only `tasks.json` and `observations.template.jsonl`: source
URLs, IDs, SHA256, domain, immutable task version/fingerprint, contributor and
lease token/expiry. No original images, machine paths or title-based generated
observations are included. Protect the lease token like a local work receipt.
This local CLI assumes trusted operators; it is not a public authentication service.

Claims use an SQLite `BEGIN IMMEDIATE` transaction, so simultaneous processes do
not receive the same available task. The default batch is 20; the maximum is 200.
Expired, unsubmitted tasks return to the queue during `claim`, `status` or an
explicit `reclaim`. Submitted observations remain pending review when a lease
expires. Leases may last at most 30 days. If package writing fails after a claim,
the claim still exists and will return on expiry; do not assume it was cancelled.

Contributors who already have authorized local images can check their identity:

```sh
python study_queue.py verify-images alice-batch/tasks.json --image-root local-references
```

This streams file hashes and reports match/missing per case without exporting
local paths. It makes no network request, copies no image, and does not claim
that a matching file has been visually read. Image-root symlinks are skipped.

## Read, describe, submit, review

Actually open every assigned image in an appropriate viewer. Fill each template
line with concrete `visibleEvidence`, `colorRoles`, `transferableMethod`, `limits`,
`judgment`, `method`, and `viewedAt`. Preserve `caseID`, `sha256`, `version` and
`fingerprint`. State unreadable details and resolution limits rather than inventing
them. Include failures and aesthetic counterexamples; a prestigious publication is
not an automatic design endorsement. Do not submit generic text based on titles.

```sh
python study_queue.py --db private-study.sqlite3 submit alice-batch/observations.jsonl --contributor alice --token TOKEN_FROM_TASKS_JSON
python study_queue.py --db private-study.sqlite3 list-submissions --limit 20
python study_queue.py --db private-study.sqlite3 review 1 --reviewer lead --decision approve --note "Checked the source and the observation correspondence."
python study_queue.py --db private-study.sqlite3 status
```

Submissions enter **pending**, never approved automatically. A matching repeat is
idempotent, including after lease expiry; a changed observation conflicts with the
immutable existing record. A first submission with the wrong case/SHA/fingerprint,
wrong owner or expired/returned lease is rejected. A JSONL submit is atomic per
record, so earlier valid rows survive a later error and the file can be retried.
These checks establish assignment provenance, not proof that a human actually
looked at the image. Reviewers must examine that correspondence themselves.

Reviews explicitly approve or reject and require a reviewer plus reason. Conflicting
second reviews are rejected. Rejected tasks remain rejected for audit, not silently
reassigned; approved means accepted observation evidence, **not** a premium case,
scientific validation, transfer-tested method or model learning. `status` reports
available, leased, pending, approved and rejected separately. It does not count
imports, downloads, claims or template preparation as completed learning.

`list-submissions --after ID --limit 20` uses an indexed cursor; it does not load
the whole queue. Claims select at most one batch in SQL. JSONL import and submit
stream rows. The database retains immutable lease history and review records;
regular SQLite backups and adequate local disk remain the operator's responsibility.

## Verification

```sh
python -m unittest discover -s . -p "test_*.py" -v
```

Tests cover independent-process claim races, expiry and stale submissions, metadata
mismatch, idempotency/conflicts, portable exports without images/absolute paths,
review gating, cursor pagination, streamed import and local hash verification.
