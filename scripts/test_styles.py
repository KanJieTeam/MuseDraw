"""Offline design-token renderer regressions, separate from aesthetic approval."""

import copy
import hashlib
import json
import math
from pathlib import Path
import sys
import subprocess
import unittest
import xml.etree.ElementTree as ET


SKILL = Path(__file__).resolve().parents[1] / 'skills' / 'musedraw'
sys.path.insert(0, str(SKILL / 'scripts'))
from render_capability import render  # noqa: E402
from style_tokens import allocate_widths, load_tokens, resolve_style  # noqa: E402


NS = '{http://www.w3.org/2000/svg}'
STYLES = (
    'enterprise-blue', 'technical-ink', 'slate-teal', 'editorial-sand',
    'forest', 'soft-domains', 'dark-system',
)


def metadata(root):
    return json.loads(root.find(f'{NS}metadata').text)


def luminance(color):
    channels = [int(color[offset:offset + 2], 16) / 255 for offset in (1, 3, 5)]
    linear = [value / 12.92 if value <= 0.04045
              else ((value + 0.055) / 1.055) ** 2.4 for value in channels]
    return sum(value * factor for value, factor in zip(linear, (0.2126, 0.7152, 0.0722)))


def contrast(first, second):
    dark, light = sorted((luminance(first), luminance(second)))
    return (light + 0.05) / (dark + 0.05)


class StyleRendererTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((SKILL / 'assets' / 'data-platform.json').read_text(encoding='utf-8'))

    def test_existing_blue_and_cyan_bytes_are_unchanged(self):
        expected = {
            'blue': 'fbb3dbffa745f0b7de2cbb8bd7bf4a6c8fb874dcb1adbdb5212ec13ce4372eb7',
            'cyan': '13932786ece4f00bcde8c754be4714e6c4f72e3651be6912a10e7f53622460b5',
        }
        for theme, digest in expected.items():
            with self.subTest(theme=theme):
                self.assertEqual(hashlib.sha256(render(self.data, theme).encode()).hexdigest(), digest)
                self.assertEqual(render(self.data, theme, None), render(self.data, theme))

    def test_seven_profiles_render_the_same_information_without_mutation(self):
        original = copy.deepcopy(self.data)
        baseline = [element.text for element in ET.fromstring(render(self.data)).findall(f'{NS}text')]
        drawings = set()
        for style in STYLES:
            with self.subTest(style=style):
                svg = render(self.data, style=style)
                root = ET.fromstring(svg)
                texts = root.findall(f'{NS}text')
                self.assertEqual([element.text for element in texts], baseline)
                self.assertEqual(len({element.attrib['id'] for element in texts}), len(texts))
                self.assertEqual(metadata(root)['style'], style)
                self.assertEqual(self.data, original)
                self.assertNotIn('<image', svg)
                self.assertNotIn('<script', svg)
                drawings.add(svg)
        self.assertEqual(len(drawings), len(STYLES))

    def test_role_palette_fonts_and_typography_are_applied(self):
        for style in STYLES:
            with self.subTest(style=style):
                tokens = resolve_style(style)
                root = ET.fromstring(render(self.data, style=style))
                colors = tokens['colors']
                self.assertEqual(root.find(f'{NS}rect').attrib['fill'], colors['canvas'])
                texts = root.findall(f'{NS}text')
                self.assertEqual(texts[0].attrib['font-size'], str(tokens['typography']['title']))
                self.assertEqual({element.attrib['font-family'] for element in texts}, {tokens['fonts']['text']})
                self.assertTrue({44, 28, 20, 18}.issubset({int(element.attrib['font-size']) for element in texts}))
                self.assertGreaterEqual(contrast(colors['ink'], colors['canvas']), 4.5)
                self.assertGreaterEqual(contrast(colors['ink'], colors['surface']), 4.5)
                self.assertGreaterEqual(contrast(colors['inverse'], colors['accent']), 3)

    def test_content_weighted_widths_and_integer_geometry(self):
        self.data['portal'] = ['API', '经营分析与数据资产工作台', '订单']
        root = ET.fromstring(render(self.data, style='technical-ink'))
        bounds = {item['id']: item['box'] for item in metadata(root)['bounds']}
        by_text = {element.text: bounds[element.attrib['id']]
                   for element in root.findall(f'{NS}text')}
        self.assertGreater(by_text['经营分析与数据资产工作台'][2], by_text['API'][2])
        self.assertGreater(by_text['经营分析与数据资产工作台'][2], by_text['订单'][2])
        for rectangle in root.findall(f'{NS}rect'):
            for attribute in ('x', 'y', 'width', 'height'):
                number = float(rectangle.attrib[attribute])
                self.assertTrue(number.is_integer(), (attribute, number))

    def test_focus_accent_is_not_a_full_height_layer_slab(self):
        colors = resolve_style('dark-system')['colors']
        root = ET.fromstring(render(self.data, style='dark-system'))
        accent_rectangles = [rectangle for rectangle in root.findall(f'{NS}rect')
                             if rectangle.attrib['fill'] == colors['accent']]
        self.assertEqual(len(accent_rectangles), 1)
        self.assertEqual(float(accent_rectangles[0].attrib['height']), 48)
        title = next(element for element in root.findall(f'{NS}text')
                     if element.text == self.data['layers'][1]['title'])
        self.assertEqual(title.attrib['fill'], colors['inverse'])

    def test_unknown_style_is_rejected_before_producing_svg(self):
        with self.assertRaises(ValueError):
            resolve_style('invented-style')
        with self.assertRaises(ValueError):
            render(self.data, style='invented-style')

    def test_width_allocator_is_deterministic_and_conserves_width(self):
        values = allocate_widths(1003, [1, 4, 2], gap=8, grid=8)
        self.assertEqual(values, allocate_widths(1003, [1, 4, 2], gap=8, grid=8))
        self.assertEqual(sum(values) + 16, 1003)
        self.assertGreater(values[1], values[2])
        self.assertGreater(values[2], values[0])
        self.assertTrue(all(value % 8 == 0 for value in values[:-1]))

    def test_width_allocator_accepts_extreme_finite_weights_without_overflow(self):
        widths = allocate_widths(1000, [1e308, 1], gap=8, grid=8)
        self.assertEqual(sum(widths) + 8, 1000)
        self.assertTrue(all(math.isfinite(value) and value >= 8 for value in widths))
        self.assertGreater(widths[0], widths[1])
        tiny = allocate_widths(1000, [1e-300, 2e-300], gap=8, grid=8)
        self.assertEqual(sum(tiny) + 8, 1000)
        self.assertGreater(tiny[1], tiny[0])

    def test_width_allocator_rejects_invalid_numeric_inputs(self):
        for weights in ([], [0], [-1], [True], ['2'], [math.nan], [math.inf], [1e308, 1e308]):
            with self.subTest(weights=weights), self.assertRaises(ValueError):
                allocate_widths(100, weights)
        for total in (0, -1, math.nan, math.inf, True, '100'):
            with self.subTest(total=total), self.assertRaises(ValueError):
                allocate_widths(total, [1])
        for gap in (-1, math.nan, math.inf, True, '8'):
            with self.subTest(gap=gap), self.assertRaises(ValueError):
                allocate_widths(100, [1], gap=gap)
        for grid in (0, -1, 8.5, True):
            with self.subTest(grid=grid), self.assertRaises(ValueError):
                allocate_widths(100, [1], grid=grid)

    def test_resolved_profile_mutations_do_not_affect_later_calls(self):
        first = resolve_style('technical-ink')
        first['colors']['ink'] = '#FFFFFF'
        first['typography']['title'] = 1
        self.assertNotEqual(resolve_style('technical-ink')['colors']['ink'], '#FFFFFF')
        self.assertEqual(resolve_style('technical-ink')['typography']['title'], 44)
        self.assertEqual(set(load_tokens()['styles']), set(STYLES))

    def test_user_names_resolve_without_case_numbers(self):
        for identifier in ('墨蓝', '墨蓝风格', 'ink-blue', 'INK_BLUE', '企业蓝白', 'enterprise-blue'):
            with self.subTest(identifier=identifier):
                self.assertEqual(resolve_style(identifier), resolve_style('enterprise-blue'))
        for label, identifier in (('石墨', 'technical-ink'), ('暖砂风格', 'editorial-sand'),
                                  ('青灰', 'slate-teal'), ('松绿', 'forest'),
                                  ('柔彩', 'soft-domains'), ('夜幕', 'dark-system')):
            self.assertEqual(resolve_style(label)['id'], identifier)
        for invalid in ('001', '墨蓝002', '', None, 1, True):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                resolve_style(invalid)

    def test_approved_ink_blue_palette_is_exact_without_green(self):
        style = resolve_style('墨蓝')
        actual = {value for key, value in style['colors'].items() if key != 'label'}
        actual.update(style['detailColors'].values())
        self.assertEqual(actual, {'#226BAD', '#EFF3F7', '#DEE7F0', '#FFFFFF', '#253545',
                                  '#2B4963', '#416584', '#B4C7D8', '#6D89A3'})
        self.assertNotIn('#3F8073', actual)

    def test_substyles_keep_family_colors_but_change_visual_grammar(self):
        for family in STYLES:
            profiles = [resolve_style(family, variant) for variant in ('quiet', 'banded', 'compact')]
            for profile in profiles:
                self.assertEqual(profile['colors'], profiles[0]['colors'])
                self.assertEqual(profile['detailColors'], profiles[0]['detailColors'])
                self.assertGreaterEqual(profile['layoutRules']['minimumBody'], 18)
                self.assertGreaterEqual(profile['layoutRules']['headroom'], profile['layoutRules']['minimumBody'] + 16)
            self.assertEqual(len({json.dumps(p['layoutRules'], sort_keys=True) for p in profiles}), 3)
            self.assertEqual({p['variant']['headerTreatment'] for p in profiles}, {'outline', 'band', 'strip'})
            self.assertEqual(resolve_style(family, '轻线留白'), profiles[0])
            self.assertEqual(resolve_style(family, '紧凑一点'), profiles[2])

    def test_substyle_selection_depends_on_view_and_explicit_density(self):
        self.assertEqual(resolve_style('墨蓝')['variant']['id'], 'banded')
        for view in ('component', 'integration', 'deployment'):
            self.assertEqual(resolve_style('墨蓝', view=view)['variant']['id'], 'quiet')
        compact = resolve_style('墨蓝', view='component', density='紧凑')
        self.assertEqual(compact['variant']['id'], 'compact')
        self.assertEqual(compact['density'], 'compact')
        self.assertEqual(compact['layoutRules']['itemGap'], 8)
        explicit = resolve_style('墨蓝', '轻线', density='compact')
        self.assertEqual(explicit['variant']['id'], 'quiet')
        self.assertEqual(explicit['variant']['headerTreatment'], 'outline')
        self.assertEqual(explicit['layoutRules']['itemGap'], 8)
        self.assertEqual(explicit['typography']['body'], compact['typography']['body'])
        for options in ({'variant': 'unknown'}, {'view': 'unknown'}, {'density': 'tiny'},
                        {'variant': ''}, {'view': ''}, {'density': ''}):
            with self.subTest(options=options), self.assertRaises(ValueError):
                resolve_style('墨蓝', **options)

    def test_cli_legacy_and_user_name_contract(self):
        script = str(SKILL / 'scripts' / 'style_tokens.py')
        legacy = subprocess.run([sys.executable, script, 'technical-ink'], check=True, capture_output=True, encoding='utf-8')
        self.assertEqual(json.loads(legacy.stdout), resolve_style('technical-ink'))
        named = subprocess.run([sys.executable, script, '墨蓝风格', '--variant', '轻线留白',
                                '--view', 'component', '--density', 'compact'],
                               check=True, capture_output=True, encoding='utf-8')
        self.assertEqual(json.loads(named.stdout), resolve_style('墨蓝', 'quiet', 'component', 'compact'))
        listing = subprocess.run([sys.executable, script, '--list'], check=True, capture_output=True, encoding='utf-8')
        self.assertEqual({item['id'] for item in json.loads(listing.stdout)}, set(STYLES))

    def test_nested_mutations_do_not_change_future_style_profiles(self):
        before = resolve_style('墨蓝', 'quiet')
        changed = resolve_style('墨蓝', 'quiet')
        changed['layoutRules']['headroom'] = 1
        changed['weights']['body'] = 900
        changed['detailColors']['relationship'] = '#FFFFFF'
        changed['variant']['label'] = 'other'
        self.assertEqual(resolve_style('墨蓝', 'quiet'), before)


if __name__ == '__main__':
    unittest.main()
