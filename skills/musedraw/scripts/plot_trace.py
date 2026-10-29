"""Plot supplied example span intervals; interval length is duration, not a CI."""
from pathlib import Path
import argparse
import json
import math
import sys

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL / 'scripts'))
from plot_data import build_figure
from matplotlib.text import Text
import matplotlib.pyplot as plt


def analyse(data):
    spans = data.get('spans', [])
    if not isinstance(spans, list) or not 1 <= len(spans) <= 10:
        raise ValueError('Supply 1–10 spans for this reading size.')
    ids = [s.get('id') for s in spans]
    if any(not isinstance(i, str) or not i for i in ids) or len(set(ids)) != len(ids):
        raise ValueError('Span IDs must be nonempty and unique.')
    if data.get('root') not in ids:
        raise ValueError('The root must identify one supplied span.')
    for span in spans:
        for key in ('start', 'end'):
            value = span.get(key)
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError('Every span needs finite start and end times.')
        if span['start'] < 0 or span['end'] < span['start']:
            raise ValueError('Span end cannot precede its nonnegative start.')
        if span.get('kind') not in ('teal', 'amber', 'violet') or not span.get('label'):
            raise ValueError('Use a labelled supplied signal class.')
    root = next(s for s in spans if s['id'] == data['root'])
    if root['start'] != 0 or root['end'] <= 0:
        raise ValueError('Times are relative to a root starting at zero, with positive duration.')
    if any(s['end'] > root['end'] for s in spans):
        raise ValueError('Child spans cannot extend beyond the supplied root.')
    return {'root_duration_ms': root['end'],
            'durations_ms': {s['id']: s['end'] - s['start'] for s in spans}}


def plot(data, destination, compact=False):
    result = analyse(data)
    destination = Path(destination)
    if destination.exists():
        raise FileExistsError('Choose a new chart path; preserve the original.')
    palette = json.loads((SKILL / 'themes/observatory.json').read_text(encoding='utf-8'))['palette']
    spec = {'kind': 'scatter', 'series': [{'name': '起止时间', 'points': [
        {'x': value, 'y': i} for i, span in enumerate(data['spans'])
        for value in (span['start'], span['end'])]}], 'xLabel': '相对请求开始 / ms', 'yLabel': '调用'}
    fig, old, runtime = build_figure(spec, 1600, 800)
    fig.set_layout_engine(None)
    old.remove()
    ax = fig.add_subplot()
    fig.set_size_inches(4.7, 5.0) if compact else fig.set_size_inches(10, 3.2)
    fig.set_facecolor(palette['bg'])
    ax.set_facecolor(palette['bg'])
    fig.subplots_adjust(left=.24, right=.80, top=.95, bottom=.15) if compact else fig.subplots_adjust(left=.16, right=.96, top=.94, bottom=.24)
    for i, span in enumerate(data['spans']):
        color = palette[span['kind']]
        ax.plot([span['start'], span['end']], [i, i], color=color, linewidth=12, solid_capstyle='butt')
        ax.text(span['end'] + result['root_duration_ms'] / 60, i,
                f'{result["durations_ms"][span["id"]]:g} ms', va='center', color=color, fontsize=11)
    ax.set_yticks(range(len(data['spans'])), [s['label'] for s in data['spans']])
    ax.set_ylim(len(data['spans']) - .5, -.5)
    ax.set_xlim(0, result['root_duration_ms'] * 1.16)
    ax.tick_params(colors=palette['muted'], length=0, pad=10, labelsize=13 if compact else 11)
    if compact:
        from matplotlib.ticker import MaxNLocator
        ax.xaxis.set_major_locator(MaxNLocator(nbins=3))
    ax.set_xlabel('相对请求开始 / ms', color=palette['muted'], fontsize=11, labelpad=13)
    ax.grid(axis='x', color=palette['line'], linewidth=.6)
    ax.set_axisbelow(True)
    for spine in ax.spines.values():
        spine.set_visible(False)
    for text in fig.findobj(match=Text):
        text.set_fontfamily(runtime['font_families'])
    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(destination, dpi=150)
    finally:
        plt.close(fig)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('data', type=Path)
    parser.add_argument('--out', type=Path, required=True, help='A fresh PNG path')
    parser.add_argument('--compact', action='store_true', help='Recompose the same intervals for a narrow reading field')
    args = parser.parse_args()
    print(json.dumps(plot(json.loads(args.data.read_text(encoding='utf-8-sig')), args.out, compact=args.compact), ensure_ascii=False))
