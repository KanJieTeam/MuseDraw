"""Two original report compositions extending existing Riso and Ink Wash families.

Data coordinates and font preparation come from plot_data. These are bounded,
editable examples, not a universal report builder or aesthetic evaluator.
"""
import argparse
import html
import json
import re
from pathlib import Path
import shutil

from plot_data import build_figure, validate as validate_plot

SKILL = Path(__file__).resolve().parents[1]
ASSETS = SKILL / 'assets/visual-language'


def esc(value):
    return html.escape(str(value), quote=True)


def analyse(spec):
    layout = spec.get('layout')
    expected = {'rhythm-report': 'riso', 'peak-report': 'ink-wash'}
    if layout not in expected or spec.get('theme') != expected[layout]:
        raise ValueError('Choose rhythm-report/riso or peak-report/ink-wash; other content needs a new composition.')
    for key in ('publication', 'edition', 'intro', 'chartTitle', 'xLabel', 'yLabel', 'unit', 'xUnit', 'limitation'):
        if not isinstance(spec.get(key), str) or not spec[key].strip():
            raise ValueError(f'{key}: explicit nonempty text required')
    if not isinstance(spec.get('title'), list) or not 1 <= len(spec['title']) <= 2 or not all(isinstance(t, str) and t.strip() for t in spec['title']):
        raise ValueError('Supply one or two headline lines.')
    data = validate_plot({key: spec[key] for key in ('xLabel', 'yLabel', 'series')} | {'kind': 'line'})
    if len(data['series']) != 2:
        raise ValueError('These compositions compare exactly two supplied series.')
    series = data['series']
    if [p['x'] for p in series[0]['points']] != [p['x'] for p in series[1]['points']]:
        raise ValueError('The two series must share supplied observation times.')
    peaks = []
    for item in series:
        if any(p['y'] is None or p['y'] < 0 for p in item['points']):
            raise ValueError('A complete nonnegative observation window is required for the displayed peak summaries.')
        peak = max(p['y'] for p in item['points'])
        times = [p['x'] for p in item['points'] if p['y'] == peak]
        peaks.append({'name': item['name'], 'value': peak, 'times': times})
    if layout == 'rhythm-report':
        if any(len(p['times']) != 1 for p in peaks):
            raise ValueError('Peak-time gap needs a unique peak per series; use another summary for a plateau.')
        derived = {'peaks': peaks, 'peak_time_gap': abs(peaks[1]['times'][0] - peaks[0]['times'][0])}
    else:
        if peaks[0]['value'] <= 0:
            raise ValueError('Relative peak change requires a positive reference peak.')
        if not spec.get('illustration') or not spec.get('illustrationNote'):
            raise ValueError('An actual illustration and its factual role are required.')
        derived = {'peaks': peaks, 'relative_peak_change_pct': (peaks[1]['value'] / peaks[0]['value'] - 1) * 100}
    return data, derived


def chart(data, theme, out, layout):
    import matplotlib.pyplot as plt
    from matplotlib.text import Text
    fig, ax, runtime = build_figure(data, 1800, 1000)
    fig.set_layout_engine(None)
    palette = theme['palette']
    colors = [palette['ink'], palette['accent']]
    fig.set_size_inches((1240 if layout == 'rhythm-report' else 990) / 150, (700 if layout == 'rhythm-report' else 570) / 150)
    fig.subplots_adjust(left=.13 if layout == 'rhythm-report' else .19, right=.97, top=.96, bottom=.19)
    bg = palette['paper']
    fig.set_facecolor(bg)
    ax.set_facecolor(bg)
    for line, color in zip(ax.lines, colors):
        line.set_color(color)
        line.set_linewidth(3)
        line.set_markersize(5)
    if layout == 'rhythm-report':
        # Translucent ink fields share zero; they are overprinted, not stacked.
        # Actual line artists retain every supplied coordinate and stay sharp.
        for series, color in zip(data['series'], colors):
            x = [p['x'] for p in series['points']]
            y = [p['y'] for p in series['points']]
            ax.fill_between(x, 0, y, facecolor=color, alpha=.12, zorder=0)
            peak = max(y)
            peak_x = [p['x'] for p in series['points'] if p['y'] == peak][0]
            ax.vlines(peak_x, 0, peak, colors=color, linestyles=(0, (2, 5)), alpha=.5, linewidth=1)
        ax.set_xticks([p['x'] for p in data['series'][0]['points']])
    ax.set_ylim(bottom=0)
    ax.get_legend().remove()
    ax.tick_params(colors=palette['ink'], labelsize=14, length=0, pad=10)
    ax.grid(axis='y', color=palette['ink'], alpha=.13, linewidth=.7)
    ax.xaxis.label.set_color(palette['ink'])
    ax.yaxis.label.set_color(palette['ink'])
    ax.xaxis.label.set_fontsize(14)
    ax.yaxis.label.set_fontsize(14)
    for spine in ax.spines.values():
        spine.set_visible(False)
    for text in fig.findobj(match=Text):
        text.set_fontfamily(runtime['font_families'])
    fig.savefig(out / 'chart.png', dpi=150)
    import matplotlib
    with matplotlib.rc_context({'svg.fonttype': 'none', 'svg.hashsalt': 'musedraw-visual-report'}):
        fig.savefig(out / 'chart.svg')
    svg = (out / 'chart.svg').read_text(encoding='utf-8')
    # Match the raster canvas while preserving native vector coordinates and live text.
    svg = re.sub(r'<!DOCTYPE[^>]*>', '', svg, count=1, flags=re.S)
    width, height = fig.canvas.get_width_height()
    def pixel_canvas(match):
        tag = match.group(0)
        box = [float(v) for v in re.search(r'viewBox="([^"]+)"', tag).group(1).split()]
        tag = re.sub(r'\bwidth="[^"]+"', f'width="{width}"', tag, count=1)
        tag = re.sub(r'\bheight="[^"]+"', f'height="{height}"', tag, count=1)
        tag = re.sub(r'viewBox="[^"]+"', f'viewBox="0 0 {width} {height}"', tag, count=1)
        return tag + f'<g transform="scale({width / box[2]:.12g} {height / box[3]:.12g})">'
    svg = re.sub(r'<svg\b[^>]*>', pixel_canvas, svg, count=1, flags=re.S)
    svg = svg.rsplit('</svg>', 1)[0] + '</g></svg>\n'
    (out / 'chart.svg').write_text(svg, encoding='utf-8')
    runtime['initial_helper_size'] = runtime['size']
    runtime['size'] = list(fig.canvas.get_width_height())
    plt.close(fig)
    return runtime


