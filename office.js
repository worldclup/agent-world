'use strict';
// Dhiteta AI open-plan office, isometric (2.5D) pixel view.
// Logic runs on a plain grid (route / zones / blocked); only drawing is projected to isometric.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let COLS = 32, ROWS = 22;
const TW = 24, TH = 12, WALL = 72, SCALE = 2, ENTRY=[15,21], EXTERIOR_HEIGHT=300;
const OX = 274, OY = WALL + 100;
const W = 668, H = OY + 436;
function lightingAt(date) {
  const hour = date.getHours(), minute = date.getMinutes(), h = hour + minute/60;
  const daylight = h < 5 || h >= 19 ? 0 : h < 7 ? (h-5)/2 : h < 17 ? 1 : (19-h)/2;
  return { hour, minute, daylight, label:h >= 5 && h < 7 ? 'ยามเช้า' : h >= 7 && h < 17 ? 'กลางวัน' : h >= 17 && h < 19 ? 'ยามเย็น' : 'กลางคืน', time:`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}` };
}
let lighting = lightingAt(new Date()), lightingMinute = '';
function updateLighting() {
  const now = new Date(), minute = Math.floor(now.getTime()/60000);
  if (minute === lightingMinute) return;
  lightingMinute = minute; lighting = lightingAt(now);
  document.getElementById('local-time').textContent = `${lighting.time} · ${i18n.t(lighting.label)}`;
  const mix = (night, day) => '#' + [1,3,5].map(i => Math.round(parseInt(night.slice(i,i+2),16)*(1-lighting.daylight)+parseInt(day.slice(i,i+2),16)*lighting.daylight).toString(16).padStart(2,'0')).join('');
  C.sky = mix('#1c315c','#9fd0f5'); C.sky2 = mix('#344b80','#c4e3fa');
}
// Visible crop of the world: zooms the view onto the office floor.
const VIEW = { x: 34, y: 84, w: 600, h: 420 };
cv.width = VIEW.w * SCALE; cv.height = VIEW.h * SCALE;
const blocked = new Set(), objects = [], agents = new Map();
const key = (x, y) => `${x},${y}`;

const C = {
  navy: '#0f2a52', blue: '#1f5fbf', blue2: '#2f6fd6', blue3: '#174ea3', white: '#ffffff', wall: '#f4f7fb', wallSide: '#e3eaf4',
  edge: '#c9d7ec', sky: '#9fd0f5', sky2: '#c4e3fa', wood: '#c7975f', woodDark: '#9b6f3f', leaf: '#2f9e5a', leaf2: '#45bf72',
  orange: '#e07a3f', glass: 'rgba(159,208,245,.42)', glassTop: '#7fb0e6',
};

// ---------- grid: outer boundary only, open plan inside ----------
function wall(x, y) { blocked.add(key(x, y)); }
for (let x = 0; x < COLS; x++) { wall(x, 0); if (x !== 15 && x !== 16) wall(x, 21); }
for (let y = 0; y < ROWS; y++) { wall(0, y); wall(31, y); }

// object(x, y, w, d, kind): blocks its footprint; deco() is walkable (chairs)
function object(x, y, w, d, kind, opt = {}) {
  objects.push({ x, y, w, d, kind, ...opt, depth: x + y + (w - 1) / 2 + (d - 1) / 2 });
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) blocked.add(key(x + i, y + j));
}
const deco = (x, y, kind, opt = {}) => objects.push({ x, y, w: 1, d: 1, kind, ...opt, depth: x + y + .3 });

const AREAS = [
  { x: 1, y: 1, w: 7, h: 7, floor: 'carpet', title: 'MEETING' },
  { x: 1, y: 19, w: 7, h: 2, floor: 'wood', title: 'QUIET ROOM' },
  { x: 10, y: 1, w: 6, h: 6, floor: 'developer', title: 'DEVELOPER' },
  { x: 16, y: 1, w: 4, h: 6, floor: 'tester', title: 'TESTER' },
  { x: 20, y: 1, w: 5, h: 6, floor: 'uxui', title: 'UX/UI' },
  { x: 25, y: 10, w: 6, h: 4, floor: 'tile', title: 'TEAM OFFICE' },
  { x: 1, y: 8, w: 7, h: 5, floor: 'carpet', title: 'HUDDLE' },
  { x: 25, y: 14, w: 3, h: 3, floor: 'carpet', title: 'FOCUS' },
  { x: 28, y: 14, w: 3, h: 3, floor: 'carpet', title: 'FOCUS 2' },
  { x: 9, y: 19, w: 5, h: 2, floor: 'wood', title: 'LOCKERS' },
  { x: 1, y: 13, w: 7, h: 6, floor: 'wood', title: 'KITCHEN' },
  { x: 11, y: 10, w: 12, h: 7, floor: 'wood', title: 'LOUNGE' },
  { x: 25, y: 1, w: 6, h: 9, floor: 'dark', title: 'SERVER' },
];

// Two simple furniture groups leave open space instead of layering small decorations.
const LOUNGE_SPOTS=[{name:'TV',x:11,y:10,w:6,d:7},{name:'CHAT',x:18,y:10,w:4,d:7}];
object(12,10,4,1,'sofa');object(13,12,2,1,'coffeeTable');
object(12,15,4,1,'tvConsole');object(11,15,1,1,'speaker');object(16,15,1,1,'speaker');
object(18,10,4,1,'sofa');object(18,15,4,1,'sofa',{reverse:true});
object(21,12,1,1,'armchair');
object(19,12,2,1,'coffeeTable');object(16,12,1,1,'plant');
object(2,14,3,1,'kitchenCounter',{microwave:true});object(1,14,1,1,'fridge');object(5,14,3,1,'coffeeBar');
object(2,16,3,1,'diningTable');deco(1,16,'chair');deco(5,16,'chair');
const barSeats = [[5,15],[6,15],[7,15]];
barSeats.forEach(([x,y]) => deco(x, y, 'barStool'));
const napSpots = [[1,20],[6,20],[2,20],[7,20]];
[[1,20],[6,20]].forEach(([x,y]) => deco(x,y,'daybed'));
// Each wing shares room boundaries; circulation stays on the lounge-facing side.
object(1,19,3,1,'glass',{edge:true});object(6,19,3,1,'glass',{edge:true,joinAt:'end'});object(8,19,1,2,'glass',{edge:true});
// Clear glass partitions around the meeting area, with open walkways between panels.
object(8,1,1,3,'glass',{edge:true});object(8,6,1,3,'glass',{edge:true});
object(25,10,1,2,'glass',{edge:true});object(25,14,1,1,'glass',{edge:true,trimEnd:true});
object(25,10,6,1,'glass',{edge:true,joinAt:'start'});
object(25,14,6,1,'glass',{edge:true,joinAt:'start'});
// workspace
for (const y of [2,5]) for (const x of [11,14,17,22]) { object(x,y,2,1,'desk',{role:x<17?'developer':x<20?'tester':'uxui'});deco(x,y+1,'chair'); }
// Adjacent glass rooms each have one front door onto the same cross-aisle.
for(const x of [10,16,20])object(x,1,1,7,'glass',{edge:true,trimEnd:true});
object(10,7,2,1,'glass',{edge:true});object(14,7,3,1,'glass',{edge:true,joinAt:'end'});
object(19,7,3,1,'glass',{edge:true});object(24,7,2,1,'glass',{edge:true,joinAt:'end'});
// Smaller rooms sit around a continuous central circulation route.
for(const x of [26,29]){object(x,11,2,1,'desk');deco(x,12,'chair');}
object(25,1,1,7,'glass',{edge:true,trimEnd:true});
// The lounge is an open central hub; meeting rooms share the left wing.
object(1,8,8,1,'glass',{edge:true,joinAt:'end'});
object(8,11,1,5,'glass',{edge:true});object(8,18,1,1,'glass',{edge:true});
object(1,13,8,1,'glass',{edge:true,joinAt:'end'});
object(2,10,3,2,'diningTable');deco(1,10,'chair');deco(5,11,'chair');
object(26,15,2,1,'readingDesk');object(29,15,2,1,'readingDesk');
deco(26,16,'chair');deco(29,16,'chair');
for(const x of [25,28]) {
  object(x,14,1,4,'glass',{edge:true,trimEnd:true});
  object(x,17,1,1,'glass',{edge:true,axis:'x',joinAt:'start'});
}
object(9,20,4,1,'locker');object(13,20,1,1,'locker');
object(26,20,4,1,'bookcase');
object(30,1,1,1,'plant');
// meeting
object(3,3,3,2,'table');object(1,1,1,1,'avCabinet');
[[2,3],[2,4],[6,3],[6,4],[3,2],[5,2],[4,5],[5,5]].forEach(([x,y])=>deco(x,y,'chair'));
// server
for(const y of [2,4])for(const x of [27,29])object(x,y,1,1,'rack');
object(27,6,3,1,'controlDesk');deco(27,7,'chair');

const zones = {
  read: [[11,3],[14,3],[17,3],[22,3],[26,12],[26,16],[29,16]], write: [[11,6],[14,6],[17,6],[22,6],[29,12]],
  web: [[30,12],[28,12]], bash: [[27,7],[28,4]],
  think: [[2,3],[6,4],[3,2],[4,5],[2,9],[6,11]], idle: [[12,12],[20,11],[21,14],[11,19]],
};
zones.talk = zones.think; zones.agent = zones.think;
const labelKeys = { read:'อ่าน / ค้นหา', write:'แก้ไขไฟล์', web:'ค้นเว็บ', bash:'รันคำสั่ง', think:'กำลังคิด', talk:'กำลังตอบ', agent:'ประสานงาน', idle:'พักผ่อน' };
const labels=new Proxy(labelKeys,{get:(target,key)=>i18n.t(target[key])});
const icons = { read:'book', write:'edit', web:'globe', bash:'terminal', think:'message', talk:'message', agent:'users', idle:'coffee' };
const iconImages = Object.fromEntries([...new Set(Object.values(icons))].map(name => {
  const img = new Image(); img.src = `/assets/icons/${name}.svg`; return [name, img];
}));
const colors = { read:'#2586b6', write:'#7958d1', web:'#ca8a18', bash:'#21865b', think:'#bd5692', talk:'#bd5692', agent:'#148a98', idle:'#b87436' };
const runningCommands = () => [...agents.values()].filter(a => a.state === 'bash' && a.sessionSid && !a.sessionSid.startsWith('demo-') && Date.now()-a.last <= 15*60e3).length;

