'use strict';
// Dhiteta AI open-plan office, isometric (2.5D) pixel view.
// Logic runs on a plain grid (route / zones / blocked); only drawing is projected to isometric.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const HOME = typeof location !== 'undefined' && !location.search.includes('scene=office');
const COLS = HOME ? 18 : 32, ROWS = HOME ? 18 : 22, TW = 24, TH = 12, WALL = 72, SCALE = 2;
const ENTRY = HOME ? [8,17] : [15,21];
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
  document.getElementById('local-time').textContent = `${lighting.time} น. · ${lighting.label}`;
  const mix = (night, day) => '#' + [1,3,5].map(i => Math.round(parseInt(night.slice(i,i+2),16)*(1-lighting.daylight)+parseInt(day.slice(i,i+2),16)*lighting.daylight).toString(16).padStart(2,'0')).join('');
  C.sky = mix('#1c315c','#9fd0f5'); C.sky2 = mix('#344b80','#c4e3fa');
}
// Visible crop of the world: zooms the view onto the office floor.
const VIEW = HOME ? { x: 65, y: 60, w: 420, h: 335 } : { x: 60, y: 110, w: 550, h: 370 };
cv.width = VIEW.w * SCALE; cv.height = VIEW.h * SCALE;
const blocked = new Set(), objects = [], agents = new Map();
const key = (x, y) => `${x},${y}`;
const hqImage = new Image(); hqImage.src='/assets/detailed/hq-entry-v3.png';
const HQ_ROOMS={work:{title:'ห้องทำงาน',image:hqImage},lounge:{title:'ห้องนั่งเล่น'},rest:{title:'ห้องพักผ่อน'}};
for(const name of ['lounge','rest']){const image=new Image();image.src=`/assets/detailed/hq-${name}-v1.png`;HQ_ROOMS[name].image=image;}
let selectedRoom='work';
try{const saved=localStorage.getItem('office-hq-room');if(HQ_ROOMS[saved])selectedRoom=saved;}catch{}
const roomImage=()=>HQ_ROOMS[selectedRoom].image;
const hqCharacters=Object.fromEntries(['walk','seated'].map(pose=>{
  const image=new Image();image.src=`/assets/detailed/hq-character-${pose}-${pose==='walk'?'v2':'v1'}.png`;return [pose,image];
}));
const hqReady = () => HOME && roomImage().complete && roomImage().naturalWidth>0;
const hqPoint = (x,y) => {
  const u=(x-1)/16,v=(y-1)/16;
  return [768+698*(u-v),290+310*(u+v)+90*u*v];
};
const hqScreen = ([x,y]) => [65+x*420/1536,95+y*420/1536];
function insidePolygon([x,y],points) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [a,b]=points[i],[c,d]=points[j];
    if((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
  }
  return inside;
}
// Source-space silhouettes preserve the approved art without rewriting its pixels.
// shortcut: hand-traced masks include narrow edge fringes; replace with exported sprite alpha for final art.
const hqLayers = [
  {name:'shelf',ground:[[95,575],[115,610],[365,475],[365,420]],mask:[[110,335],[365,212],[372,446],[115,600]]},
  {name:'rack',ground:[[780,340],[895,410],[965,370],[850,300]],mask:[[784,151],[854,126],[955,167],[957,369],[893,412],[781,341]]},
  {name:'dev',ground:[[407,406],[578,499],[751,407],[750,322]],mask:[[402,333],[444,306],[445,279],[520,250],[566,256],[612,239],[679,225],[685,290],[751,292],[751,408],[632,477],[573,496],[406,405]]},
  {name:'meeting',ground:[[880,493],[1015,578],[1185,484],[1185,401]],mask:[[891,337],[932,321],[950,345],[965,311],[1003,301],[1025,348],[1184,393],[1185,492],[1132,521],[1101,573],[1075,567],[1009,574],[901,510],[871,458],[866,409],[887,398]]},
  {name:'security',ground:[[858,846],[1000,925],[1295,755],[1296,650],[1154,577]],mask:[[856,690],[946,643],[947,605],[1005,574],[1054,580],[1105,555],[1165,523],[1203,535],[1205,586],[1248,595],[1295,614],[1296,754],[1001,925],[859,846]]},
];

const C = {
  navy: '#0f2a52', blue: '#1f5fbf', blue2: '#2f6fd6', blue3: '#174ea3', white: '#ffffff', wall: '#f4f7fb', wallSide: '#e3eaf4',
  edge: '#c9d7ec', sky: '#9fd0f5', sky2: '#c4e3fa', wood: '#c7975f', woodDark: '#9b6f3f', leaf: '#2f9e5a', leaf2: '#45bf72',
  orange: '#e07a3f', glass: 'rgba(159,208,245,.42)', glassTop: '#7fb0e6',
};

// ---------- grid: outer boundary only, open plan inside ----------
function wall(x, y) { blocked.add(key(x, y)); }
for (let x = 0; x < COLS; x++) { wall(x, 0); if (x !== ENTRY[0] && x !== ENTRY[0]+1) wall(x, ROWS-1); }
for (let y = 0; y < ROWS; y++) { wall(0, y); wall(COLS-1, y); }

// object(x, y, w, d, kind): blocks its footprint; deco() is walkable (chairs)
function object(x, y, w, d, kind, opt = {}) {
  objects.push({ x, y, w, d, kind, ...opt, depth: x + y + (w - 1) / 2 + (d - 1) / 2 });
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) blocked.add(key(x + i, y + j));
}
const deco = (x, y, kind, opt = {}) => objects.push({ x, y, w: 1, d: 1, kind, ...opt, depth: x + y + .3 });

const AREAS = [
  { x: 1, y: 1, w: 10, h: 7, floor: 'carpet', title: 'MEETING' },
  { x: 1, y: 17, w: 10, h: 4, floor: 'wood', title: 'QUIET ROOM' },
  { x: 13, y: 1, w: 18, h: 8, floor: 'tile', title: 'WORKSPACE' },
  { x: 1, y: 12, w: 10, h: 5, floor: 'wood', title: 'LOUNGE' },
  { x: 20, y: 13, w: 11, h: 8, floor: 'dark', title: 'SERVER' },
];
const barSeats = HOME ? [] : [[8,13],[9,13],[10,13]];
const napSpots = HOME ? [] : [[3,19],[7,19],[4,19],[8,19]];

