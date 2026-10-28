#!/usr/bin/env python3
"""Plot supplied measurements. No inferred statistics, fitted curves or imputation."""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
import re
import sys
import warnings


def require(condition, message):
    if not condition:
        raise ValueError(message)


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def label(value):
    return isinstance(value, str) and bool(value.strip()) and len(value) <= 200


def fields(value, allowed, location):
    require(isinstance(value, dict), location + ': expected an object')
    require(not set(value) - set(allowed), location + ': unsupported fields ' + str(sorted(set(value) - set(allowed))))


def validate(spec):
    fields(spec, ['kind', 'title', 'xLabel', 'yLabel', 'xDomain', 'yDomain', 'series', 'categories', 'rows', 'intervalLabel', 'reference'], '/')
    kind = spec.get('kind')
    require(kind in ['line', 'scatter', 'bar', 'interval'], 'kind: use line, scatter, bar or interval; use a custom plotting script for other relationships')
    require(label(spec.get('xLabel')), 'xLabel: supply the actual variable and unit, or a truthful unitless label')
    if 'title' in spec:
        require(label(spec['title']), 'title: expected nonempty supplied text')
    if kind != 'interval':
        require(label(spec.get('yLabel')), 'yLabel: supply the actual variable and unit, or a truthful unitless label')
    xs, ys = [], []
    if kind == 'interval':
        require(not any(k in spec for k in ['series', 'categories', 'yDomain', 'yLabel']), 'interval: use rows, not a second axis or series')
        require(label(spec.get('intervalLabel')), 'intervalLabel: explicitly name the supplied interval; do not guess SD, SE or CI')
        require(isinstance(spec.get('rows'), list) and 1 <= len(spec['rows']) <= 16, 'rows: use 1..16 estimates')
        names = set()
        for row in spec['rows']:
            fields(row, ['label', 'estimate', 'lower', 'upper'], '/rows')
            require(label(row.get('label')) and row['label'] not in names, 'rows: require unique nonempty labels')
            names.add(row['label'])
            require(all(number(row.get(k)) for k in ['estimate', 'lower', 'upper']), 'rows: estimate/lower/upper must be finite numbers')
            require(row['lower'] <= row['estimate'] <= row['upper'], 'rows: lower <= estimate <= upper; do not silently swap endpoints')
            xs.extend([row['lower'], row['estimate'], row['upper']])
        if 'reference' in spec:
            require(number(spec['reference']), 'reference: requires a supplied finite value')
            xs.append(spec['reference'])
    else:
        require(not any(k in spec for k in ['rows', 'intervalLabel', 'reference']), 'this chart kind does not accept interval rows or a reference')
        series = spec.get('series')
        require(isinstance(series, list) and 1 <= len(series) <= 4, 'series: use 1..4 named series')
        names = set()
        if kind == 'bar':
            categories = spec.get('categories')
            require(isinstance(categories, list) and 1 <= len(categories) <= 12 and all(label(v) for v in categories), 'categories: use 1..12 supplied labels')
            require(len(set(categories)) == len(categories), 'categories: duplicate labels would conceal a repeated category')
            require('xDomain' not in spec, 'bar: x is categorical; xDomain is not applicable')
            ys.append(0)
        else:
            require('categories' not in spec, 'categories: only applies to bar charts')
        for item in series:
            fields(item, ['name', 'values'] if kind == 'bar' else ['name', 'points'], '/series')
            require(label(item.get('name')) and item['name'] not in names, 'series: require unique supplied names')
            names.add(item['name'])
            if kind == 'bar':
                values = item.get('values')
                require(isinstance(values, list) and len(values) == len(spec['categories']) and all(number(v) for v in values), 'values: one finite value for each category; no inferred zeros')
                ys.extend(values)
            else:
                points = item.get('points')
                require(isinstance(points, list) and 1 <= len(points) <= 200, 'points: use 1..200 explicit measurements')
                previous = -math.inf
                present = 0
                for point in points:
                    fields(point, ['x', 'y'], '/series/points')
                    require(number(point.get('x')), 'x: requires a finite number; convert dates with an explicit time convention in a custom script')
                    require('y' in point and (number(point['y']) or kind == 'line' and point['y'] is None), 'y: finite value; only a line may explicitly use null for a missing observation')
                    if kind == 'line':
                        require(point['x'] > previous, 'line: x must be strictly increasing; do not reorder or collapse repeated measurements silently')
                        previous = point['x']
                    xs.append(point['x'])
                    if point['y'] is not None:
                        ys.append(point['y'])
                        present += 1
                require(present > 0, 'series: no observed values to plot')
    for key, values in [('xDomain', xs), ('yDomain', ys)]:
        if key in spec:
            domain = spec[key]
            require(isinstance(domain, list) and len(domain) == 2 and all(number(v) for v in domain) and domain[0] < domain[1], key + ': supply increasing finite endpoints')
            require(all(domain[0] <= v <= domain[1] for v in values), key + ': would hide supplied data or the required zero baseline')
    return copy.deepcopy(spec)


