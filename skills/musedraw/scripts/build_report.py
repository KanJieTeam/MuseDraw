"""Build two composed report seeds; render the HTML with the host browser.

These are original example compositions, not a general report layout solver.
The plotting route remains Matplotlib; typography stays editable HTML/CSS.
"""
import argparse
import html
import json
import math
from pathlib import Path
import shutil

from plot_data import build_figure

ASSETS = Path(__file__).resolve().parents[1] / 'assets/report-spreads'
PALETTE = ['#cf5b3e', '#8d9691', '#406c53']


def esc(value):
    return html.escape(str(value), quote=True)


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def validate(spec):
    layout = spec.get('layout')
    if layout not in ['scene-report', 'ledger-report']:
        raise ValueError('Choose scene-report or ledger-report; use a custom composition for other content.')
    for key in ['publication', 'edition', 'topic', 'intro', 'unit', 'chartTitle', 'limitation']:
        if not isinstance(spec.get(key), str) or not spec[key].strip():
            raise ValueError(f'{key}: non-empty supplied text required')
    if not isinstance(spec.get('title'), list) or not 1 <= len(spec['title']) <= 2 or not all(isinstance(x, str) and x.strip() for x in spec['title']):
        raise ValueError('title: one or two explicit headline lines required')
    if layout == 'scene-report':
        if not all(isinstance(spec.get(k),str) and spec[k].strip() for k in ['xLabel','yLabel']):
            raise ValueError('Explicit xLabel and yLabel with the actual units required')
        if not 2 <= len(spec.get('series', [])) <= 3 or not finite(spec.get('focusX')):
            raise ValueError('scene-report: two or three series and a numeric focusX required')
        if not isinstance(spec.get('focusLabel'), str) or not spec['focusLabel'].strip():
            raise ValueError('focusLabel required')
        if not spec.get('illustration') or not spec.get('illustrationNote'):
            raise ValueError('Supply an actual illustration and its factual role; no placeholder art.')
        for series in spec['series']:
            points = series.get('points', [])
            matches = [p for p in points if p.get('x') == spec['focusX']]
            if len(matches) != 1 or not finite(matches[0].get('y')):
                raise ValueError('Every focus observation must exist once and be numeric; no imputation.')
        # The normal plotting helper validates order, missingness and actual coordinates.
    else:
        items = spec.get('items', [])
        if not 2 <= len(items) <= 6:
            raise ValueError('ledger-report supports two to six supplied budget categories')
        if not all(isinstance(x.get('name'), str) and x['name'].strip() and finite(x.get('value')) and x['value'] >= 0 for x in items):
            raise ValueError('Budget items require names and nonnegative finite allocations')
        if len({x['name'] for x in items}) != len(items):
            raise ValueError('Budget category names must be distinct')
        if not finite(spec.get('total')) or spec['total'] <= 0 or not finite(spec.get('reserve')) or spec['reserve'] < 0:
            raise ValueError('Positive total and nonnegative reserve required')
        if not math.isclose(sum(x['value'] for x in items) + spec['reserve'], spec['total'], rel_tol=1e-10, abs_tol=1e-9):
            raise ValueError('Allocations + reserve must equal total; no silent rebalancing')
        if len(spec.get('notes', [])) != 2 or not all(isinstance(n.get('title'), str) and isinstance(n.get('body'), str) for n in spec['notes']):
            raise ValueError('Two supplied explanatory notes required')


def chart(spec, out):
    import matplotlib.pyplot as plt
    if spec['layout'] == 'scene-report':
        data = {'kind':'line', 'xLabel':spec['xLabel'], 'yLabel':spec['yLabel'], 'series':spec['series']}
        fig, ax, runtime = build_figure(data, 1800, 700)
        fig.set_size_inches(1100/150,315/150)
        for line, color in zip(ax.lines, PALETTE):
            line.set_color(color)
            line.set_linewidth(2.6)
            line.set_markersize(4)
        ax.legend().remove()
        focus = [next(p['y'] for p in x['points'] if p['x'] == spec['focusX']) for x in spec['series']]
        result = {'focusX':spec['focusX'], 'focus_values':focus, 'spread':max(focus)-min(focus)}
    else:
        # Reuse font/runtime preparation; author this specific horizontal comparison with numeric Matplotlib axes.
        data = {'kind':'bar', 'xLabel':'类别', 'yLabel':spec['unit'], 'categories':[x['name'] for x in spec['items']], 'series':[{'name':'配置', 'values':[x['value'] for x in spec['items']]}]}
        fig, old, runtime = build_figure(data, 1600, 800)
        fig.set_size_inches(1060/150,500/150)
        old.remove()
        ax = fig.add_subplot(111)
        items = spec['items'] + [{'name':'未分配储备', 'value':spec['reserve']}]
        values = [x['value'] for x in items]
        colors = ['#d9e1af'] * len(spec['items']) + ['#69877a']
        bars = ax.barh(range(len(items)), values, height=.53, color=colors)
        ax.set_yticks(range(len(items)), [x['name'] for x in items])
        ax.invert_yaxis()
        ax.set_xlim(0, max(values) * 1.28)
        ax.set_xlabel(spec['unit'])
        ax.grid(axis='x', color='#496358', alpha=.55, linewidth=.65)
        ax.set_axisbelow(True)
        for bar, item in zip(bars, items):
            ax.text(item['value'] + max(values)*.025, bar.get_y()+bar.get_height()/2, f"{item['value']:g}  /  {item['value']/spec['total']:.1%}", ha='left',va='center',fontsize=13,color='#f3f3e9')
        result = {'allocated':sum(x['value'] for x in spec['items']), 'reserve':spec['reserve'], 'total':spec['total'], 'reserve_fraction':spec['reserve']/spec['total']}
    bg = '#142f2a' if spec['layout'] == 'ledger-report' else '#f0f0e9'
    ink = '#f3f3e9' if spec['layout'] == 'ledger-report' else '#183c35'
    fig.set_facecolor(bg); ax.set_facecolor(bg)
    ax.tick_params(axis='both', colors=ink, labelsize=12, length=0, pad=10)
    ax.xaxis.label.set_color(ink);ax.yaxis.label.set_color(ink)
    ax.xaxis.label.set_fontsize(12);ax.yaxis.label.set_fontsize(12)
    for spine in ax.spines.values():spine.set_visible(False)
    for label in ax.get_xticklabels()+ax.get_yticklabels():label.set_color(ink)
    from matplotlib.text import Text
    for text in fig.findobj(match=Text):text.set_fontfamily(runtime['font_families'])
    fig.savefig(out/'chart.png',dpi=150)
    fig.savefig(out/'chart.svg')
    runtime['initial_helper_size']=runtime['size']
    runtime['size']=list(fig.canvas.get_width_height())
    plt.close(fig)
    return result, runtime


