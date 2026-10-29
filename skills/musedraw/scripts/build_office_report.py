"""Three original, bounded office/report compositions with editable typography.

This is a production example, not a universal layout engine or aesthetic judge.
All supplied demonstration facts are fictional.
"""
from pathlib import Path
import argparse
import math
import datetime as dt
import html
import json
import sys
import shutil

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL / 'scripts'))
from plot_data import build_figure
import matplotlib.pyplot as plt
from matplotlib.text import Text

ASSETS = SKILL / 'assets/visual-language'

def esc(x): return html.escape(str(x), quote=True)

def setup(spec, width, height, palette):
    fig, ax, runtime = build_figure(spec, 1800, 1000)
    fig.set_layout_engine(None)
    fig.set_size_inches(width / 150, height / 150)
    bg = palette.get('paper', palette.get('bg', '#FFFFFF'))
    fig.set_facecolor(bg); ax.set_facecolor(bg)
    fig.subplots_adjust(left=.16, right=.98, top=.95, bottom=.18)
    ax.tick_params(labelsize=13, colors=palette['ink'], length=0, pad=9)
    for spine in ax.spines.values(): spine.set_visible(False)
    ax.xaxis.label.set_color(palette['ink']); ax.yaxis.label.set_color(palette['ink'])
    ax.xaxis.label.set_fontsize(13); ax.yaxis.label.set_fontsize(13)
    return fig, ax, runtime

def save(fig, runtime, folder, name):
    for text in fig.findobj(match=Text): text.set_fontfamily(runtime['font_families'])
    fig.savefig(folder / (name + '.png'), dpi=150)
    plt.close(fig)

def shell(s, p, body, klass):
    variables = ';'.join(f'--{k}:{v}' for k,v in p.items())
    header = f'<header><span>{esc(s["publication"])}</span><span class="mono">{esc(s["edition"])}</span></header>'
    footer = f'<footer>{esc(s["note"])}<span class="mono">MuseDraw / {esc(s["theme"])}</span></footer>'
    return f'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>{esc(" ".join(s["title"]))}</title><link rel="stylesheet" href="study.css"></head><body><main class="report {klass}" style="{variables}">{header}{body}{footer}</main></body></html>'

def business(s, p, out):
    surplus = [a-b for a,b in zip(s['revenue'],s['cost'])]
    rates = [100*b/a for a,b in zip(s['revenue'],surplus)]
    change = rates[-1]-rates[-2]
    data={'kind':'bar','categories':s['months'],'series':[{'name':'收入','values':s['revenue']},{'name':'示例成本','values':s['cost']}],'yLabel':s['unit'],'xLabel':'月份'}
    fig, ax, runtime = setup(data,1080,570,p)
    for container,color in zip(ax.containers,[p['ink'],p['muted']]):
        for bar in container:bar.set_facecolor(color)
    ax.get_legend().remove();ax.grid(axis='y',color=p['ink'],alpha=.12);ax.set_axisbelow(True)
    save(fig,runtime,out,'totals')
    rate_spec={'kind':'line','series':[{'name':'结余率','points':[{'x':i+1,'y':v} for i,v in enumerate(rates)]}],'xLabel':'月份','yLabel':'结余率 / %','yDomain':[min(0,min(rates))*1.1,max(1,max(rates)*1.15)]}
    fig, ax, runtime=setup(rate_spec,580,340,p)
    fig.subplots_adjust(left=.25,right=.99,top=.95,bottom=.2)
    ax.lines[0].set_color(p['accent']);ax.get_legend().remove();ax.set_xticks(range(1,len(s['months'])+1),s['months']);ax.grid(axis='y',color=p['ink'],alpha=.1)
    save(fig,runtime,out,'rates')
    rows=''.join(f'<tr><td>{esc(label)}</td><td>{value:g}<small>{esc(s["unit"])}</small></td></tr>' for label,value in [('本月收入',s['revenue'][-1]),('本月示例成本',s['cost'][-1]),('本月结余',surplus[-1])])
    body=f'''<div class="headline"><p class="eyebrow">{esc(s["periodLabel"])} / 读数与变化</p><h1>{'<br>'.join(map(esc,s['title']))}</h1></div><section class="business-main"><h2>A / 收入与成本，保持同一尺度</h2><div class="legend"><span><i style="background:{p['ink']}"></i>收入</span><span><i style="background:{p['muted']}"></i>示例成本</span></div><img src="totals.png" alt="{len(s['months'])}个月收入与成本的零基线比较"></section><aside class="business-side"><p class="metric-label">本月结余率</p><p class="metric">{rates[-1]:.1f}<small>%</small></p><p class="accent">较上月 {change:+.1f} 个百分点</p><table>{rows}</table><h2>B / 结余率的变化</h2><img src="rates.png" alt="从实际收入和成本计算的结余率"></aside>'''
    return shell(s,p,body,'business'),{'surplus':surplus,'surplus_rates_pct':rates,'last_change_pp':change}