function route(from, to) {
  const queue = [from], prev = new Map([[key(...from), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (p[0] === to[0] && p[1] === to[1]) {
      const path = []; let q = p;
      while (prev.get(key(...q))) { path.unshift(q); q = prev.get(key(...q)); }
      return path;
    }
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const n = [p[0]+dx,p[1]+dy], k = key(...n);
      if (n[0] > 0 && n[0] < COLS-1 && n[1] > 0 && n[1] < ROWS && !blocked.has(k) && !prev.has(k)) { prev.set(k,p); queue.push(n); }
    }
  }
  return [];
}
function activitySummary(state, raw) {
  const text = String(raw || '').trim();
  if (state === 'idle') return i18n.t('จบงานแล้ว กำลังพักผ่อน');
  const technical = /Context from my IDE|#.*Active File|tools\.|exec_command|apply_patch|"cmd"|^\s*(?:const |await |\{|# Context)/.test(text);
  if (technical || !text) return i18n.t(({ think:'กำลังพิจารณาคำขอของคุณ', talk:'กำลังอธิบายผลการทำงาน', read:'กำลังตรวจสอบไฟล์และข้อมูลในโปรเจกต์', write:'กำลังปรับปรุงไฟล์ในโปรเจกต์', bash:'กำลังเรียกใช้คำสั่งหรือเครื่องมือ', web:'กำลังค้นหาข้อมูลบนเว็บ', agent:'กำลังประสานงานกับ Agent' })[state] || 'กำลังทำงาน');
  if (state === 'think') return `${i18n.t('รับคำขอ')}: ${text}`;
  if (['read','write'].includes(state) && /[\\/]|\.\w{1,5}$/.test(text)) return `${i18n.t(state==='read'?'ตรวจสอบไฟล์':'แก้ไขไฟล์')}: ${text}`;
  if (state === 'bash') return i18n.t('กำลังเรียกใช้คำสั่งหรือเครื่องมือ');
  return text;
}
const activityEntries = [];
let activitySequence = 0;
function sortedActivities(order) {
  return [...activityEntries].sort((a,b) => (order === 'oldest' ? 1 : -1) * (a.time-b.time || a.sequence-b.sequence));
}
function renderActivities() {
  const order=document.getElementById('activity-sort').value;
  document.getElementById('log').replaceChildren(...sortedActivities(order).map(entry=>entry.node));
}
document.getElementById('activity-sort').onchange=()=>{renderActivities();document.getElementById('log').scrollTop=0;};
function addActivity(a, ev) {
  a={...a};
  const li = document.createElement('li');li.className=`activity activity-${a.state}`;
  const head=document.createElement('div');head.className='activity-head';
  const name=document.createElement('b');name.className=a.kind==='codex'?'agent-codex':'agent-claude';name.textContent=a.kind==='codex'?'Codex':'Claude';
  const identity=document.createElement('div');identity.className='activity-identity';
  const project=document.createElement('span');project.className='activity-project';project.textContent=`{ ${a.project} }`;
  identity.append(name,project);
  const time=document.createElement('time');time.textContent=new Date(ev.t || Date.now()).toLocaleTimeString('en-GB',{hour12:false});
  head.append(identity,time);
  const badge=document.createElement('span');badge.className='activity-badge';
  const icon=document.createElement('img');icon.src=`/assets/icons/${icons[a.state] || 'message'}.svg`;icon.alt='';
  badge.append(icon,labels[a.state] || i18n.t('ทำงาน'));
  const summary=document.createElement('p');summary.textContent=activitySummary(a.state,a.text);
  li.append(head,badge,summary);
  if(a.text && summary.textContent!==a.text) {
    const details=document.createElement('details'), toggle=document.createElement('summary'), raw=document.createElement('pre');
    toggle.textContent=i18n.t('รายละเอียด');raw.textContent=a.text;details.append(toggle,raw);li.append(details);
  }
  const translate=()=>{
    badge.replaceChildren(icon,labels[a.state] || i18n.t('ทำงาน'));
    summary.textContent=activitySummary(a.state,a.text);
    const toggle=li.querySelector?.('summary');if(toggle)toggle.textContent=i18n.t('รายละเอียด');
  };
  activityEntries.push({ translate, node:li, time:Number.isFinite(ev.t)?ev.t:Date.now(), sequence:activitySequence++ });
  activityEntries.sort((a,b)=>a.time-b.time || a.sequence-b.sequence);
  if(activityEntries.length>60)activityEntries.splice(0,activityEntries.length-60);
  renderActivities();
}
function apply(ev) {
  if (!ev || typeof ev.sid !== 'string') return;
  const kind = ev.kind || 'claude';
  let a = [...agents.values()].find(a => a.sessionSid === ev.sid && a.kind === kind);
  if (!a && !ev.sid.startsWith('demo-')) a = [...agents.values()].find(a => a.resident && a.kind === kind && !a.sessionSid);
  if (!a) { const id = `${kind}:${ev.sid}`; a = { sid:id, x:ENTRY[0], y:ENTRY[1], dir:3, path:[], hue:agents.size % 5 }; agents.set(id,a); }
  a.sessionSid = ev.sid;
  const wasIdle = a.state === 'idle';
  Object.assign(a, { kind:ev.kind || 'claude', project:String(ev.project || 'Agent'), state:ev.state, text:String(ev.text || ''), last:Date.now() });
  if (a.state === 'idle') { if (!wasIdle) a.idleSince = Date.now(); }
  else { a.idleSince = null; a.sleepSpot = null; a.sleeping = false; }
  a.target = null;
  a.roamTarget = null;
  addActivity(a,ev);
}

function addResidents() {
  ['codex', 'claude'].forEach((kind, i) => {
    const sid = `resident:${kind}`;
    agents.set(sid, { sid, kind, resident:true, sessionSid:null, project:'ประจำ Office', state:'idle', text:'ยังไม่พบกิจกรรม', last:0,
      x:ENTRY[0]+i, y:ENTRY[1], dir:2, path:[], target:null, nextRoam:0, idleSince:Date.now() });
  });
}

function expireAgents(now) {
  for (const [sid, a] of agents) if (now - a.last > 15*60e3) {
    if (!a.resident) { agents.delete(sid); continue; }
    if (a.sessionSid) {
      Object.assign(a, { sessionSid:null, project:'ประจำ Office', state:'idle', text:'ไม่พบกิจกรรมล่าสุด', target:null, roamTarget:null, idleSince:a.state === 'idle' ? a.idleSince : now });
    }
  }
}

const roamSpots = [[12,12],[20,11],[21,14],[12,14],[17,13],[9,15],[24,18],[11,19], ...barSeats];
const OFFICE_LAYOUTS={home:{cols:18,rows:16},medium:{cols:26,rows:20},large:{cols:32,rows:22}};
let officeLayout='large';
const largePlan={objects:objects.map(o=>({...o})),areas:AREAS.map(a=>({...a})),blocked:[...blocked],zones:JSON.parse(JSON.stringify(zones)),bar:barSeats.map(p=>[...p]),nap:napSpots.map(p=>[...p]),roam:roamSpots.map(p=>[...p])};
function setLayout(name) {
  if(!OFFICE_LAYOUTS[name])return;
  officeLayout=name;({cols:COLS,rows:ROWS}=OFFICE_LAYOUTS[name]);
  blocked.clear();objects.length=0;AREAS.length=0;barSeats.length=0;napSpots.length=0;roamSpots.length=0;
  ENTRY.splice(0,2,Math.floor((COLS-2)/2),ROWS-1);
  if(name==='large') {
    ENTRY.splice(0,2,15,21);objects.push(...largePlan.objects.map(o=>({...o})));AREAS.push(...largePlan.areas);
    largePlan.blocked.forEach(k=>blocked.add(k));Object.assign(zones,JSON.parse(JSON.stringify(largePlan.zones)));
    barSeats.push(...largePlan.bar);napSpots.push(...largePlan.nap);roamSpots.push(...largePlan.roam);
  } else {
    const home=name==='home';
    AREAS.push(...(home?[
      {x:10,y:1,w:7,h:7,floor:'tile',title:'WORK'}, {x:10,y:9,w:7,h:6,floor:'wood',title:'LOUNGE'},
      {x:1,y:1,w:6,h:7,floor:'carpet',title:'MEETING'}, {x:1,y:9,w:6,h:6,floor:'wood',title:'QUIET'},
    ]:[
      {x:9,y:1,w:12,h:7,floor:'tile',title:'WORKSPACE'}, {x:1,y:1,w:8,h:6,floor:'carpet',title:'MEETING'},
      {x:10,y:9,w:11,h:7,floor:'wood',title:'LOUNGE'}, {x:1,y:9,w:7,h:6,floor:'carpet',title:'QUIET'},
      {x:1,y:15,w:7,h:4,floor:'wood',title:'REST'}, {x:21,y:1,w:4,h:8,floor:'dark',title:'SERVER'},
      {x:21,y:10,w:4,h:8,floor:'wood',title:'KITCHEN'},
    ]));
    const xs=home?[11,14]:[11,14,17],ys=home?[2]:[2,5];
    for(const y of ys)for(const x of xs){object(x,y,2,1,'desk');deco(x,y+1,'chair');deco(x+1,y+1,'chair');}
    if(home) {
      object(2,3,3,2,'table');deco(1,3,'chair');deco(5,4,'chair');
      object(11,11,4,1,'sofa');object(12,14,2,1,'coffeeTable');object(15,13,1,1,'armchair');object(11,6,1,1,'rack');
      object(11,9,3,1,'kitchenCounter');object(14,9,3,1,'coffeeBar');
      object(2,10,3,1,'bookcase');object(3,12,2,1,'readingDesk');deco(3,13,'chair');object(1,13,1,1,'armchair');
      barSeats.push([15,10],[16,10]);barSeats.forEach(([x,y])=>deco(x,y,'barStool'));
      // Enclosed quiet rooms flank the hall; the front lounge stays open-plan.
      for(const x of [7,10]) {
        object(x,1,1,3,'glass',{edge:true,divider:true});
        object(x,6,1,x===7?5:3,'glass',{edge:true,divider:true});
        if(x===7)object(x,13,1,2,'glass',{edge:true,divider:true});
      }
      object(1,8,7,1,'glass',{edge:true,divider:true,joinAt:'end'});object(10,8,7,1,'glass',{edge:true,divider:true,joinAt:'start'});
      Object.assign(zones,{read:[[3,13]],write:[[14,3]],web:[[15,4]],bash:[[12,6]],think:[[1,3],[5,4]],idle:[[11,12],[15,12],[2,13]]});
    } else {
      object(3,3,4,2,'table');[[2,3],[2,4],[7,3],[7,4],[4,2],[6,2],[3,5],[5,5]].forEach(([x,y])=>deco(x,y,'chair'));
      object(11,10,4,1,'sofa');object(12,13,2,1,'coffeeTable');object(16,13,1,1,'armchair');object(18,10,3,1,'coffeeBar');
      object(21,10,3,1,'kitchenCounter',{microwave:true});object(24,10,1,1,'fridge');
      object(21,15,3,2,'diningTable');deco(20,15,'chair');deco(24,16,'chair');
      object(11,15,4,1,'tvConsole');object(10,15,1,1,'speaker');object(15,15,1,1,'speaker');
      barSeats.push([18,11],[19,11]);barSeats.forEach(([x,y])=>deco(x,y,'barStool'));
      object(1,10,1,3,'bookcase');object(2,11,2,1,'readingDesk');object(5,11,2,1,'readingDesk');
      deco(2,12,'chair');deco(5,12,'chair');
      object(8,9,1,3,'glass',{edge:true,divider:true});object(8,14,1,2,'glass',{edge:true,divider:true,trimEnd:true});
      object(1,9,8,1,'glass',{edge:true,divider:true,joinAt:'end'});object(1,15,8,1,'glass',{edge:true,divider:true,joinAt:'end'});
      object(8,18,1,1,'glass',{edge:true,divider:true});
      object(9,8,5,1,'glass',{edge:true,divider:true,joinAt:'start'});object(16,8,6,1,'glass',{edge:true,divider:true,joinAt:'end'});
      // One open work cluster: short aisles between desks, no glass to walk around.
      // Meeting has a direct door to the workspace plus its original hall entrance.
      object(9,1,1,3,'glass',{edge:true});object(9,6,1,3,'glass',{edge:true,trimEnd:true});
      object(1,7,3,1,'glass',{edge:true});object(6,7,4,1,'glass',{edge:true,joinAt:'end'});
      object(21,1,1,4,'glass',{edge:true,divider:true});object(21,7,1,3,'glass',{edge:true,divider:true,trimEnd:true});
      object(21,9,4,1,'glass',{edge:true,divider:true,joinAt:'start'});
      object(22,3,1,1,'rack');object(24,3,1,1,'rack');object(22,6,2,1,'controlDesk');deco(22,7,'chair');
      Object.assign(zones,{read:[[2,12],[5,12],[11,3],[14,3],[17,3]],write:[[11,6],[14,6],[17,6]],web:[[18,6]],bash:[[22,7],[23,5]],think:[[2,3],[7,4]],idle:[[11,12],[16,14],[18,11],[20,15],[24,16]]});
    }
    if(!home){
      deco(2,16,'daybed',{rotated:true});deco(5,17,'daybed');napSpots.push([2,16],[2,17],[5,17],[6,17]);
      object(1,16,1,1,'bedside');object(7,16,1,1,'plant');
    }
    object(1,1,1,1,home?'plant':'avCabinet');object(COLS-2,1,1,1,'plant');object(1,ROWS-2,1,1,'plant');
    for(let x=0;x<COLS;x++){wall(x,0);if(x!==ENTRY[0]&&x!==ENTRY[0]+1)wall(x,ROWS-1);}
    for(let y=0;y<ROWS;y++){wall(0,y);wall(COLS-1,y);}
    roamSpots.push(...zones.idle,...barSeats);
  }
  zones.talk=zones.think;zones.agent=zones.think;
  // Keep the facade running below the crop, like the original large office.
  Object.assign(VIEW,{x:OX-(ROWS-2)*12,y:OY-WALL-16,w:(COLS+ROWS-4)*12,h:(COLS+ROWS-2)*6+WALL+36});
  cv.width=VIEW.w*SCALE;cv.height=VIEW.h*SCALE;
  for(const a of agents.values())Object.assign(a,{x:ENTRY[0],y:ENTRY[1],path:[],target:null,roamTarget:null,nextRoam:0,sleeping:false,sleepSpot:null,sx:undefined,sy:undefined});
  for(const key of Object.keys(OFFICE_LAYOUTS))document.getElementById('layout-'+key).checked=key===name;
}
function upperBedAt(a) {
  return objects.find(o=>o.kind==='daybed'&&(o.rotated ? o.x===a.x&&o.y+1===a.y : o.x+1===a.x&&o.y===a.y));
}
function sleepTarget(a, now, night) {
  if (!night || a.state !== 'idle' || now - (a.idleSince ?? now) < 3*60e3) {
    a.sleepSpot = null; a.sleeping = false; return null;
  }
  if (!a.sleepSpot) a.sleepSpot = napSpots.find(p => ![...agents.values()].some(other => other !== a && other.sleepSpot && key(...other.sleepSpot) === key(...p))) || null;
  a.sleeping = !!a.sleepSpot && !a.path.length && a.x === a.sleepSpot[0] && a.y === a.sleepSpot[1];
  return a.sleepSpot;
}
function chooseTarget(a, assigned, now) {
  const nap = sleepTarget(a,Date.now(),lighting.label === 'กลางคืน');
  if (nap) return nap;
  if (a.state !== 'idle') return assigned;
  if (!a.roamTarget || (!a.path.length && now >= a.nextRoam)) {
    const candidates = roamSpots.filter(([x,y]) => !blocked.has(key(x,y)) && (x !== a.x || y !== a.y) &&
      ![...agents.values()].some(other => other !== a && ((other.x === x && other.y === y) || (other.roamTarget && key(...other.roamTarget) === key(x,y)))));
    a.roamTarget = candidates[Math.floor(Math.random()*candidates.length)] || assigned;
    a.nextRoam = Infinity;
  }
  if (!a.path.length && a.x === a.roamTarget[0] && a.y === a.roamTarget[1] && a.nextRoam === Infinity) a.nextRoam = now + 3000 + Math.random()*5000;
  return a.roamTarget;
}

// ---------- isometric pixel helpers ----------
const iso = (gx, gy) => [OX + (gx - gy) * TW / 2, OY + (gx + gy) * TH / 2];
const up = (p, h) => [p[0], p[1] - h];
const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
function poly(pts, c) {                       // crisp scanline fill for convex polygons
  ctx.fillStyle = c;
  const ys = pts.map(p => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y < Math.ceil(Math.max(...ys)); y++) {
    const yc = y + .5, xs = [];
    pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length];
      if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); });
    if (xs.length < 2) continue;
    const xa = Math.round(Math.min(...xs)), xb = Math.round(Math.max(...xs));
    ctx.fillRect(xa, y, xb - xa, 1);
  }
}
const quad = (gx, gy, w, d) => [iso(gx, gy), iso(gx + w, gy), iso(gx + w, gy + d), iso(gx, gy + d)];
// box on footprint gx..gx+w, gy..gy+d with height h, raised by z
function box(gx, gy, w, d, h, top, left, right, z = 0) {
  const [A, B, Cc, D] = quad(gx, gy, w, d).map(p => up(p, z));
  poly([D, Cc, up(Cc, h), up(D, h)], left);
  poly([B, Cc, up(Cc, h), up(B, h)], right);
  poly([up(A, h), up(B, h), up(Cc, h), up(D, h)], top);
}
// point on the front-left face (the +gy side) of a footprint: u along x, v height
const faceL = (gx, gy, w, d, u, v) => up(lerp(iso(gx, gy + d), iso(gx + w, gy + d), u), v);
const faceR = (gx, gy, w, d, u, v) => up(lerp(iso(gx + w, gy), iso(gx + w, gy + d), u), v);

