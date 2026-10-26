#!/usr/bin/env python3
"""Portable, review-gated visual-study queue. Python standard library only."""
import argparse
import hashlib
import json
import re
import secrets
import sqlite3
import sys
import time
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlsplit

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
 case_id TEXT PRIMARY KEY, source_url TEXT NOT NULL, sha256 TEXT NOT NULL,
 domain TEXT NOT NULL, version INTEGER NOT NULL, fingerprint TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'available', lease_token TEXT, created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_claim ON tasks(state, domain, case_id);
CREATE INDEX IF NOT EXISTS tasks_lease ON tasks(lease_token, state);
CREATE TABLE IF NOT EXISTS leases (
 token TEXT PRIMARY KEY, contributor TEXT NOT NULL, created_at REAL NOT NULL,
 expires_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS leases_expiry ON leases(expires_at);
CREATE TABLE IF NOT EXISTS lease_items (
 token TEXT NOT NULL REFERENCES leases(token), case_id TEXT NOT NULL REFERENCES tasks(case_id),
 version INTEGER NOT NULL, fingerprint TEXT NOT NULL, PRIMARY KEY(token, case_id)
);
CREATE TABLE IF NOT EXISTS submissions (
 submission_id INTEGER PRIMARY KEY, case_id TEXT NOT NULL REFERENCES tasks(case_id),
 version INTEGER NOT NULL, fingerprint TEXT NOT NULL, contributor TEXT NOT NULL,
 token TEXT NOT NULL REFERENCES leases(token), content_hash TEXT NOT NULL,
 record_json TEXT NOT NULL, submitted_at REAL NOT NULL,
 review_state TEXT NOT NULL DEFAULT 'pending', reviewer TEXT, review_note TEXT, reviewed_at REAL,
 UNIQUE(case_id, version, fingerprint, contributor)
);
CREATE INDEX IF NOT EXISTS submissions_review ON submissions(review_state, submission_id);
"""
FIELDS = ('visibleEvidence', 'colorRoles', 'transferableMethod', 'limits',
          'judgment', 'method', 'viewedAt')


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def digest(value):
    return hashlib.sha256(canonical(value).encode('utf-8')).hexdigest()


def records(path):
    """JSONL streams; small existing JSON manifests are a compatibility input."""
    path = Path(path)
    if path.suffix.lower() == '.jsonl':
        with path.open(encoding='utf-8-sig') as f:
            for line in f:
                if line.strip():
                    yield json.loads(line)
        return
    if path.stat().st_size > 16 * 1024 * 1024:
        raise ValueError('Large imports must use streaming JSONL (JSON limit: 16 MiB).')
    data = json.loads(path.read_text(encoding='utf-8-sig'))
    if isinstance(data, dict):
        data = data.get('items', data.get('cases'))
    if not isinstance(data, list):
        raise ValueError('Expected JSONL objects, a JSON array, or an items/cases manifest.')
    yield from data


def task_record(row, default_domain):
    case_id = str(row.get('caseID', row.get('id', '')))
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,127}', case_id):
        raise ValueError('caseID must be a portable identifier, never a local path.')
    sha = str(row.get('sha256', row.get('imageSHA256', ''))).lower()
    if not re.fullmatch(r'[0-9a-f]{64}', sha):
        raise ValueError(f'{case_id}: missing or invalid image SHA256.')
    url = str(row.get('sourceURL', row.get('url', '')))
    parsed = urlsplit(url)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError(f'{case_id}: sourceURL must be a credential-free HTTP(S) URL.')
    domain = str(row.get('domain', row.get('category', default_domain)) or '').strip()
    if not domain or len(domain) > 128:
        raise ValueError(f'{case_id}: domain is required (or supply --domain).')
    version = row.get('version', 1)
    if not isinstance(version, int) or isinstance(version, bool) or version < 1:
        raise ValueError(f'{case_id}: version must be a positive integer.')
    task = dict(caseID=case_id, sourceURL=url, sha256=sha, domain=domain, version=version)
    task['fingerprint'] = digest(task)
    return task


class Queue:
    def __init__(self, path):
        self.db = sqlite3.connect(path, timeout=30, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute('PRAGMA foreign_keys=ON')
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.executescript(SCHEMA)

    def close(self):
        self.db.close()

    @contextmanager
    def transaction(self):
        self.db.execute('BEGIN IMMEDIATE')
        try:
            yield
        except BaseException:
            self.db.execute('ROLLBACK')
            raise
        else:
            self.db.execute('COMMIT')

    def import_records(self, source, domain=None):
        added = duplicate = 0
        # Short bounded transactions keep claims responsive during a million-row import.
        batch = []
        def flush():
            nonlocal added, duplicate
            with self.transaction():
                for task in batch:
                    old = self.db.execute('SELECT fingerprint FROM tasks WHERE case_id=?',
                                          (task['caseID'],)).fetchone()
                    if old:
                        if old['fingerprint'] != task['fingerprint']:
                            raise ValueError(f"{task['caseID']}: conflicting immutable task; use a new caseID.")
                        duplicate += 1
                        continue
                    self.db.execute('INSERT INTO tasks(case_id,source_url,sha256,domain,version,fingerprint,created_at) VALUES(?,?,?,?,?,?,?)',
                                    (task['caseID'], task['sourceURL'], task['sha256'], task['domain'],
                                     task['version'], task['fingerprint'], time.time()))
                    added += 1
        for row in source:
            batch.append(task_record(row, domain))
            if len(batch) == 500:
                flush()
                batch.clear()
        if batch:
            flush()
        return dict(added=added, duplicate=duplicate)

    def _expire(self, now):
        return self.db.execute("UPDATE tasks SET state='available',lease_token=NULL WHERE state='leased' AND lease_token IN (SELECT token FROM leases WHERE expires_at<=?)", (now,)).rowcount

    def reclaim(self, now=None):
        with self.transaction():
            count = self._expire(time.time() if now is None else now)
        return dict(returned=count)

    def claim(self, contributor, size=20, seconds=86400, domain=None, now=None):
        if not contributor.strip() or len(contributor) > 128:
            raise ValueError('A nonempty contributor name (max 128 chars) is required.')
        if not 1 <= size <= 200 or not 1 <= seconds <= 30 * 86400:
            raise ValueError('Batch size: 1–200; lease: 1–2592000 seconds.')
        now = time.time() if now is None else now
        with self.transaction():
            self._expire(now)
            query = "SELECT * FROM tasks WHERE state='available'"
            args = []
            if domain:
                query += ' AND domain=?'
                args.append(domain)
            query += ' ORDER BY case_id LIMIT ?'
            args.append(size)
            rows = self.db.execute(query, args).fetchall()
            if not rows:
                return dict(formatVersion=1, contributor=contributor, tasks=[], lease=None)
            token = secrets.token_hex(24)
            self.db.execute('INSERT INTO leases VALUES(?,?,?,?)', (token, contributor, now, now + seconds))
            for row in rows:
                self.db.execute("UPDATE tasks SET state='leased',lease_token=? WHERE case_id=? AND state='available'", (token, row['case_id']))
                self.db.execute('INSERT INTO lease_items VALUES(?,?,?,?)', (token, row['case_id'], row['version'], row['fingerprint']))
            tasks = [dict(caseID=r['case_id'], sourceURL=r['source_url'], sha256=r['sha256'],
                          domain=r['domain'], version=r['version'], fingerprint=r['fingerprint']) for r in rows]
            return dict(formatVersion=1, contributor=contributor, lease=dict(token=token, expiresAt=now + seconds),
                        tasks=tasks, policy='Local reference only; no original images bundled. Submissions require human review.')

    def submit(self, token, contributor, source, now=None):
        now = time.time() if now is None else now
        added = duplicate = 0
        # Per-record atomicity deliberately permits resuming a partially accepted JSONL file.
        for raw in source:
            case_id = str(raw.get('caseID', ''))
            record = {key: raw.get(key) for key in ('caseID', 'sha256', 'version', 'fingerprint', *FIELDS)}
            if not all(isinstance(record[key], str) and record[key].strip() for key in FIELDS):
                raise ValueError(f'{case_id}: all observation fields must be concrete nonempty strings.')
            content_hash = digest(record)
            with self.transaction():
                lease = self.db.execute('SELECT * FROM leases WHERE token=?', (token,)).fetchone()
                if not lease or lease['contributor'] != contributor:
                    raise ValueError('Unknown lease or contributor mismatch.')
                task = self.db.execute('SELECT * FROM tasks WHERE case_id=?', (case_id,)).fetchone()
                item = self.db.execute('SELECT * FROM lease_items WHERE token=? AND case_id=?', (token, case_id)).fetchone()
                if not task or not item or any(record[k] != task[col] for k, col in [('sha256','sha256'), ('version','version'), ('fingerprint','fingerprint')]):
                    raise ValueError(f'{case_id}: task, SHA256, version or fingerprint mismatch.')
                old = self.db.execute('SELECT * FROM submissions WHERE case_id=? AND version=? AND fingerprint=? AND contributor=?',
                                      (case_id, task['version'], task['fingerprint'], contributor)).fetchone()
                if old:
                    if old['content_hash'] != content_hash:
                        raise ValueError(f'{case_id}: conflicting submission; existing evidence is immutable.')
                    duplicate += 1
                    continue
                if lease['expires_at'] <= now or task['state'] != 'leased' or task['lease_token'] != token:
                    raise ValueError(f'{case_id}: expired, returned or no longer active lease; claim again.')
                self.db.execute('INSERT INTO submissions(case_id,version,fingerprint,contributor,token,content_hash,record_json,submitted_at) VALUES(?,?,?,?,?,?,?,?)',
                                (case_id, task['version'], task['fingerprint'], contributor, token,
                                 content_hash, canonical(record), now))
                self.db.execute("UPDATE tasks SET state='pending' WHERE case_id=?", (case_id,))
                added += 1
        return dict(submittedPendingReview=added, idempotentDuplicates=duplicate, approvedByThisCommand=0)

    def review(self, submission_id, reviewer, decision, note, now=None):
        if decision not in ('approve', 'reject') or not reviewer.strip() or not note.strip():
            raise ValueError('Review needs approve/reject, a reviewer and a concrete note.')
        state = 'approved' if decision == 'approve' else 'rejected'
        with self.transaction():
            row = self.db.execute('SELECT * FROM submissions WHERE submission_id=?', (submission_id,)).fetchone()
            if not row:
                raise ValueError('Unknown submission ID.')
            if row['review_state'] != 'pending':
                if row['review_state'] == state and row['reviewer'] == reviewer and row['review_note'] == note:
                    return dict(submissionID=submission_id, state=state, duplicate=True)
                raise ValueError('Review is immutable; conflicting review rejected.')
            self.db.execute('UPDATE submissions SET review_state=?,reviewer=?,review_note=?,reviewed_at=? WHERE submission_id=?',
                            (state, reviewer, note, time.time() if now is None else now, submission_id))
            self.db.execute('UPDATE tasks SET state=?,lease_token=NULL WHERE case_id=?',
                            (state, row['case_id']))
        return dict(submissionID=submission_id, state=state, duplicate=False)

    def status(self):
        self.reclaim()
        counts = {r['state']: r['n'] for r in self.db.execute('SELECT state,COUNT(*) n FROM tasks GROUP BY state')}
        return dict(total=sum(counts.values()), states=counts,
                    reviewedAccepted=counts.get('approved', 0),
                    note='Available, leased and pending tasks are NOT completed learning; approved means reviewer-accepted evidence, never automatic premium status.')

    def submissions(self, after=0, limit=20, state='pending'):
        if not 1 <= limit <= 200:
            raise ValueError('Page size must be 1–200.')
        rows = self.db.execute('SELECT submission_id,contributor,review_state,record_json FROM submissions WHERE submission_id>? AND review_state=? ORDER BY submission_id LIMIT ?', (after, state, limit))
        return [dict(submissionID=r['submission_id'], contributor=r['contributor'],
                     reviewState=r['review_state'], observation=json.loads(r['record_json'])) for r in rows]


def write_package(package, output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    (output / 'tasks.json').write_text(json.dumps(package, ensure_ascii=False, indent=2), encoding='utf-8')
    with (output / 'observations.template.jsonl').open('w', encoding='utf-8') as f:
        for task in package['tasks']:
            row = {k: task[k] for k in ('caseID', 'sha256', 'version', 'fingerprint')}
            row.update({key: '' for key in FIELDS})
            f.write(canonical(row) + '\n')


def verify_images(package_path, image_root):
    package = json.loads(Path(package_path).read_text(encoding='utf-8'))
    needed = {t['sha256'] for t in package['tasks']}
    found = set()
    root = Path(image_root).resolve(strict=True)
    for path in root.rglob('*'):
        if not path.is_file() or path.is_symlink() or path.suffix.lower() not in ('.png','.jpg','.jpeg','.webp','.gif','.tif','.tiff','.svg'):
            continue
        sha = hashlib.sha256()
        with path.open('rb') as f:
            for block in iter(lambda: f.read(1024 * 1024), b''):
                sha.update(block)
        if sha.hexdigest() in needed:
            found.add(sha.hexdigest())
        if found == needed:
            break
    return dict(tasks=[dict(caseID=t['caseID'], sha256=t['sha256'], verified=t['sha256'] in found) for t in package['tasks']],
                note='Hash verification confirms file identity only; it does not prove visual reading or rights to redistribute.')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', default='study.sqlite3')
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('import'); p.add_argument('manifest'); p.add_argument('--domain')
    p = sub.add_parser('claim'); p.add_argument('--contributor', required=True); p.add_argument('--size', type=int, default=20); p.add_argument('--lease-seconds', type=int, default=86400); p.add_argument('--domain'); p.add_argument('--out', required=True)
    p = sub.add_parser('submit'); p.add_argument('observations'); p.add_argument('--token', required=True); p.add_argument('--contributor', required=True)
    p = sub.add_parser('review'); p.add_argument('submission_id', type=int); p.add_argument('--reviewer', required=True); p.add_argument('--decision', choices=['approve','reject'], required=True); p.add_argument('--note', required=True)
    p = sub.add_parser('list-submissions'); p.add_argument('--after', type=int, default=0); p.add_argument('--limit', type=int, default=20); p.add_argument('--state', choices=['pending','approved','rejected'], default='pending')
    sub.add_parser('status'); sub.add_parser('reclaim')
    p = sub.add_parser('verify-images'); p.add_argument('package'); p.add_argument('--image-root', required=True)
    args = parser.parse_args(argv)
    queue = None
    try:
        if args.command == 'verify-images':
            result = verify_images(args.package, args.image_root)
        else:
            queue = Queue(args.db)
            if args.command == 'import': result = queue.import_records(records(args.manifest), args.domain)
            elif args.command == 'claim':
                result = queue.claim(args.contributor, args.size, args.lease_seconds, args.domain)
                write_package(result, args.out)
            elif args.command == 'submit': result = queue.submit(args.token, args.contributor, records(args.observations))
            elif args.command == 'review': result = queue.review(args.submission_id, args.reviewer, args.decision, args.note)
            elif args.command == 'list-submissions': result = queue.submissions(args.after, args.limit, args.state)
            elif args.command == 'status': result = queue.status()
            elif args.command == 'reclaim': result = queue.reclaim()
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (ValueError, OSError, sqlite3.Error) as exc:
        print(f'Error: {exc}', file=sys.stderr)
        return 2
    finally:
        if queue: queue.close()


if __name__ == '__main__':
    raise SystemExit(main())