// lounge
if (!HOME) {
object(2, 12, 4, 1, 'sofa'); object(3, 14, 2, 1, 'coffeeTable'); object(7, 14, 1, 1, 'armchair'); object(8, 12, 3, 1, 'coffeeBar');
barSeats.forEach(([x,y]) => deco(x, y, 'barStool'));
[[3,19],[7,19]].forEach(([x,y]) => deco(x,y,'daybed'));
// Quiet room below the lounge; leave a two-tile doorway at x=7..8.
object(1,17,6,1,'restWall');
object(9,17,2,1,'restWall');
object(10,17,1,4,'restWall');
object(1, 1, 1, 1, 'plant'); object(1, 7, 1, 1, 'plant');
// Clear glass partitions around the meeting area, with open walkways between panels.
object(11, 1, 1, 7, 'glass', { edge:true });
object(1, 8, 4, 1, 'glass', { edge:true }); object(7, 8, 4, 1, 'glass', { edge:true });
object(20, 13, 1, 8, 'glass', { edge:true });
object(20, 13, 4, 1, 'glass', { edge:true }); object(27, 13, 4, 1, 'glass', { edge:true });
// workspace
for (const y of [2, 6]) for (const x of [14, 17, 20, 23]) { object(x, y, 2, 1, 'desk'); deco(x, y + 1, 'chair'); deco(x + 1, y + 1, 'chair'); }
object(30, 1, 1, 1, 'plant'); object(26, 7, 1, 1, 'plant');
// meeting
object(4, 3, 4, 2, 'table');
[[3, 3], [3, 4], [8, 3], [8, 4], [5, 2], [6, 2], [5, 5], [6, 5]].forEach(([x, y]) => deco(x, y, 'chair'));
object(1, 20, 1, 1, 'plant'); object(11, 20, 1, 1, 'plant');
// server
for (const y of [15,17]) for (const x of [22,24]) object(x,y,1,1,'rack');
object(22,19,3,1,'controlDesk');
[22,24].forEach(x => deco(x,20,'chair'));
object(29,18,1,1,'serverStatus');
object(30, 20, 1, 1, 'plant');
// entry
object(13, 20, 1, 1, 'plant'); object(18, 20, 1, 1, 'plant');
} else {
  AREAS.length=0;
  object(2,6,4,2,'desk',{role:'DEV AGENT',accent:'#71d8ed'}); deco(3,8,'chair');
  object(11,12,4,2,'desk',{role:'SECURITY AGENT',accent:'#b599ee'}); deco(12,14,'chair');
  object(10,5,4,3,'table');
  [[9,6],[11,8],[14,6],[12,4]].forEach(([x,y])=>deco(x,y,'chair'));
  object(3,2,1,1,'rack'); object(5,2,1,1,'rack');
  [[2,5],[7,2],[2,11],[15,11]].forEach(([x,y])=>object(x,y,1,1,'plant'));
}

const zones = HOME ? {
  read:[[4,8]],write:[[4,8]],web:[[14,13],[4,8]],
  bash:[[5,4],[6,4]],think:[[11,5],[12,7]],idle:[[12,13],[12,14],[14,13]],
} : {
  read: [[14,3],[17,3],[20,3],[23,3]], write: [[14,7],[17,7],[20,7],[23,7]],
  web: [[27,3],[29,3]], bash: [[22,20],[24,20],[25,15],[25,17]],
  think: [[5,2],[6,5],[3,3],[8,4]], idle: [[2,14],[5,14],[3,16],[6,16]],
};
if(HOME) {
  blocked.clear();
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) {
    if(x===0 || x===COLS-1 || y===0 || (y===ROWS-1 && x!==ENTRY[0] && x!==ENTRY[0]+1) || hqLayers.some(layer=>insidePolygon(hqPoint(x+.5,y+.5),layer.ground)))wall(x,y);
  }
  HQ_ROOMS.work.blocked=blocked;
  for(const name of ['lounge','rest']) {
    const obstacles=new Set();
    const footprints=name==='lounge' ? [
      [[290,475],[400,525],[720,370],[720,310]],
      [[540,500],[670,570],[815,490],[815,440]],
      [[1020,460],[1280,600],[1320,555],[1320,430]],
      [[815,340],[1000,430],[1040,400],[1040,300]],
    ] : [
      [[260,490],[350,550],[630,420],[630,350]],
      [[920,440],[1210,600],[1260,570],[1260,440]],
      [[680,360],[870,460],[920,420],[920,350]],
    ];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(x===0 || x===COLS-1 || y===0 || (y===ROWS-1 && x!==ENTRY[0] && x!==ENTRY[0]+1) || footprints.some(shape=>insidePolygon(hqPoint(x+.5,y+.5),shape)))obstacles.add(key(x,y));
    HQ_ROOMS[name].blocked=obstacles;
  }
}
zones.talk = zones.think; zones.agent = zones.think;
const HQ_HOTSPOTS = [
  {id:'dev',point:[560,330],title:'Dev · อ่านและแก้ไขโค้ด',description:'มุมตรวจสอบไฟล์ ค้นหาข้อมูลในโปรเจกต์ และแก้ไขโค้ด',targets:zones.read,states:['read','write']},
  {id:'entry',point:[450,720],title:'Entrance · ทางเข้าห้องทำงาน',description:'พื้นที่ทางเข้าที่เปิดโล่งแทนโต๊ะเดิม เชื่อมจากขอบด้านหน้าซ้ายเข้าสู่พื้นที่กลางห้อง ตอนนี้เป็นทางเดิน ยังไม่มีการย้ายไปห้องอื่น',targets:[[8,16]],states:[]},
  {id:'security',point:[1070,640],title:'Security · ตรวจสอบระบบ',description:'มุมค้นข้อมูลและตรวจสอบระบบ ชื่อโซนเป็นแนวทางการใช้งาน ไม่ใช่การยืนยันว่า AI กำลังตรวจความปลอดภัย',targets:zones.web,states:['web']},
  {id:'meeting',point:[1050,425],title:'Meeting · คิดและวางแผน',description:'คิด วางแผน ตอบคำถาม และประสานงานกับ Agent อื่น',targets:zones.think,states:['think','talk','agent']},
  {id:'server',point:[866,220],title:'Server · รันคำสั่ง',description:'โซนสำหรับกิจกรรมรันคำสั่งและเครื่องมือจาก session ที่เชื่อมต่อ การคลิกจุดนี้เปิดข้อมูลเท่านั้น ไม่ได้รันคำสั่ง',targets:zones.bash,states:['bash']},
  {id:'sofa',room:'lounge',point:[510,350],title:'โซฟา · พักและนั่งเล่น',description:'มุมพักระหว่างงาน AI ที่ว่างจะย้ายมาห้องนั่งเล่นและเดินเล่นในพื้นที่โล่ง ยังไม่มีท่านั่งบนโซฟา',targets:[[6,15]],states:['idle']},
  {id:'coffee',room:'lounge',point:[1170,375],title:'บาร์กาแฟ · มุมผ่อนคลาย',description:'มุมกาแฟและพูดคุยในห้องนั่งเล่น การคลิกเปิดข้อมูลเท่านั้น ไม่สั่งให้ AI ทำงานหรือใช้ token เพิ่ม',targets:[[12,15]],states:['idle']},
  {id:'bed-left',room:'rest',point:[455,320],title:'เตียงชุดซ้าย · 2 ที่พัก',description:'เตียงสองชั้นหนึ่งชุด รวม 2 ที่พัก AI ที่ว่างอย่างน้อย 3 นาทีในช่วงกลางคืนตามเวลาเครื่องจะมาพักในห้องนี้ ยังไม่ได้จองเตียงหรือแสดงท่านอนจริง',targets:[[6,15]],states:['idle']},
  {id:'bed-right',room:'rest',point:[1095,355],title:'เตียงชุดขวา · 2 ที่พัก',description:'เตียงสองชั้นชุดที่สอง รวมทั้งห้องมี 4 ที่พัก เมื่อมีงานใหม่ AI จะกลับห้องทำงานโดยอัตโนมัติ ตัวเลขนี้คือจำนวนที่พัก ไม่ใช่จำนวนผู้กำลังนอน',targets:[[12,15]],states:['idle']},
];
const hotspotGroup=document.getElementById('zone-hotspots'),zoneDialog=document.getElementById('zone-details');
function openZone(id) {
  const zone=HQ_HOTSPOTS.find(zone=>zone.id===id);if(!HOME || !zone || (zone.room||'work')!==selectedRoom)return;
  document.getElementById('zone-title').textContent=zone.title;
  document.getElementById('zone-description').textContent=zone.description;
  document.getElementById('zone-target').textContent=`${selectedRoom==='work'?'จุดทำงาน':'จุดเดินพัก'}บนกริด: ${zone.targets.map(p=>`(${p[0]}, ${p[1]})`).join(' · ')}`;
  const count=[...agents.values()].filter(a=>(a.room||'work')===selectedRoom && zone.states.includes(a.state)).length;
  document.getElementById('zone-activity').textContent=zone.states.length?`ตัวละครในห้องนี้ที่มีสถานะเกี่ยวข้อง: ${count} ตัว (ไม่ใช่จำนวนผู้ใช้เฟอร์นิเจอร์ อาจรวม Demo)`:'จุดข้อมูลทางเข้า · คลิกเพื่อดูรายละเอียดเท่านั้น';
  zoneDialog.showModal();
}
HQ_HOTSPOTS.forEach(zone=>{document.getElementById(`zone-${zone.id}`).onclick=()=>openZone(zone.id);});
document.getElementById('close-zone').onclick=()=>zoneDialog.close();
function hotspotPosition(point,width,height) {
  const scale=Math.min(width/VIEW.w,height/VIEW.h),[x,y]=hqScreen(point);
  return [(width-VIEW.w*scale)/2+(x-VIEW.x)*scale,(height-VIEW.h*scale)/2+(y-VIEW.y)*scale];
}
let hotspotSize='';
function positionHotspots() {
  hotspotGroup.hidden=!hqReady();if(hotspotGroup.hidden)return;
  const size=[selectedRoom,cv.clientWidth,cv.clientHeight,cv.offsetLeft,cv.offsetTop,cv.clientLeft,cv.clientTop].join(',');
  if(size===hotspotSize)return;hotspotSize=size;
  for(const zone of HQ_HOTSPOTS) {
    const button=document.getElementById(`zone-${zone.id}`);
    button.hidden=(zone.room||'work')!==selectedRoom;if(button.hidden)continue;
    const [x,y]=hotspotPosition(zone.point,cv.clientWidth,cv.clientHeight);
    button.style.left=`${cv.offsetLeft+cv.clientLeft+x}px`;
    button.style.top=`${cv.offsetTop+cv.clientTop+y}px`;
  }
}
const roomNav=document.getElementById('hq-rooms');roomNav.hidden=!HOME;
function chooseRoom(name) {
  if(!HOME || !HQ_ROOMS[name])return;
  selectedRoom=name;pointer=null;tooltip.hidden=true;zoneDialog.close();hotspotSize='';
  try{localStorage.setItem('office-hq-room',name);}catch{}
}
for(const name of Object.keys(HQ_ROOMS))document.getElementById('room-'+name).onclick=()=>chooseRoom(name);
function agentRoom(a,now=Date.now(),night=lighting.label==='กลางคืน') {
  if(a.state!=='idle')return 'work';
  return night && now-(a.idleSince??now)>=180000?'rest':'lounge';
}
function updateAgentRoom(a,now=Date.now()) {
  if(!HOME)return;
  const next=agentRoom(a,now);
  if(a.room!==next)Object.assign(a,{room:next,x:ENTRY[0],y:ENTRY[1],path:[],target:null,roamTarget:null,nextRoam:0,sleeping:false,sleepSpot:null,sx:undefined,sy:undefined});
}
function updateRoomControls() {
  if(!HOME)return;
  for(const [name,room] of Object.entries(HQ_ROOMS)){
    const button=document.getElementById('room-'+name);
    const text=`${room.title} · ${[...agents.values()].filter(a=>(a.room||'work')===name).length}`;
    if(button.textContent!==text)button.textContent=text;
    button.setAttribute('aria-pressed',String(selectedRoom===name));
  }
  const caption=`${HQ_ROOMS[selectedRoom].title} · AI รับงานใหม่จะกลับห้องทำงาน · พักกลางคืนเมื่อว่าง 3 นาที`;
  if(document.getElementById('room-caption').textContent!==caption)document.getElementById('room-caption').textContent=caption;
}
const labels = { read:'อ่าน / ค้นหา', write:'แก้ไขไฟล์', web:'ค้นเว็บ', bash:'รันคำสั่ง', think:'กำลังคิด', talk:'กำลังตอบ', agent:'ประสานงาน', idle:'พักผ่อน' };
const icons = { read:'book', write:'edit', web:'globe', bash:'terminal', think:'message', talk:'message', agent:'users', idle:'coffee' };
const iconImages = Object.fromEntries([...new Set(Object.values(icons))].map(name => {
  const img = new Image(); img.src = `/assets/icons/${name}.svg`; return [name, img];
}));
const colors = { read:'#2586b6', write:'#7958d1', web:'#ca8a18', bash:'#21865b', think:'#bd5692', talk:'#bd5692', agent:'#148a98', idle:'#b87436' };
const runningCommands = () => [...agents.values()].filter(a => a.state === 'bash' && a.sessionSid && !a.sessionSid.startsWith('demo-') && Date.now()-a.last <= 15*60e3).length;