def build_figure(spec, width=1800, height=1100, font=None):
    spec = validate(spec)
    require(isinstance(width, int) and 1200 <= width <= 4000 and isinstance(height, int) and 700 <= height <= 3000, 'figure size: width 1200..4000, height 700..3000 pixels')
    try:
        import matplotlib
        matplotlib.use('Agg')
        from matplotlib import font_manager, pyplot as plt
    except ImportError as error:
        raise RuntimeError('This data-plot route needs Matplotlib in the selected Python environment. Use an existing plotting environment or report this missing capability; the scene renderer is a separate route.') from error
    installed = {face.name for face in font_manager.fontManager.ttflist}
    if font:
        require(font in installed, 'requested font is not installed: ' + font)
    else:
        font = next((name for name in ['Noto Sans CJK SC', 'Microsoft YaHei', 'SimHei'] if name in installed), 'DejaVu Sans')
    families = list(dict.fromkeys([font, 'DejaVu Sans']))
    settings = {'font.family': families, 'font.size': 13, 'axes.labelsize': 15,
                'axes.titlesize': 20, 'axes.titleweight': 'bold', 'axes.spines.top': False,
                'axes.spines.right': False, 'axes.linewidth': .8, 'axes.labelpad': 14,
                'text.color': '#182E40', 'axes.labelcolor': '#182E40', 'xtick.color': '#3D5261',
                'ytick.color': '#3D5261', 'axes.edgecolor': '#8796A0',
                'svg.fonttype': 'none', 'svg.hashsalt': 'musedraw-data-plot',
                'text.usetex': False, 'text.parse_math': False}
    with plt.rc_context(settings):
        fig, ax = plt.subplots(figsize=(width / 150, height / 150), dpi=150, layout='constrained')
        fig.set_facecolor('white')
        colors = ['#245C82', '#AC542B', '#3F7768', '#755C91']
        markers = ['o', 's', '^', 'D']
        kind = spec['kind']
        ax.set_xlabel(spec['xLabel'])
        if kind != 'interval':
            ax.set_ylabel(spec['yLabel'])
        if spec.get('title'):
            ax.set_title(spec['title'], loc='left', pad=22)
        if kind in ['line', 'scatter']:
            for i, series in enumerate(spec['series']):
                x = [p['x'] for p in series['points']]
                y = [math.nan if p['y'] is None else p['y'] for p in series['points']]
                if kind == 'line':
                    ax.plot(x, y, color=colors[i], marker=markers[i], linewidth=2,
                            markersize=5, label=series['name'], gid='series-' + str(i))
                else:
                    ax.scatter(x, y, color=colors[i], marker=markers[i], s=38,
                               alpha=.85, label=series['name'], gid='series-' + str(i))
        elif kind == 'bar':
            count = len(spec['series'])
            bw = .76 / count
            for i, series in enumerate(spec['series']):
                x = [j - .38 + bw * (i + .5) for j in range(len(spec['categories']))]
                ax.bar(x, series['values'], width=bw * .9, color=colors[i],
                       label=series['name'], gid='series-' + str(i))
            ax.set_xticks(range(len(spec['categories'])), spec['categories'])
            ax.axhline(0, color='#697E8C', linewidth=.9)
            low, high = ax.get_ylim()
            values = [v for s in spec['series'] for v in s['values']]
            if min(values) >= 0:
                ax.set_ylim(0, high)
            elif max(values) <= 0:
                ax.set_ylim(low, 0)
        else:
            rows = spec['rows']
            for i, row in enumerate(rows):
                ax.errorbar(row['estimate'], i, xerr=[[row['estimate']-row['lower']], [row['upper']-row['estimate']]],
                            fmt='o', color=colors[0], markersize=6, capsize=5, elinewidth=1.8, gid='interval-' + str(i))
            ax.set_yticks(range(len(rows)), [r['label'] for r in rows])
            ax.set_ylim(len(rows)-.35, -.65)
            if 'reference' in spec:
                ax.axvline(spec['reference'], color='#8B6A56', linewidth=1.2, linestyle='--', label='参考值 ' + str(spec['reference']))
            ax.set_title(spec['intervalLabel'], loc='right', fontsize=13, pad=16)
        ax.set_axisbelow(True)
        ax.grid(axis='x' if kind == 'interval' else 'y', color='#E1E7EB', linewidth=.7)
        if kind != 'interval':
            ax.legend(loc='best', frameon=True, facecolor='white', edgecolor='none', framealpha=.95)
        elif 'reference' in spec:
            ax.legend(loc='best', frameon=False)
        for key, setter in [('xDomain', ax.set_xlim), ('yDomain', ax.set_ylim)]:
            if key in spec:
                setter(*spec[key])
    return fig, ax, {'matplotlib': matplotlib.__version__, 'font': font, 'font_families': families, 'size': [width, height], 'kind': kind}


