export const SCHEMA = 2;
export const uid = () => crypto.randomUUID();
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function asDate(value) { return new Date(`${value}T12:00:00`); }
export function addDays(value, count) { const d = asDate(value); d.setDate(d.getDate() + count); return localDate(d); }
export function dayDiff(a, b) { return Math.round((Date.UTC(...a.split('-').map((n,i) => i === 1 ? +n - 1 : +n)) - Date.UTC(...b.split('-').map((n,i) => i === 1 ? +n - 1 : +n))) / 86400000); }
export const WORKSPACE_ICONS = ['home','briefcase','building','rocket','sparkles','video','camera','palette','pen','code','music','headphones','book','graduation','globe','heart','coffee','sun','moon','mountain','leaf','flower','zap','target','flag','trophy','diamond','gem','star','lightbulb','compass','anchor','plane','car','bike','shopping','wallet','chart','megaphone','users','gamepad','puzzle','wrench','flask','shield','calendar','layers','folder'];
export const WORKSPACE_COLORS = ['sage','blue','violet','rose','amber','teal'];
export const defaultWorkspace = () => ({ id: 'personal', name: 'Personal', icon: 'home', color: 'sage', dailyCapacity: 360 });
export const emptyData = () => ({ schema: SCHEMA, workspaces: [defaultWorkspace()], activeWorkspaceId: 'personal', tasks: [], overrides: {}, settings: { dailyCapacity: 360 }, updatedAt: new Date().toISOString() });
export function workspaceData(data, id = data.activeWorkspaceId) {
  const workspace = data.workspaces.find(w=>w.id===id) || data.workspaces[0];
  const tasks = data.tasks.filter(t=>(t.workspaceId || 'personal') === workspace.id);
  const ids = new Set(tasks.map(t=>t.id));
  return {...data,tasks,overrides:Object.fromEntries(Object.entries(data.overrides).filter(([key])=>ids.has(key.split('@')[0]))),settings:{...data.settings,dailyCapacity:workspace.dailyCapacity}};
}
export function exportWorkspace(data, id = data.activeWorkspaceId) {
  const workspace=data.workspaces.find(w=>w.id===id);
  if(!workspace)throw new Error('Workspace not found.');
  const {name,icon,color,dailyCapacity}=workspace;
  const scoped=workspaceData(data,id);
  // Build the backup explicitly: no other workspace metadata or global settings can travel with it.
  return {schema:SCHEMA,exportScope:'workspace',workspaces:[{id,name,icon,color,dailyCapacity}],activeWorkspaceId:id,tasks:scoped.tasks,overrides:scoped.overrides,settings:{dailyCapacity},updatedAt:new Date().toISOString()};
}
export function importWorkspace(current, raw, targetId = current.activeWorkspaceId, mode = 'merge') {
  if(!['merge','replace'].includes(mode))throw new Error('Choose Merge tasks or Replace tasks.');
  if(!current.workspaces.some(w=>w.id===targetId))throw new Error('The destination workspace no longer exists.');
  const incoming=validateData(raw);
  if(incoming.workspaces.length!==1)throw new Error('Choose a single-workspace export. Use Import backup to restore all workspaces.');
  const otherTasks=current.tasks.filter(t=>t.workspaceId!==targetId);
  const otherIds=new Set(otherTasks.map(t=>t.id));
  const incomingIds=new Set(incoming.tasks.map(t=>t.id));
  const mapped=new Map(),used=new Set();
  for(const task of incoming.tasks){
    let id=task.id;
    if(otherIds.has(id)){
      id=`import:${targetId}:${task.id}`;
      while(otherIds.has(id)||incomingIds.has(id)||used.has(id))id=`import:${id}`;
    }
    mapped.set(task.id,id);used.add(id);
  }
  const tasks=new Map((mode==='replace'?otherTasks:current.tasks).map(t=>[t.id,t]));
  for(const task of incoming.tasks){const id=mapped.get(task.id);tasks.set(id,{...task,id,workspaceId:targetId});}
  const overrides=mode==='replace'?Object.fromEntries(Object.entries(current.overrides).filter(([key])=>otherIds.has(key.split('@')[0]))):{...current.overrides};
  for(const [key,value] of Object.entries(incoming.overrides)){const [id,date]=key.split('@');overrides[`${mapped.get(id)}@${date}`]=value;}
  return {...current,tasks:[...tasks.values()],overrides,updatedAt:new Date().toISOString()};
}
export function removeWorkspace(data, id) {
  if(data.workspaces.length===1) throw new Error('Keep at least one workspace.');
  if(!data.workspaces.some(w=>w.id===id)) throw new Error('Workspace not found.');
  const tasks = data.tasks.filter(t=>(t.workspaceId || 'personal')!==id);
  const ids = new Set(tasks.map(t=>t.id));
  const workspaces = data.workspaces.filter(w=>w.id!==id);
  return {...data,workspaces,tasks,overrides:Object.fromEntries(Object.entries(data.overrides).filter(([key])=>ids.has(key.split('@')[0]))),activeWorkspaceId:data.activeWorkspaceId===id?workspaces[0].id:data.activeWorkspaceId};
}
export function occursOn(task, date) {
  if (!task.date) return date === null;
  if (!date || date < task.date) return false;
  const r = task.recurrence;
  if (!r) return date === task.date;
  if (r.until && date > r.until) return false;
  const diff = dayDiff(date, task.date);
  const interval = Math.max(1, Number(r.interval) || 1);
  if (r.unit === 'day') return diff % interval === 0;
  if (r.unit === 'week') {
    const start = asDate(task.date);
    const mondayOffset = (start.getDay() + 6) % 7;
    const week = Math.floor((diff + mondayOffset) / 7);
    return week % interval === 0 && r.days.includes(asDate(date).getDay());
  }
  const current = asDate(date), start = asDate(task.date);
  const months = (current.getFullYear() - start.getFullYear()) * 12 + current.getMonth() - start.getMonth();
  const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
  return months % interval === 0 && current.getDate() === Math.min(start.getDate(), lastDay);
}
export const occurrenceKey = (taskId, date) => `${taskId}@${date || 'anytime'}`;
export function firstOccurrenceDate(task) {
  if (!task.date || !task.recurrence || task.recurrence.unit !== 'week') return task.date;
  for (let cursor=task.date, i=0; i<2562; i++,cursor=addDays(cursor,1)) if (occursOn(task,cursor)) return cursor;
  return null;
}
export function occurrence(data, task, date) {
  const key = occurrenceKey(task.id, date);
  const override = data.overrides[key] || {};
  const first = !task.recurrence || date === firstOccurrenceDate(task);
  let checklist = (first || task.repeatChecklist !== false) ? task.checklist : [];
  if (task.checklistMode !== 'shared') checklist = checklist.map(item => ({ ...item, checked: override.checks?.[item.id] ?? (!task.recurrence ? item.checked : false) }));
  return { ...task, description: first || task.repeatNotes !== false ? task.description : '', checklist, ...override, id: task.id, key, occurrenceDate: date, status: override.status || 'todo', template: task };
}
export function onDate(data, date, includeDone = false) {
  return data.tasks.filter(task => occursOn(task, date)).map(task => occurrence(data, task, date)).filter(item => !item.skipped && (includeDone || item.status !== 'done'));
}
export function boardItems(data, date) {
  const result = [...onDate(data, date), ...onDate(data, null)];
  // Only generate past work, never future obligations. Every unfinished occurrence stays visible.
  for (const task of data.tasks) {
    if (!task.date || task.date >= date) continue;
    if (!task.recurrence) {
      const item = occurrence(data, task, task.date);
      if (!item.skipped && item.status !== 'done') result.push(item);
      continue;
    }
    for (let cursor = task.date; cursor < date; cursor = addDays(cursor, 1)) {
      if (!occursOn(task, cursor)) continue;
      const item = occurrence(data, task, cursor);
      if (!item.skipped && item.status !== 'done') result.push(item);
    }
  }
  return result;
}
export function setStatus(data, item, status) {
  return { ...data, overrides: { ...data.overrides, [item.key]: { ...data.overrides[item.key], status, completedAt: status === 'done' ? new Date().toISOString() : null } } };
}
export function toggleCheck(data, item, checkId) {
  if (item.template.checklistMode === 'shared') return { ...data, tasks: data.tasks.map(task => task.id !== item.id ? task : { ...task, checklist: task.checklist.map(check => check.id === checkId ? { ...check, checked: !check.checked } : check) }) };
  const override = data.overrides[item.key] || {};
  return { ...data, overrides: { ...data.overrides, [item.key]: { ...override, checks: { ...override.checks, [checkId]: !item.checklist.find(check => check.id === checkId)?.checked } } } };
}
export function completedItems(data) {
  return Object.entries(data.overrides).filter(([,value]) => value.status === 'done').map(([key]) => {
    const [id, date] = key.split('@'); const task = data.tasks.find(t => t.id === id);
    return task ? occurrence(data, task, date === 'anytime' ? null : date) : null;
  }).filter(Boolean).sort((a,b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
}
export function recurrenceLabel(task) {
  const r = task.recurrence;
  if (!r) return '';
  if (r.unit === 'day') return r.interval === 1 ? 'Every day' : `Every ${r.interval} days`;
  if (r.unit === 'month') return r.interval === 1 ? 'Monthly' : `Every ${r.interval} months`;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `${r.interval === 1 ? '' : `Every ${r.interval} weeks · `}${r.days.map(d => days[d]).join(', ')}`;
}
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(asDate(value)) && localDate(asDate(value)) === value;
export function validateData(raw) {
  if (!raw || ![1,SCHEMA].includes(raw.schema) || !Array.isArray(raw.tasks) || !raw.overrides || typeof raw.overrides !== 'object' || Array.isArray(raw.overrides)) throw new Error('This is not a valid Daymark backup (version 1 or 2).');
  const workspaces = raw.schema===1 ? [{...defaultWorkspace(),dailyCapacity:Math.min(1440,Math.max(30,Number(raw.settings?.dailyCapacity)||360))}] : raw.workspaces;
  if(!Array.isArray(workspaces)||!workspaces.length||workspaces.length>100) throw new Error('A backup must contain between 1 and 100 workspaces.');
  const workspaceIds=new Set();
  for(const w of workspaces){
    if(!w||typeof w.id!=='string'||!w.id||w.id.includes('@')||workspaceIds.has(w.id)||typeof w.name!=='string'||!w.name.trim()||w.name.length>80||!WORKSPACE_ICONS.includes(w.icon)||!WORKSPACE_COLORS.includes(w.color)||!Number.isFinite(w.dailyCapacity)||w.dailyCapacity<30||w.dailyCapacity>1440) throw new Error('A workspace in this backup is invalid.');
    workspaceIds.add(w.id);
  }
  if (raw.tasks.length > 20000) throw new Error('This backup has too many tasks.');
  const ids = new Set();
  for (const t of raw.tasks) {
    if (typeof t.id !== 'string' || !t.id || /@/.test(t.id) || ids.has(t.id) || typeof t.title !== 'string' || !t.title.trim() || typeof t.description !== 'string' || !Array.isArray(t.checklist)) throw new Error('A task in this backup is incomplete or invalid.');
    ids.add(t.id);
    if(t.workspaceId!==undefined && !workspaceIds.has(t.workspaceId)) throw new Error('A task belongs to an unknown workspace.');
    if(raw.schema===SCHEMA&&t.workspaceId===undefined&&workspaces.length!==1) throw new Error('A task is missing its workspace.');
    if (t.date !== null && !validDate(t.date)) throw new Error('A task has an invalid date.');
    if (t.estimate != null && (!Number.isFinite(t.estimate) || t.estimate < 0 || t.estimate > 100000)) throw new Error('A task has an invalid effort estimate.');
    if (['repeatNotes','repeatChecklist'].some(key=>t[key]!==undefined&&typeof t[key]!=='boolean')) throw new Error('A repeat option is invalid.');
    if (!['low','normal','high'].includes(t.priority) || !['fresh','shared'].includes(t.checklistMode)) throw new Error('A task has invalid options.');
    const checkIds = new Set();
    for (const c of t.checklist) { if (typeof c.id !== 'string' || checkIds.has(c.id) || typeof c.title !== 'string' || typeof c.checked !== 'boolean') throw new Error('A checklist is invalid.'); checkIds.add(c.id); }
    const r = t.recurrence;
    if (r && (!t.date || !['day','week','month'].includes(r.unit) || !Number.isInteger(r.interval) || r.interval < 1 || r.interval > 365 || !Array.isArray(r.days) || (r.unit === 'week' && !r.days.length) || r.days.some(d => !Number.isInteger(d) || d < 0 || d > 6) || (r.until && (!validDate(r.until) || r.until < t.date)))) throw new Error('A repeat schedule is invalid.');
  }
  for (const [key, value] of Object.entries(raw.overrides)) {
    const [id, date, extra] = key.split('@');
    if (!ids.has(id) || extra || (date !== 'anytime' && !validDate(date)) || !value || typeof value !== 'object' || (value.status && !['todo','progress','done'].includes(value.status))) throw new Error('Saved task progress is invalid.');
    if (value.title !== undefined && typeof value.title !== 'string' || value.description !== undefined && typeof value.description !== 'string' || value.checklist !== undefined && (!Array.isArray(value.checklist) || value.checklist.some(c => !c || typeof c.id !== 'string' || typeof c.title !== 'string' || typeof c.checked !== 'boolean'))) throw new Error('Saved task details are invalid.');
    if (Object.keys(value).some(key=>!['status','completedAt','checks','skipped','title','description','checklist','priority','estimate'].includes(key))) throw new Error('Saved task progress contains unsupported fields.');
    if (value.priority!==undefined&&!['low','normal','high'].includes(value.priority) || value.skipped!==undefined&&typeof value.skipped!=='boolean' || value.estimate!==undefined&&(!Number.isFinite(value.estimate)||value.estimate<0||value.estimate>100000) || value.checks!==undefined&&(!value.checks||typeof value.checks!=='object'||Array.isArray(value.checks)||Object.values(value.checks).some(v=>typeof v!=='boolean')) || value.completedAt!=null&&(typeof value.completedAt!=='string'||isNaN(new Date(value.completedAt)))) throw new Error('Saved task progress has invalid values.');
  }
  return { schema: SCHEMA, workspaces, activeWorkspaceId:workspaceIds.has(raw.activeWorkspaceId)?raw.activeWorkspaceId:workspaces[0].id, tasks: raw.tasks.map(t=>({...t,workspaceId:raw.schema===1?'personal':t.workspaceId||workspaces[0].id})), overrides: raw.overrides, settings: { dailyCapacity: Math.min(1440, Math.max(30, Number(raw.settings?.dailyCapacity) || 360)) }, updatedAt: raw.updatedAt || new Date().toISOString() };
}
export function mergeData(current, incoming) {
  const tasks = new Map(current.tasks.map(t => [t.id,t]));
  incoming.tasks.forEach(t => tasks.set(t.id,t));
  const workspaces=new Map(current.workspaces.map(w=>[w.id,w]));
  incoming.workspaces.forEach(w=>workspaces.set(w.id,w));
  if(workspaces.size>100) throw new Error('Merging would exceed the limit of 100 workspaces.');
  return { ...current, workspaces:[...workspaces.values()], tasks: [...tasks.values()], overrides: { ...current.overrides, ...incoming.overrides } };
}