def document(spec, values, theme):
    palette = theme['palette']
    variables = ';'.join(f'--{key}:{palette[key]}' for key in ('paper', 'ink', 'accent', 'muted'))
    title = '<br>'.join(map(esc, spec['title']))
    legend = ''.join(f'<span><i style="background:{palette[color]}"></i>{esc(item["name"])}</span>' for item, color in zip(spec['series'], ('ink', 'accent')))
    rows = ''.join(f'<div class="peak-row"><span>{esc(p["name"])}</span><strong>{p["value"]:g}<small>{esc(spec["unit"])}</small></strong><em>峰值时刻 {esc(" / ".join(f"{t:g}" for t in p["times"]))} {esc(spec["xUnit"])}</em></div>' for p in values['peaks'])
    header = f'<header class="masthead"><span>{esc(spec["publication"])}</span><span class="mono">{esc(spec["edition"])}</span></header>'
    chart_html = f'<h2 class="chart-title">{esc(spec["chartTitle"])}</h2><div class="legend">{legend}</div><img class="chart" src="chart.png" alt="{esc(spec["chartTitle"])}">'
    if spec['layout'] == 'rhythm-report':
        body = f'''<main class="report rhythm" style="{variables}">{header}
        <section class="title-zone"><p class="section-label mono">A COMMON ROOM / TWO DAILY RHYTHMS</p><h1>{title}</h1></section>
        <section class="metric-zone"><div class="metric">{values['peak_time_gap']:g}<small>{esc(spec['xUnit'])}</small></div><p class="metric-label">两条示例曲线的峰值时刻差</p><p class="intro">{esc(spec['intro'])}</p></section>
        <section class="data-zone">{chart_html}</section><section class="peak-zone">{rows}</section>
        <footer>{esc(spec['limitation'])}<span>MuseDraw / Riso</span></footer></main>'''
    else:
        body = f'''<main class="report wash" style="{variables}"><section class="scene-half">{header}
        <p class="section-label">城市雨洪 · 概念与过程</p><h1>{title}</h1><p class="intro">{esc(spec['intro'])}</p>
        <img class="garden" src="illustration.png" alt="{esc(spec['illustrationNote'])}"><p class="art-note">{esc(spec['illustrationNote'])}</p></section>
        <section class="evidence-half"><p class="section-label mono">B / PROCESS & EVIDENCE</p><div class="metric">{values['relative_peak_change_pct']:+.1f}<small>%</small></div>
        <p class="metric-label">{esc(spec['series'][1]['name'])}相对{esc(spec['series'][0]['name'])}的峰值变化</p>
        <div class="peak-zone">{rows}</div><div class="data-zone">{chart_html}</div><p class="limitation">{esc(spec['limitation'])}</p></section>
        <footer>虚构数据与想象场地分别标明，图表由实际输入绘制。<span>MuseDraw / Ink Wash</span></footer></main>'''
    return f'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>{esc(" ".join(spec["title"]))}</title><link rel="stylesheet" href="report.css"></head><body>{body}</body></html>'


def build(spec, out, base):
    data, values = analyse(spec)
    theme = json.loads((SKILL / 'themes' / (spec['theme'] + '.json')).read_text(encoding='utf-8'))
    illustration = None
    if spec['layout'] == 'peak-report':
        illustration = (Path(base) / spec['illustration']).resolve()
        if not illustration.is_file():
            raise ValueError('Illustration missing; do not manufacture a placeholder.')
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    try:
        runtime = chart(data, theme, out, spec['layout'])
        if illustration:
            shutil.copyfile(illustration, out / 'illustration.png')
        shutil.copyfile(ASSETS / 'report.css', out / 'report.css')
        for name, value in (('data.json', spec), ('derived.json', values), ('runtime.json', runtime)):
            (out / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (out / 'index.html').write_text(document(spec, values, theme), encoding='utf-8')
    except Exception as error:
        (out / 'failure.json').write_text(json.dumps({'completed': False, 'error': str(error)}, ensure_ascii=False), encoding='utf-8')
        raise
    return out / 'index.html'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    print(build(json.loads(args.input.read_text(encoding='utf-8-sig')), args.out, args.input.resolve().parent))