// back walls: 'r' runs along gx at gy=1, 'l' runs along gy at gx=1
const wallPt = (side, a, h) => up(side === 'r' ? iso(a, 1) : iso(1, a), h);
const wallQuad = (side, a, b, h0, h1, c) => poly([wallPt(side, a, h0), wallPt(side, b, h0), wallPt(side, b, h1), wallPt(side, a, h1)], c);
function wallText(side, a, h, text, font, color, align='left') {
  const [x, y] = wallPt(side, a, h);
  ctx.save(); ctx.translate(x, y); ctx.transform(1, side === 'r' ? .5 : -.5, 0, 1, 0, 0);
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign=align;ctx.fillText(text, 0, 0); ctx.restore();
}
function floorText(gx, gy, text) {                // text painted flat on the floor along gx
  const [x, y] = iso(gx, gy);
  ctx.save(); ctx.translate(x, y); ctx.transform(1, .5, -1, .5, 0, 0);
  ctx.font = 'bold 15px "Press Start 2P", monospace'; ctx.fillStyle = 'rgba(15,42,82,.22)'; ctx.fillText(text, 0, 0); ctx.restore();
}

// ---------- room ----------
const BUILDINGS = {
  modern: { walkway:["#e9eef6","#e2e9f3"], palette:{...C}, floors:null, facade:['#71859f','#4d6382'], trim:'#9cacc2' },
  cyber: { walkway:["#252b43","#20253b"], palette:{ navy:'#171a32', blue:'#55dce5', blue2:'#6c5dcc', blue3:'#403a77', wall:'#30324d', wallSide:'#232840', edge:'#65759b', wood:'#6c647f', woodDark:'#423e59', glass:'rgba(113,91,220,.26)', glassTop:'#e583db' }, floors:{wood:['#46425a','#3c3c55'],tile:['#313b53','#293249'],carpet:['#51477a','#443b69'],dark:['#242d43','#1d253a']}, facade:['#34344f','#252740'],trim:'#cf78dc' },
  loft: { walkway:["#a99e90","#9e9387"], palette:{ navy:'#303741', blue:'#8d694a', blue2:'#a17b56', blue3:'#665240', wall:'#bb8a72', wallSide:'#996c59', edge:'#c1ad96', wood:'#c59863', woodDark:'#805c3f', glass:'rgba(163,192,193,.25)', glassTop:'#747f83' }, floors:{wood:['#c3a17d','#b79773'],tile:['#c3b8a7','#b8ac9b'],carpet:['#6b777e','#606c73'],dark:['#464e55','#3b444b']}, facade:['#936c5b','#684f48'],trim:'#b58e6c' },
  garden: { walkway:["#d4decd","#c8d5c1"], palette:{ navy:'#315c53', blue:'#4d8e7b', blue2:'#70ab93', blue3:'#3e6d5a', wall:'#edf0dd', wallSide:'#d6e1ce', edge:'#b8cec1', wood:'#c4a26f', woodDark:'#8f744d', glass:'rgba(136,206,187,.28)', glassTop:'#87bbaa' }, floors:{wood:['#d9caac','#d0c0a0'],tile:['#ebefe0','#dfe7d6'],carpet:['#8ab4a1','#7ea994'],dark:['#46645e','#3b5852']}, facade:['#a2b6a8','#738f83'],trim:'#c1d3ba' },
};
let buildingTheme='modern';
function setBuilding(theme) {
  if(!BUILDINGS[theme])return;
  buildingTheme=theme;
  const {sky,sky2}=C;
  Object.assign(C,BUILDINGS.modern.palette,BUILDINGS[theme].palette,{sky,sky2});
}
function workRoleColor(role) {return {developer:C.blue,tester:C.leaf,uxui:C.orange}[role];}
function floorColor(kind, x, y) {
  const odd = (x + y) % 2;
  const style=BUILDINGS[buildingTheme];
  const tint=workRoleColor(kind);
  if(tint) {
    const base=floorColor('tile',x,y);
    return '#'+[1,3,5].map(i=>Math.round(parseInt(base.slice(i,i+2),16)*.82+parseInt(tint.slice(i,i+2),16)*.18).toString(16).padStart(2,'0')).join('');
  }
  if (!kind) return style.walkway[odd?0:1];
  const pair=style.floors?.[kind];
  if(pair)return pair[odd?0:1];
  return { wood: odd ? '#e8d4b0' : '#e2cca5', tile: odd ? '#f7f9fc' : '#edf2f9', carpet: odd ? '#3d70c2' : '#3567b8', dark: odd ? '#2f394e' : '#2a3346' }[kind]
    || (odd ? '#e9eef6' : '#e2e9f3');
}
const BACKGROUNDS = {
  rain: { sky:['#12263e','#8ab6ca'], horizon:['#40596c','#d1e0df'], base:['#1c3349','#a1b9c4'], near:['#203e52','#7c9da9'], far:['#425d70','#b0c8cf'], accent:'#efce91' },
  sunset: { sky:['#241f46','#b5a2d4'], horizon:['#73516f','#f3bd9e'], base:['#332d50','#c7a5b5'], near:['#403c63','#9a8cae'], far:['#685a7f','#c8afc8'], accent:'#ffe0a0' },
  neon: { sky:['#130f32','#8babc9'], horizon:['#34234e','#c5bfd8'], base:['#171c3e','#8a9fba'], near:['#25203f','#6c7e9e'], far:['#3b3559','#a6afca'], accent:'#76e4ef' },
  sage: { sky:['#172d2a','#a8c5b0'], horizon:['#415b4c','#dce6cf'], base:['#253b32','#b7c8ac'], near:['#304b3c','#7f9b83'], far:['#506b59','#c0d1b8'], accent:'#e4d9a0' },
  sand: { sky:['#30283a','#d7c3a3'], horizon:['#705d58','#f2dfbc'], base:['#3e3435','#cdbb9e'], near:['#534747','#aa9275'], far:['#7c6b60','#dfceb0'], accent:'#ffda94' },
};
let backgroundTheme='rain';
try { const saved=localStorage.getItem('office-background'); if(BACKGROUNDS[saved])backgroundTheme=saved; setBuilding(localStorage.getItem('office-building')); } catch {}
const backgroundSelect=document.getElementById('background-theme');
backgroundSelect.value=backgroundTheme;
backgroundSelect.onchange=()=>{
  if(!BACKGROUNDS[backgroundSelect.value])return;
  backgroundTheme=backgroundSelect.value;
};
const settingsDialog=document.getElementById('scene-settings');
let settingsSnapshot=null;
function openSettings() {
  settingsSnapshot={building:buildingTheme,background:backgroundTheme,layout:officeLayout,language:i18n.language};
  backgroundSelect.value=backgroundTheme;
  backgroundSelect.refreshAppearance?.();
  Object.keys(BUILDINGS).forEach(name=>{document.getElementById(`building-${name}`).checked=name===buildingTheme;});
  settingsDialog.showModal();
}
function cancelSettings() {
  if(settingsSnapshot){if(officeLayout!==settingsSnapshot.layout)setLayout(settingsSnapshot.layout);setBuilding(settingsSnapshot.building);backgroundTheme=settingsSnapshot.background;backgroundSelect.value=backgroundTheme;backgroundSelect.refreshAppearance?.();i18n.setLanguage(settingsSnapshot.language);settingsSnapshot=null;}
  settingsDialog.close();
}
const MATCHING_BACKGROUNDS = { modern:'rain', cyber:'neon', loft:'sunset', garden:'rain' };
function chooseBuilding(theme) {
  if(!BUILDINGS[theme])return;
  setBuilding(theme);
  backgroundTheme=MATCHING_BACKGROUNDS[theme];
  backgroundSelect.value=backgroundTheme;
  backgroundSelect.refreshAppearance?.();
}
Object.keys(BUILDINGS).forEach(name=>{document.getElementById(`building-${name}`).onchange=()=>chooseBuilding(name);});
Object.keys(OFFICE_LAYOUTS).forEach(name=>{document.getElementById('layout-'+name).onchange=()=>setLayout(name);});
try{setLayout(localStorage.getItem('office-layout')||'large');}catch{setLayout('large');}
document.getElementById('open-settings').onclick=openSettings;
document.getElementById('cancel-settings').onclick=cancelSettings;
document.getElementById('close-settings').onclick=cancelSettings;
settingsDialog.oncancel=e=>{e.preventDefault();cancelSettings();};
settingsDialog.onclose=()=>{if(settingsSnapshot)cancelSettings();};
document.getElementById('save-settings').onclick=()=>{
  try { localStorage.setItem('office-background',backgroundTheme);localStorage.setItem('office-building',buildingTheme);localStorage.setItem('office-layout',officeLayout); } catch {}
  settingsSnapshot=null;settingsDialog.close();
};
function drawBangkok(t) {
  const theme=BACKGROUNDS[backgroundTheme];
  const day = lighting.daylight, twilight = lighting.label === 'ยามเย็น' || lighting.label === 'ยามเช้า';
  const mix = (a,b) => '#' + [1,3,5].map(i => Math.round(parseInt(a.slice(i,i+2),16)*(1-day)+parseInt(b.slice(i,i+2),16)*day).toString(16).padStart(2,'0')).join('');
  const sky = ctx.createLinearGradient(0,VIEW.y,0,VIEW.y+VIEW.h);
  sky.addColorStop(0,mix(...theme.sky));
  sky.addColorStop(.48,twilight ? (backgroundTheme==='neon'?'#895e9d':'#e6ad9f') : mix(...theme.horizon));
  sky.addColorStop(1,mix(...theme.base));
  ctx.fillStyle=sky;ctx.fillRect(VIEW.x,VIEW.y,VIEW.w,VIEW.h);
  // The surroundings change with office elevation, while atmosphere stays independent.
  if(day<.35){
    for(let i=0;i<38;i++) rect(VIEW.x+(i*79+19)%VIEW.w,VIEW.y+4+(i*31)%42,1,1,'#d9e6ef');
    const mx=VIEW.x+VIEW.w*.85,my=VIEW.y+14;
    rect(mx,my,12,12,'#fff0be');rect(mx+4,my-2,7,3,'#fff0be');rect(mx+4,my,10,9,mix(...theme.sky));
  } else {
    rect(VIEW.x+VIEW.w*.85,VIEW.y+12,16,16,twilight?'#ffd398':'#fff1ce');
    for(const u of [.12,.48,.7]){const x=VIEW.x+VIEW.w*u,y=VIEW.y+22+u*15;rect(x,y,32,4,'#ffffff55');rect(x+8,y-3,18,4,'#ffffff55');}
  }
  const style=BUILDINGS[buildingTheme];
  ctx.save();ctx.beginPath();ctx.rect(VIEW.x,VIEW.y,VIEW.w,VIEW.h);ctx.clip();
  drawOfficeSurroundings(t,{near:mix(...theme.near),far:mix(...theme.far),base:mix(...theme.base),sky:mix(...theme.sky),accent:theme.accent,leaf:mix('#24483c',buildingTheme==='garden'?'#6f9e68':'#739574'),roof:style.facade[0],trim:style.trim});
  if(backgroundTheme==='rain')for(let i=0;i<4;i++) {
    const x=VIEW.x+((t/600+i*179)%(VIEW.w+160))-160;
    rect(x,VIEW.y+45+i*13,155,3,'#d4e5ef17');
  }
  ctx.restore();
}

