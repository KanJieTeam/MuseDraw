"""Small offline regression suite; not an aesthetic or model benchmark."""
import copy
import hashlib
import html
import json
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from render_capability import render, validate


class RendererTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((Path(__file__).parents[1] / 'assets/data-platform.json').read_text(encoding='utf-8'))

    def test_original_svg_is_well_formed(self):
        root = ET.fromstring(render(self.data))
        texts = root.findall('.//{http://www.w3.org/2000/svg}text')
        self.assertEqual(len(texts), 122)
        self.assertEqual(len({t.attrib['id'] for t in texts}), len(texts))

    def test_no_raster_or_script_dependencies(self):
        svg = render(self.data)
        for forbidden in ('<image', '<script', '<foreignObject', 'http://boardmix', '<filter', '<linearGradient'):
            self.assertNotIn(forbidden, svg)

    def test_content_escaped_not_executed(self):
        self.data['title'] = '<script>&test'
        root = ET.fromstring(render(self.data))
        self.assertEqual(root.find('{http://www.w3.org/2000/svg}title').text, '<script>&test')
        self.assertNotIn('<script>', render(self.data))

    def test_theme_changes_style_not_labels(self):
        blue = ET.fromstring(render(self.data, 'blue'))
        cyan = ET.fromstring(render(self.data, 'cyan'))
        labels = lambda root: [t.text for t in root.findall('.//{http://www.w3.org/2000/svg}text')]
        self.assertEqual(labels(blue), labels(cyan))
        self.assertNotEqual(ET.tostring(blue), ET.tostring(cyan))

    def test_long_label_rejected_not_shrunk(self):
        self.data['layers'][1]['groups'][0]['items'][0] = '这是一个超过模块宽度的长文字'
        with self.assertRaisesRegex(ValueError, 'will not fit'):
            render(self.data)

    def test_empty_list_rejected(self):
        self.data['portal'] = []
        with self.assertRaises(ValueError):
            render(self.data)

    def test_theme_does_not_mutate_semantics(self):
        original = copy.deepcopy(self.data)
        render(self.data)
        self.assertEqual(self.data, original)

    def test_dynamic_number_of_layers(self):
        self.data['layers'].append({'title': '额外能力层', 'groups': [{'items': ['服务能力']}], 'columns': 1})
        svg = render(self.data)
        self.assertIn('额外能力层', svg)
        self.assertGreater(int(ET.fromstring(svg).attrib['height']), 1232)

    def test_all_titles_reject_non_string_or_empty_values(self):
        paths = [(), ('left',), ('right',), ('layers', 0),
                 ('left', 'groups', 0), ('right', 'groups', 0),
                 ('layers', 0, 'groups', 0)]
        for path in paths:
            for invalid in (['first', 'second'], 123, None, ''):
                with self.subTest(path=path, invalid=invalid):
                    data = copy.deepcopy(self.data)
                    node = data
                    for key in path:
                        node = node[key]
                    node['title'] = invalid
                    with self.assertRaisesRegex(ValueError, 'title string'):
                        validate(data)
                    with self.assertRaisesRegex(ValueError, 'title string'):
                        render(data)

    def test_side_support_group_title_required(self):
        for side in ('left', 'right'):
            with self.subTest(side=side):
                data = copy.deepcopy(self.data)
                del data[side]['groups'][0]['title']
                with self.assertRaisesRegex(ValueError, 'Side support group title'):
                    validate(data)
                with self.assertRaisesRegex(ValueError, 'Side support group title'):
                    render(data)

    def test_optional_layer_group_title_can_be_absent(self):
        self.data['layers'][0]['groups'][0].pop('title', None)
        validate(self.data)
        ET.fromstring(render(self.data))

    def test_two_line_items_remain_supported(self):
        self.data['layers'][0]['groups'][0]['items'][0] = ['first', 'second']
        validate(self.data)
        root = ET.fromstring(render(self.data))
        labels = [t.text for t in root.findall('.//{http://www.w3.org/2000/svg}text')]
        self.assertIn('first', labels)
        self.assertIn('second', labels)

    def test_optional_section_titles_override_defaults(self):
        self.data['portalTitle'] = 'Unified Portal'
        self.data['foundationTitle'] = 'Infrastructure'
        root = ET.fromstring(render(self.data))
        labels = [t.text for t in root.findall('.//{http://www.w3.org/2000/svg}text')]
        self.assertIn('Unified Portal', labels)
        self.assertIn('Infrastructure', labels)
        self.assertNotIn('统一门户', labels)
        self.assertNotIn('平台基础设施', labels)
        self.assertEqual(len(labels), 122)

    def test_optional_section_titles_are_independent(self):
        cases = [
            ('portalTitle', 'Unified Portal', '统一门户', '平台基础设施'),
            ('foundationTitle', 'Infrastructure', '平台基础设施', '统一门户'),
        ]
        for field, custom, replaced, remaining_default in cases:
            with self.subTest(field=field):
                data = copy.deepcopy(self.data)
                data[field] = custom
                root = ET.fromstring(render(data))
                labels = [t.text for t in root.findall('.//{http://www.w3.org/2000/svg}text')]
                self.assertIn(custom, labels)
                self.assertNotIn(replaced, labels)
                self.assertIn(remaining_default, labels)

    def test_optional_section_titles_reject_invalid_values(self):
        for field in ('portalTitle', 'foundationTitle'):
            for invalid in (['first', 'second'], [], 123, True, None, {}, '', ' \t\n'):
                with self.subTest(field=field, invalid=invalid):
                    data = copy.deepcopy(self.data)
                    data[field] = invalid
                    for check in (validate, render):
                        with self.assertRaisesRegex(ValueError, f'{field}: expected a non-empty title string'):
                            check(data)

    def test_optional_section_titles_enforce_title_length(self):
        for field in ('portalTitle', 'foundationTitle'):
            with self.subTest(field=field):
                data = copy.deepcopy(self.data)
                data[field] = 'T' * 70
                validate(data)
                data[field] = 'T' * 71
                for check in (validate, render):
                    with self.assertRaisesRegex(ValueError, 'Label too long'):
                        check(data)

    def test_optional_section_titles_are_html_escaped(self):
        titles = {
            'portalTitle': '<script>&"Portal"',
            'foundationTitle': '</text><script>Foundation & More</script>',
        }
        self.data.update(titles)
        svg = render(self.data)
        root = ET.fromstring(svg)
        labels = [t.text for t in root.findall('.//{http://www.w3.org/2000/svg}text')]
        for title in titles.values():
            self.assertIn(title, labels)
            self.assertIn(html.escape(title), svg)
        self.assertNotIn('<script>', svg)
        self.assertEqual(len(labels), 122)

    def test_optional_section_titles_do_not_mutate_input(self):
        self.data['portalTitle'] = 'Unified Portal'
        self.data['foundationTitle'] = 'Infrastructure'
        original = copy.deepcopy(self.data)
        for theme in ('blue', 'cyan'):
            with self.subTest(theme=theme):
                render(self.data, theme)
                self.assertEqual(self.data, original)

    def test_optional_section_titles_do_not_change_with_theme(self):
        self.data['portalTitle'] = 'Unified Portal'
        self.data['foundationTitle'] = 'Infrastructure'
        blue = ET.fromstring(render(self.data, 'blue'))
        cyan = ET.fromstring(render(self.data, 'cyan'))
        labels = lambda root: [(t.attrib['id'], t.text) for t in root.findall('.//{http://www.w3.org/2000/svg}text')]
        self.assertEqual(labels(blue), labels(cyan))
        self.assertNotEqual(ET.tostring(blue), ET.tostring(cyan))

    def test_original_svg_bytes_unchanged(self):
        # Hashes captured before the input-validation-only fix.
        expected = {
            'blue': 'fbb3dbffa745f0b7de2cbb8bd7bf4a6c8fb874dcb1adbdb5212ec13ce4372eb7',
            'cyan': '13932786ece4f00bcde8c754be4714e6c4f72e3651be6912a10e7f53622460b5',
        }
        for theme, digest in expected.items():
            with self.subTest(theme=theme):
                actual = hashlib.sha256(render(self.data, theme).encode('utf-8')).hexdigest()
                self.assertEqual(actual, digest)
                explicit_defaults = copy.deepcopy(self.data)
                explicit_defaults['portalTitle'] = '统一门户'
                explicit_defaults['foundationTitle'] = '平台基础设施'
                explicit_digest = hashlib.sha256(render(explicit_defaults, theme).encode('utf-8')).hexdigest()
                self.assertEqual(explicit_digest, digest)


if __name__ == '__main__':
    unittest.main()