function route(from, to, room='work') {
  const obstacles=HOME && HQ_ROOMS[room]?.blocked ? HQ_ROOMS[room].blocked : blocked;
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
      if (n[0] > 0 && n[0] < COLS-1 && n[1] > 0 && n[1] <= ENTRY[1] && !obstacles.has(k) && !prev.has(k)) { prev.set(k,p); queue.push(n); }
    }
  }
  return [];
}
function activitySummary(state, raw) {
  const text = String(raw || '').trim();
  if (state === 'idle') return 'จบงานแล้ว กำลังพักผ่อน';
  const technical = /Context from my IDE|#.*Active File|tools\.|exec_command|apply_patch|"cmd"|^\s*(?:const |await |\{|# Context)/.test(text);
  if (technical || !text) return ({ think:'กำลังพิจารณาคำขอของคุณ', talk:'กำลังอธิบายผลการทำงาน', read:'กำลังตรวจสอบไฟล์และข้อมูลในโปรเจกต์', write:'กำลังปรับปรุงไฟล์ในโปรเจกต์', bash:'กำลังเรียกใช้คำสั่งหรือเครื่องมือ', web:'กำลังค้นหาข้อมูลบนเว็บ', agent:'กำลังประสานงานกับ Agent' })[state] || 'กำลังทำงาน';
  if (state === 'think') return `รับคำขอ: ${text}`;
  if (['read','write'].includes(state) && /[\\/]|\.\w{1,5}$/.test(text)) return `${state==='read'?'ตรวจสอบ':'แก้ไข'}ไฟล์: ${text}`;
  if (state === 'bash') return 'กำลังเรียกใช้คำสั่งหรือเครื่องมือ';
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
  badge.append(icon,labels[a.state] || 'ทำงาน');
  const summary=document.createElement('p');summary.textContent=activitySummary(a.state,a.text);
  li.append(head,badge,summary);
  if(a.text && summary.textContent!==a.text) {
    const details=document.createElement('details'), toggle=document.createElement('summary'), raw=document.createElement('pre');
    toggle.textContent='รายละเอียด';raw.textContent=a.text;details.append(toggle,raw);li.append(details);
  }
  activityEntries.push({ node:li, time:Number.isFinite(ev.t)?ev.t:Date.now(), sequence:activitySequence++ });
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
      x:3+i*3, y:16, dir:2, path:[], target:null, nextRoam:0, idleSince:Date.now() });
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