function drawBuildingExterior(t=0) {
  const style=BUILDINGS[buildingTheme];
  const maxX=COLS-1,maxY=ROWS-1;
  // Equal-height facades for every layout, long enough to hide the ground below the crop.
  const depth=EXTERIOR_HEIGHT;
  const left = [iso(1,maxY),iso(maxX,maxY)], right = [iso(maxX,1),iso(maxX,maxY)];
  const face = (edge, top, bottom, color) => poly([up(edge[0],-top),up(edge[1],-top),up(edge[1],-bottom),up(edge[0],-bottom)],color);
  face(left,0,depth,style.facade[0]); face(right,0,depth,style.facade[1]);
  // Repeat the main office's floor-to-floor height down both exterior faces.
  for(let floor=0;floor*WALL<depth;floor++) {
    const slab=floor*WALL,z=slab+16;
    face(left,slab+5,Math.min(slab+8,depth),style.trim);face(right,slab+5,Math.min(slab+8,depth),style.trim);
    if(z+42>depth)continue;
    for(const side of ['front','side']) {
      const end=side==='front'?maxX:maxY;
      const point=a=>side==='front'?iso(a,maxY):iso(maxX,a);
      for(let a=2;a+1.5<end-1;a+=3) {
        const lit=lighting.daylight<.6&&(a+floor)%3===0;
        face([point(a),point(a+1.5)],z,z+40,C.navy);
        face([point(a+.12),point(a+1.38)],z+2,z+38,lit?'#edc587':C.sky);
        face([point(a+.7),point(a+.8)],z+2,z+38,style.trim);
        face([point(a-.1),point(a+1.6)],z+40,z+42,style.trim);
        if(buildingTheme==='loft')face([point(a-.2),point(a+1.7)],z-2,z,C.woodDark);
        if(buildingTheme==='garden')face([point(a),point(a+1.5)],z+37,z+40,C.leaf);
      }
    }
  }
  face(left,depth-5,depth,style.trim);face(right,depth-5,depth,style.trim);
  face([iso(1,maxY),iso(1.35,maxY)],0,depth,style.trim);
  face([iso(maxX-.35,maxY),iso(maxX,maxY)],0,depth,style.trim);
  face([iso(maxX,maxY-.35),iso(maxX,maxY)],0,depth,style.trim);
  if(buildingTheme==='cyber') {
    face([iso(maxX-.1,maxY),iso(maxX,maxY)],0,depth,'#ed83db');
    face([iso(maxX,maxY-.15),iso(maxX,maxY)],0,depth,'#5de6e6');
  }
  // The illuminated billboard fits between the first two exterior window rows.
  const signEnd=Math.min(12,maxX-2),signEdge=[iso(2,maxY),iso(signEnd,maxY)];
  ctx.save();ctx.shadowColor=C.sky;ctx.shadowBlur=lighting.daylight<.5?10:4;
  face(signEdge,59,86,C.sky);
  ctx.shadowBlur=0;
  face([iso(2.15,maxY),iso(signEnd-.15,maxY)],61,84,C.navy);
  const [sx,sy]=up(iso(2.6,maxY),-66);
  ctx.translate(sx,sy);ctx.transform(1,.5,0,1,0,0);
  ctx.shadowColor=C.sky;ctx.shadowBlur=lighting.daylight<.5?8:3;
  rect(0,0,10,13,C.sky);rect(3,3,4,7,C.white);
  ctx.font='bold 6px monospace';ctx.textAlign='left';ctx.fillStyle=C.white;
  const message='Created By Dhiteta AI',textWidth=ctx.measureText(message).width;
  const textArea=(signEnd-2.6)*TW/2-20,cycle=textWidth+24;
  ctx.beginPath();ctx.rect(15,-2,textArea,18);ctx.clip();
  const textX=15-((t/65)%cycle);
  for(let x=textX;x<15+textArea;x+=cycle)ctx.fillText(message,x,10);
  ctx.restore();
}

