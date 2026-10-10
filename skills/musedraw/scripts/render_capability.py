#!/usr/bin/env python3
"""Original, offline semantic capability-map renderer. Python standard library only."""
import argparse
import html
import json
import math
from pathlib import Path

THEMES = {
    'blue': dict(main='#2B65CF', ink='#284E88', pale='#E5EDF9', faint='#F2F6FC', edge='#ADC6ED'),
    'cyan': dict(main='#1487B4', ink='#21627C', pale='#E3F2F7', faint='#F3F9FC', edge='#A6D4E4'),
}


def validate(data):
    def label(value):
        lines = value if isinstance(value, list) else [value]
        if not 1 <= len(lines) <= 2 or not all(isinstance(s, str) and s.strip() for s in lines):
            raise ValueError('Labels must be non-empty strings or arrays of one or two lines')
        if any(len(s) > 70 for s in lines):
            raise ValueError('Label too long: shorten or split the diagram')
    def title(value, field):
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f'{field}: expected a non-empty title string')
        label(value)
    title(data.get('title'), 'title')
    for key in ('portalTitle', 'foundationTitle'):
        if key in data:
            title(data[key], key)
    for key in ('portal', 'sources', 'foundation'):
        if not 1 <= len(data[key]) <= 8:
            raise ValueError(f'{key}: expected 1–8 entries')
        for item in data[key]:
            label(item)
    if not 1 <= len(data['layers']) <= 7:
        raise ValueError('Expected 1–7 layers')
    for panel_index, panel in enumerate((data['left'], data['right'], *data['layers'])):
        title(panel.get('title'), 'Panel title')
        if not 1 <= len(panel['groups']) <= 6:
            raise ValueError('Expected 1–6 groups per panel')
        for group in panel['groups']:
            if panel_index < 2 or 'title' in group:
                field = 'Side support group title' if panel_index < 2 else 'Group title'
                title(group.get('title'), field)
            if not 1 <= len(group['items']) <= 12:
                raise ValueError('Expected 1–12 items per group')
            columns = group.get('columns', panel.get('columns', 2))
            if not isinstance(columns, int) or not 1 <= columns <= 6:
                raise ValueError('Expected 1–6 columns')
            for item in group['items']:
                label(item)
        for item in panel.get('shared', []):
            label(item)