const roamSpots = HOME ? [[12,13],[12,14],[14,13],[6,4],[10,16]] : [[2,14],[5,14],[3,16],[6,16],[8,16],[9,15],[2,16], ...barSeats];
function sleepTarget(a, now, night) {
  if (!night || a.state !== 'idle' || now - (a.idleSince ?? now) < 3*60e3) {
    a.sleepSpot = null; a.sleeping = false; return null;
  }
  if (!a.sleepSpot) a.sleepSpot = napSpots.find(p => ![...agents.values()].some(other => other !== a && other.sleepSpot && key(...other.sleepSpot) === key(...p))) || null;
  a.sleeping = !!a.sleepSpot && !a.path.length && a.x === a.sleepSpot[0] && a.y === a.sleepSpot[1];
  return a.sleepSpot;
}
function chooseTarget(a, assigned, now) {
  if(HOME && a.room && a.room!=='work') {
    const spots=[[6,15],[9,15],[12,15],[8,16]];
    if(!a.roamTarget || (!a.path.length && now>=a.nextRoam)) {
      const candidates=spots.filter(p=>!HQ_ROOMS[a.room].blocked.has(key(...p)) && ![...agents.values()].some(other=>other!==a && other.room===a.room && other.roamTarget && key(...other.roamTarget)===key(...p)));
      a.roamTarget=candidates[Math.floor(Math.random()*candidates.length)]||[8,16];a.nextRoam=Infinity;
    }
    if(!a.path.length && a.x===a.roamTarget[0] && a.y===a.roamTarget[1] && a.nextRoam===Infinity)a.nextRoam=now+(a.room==='rest'?15000:4000);
    return a.roamTarget;
  }
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
const iso = (gx, gy) => HOME ? hqScreen(hqPoint(gx,gy)) : [OX + (gx - gy) * TW / 2, OY + (gx + gy) * TH / 2];
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
function wallText(side, a, h, text, font, color) {
  const [x, y] = wallPt(side, a, h);
  ctx.save(); ctx.translate(x, y); ctx.transform(1, side === 'r' ? .5 : -.5, 0, 1, 0, 0);
  ctx.font = font; ctx.fillStyle = color; ctx.fillText(text, 0, 0); ctx.restore();
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
function floorColor(kind, x, y) {
  const odd = (x + y) % 2;
  const style=BUILDINGS[buildingTheme];
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
let detailedAssets = true;
try { detailedAssets=localStorage.getItem('office-detailed-assets') !== 'false'; } catch {}
const detailedToggle=document.getElementById('detailed-assets');
detailedToggle.checked=detailedAssets;
detailedToggle.onchange=()=>{detailedAssets=detailedToggle.checked;};
let settingsSnapshot=null;
function openSettings() {
  document.getElementById('scene-home').setAttribute('aria-current',HOME?'page':'false');
  document.getElementById('scene-office').setAttribute('aria-current',HOME?'false':'page');
  settingsSnapshot={building:buildingTheme,background:backgroundTheme,detailed:detailedAssets};
  detailedToggle.checked=detailedAssets;
  backgroundSelect.value=backgroundTheme;
  backgroundSelect.refreshAppearance?.();
  Object.keys(BUILDINGS).forEach(name=>{document.getElementById(`building-${name}`).checked=name===buildingTheme;});
  settingsDialog.showModal();
}
function cancelSettings() {
  if(settingsSnapshot){setBuilding(settingsSnapshot.building);backgroundTheme=settingsSnapshot.background;detailedAssets=settingsSnapshot.detailed;detailedToggle.checked=detailedAssets;backgroundSelect.value=backgroundTheme;backgroundSelect.refreshAppearance?.();settingsSnapshot=null;}
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
document.getElementById('open-settings').onclick=openSettings;
document.getElementById('cancel-settings').onclick=cancelSettings;
document.getElementById('close-settings').onclick=cancelSettings;
settingsDialog.oncancel=e=>{e.preventDefault();cancelSettings();};
settingsDialog.onclose=()=>{if(settingsSnapshot)cancelSettings();};
document.getElementById('save-settings').onclick=()=>{
  try { localStorage.setItem('office-background',backgroundTheme);localStorage.setItem('office-building',buildingTheme);localStorage.setItem('office-detailed-assets',String(detailedAssets)); } catch {}
  settingsSnapshot=null;settingsDialog.close();
};
function drawBangkok(t) {
  const theme=BACKGROUNDS[backgroundTheme];
  const day = lighting.daylight, twilight = lighting.label === 'ยามเย็น' || lighting.label === 'ยามเช้า';
  const mix = (a,b) => '#' + [1,3,5].map(i => Math.round(parseInt(a.slice(i,i+2),16)*(1-day)+parseInt(b.slice(i,i+2),16)*day).toString(16).padStart(2,'0')).join('');
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,mix(...theme.sky));
  sky.addColorStop(.48,twilight ? (backgroundTheme==='neon'?'#895e9d':'#e6ad9f') : mix(...theme.horizon));
  sky.addColorStop(1,mix(...theme.base));
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // Small pixel celestial bodies and clouds sit behind Bangkok's layered skyline.
  if(day<.35){
    for(let i=0;i<38;i++) rect((i*79+19)%W,8+(i*31)%82,1,1,'#d9e6ef');
    rect(577,23,14,14,'#fff0be');rect(582,20,9,3,'#fff0be');rect(582,22,12,11,mix(...theme.sky));
  } else {
    rect(568,28,20,20,twilight?'#ffd398':'#fff1ce');
    [[60,29],[322,19],[475,54]].forEach(([x,y])=>{rect(x,y,43,5,'#ffffff55');rect(x+12,y-4,24,5,'#ffffff55');});
  }
  // Staggered distant neighborhoods, with breathing room between taller clusters.
  const distant=[[-12,33,66],[25,21,47],[51,39,83],[97,25,55],[129,32,104],[169,19,61],[199,45,49],[250,24,73],[281,36,58],[326,23,93],[358,42,67],[411,27,48],[449,35,89],[491,21,63],[523,39,107],[571,25,75],[605,37,53],[651,28,82]];
  distant.forEach(([x,w,h],i)=>{
    const base=179+(i%3)*6;
    rect(x,base-h,w,h,mix(...theme.far));
    rect(x+3,base-h-3,w-6,3,mix(...theme.far));
  });
  if(backgroundTheme==='rain') {
    for(let i=0;i<4;i++) { const x=((t/600+i*179)%(W+160))-160; rect(x,125+i*9,155,5,'#d4e5ef17');rect(x+28,121+i*9,90,4,'#d4e5ef12'); }
  }
  // Original skyline silhouettes: stepped high-rise, rooftop tanks, antennas and shophouses.
  if(backgroundTheme==='sunset') {
    rect(525,109,25,14,day<.35?'#d5b7d9':'#ffdbad');
    rect(521,114,33,7,day<.35?'#d5b7d9':'#ffdbad');
  }
  const towers=[[-9,78,29,199],[27,111,35,192],[56,64,25,211],[91,143,31,189],[116,87,42,207],[172,59,34,199],[217,95,28,194],[249,68,45,216],[310,126,35,198],[341,71,27,211],[392,83,42,200],[440,119,31,192],[467,63,24,207],[516,74,30,204],[550,153,37,194],[582,98,28,212],[628,67,43,203]];
  towers.forEach(([x,h,w,base],i)=>{
    const y=base-h;
    rect(x+4,y+5,w,h,mix('#16243e','#718fa6'));rect(x,y,w,h,mix(...theme.near));
    rect(x,y,w,3,mix('#42526d','#b1c2ce'));
    if(i===3||i===14){rect(x+6,y-9,w-12,9,mix(...theme.near));rect(x+w/2,y-17,2,8,'#72869b');}
    else {rect(x+5,y-7,9,7,mix('#34405a','#8299a6'));rect(x+6,y-9,7,2,'#596e85');}
    for(let row=0;row<Math.floor((h-8)/9);row++) for(let col=0;col<Math.floor((w-5)/7);col++){
      const lit=(row*11+col*7+i)%5<2;
      rect(x+4+col*7,y+7+row*9,3,5,day<.6&&lit?theme.accent:mix('#142239','#c4dbe6'));
    }
    if(i===8){for(let n=0;n<4;n++)rect(x+w-8,y+12+n*10,8,8,mix('#394064','#d7e3e9'));}
    if(backgroundTheme==='neon' && i%3===0) {
      const neon=i%2?'#ed8acb':'#6bd9e5';
      rect(x+2,y+h-20,w-4,9,day<.6?neon:'#8297b7');rect(x+5,y+h-17,w-10,2,'#27304c');
      if(day<.6)rect(x,y+h-9,w,5,i%2?'#df70be22':'#62dbed22');
    }
  });
  if(backgroundTheme==='sunset') {
    for(let i=0;i<3;i++)rect((t/900+i*205)%(W+100)-100,132+i*8,70,2,'#edc2cb25');
  }
  // Elevated railway, with an animated train visible between the office and skyline.
  rect(0,166,W,7,mix('#33435a','#8e9eac'));rect(0,165,W,2,'#b3c0ca');
  for(let x=22;x<W;x+=88)rect(x,173,7,28,mix('#29394e','#a3b0b8'));
  const trainX=(t/85)%(W+124)-124;
  rect(trainX,151,118,13,'#e3eaf1');rect(trainX,161,118,3,'#cf5b56');
  for(let i=0;i<12;i++)rect(trainX+5+i*9,154,6,5,'#3c6683');
  // Distant rooftops sit below the high-rise office, with no ground-level road in view.
  for(let i=0;i<7;i++){
    const x=i<3?i*25:W-100+(i-3)*25,y=H-101+(i%3)*9;
    rect(x,y,22,62,mix('#344158','#9facb7'));rect(x-1,y-3,24,5,mix('#57677c','#c9c5b8'));
    rect(x+5,y-10,7,7,'#748e9c');
    for(let n=0;n<4;n++)rect(x+5,y+8+n*10,4,5,day<.6?'#dbb16d':'#c8dce4');
  }
}

function drawBuildingExterior() {
  const style=BUILDINGS[buildingTheme];
  const left = [iso(1,21),iso(31,21)], right = [iso(31,1),iso(31,21)];
  const depth = H - Math.min(...left.concat(right).map(p => p[1])) + 30;
  const face = (edge, top, bottom, color) => poly([up(edge[0],-top),up(edge[1],-top),up(edge[1],-bottom),up(edge[0],-bottom)],color);
  face(left,0,depth,style.facade[0]); face(right,0,depth,style.facade[1]);
  // Continue the facade beyond the canvas so the tower has no visible base.
  for(let floor=0;14+floor*62<depth;floor++) {
    const z=14+floor*62;
    face(left,z-5,z-2,style.trim);face(right,z-5,z-2,style.facade[0]);
    for(let col=0;col<14;col++) {
      const a=2+col*2;
      const edge=[iso(a,21),iso(a+1.35,21)];
      const lit=lighting.daylight<.6&&(col*7+floor*3)%5<2;
      face(edge,z,z+30,'#243d5d');
      face([iso(a+.12,21),iso(a+1.22,21)],z+3,z+27,lit?'#edc587':lighting.daylight<.6?'#1c2f4c':'#9cc1d6');
    }
    for(let col=0;col<9;col++) {
      const a=2+col*2;
      const lit=lighting.daylight<.6&&(col*3+floor)%5<2;
      face([iso(31,a),iso(31,a+1.35)],z,z+30,'#1b304b');
      face([iso(31,a+.12),iso(31,a+1.22)],z+3,z+27,lit?'#d9b778':lighting.daylight<.6?'#172a44':'#769dbb');
    }
  }
  // Continuous corner columns extend below the viewport.
  face([iso(1,21),iso(1.45,21)],0,depth,style.trim);
  face([iso(30.55,21),iso(31,21)],0,depth,style.trim);
  face([iso(31,20.55),iso(31,21)],0,depth,style.facade[1]);
  if(buildingTheme==='cyber') {
    face([iso(30.9,21),iso(31,21)],0,depth,'#ed83db');
    face([iso(31,20.85),iso(31,21)],0,depth,'#5de6e6');
  }
}

function drawHomeRoom(t) {
  if(hqReady()) {
    rect(0,0,W,H,'#080f20');ctx.drawImage(roomImage(),65,95,420,280);return;
  }
  if(selectedRoom!=='work') {
    rect(0,0,W,H,'#080f20');ctx.fillStyle='#dce8f7';ctx.font='12px sans-serif';
    ctx.fillText(roomImage().complete?'โหลดภาพห้องไม่สำเร็จ กรุณารีเฟรช':'กำลังโหลดภาพห้อง…',VIEW.x+35,VIEW.y+160);return;
  }
  rect(0,0,W,H,'#080f20');
  ctx.strokeStyle='#17304d';ctx.lineWidth=.6;
  for(let i=0;i<22;i++) {
    const x=VIEW.x+8+i*19, y=VIEW.y+24+(i%4)*8;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+35);ctx.lineTo(x+22,y+48);ctx.lineTo(x+22,y+90);ctx.stroke();
    rect(x-1,y-1,2,2,i%3===0?'#42748e':'#1c3d5a');
  }
  ctx.textAlign='center';ctx.font='bold 19px "Press Start 2P", monospace';
  ctx.fillStyle='#253e60';ctx.fillText('AGENT HQ',275,91);
  ctx.fillStyle='#ead8aa';ctx.fillText('AGENT HQ',274,89);ctx.textAlign='left';
  // The new room is a self-contained cutaway, not a tower facade.
  box(1,1,16,16,7,'#604b3e','#352b2b','#26303b',-7);
  for(let y=1;y<17;y++)for(let x=1;x<17;x++) {
    const woods=['#594338','#624a3c','#574034','#674e40'];
    poly(quad(x,y,1,1),woods[y%4]);
    poly(quad(x,y,1,.025),'#3a302c');
    if((x+y*2)%4===0)poly(quad(x,y,.025,1),'#3a302c');
    if((x+y*3)%4===0)poly(quad(x+.15,y+.3,.65,.018),'#765947');
  }
  wallQuad('l',1,17,0,WALL,'#272b37');wallQuad('r',1,17,0,WALL,'#242a3b');
  for(const [side,end] of [['l',17],['r',17]]) {
    wallQuad(side,1,end,0,5,'#725543');wallQuad(side,1,end,69,72,'#172532');
    wallQuad(side,1,end,62,63,'#b2966c');
  }
  wallQuad('r',9,16,24,58,'#141c2b');wallQuad('r',9.2,15.8,26,56,'#d4c6a5');
  wallText('r',9.5,47,'ROADMAP','bold 5px monospace','#313747');
  ['1. PLAN','2. BUILD','3. REVIEW','4. DEPLOY'].forEach((s,i)=>wallText('r',9.6,42-i*4,s,'3px monospace','#414457'));
  [12.7,13.8,14.8].forEach((a,i)=>{wallQuad('r',a,a+.3,39-i*4,41-i*4,['#587a92','#a3769e','#7b936b'][i]);});
  // Bookshelf, framed prints and a warm wall light use the same room palette.
  wallQuad('l',5,15,8,28,'#161f29');
  for(let h=10;h<28;h+=9) {
    for(let a=5.2;a<14.8;a+=.4)wallQuad('l',a,a+.25,h,h+6,['#896b52','#476c73','#a9916a'][Math.floor(a*9)%3]);
    wallQuad('l',5,15,h-2,h,'#896648');
  }
  wallQuad('r',3,8,32,54,'#17232f');wallQuad('r',3.2,7.8,34,52,'#546b70');
  wallText('r',3.6,41,'SYSTEM ONLINE','bold 5px monospace','#a1dfc4');
  wallQuad('l',3,8,34,61,'#17232f');wallQuad('l',3.2,7.8,36,59,'#c8bda3');
  wallText('l',7.5,52,'SYSTEM ARCHITECTURE','bold 3px monospace','#35454d');
  for(let a=3.6;a<7.5;a+=1.2){wallQuad('l',a,a+.8,40,47,'#526575');wallQuad('l',a+.12,a+.68,41,46,'#e0d7bd');}
  wallQuad('l',9,15,37,60,'#16243a');
  wallText('l',14.5,46,'< AI / LAB >','bold 7px monospace','#79cfeb');
  poly(quad(9.5,15.5,3,1.5),'#273a43');
}
function drawRoom(t) {
  if(HOME){drawHomeRoom(t);return;}
  drawBangkok(t);
  drawBuildingExterior();
  // floor
  for (let y = 1; y < 21; y++) for (let x = 1; x < 31; x++) {
    const area = AREAS.find(a => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h);
    poly(quad(x, y, 1, 1), floorColor(area && area.floor, x, y));
  }
  poly(quad(15, 21, 2, 1), C.blue); poly(quad(15.2, 21.15, 1.6, .7), C.blue2);   // entry mat
  poly(quad(2, 13.2, 7, 3.2), '#9fb6dc'); poly(quad(2.2, 13.4, 6.6, 2.8), '#cfdcf1');   // lounge rug
  // floor edge (gives the slab thickness)
  poly([iso(1, 21), iso(31, 21), up(iso(31, 21), -6), up(iso(1, 21), -6)], '#b9c9e0');
  poly([iso(31, 1), iso(31, 21), up(iso(31, 21), -6), up(iso(31, 1), -6)], '#cbd8ea');
  AREAS.forEach(a => floorText(a.x + .4, a.y + a.h - .4, a.title));
  // Recessed cable trays stay walkable and connect the rack rows to the control desk.
  for(const x of [22,24]) {
    poly(quad(x+.42,14,.16,4),'#142037');
    poly(quad(x+.47,14,.05,4),'#467390');
  }
  poly(quad(21,18.4,4,.2),'#142037');poly(quad(21,18.47,4,.06),'#467390');
  poly(quad(21,16.4,.16,3),'#142037');

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
  // company logo
  wallQuad('r', 16, 25.8, 34, 60, C.navy); wallQuad('r', 16.3, 17.6, 38, 56, C.blue); wallQuad('r', 16.65, 17.25, 41, 53, C.white);
  wallText('r', 18, 42, 'DHITETA AI', 'bold 8px "Press Start 2P", monospace', '#fff');
  // big web screen
  wallQuad('r', 26.3, 30.7, 18, 52, C.navy);
  wallQuad('r', 26.6, 30.4, 21, 49, (t / 700 | 0) % 2 ? '#2f7be0' : '#3d8bea');
  wallQuad('r', 27.4, 29.2, 27, 43, '#9fd0f5'); wallQuad('r', 27.9, 28.7, 31, 39, '#5aa0f0');
  // meeting: TV + whiteboard on the left wall
  wallQuad('l', 2, 5.8, 20, 46, C.navy); wallQuad('l', 2.3, 5.5, 23, 43, (t / 900 | 0) % 2 ? '#3d8bea' : '#5aa0f0');
  wallText('l', 2.7, 30, 'Q4 PLAN', 'bold 7px "Press Start 2P", monospace', '#fff');
  wallQuad('l', 6.1, 7.8, 36, 57, '#c9d7ec'); wallQuad('l', 6.23, 7.67, 38, 55, '#fff');
  wallQuad('l', 6.45, 7.3, 49, 50, C.blue); wallQuad('l', 6.45, 7.45, 45, 46, C.orange); wallQuad('l', 6.45, 7.05, 41, 42, C.blue);
  // clock
  const [cx, cy] = wallPt('r', 11.5, 46);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx, cy, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.navy; ctx.lineWidth = 1.5; ctx.stroke(); ctx.beginPath();
  const am = lighting.minute / 60 * Math.PI * 2, ah = ((lighting.hour % 12) + lighting.minute/60) / 12 * Math.PI * 2;
  ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(am) * 4.5, cy - Math.cos(am) * 5);
  ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ah) * 3, cy - Math.cos(ah) * 3.5); ctx.stroke();
}

