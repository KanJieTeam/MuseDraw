#!/usr/bin/env python3
"""Original, offline semantic capability-map renderer. Python standard library only."""
import argparse
import html
import json
import math
from pathlib import Path

from style_tokens import allocate_widths, resolve_style

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


def render(data, theme='blue', style=None):
    if style is not None:
        return render_styled(data, style)
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


def render_styled(data, style):
    """Apply role-based design tokens to the existing data-platform skeleton.

    This is not a general graph layout engine: input containment and labels stay
    unchanged, and no runtime relationships are inferred from capability groups.
    """
    validate(data)
    tokens = resolve_style(style)
    colors, typography = tokens['colors'], tokens['typography']
    grid = tokens['grid']
    pieces, boxes = [], []
    counter = 0

    def estimate(value, size):
        lines = value if isinstance(value, list) else [value]
        return max(sum(size if ord(char) > 127 else size * 0.56
                       for char in line) for line in lines)

    def rect(x, y, w, h, fill, stroke='none', radius=2, line_width=None):
        line_width = tokens['stroke']['boundary'] if line_width is None else line_width
        pieces.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{line_width}"/>')

    def text(x, y, value, size, color=None, weight=400, anchor='middle', box=None):
        nonlocal counter
        counter += 1
        ident = f'label-{counter}'
        font = html.escape(tokens['fonts']['text'], quote=True)
        pieces.append(
            f'<text id="{ident}" x="{x}" y="{y}" font-family="{font}" '
            f'font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" '
            f'dominant-baseline="central" fill="{color or colors["ink"]}">'
            f'{html.escape(value)}</text>')
        if box is not None:
            boxes.append(dict(id=ident, box=box))

    def cell(x, y, w, h, value, fill=None, color=None, size=None):
        size = typography['body'] if size is None else size
        if estimate(value, size) > w - 8:
            raise ValueError(f'Label will not fit: {value!r}; split or expand its cell')
        rect(x, y, w, h, fill or colors['surface'])
        lines = value if isinstance(value, list) else [value]
        for index, line in enumerate(lines):
            offset = (index - (len(lines) - 1) / 2) * (size + 4)
            text(x + w / 2, y + h / 2 + offset, line, size, color,
                 box=[x, y, w, h])

    def row(x, y, w, h, values, fill=None, color=None, size=None):
        size = typography['body'] if size is None else size
        weights = [estimate(value, size) + 8 for value in values]
        widths = allocate_widths(w, weights, gap=grid, grid=grid)
        for value, width in zip(values, widths):
            cell(x, y, width, h, value, fill, color, size)
            x += width + grid

    def columns_for(group, panel):
        return group.get('columns', panel.get('columns', 2))

    def column_weights(group, columns):
        return [max((estimate(value, typography['body']) + 8
                     for index, value in enumerate(group['items'])
                     if index % columns == column), default=8)
                for column in range(min(columns, len(group['items'])))]

    def group_height(group, columns):
        rows = math.ceil(len(group['items']) / columns)
        return (40 if group.get('title') else 8) + rows * 56 + (rows - 1) * grid + 8

    def group_weight(group, panel):
        columns = columns_for(group, panel)
        weights = column_weights(group, columns)
        cells = sum(weights) + grid * (len(weights) - 1) + 16
        title = estimate(group.get('title', ''), typography['group']) + 16
        return max(cells, title)

    def group_cells(x, y, w, group, panel, fill):
        columns = columns_for(group, panel)
        weights = column_weights(group, columns)
        widths = allocate_widths(w - 16, weights, gap=grid, grid=grid)
        for index, value in enumerate(group['items']):
            column, line = index % columns, index // columns
            offset = sum(widths[:column]) + grid * column
            cell(x + 8 + offset, y + line * 64, widths[column], 56, value, fill)

    heights = []
    for layer in data['layers']:
        maximum = max(group_height(group, columns_for(group, layer))
                      for group in layer['groups'])
        heights.append(64 + maximum + (64 if layer.get('shared') else 0) + 16)
    inner_h = sum(heights) + (len(heights) - 1) * 16 + 88
    width, height = 1920, 208 + inner_h + 128
    rect(0, 0, width, height, colors['canvas'], radius=0)
    text(32, 56, data['title'], typography['title'], weight=600, anchor='start',
         box=[24, 16, 1440, 80])
    if data.get('subtitle'):
        text(1888, 64, data['subtitle'], typography['annotation'],
             colors['muted'], anchor='end', box=[1472, 32, 424, 56])
    pieces.append(
        f'<path d="M32 96.5H1888" stroke="{colors["border"]}" '
        f'stroke-width="{tokens["stroke"]["boundary"]}"/>')
    rect(32, 112, 1856, 80, colors['surface'])
    text(144, 152, data.get('portalTitle', '统一门户'), typography['section'],
         colors['accent'], 600, box=[48, 120, 192, 64])
    row(256, 124, 1616, 56, data['portal'], colors['canvas'])
    cx, cw, sw = 320, 1280, 272
    y = 208
    for layer, layer_height in zip(data['layers'], heights):
        focus = bool(layer.get('focus'))
        rect(cx, y, cw, layer_height,
             colors['focus'] if focus else colors['canvas'], colors['border'])
        if focus:
            # The focal accent is a thin heading, not a full-layer saturated slab.
            rect(cx, y, cw, 48, colors['accent'], radius=0)
        else:
            rect(cx + 16, y + 16, 4, 24, colors['secondary'], radius=0)
        text(cx + cw / 2, y + 28, layer['title'], typography['section'],
             colors['inverse'] if focus else colors['ink'], 600,
             box=[cx + 24, y + 4, cw - 48, 48])
        groups = layer['groups']
        group_widths = allocate_widths(
            cw - 32, [group_weight(group, layer) for group in groups],
            gap=grid, grid=grid)
        maximum = max(group_height(group, columns_for(group, layer)) for group in groups)
        x, group_y = cx + 16, y + 64
        for group, group_width in zip(groups, group_widths):
            rect(x, group_y, group_width, maximum, colors['canvas'], colors['border'])
            if group.get('title'):
                text(x + group_width / 2, group_y + 20, group['title'],
                     typography['group'], colors['muted'], 600,
                     box=[x + 4, group_y + 4, group_width - 8, 32])
            cell_y = group_y + (40 if group.get('title') else 8)
            group_cells(x, cell_y, group_width, group, layer,
                        colors['canvas'] if focus else colors['surface'])
            x += group_width + grid
        if layer.get('shared'):
            row(cx + 16, y + layer_height - 64, cw - 32, 48,
                layer['shared'], colors['surface'], size=typography['group'])
        y += layer_height + 16
    rect(cx, y, cw, 72, colors['surface'])
    row(cx + 16, y + 8, cw - 32, 56, data['sources'], colors['canvas'])

    for x, panel in ((32, data['left']), (1616, data['right'])):
        rect(x, 208, sw, inner_h, colors['surface'], colors['border'])
        text(x + sw / 2, 240, panel['title'], typography['section'],
             colors['ink'], 600, box=[x + 4, 216, sw - 8, 48])
        regions = panel['groups']
        minimum = [40 + math.ceil(len(group['items']) /
                                 columns_for(group, panel)) * 64 for group in regions]
        available = inner_h - 72
        if sum(minimum) > available:
            raise ValueError('Side support is too dense: split the diagram or add a layer')
        extra = allocate_widths(available - sum(minimum) + len(regions) * grid,
                                [1] * len(regions), gap=0, grid=grid)
        top = 280
        for group, region_height, addition in zip(regions, minimum, extra):
            text(x + sw / 2, top + 16, group['title'], typography['group'],
                 colors['accent'], 600, box=[x + 8, top, sw - 16, 32])
            group_cells(x + 8, top + 40, sw - 16, group, panel, colors['canvas'])
            top += region_height + addition - grid
    fy = 208 + inner_h + 16
    rect(32, fy, 1856, 80, colors['surface'])
    text(144, fy + 40, data.get('foundationTitle', '平台基础设施'),
         typography['group'], colors['accent'], 600, box=[48, fy + 8, 192, 64])
    row(256, fy + 12, 1616, 56, data['foundation'], colors['canvas'])
    if data.get('note'):
        text(32, height - 16, data['note'], typography['annotation'],
             colors['muted'], anchor='start', box=[24, height - 40, 1872, 40])
    meta = html.escape(json.dumps(dict(
        layout='capability-containment', style=style, designTokensVersion=tokens['version'],
        grid=grid, bounds=boxes), ensure_ascii=False))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img"><title>{html.escape(data["title"])}</title>'
        f'<metadata id="layout-metadata">{meta}</metadata>{"".join(pieces)}</svg>')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('brief', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--theme', choices=THEMES, default='blue')
    parser.add_argument('--style', help='Optional role-based visual style; see style_tokens.py --list')
    args = parser.parse_args()
    try:
        drawing = render(json.loads(args.brief.read_text(encoding='utf-8')), args.theme, args.style)
    except ValueError as error:
        parser.error(str(error))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(drawing, encoding='utf-8')
    print(json.dumps(dict(output=str(args.output), theme=args.theme, style=args.style), ensure_ascii=False))