function drawCompactRoom(t) {
  drawBangkok(t);
  const right=COLS-1,front=ROWS-1;
  drawBuildingExterior(t);
  for(let y=1;y<front;y++)for(let x=1;x<right;x++){
    const area=AREAS.find(a=>x>=a.x&&x<a.x+a.w&&y>=a.y&&y<a.y+a.h);
    poly(quad(x,y,1,1),floorColor(area?.floor,x,y));
  }
  poly(quad(ENTRY[0],front,2,1),C.blue);
  wallQuad('l',1,front,0,WALL,C.wallSide);wallQuad('r',1,right,0,WALL,C.wall);
  for(const [side,end] of [['l',front],['r',right]]){
    wallQuad(side,1,end,0,5,C.blue);wallQuad(side,1,end,WALL-5,WALL,C.navy);
    if(buildingTheme==='cyber'){wallQuad(side,1,end,9,10,'#55e6e5');wallQuad(side,1,end,62,64,'#ed83db');}
    if(buildingTheme==='loft')for(let h=8;h<65;h+=8)wallQuad(side,1,end,h,h+.6,'#806451');
  }
  const windows=officeLayout==='medium' ? [['r',11,14],['r',17,20]] : [['l',2,5],['r',2,6],['r',right-5,right-1]];
  for(const [side,a,b] of windows){
    wallQuad(side,a,b,22,59,C.navy);wallQuad(side,a+.15,b-.15,24,57,C.sky);wallQuad(side,a+.15,b-.15,43,57,C.sky2);
    for(let m=a+1;m<b;m++)wallQuad(side,m-.04,m+.04,24,57,C.navy);
  }
  {
    // Both compact layouts place the meeting room against these back walls.
    wallQuad('l',2,5,20,59,C.navy);wallQuad('l',2.15,4.85,22,57,C.blue3);
    wallText('l',3.5,40,'MEETING','bold 4px monospace',C.white,'center');
    wallQuad('l',2.4,4.5,30,32,C.blue2);
    wallQuad('r',1.5,5.8,24,57,C.edge);wallQuad('r',1.65,5.65,26,55,C.white);
    wallText('r',1.9,47,'ROADMAP','bold 5px monospace',C.navy);
    for(let i=0;i<3;i++) {
      const a=1.95+i*1.1;
      wallQuad('r',a,a+.8,38,41,[C.blue,C.orange,C.leaf][i]);
      wallQuad('r',a,a+.65,31,33,C.edge);
    }
  }
  if(officeLayout==='medium') {
    wallQuad('r',14.4,16.6,28,58,C.edge);wallQuad('r',14.55,16.45,30,56,C.white);
    wallText('r',14.65,49,'WORK','bold 4px monospace',C.navy);
    for(let i=0;i<3;i++) {
      wallQuad('r',14.75,16.15,43-i*5,44-i*5,[C.blue,C.orange,C.leaf][i]);
    }
    // No glazing behind server racks: just a taped maintenance note.
    wallQuad('r',22.5,24.1,34,52,'#fff1bd');
    wallQuad('r',22.95,23.6,51,54,C.edge);
    wallText('r',22.65,46,'LOG','bold 4px monospace',C.navy);
    for(let i=0;i<2;i++)wallQuad('r',22.75,23.85,39-i*3,40-i*3,C.woodDark);
    const count=runningCommands(),statusColor=count?'#75edb5':'#9ab0c8';
    wallQuad('r',22,24.8,58,67,C.navy);
    wallQuad('r',22.15,22.32,61,63,statusColor);
    wallText('r',22.45,61,count?'RUNNING · '+count:'IDLE','bold 3px monospace',statusColor);
  }
}
const zoneNames={WORKSPACE:'ทำงาน',MEETING:'ประชุม',LOUNGE:'นั่งเล่น',QUIET:'มุมสงบ',REST:'พักผ่อน',SERVER:'เซิร์ฟเวอร์',KITCHEN:'ครัว'};
const zoneSigns={
  WORKSPACE:{x:12,y:8,h:20,label:'WORKSPACE',description:'โต๊ะทำงานร่วมกัน เดินคุยกับเพื่อนได้สะดวก'},
  MEETING:{x:9,y:2,h:20,label:'MEETING',description:'ประชุม วางแผนงาน และนำเสนอบนทีวี'},
  QUIET:{x:8,y:10,h:20,label:'QUIET ROOM',description:'อ่านหนังสือและทำงานที่ต้องใช้สมาธิ'},
  REST:{x:1,y:17,h:35,label:'BEDROOM',description:'พักผ่อนและนอนพักบนเตียงสองชั้น'},
  SERVER:{x:21,y:7.5,h:21,label:'SERVER',description:'ดูแลเซิร์ฟเวอร์และตรวจสถานะคำสั่ง'},
};
const layoutSigns={
  medium:zoneSigns,
  home:{
    WORK:{x:10,y:2,h:20,slope:-.5,label:'WORKSPACE',description:'ห้องทำงานและเครื่องเซิร์ฟเวอร์'},
    MEETING:{x:7,y:2,h:20,label:'MEETING',description:'ประชุมและวางแผนงานร่วมกัน'},
    QUIET:{x:7,y:10,h:20,label:'QUIET ROOM',description:'อ่านหนังสือและทำงานอย่างสงบ'},
  },
  large:{
    DEVELOPER:{x:15,y:7.45,h:21,label:'DEVELOPER',description:'โซนพัฒนาโปรแกรม · โต๊ะทำงาน 4 จุด'},
    TESTER:{x:20.5,y:7.45,h:21,label:'TESTER',description:'โซนทดสอบและตรวจสอบคุณภาพ · โต๊ะทำงาน 2 จุด'},
    'UX/UI':{x:24.8,y:7.45,h:21,label:'UX/UI',description:'โซนออกแบบประสบการณ์และหน้าจอ · โต๊ะทำงาน 2 จุด'},
    MEETING:{x:8,y:2,h:20,label:'MEETING',description:'ประชุมและนำเสนอแผนงาน'},
    'QUIET ROOM':{x:8,y:19.5,h:20,slope:-.5,label:'BEDROOM',description:'พักผ่อนและนอนพักบนเตียงสองชั้น'},
    SERVER:{x:25,y:2,h:20,label:'SERVER',description:'ดูแลเซิร์ฟเวอร์และตรวจสถานะคำสั่ง'},
    HUDDLE:{x:8,y:8.5,h:20,slope:-.5,label:'HUDDLE ROOM',description:'ห้องประชุมเล็กสำหรับคุยงานกลุ่มย่อย'},
    FOCUS:{x:25,y:15,h:20,slope:-.5,label:'FOCUS ROOM 1',description:'ห้องทำงานเงียบส่วนตัว ห้องที่ 1'},
    'FOCUS 2':{x:28,y:15,h:20,slope:-.5,label:'FOCUS ROOM 2',description:'ห้องทำงานเงียบส่วนตัว ห้องที่ 2'},
    'TEAM OFFICE':{x:25,y:10.75,h:20,slope:-.5,label:'TEAM OFFICE',description:'ห้องทำงานทีมย่อย ใกล้พื้นที่ทำงานหลัก'},
  },
};
const zoneSign=area=>layoutSigns[officeLayout][area.title];
const zonePoint=area=>{const s=zoneSign(area);return up(iso(s.x,s.y),s.h);};
const zoneSignSlope=area=>zoneSign(area).slope??(['MEETING','QUIET','REST','SERVER'].includes(area.title)?-.5:.5);
const zoneSignWidth=()=>16;
function hoveredZone(x,y) {
  return AREAS.find(area=>{if(!zoneSign(area))return false;const [px,py]=zonePoint(area);return Math.abs(x-px)<=zoneSignWidth(area)/2+2&&Math.abs(y-py-zoneSignSlope(area)*(x-px))<=7;});
}
function drawZoneLabels() {
  ctx.save();ctx.font='bold 5px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const area of AREAS) {
    if(!zoneSign(area))continue;
    const [x,y]=zonePoint(area),width=zoneSignWidth(area);
    ctx.save();ctx.translate(x,y);ctx.transform(1,zoneSignSlope(area),0,1,0,0);
    rect(-width/2,-4,width,8,C.navy);
    rect(-width/2+1,-3,width-2,6,C.edge);
    rect(-width/2+2,-2,width-4,4,C.white);
    rect(-width/2+2,0,1,1,C.navy);rect(width/2-3,0,1,1,C.navy);
    rect(-2,-2,4,4,C.navy);rect(-1,-1,2,2,C.white);
    ctx.restore();
  }
  ctx.restore();
}
function drawRoom(t) {
  if(officeLayout!=='large'){drawCompactRoom(t);return;}
  drawBangkok(t);
  drawBuildingExterior(t);
  // floor
  for (let y = 1; y < 21; y++) for (let x = 1; x < 31; x++) {
    const area = AREAS.find(a => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h);
    poly(quad(x, y, 1, 1), floorColor(area && area.floor, x, y));
  }
  poly(quad(15, 21, 2, 1), C.blue); poly(quad(15.2, 21.15, 1.6, .7), C.blue2);   // entry mat
  const lounge=AREAS.find(a=>a.title==='LOUNGE');
  poly(quad(lounge.x+.1,lounge.y+.1,lounge.w-.2,lounge.h-.2),C.edge);
  poly(quad(lounge.x+.25,lounge.y+.25,lounge.w-.5,lounge.h-.5),C.wallSide);
  // floor edge (gives the slab thickness)
  poly([iso(1, 21), iso(31, 21), up(iso(31, 21), -6), up(iso(1, 21), -6)], '#b9c9e0');
  poly([iso(31, 1), iso(31, 21), up(iso(31, 21), -6), up(iso(31, 1), -6)], '#cbd8ea');
  // Recessed cable trays stay walkable and connect the rack rows to the control desk.
  for(const x of [27,29]) {
    poly(quad(x+.42,2,.16,5),'#142037');
    poly(quad(x+.47,2,.05,5),'#467390');
  }
  poly(quad(26,7.4,4,.2),'#142037');poly(quad(26,7.47,4,.06),'#467390');

  // walls
  wallQuad('l', 1, 21, 0, WALL, C.wallSide); wallQuad('r', 1, 31, 0, WALL, C.wall);
  wallQuad('l', 1, 21, 0, 5, C.blue); wallQuad('r', 1, 31, 0, 5, C.blue);
  wallQuad('l', 1, 21, WALL - 5, WALL, C.navy); wallQuad('r', 1, 31, WALL - 5, WALL, C.navy);
  poly([up(iso(1, 1), WALL), up(iso(31, 1), WALL), up(iso(31, .6), WALL), up(iso(1, .6), WALL)], '#1b3a6b');   // wall caps
  poly([up(iso(1, 1), WALL), up(iso(1, 21), WALL), up(iso(.6, 21), WALL), up(iso(.6, 1), WALL)], '#1b3a6b');
  if(buildingTheme==='cyber') {
    for(const side of ['l','r']) {
      wallQuad(side,1,side==='l'?21:31,9,10,'#55e6e5');
      wallQuad(side,1,side==='l'?21:31,64,66,'#ed83db');
    }
    for(let x=17;x<26;x+=2)wallQuad('r',x,x+.8,16,18,'#e583db');
  } else if(buildingTheme==='loft') {
    for(const side of ['l','r']) {
      const end=side==='l'?21:31;
      for(let h=8;h<70;h+=8) {
        wallQuad(side,1,end,h,h+.6,'#806451');
        for(let a=1+(h%16?1:0);a<end;a+=2)wallQuad(side,a,a+.04,h,h+7,'#806451');
      }
      wallQuad(side,1,end,62,65,'#454d55');
      wallQuad(side,10.5,10.65,5,65,'#454d55');
    }
  } else if(buildingTheme==='garden') {
    [10.5,12,15.5,17.5].forEach(a=>{
      wallQuad('l',a,a+.9,34,53,'#527f60');
      const p=wallPt('l',a+.45,39);plantTop(p,.55);
    });
    wallQuad('r',1,31,8,11,'#aa916b');
  }
  // windows
  const win = (side, a, b) => {
    wallQuad(side, a, b, 22, 60, C.navy); wallQuad(side, a + .15, b - .15, 24, 58, C.sky); wallQuad(side, a + .15, b - .15, 44, 58, C.sky2);
    for (let m = a + 1; m < b; m++) wallQuad(side, m - .05, m + .05, 24, 58, C.navy);
  };
  win('r', 2, 5); win('r', 6, 9); win('r', 13, 15); win('l', 13, 16);
  // meeting: TV + whiteboard on the left wall
  wallQuad('l',2,5.8,24,54,C.navy);wallQuad('l',2.2,5.6,26,52,C.blue3);
  wallText('l',3.9,39,'MEETING','bold 4px monospace',C.white,'center');
  wallQuad('r',1.7,6.7,28,57,C.edge);wallQuad('r',1.85,6.55,30,55,C.white);
  wallText('r',2.1,48,'ROADMAP','bold 4px monospace',C.navy);
  for(let i=0;i<3;i++)wallQuad('r',2.1+i*1.3,3+i*1.3,36,40,[C.blue,C.orange,C.leaf][i]);
  // The small meeting room has its own screen and planning board, away from the entry.
  wallQuad('l',8.4,10.8,24,51,C.navy);wallQuad('l',8.55,10.65,26,49,C.blue3);
  wallText('l',9.6,37,'HUDDLE','bold 4px monospace',C.white,'center');
  wallQuad('l',11.1,12.7,30,54,C.edge);wallQuad('l',11.22,12.58,32,52,C.white);
  for(let i=0;i<3;i++)wallQuad('l',11.4,12.3-i*.15,46-i*4,47-i*4,[C.blue,C.orange,C.leaf][i]);
  // Team boards occupy blank wall sections, leaving the developer window and clock clear.
  for(const [a,b,bottom,top,label,tint] of [
    [10.1,12.4,18,34,'SPRINT',C.blue],
    [16.4,19.6,27,54,'QA CHECK',C.leaf],
    [20.5,24.2,27,54,'DESIGN',C.orange],
  ]) {
    wallQuad('r',a,b,bottom,top,C.edge);
    wallQuad('r',a+.12,b-.12,bottom+1,top-1,C.white);
    wallText('r',a+.25,top-5,label,'bold 3px monospace',C.navy);
    for(let col=0;col<3;col++) {
      const x=a+.25+col*(b-a-.5)/3;
      wallQuad('r',x,x+(b-a-.7)/3,bottom+3,top-8,[tint,C.sky,C.wood][col]);
      wallQuad('r',x+.04,x+(b-a-.7)/3-.04,bottom+5,bottom+5.6,C.navy);
    }
  }
  // clock
  const [cx, cy] = wallPt('r', 11.5, 46);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx, cy, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.navy; ctx.lineWidth = 1.5; ctx.stroke(); ctx.beginPath();
  const am = lighting.minute / 60 * Math.PI * 2, ah = ((lighting.hour % 12) + lighting.minute/60) / 12 * Math.PI * 2;
  ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(am) * 4.5, cy - Math.cos(am) * 5);
  ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ah) * 3, cy - Math.cos(ah) * 3.5); ctx.stroke();
}