// ---------- furniture ----------
const detailedSprites = Object.fromEntries([
  ['desk','desk-workstation-v1.png',[188,17,1174,983]],['rack','server-rack-v1.png',[246,108,530,1307]],
  ['sofa','sofa-v1.png',[320,30,1135,829]],['coffeeBar','coffee-bar-v1.png',[314,38,920,936]],['coffeeTable','coffee-table-v1.png',[130,108,1276,832]],
  ['table','meeting-table-v1.png',[103,42,1330,958]],['plant','plant-v1.png',[171,8,958,1174],.7,.7],
  ['armchair','armchair-v1.png',[193,82,1018,1013]],['chair','office-chair-v1.png',[255,67,786,1152],.7,.7],
  ['barStool','bar-stool-v1.png',[244,76,730,1138],.6,.6],['daybed','bunk-bed-v1.png',[330,36,880,955],2,1],
].map(([kind,file,crop,w,d])=>{
  const image=new Image();image.src=`/assets/detailed/${file}`;
  return [kind,{image,crop,w,d}];
}));
function detailedPlacement(o) {
  const asset=detailedSprites[o.kind === 'controlDesk' ? 'desk' : o.kind];
  if(!detailedAssets || !asset || !asset.image.complete || !asset.image.naturalWidth)return false;
  const {image}=asset;
  const crop=asset.crop || [0,0,image.naturalWidth,image.naturalHeight];
  const [sx,sy,sw,sh]=crop;
  const w=asset.w || o.w, d=asset.d || o.d;
  const gx=o.x+(w<o.w?(o.w-w)/2:0), gy=o.y+(d<o.d?(o.d-d)/2:0);
  const left=iso(gx,gy+d)[0], bottom=iso(gx+w,gy+d)[1];
  const width=(w+d)*TW/2, height=width*sh/sw;
  return {image,crop,left,top:bottom-height,width,height};
}
function drawDetailedFurniture(o) {
  const placement=detailedPlacement(o);
  if(!placement)return false;
  const {image,crop,left,top,width,height}=placement;
  ctx.drawImage(image,...crop,Math.round(left),Math.round(top),width,height);
  return true;
}
function shadowQ(gx, gy, w, d) { poly(quad(gx + .05, gy + .15, w, d), 'rgba(15,42,82,.14)'); }
function plantTop(p, s = 1) {
  const [x, y] = p;
  rect(x - 7 * s, y - 10 * s, 14 * s, 9 * s, C.leaf); rect(x - 4 * s, y - 15 * s, 8 * s, 6 * s, C.leaf2);
  rect(x - 9 * s, y - 6 * s, 4 * s, 4 * s, C.leaf2); rect(x + 5 * s, y - 8 * s, 4 * s, 4 * s, C.leaf2);
}
function drawObject(o, t) {
  if(HOME && (o.role || o.kind==='table')) {
    const p=detailedPlacement(o), [x,y]=iso(o.x+o.w/2,o.y);
    const text=o.role || 'PROJECT MANAGER', color=o.accent || '#bb9ade';
    const top=p?p.top-6:y-30;
    ctx.font='bold 3px monospace';const width=ctx.measureText(text).width+6;
    rect(x-width/2,top-5,width,7,'#111f30');
    rect(x-width/2,top+2,width,.5,color);
    ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,x,top);ctx.textAlign='left';
  }
  const { x, y, w, d } = o;
  if(drawDetailedFurniture(o))return;
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
    case 'daybed':
      shadowQ(x,y,2,1);
      for (const z of [5,27]) {
        box(x,y,2,1,2,C.wood,C.woodDark,'#b07f4a',z-2);
        box(x+.05,y+.05,1.9,.9,3,'#c4d7ef','#a6bedf','#8da8cd',z);
        box(x+.12,y+.12,.45,.72,2,'#fff','#e9eef6','#dfe7f2',z+3);
        box(x+.8,y+.08,1.1,.84,1,C.blue2,C.blue3,C.blue,z+3);
      }
      for (const [dx,dy] of [[0,0],[1.9,0],[0,.9],[1.9,.9]]) box(x+dx,y+dy,.1,.1,36,C.wood,C.woodDark,'#b07f4a');
      box(x+.05,y,1.9,.08,3,C.wood,C.woodDark,'#b07f4a',33);
      for (const dx of [1.5,1.9]) box(x+dx,y+1,.06,.06,29,C.wood,C.woodDark,'#b07f4a');
      for (const z of [6,13,20,27]) box(x+1.5,y+1,.46,.06,1,C.wood,C.woodDark,'#b07f4a',z);
      break;
    case 'sofa':
      shadowQ(x, y, w, d);
      box(x, y + .2, w, .8, 7, C.blue2, C.blue3, C.blue3);
      box(x, y, w, .3, 16, C.blue3, C.blue, C.blue3);
      box(x - .05, y, .3, 1, 11, C.navy, C.blue3, C.navy); box(x + w - .25, y, .3, 1, 11, C.navy, C.blue3, C.navy);
      box(x + .6, y + .35, .6, .2, 6, '#fff', '#e9eef6', '#dfe7f2', 7); box(x + 2.6, y + .35, .6, .2, 6, '#fff', '#e9eef6', '#dfe7f2', 7);
      break;
    case 'armchair':
      shadowQ(x, y, w, d);
      box(x + .1, y + .1, .8, .8, 6, C.blue2, C.blue3, C.blue3); box(x + .7, y + .1, .25, .8, 14, C.blue3, C.blue, C.navy);
      break;
    case 'coffeeTable':
      shadowQ(x, y, w, d);
      box(x + .1, y + .15, w - .2, d - .3, 6, C.wood, C.woodDark, '#b07f4a');
      box(x + .5, y + .4, .2, .2, 3, '#fff', '#e9eef6', '#dfe7f2', 6); box(x + 1.2, y + .35, .4, .3, 1, C.blue, C.blue3, C.blue3, 6);
      break;
    case 'coffeeBar': {
      shadowQ(x, y, w, d);
      box(x, y, w, d, 17, C.wood, C.woodDark, '#b07f4a');
      box(x - .08, y - .04, w + .16, d + .18, 2, '#ffffff', '#dfe7f2', '#c9d7ec', 17);
      box(x, y + d - .08, w, .08, 2, C.blue, C.blue, C.blue3, 3);
      for (let i = 1; i < w; i++) box(x + i, y + d - .02, .03, .03, 12, '#b08252', '#b08252', '#b08252', 3);
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
      const thin = w > d ? [x, y + offset, w + (o.edge ? .1 : 0), .1] : [x + offset, y, .1, d];
      box(...thin, 30, C.glassTop, C.glass, C.glass);
      box(...thin, 3, C.navy, C.blue3, C.blue3);
      box(thin[0], thin[1], thin[2], thin[3], 2, C.navy, C.navy, C.navy, 30);
      break;
    }
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
      break;
    }
    case 'table':
      shadowQ(x, y, w, d);
      box(x, y, w, d, 9, C.white, C.edge, '#dfe7f2');
      for (let i = 0; i < 3; i++) box(x + .5 + i * 1.2, y + .6, .5, .4, 1, '#8d9ab0', '#6b778c', '#6b778c', 9);
      box(x + 1.7, y + 1.2, .3, .3, 2, '#fff', '#e9eef6', '#dfe7f2', 9);
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

