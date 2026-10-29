"""Real source preparation and trace data regressions, not aesthetic scores."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / 'skills/musedraw'
LIBRARY = SKILL / 'assets/visual-language'
SCRIPT = SKILL / 'scripts/style-library.mjs'
sys.path.insert(0, str(SKILL / 'scripts'))
spec = importlib.util.spec_from_file_location('trace_plot', SKILL / 'scripts/plot_trace.py')
trace = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trace)


class StyleLibraryTests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run(['node', str(SCRIPT), *args], capture_output=True,
                              text=True, encoding='utf-8', timeout=30)

    def test_each_installed_family_has_reachable_complete_sources(self):
        registry = json.loads((LIBRARY / 'index.json').read_text(encoding='utf-8'))
        self.assertEqual({i['theme'] for i in registry['items']}, {p.stem for p in (SKILL / 'themes').glob('*.json')})
        self.assertEqual(len({i['id'] for i in registry['items']}), len(registry['items']))
        for item in registry['items']:
            self.assertIn(item['entry'], item['files'])
            self.assertIn(item['brief'], item['files'])
            self.assertIn(item['preview'], item['files'])
            for relative in item['files']:
                source = (LIBRARY / relative).resolve()
                self.assertTrue(source.is_relative_to(LIBRARY.resolve()))
                self.assertTrue(source.is_file(), relative)

    def test_prepare_preserves_parent_css_and_embedded_art(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / 'poster'
            result = self.run_cli('--id', 'swiss', '--out', str(output))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((output / 'shared.css').read_bytes(), (LIBRARY / 'shared.css').read_bytes())
            self.assertEqual((output / 'swiss/artwork.png').read_bytes(), (LIBRARY / 'swiss/artwork.png').read_bytes())
            self.assertEqual((output / 'swiss/index.html').read_bytes(), (LIBRARY / 'swiss/index.html').read_bytes())

    def test_prepare_replays_vector_source_and_preserves_existing_user_work(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / 'vector'
            result = self.run_cli('--id', 'blueprint-rainwater', '--out', str(output))
            self.assertEqual(result.returncode, 0, result.stderr)
            scene = output / 'blueprint-rainwater/scene.json'
            self.assertEqual(scene.read_bytes(), (LIBRARY / 'blueprint-rainwater/scene.json').read_bytes())
            scene.write_text('user changes', encoding='utf-8')
            refused = self.run_cli('--id', 'blueprint-rainwater', '--out', str(output))
            self.assertNotEqual(refused.returncode, 0)
            self.assertEqual(scene.read_text(encoding='utf-8'), 'user changes')

    def test_search_filters_actual_style_and_rejects_unknown_options(self):
        result = self.run_cli('--style', 'aurora')
        self.assertEqual(result.returncode, 0, result.stderr)
        items = json.loads(result.stdout)['items']
        self.assertTrue(items)
        self.assertTrue(all(i['theme'] == 'aurora' for i in items))
        for args in [('--out',), ('--unknown', 'x'), ('--id', 'missing', '--out', 'unused')]:
            self.assertNotEqual(self.run_cli(*args).returncode, 0)

    def test_trace_uses_changed_observed_endpoints_not_summed_child_durations(self):
        data = json.loads((LIBRARY / 'observatory-trace/data.json').read_text(encoding='utf-8'))
        data['spans'][0]['end'] = 600
        data['spans'][2].update(start=100, end=550)
        data['spans'][3].update(start=100, end=500)
        values = trace.analyse(data)
        self.assertEqual(values['root_duration_ms'], 600)
        self.assertEqual(values['durations_ms']['search'], 450)
        self.assertEqual(values['durations_ms']['document'], 400)
        with tempfile.TemporaryDirectory() as temp:
            destination = Path(temp) / 'trace.png'
            self.assertEqual(trace.plot(data, destination), values)
            self.assertTrue(destination.read_bytes().startswith(b'\x89PNG'))
            with self.assertRaises(FileExistsError):
                trace.plot(data, destination)

    def test_trace_refuses_missing_root_reversed_interval_and_outside_child(self):
        for change in ['missing-root', 'reversed', 'outside', 'nonfinite']:
            data = json.loads((LIBRARY / 'observatory-trace/data.json').read_text(encoding='utf-8'))
            if change == 'missing-root':
                data['root'] = 'not-supplied'
            elif change == 'reversed':
                data['spans'][1]['end'] = 1
            elif change == 'outside':
                data['spans'][1]['end'] = 1000
            else:
                data['spans'][1]['end'] = float('nan')
            with self.subTest(change=change), self.assertRaises(ValueError):
                trace.analyse(data)

    def test_narrow_trace_keeps_the_same_observed_interval_coordinates(self):
        from matplotlib.axes import Axes
        original = Axes.plot
        data = json.loads((LIBRARY / 'observatory-trace/data.json').read_text(encoding='utf-8'))
        expected = [([s['start'], s['end']], [i, i]) for i, s in enumerate(data['spans'])]
        for compact in (False, True):
            coordinates = []

            def capture(ax, xs, ys, **kwargs):
                coordinates.append((list(xs), list(ys)))
                return original(ax, xs, ys, **kwargs)

            with self.subTest(compact=compact), tempfile.TemporaryDirectory() as temp, patch.object(Axes, 'plot', capture):
                trace.plot(data, Path(temp) / 'trace.png', compact=compact)
            self.assertEqual(coordinates, expected)


if __name__ == '__main__':
    unittest.main()