def render(data, theme='blue'):
    validate(data)
    c = THEMES[theme]
    pieces, boxes = [], []
    counter = 0

    def rect(x, y, w, h, fill='white', stroke='none', radius=3):
        pieces.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>')

    def text(x, y, value, size=19, color=None, weight=400, anchor='middle', box=None):
        nonlocal counter
        counter += 1
        ident = f'label-{counter}'
        pieces.append(f'<text id="{ident}" x="{x}" y="{y}" font-family="Noto Sans SC,Microsoft YaHei UI,Microsoft YaHei,微软雅黑,Arial,sans-serif" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" dominant-baseline="central" fill="{color or c["ink"]}">{html.escape(value)}</text>')
        if box:
            boxes.append(dict(id=ident, box=box))

    def cell(x, y, w, h, value, fill=None, color=None, size=19, weight=400):
        rect(x, y, w, h, fill or c['pale'])
        lines = value if isinstance(value, list) else [value]
        for i, line in enumerate(lines):
            # A conservative preflight; actual-font overflow is tested in the browser.
            estimated = sum(size if ord(ch) > 127 else size * 0.56 for ch in line)
            if estimated > w - 12:
                raise ValueError(f'Label will not fit: {line!r}; split or expand its cell')
            text(x + w / 2, y + h / 2 + (i - (len(lines) - 1) / 2) * (size + 6), line, size, color, weight, box=[x, y, w, h])

    def row(x, y, w, h, values, fill=None, color=None, size=19, gap=10):
        width = (w - gap * (len(values) - 1)) / len(values)
        for i, value in enumerate(values):
            cell(x + i * (width + gap), y, width, h, value, fill, color, size)

    def group_height(group, columns):
        rows = math.ceil(len(group['items']) / columns)
        return (40 if group.get('title') else 12) + rows * 52 + (rows - 1) * 10 + 12

    heights = []
    for layer in data['layers']:
        maximum = max(group_height(g, g.get('columns', layer.get('columns', 2))) for g in layer['groups'])
        heights.append(52 + maximum + (54 if layer.get('shared') else 0) + 16)
    inner_h = sum(heights) + (len(heights) - 1) * 16 + 82
    width, height = 1920, 178 + inner_h + 122
    rect(0, 0, width, height, 'white', radius=0)
    text(24, 38, data['title'], 30, weight=600, anchor='start')
    text(1896, 38, data.get('subtitle', ''), 18, color=c['ink'], anchor='end')
    pieces.append(f'<path d="M24 69H1896" stroke="{c["edge"]}" stroke-width="1"/>')
    rect(24, 86, 1872, 76, c['faint'])
    text(126, 124, data.get('portalTitle', '统一门户'), 24, c['main'], 600)
    row(238, 104, 1642, 40, data['portal'], c['main'], 'white')
    cx, cw, sw = 312, 1296, 272
    y = 178
    for layer, h in zip(data['layers'], heights):
        focus = bool(layer.get('focus'))
        rect(cx, y, cw, h, c['main'] if focus else c['faint'], 'none' if focus else c['edge'])
        text(cx + cw / 2, y + 27, layer['title'], 24, 'white' if focus else c['main'], 600)
        groups = layer['groups']
        gw = (cw - 32 - (len(groups) - 1) * 12) / len(groups)
        maximum = max(group_height(g, g.get('columns', layer.get('columns', 2))) for g in groups)
        for i, g in enumerate(groups):
            x = cx + 16 + i * (gw + 12)
            gy = y + 52
            rect(x, gy, gw, maximum, c['pale'] if focus else 'white')
            has_title = bool(g.get('title'))
            if has_title:
                text(x + gw / 2, gy + 22, g['title'], 20, weight=600, box=[x, gy, gw, 40])
            columns = g.get('columns', layer.get('columns', 2))
            top = gy + (40 if has_title else 12)
            for r in range(math.ceil(len(g['items']) / columns)):
                items = g['items'][r * columns:(r + 1) * columns]
                row(x + 10, top + r * 62, gw - 20, 52, items, 'white' if focus else c['pale'], size=18 if focus else 19, gap=8)
        if layer.get('shared'):
            row(cx + 16, y + h - 54, cw - 32, 38, layer['shared'], c['pale'], size=18)
        y += h + 16
    rect(cx, y, cw, 66, c['faint'])
    row(cx + 16, y + 12, cw - 32, 42, data['sources'], 'white', size=19)

    # Side support groups share the complete platform height, not each layer's colour.
    for x, panel in ((24, data['left']), (1624, data['right'])):
        rect(x, 178, sw, inner_h, c['pale'])
        text(x + sw / 2, 207, panel['title'], 22, c['main'], 600, box=[x, 178, sw, 58])
        regions = panel['groups']
        available = inner_h - 70
        minimum = sum(40 + math.ceil(len(g['items']) / g.get('columns', 2)) * 62 for g in regions)
        if minimum > available:
            raise ValueError('Side support is too dense: split the diagram or add a layer')
        extra = (available - minimum) / len(regions)
        top = 242
        for g in regions:
            text(x + sw / 2, top + 12, g['title'], 20, c['main'], 600)
            columns = g.get('columns', 2)
            for r in range(math.ceil(len(g['items']) / columns)):
                values = g['items'][r * columns:(r + 1) * columns]
                row(x + 16, top + 40 + r * 62, sw - 32, 52, values, 'white', size=18, gap=8)
            top += 40 + math.ceil(len(g['items']) / columns) * 62 + extra
    fy = 178 + inner_h + 16
    rect(24, fy, 1872, 78, c['faint'])
    text(137, fy + 39, data.get('foundationTitle', '平台基础设施'), 23, c['main'], 600)
    row(260, fy + 17, 1620, 44, data['foundation'], c['pale'], size=18)
    text(24, height - 18, data.get('note', ''), 16, anchor='start')
    meta = html.escape(json.dumps(dict(layout='capability-containment', theme=theme, bounds=boxes), ensure_ascii=False))
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img"><title>{html.escape(data["title"])}</title><metadata id="layout-metadata">{meta}</metadata>{"".join(pieces)}</svg>'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('brief', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--theme', choices=THEMES, default='blue')
    args = parser.parse_args()
    drawing = render(json.loads(args.brief.read_text(encoding='utf-8')), args.theme)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(drawing, encoding='utf-8')
    print(json.dumps(dict(output=str(args.output), theme=args.theme), ensure_ascii=False))
