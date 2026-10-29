"""Data integrity during expressive report composition; not a taste score."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from check import svg_dimensions, png_dimensions

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / 'skills/musedraw/scripts'
sys.path.insert(0, str(SCRIPTS))
module_spec = importlib.util.spec_from_file_location('visual_report', SCRIPTS / 'build_visual_report.py')
report = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(report)
ASSETS = ROOT / 'skills/musedraw/assets/visual-language'


class VisualReportTests(unittest.TestCase):
    def load(self, case):
        return json.loads((ASSETS / case / 'data.json').read_text(encoding='utf-8'))

    def test_peak_times_are_recomputed_from_different_observation_spacing(self):
        spec = self.load('riso-report')
        for series, values in zip(spec['series'], ([10, 50, 20], [5, 15, 70])):
            series['points'] = [dict(x=x, y=y) for x, y in zip([9, 12, 18], values)]
        _, result = report.analyse(spec)
        self.assertEqual(result['peak_time_gap'], 6)
        self.assertEqual([p['times'] for p in result['peaks']], [[12], [18]])

    def test_growth_is_not_presented_as_a_reduction(self):
        spec = self.load('ink-report')
        for series, values in zip(spec['series'], ([0, 40, 0], [0, 80, 0])):
            series['points'] = [dict(x=x, y=y) for x, y in zip([0, 10, 20], values)]
        _, values = report.analyse(spec)
        self.assertEqual(values['relative_peak_change_pct'], 100)
        theme = json.loads((ROOT / 'skills/musedraw/themes/ink-wash.json').read_text(encoding='utf-8'))
        text = report.document(spec, values, theme)
        self.assertIn('+100.0', text)
        self.assertNotIn('降低', text)

    def test_missing_values_and_mismatched_windows_do_not_get_summaries(self):
        spec = self.load('riso-report')
        spec['series'][0]['points'][0]['y'] = None
        with self.assertRaisesRegex(ValueError, 'complete nonnegative'):
            report.analyse(spec)
        spec = self.load('riso-report')
        spec['series'][0]['points'][0]['x'] = 8.5
        with self.assertRaisesRegex(ValueError, 'share supplied'):
            report.analyse(spec)

    def test_plateau_has_no_invented_unique_peak_time(self):
        spec = self.load('riso-report')
        spec['series'][0]['points'][9]['y'] = 57
        with self.assertRaisesRegex(ValueError, 'unique peak'):
            report.analyse(spec)
        spec = self.load('ink-report')
        spec['series'][1]['points'][4]['y'] = 36
        _, values = report.analyse(spec)
        self.assertEqual(values['peaks'][1]['times'], [30, 40])

    def test_zero_reference_has_no_relative_change(self):
        spec = self.load('ink-report')
        for point in spec['series'][0]['points']:
            point['y'] = 0
        with self.assertRaisesRegex(ValueError, 'positive reference'):
            report.analyse(spec)

    def test_ink_layers_leave_actual_data_line_coordinates_unchanged(self):
        spec = self.load('riso-report')
        data, _ = report.analyse(spec)
        original = copy.deepcopy(data)
        theme = json.loads((ROOT / 'skills/musedraw/themes/riso.json').read_text(encoding='utf-8'))
        figures = []
        original_build = report.build_figure

        def capture(*args, **kwargs):
            result = original_build(*args, **kwargs)
            figures.append(result)
            return result

        with tempfile.TemporaryDirectory() as temp, patch.object(report, 'build_figure', side_effect=capture):
            report.chart(data, theme, Path(temp), 'rhythm-report')
        self.assertEqual(data, original)
        for line, series in zip(figures[0][1].lines, original['series']):
            self.assertEqual(list(line.get_xdata()), [p['x'] for p in series['points']])
            self.assertEqual(list(line.get_ydata()), [p['y'] for p in series['points']])

    def test_build_keeps_source_data_and_refuses_to_overwrite(self):
        spec = self.load('riso-report')
        spec['title'] = ['<em>另一个主题</em>']
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / 'report'
            report.build(spec, out, ASSETS / 'riso-report')
            self.assertEqual(json.loads((out / 'data.json').read_text(encoding='utf-8')), spec)
            self.assertIn('&lt;em&gt;', (out / 'index.html').read_text(encoding='utf-8'))
            svg = (out / 'chart.svg').read_text(encoding='utf-8')
            self.assertEqual(svg_dimensions(svg), png_dimensions((out / 'chart.png').read_bytes()))
            self.assertIn('<text', svg)
            (out / 'user.txt').write_text('keep')
            with self.assertRaises(FileExistsError):
                report.build(spec, out, ASSETS / 'riso-report')
            self.assertEqual((out / 'user.txt').read_text(), 'keep')


if __name__ == '__main__':
    unittest.main()