// ---------- furniture ----------
function shadowQ(gx, gy, w, d) { poly(quad(gx + .05, gy + .15, w, d), 'rgba(15,42,82,.14)'); }
function plantTop(p, s = 1) {
  const [x, y] = p;
  rect(x - 7 * s, y - 10 * s, 14 * s, 9 * s, C.leaf); rect(x - 4 * s, y - 15 * s, 8 * s, 6 * s, C.leaf2);
  rect(x - 9 * s, y - 6 * s, 4 * s, 4 * s, C.leaf2); rect(x + 5 * s, y - 8 * s, 4 * s, 4 * s, C.leaf2);
}
function drawObject(o, t) {
  const { x, y, w, d } = o;
  switch (o.kind) {
    case 'controlDesk':
      shadowQ(x,y,w,d);
      box(x,y,w,d,10,'#d7e4f2','#8ba1bd','#6b83a5');
      for(let i=0;i<2;i++) {
        const mx=x+.1+i*2;
        box(mx,y+.12,.85,.15,12,C.navy,'#243957','#142945',10);
        const [sx,sy]=up(iso(mx,y+.27),12);
        poly([[sx,sy],[sx+9,sy+4.5],[sx+9,sy-4],[sx,sy-8.5]],'#59c9bb');
        poly(quad(mx+.1,y+.5,.65,.25),'#314860');
      }
      break;
    case 'serverStatus': {
      const [sx,sy]=iso(x+.5,y+1);
      box(x+.4,y+.4,.2,.3,24,'#7086a5','#354d6b','#203754');
      rect(sx-25,sy-47,50,26,C.navy);rect(sx-23,sy-45,46,22,'#11263b');
      const count=runningCommands();
      ctx.font='bold 6px "Pixelify Sans", sans-serif';ctx.fillStyle='#a8bed5';ctx.fillText('COMMANDS',sx-20,sy-37);
      ctx.font='bold 10px "Pixelify Sans", sans-serif';ctx.fillStyle=count?'#75edb5':'#9ab0c8';ctx.fillText(String(count).padStart(2,'0'),sx-20,sy-26);
      ctx.font='6px "Pixelify Sans", sans-serif';ctx.fillText(count?'ACTIVE':'STANDBY',sx-5,sy-26);
      break;
    }
    case 'restWall': {
      const h = 29;
      const thin = w > d ? [x,y+.25,w,.2] : [x+w-.2,y+.25,.2,d-.25];
      box(...thin,h,'#c5cee0','#a9b8d0','#8299b8');
      box(...thin,3,C.navy,C.blue3,C.navy,h);
      break;
    }
    case 'bedside':
      box(x+.1,y+.1,.8,.8,8,C.wood,C.woodDark,C.woodDark);
      box(x+.3,y+.3,.4,.4,1,C.navy,C.navy,C.navy,8);
      box(x+.47,y+.47,.06,.06,7,C.woodDark,C.woodDark,C.woodDark,9);
      box(x+.2,y+.2,.6,.6,4,'#f5d58b',C.orange,C.wood,16);
      break;
    case 'daybed': {
      const b=(gx,gy,bw,bd,...rest)=>o.rotated ? box(x+gy-y,y+gx-x,bd,bw,...rest) : box(gx,gy,bw,bd,...rest);
      shadowQ(x,y,o.rotated?1:2,o.rotated?2:1);
      for (const z of [5,27]) {
        b(x,y,2,1,2,C.wood,C.woodDark,'#b07f4a',z-2);
        b(x+.05,y+.05,1.9,.9,3,'#c4d7ef','#a6bedf','#8da8cd',z);
        b(x+.12,y+.12,.45,.72,2,'#fff','#e9eef6','#dfe7f2',z+3);
        b(x+.8,y+.08,1.1,.84,1,C.blue2,C.blue3,C.blue,z+3);
      }
      for (const [dx,dy] of [[0,0],[1.9,0],[0,.9],[1.9,.9]]) b(x+dx,y+dy,.1,.1,36,C.wood,C.woodDark,'#b07f4a');
      b(x+.05,y,1.9,.08,3,C.wood,C.woodDark,'#b07f4a',33);
      for (const dx of [1.5,1.9]) b(x+dx,y+1,.06,.06,29,C.wood,C.woodDark,'#b07f4a');
      for (const z of [6,13,20,27]) b(x+1.5,y+1,.46,.06,1,C.wood,C.woodDark,'#b07f4a',z);
      break;
    }
    case 'sofa':
      shadowQ(x, y, w, d);
      box(x, y + (o.reverse ? 0 : .2), w, .8, 7, C.blue2, C.blue3, C.blue3);
      if(!o.reverse)box(x,y,w,.3,16,C.blue3,C.blue,C.blue3);
      box(x - .05, y, .3, 1, 11, C.navy, C.blue3, C.navy); box(x + w - .25, y, .3, 1, 11, C.navy, C.blue3, C.navy);
      for(const dx of [.6,2.6])box(x+dx,y+(o.reverse ? .45 : .35),.6,.2,6,'#fff','#e9eef6','#dfe7f2',7);
      // The near backrest must cover cushions when the sofa faces away from us.
      if(o.reverse)box(x,y+.7,w,.3,16,C.blue3,C.blue3,C.navy);
      break;
    case 'armchair':
      shadowQ(x, y, w, d);
      box(x + .1, y + .1, .8, .8, 6, C.blue2, C.blue3, C.blue3); box(x + (o.facingRight ? .05 : .7), y + .1, .25, .8, 14, C.blue3, C.blue, C.navy);
      break;
    case 'coffeeTable':
      shadowQ(x, y, w, d);
      box(x + .1, y + .15, w - .2, d - .3, 6, C.wood, C.woodDark, '#b07f4a');
      box(x + .5, y + .4, .2, .2, 3, '#fff', '#e9eef6', '#dfe7f2', 6); box(x + 1.2, y + .35, .4, .3, 1, C.blue, C.blue3, C.blue3, 6);
      break;
    case 'kitchenCounter':
    case 'coffeeBar': {
      shadowQ(x, y, w, d);
      box(x, y, w, d, 17, C.wood, C.woodDark, '#b07f4a');
      box(x - .08, y - .04, w + .16, d + .18, 2, '#ffffff', '#dfe7f2', '#c9d7ec', 17);
      box(x, y + d - .08, w, .08, 2, C.blue, C.blue, C.blue3, 3);
      for (let i = 1; i < w; i++) box(x + i, y + d - .02, .03, .03, 12, '#b08252', '#b08252', '#b08252', 3);
      if(o.kind==='kitchenCounter') {
        box(x+.25,y+.18,.9,.6,1,C.navy,C.edge,C.edge,19);
        box(x+.35,y+.25,.7,.42,1,C.glassTop,C.blue3,C.blue3,20);
        box(x+.65,y+.12,.08,.08,5,C.edge,C.navy,C.navy,19);
        box(x+.65,y+.12,.08,.3,1,C.edge,C.navy,C.navy,24);
        box(x+1.65,y+.15,1,.65,1,C.navy,C.blue3,C.blue3,19);
        for(const dx of [1.85,2.3])box(x+dx,y+.3,.2,.25,1,C.edge,C.edge,C.edge,20);
        if(o.microwave) {
          box(x+1.65,y+.1,1,.65,7,C.edge,C.white,C.edge,21);
          box(x+1.75,y+.66,.65,.05,4,C.navy,C.navy,C.navy,23);
          box(x+2.48,y+.67,.08,.05,1,C.orange,C.orange,C.orange,24);
        }
        break;
      }
      box(x + .3, y + .15, .6, .5, 12, C.navy, '#1b3a6b', '#16315c', 18);
      const [lx, ly] = faceL(x + .3, y + .15, .6, .5, .5, 26);
      rect(lx - 1, ly, 2, 2, (t / 500 | 0) % 2 ? '#4ade80' : '#14532d');
      box(x + 1.3, y + .3, .25, .25, 4, '#fff', '#e9eef6', '#dfe7f2', 18);
      box(x + 2.2, y + .3, .25, .25, 4, '#fff', '#e9eef6', '#dfe7f2', 18);
      break;
    }
    case 'barStool':
      shadowQ(x + .2, y + .2, .6, .6);
      box(x + .42, y + .42, .16, .16, 9, C.navy, C.navy, C.blue3);
      box(x + .2, y + .2, .6, .6, 2, C.blue2, C.blue3, C.navy, 9);
      break;
    case 'plant': {
      shadowQ(x + .2, y + .2, .6, .6);
      box(x + .25, y + .25, .5, .5, 9, '#6b4423', '#ffffff', '#e3eaf4');
      box(x + .25, y + .25, .5, .5, 2, C.blue, C.blue, C.blue3, 0);
      plantTop(up(iso(x + .5, y + .5), 9));
      break;
    }
    case 'planter': {
      shadowQ(x, y, w, d);
      box(x + .1, y + .1, w - .2, d - .2, 7, '#6b4423', '#ffffff', '#e3eaf4');
      box(x + .1, y + .1, w - .2, d - .2, 2, C.blue, C.blue, C.blue3, 0);
      const n = Math.max(w, d) * 2;
      for (let i = 0; i < n; i++) {
        const u = (i + .5) / n;
        plantTop(up(iso(x + (w > d ? u * w : w / 2), y + (w > d ? d / 2 : u * d)), 7), .7);
      }
      break;
    }
    case 'glass': {
      const offset = o.edge ? 0 : .45;
      const length = o.joinAt==='end' ? w-1+.16 : w+(o.edge ? .1 : 0);
      const thin = w > d || o.axis==='x' ? [x, y + offset, length, .1] : [x + offset, y, .1, o.trimEnd ? d-1+.16 : d];
      box(...thin, 30, C.glassTop, C.glass, C.glass);
      box(...thin, 3, C.navy, C.blue3, C.blue3);
      box(thin[0], thin[1], thin[2], thin[3], 2, C.navy, C.navy, C.navy, 30);
      if(o.joinAt) {
        const jx=o.joinAt==='end'?x+w-1:x;
        box(jx,y,.16,.16,32,C.navy,C.blue3,C.navy);
      }
      break;
    }
    case 'fridge':
      box(x,y,w,d,31,C.edge,C.white,C.wallSide);
      box(x,y+.98,w,.03,1,C.navy,C.navy,C.navy,20);
      for(const z of [12,25])box(x+.8,y+1,.07,.06,5,C.navy,C.navy,C.navy,z);
      break;
    case 'speaker':
      box(x+.2,y+.2,.6,.6,17,C.navy,C.blue3,C.navy);
      for(const z of [4,11])box(x+.3,y+.79,.35,.04,3,C.edge,C.navy,C.edge,z);
      break;
    case 'tvConsole':
      box(x,y,w,d,6,C.wood,C.woodDark,C.woodDark);
      box(x+.2,y+.3,w-.4,.15,22,C.navy,C.navy,C.navy,7);
      box(x+.35,y+.46,w-.7,.02,18,C.blue3,C.blue,C.blue3,9);
      box(x+.65,y+.49,w-1.3,.02,1,C.glassTop,C.glassTop,C.glassTop,14);
      break;
    case 'diningTable':
      for(const dx of [.15,w-.3])for(const dy of [.15,d-.3])box(x+dx,y+dy,.15,.15,10,C.woodDark,C.woodDark,C.woodDark);
      box(x,y,w,d,2,C.wood,C.woodDark,C.woodDark,10);
      for(const dx of [.4,w-1])box(x+dx,y+.6,.5,.5,1,C.white,C.edge,C.edge,12);
      break;
    case 'locker':
      box(x,y,w,d,25,C.edge,C.blue3,C.navy);
      for(const z of [1,13]) {
        for(let i=0;i<w;i++) {
          box(x+i+.08,y+.94,.84,.06,11,C.edge,C.wallSide,C.edge,z);
          box(x+i+.65,y+1,.05,.04,2,C.navy,C.navy,C.navy,z+4);
          box(x+i+.25,y+1,.35,.04,1,C.white,C.white,C.white,z+8);
          for(let vent=0;vent<2;vent++)box(x+i+.2,y+1,.4,.04,.3,C.navy,C.navy,C.navy,z+1+vent);
        }
      }
      break;
    case 'bookcase': {
      const height=o.low?18:27,across=w>=d;
      shadowQ(x,y,w,d);
      // A thin back, shelves and corner posts leave the book compartments open.
      box(x+.05,y+.05,across?w-.1:.08,across?.08:d-.1,height,C.wood,C.woodDark,C.woodDark);
      for(let z=0;z<=height;z+=9) {
        box(x,y,w,d,1,C.wood,C.woodDark,C.woodDark,z);
        if(z===height)continue;
        const count=Math.max(w,d)*4-1,step=(Math.max(w,d)-.35)/count;
        for(let i=0;i<count;i++) {
          const u=.16+i*step,color=[C.blue,C.orange,C.leaf,C.edge][i%4];
          box(x+(across?u:w-.35),y+(across?d-.35:u),across?step*.7:.2,across?.2:step*.7,5+i%3,color,color,C.woodDark,z+1);
        }
      }
      for(const dx of [0,w-.1])for(const dy of [0,d-.1])box(x+dx,y+dy,.1,.1,height+1,C.wood,C.woodDark,C.woodDark);
      break;
    }
    case 'readingDesk':
      shadowQ(x,y,w,d);
      for(const dx of [.1,w-.2])box(x+dx,y+.2,.1,.6,10,C.woodDark,C.woodDark,C.woodDark);
      box(x,y,w,d,2,C.wood,C.woodDark,C.woodDark,10);
      box(x+.65,y+.3,.8,.45,1,C.white,C.edge,C.edge,12);
      box(x+1.04,y+.3,.03,.45,1,C.blue3,C.blue3,C.blue3,13);
      box(x+.25,y+.2,.12,.12,10,C.navy,C.navy,C.navy,12);
      box(x+.08,y+.07,.45,.4,3,'#f5d58b',C.orange,C.wood,21);
      break;
    case 'desk': {
      shadowQ(x, y, w, d);
      box(x, y + .05, w, .9, 9, C.white, C.edge, '#dfe7f2');
      box(x + .1, y + .1, .1, .8, 9, C.navy, C.navy, C.navy, 0); box(x + w - .2, y + .1, .1, .8, 9, C.navy, C.navy, C.navy, 0);
      [x + .15, x + 1.1].forEach((mx, i) => {
        box(mx, y + .15, .75, .1, 11, C.navy, C.navy, '#1d3a6a', 11);
        box(mx + .3, y + .2, .15, .1, 2, C.navy, C.navy, C.navy, 9);
        const glow = (t / 600 + x + i | 0) % 3 ? '#3d8bea' : '#5aa0f0';
        poly([faceL(mx, y + .15, .75, .1, .08, 12.5), faceL(mx, y + .15, .75, .1, .92, 12.5), faceL(mx, y + .15, .75, .1, .92, 20.5), faceL(mx, y + .15, .75, .1, .08, 20.5)], glow);
      });
      box(x + .4, y + .55, .9, .25, 1, '#dfe7f2', '#c9d7ec', '#c9d7ec', 9);
      box(x + 1.6, y + .5, .2, .2, 3, C.orange, '#b85f2d', '#c96a33', 9);
      if(o.role)box(x+.05,y+.96,w-.1,.04,2,workRoleColor(o.role),workRoleColor(o.role),workRoleColor(o.role),5);
      break;
    }
    case 'table':
      shadowQ(x, y, w, d);
      box(x, y, w, d, 9, C.white, C.edge, '#dfe7f2');
      for (let i = 0; i < 3; i++) box(x + .3 + i * (w - 1) / 3, y + .6, .5, .4, 1, '#8d9ab0', '#6b778c', '#6b778c', 9);
      box(x + 1.7, y + 1.2, .3, .3, 2, '#fff', '#e9eef6', '#dfe7f2', 9);
      break;
    case 'avCabinet':
      shadowQ(x,y,w,d);
      box(x+.05,y+.05,.9,.9,24,C.navy,C.blue3,C.navy);
      for(let i=0;i<4;i++) {
        box(x+.12,y+.85,.72,.08,3,C.edge,C.navy,C.navy,4+i*4.5);
        box(x+.2,y+.94,.25,.03,1,C.sky,C.sky,C.sky,5+i*4.5);
        box(x+.65,y+.94,.08,.03,1,C.leaf,C.leaf,C.leaf,5+i*4.5);
      }
      break;
    case 'chair':
      box(x + .3, y + .3, .4, .4, 5, C.blue3, C.navy, C.navy);
      box(x + .48, y + .48, .06, .06, 3, '#555', '#555', '#444', 0);
      break;
    case 'rack': {
      shadowQ(x, y, w, d);
      box(x + .05, y + .05, .9, .9, 46, '#3a4256', '#2a3144', '#1d2333');
      for (let i = 0; i < 7; i++) {
        const v = 5 + i * 5.8;
        poly([faceR(x + .05, y + .05, .9, .9, .1, v), faceR(x + .05, y + .05, .9, .9, .9, v), faceR(x + .05, y + .05, .9, .9, .9, v + 3.5), faceR(x + .05, y + .05, .9, .9, .1, v + 3.5)], '#0b0f18');
        const on = Math.sin(t / 170 + i * 1.7 + x * 3 + y) > 0;
        const [lx, ly] = faceR(x + .05, y + .05, .9, .9, .25, v + 2);
        const [rx, ry] = faceR(x + .05, y + .05, .9, .9, .65, v + 2);
        rect(lx - 1, ly - 1, 1, 1, on ? '#4ade80' : '#14532d');
        rect(rx - 1, ry - 1, 1, 1, on ? '#60a5fa' : '#1e3a8a');
      }
      break;
    }
  }
}