def export(spec, out, width=1800, height=1100, font=None):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        fig, ax, runtime = build_figure(spec, width, height, font)
        fig.canvas.draw()
        renderer = fig.canvas.get_renderer()
        artists = [ax.xaxis.label, ax.yaxis.label, ax.title, ax._left_title, ax._right_title,
                   ax.xaxis.get_offset_text(), ax.yaxis.get_offset_text()]
        # Locators also create off-view ticks which Axis.draw deliberately
        # excludes. Inspect only ticks in the actual view, including exponents.
        for axis in [ax.xaxis, ax.yaxis]:
            low, high = sorted(axis.get_view_interval())
            for tick in axis.get_major_ticks():
                if low-1e-10 <= tick.get_loc() <= high+1e-10:
                    artists.extend([tick.label1, tick.label2])
        legend = ax.get_legend()
        if legend:
            artists.extend(legend.get_texts())
        outside = []
        for artist in artists:
            if artist.get_visible() and artist.get_text():
                box = artist.get_window_extent(renderer)
                if box.x0 < -1 or box.y0 < -1 or box.x1 > width+1 or box.y1 > height+1:
                    outside.append(artist.get_text())
        fig.savefig(out/'figure.png', dpi=150, facecolor='white')
        import matplotlib
        with matplotlib.rc_context({'svg.fonttype': 'none', 'svg.hashsalt': 'musedraw-data-plot'}):
            fig.savefig(out/'figure.svg', format='svg', facecolor='white')
        svg=(out/'figure.svg').read_text(encoding='utf-8')
        # Matplotlib SVG uses physical points while the PNG uses export pixels.
        # Keep the vector viewBox, but give both deliverables the requested
        # displayed pixel dimensions rather than silently exporting a smaller SVG.
        svg=re.sub(r'<!DOCTYPE[^>]*>', '', svg, count=1, flags=re.S)
        def root_size(match):
            tag=re.sub(r'\bwidth="[^"]*"', 'width="'+str(width)+'px"', match.group(0), count=1)
            return re.sub(r'\bheight="[^"]*"', 'height="'+str(height)+'px"', tag, count=1)
        svg=re.sub(r'<svg\b[^>]*>', root_size, svg, count=1, flags=re.S)
        (out/'figure.svg').write_text(svg,encoding='utf-8')
        from matplotlib import pyplot as plt
        plt.close(fig)
    messages = sorted({str(w.message) for w in caught})
    checks = {**runtime, 'outside_canvas_text': outside, 'warnings': messages,
              'passed': not outside and not messages,
              'limits': 'Canvas/text warnings only; not a statistical-validity or aesthetic certificate. No imputation, interval estimation, fitting or significance inference performed.',
              'script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    (out/'data.json').write_text(json.dumps(spec, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')
    (out/'checks.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2), encoding='utf-8')
    return checks


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--width', type=int, default=1800)
    parser.add_argument('--height', type=int, default=1100)
    parser.add_argument('--font')
    args = parser.parse_args()
    try:
        spec = json.loads(args.input.read_text(encoding='utf-8-sig'))
        checks = export(spec, args.out, args.width, args.height, args.font)
        print(json.dumps(checks, ensure_ascii=False))
        return 0 if checks['passed'] else 1
    except (ValueError, RuntimeError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
