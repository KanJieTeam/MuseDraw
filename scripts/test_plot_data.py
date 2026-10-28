import copy
import importlib.util
import json
import math
from pathlib import Path
import struct
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
MODULE = importlib.util.spec_from_file_location('musedraw_plot_data', ROOT/'skills/musedraw/scripts/plot_data.py')
plot = importlib.util.module_from_spec(MODULE)
MODULE.loader.exec_module(plot)
LINE = json.loads((ROOT/'examples/data-line-missing.json').read_text())
INTERVAL = json.loads((ROOT/'examples/data-interval-estimates.json').read_text())
HAS_MATPLOTLIB = importlib.util.find_spec('matplotlib') is not None


class PlotContractTests(unittest.TestCase):
    def test_preserves_measurements_missingness_and_original_input(self):
        original = copy.deepcopy(LINE)
        validated = plot.validate(LINE)
        self.assertEqual(LINE, original)
        self.assertIsNone(validated['series'][0]['points'][1]['y'])
        validated['series'][0]['points'][0]['y'] = 99
        self.assertEqual(LINE, original)

    def test_rejects_wrong_interval_semantics_and_hidden_endpoints(self):
        for mutate in [lambda b: b.pop('intervalLabel'),
                       lambda b: b['rows'][0].update(lower=4),
                       lambda b: b.update(xDomain=[-1, 2]),
                       lambda b: b['rows'][0].update(pValue=.01)]:
            b = copy.deepcopy(INTERVAL)
            mutate(b)
            with self.assertRaises(ValueError):
                plot.validate(b)

    def test_rejects_silent_reordering_zero_imputation_and_unknown_facts(self):
        for mutate in [lambda b: b['series'][0]['points'].reverse(),
                       lambda b: b.update(kind='scatter'),
                       lambda b: b.update(yDomain=[1, 2]),
                       lambda b: b['series'][0]['points'][0].update(y=True),
                       lambda b: b['series'][0]['points'][0].update(y=float('nan')),
                       lambda b: b['series'][0].update(sampleSize=20)]:
            b = copy.deepcopy(LINE)
            mutate(b)
            with self.assertRaises(ValueError):
                plot.validate(b)

    def test_bar_requires_exact_category_values_and_zero_baseline(self):
        b = {'kind':'bar','xLabel':'Group','yLabel':'Change / h','categories':['A','B'],
             'series':[{'name':'Observed','values':[2,-3]}]}
        self.assertEqual(plot.validate(b), b)
        for mutate in [lambda c: c.update(yDomain=[1,3]),
                       lambda c: c['series'][0].update(values=[2]),
                       lambda c: c.update(categories=['A','A'])]:
            c=copy.deepcopy(b)
            mutate(c)
            with self.assertRaises(ValueError):
                plot.validate(c)


@unittest.skipUnless(HAS_MATPLOTLIB, 'Matplotlib rendering is a separate optional capability')
class PlotRenderingTests(unittest.TestCase):
    def tearDown(self):
        from matplotlib import pyplot as plt
        plt.close('all')

    def test_actual_line_retains_irregular_time_and_a_real_gap(self):
        fig, ax, _ = plot.build_figure(LINE)
        x, y = ax.lines[0].get_data()
        self.assertEqual(list(x), [0,2,6,10])
        self.assertTrue(math.isnan(y[1]))
        self.assertEqual(y[2], 2.1)
        self.assertEqual(len(ax.lines), 2)

    def test_asymmetric_interval_uses_true_endpoints(self):
        fig, ax, _ = plot.build_figure(INTERVAL)
        segments = ax.containers[0].lines[2][0].get_segments()
        self.assertAlmostEqual(segments[0][0][0], -2.0)
        self.assertAlmostEqual(segments[0][1][0], -.3)
        self.assertEqual([p[1] for p in segments[0]], [0,0])

    def test_scatter_is_unconnected_and_bars_keep_negative_direction(self):
        scatter=copy.deepcopy(LINE)
        scatter['kind']='scatter'
        scatter['series'][0]['points'][1]['y']=.9
        _, ax, _ = plot.build_figure(scatter)
        self.assertEqual(len(ax.lines), 0)
        self.assertEqual(len(ax.collections), 2)
        _, ax, _ = plot.build_figure({'kind':'bar','xLabel':'Group','yLabel':'Change / h',
            'categories':['A','B'],'series':[{'name':'Observed','values':[2,-3]}]})
        self.assertEqual([p.get_y() for p in ax.patches], [0,0])
        self.assertEqual([p.get_height() for p in ax.patches], [2,-3])
        self.assertLess(ax.get_ylim()[0], 0)
        self.assertGreater(ax.get_ylim()[1], 0)

    def test_real_png_dimensions_live_svg_text_and_kept_data(self):
        with tempfile.TemporaryDirectory() as folder:
            out=Path(folder)
            checks=plot.export(INTERVAL,out,1800,1100)
            self.assertTrue(checks['passed'], checks)
            png=(out/'figure.png').read_bytes()
            self.assertEqual(struct.unpack('>II',png[16:24]), (1800,1100))
            self.assertIn('<text', (out/'figure.svg').read_text(encoding='utf-8'))
            import xml.etree.ElementTree as ET
            root=ET.parse(out/'figure.svg').getroot()
            self.assertEqual((root.attrib['width'],root.attrib['height']),('1800px','1100px'))
            self.assertNotIn('<!DOCTYPE', (out/'figure.svg').read_text(encoding='utf-8'))
            self.assertEqual(json.loads((out/'data.json').read_text()), INTERVAL)


if __name__ == '__main__':
    unittest.main()