// ---------- characters ----------
// Chibi sprites built from layers, outlined, then cached as tiny offscreen canvases.
const SW = 18, SH = 26;
const shade = (hex, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
const hashStr = s => [...s].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7) >>> 0;
const OUTFITS = {
  // Claude: coral blazer over a white shirt, Dhiteta badge
  claude: ['#d97757', '#c9663f', '#e08a68'].map(main => ({ main, inner: '#ffffff', badge: C.blue, pants: '#3a3f55', shoes: '#3b2614' })),
  // Codex: dark hoodie with drawstrings, white sneakers
  codex: ['#23262e', '#2d3340', '#1c2a3a'].map(main => ({ main, hood: true, strings: true, pants: '#3b3f4a', shoes: '#e9eef6' })),
};
function lookFor(sid, kind) {
  const h = hashStr(sid);
  const pick = (arr, k) => { let x = (h ^ Math.imul(k + 1, 0x9e3779b9)) >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return arr[(x >>> 0) % arr.length]; };
  return {
    id: `${kind}-${h % 100000}`,
    skin: pick(['#f6d2b0', '#eabf9a', '#d6a27a', '#a8714c'], 1),
    hair: pick(['#2b1d16', '#4a2f22', '#7a4a22', '#c9a15a', '#1d1d24', '#8e3b2f'], 4),
    style: pick(['short', 'long', 'bun', 'spiky'], 24),
    glasses: pick([false, true, false, false, false], 96),
    headset: kind === 'codex' ? pick([true, false], 288) : pick([false, false, true], 288),
    outfit: pick(OUTFITS[kind] || OUTFITS.claude, 576),
  };
}
const spriteCache = new Map();
function sprite(look, view, frame, prop, sit) {
  const ck = [look.id, view, frame, prop, sit].join('|');
  if (spriteCache.has(ck)) return spriteCache.get(ck);
  const g = Array.from({ length: SH }, () => Array(SW).fill(null));
  const f = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (j >= 0 && j < SH && i >= 0 && i < SW) g[j][i] = c; };
  const o = look.outfit, dark = '#1a1f2e', hairHi = shade(look.hair, 1.45), front = view === 'front';
  if (o.hood) { f(3, 9, 12, 5, shade(o.main, .85)); f(4, 8, 10, 1, shade(o.main, .85)); }      // hood behind head
  if (look.style === 'long') { f(3, 4, 12, 10, look.hair); }                                     // long hair behind body
  // legs
  if (sit) f(6, 20, 7, 2, o.pants);
  else {
    const l = frame === 1 ? 1 : 0, r = frame === 2 ? 1 : 0;
    f(6, 20 - l, 3, 4, o.pants); f(10, 20 - r, 3, 4, o.pants); f(11, 20 - r, 1, 4, shade(o.pants, .8));
    f(6, 24 - l, 3, 1, o.shoes); f(10, 24 - r, 3, 1, o.shoes);
  }
  // body + arms
  f(5, 12, 8, 8, o.main); f(12, 12, 1, 8, shade(o.main, .78)); f(5, 19, 8, 1, shade(o.main, .78));
  if (front) {
    if (o.inner) { f(8, 12, 2, 6, o.inner); f(7, 12, 1, 2, shade(o.main, .85)); f(10, 12, 1, 2, shade(o.main, .85)); }
    if (o.strings) { f(7, 13, 1, 3, '#e9eef6'); f(10, 13, 1, 3, '#e9eef6'); f(6, 17, 6, 1, shade(o.main, .8)); }
    if (o.badge) { f(10, 14, 2, 2, o.badge); f(10, 14, 1, 1, '#ffffff'); }
  }
  f(4, 13, 1, 5, o.main); f(13, 13, 1, 5, shade(o.main, .78));
  f(4, 18, 1, 1, look.skin); f(13, 18, 1, 1, shade(look.skin, .85));
  // head
  f(5, 2, 8, 10, look.skin); f(4, 3, 10, 8, look.skin); f(13, 4, 1, 6, shade(look.skin, .88)); f(5, 11, 8, 1, shade(look.skin, .88));
  if (front) {
    f(6, 7, 1, 2, dark); f(11, 7, 1, 2, dark); f(6, 7, 1, 1, '#3b4a6b'); f(11, 7, 1, 1, '#3b4a6b');
    f(5, 9, 1, 1, '#f2a0a0'); f(12, 9, 1, 1, '#f2a0a0'); f(8, 10, 2, 1, '#b5655a');
    if (look.glasses) { const gl = '#6b7690'; f(5, 6, 3, 1, gl); f(10, 6, 3, 1, gl); f(5, 7, 1, 2, gl); f(7, 7, 1, 2, gl); f(10, 7, 1, 2, gl); f(12, 7, 1, 2, gl); f(8, 7, 2, 1, gl); }
  }
  // hair
  const hc = look.hair;
  if (front) {
    f(4, 1, 10, 3, hc); f(5, 0, 8, 1, hc); f(4, 4, 1, 3, hc); f(13, 4, 1, 3, hc); f(5, 4, 4, 1, hc); f(9, 4, 1, 1, hc);
    if (look.style === 'spiky') { f(5, -1, 1, 1, hc); f(8, -1, 1, 2, hc); f(11, -1, 1, 1, hc); f(10, 4, 2, 1, hc); }
    if (look.style === 'long') { f(3, 4, 1, 9, hc); f(14, 4, 1, 9, hc); }
  } else {
    f(4, 1, 10, 10, hc); f(5, 0, 8, 1, hc); f(5, 11, 8, 1, shade(hc, .85));
    if (look.style === 'long') f(4, 11, 10, 3, hc);
    if (o.hood) f(4, 9, 10, 4, shade(o.main, .9));
  }
  if (look.style === 'bun') { f(7, -1, 4, 2, hc); f(8, -1, 2, 1, hairHi); }
  f(6, 1, 3, 1, hairHi);
  if (look.headset) { f(4, 0, 10, 1, '#2b2f3a'); f(3, 5, 1, 4, '#2b2f3a'); f(14, 5, 1, 4, '#2b2f3a'); if (front) f(4, 9, 2, 1, '#2b2f3a'); }
  // props held in front
  if (front && prop === 'mug') { f(13, 15, 3, 3, '#ffffff'); f(16, 16, 1, 1, '#ffffff'); f(13, 15, 3, 1, '#6b4423'); }
  if (front && prop === 'tablet') { f(6, 15, 6, 4, C.navy); f(7, 16, 4, 2, '#5aa0f0'); }
  // outline
  const out = g.map(r => r.slice());
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (!g[y][x] &&
      [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx])) out[y][x] = dark;
  const c = document.createElement('canvas'); c.width = SW; c.height = SH;
  const cx = c.getContext('2d');
  out.forEach((r, y) => r.forEach((col, x) => { if (col) { cx.fillStyle = col; cx.fillRect(x, y, 1, 1); } }));
  spriteCache.set(ck, c);
  return c;
}

