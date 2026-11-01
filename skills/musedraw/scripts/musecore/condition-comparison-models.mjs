const STATUSES = new Set(['measured', 'missing', 'planned', 'conditional']);

export function conditionComparisonModel(input) {
  const need = (ok, message) => { if (!ok) throw new Error(message); };
  const object = (value, label) => need(value && typeof value === 'object' && !Array.isArray(value), `${label}: object required`);
  const text = (value, label) => need(typeof value === 'string' && value.trim().length > 0, `${label}: nonempty text required`);
  const finite = (value, label) => need(typeof value === 'number' && Number.isFinite(value), `${label}: finite number required`);
  const fields = (value, allowed, label) => { object(value, label); for (const key of Object.keys(value)) need(allowed.includes(key), `${label}.${key}: unsupported field`); };
  fields(input, ['family','title','question','unit','substrate','baseline','conditions','scale','note'], 'condition comparison');
  need(input.family === 'condition-comparison', 'condition-comparison family required');
  for (const key of ['title','question','unit','note']) text(input[key], key);
  fields(input.substrate, ['id','label','segments','source'], 'substrate');
  text(input.substrate.id, 'substrate.id'); text(input.substrate.label, 'substrate.label'); text(input.substrate.source, 'substrate.source');
  need(Array.isArray(input.substrate.segments) && input.substrate.segments.length >= 2 && input.substrate.segments.length <= 6, 'substrate.segments requires 2–6 segments');
  const segmentIds = new Set();
  const segments = input.substrate.segments.map((segment, index) => {
    fields(segment, ['id','label','weight'], `substrate.segments[${index}]`);
    text(segment.id, `substrate.segments[${index}].id`); text(segment.label, `substrate.segments[${index}].label`);
    finite(segment.weight, `substrate.segments[${index}].weight`); need(segment.weight > 0, `substrate.segments[${index}].weight must be > 0`); need(!segmentIds.has(segment.id), 'duplicate substrate segment id'); segmentIds.add(segment.id); return {...segment};
  });
  fields(input.scale, ['min','max'], 'scale'); finite(input.scale.min, 'scale.min'); finite(input.scale.max, 'scale.max'); need(input.scale.min < input.scale.max, 'scale.min must be below scale.max');
  fields(input.baseline, ['id','label','substrateId','source','value','status'], 'baseline');
  for (const key of ['id','label','substrateId','source']) text(input.baseline[key], `baseline.${key}`);
  need(input.baseline.substrateId === input.substrate.id, 'baseline must reference the declared substrate'); text(input.baseline.status, 'baseline.status'); need(input.baseline.status === 'measured', 'baseline status must be measured'); finite(input.baseline.value, 'baseline.value'); need(input.baseline.value >= input.scale.min && input.baseline.value <= input.scale.max, 'baseline.value outside declared scale');
  need(Array.isArray(input.conditions) && input.conditions.length >= 2 && input.conditions.length <= 4, 'conditions requires 2–4 conditions');
  const ids = new Set();
  const conditions = input.conditions.map((condition, index) => {
    fields(condition, ['id','label','substrateId','source','value','status','changedSegmentId','range'], `conditions[${index}]`);
    for (const key of ['id','label','substrateId','source']) text(condition[key], `conditions[${index}].${key}`);
    need(!ids.has(condition.id), 'duplicate condition id'); ids.add(condition.id);
    need(condition.substrateId === input.substrate.id, `conditions[${index}] does not share the baseline substrate`);
    need(STATUSES.has(condition.status), `conditions[${index}].status must be measured, missing, planned or conditional`);
    const changedSegmentId = condition.changedSegmentId ?? null;
    if (changedSegmentId !== null) { text(changedSegmentId, `conditions[${index}].changedSegmentId`); need(segmentIds.has(changedSegmentId), `conditions[${index}] changedSegmentId is not a declared substrate segment`); }
    if (condition.status === 'measured') { finite(condition.value, `conditions[${index}].value`); need(condition.value >= input.scale.min && condition.value <= input.scale.max, `conditions[${index}].value outside declared scale`); need(condition.range === undefined, `conditions[${index}] measured condition cannot have range`); }
    if (condition.status === 'missing' || condition.status === 'planned') { need(condition.value === null || condition.value === undefined, `conditions[${index}] ${condition.status} value must be null`); need(condition.range === undefined, `conditions[${index}] ${condition.status} cannot have range`); }
    let range = null;
    if (condition.status === 'conditional') { need(Array.isArray(condition.range) && condition.range.length === 2, `conditions[${index}] conditional range requires [min,max]`); finite(condition.range[0], `conditions[${index}].range[0]`); finite(condition.range[1], `conditions[${index}].range[1]`); need(condition.range[0] <= condition.range[1], `conditions[${index}] conditional range must be ordered`); need(condition.range[0] >= input.scale.min && condition.range[1] <= input.scale.max, `conditions[${index}] conditional range outside declared scale`); need(condition.value === null || condition.value === undefined, `conditions[${index}] conditional value must be null`); range = [...condition.range]; }
    return {...condition, changedSegmentId, range};
  });
  return {...input, substrate: {...input.substrate, segments}, baseline: {...input.baseline}, conditions, scale: {...input.scale}, statusVocabulary: [...STATUSES], scope: 'Same declared substrate and shared scale; only supplied condition/state differences are encoded.'};
}

export const demoConditionComparison = {
  family: 'condition-comparison',
  title: '同一底物上的条件变化',
  question: '保持底物与尺度不变，只比较激活状态的变化',
  unit: '相对信号',
  note: '共同底物：样品 A。颜色只标注状态，不代表样品身份；缺失与计划状态不填造数值。',
  substrate: {id: 'sample-a', label: '样品 A · 固定底物', source: 'Fig. 2a substrate map', segments: [
    {id: 's1', label: '底物区', weight: 1}, {id: 's2', label: '结合区', weight: 1}, {id: 's3', label: '读出区', weight: 1}
  ]},
  baseline: {id: 'control', label: '对照基线', substrateId: 'sample-a', source: 'Fig. 2a control', value: 0.32, status: 'measured'},
  scale: {min: 0, max: 1},
  conditions: [
    {id: 'low', label: '低剂量', substrateId: 'sample-a', source: 'Fig. 2b low-dose', value: 0.48, status: 'measured', changedSegmentId: 's2'},
    {id: 'high', label: '高剂量', substrateId: 'sample-a', source: 'Fig. 2c high-dose', value: 0.77, status: 'measured', changedSegmentId: 's2'},
    {id: 'washout', label: '洗脱后', substrateId: 'sample-a', source: 'Fig. 2d washout', value: null, status: 'missing', changedSegmentId: null},
    {id: 'followup', label: '后续验证', substrateId: 'sample-a', source: 'protocol §4.2', value: null, status: 'planned', changedSegmentId: null}
  ]
};
