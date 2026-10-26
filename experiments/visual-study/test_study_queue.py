import hashlib
import json
import multiprocessing
import tempfile
import time
import unittest
from pathlib import Path

from study_queue import FIELDS, Queue, records, verify_images, write_package


def task(i, sha=None):
    return dict(id=f'N{i:05}', url=f'https://example.org/figures/{i}',
                sha256=sha or hashlib.sha256(str(i).encode()).hexdigest(),
                domain='research', path=str(Path(tempfile.gettempdir()) / 'private-reference' / 'original.png'))


def observation(t):
    result = {k: t[k] for k in ('caseID','sha256','version','fingerprint')}
    result.update(visibleEvidence='Two aligned rows share a time axis; local dashed frames anchor zooms.',
                  colorRoles='Blue identifies sample A in both rows; grey marks the reference.',
                  transferableMethod='Keep condition identity across heterogeneous readouts.',
                  limits='Preview cannot establish numerical accuracy or scientific validity.',
                  judgment='Useful alignment; tiny labels require a larger output.',
                  method='view_image', viewedAt='2026-10-21T01:00:00Z')
    return result


def concurrent_claim(db, name, start, output):
    q = Queue(db)
    start.wait(10)
    result = q.claim(name, size=20)
    output.put([t['caseID'] for t in result['tasks']])
    q.close()


class StudyQueueTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.db = self.root / 'queue.sqlite3'
        self.q = Queue(self.db)

    def tearDown(self):
        self.q.close()
        self.tmp.cleanup()

    def test_manifest_stream_and_duplicate_import(self):
        path = self.root / 'rows.jsonl'
        path.write_text('\n'.join(json.dumps(task(i)) for i in range(1201)), encoding='utf-8')
        self.assertEqual(self.q.import_records(records(path))['added'], 1201)
        self.assertEqual(self.q.import_records(records(path))['duplicate'], 1201)
        conflict = task(0); conflict['sha256'] = 'b' * 64
        with self.assertRaisesRegex(ValueError, 'conflicting immutable'):
            self.q.import_records([conflict])
        self.assertEqual(self.q.status()['total'], 1201)

    def test_concurrent_processes_do_not_share_claims(self):
        self.q.import_records(task(i) for i in range(100))
        ctx = multiprocessing.get_context('spawn')
        start, output = ctx.Event(), ctx.Queue()
        workers = [ctx.Process(target=concurrent_claim, args=(str(self.db), str(i), start, output)) for i in range(4)]
        for worker in workers: worker.start()
        start.set()
        claims = [output.get(timeout=20) for _ in workers]
        for worker in workers:
            worker.join(20)
            self.assertEqual(worker.exitcode, 0)
        self.assertEqual([len(x) for x in claims], [20] * 4)
        self.assertEqual(len(set(sum(claims, []))), 80)

    def test_expiry_returns_only_unsubmitted_tasks_and_rejects_stale_owner(self):
        self.q.import_records([task(1),task(2)])
        now = time.time()
        first = self.q.claim('alice', size=2, seconds=10, now=now)
        self.q.submit(first['lease']['token'], 'alice', [observation(first['tasks'][0])], now=now+1)
        self.assertEqual(self.q.reclaim(now+11)['returned'], 1)
        second = self.q.claim('bob', size=2, now=now+12)
        self.assertEqual(len(second['tasks']), 1)
        with self.assertRaisesRegex(ValueError, 'expired'):
            self.q.submit(first['lease']['token'], 'alice', [observation(first['tasks'][1])], now=now+12)
        self.assertEqual(self.q.status()['states']['pending'], 1)

    def test_submit_is_pending_idempotent_and_review_is_explicit(self):
        self.q.import_records([task(1)])
        package = self.q.claim('alice')
        row = observation(package['tasks'][0])
        token = package['lease']['token']
        self.assertEqual(self.q.submit(token, 'alice', [row])['submittedPendingReview'], 1)
        self.assertEqual(self.q.submit(token, 'alice', [row])['idempotentDuplicates'], 1)
        self.assertEqual(self.q.status()['reviewedAccepted'], 0)
        self.assertEqual(len(self.q.submissions()), 1)
        changed = dict(row, visibleEvidence='Different evidence conflicts.')
        with self.assertRaisesRegex(ValueError, 'conflicting submission'):
            self.q.submit(token, 'alice', [changed])
        submitted = self.q.submissions()[0]['submissionID']
        self.q.review(submitted, 'reviewer', 'approve', 'Checked actual image and observation correspondence.')
        self.assertEqual(self.q.status()['reviewedAccepted'], 1)
        self.assertTrue(self.q.review(submitted, 'reviewer', 'approve', 'Checked actual image and observation correspondence.')['duplicate'])
        with self.assertRaisesRegex(ValueError, 'immutable'):
            self.q.review(submitted, 'reviewer', 'reject', 'Changed decision.')

    def test_hash_version_fingerprint_and_owner_mismatch(self):
        self.q.import_records([task(1)])
        package = self.q.claim('alice')
        good = observation(package['tasks'][0])
        token = package['lease']['token']
        for key, bad in [('sha256','f'*64), ('version',99), ('fingerprint','bad'), ('caseID','absent')]:
            with self.assertRaisesRegex(ValueError, 'mismatch'):
                self.q.submit(token, 'alice', [dict(good, **{key:bad})])
        with self.assertRaisesRegex(ValueError, 'contributor mismatch'):
            self.q.submit(token, 'bob', [good])
        for key in FIELDS:
            with self.assertRaisesRegex(ValueError, 'nonempty'):
                self.q.submit(token, 'alice', [dict(good, **{key:''})])
        self.assertEqual(self.q.status()['states']['leased'], 1)

    def test_portable_package_has_no_original_or_absolute_path(self):
        self.q.import_records([task(1)])
        package = self.q.claim('alice')
        output = self.root / 'portable'
        write_package(package, output)
        self.assertEqual(set(p.name for p in output.iterdir()), {'tasks.json','observations.template.jsonl'})
        text = ''.join(p.read_text(encoding='utf-8') for p in output.iterdir())
        self.assertNotIn(task(1)['path'], text)
        self.assertNotIn(str(self.root), text)
        self.assertNotIn('original.png', text)
        template = list(records(output/'observations.template.jsonl'))[0]
        self.assertEqual(template['visibleEvidence'], '')

    def test_local_image_identity_is_not_learning(self):
        image = self.root / 'reference.png'
        image.write_bytes(b'local-image-test-identity-only')
        sha = hashlib.sha256(image.read_bytes()).hexdigest()
        self.q.import_records([task(1, sha),task(2)])
        package = self.q.claim('alice')
        write_package(package, self.root/'package')
        result = verify_images(self.root/'package/tasks.json', self.root)
        self.assertEqual([x['verified'] for x in result['tasks']], [True,False])
        self.assertEqual(self.q.status()['reviewedAccepted'], 0)

    def test_reject_and_cursor_paging(self):
        self.q.import_records(task(i) for i in range(5))
        package = self.q.claim('alice')
        self.q.submit(package['lease']['token'], 'alice', map(observation, package['tasks']))
        page1 = self.q.submissions(limit=2)
        page2 = self.q.submissions(after=page1[-1]['submissionID'], limit=2)
        self.assertFalse(set(x['submissionID'] for x in page1) & set(x['submissionID'] for x in page2))
        self.q.review(page1[0]['submissionID'], 'reviewer', 'reject', 'Does not describe the source image.')
        self.assertEqual(self.q.status()['reviewedAccepted'], 0)
        self.assertEqual(self.q.status()['states']['rejected'], 1)


if __name__ == '__main__':
    unittest.main()