def project(s,p,out):
    start=dt.date.fromisoformat(s['start']);asof=dt.date.fromisoformat(s['asOf'])
    days=lambda x:(dt.date.fromisoformat(x)-start).days
    total=(dt.date.fromisoformat(s['end'])-start).days
    earned=100*sum(w['weight']*w['completion'] for w in s['work'])/sum(w['weight'] for w in s['work'])
    fig,old,runtime=setup({'kind':'scatter','series':[{'name':'日期','points':[{'x':0,'y':0},{'x':total,'y':3}]}],'xLabel':'从起点经过的天数 / d','yLabel':'里程碑序号'},1080,390,p)
    old.remove();ax=fig.add_subplot();ax.set_facecolor(p['bg']);fig.subplots_adjust(left=.18,right=.97,top=.92,bottom=.2)
    late=[]
    overdue=[m['name'] for m in s['milestones'] if not m.get('actual') and dt.date.fromisoformat(m['planned'])<asof]
    for i,m in enumerate(s['milestones']):
        planned=days(m['planned']);ax.scatter(planned,i,s=150,marker='D',facecolor=p['yellow'],edgecolor=p['ink'],linewidth=1.2,zorder=4)
        if m.get('actual'):
            actual=days(m['actual']);delay=actual-planned
            ax.plot([planned,actual],[i,i],color=p['red'] if delay>0 else p['ink'],linewidth=4,zorder=2)
            ax.scatter(actual,i,s=80,marker='o',facecolor=p['blue'],edgecolor=p['white'],linewidth=1,zorder=5)
            if delay>0:ax.text(actual+.6,i,f'+{delay}天',va='center',color=p['red'],fontsize=13);late.append({'name':m['name'],'days':delay})
    ax.axvline((asof-start).days,color=p['ink'],linewidth=1,linestyle=(0,(4,4)),alpha=.5)
    ax.set_yticks(range(len(s['milestones'])),[m['name'] for m in s['milestones']]);ax.set_ylim(len(s['milestones'])-.4,-.7);ax.set_xlim(-1,total+1)
    ticks=sorted(set([0,total]+[round(total*i/4) for i in range(1,4)]));ax.set_xticks(ticks,[(start+dt.timedelta(days=x)).strftime('%m.%d') for x in ticks]);ax.tick_params(length=0,labelsize=13,pad=10)
    for spine in ax.spines.values():spine.set_visible(False)
    ax.grid(axis='x',alpha=.12);save(fig,runtime,out,'timeline')
    values=[w['weight']*w['completion'] for w in s['work']]
    fig,old,runtime=setup({'kind':'bar','categories':[w['name'] for w in s['work']],'series':[{'name':'权重','values':[w['weight'] for w in s['work']]}],'xLabel':'工作包','yLabel':'权重点'},1080,350,p)
    old.remove();ax=fig.add_subplot();ax.set_facecolor(p['bg']);fig.subplots_adjust(left=.12,right=.95,top=.95,bottom=.29)
    ax.barh(range(len(s['work'])),[w['weight'] for w in s['work']],color=p['white'],edgecolor=p['ink'],height=.5)
    ax.barh(range(len(s['work'])),values,color=p['blue'],height=.5)
    ax.set_yticks(range(len(s['work'])),[w['name'] for w in s['work']]);ax.invert_yaxis();ax.set_xlim(0,max(w['weight'] for w in s['work'])*1.22);ax.set_xlabel('给定工作包权重 / 点',fontsize=12);ax.tick_params(length=0,labelsize=13,pad=10)
    for i,(w,v) in enumerate(zip(s['work'],values)):ax.text(w['weight']+.5,i,f'{v:g}/{w["weight"]:g}',va='center',fontsize=12)
    for spine in ax.spines.values():spine.set_visible(False)
    ax.grid(axis='x',alpha=.1);ax.set_axisbelow(True);save(fig,runtime,out,'work')
    overdue_note=f'另有 {len(overdue)} 个节点已过计划日期、尚未完成。' if overdue else ''
    body=f'''<aside class="project-voice"><p class="eyebrow">STATE OF THE WORK</p><h1>{'<br>'.join(map(esc,s['title']))}</h1><div class="progress-disc"><strong>{earned:g}<small>%</small></strong></div><p class="progress-label">按给定权重计算的工作完成度</p></aside><section class="project-main"><div class="project-heading"><h2>截至 {asof:%m.%d}，把交接放回日期。</h2><p>已完成 {sum(bool(m.get('actual')) for m in s['milestones'])} / {len(s['milestones'])} 个里程碑；{len(late)} 个已完成节点晚于计划。{overdue_note}</p></div><div class="timeline"><h3>A / 计划与实际交接</h3><p class="timeline-legend">◆ 计划日期　<span>● 实际完成</span>　虚线为状态截至日</p><img src="timeline.png" alt="各里程碑计划与实际日期，未完成节点没有实际读数"></div><div class="work"><h3>B / 完成的是哪些工作</h3><img src="work.png" alt="工作包给定权重和已经完成的权重点"></div></section>'''
    return shell(s,p,body,'project'),{'earned_weight_pct':earned,'completed_milestones':sum(bool(m.get('actual')) for m in s['milestones']),'late_completed':late,'overdue_unfinished':overdue}

