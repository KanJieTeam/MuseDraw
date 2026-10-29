"""Regression checks for factual changes in the three office compositions."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / 'skills/musedraw/scripts'
sys.path.insert(0, str(SCRIPTS))
module = importlib.util.spec_from_file_location('office_report', SCRIPTS / 'build_office_report.py')
report = importlib.util.module_from_spec(module)
module.loader.exec_module(report)
ASSETS = ROOT / 'skills/musedraw/assets/visual-language'


class OfficeReportTests(unittest.TestCase):
    def load(self, name):
        return json.loads((ASSETS / ('office-' + name) / 'data.json').read_text(encoding='utf-8'))

    def render(self, spec):
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / 'report'
            report.build(spec, out)
            self.assertEqual(json.loads((out / 'data.json').read_text(encoding='utf-8')), spec)
            return ((out / 'index.html').read_text(encoding='utf-8'),
                    json.loads((out / 'derived.json').read_text(encoding='utf-8')))

    def test_income_cost_changes_recompute_signed_rates(self):
        spec = self.load('business')
        spec.update(months=['七月','八月','九月'], revenue=[70,80,90], cost=[95,84,81])
        document, result = self.render(spec)
        self.assertEqual(result['surplus'], [-25,-4,9])
        self.assertAlmostEqual(result['last_change_pp'], 15)
        self.assertIn('+15.0', document)
        self.assertIn('3个月收入', document)

    def test_undefined_rate_and_incomplete_costs_are_rejected(self):
        spec = self.load('business')
        spec['revenue'][0] = 0
        with self.assertRaisesRegex(ValueError, 'zero income'):
            report.validate(spec)
        spec = self.load('business')
        spec['cost'].pop()
        with self.assertRaisesRegex(ValueError, 'complete nonnegative'):
            report.validate(spec)

    def test_weighted_completion_is_distinct_from_milestone_count(self):
        spec = self.load('project')
        spec['asOf'] = '2026-10-25'
        spec['work'][1]['completion'] = .5
        document, result = self.render(spec)
        self.assertEqual(result['earned_weight_pct'], 37.5)
        self.assertEqual(result['completed_milestones'], 2)
        self.assertEqual(result['overdue_unfinished'], ['现场验证'])
        self.assertIsNone(spec['milestones'][2]['actual'])
        self.assertIn('尚未完成', document)

    def test_future_completion_is_rejected(self):
        spec = self.load('project')
        spec['milestones'][2]['actual'] = '2026-10-21'
        with self.assertRaisesRegex(ValueError, 'after the status date'):
            report.validate(spec)

    def test_mixed_paired_changes_preserve_order_and_zero(self):
        spec = self.load('research')
        for row, after in zip(spec['rows'], [.60,.82,.96,.50,1.10,.88]):
            row['after'] = after
        _, result = self.render(spec)
        self.assertEqual(result['increase_count'], 2)
        for actual, expected in zip(result['changes'], [-.16,0,.06,-.19,.26,0]):
            self.assertAlmostEqual(actual, expected)
        self.assertAlmostEqual(result['range'][0], -.19)

    def test_duplicate_pair_ids_and_nonfinite_values_are_rejected(self):
        spec = self.load('research')
        spec['rows'][1]['id'] = spec['rows'][0]['id']
        with self.assertRaisesRegex(ValueError, 'uniquely identified'):
            report.validate(spec)
        spec = self.load('research')
        spec['rows'][0]['after'] = float('nan')
        with self.assertRaisesRegex(ValueError, 'finite nonnegative'):
            report.validate(spec)

    def test_editable_text_is_escaped_and_existing_output_is_preserved(self):
        spec = self.load('business')
        spec['title'] = ['<em>新主题</em>']
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / 'report'
            report.build(spec, out)
            self.assertIn('&lt;em&gt;', (out / 'index.html').read_text(encoding='utf-8'))
            with self.assertRaises(FileExistsError):
                report.build(spec, out)
            self.assertEqual(json.loads((out / 'data.json').read_text(encoding='utf-8')), spec)


if __name__ == '__main__':
    unittest.main()
