// New-subject stress content, generated from the bounded examples without hiding facts.
export function stressContent(base) {
  const c=structuredClone(base), programme=c.system==='signal';
  c.locale='zh-CN';
  c.brand={name:programme?'夜间声场观察计划':'近岸资料研究室',kicker:programme?'两晚之间 / 声音与公共空间':'PUBLIC FIELD INDEX / 资料持续编目'};
  c.page={
    kicker:'中文与长标题排版测试 / 全部内容保留',
    title:programme?'在一座城市逐渐安静的时刻，重新听见那些被日常生活遮住的微小声音，让不同的人沿着各自的路径相遇，也保留那些尚未听清与无法确定的部分':'把一段漫长而具体的近岸观察记录保留下来，让每一种尚未被概括的材料、声音与潮汐线索都能继续被看见和阅读，并在下一次访问时重新讨论',
    intro:'这是一组虚构的中文测试资料。长标题、连续编号、完整来源与较密集的条目同时出现，用于检查界面是否依然保留阅读层次，以及手机端是否能完成查找、阅读详情和本机留存。它不代表环境测量结果或真实活动安排。',
    actionLabel:programme?'查看全部活动与时间':'打开完整资料目录',
    sectionTitle:programme?'按自己的节奏，选择一个晚上。':'沿着材料的线索，继续往下读。',
    footer:'实验性工具的虚构中文测试内容，仅用于排版和功能检查。所有来源文本均需保留；留存不会报名、预约、付款或提交资料。'
  };
  c.items=Array.from({length:24},(_,i)=>{
    const item={...base.items[i%base.items.length],id:`STRESS-${String(i+1).padStart(2,'0')}`,title:`${String(i+1).padStart(2,'0')} / 在潮汐、材料与日常声音之间建立一份能够继续补充、保留分歧并追溯来源的细致观察记录`,summary:'这是一段较长的中文摘要，用来保留对象的具体差异。它既包含连续的中文文字，也包含一个不能被当作链接的超长识别码：SHORELINE_OBSERVATION_RECORD_WITH_UNBROKEN_IDENTIFIER_2026_0000000000000000000000。界面应当自然换行，不能通过省略摘要、缩小正文或隐藏来源来消除排版压力。',category:['材料观察','工作方法','声音笔记','公共空间','档案线索','阅读工具'][i%6],source:`原创虚构测试条目 STRESS-${i+1}；未使用真实参与者、环境测量或外部作品。<script>this must stay text</script>`,detail:['完整详情中的段落也应保留。这些内容没有构成真实研究结果、价格承诺、预约或容量信息。','另一段长文字用于检查原生对话框的滚动、关闭按钮、键盘焦点和保存后的阅读位置。来源文字即使包含 HTML 字符也只能显示为文本。']};
    return programme?{...item,date:`2026-12-${String(4+Math.floor(i/4)).padStart(2,'0')}`,start:`${String(17+i%4).padStart(2,'0')}:00`,end:`${String(18+i%4).padStart(2,'0')}:15`,place:'街区公共阅读室 / 一层西侧 / 具体无障碍安排尚未提供',cost:'虚构免费场次 / 不提供报名'}:{...item,year:2026-i%7,creator:'近岸资料联合工作小组与社区观察者',format:'工作手稿、材料描述与附带使用说明 / 24页'};
  });
  return c;
}