function hqCharacterFrame(a,t) {
  const seated=(!a.room || a.room==='work') && !a.path.length && ['read','write','web'].includes(a.state) && a.x===4 && a.y===8;
  const image=hqCharacters[seated?'seated':'walk'];
  if(!image.complete || !image.naturalWidth || !image.naturalHeight)return null;
  if(seated)return {image,crop:[175,100,800,1250],height:56,flip:a.x<6};
  const frame=a.path.length ? [1,0,2,0][Math.floor(t/180)%4] : 0;
  const row=a.dir===3?0:1, w=image.naturalWidth/3,h=image.naturalHeight/2;
  return {image,crop:[frame*w,row*h,w,h],height:70,flip:!!a.flip};
}
function drawHQCharacter(a,t) {
  if(!hqReady())return false;
  const frame=hqCharacterFrame(a,t);if(!frame)return false;
  const seated=frame.image===hqCharacters.seated;
  const {image,crop,height,flip}=frame;
  const width=height*crop[2]/crop[3];
  let [x,y]=iso(a.x+.5,a.y+.5);
  if(seated) {
    const hip=hqScreen([620,419]);
    const scale=height/crop[3], hipX=410,hipY=900;
    x=hip[0]-(flip?-1:1)*(hipX-crop[0]-crop[2]/2)*scale;
    y=hip[1]+height-(hipY-crop[1])*scale;
  }
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(x,y,6,2.5,0,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(image,...crop,-width/2,-height,width,height);
  ctx.restore();a.sx=x;a.sy=y;a.top=y-height;
  return true;
}
function drawAgent(a, t) {
  if(drawHQCharacter(a,t))return;
  const upperBunk = a.sleeping && [4,8].includes(a.x);
  const [x, y] = iso(a.x + (upperBunk ? -.5 : .5), a.y + .5);
  a.look = a.look || lookFor(a.sid, a.kind);
  const working = !a.path.length && ['read', 'write', 'web', 'bash'].includes(a.state);
  const atBar = !a.path.length && a.state === 'idle' && barSeats.some(([sx,sy]) => a.x === sx && a.y === sy);
  const sit = atBar || (!a.path.length && (['read', 'write'].includes(a.state) || (a.state === 'bash' && a.y === 20 && a.x <= 24)));
  const frame = a.path.length ? 1 + (Math.floor(t / 140) % 2) : 0;
  const prop = a.path.length ? '' : a.state === 'idle' ? 'mug' : ['think', 'talk', 'agent'].includes(a.state) ? 'tablet' : '';
  const img = sprite(a.look, atBar ? 'front' : a.dir >= 2 ? 'front' : 'back', frame, prop, sit);
  ctx.fillStyle = 'rgba(15,42,82,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  const typing = working && sit && Math.floor(t / 180) % 2 ? 1 : 0;      // tiny bob while typing
  const bob = a.path.length ? (frame === 1 ? 1 : 0) : 0;
  ctx.save();
  if (a.sleeping) {
    const bed=detailedPlacement({kind:'daybed',x:upperBunk?a.x-1:a.x,y:a.y,w:1,d:1});
    const cx=bed?bed.left+bed.width*.5:x;
    const cy=bed?bed.top+bed.height*(upperBunk?.305:.657):y-(upperBunk?31:9);
    ctx.translate(Math.round(cx),Math.round(cy));
    ctx.rotate(bed?-Math.atan(2):-Math.PI/2);
    if(bed)ctx.scale(.65,.65);
    ctx.drawImage(img,-SW/2,-SH/2);
    ctx.restore();
    a.sx=cx;a.sy=bed?cy+10:y-(upperBunk ? 22 : 0);a.top=a.sy-22;
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
    (!HOME || (a.room||'work')===selectedRoom) && a.sx !== undefined && Math.abs(x-a.sx) <= Math.max(14,(a.tagWidth || 0)/2) && y >= a.top-14 && y <= a.sy+15);
}
function updateTooltip() {
  if (!pointer) { tooltip.hidden = true; return; }
  const r = cv.getBoundingClientRect();
  const scale = Math.min(cv.clientWidth/VIEW.w,cv.clientHeight/VIEW.h);
  const offsetX = (cv.clientWidth-VIEW.w*scale)/2, offsetY = (cv.clientHeight-VIEW.h*scale)/2;
  const x = (pointer.x-r.left-cv.clientLeft-offsetX)/scale+VIEW.x;
  const y = (pointer.y-r.top-cv.clientTop-offsetY)/scale+VIEW.y;
  const a = hoveredAgent(x,y);
  cv.style.cursor = a ? 'help' : 'default';
  tooltip.hidden = !a;
  if (!a) return;
  document.getElementById('agent-tooltip-name').textContent = `${a.kind === 'codex' ? 'Codex' : 'Claude'} · ${a.project}`;
  document.getElementById('agent-tooltip-state').textContent = a.resident && !a.sessionSid ? 'สมาชิกประจำ · ยังไม่เชื่อม session' : `สถานะ: ${labels[a.state] || 'ทำงาน'} (จากกิจกรรมล่าสุด)`;
  document.getElementById('agent-tooltip-task').textContent = a.sleeping ? `นอนพัก · ${[4,8].includes(a.x) ? 'เตียงชั้นบน' : 'เตียงชั้นล่าง'} (ภาพเคลื่อนไหวเท่านั้น)` : a.sleepSpot ? 'กำลังเดินไปพักงีบ' : a.text || (a.state === 'idle' ? 'เดินเล่น / พักใน Lounge' : 'กำลังทำงาน');
  tooltip.style.left = `${Math.max(8,Math.min(pointer.x+14,window.innerWidth-tooltip.offsetWidth-8))}px`;
  tooltip.style.top = `${Math.max(8,Math.min(pointer.y+14,window.innerHeight-tooltip.offsetHeight-8))}px`;
}

function drawScene(t) {
  updateLighting();
  positionHotspots();
  updateRoomControls();
  drawRoom(t);
  if(HOME && selectedRoom!=='work' && !hqReady())return;
  const visibleAgents=[...agents.values()].filter(a=>!HOME || (a.room||'work')===selectedRoom);
  const items = hqReady() ? [] : objects.map(o => ({ k: o.depth, draw: () => drawObject(o, t) }));
  for (const a of visibleAgents) items.push({ k: a.x + a.y + .6, draw: () => drawAgent(a, t) });
  if(hqReady()) {
    // shortcut: opaque foreground avatars until furniture has accurate exported alpha layers.
    ctx.save();ctx.globalAlpha=1;
    visibleAgents.sort((a,b)=>hqPoint(a.x+.5,a.y+.5)[1]-hqPoint(b.x+.5,b.y+.5)[1]).forEach(a=>drawAgent(a,t));
    ctx.restore();
  } else items.sort((p, q) => p.k - q.k).forEach(i => i.draw());
  drawAmbientLight();
  for (const a of visibleAgents) if (a.sx) drawTags(a, t);
}

function drawAmbientLight() {
  if(hqReady())return;
  const darkness = 1-lighting.daylight;
  if (!darkness) return;
  rect(0,0,W,H,`rgba(12,24,65,${darkness*(HOME?.12:.28)})`);
  // Warm pools of indoor light preserve visibility while the windows turn dark.
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  (HOME ? [[4,4],[11,4],[5,11],[12,11]] : [[5,4],[18,4],[6,16],[25,16]]).forEach(([gx,gy]) => {
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
    updateAgentRoom(a);
    const spots=zones[a.state]||zones.idle, idx=counts.get(spots)||0;counts.set(spots,idx+1);
    const target=chooseTarget(a,spots[idx%spots.length],t), targetKey=key(...target);
    // Finish the current tile before replanning, so a new event cannot cut a corner through a wall.
    if(a.target!==targetKey&&(!a.path.length||(a.x===a.path[0][0]&&a.y===a.path[0][1]))){a.path=route([Math.round(a.x),Math.round(a.y)],target,a.room);a.target=targetKey;}
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
  if(!agents.size){ctx.font='bold 12px "Pixelify Sans", "Noto Sans Thai", sans-serif';const m='รอ Claude / Codex เข้างาน หรือกด DEMO',w=ctx.measureText(m).width+20;
    const [mx,my]=iso(16,11);rect(mx-w/2,my-12,w,22,'rgba(15,42,82,.88)');ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(m,mx,my+3);ctx.textAlign='start';}
  requestAnimationFrame(frame);
}
addResidents();
requestAnimationFrame(frame);
const status=document.getElementById('status'),es=new EventSource('/events');
es.onopen=()=>{status.dataset.connection='online';status.textContent='เชื่อมต่อแล้ว: Claude + Codex';};
es.onerror=()=>{status.dataset.connection='offline';status.textContent='เชื่อมต่อไม่ได้ กรุณารัน node server.js';};
es.onmessage=e=>{try{apply(JSON.parse(e.data));}catch{status.textContent='ได้รับ event ที่อ่านไม่ได้';}};
let demoTimers=[];
function enhanceSelect(select, label) {
  if (!select.options) return;
  const dropdown=document.createElement('details');dropdown.className='theme-select';
  const trigger=document.createElement('summary');trigger.setAttribute('aria-label',label);
  const menu=document.createElement('div');menu.className='theme-select-options';
  const buttons=[...select.options].map(option=>{
    const button=document.createElement('button');button.type='button';button.textContent=option.textContent;
    button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));select.refreshAppearance();dropdown.open=false;trigger.focus();};
    menu.append(button);return button;
  });
  select.refreshAppearance=()=>{
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
enhanceSelect(backgroundSelect,'บรรยากาศพื้นหลัง');
document.getElementById('demo').onclick=()=>{
  demoTimers.forEach(clearTimeout);demoTimers=[];
  const states=['idle','write','think','bash'];
  states.forEach((state,i)=>{
    apply({sid:'demo-'+i,kind:i%2?'codex':'claude',project:['Reception','Frontend','Planning','Backend'][i],state,text:labels[state]});
    for(let n=1;n<5;n++)demoTimers.push(setTimeout(()=>apply({sid:'demo-'+i,kind:i%2?'codex':'claude',project:['Reception','Frontend','Planning','Backend'][i],state:states[(i+n)%4],text:'Demo activity'}),n*16000));
  });
};