function drawAgent(a, t) {
  const upperBed = a.sleeping && upperBedAt(a), upperBunk=!!upperBed;
  const [x, y] = iso(a.x + (upperBunk&&!upperBed.rotated ? -.5 : .5), a.y + (upperBed?.rotated ? -.5 : .5));
  a.look = a.look || lookFor(a.sid, a.kind);
  const working = !a.path.length && ['read', 'write', 'web', 'bash'].includes(a.state);
  const atBar = !a.path.length && a.state === 'idle' && barSeats.some(([sx,sy]) => a.x === sx && a.y === sy);
  const atSofaSeat=!a.path.length&&a.state==='idle'&&objects.some(o=>o.kind==='sofa'&&a.x>=o.x&&a.x<o.x+o.w&&a.y===o.y+(o.reverse?-1:1));
  const sit = atBar || atSofaSeat || (!a.path.length && (['read', 'write'].includes(a.state) || (a.state === 'bash' && a.y === 20 && a.x <= 24)));
  const frame = a.path.length ? 1 + (Math.floor(t / 140) % 2) : 0;
  const prop = a.path.length ? '' : a.state === 'idle' ? 'mug' : ['think', 'talk', 'agent'].includes(a.state) ? 'tablet' : '';
  const img = sprite(a.look, atBar||atSofaSeat ? 'front' : a.dir >= 2 ? 'front' : 'back', frame, prop, sit);
  ctx.fillStyle = 'rgba(15,42,82,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  const typing = working && sit && Math.floor(t / 180) % 2 ? 1 : 0;      // tiny bob while typing
  const bob = a.path.length ? (frame === 1 ? 1 : 0) : 0;
  ctx.save();
  if (a.sleeping) {
    ctx.translate(Math.round(x),Math.round(y)-(upperBunk ? 31 : 9));
    ctx.rotate(upperBed?.rotated || objects.some(o=>o.kind==='daybed'&&o.rotated&&o.x===a.x&&o.y===a.y) ? Math.PI/2 : -Math.PI/2);
    ctx.drawImage(img,-SW/2,-SH/2);
    ctx.restore();
    a.sx=x;a.sy=y-(upperBunk ? 22 : 0);a.top=a.sy-22;
    return;
  }
  ctx.translate(Math.round(x), 0);
  if (a.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -SW / 2, Math.round(y) - SH + 1 + (atBar ? -5 : sit ? 3 : 0) - bob - typing);
  ctx.restore();
  a.sx = x; a.sy = y; a.top = y - SH + (atBar ? -5 : sit ? 3 : 0);
}
function drawTags(a, t) {
  const { sx: x, sy: y } = a;
  const codex = a.kind === 'codex';
  const name = codex ? 'Codex' : 'Claude';
  ctx.font = '500 5px "Pixelify Sans", "Noto Sans Thai", sans-serif'; const w = ctx.measureText(name).width + 5;
  a.tagWidth = w;
  rect(x - w / 2, y + 3, w, 8, codex ? 'rgba(28,31,38,.95)' : 'rgba(217,119,87,.96)');
  rect(x - w / 2, y + 11, w, 1, codex ? '#3ddc97' : '#8a3a1f');
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(name, x, y + 8.5);
  const bx = x + 11, by = a.top - 6 + Math.sin(t / 300) * 1.2;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = colors[a.state] || '#7894a9'; ctx.lineWidth = 1.5; ctx.stroke();
  const icon = iconImages[icons[a.state] || 'coffee'];
  if (a.sleeping) { ctx.font='bold 8px monospace';ctx.fillStyle='#7958d1';ctx.fillText('zZ',bx,by+3); }
  else if (icon.complete && icon.naturalWidth) ctx.drawImage(icon, bx - 6, by - 6, 12, 12);
  ctx.textAlign = 'start';
}

let pointer = null;
const tooltip = document.getElementById('agent-tooltip');
cv.onpointermove = e => { pointer = { x:e.clientX, y:e.clientY }; };
cv.onpointerleave = () => { pointer = null; tooltip.hidden = true; };
function hoveredAgent(x, y) {
  return [...agents.values()].sort((a,b) => b.x+b.y-a.x-a.y).find(a =>
    a.sx !== undefined && Math.abs(x-a.sx) <= Math.max(14,(a.tagWidth || 0)/2) && y >= a.top-14 && y <= a.sy+15);
}
function updateTooltip() {
  if (!pointer) { tooltip.hidden = true; return; }
  const r = cv.getBoundingClientRect();
  const scale = Math.min(cv.clientWidth/VIEW.w,cv.clientHeight/VIEW.h);
  const offsetX = (cv.clientWidth-VIEW.w*scale)/2, offsetY = (cv.clientHeight-VIEW.h*scale)/2;
  const x = (pointer.x-r.left-cv.clientLeft-offsetX)/scale+VIEW.x;
  const y = (pointer.y-r.top-cv.clientTop-offsetY)/scale+VIEW.y;
  const zone=hoveredZone(x,y),a = hoveredAgent(x,y);
  cv.style.cursor = zone||a ? 'help' : 'default';
  tooltip.hidden = !zone&&!a;
  if (!zone&&!a) return;
  if(zone) {
    document.getElementById('agent-tooltip-name').textContent=i18n.t(zoneSign(zone).label);
    document.getElementById('agent-tooltip-state').textContent=i18n.t(zoneSign(zone).description);
    document.getElementById('agent-tooltip-task').textContent='';
  } else {
  document.getElementById('agent-tooltip-name').textContent = `${a.kind === 'codex' ? 'Codex' : 'Claude'} · ${a.resident&&!a.sessionSid?i18n.t(a.project):a.project}`;
  document.getElementById('agent-tooltip-state').textContent = a.resident && !a.sessionSid ? i18n.t('สมาชิกประจำ · ยังไม่เชื่อม session') : `${i18n.t('สถานะ')}: ${labels[a.state] || i18n.t('ทำงาน')} (${i18n.t('จากกิจกรรมล่าสุด')})`;
  document.getElementById('agent-tooltip-task').textContent = a.sleeping ? `${i18n.t('นอนพัก')} · ${i18n.t(upperBedAt(a) ? 'เตียงชั้นบน' : 'เตียงชั้นล่าง')} (${i18n.t('ภาพเคลื่อนไหวเท่านั้น')})` : a.sleepSpot ? i18n.t('กำลังเดินไปพักงีบ') : (a.resident&&!a.sessionSid?i18n.t(a.text):a.text) || i18n.t(a.state === 'idle' ? 'เดินเล่น / พักใน Lounge' : 'กำลังทำงาน');
  }
  tooltip.style.left = `${Math.max(8,Math.min(pointer.x+14,window.innerWidth-tooltip.offsetWidth-8))}px`;
  tooltip.style.top = `${Math.max(8,Math.min(pointer.y+14,window.innerHeight-tooltip.offsetHeight-8))}px`;
}

function drawScene(t) {
  updateLighting();
  drawRoom(t);
  const items = objects.map(o => ({ k: o.depth, draw: () => drawObject(o, t) }));
  for (const a of agents.values()) items.push({ k: a.x + a.y + .6, draw: () => drawAgent(a, t) });
  items.sort((p, q) => p.k - q.k).forEach(i => i.draw());
  drawAmbientLight();
  drawZoneLabels();
  for (const a of agents.values()) if (a.sx) drawTags(a, t);
}

function drawAmbientLight() {
  const darkness = 1-lighting.daylight;
  if (!darkness) return;
  rect(0,0,W,H,`rgba(12,24,65,${darkness*.28})`);
  // Warm pools of indoor light preserve visibility while the windows turn dark.
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  (officeLayout==='large'?[[5,4],[18,4],[6,16],[25,16]]:[[5,4],[COLS-6,4],[5,ROWS-5]]).forEach(([gx,gy]) => {
    const [x,y] = iso(gx,gy), glow=ctx.createRadialGradient(x,y,0,x,y,65);
    glow.addColorStop(0,`rgba(255,210,128,${darkness*.20})`); glow.addColorStop(1,'rgba(255,210,128,0)');
    ctx.fillStyle=glow;ctx.fillRect(x-65,y-65,130,130);
  });
  ctx.restore();
}

let lastFrame=0;
function frame(t) {
  const dt=Math.min((t-lastFrame)/1000,.05);lastFrame=t;
  ctx.setTransform(SCALE,0,0,SCALE,-VIEW.x*SCALE,-VIEW.y*SCALE);ctx.imageSmoothingEnabled=false;
  const counts=new Map();
  expireAgents(Date.now());
  for(const [sid,a] of agents){
    const spots=zones[a.state]||zones.idle, idx=counts.get(spots)||0;counts.set(spots,idx+1);
    const target=chooseTarget(a,spots[idx%spots.length],t), targetKey=key(...target);
    // Finish the current tile before replanning, so a new event cannot cut a corner through a wall.
    if(a.target!==targetKey&&(!a.path.length||(a.x===a.path[0][0]&&a.y===a.path[0][1]))){a.path=route([Math.round(a.x),Math.round(a.y)],target);a.target=targetKey;}
    if(a.path.length){const [nx,ny]=a.path[0],dx=nx-a.x,dy=ny-a.y,dist=Math.hypot(dx,dy),step=dt*3.5;
      if(dist<=step){a.x=nx;a.y=ny;a.path.shift();if(a.target!==targetKey){a.target=null;a.path=[];}}
      else{
        // +x walks down-right, +y walks down-left on screen
        a.dir = dx > 0 || dy > 0 ? 2 : 3; a.flip = dy > 0 || dx < 0;
        a.x+=dx/dist*step;a.y+=dy/dist*step;
      }
    } else if (['read','write','web','bash'].includes(a.state)) { a.dir = 3; a.flip = false; }   // face the desk / screen
    else { a.dir = 2; a.flip = false; }
  }
  drawScene(t);
  updateTooltip();
  if(!agents.size){ctx.font='bold 12px "Pixelify Sans", "Noto Sans Thai", sans-serif';const m=i18n.t('รอ Claude / Codex เข้างาน หรือกด DEMO'),w=ctx.measureText(m).width+20;
    const [mx,my]=iso(16,11);rect(mx-w/2,my-12,w,22,'rgba(15,42,82,.88)');ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(m,mx,my+3);ctx.textAlign='start';}
  requestAnimationFrame(frame);
}
addResidents();
requestAnimationFrame(frame);
const status=document.getElementById('status'),es=new EventSource('/events');
es.onopen=()=>{status.dataset.connection='online';setConnectionText('เชื่อมต่อแล้ว: Claude + Codex');};
es.onerror=()=>{status.dataset.connection='offline';setConnectionText('เชื่อมต่อไม่ได้ กรุณารัน node server.js');};
es.onmessage=e=>{try{apply(JSON.parse(e.data));}catch{setConnectionText('ได้รับ event ที่อ่านไม่ได้');}};
let connectionText='กำลังเชื่อมต่อ…';
function setConnectionText(key){connectionText=key;status.textContent=i18n.t(key);}
let demoTimers=[];
function enhanceSelect(select, label) {
  if (!select.options) return;
  const dropdown=document.createElement('details');dropdown.className='theme-select';
  const trigger=document.createElement('summary');trigger.setAttribute('aria-label',i18n.t(label));
  const menu=document.createElement('div');menu.className='theme-select-options';
  const buttons=[...select.options].map(option=>{
    const button=document.createElement('button');button.type='button';button.textContent=option.textContent;
    button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));select.refreshAppearance();dropdown.open=false;trigger.focus();};
    menu.append(button);return button;
  });
  select.refreshAppearance=()=>{
    trigger.setAttribute('aria-label',i18n.t(label));
    buttons.forEach((button,i)=>button.textContent=select.options[i].textContent);
    trigger.textContent=select.options[select.selectedIndex]?.textContent || '';
    buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(select.options[i].selected)));
  };
  dropdown.append(trigger,menu);select.after(dropdown);select.hidden=true;select.refreshAppearance();
  dropdown.addEventListener('toggle',()=>{if(dropdown.open)select.refreshAppearance();});
  dropdown.onkeydown=e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dropdown.open=false;trigger.focus();}
    else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
      e.preventDefault();dropdown.open=true;
      const i=buttons.indexOf(document.activeElement), n=buttons.length;
      const next=e.key==='Home'?0:e.key==='End'?n-1:(i+(e.key==='ArrowDown'?1:-1)+n)%n;
      buttons[next].focus();
    }
  };
  dropdown.addEventListener('focusout',e=>{if(!dropdown.contains(e.relatedTarget))dropdown.open=false;});
  document.addEventListener('pointerdown',e=>{if(!dropdown.contains(e.target))dropdown.open=false;});
}
enhanceSelect(document.getElementById('activity-sort'),'เรียงลำดับกิจกรรม');
enhanceSelect(backgroundSelect,'โทนสี');
enhanceSelect(document.getElementById('language'),'ภาษา');
i18n.onChange(()=>{
  setConnectionText(connectionText);
  backgroundSelect.refreshAppearance?.();document.getElementById('activity-sort').refreshAppearance?.();
  document.getElementById('language').refreshAppearance?.();
  for(const entry of activityEntries)entry.translate();
  lightingMinute='';updateLighting();updateTooltip();
});
document.getElementById('demo').onclick=()=>{
  demoTimers.forEach(clearTimeout);demoTimers=[];
  const states=['idle','write','think','bash'];
  states.forEach((state,i)=>{
    apply({sid:'demo-'+i,kind:i%2?'codex':'claude',project:['Reception','Frontend','Planning','Backend'][i],state,text:labels[state]});
    for(let n=1;n<5;n++)demoTimers.push(setTimeout(()=>apply({sid:'demo-'+i,kind:i%2?'codex':'claude',project:['Reception','Frontend','Planning','Backend'][i],state:states[(i+n)%4],text:'Demo activity'}),n*16000));
  });
};
