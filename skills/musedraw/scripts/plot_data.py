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
    fields(spec, ['kind', 'title', 'xLabel', 'yLabel', 'xDomain', 'yDomain', 'series', 'categories', 'rows', 'intervalLabel', 'reference',
                  'rowLabels', 'columnLabels', 'values', 'colorLabel', 'colorDomain', 'colorCenter', 'missingLabel', 'conditions'], '/')
    kind = spec.get('kind')
    require(kind in ['line', 'scatter', 'bar', 'interval', 'heatmap', 'paired', 'observations'], 'kind: use line, scatter, bar, interval, heatmap, paired or observations; use a custom plotting script for other relationships')
    heatmap_fields = ['rowLabels', 'columnLabels', 'values', 'colorLabel', 'colorDomain', 'colorCenter', 'missingLabel']
    if kind != 'heatmap':
        require(not any(k in spec for k in heatmap_fields), 'heatmap fields do not apply to this chart kind')
    if kind != 'paired':
        require('conditions' not in spec, 'conditions: only applies to paired observations')
    require(label(spec.get('xLabel')), 'xLabel: supply the actual variable and unit, or a truthful unitless label')
    if 'title' in spec:
        require(label(spec['title']), 'title: expected nonempty supplied text')
    if kind not in ['interval', 'paired']:
        require(label(spec.get('yLabel')), 'yLabel: supply the actual variable and unit, or a truthful unitless label')
    xs, ys = [], []
    if kind == 'heatmap':
        require(not any(k in spec for k in ['series', 'categories', 'rows', 'intervalLabel', 'reference', 'xDomain', 'yDomain']),
                'heatmap: use labelled cells and a color scale, not series, interval rows or numeric position domains')
        for key in ['rowLabels', 'columnLabels']:
            labels = spec.get(key)
            require(isinstance(labels, list) and 1 <= len(labels) <= 12 and all(label(v) for v in labels), key + ': use 1..12 supplied labels')
            require(len(set(labels)) == len(labels), key + ': labels must be unique')
        require(label(spec.get('colorLabel')), 'colorLabel: supply the measured variable and unit')
        values = spec.get('values')
        require(isinstance(values, list) and len(values) == len(spec['rowLabels']), 'values: require one complete row for every row label')
        observed, missing = [], False
        for row in values:
            require(isinstance(row, list) and len(row) == len(spec['columnLabels']), 'values: require one explicit cell for every column')
            for value in row:
                require(value is None or number(value), 'values: use finite measurements or explicit null, never inferred zeros')
                if value is None:
                    missing = True
                else:
                    observed.append(value)
        require(observed, 'values: no observed measurements to plot')
        if missing or 'missingLabel' in spec:
            require(label(spec.get('missingLabel')), 'missingLabel: state what the supplied null cells mean')
        if 'colorDomain' in spec:
            domain = spec['colorDomain']
            require(isinstance(domain, list) and len(domain) == 2 and all(number(v) for v in domain) and domain[0] < domain[1],
                    'colorDomain: use increasing finite endpoints')
            require(all(domain[0] <= v <= domain[1] for v in observed), 'colorDomain: would clip supplied measurements')
        if 'colorCenter' in spec:
            require(number(spec['colorCenter']) and 'colorDomain' in spec and spec['colorDomain'][0] < spec['colorCenter'] < spec['colorDomain'][1],
                    'colorCenter: requires a meaningful supplied centre inside an explicit colorDomain')
        return copy.deepcopy(spec)
    if kind == 'paired':
        require(not any(k in spec for k in ['series', 'categories', 'yDomain', 'yLabel', 'intervalLabel', 'reference']),
                'paired: use two conditions and identified rows; no independent series or inferred interval')
        conditions = spec.get('conditions')
        require(isinstance(conditions, list) and len(conditions) == 2 and all(label(v) for v in conditions) and conditions[0] != conditions[1],
                'conditions: supply two distinct condition names in before/after order')
        require(isinstance(spec.get('rows'), list) and 1 <= len(spec['rows']) <= 16, 'rows: use 1..16 explicitly paired observations')
        ids = set()
        for row in spec['rows']:
            fields(row, ['id', 'before', 'after'], '/rows')
            require(label(row.get('id')) and row['id'] not in ids, 'paired rows: unique supplied identity required')
            ids.add(row['id'])
            require(number(row.get('before')) and number(row.get('after')), 'paired rows: both observations must be finite; handle incomplete pairs explicitly in a custom plot')
            xs.extend([row['before'], row['after']])
    elif kind == 'interval':
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
        elif kind == 'observations':
            require(not any(k in spec for k in ['categories', 'xDomain']), 'observations: groups are categorical; do not supply categories or xDomain')
        else:
            require('categories' not in spec, 'categories: only applies to bar charts')
        for item in series:
            fields(item, ['name', 'values'] if kind in ['bar', 'observations'] else ['name', 'points'], '/series')
            require(label(item.get('name')) and item['name'] not in names, 'series: require unique supplied names')
            names.add(item['name'])
            if kind == 'bar':
                values = item.get('values')
                require(isinstance(values, list) and len(values) == len(spec['categories']) and all(number(v) for v in values), 'values: one finite value for each category; no inferred zeros')
                ys.extend(values)
            elif kind == 'observations':
                values = item.get('values')
                require(isinstance(values, list) and 1 <= len(values) <= 80 and all(number(v) for v in values),
                        'observations: supply 1..80 actual values per group; no missing-value removal, summary or imputation')
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
        release = re.match(r'^(\d+)\.(\d+)', matplotlib.__version__)
        if release is None or tuple(map(int, release.groups())) < (3, 6):
            raise RuntimeError('This plotting helper needs Matplotlib 3.6 or later for per-glyph font fallback and layout support. Select an available compatible plotting environment; an installed older version is not a working runtime for this route.')
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
        # A label can pass clipping checks while almost touching the canvas.
        # Reserve a modest outer margin for standalone report figures.
        fig.get_layout_engine().set(w_pad=.18, h_pad=.18)
        fig.set_facecolor('white')
        colors = ['#245C82', '#AC542B', '#3F7768', '#755C91']
        markers = ['o', 's', '^', 'D']
        kind = spec['kind']
        ax.set_xlabel(spec['xLabel'])
        if kind not in ['interval', 'paired']:
            ax.set_ylabel(spec['yLabel'])
        if spec.get('title'):
            ax.set_title(spec['title'], loc='left', pad=62 if kind in ['paired', 'heatmap'] else 22)
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
        elif kind == 'observations':
            values = [v for series in spec['series'] for v in series['values']]
            low, high = min(values), max(values)
            margin = (high-low)*.12 if low != high else max(abs(low)*.05, .5)
            ax.set_ylim(*spec.get('yDomain', [low-margin, high+margin]))
            ax.set_xlim(-.65, len(spec['series'])-.35)
            ax.set_xticks(range(len(spec['series'])), [s['name'] for s in spec['series']])
            # Placement shifts only along the categorical dimension. Measurements
            # remain exact. Work in rendered pixels so duplicate/nearby values
            # cannot silently conceal one another at a different axis scale.
            fig.canvas.draw()
            radius = 7.0
            for i, series in enumerate(spec['series']):
                placed, offsets = [], []
                centre = ax.transData.transform((i, low))[0]
                halfwidth = abs(ax.transData.transform((i+.35, low))[0]-centre)
                for value in series['values']:
                    py = ax.transData.transform((i,value))[1]
                    candidates = [0.0]
                    for step in range(1, int(halfwidth/(radius*2))+1):
                        candidates.extend([step*radius*2, -step*radius*2])
                    chosen = next((offset for offset in candidates
                                   if all((centre+offset-px)**2+(py-y)**2 >= (radius*2)**2-.001 for px,y in placed)), None)
                    require(chosen is not None, 'observations: points cannot fit without overlap; use a larger plot or an appropriate custom distribution layout')
                    placed.append((centre+chosen,py))
                    offsets.append(ax.transData.inverted().transform((centre+chosen,py))[0])
                ax.scatter(offsets,series['values'],s=36,color=colors[0],edgecolor='white',linewidth=.5,
                           gid='observations-'+str(i),zorder=3)
        elif kind == 'paired':
            from matplotlib.lines import Line2D
            for i, row in enumerate(spec['rows']):
                ax.plot([row['before'], row['after']], [i, i], color='#8A9AA4', linewidth=1.5, gid='pair-' + str(i))
                # Concentric shapes retain both conditions for unchanged pairs.
                ax.scatter([row['before']], [i], s=95, marker='o', facecolor='white', edgecolor=colors[0], linewidth=1.7, zorder=3)
                ax.scatter([row['after']], [i], s=34, marker='D', facecolor=colors[1], edgecolor='white', linewidth=.5, zorder=4)
            ax.set_yticks(range(len(spec['rows'])), [r['id'] for r in spec['rows']])
            ax.set_ylim(len(spec['rows']) - .35, -.65)
            ax.margins(x=.10)
            ax.legend(handles=[Line2D([], [], color='none', marker='o', markerfacecolor='white', markeredgecolor=colors[0], markersize=8, label=spec['conditions'][0]),
                               Line2D([], [], color='none', marker='D', markerfacecolor=colors[1], markeredgecolor='white', markersize=7, label=spec['conditions'][1])],
                      loc='lower left', bbox_to_anchor=(0, 1.02), ncols=2, frameon=False, borderaxespad=0)
        elif kind == 'interval':
            rows = spec['rows']
            for i, row in enumerate(rows):
                ax.errorbar(row['estimate'], i, xerr=[[row['estimate']-row['lower']], [row['upper']-row['estimate']]],
                            fmt='o', color=colors[0], markersize=6, capsize=5, elinewidth=1.8, gid='interval-' + str(i))
            ax.set_yticks(range(len(rows)), [r['label'] for r in rows])
            ax.set_ylim(len(rows)-.35, -.65)
            if 'reference' in spec:
                ax.axvline(spec['reference'], color='#8B6A56', linewidth=1.2, linestyle='--', label='参考值 ' + str(spec['reference']))
            ax.set_title(spec['intervalLabel'], loc='right', fontsize=13, pad=16)
        else:
            import numpy as np
            from matplotlib.colors import Normalize, TwoSlopeNorm
            from matplotlib.patches import Patch, Rectangle
            values = np.array([[math.nan if v is None else v for v in row] for row in spec['values']], dtype=float)
            low, high = spec.get('colorDomain', [float(np.nanmin(values)), float(np.nanmax(values))])
            if low == high:
                # A constant matrix still needs a finite legend; no data changes.
                margin = max(abs(low) * .05, .5)
                low, high = low - margin, high + margin
            center = spec.get('colorCenter')
            norm = Normalize(low, high) if center is None else TwoSlopeNorm(vcenter=center, vmin=low, vmax=high)
            cmap = plt.get_cmap('viridis' if center is None else 'coolwarm').with_extremes(bad='#E9ECEF')
            image = ax.pcolormesh(np.arange(values.shape[1]+1)-.5, np.arange(values.shape[0]+1)-.5,
                                  np.ma.masked_invalid(values), cmap=cmap, norm=norm,
                                  shading='flat', edgecolors='white', linewidth=1, rasterized=False, gid='measured-matrix')
            ax.set_xlim(-.5, values.shape[1]-.5)
            ax.set_ylim(values.shape[0]-.5, -.5)
            ax.set_xticks(range(len(spec['columnLabels'])), spec['columnLabels'])
            ax.set_yticks(range(len(spec['rowLabels'])), spec['rowLabels'])
            ax.tick_params(length=0, pad=10)
            for spine in ax.spines.values():
                spine.set_visible(False)
            ax.set_xticks([i - .5 for i in range(values.shape[1] + 1)], minor=True)
            ax.set_yticks([i - .5 for i in range(values.shape[0] + 1)], minor=True)
            ax.grid(which='minor', color='white', linewidth=2)
            ax.tick_params(which='minor', length=0)
            for r, row in enumerate(spec['values']):
                for c, value in enumerate(row):
                    if value is None:
                        ax.add_patch(Rectangle((c-.5, r-.5), 1, 1, facecolor='none', edgecolor='#9BA6AE', hatch='///', linewidth=0))
                    else:
                        rgb = cmap(norm(value))[:3]
                        linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
                        luminance = sum(v * w for v, w in zip(linear, [.2126, .7152, .0722]))
                        ax.text(c, r, str(value), ha='center', va='center',
                                color='black' if luminance > .179 else 'white', fontsize=12, gid='cell-value')
            colorbar = fig.colorbar(image, ax=ax, pad=.03, fraction=.05)
            if colorbar.solids is not None:
                colorbar.solids.set_rasterized(False)
            colorbar.set_label(spec['colorLabel'], labelpad=14)
            if np.isnan(values).any():
                ax.legend(handles=[Patch(facecolor='#E9ECEF', edgecolor='#9BA6AE', hatch='///', label=spec['missingLabel'])],
                          loc='lower left', bbox_to_anchor=(0, 1.02), frameon=False, borderaxespad=0)
        ax.set_axisbelow(True)
        if kind != 'heatmap':
            ax.grid(axis='x' if kind in ['interval', 'paired'] else 'y', color='#E1E7EB', linewidth=.7)
        if kind not in ['interval', 'heatmap', 'paired', 'observations']:
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
        artists = list(fig.texts)
        # Locators also create off-view ticks which Axis.draw deliberately
        # excludes. Inspect only ticks in the actual view, including exponents.
        for figure_axis in fig.axes:
            artists.extend([figure_axis.xaxis.label, figure_axis.yaxis.label, figure_axis.title,
                            figure_axis._left_title, figure_axis._right_title,
                            figure_axis.xaxis.get_offset_text(), figure_axis.yaxis.get_offset_text()])
            artists.extend(figure_axis.texts)
            for axis in [figure_axis.xaxis, figure_axis.yaxis]:
                low, high = sorted(axis.get_view_interval())
                for tick in axis.get_major_ticks():
                    if low-1e-10 <= tick.get_loc() <= high+1e-10:
                        artists.extend([tick.label1, tick.label2])
            legend = figure_axis.get_legend()
            if legend:
                artists.extend(legend.get_texts())
        outside = []
        outside_cell = []
        for artist in artists:
            if artist.get_visible() and artist.get_text():
                box = artist.get_window_extent(renderer)
                if box.x0 < -1 or box.y0 < -1 or box.x1 > width+1 or box.y1 > height+1:
                    outside.append(artist.get_text())
                if artist.get_gid() == 'cell-value':
                    c, r = artist.get_position()
                    first = ax.transData.transform((c-.5, r-.5))
                    second = ax.transData.transform((c+.5, r+.5))
                    left, right = sorted([first[0],second[0]])
                    bottom, top = sorted([first[1],second[1]])
                    if box.x0 < left+3 or box.x1 > right-3 or box.y0 < bottom+3 or box.y1 > top-3:
                        outside_cell.append(artist.get_text())
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
    checks = {**runtime, 'outside_canvas_text': outside, 'outside_cell_text': outside_cell, 'warnings': messages,
              'passed': not outside and not outside_cell and not messages,
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