def document(spec, values):
    heading='<br>'.join(esc(x) for x in spec['title'])
    mast=f'<div class="masthead"><strong>{esc(spec["publication"])}</strong><span class="folio">{esc(spec["edition"])}</span></div>'
    if spec['layout'] == 'scene-report':
        legend=''.join(f'<span><i class="swatch" style="background:{color}"></i>{esc(s["name"])}</span>' for s,color in zip(spec['series'],PALETTE))
        body=f'''<section class="report">{mast}<div class="lead"><div class="lead-copy"><p class="topic">{esc(spec['topic'])}</p><h1>{heading}</h1><p class="deck">{esc(spec['intro'])}</p></div><img class="hero-art" src="illustration.png" alt="{esc(spec['illustrationNote'])}"></div><div class="evidence"><div><div class="metric-line"><span class="metric">{values['spread']:.1f}</span><span class="unit">{esc(spec['unit'])}</span></div><p class="metric-caption">{esc(spec['focusLabel'])}</p><p class="detail">{esc(spec['limitation'])}</p></div><div><h2 class="plot-title">{esc(spec['chartTitle'])}</h2><div class="legend">{legend}</div><img class="plot" src="chart.png" alt="{esc(spec['chartTitle'])}"></div></div><footer class="footer"><span>{esc(spec['illustrationNote'])} 数据、图表和文字分别保留源文件。</span><span>MuseDraw / 01</span></footer></section>'''
    else:
        notes=''.join(f'<div><strong>{esc(n["title"])}</strong><span class="quiet">{esc(n["body"])}</span></div>' for n in spec['notes'])
        body=f'''<section class="report ledger">{mast}<p class="topic" style="margin-top:32px">{esc(spec['topic'])}</p><h1 class="headline">{heading}</h1><div class="budget-grid"><div><div class="budget-total">{spec['total']:g}<small>{esc(spec['unit'])}</small></div><p class="budget-meaning">总预算</p><p class="deck">{esc(spec['intro'])}</p><div class="reserve-box"><div><div class="reserve-label quiet">已配置 / {esc(spec['unit'])}</div><strong>{values['allocated']:g}</strong></div><div><div class="reserve-label quiet">储备 / {esc(spec['unit'])}</div><strong>{spec['reserve']:g}</strong></div></div></div><div><h2 class="plot-title">{esc(spec['chartTitle'])}</h2><img class="budget-chart" src="chart.png" alt="{esc(spec['chartTitle'])}"><div class="budget-note">{notes}</div></div></div><footer class="footer"><span>{esc(spec['limitation'])}</span><span>MuseDraw / 02</span></footer></section>'''
    return f'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>{esc(" ".join(spec["title"]))}</title><link rel="stylesheet" href="seed.css"></head><body>{body}</body></html>'


def build(spec, out, base):
    validate(spec)
    illustration = None
    if spec['layout'] == 'scene-report':
        illustration = (base/spec['illustration']).resolve()
        if not illustration.is_file():raise ValueError('Illustration asset missing; supply real artwork before building.')
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    try:
        values, runtime = chart(spec, out)
        if illustration:shutil.copy2(illustration,out/'illustration.png')
        shutil.copy2(ASSETS/'seed.css',out/'seed.css')
        (out/'input.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (out/'derived.json').write_text(json.dumps(values,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (out/'runtime.json').write_text(json.dumps(runtime,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (out/'index.html').write_text(document(spec,values),encoding='utf-8')
    except Exception as error:
        (out/'failure.json').write_text(json.dumps({'error':str(error),'completed':False},ensure_ascii=False),encoding='utf-8')
        raise
    return out/'index.html'


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input',type=Path)
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    spec=json.loads(args.input.read_text(encoding='utf-8-sig'))
    print(build(spec,args.out,args.input.resolve().parent))
