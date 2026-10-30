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
LINE = json.loads((ROOT/'examples/data-line-missing.json').read_text(encoding='utf-8'))
INTERVAL = json.loads((ROOT/'examples/data-interval-estimates.json').read_text(encoding='utf-8'))
HEATMAP = json.loads((ROOT/'examples/data-heatmap-missing.json').read_text(encoding='utf-8'))
PAIRED = json.loads((ROOT/'examples/data-paired-observations.json').read_text(encoding='utf-8'))
OBSERVATIONS = json.loads((ROOT/'examples/data-observed-distribution.json').read_text(encoding='utf-8'))
HAS_MATPLOTLIB = importlib.util.find_spec('matplotlib') is not None


class PlotContractTests(unittest.TestCase):
    def test_linux_noto_collection_is_not_ignored_for_latin_only_fallback(self):
        self.assertEqual(plot.choose_plot_font({'Noto Sans CJK JP', 'DejaVu Sans'}),
                         'Noto Sans CJK JP')
        self.assertEqual(plot.choose_plot_font({'Noto Sans CJK SC', 'Noto Sans CJK JP'}),
                         'Noto Sans CJK SC')
        self.assertEqual(plot.choose_plot_font({'WenQuanYi Zen Hei', 'DejaVu Sans'}),
                         'WenQuanYi Zen Hei')
        self.assertEqual(plot.choose_plot_font({'Microsoft YaHei', 'DejaVu Sans'}),
                         'Microsoft YaHei')
        self.assertEqual(plot.choose_plot_font({'DejaVu Sans'}), 'DejaVu Sans')
        self.assertEqual(plot.choose_plot_font({'DejaVu Sans', 'Noto Sans CJK JP'}, 'DejaVu Sans'),
                         'DejaVu Sans')
        with self.assertRaisesRegex(ValueError, 'not installed'):
            plot.choose_plot_font({'DejaVu Sans'}, 'Missing font')

    def test_raw_observations_do_not_accept_missing_values_or_hide_extremes(self):
        self.assertEqual(plot.validate(OBSERVATIONS), OBSERVATIONS)
        for mutate in [lambda b: b['series'][0]['values'].append(None),
                       lambda b: b.update(yDomain=[0,10]),
                       lambda b: b.update(xDomain=[0,2]),
                       lambda b: b['series'][0].update(mean=6)]:
            b=copy.deepcopy(OBSERVATIONS)
            mutate(b)
            with self.assertRaises(ValueError):
                plot.validate(b)

    def test_pairs_require_identities_and_both_original_measurements(self):
        self.assertEqual(plot.validate(PAIRED), PAIRED)
        for mutate in [lambda b: b['rows'][0].update(after=None),
                       lambda b: b['rows'][1].update(id='P01'),
                       lambda b: b.update(conditions=['Before', 'Before']),
                       lambda b: b.update(xDomain=[8,14]),
                       lambda b: b['rows'][0].update(pValue=.01),
                       lambda b: b.update(yLabel='Different units')]:
            b=copy.deepcopy(PAIRED)
            mutate(b)
            with self.assertRaises(ValueError):
                plot.validate(b)

    def test_heatmap_requires_explicit_cells_common_scale_and_missing_meaning(self):
        self.assertEqual(plot.validate(HEATMAP), HEATMAP)
        for mutate in [lambda b: b.pop('missingLabel'),
                       lambda b: b['values'][0].pop(),
                       lambda b: b.update(colorDomain=[1, 6]),
                       lambda b: b['values'][0].__setitem__(0, True),
                       lambda b: b.update(colorCenter=7),
                       lambda b: b.update(xDomain=[0, 24]),
                       lambda b: b.update(rowLabels=['东点', '东点', '西点']),
                       lambda b: b.update(values=[[None]*4 for _ in range(3)])]:
            b=copy.deepcopy(HEATMAP)
            mutate(b)
            with self.assertRaises(ValueError):
                plot.validate(b)
        mixed=copy.deepcopy(LINE)
        mixed['colorDomain']=[0, 6]
        with self.assertRaises(ValueError):
            plot.validate(mixed)

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
    def test_unsupported_matplotlib_reports_a_runtime_problem_before_rendering(self):
        import matplotlib
        from unittest.mock import patch
        with patch.object(matplotlib,'__version__','3.5.3'):
            with self.assertRaisesRegex(RuntimeError,'Matplotlib 3.6 or later'):
                plot.build_figure(LINE)

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

    def test_heatmap_does_not_turn_missing_into_zero_or_normalise_rows(self):
        import numpy as np
        _, ax, _=plot.build_figure(HEATMAP)
        image=ax.collections[0]
        data=image.get_array()
        self.assertEqual(int(np.ma.getmaskarray(data).sum()), 2)
        self.assertEqual(float(data[0, 0]), 0)
        self.assertEqual(float(data[0, 3]), 6)
        self.assertEqual(float(data[2, 1]), 4)
        self.assertEqual((image.norm.vmin,image.norm.vmax), (0,6))
        self.assertEqual(len(ax.patches), 2)
        self.assertEqual([t.get_text() for t in ax.get_legend().get_texts()], ['缺测，未补值'])
        self.assertEqual([t.get_text() for t in ax.get_yticklabels()], HEATMAP['rowLabels'])
        with tempfile.TemporaryDirectory() as folder:
            checks=plot.export(HEATMAP, folder)
            self.assertTrue(checks['passed'], checks)
            self.assertEqual(json.loads((Path(folder)/'data.json').read_text(encoding='utf-8')), HEATMAP)
            self.assertNotIn('<image', (Path(folder)/'figure.svg').read_text(encoding='utf-8'))

    def test_heatmap_diverging_center_and_constant_matrix_are_finite(self):
        b=copy.deepcopy(HEATMAP)
        b.update(colorCenter=3)
        _, ax, _=plot.build_figure(b)
        self.assertAlmostEqual(float(ax.collections[0].norm(3)), .5)
        b.pop('colorCenter')
        b.pop('colorDomain')
        b['values']=[[2]*4 for _ in range(3)]
        _, ax, _=plot.build_figure(b)
        self.assertLess(ax.collections[0].norm.vmin, 2)
        self.assertGreater(ax.collections[0].norm.vmax, 2)

    def test_pair_links_keep_identity_order_and_unchanged_observations(self):
        _, ax, _=plot.build_figure(PAIRED)
        self.assertEqual(len(ax.lines), 6)
        self.assertEqual([list(line.get_xdata()) for line in ax.lines],
                         [[r['before'],r['after']] for r in PAIRED['rows']])
        self.assertEqual([list(line.get_ydata()) for line in ax.lines], [[i,i] for i in range(6)])
        self.assertEqual([t.get_text() for t in ax.get_yticklabels()], [r['id'] for r in PAIRED['rows']])
        self.assertEqual(len(ax.collections), 12)
        self.assertEqual(ax.collections[8].get_offsets().tolist(), [[11,4]])
        self.assertEqual(ax.collections[9].get_offsets().tolist(), [[11,4]])
        with tempfile.TemporaryDirectory() as folder:
            checks=plot.export(PAIRED, folder)
            self.assertTrue(checks['passed'], checks)
            self.assertEqual(json.loads((Path(folder)/'data.json').read_text(encoding='utf-8')), PAIRED)

    def test_matrix_keeps_close_values_distinct_and_optional_titles_clear_of_legend(self):
        b=copy.deepcopy(HEATMAP)
        b['values'][0][:2]=[1.000001, 1.000002]
        _, ax, _=plot.build_figure(b)
        self.assertIn('1.000001', [t.get_text() for t in ax.texts])
        self.assertIn('1.000002', [t.get_text() for t in ax.texts])
        for spec in [HEATMAP, PAIRED]:
            spec=copy.deepcopy(spec)
            spec['title']='Measured observations'
            fig, ax, _=plot.build_figure(spec)
            fig.canvas.draw()
            renderer=fig.canvas.get_renderer()
            self.assertFalse(ax._left_title.get_window_extent(renderer).overlaps(ax.get_legend().get_window_extent(renderer)))
            self.assertGreaterEqual(fig.bbox.height-ax._left_title.get_window_extent(renderer).y1,24)

    def test_raw_distribution_keeps_repeats_extremes_and_unequal_counts(self):
        fig, ax, _=plot.build_figure(OBSERVATIONS)
        self.assertEqual(len(ax.collections), 2)
        self.assertEqual(len(ax.lines), 0)
        for collection, series in zip(ax.collections,OBSERVATIONS['series']):
            offsets=collection.get_offsets()
            self.assertEqual(offsets[:,1].tolist(),series['values'])
            pixels=ax.transData.transform(offsets)
            for i,p in enumerate(pixels):
                for q in pixels[i+1:]:
                    self.assertGreaterEqual(float(sum((p-q)**2)),14**2-.01)
        self.assertEqual([len(c.get_offsets()) for c in ax.collections],[8,6])
        self.assertGreater(ax.get_ylim()[1],14)
        with tempfile.TemporaryDirectory() as folder:
            self.assertTrue(plot.export(OBSERVATIONS,folder)['passed'])

    def test_overcrowded_raw_values_fail_instead_of_concealing_replicates(self):
        b=copy.deepcopy(OBSERVATIONS)
        b['series']=[{'name':'A','values':[2]*80},{'name':'B','values':[2]}]
        with self.assertRaisesRegex(ValueError,'cannot fit without overlap'):
            plot.build_figure(b,1200,700)

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

    def test_scientific_unit_glyph_survives_the_available_primary_font(self):
        # A real first-draft comparison lost the superscript minus despite an
        # installed CJK font. Rendering the full unit exercises the fallback.
        with tempfile.TemporaryDirectory() as folder:
            checks=plot.export(LINE,folder)
            self.assertTrue(checks['passed'], checks)
            self.assertIn('DejaVu Sans', checks['font_families'])
            self.assertIn('mg L⁻¹', (Path(folder)/'figure.svg').read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