def research(s,p,out):
    delta=[r['after']-r['before'] for r in s['rows']]
    spec={'kind':'paired','conditions':s['conditions'],'rows':s['rows'],'xLabel':s['measure']+' / '+s['unit'],'xDomain':[0,max(max(r['before'],r['after']) for r in s['rows'])*1.16]}
    fig,ax,runtime=setup(spec,1050,590,p);fig.subplots_adjust(left=.12,right=.95,top=.9,bottom=.21)
    from matplotlib.lines import Line2D
    for i, item in enumerate(ax.collections):
        if i % 2 == 0: item.set_edgecolor(p['blue'])
        else: item.set_facecolor(p['orange'])
    ax.legend(handles=[Line2D([],[],marker='o',color='none',markerfacecolor='white',markeredgecolor=p['blue'],markersize=8,label=s['conditions'][0]),Line2D([],[],marker='D',color='none',markerfacecolor=p['orange'],markersize=6,label=s['conditions'][1])],loc='lower left',bbox_to_anchor=(0,1.02),ncols=2,frameon=False,borderaxespad=0)
    save(fig,runtime,out,'paired')
    spec={'kind':'bar','categories':[r['id'] for r in s['rows']],'series':[{'name':'变化量','values':delta}],'xLabel':'样本','yLabel':s['unit']}
    fig,old,runtime=setup(spec,570,590,p);old.remove();ax=fig.add_subplot();fig.subplots_adjust(left=.12,right=.83,top=.9,bottom=.21)
    ax.barh(range(len(delta)),delta,height=.45,color=p['blue']);ax.set_ylim(len(delta)-.35,-.65);ax.set_yticks(range(len(delta)),[]);ax.set_xlim(min(0,min(delta))-.07,max(0,max(delta))+.09);ax.axvline(0,color=p['ink'],linewidth=.8);ax.set_xlabel('变化量 / '+s['unit'],fontsize=13);ax.tick_params(labelsize=13,length=0,pad=10);ax.grid(axis='x',alpha=.15);ax.set_axisbelow(True)
    for i,d in enumerate(delta):ax.text(d+(.012 if d>=0 else -.012),i,f'{d:+.2f}',ha='left' if d>=0 else 'right',va='center',fontsize=13,color=p['ink'])
    for spine in ax.spines.values():spine.set_visible(False)
    save(fig,runtime,out,'changes')
    body=f'''<section class="research-title"><p class="eyebrow">配对观察 / 每个编号保持同一样本</p><h1>{'<br>'.join(map(esc,s['title']))}</h1></section><section class="research-summary"><div><strong>{len(s['rows']):02d}</strong><p>对配对读数</p></div><div><strong>{sum(d>0 for d in delta)}/{len(delta)}</strong><p>个样本读数增加</p></div><div><strong>{min(delta):.2f}—{max(delta):.2f}</strong><p>变化范围 / {esc(s['unit'])}</p></div></section><section class="research-plots"><div><h2>A / 保留配对，观察每一个样本</h2><img src="paired.png" alt="处理前后读数在共同尺度上的逐样本配对"></div><div><h2>B / 同一行，比较变化幅度</h2><img src="changes.png" alt="各样本变化量的零基线比较"></div></section><p class="research-caption">A 将同一样本的两次读数连接，保留原编号顺序。B 使用相同顺序，直接显示后一次减前一次；两幅图回答不同读图问题。</p>'''
    return shell(s,p,body,'research'),{'changes':delta,'range':[min(delta),max(delta)],'increase_count':sum(d>0 for d in delta)}


def validate(s):
    expected={'business':'editorial','project':'bauhaus','research':'journal'}
    if s.get('layout') not in expected or s.get('theme')!=expected[s['layout']]:
        raise ValueError('Choose a supplied layout/theme pair.')
    for key in ('publication','edition','note'):
        if not isinstance(s.get(key),str) or not s[key].strip():raise ValueError(f'{key}: nonempty supplied text required')
    if not isinstance(s.get('title'),list) or not 1<=len(s['title'])<=2 or not all(isinstance(v,str) and v.strip() for v in s['title']):raise ValueError('Supply one or two headline lines.')
    finite=lambda v:isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
    if s['layout']=='business':
        n=len(s.get('months',[]))
        if not 3<=n<=8 or len(set(s['months']))!=n:raise ValueError('Supply 3–8 distinct ordered month labels.')
        if any(not isinstance(s.get(k),str) or not s[k].strip() for k in ('unit','periodLabel')):raise ValueError('Actual unit and periodLabel required.')
        if any(len(s.get(k,[]))!=n or any(not finite(v) or v<0 for v in s[k]) for k in ('revenue','cost')):raise ValueError('Income and supplied costs must be complete nonnegative arrays of equal length.')
        if any(v==0 for v in s['revenue']):raise ValueError('A zero income has no defined surplus rate; choose a different summary.')
    elif s['layout']=='project':
        start,end,asof=[dt.date.fromisoformat(s[k]) for k in ('start','end','asOf')]
        if not start<=asof<=end or start==end:raise ValueError('Dates need an increasing window containing the status date.')
        if not 3<=len(s.get('milestones',[]))<=6 or not 3<=len(s.get('work',[]))<=6:raise ValueError('Use 3–6 milestones and 3–6 work packages for this composition.')
        for m in s['milestones']:
            if not m.get('name') or not start<=dt.date.fromisoformat(m['planned'])<=end:raise ValueError('Milestones need names and planned dates in the window.')
            if m.get('actual') and not start<=dt.date.fromisoformat(m['actual'])<=asof:raise ValueError('Actual completion cannot be outside the observed window or after the status date.')
        for w in s['work']:
            if not w.get('name') or not finite(w.get('weight')) or w['weight']<=0 or not finite(w.get('completion')) or not 0<=w['completion']<=1:raise ValueError('Work needs positive weights and completion fractions from zero to one.')
    else:
        if not 3<=len(s.get('rows',[]))<=10 or len({r['id'] for r in s['rows']})!=len(s['rows']):raise ValueError('Use 3–10 uniquely identified pairs.')
        if len(s.get('conditions',[]))!=2 or any(not str(v).strip() for v in s['conditions']):raise ValueError('Two actual condition labels required.')
        if not s.get('unit') or not s.get('measure'):raise ValueError('Actual measure and unit required.')
        for row in s['rows']:
            if any(not finite(row.get(k)) or row[k]<0 for k in ('before','after')):raise ValueError('Every pair needs two finite nonnegative observations.')
        if not any(max(r['before'],r['after'])>0 for r in s['rows']):raise ValueError('Choose another range for all-zero observations.')

def build(s,out):
    validate(s)
    out=Path(out);out.mkdir(parents=True,exist_ok=False)
    p=json.loads((SKILL/'themes'/(s['theme']+'.json')).read_text(encoding='utf-8'))['palette']
    try:
        document,derived={'business':business,'project':project,'research':research}[s['layout']](s,p,out)
        (out/'index.html').write_text(document,encoding='utf-8')
        (out/'data.json').write_text(json.dumps(s,ensure_ascii=False,indent=2),encoding='utf-8')
        (out/'derived.json').write_text(json.dumps(derived,ensure_ascii=False,indent=2),encoding='utf-8')
        shutil.copyfile(ASSETS/'office-reports.css',out/'study.css')
    except Exception as error:
        (out/'failure.json').write_text(json.dumps({'completed':False,'error':str(error)},ensure_ascii=False),encoding='utf-8');raise
    return out/'index.html'

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input',type=Path);parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    print(build(json.loads(args.input.read_text(encoding='utf-8-sig')),args.out))
