'use strict';
// Dhiteta AI open-plan office, isometric (2.5D) pixel view.
// Logic runs on a plain grid (route / zones / blocked); only drawing is projected to isometric.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const COLS = 32, ROWS = 22, TW = 24, TH = 12, WALL = 72, SCALE = 2;
const OX = 274, OY = WALL + 100;
const W = 668, H = OY + 436;
const thaiClock = new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Bangkok', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
function lightingAt(date) {
  const parts = Object.fromEntries(thaiClock.formatToParts(date).map(p => [p.type,p.value]));
  const hour = Number(parts.hour), minute = Number(parts.minute), h = hour + minute/60;
  const daylight = h < 5 || h >= 19 ? 0 : h < 7 ? (h-5)/2 : h < 17 ? 1 : (19-h)/2;
  return { hour, minute, daylight, label:h >= 5 && h < 7 ? 'ยามเช้า' : h >= 7 && h < 17 ? 'กลางวัน' : h >= 17 && h < 19 ? 'ยามเย็น' : 'กลางคืน', time:`${parts.hour}:${parts.minute}` };
}
let lighting = lightingAt(new Date()), lightingMinute = '';
function updateLighting() {
  const now = new Date(), minute = Math.floor(now.getTime()/60000);
  if (minute === lightingMinute) return;
  lightingMinute = minute; lighting = lightingAt(now);
  document.getElementById('thai-time').textContent = `${lighting.time} น. · ${lighting.label} · เวลาไทย`;
  const mix = (night, day) => '#' + [1,3,5].map(i => Math.round(parseInt(night.slice(i,i+2),16)*(1-lighting.daylight)+parseInt(day.slice(i,i+2),16)*lighting.daylight).toString(16).padStart(2,'0')).join('');
  C.sky = mix('#1c315c','#9fd0f5'); C.sky2 = mix('#344b80','#c4e3fa');
}
// Visible crop of the world: zooms the view onto the office floor.
const VIEW = { x: 60, y: 110, w: 550, h: 370 };
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
  { x: 1, y: 1, w: 10, h: 7, floor: 'wood', title: 'LOUNGE' },
  { x: 13, y: 1, w: 18, h: 8, floor: 'tile', title: 'WORKSPACE' },
  { x: 1, y: 12, w: 10, h: 9, floor: 'carpet', title: 'MEETING' },
  { x: 20, y: 13, w: 11, h: 8, floor: 'dark', title: 'SERVER' },
];

// lounge
object(2, 1, 4, 1, 'sofa'); object(3, 3, 2, 1, 'coffeeTable'); object(7, 3, 1, 1, 'armchair'); object(8, 1, 3, 1, 'coffeeBar');
const barSeats = [[8,2],[9,2],[10,2]];
barSeats.forEach(([x,y]) => deco(x, y, 'barStool'));
object(1, 1, 1, 1, 'plant'); object(1, 7, 1, 1, 'plant');
// soft dividers: planters + glass partitions
object(11, 1, 1, 3, 'planter'); object(11, 5, 1, 3, 'planter');
object(2, 12, 3, 1, 'planter'); object(7, 12, 3, 1, 'planter');
object(19, 13, 1, 3, 'glass'); object(19, 17, 1, 4, 'glass');
object(20, 12, 4, 1, 'glass'); object(27, 12, 4, 1, 'glass');
// workspace
for (const y of [2, 6]) for (const x of [14, 17, 20, 23]) { object(x, y, 2, 1, 'desk'); deco(x, y + 1, 'chair'); deco(x + 1, y + 1, 'chair'); }
object(30, 1, 1, 1, 'plant'); object(26, 7, 1, 1, 'plant');
// meeting
object(4, 15, 4, 2, 'table');
[[3, 15], [3, 16], [8, 15], [8, 16], [5, 14], [6, 14], [5, 17], [6, 17]].forEach(([x, y]) => deco(x, y, 'chair'));
object(1, 20, 1, 1, 'plant'); object(10, 20, 1, 1, 'plant');
// server
for (const y of [15, 18]) for (const x of [22, 24, 26, 28]) object(x, y, 1, 1, 'rack');
object(30, 20, 1, 1, 'plant');
// entry
object(13, 20, 1, 1, 'plant'); object(18, 20, 1, 1, 'plant');

const zones = {
  read: [[14,3],[17,3],[20,3],[23,3]], write: [[14,7],[17,7],[20,7],[23,7]],
  web: [[27,3],[29,3]], bash: [[22,19],[24,19],[26,19],[28,19]],
  think: [[5,14],[6,17],[3,15],[8,16]], idle: [[2,3],[5,3],[3,5],[6,5]],
};
zones.talk = zones.think; zones.agent = zones.think;
const labels = { read:'อ่าน / ค้นหา', write:'แก้ไขไฟล์', web:'ค้นเว็บ', bash:'รันคำสั่ง', think:'กำลังคิด', talk:'กำลังตอบ', agent:'ประสานงาน', idle:'พักผ่อน' };
const icons = { read:'book', write:'edit', web:'globe', bash:'terminal', think:'message', talk:'message', agent:'users', idle:'coffee' };
const iconImages = Object.fromEntries([...new Set(Object.values(icons))].map(name => {
  const img = new Image(); img.src = `/assets/icons/${name}.svg`; return [name, img];
}));
const colors = { read:'#2586b6', write:'#7958d1', web:'#ca8a18', bash:'#21865b', think:'#bd5692', talk:'#bd5692', agent:'#148a98', idle:'#b87436' };

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
      if (n[0] > 0 && n[0] < 31 && n[1] > 0 && n[1] < 22 && !blocked.has(k) && !prev.has(k)) { prev.set(k,p); queue.push(n); }
    }
  }
  return [];
}
function apply(ev) {
  if (!ev || typeof ev.sid !== 'string') return;
  const kind = ev.kind || 'claude';
  let a = [...agents.values()].find(a => a.sessionSid === ev.sid && a.kind === kind);
  if (!a && !ev.sid.startsWith('demo-')) a = [...agents.values()].find(a => a.resident && a.kind === kind && !a.sessionSid);
  if (!a) { const id = `${kind}:${ev.sid}`; a = { sid:id, x:15, y:21, dir:3, path:[], hue:agents.size % 5 }; agents.set(id,a); }
  a.sessionSid = ev.sid;
  Object.assign(a, { kind:ev.kind || 'claude', project:String(ev.project || 'Agent'), state:ev.state, text:String(ev.text || ''), last:Date.now() });
  a.target = null;
  a.roamTarget = null;
  const li = document.createElement('li'), b = document.createElement('b');
  b.textContent = `${a.kind === 'codex' ? 'Codex' : 'Claude'} · ${a.project} `;
  li.append(new Date().toLocaleTimeString()+' ', b, `${labels[a.state] || 'ทำงาน'}: ${a.text}`);
  const log = document.getElementById('log'); log.prepend(li); while (log.children.length > 60) log.lastChild.remove();
}

function addResidents() {
  ['codex', 'claude'].forEach((kind, i) => {
    const sid = `resident:${kind}`;
    agents.set(sid, { sid, kind, resident:true, sessionSid:null, project:'ประจำ Office', state:'idle', text:'ยังไม่พบกิจกรรม', last:0,
      x:3+i*3, y:6, dir:2, path:[], target:null, nextRoam:0 });
  });
}

function expireAgents(now) {
  for (const [sid, a] of agents) if (now - a.last > 15*60e3) {
    if (!a.resident) { agents.delete(sid); continue; }
    if (a.sessionSid) {
      Object.assign(a, { sessionSid:null, project:'ประจำ Office', state:'idle', text:'ไม่พบกิจกรรมล่าสุด', target:null, roamTarget:null });
    }
  }
}

const roamSpots = [[2,3],[5,3],[3,5],[6,5],[8,6],[9,4],[3,6],[6,7], ...barSeats];
function chooseTarget(a, assigned, now) {
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
function floorColor(kind, x, y) {
  const odd = (x + y) % 2;
  return { wood: odd ? '#e8d4b0' : '#e2cca5', tile: odd ? '#f7f9fc' : '#edf2f9', carpet: odd ? '#3d70c2' : '#3567b8', dark: odd ? '#2f394e' : '#2a3346' }[kind]
    || (odd ? '#e9eef6' : '#e2e9f3');
}
function drawBangkok(t) {
  const day = lighting.daylight, twilight = lighting.label === 'ยามเย็น' || lighting.label === 'ยามเช้า';
  const mix = (a,b) => '#' + [1,3,5].map(i => Math.round(parseInt(a.slice(i,i+2),16)*(1-day)+parseInt(b.slice(i,i+2),16)*day).toString(16).padStart(2,'0')).join('');
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,mix('#101a38','#9bc9e6'));
  sky.addColorStop(.48,twilight ? '#e6ad9f' : mix('#394064','#e7edf2'));
  sky.addColorStop(1,mix('#18283f','#b8c8ce'));
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // Small pixel celestial bodies and clouds sit behind Bangkok's layered skyline.
  if(day<.35){
    for(let i=0;i<38;i++) rect((i*79+19)%W,8+(i*31)%82,1,1,'#d9e6ef');
    rect(577,23,14,14,'#fff0be');rect(582,20,9,3,'#fff0be');rect(582,22,12,11,mix('#101a38','#9bc9e6'));
  } else {
    rect(568,28,20,20,twilight?'#ffd398':'#fff1ce');
    [[60,29],[322,19],[475,54]].forEach(([x,y])=>{rect(x,y,43,5,'#ffffff55');rect(x+12,y-4,24,5,'#ffffff55');});
  }
  for(let i=0;i<25;i++) {
    const x=i*29-8,h=25+(i*37)%58;
    rect(x,150-h,25,h,mix('#263755','#abc0cf'));rect(x+3,146-h,19,4,mix('#334567','#bfd0db'));
  }
  // Original skyline silhouettes: stepped high-rise, rooftop tanks, antennas and shophouses.
  const towers=[[7,49,35],[53,76,31],[104,111,36],[158,67,34],[208,91,29],[269,57,40],[331,95,33],[388,62,37],[448,104,37],[509,77,33],[563,118,36],[619,70,39]];
  towers.forEach(([x,h,w],i)=>{
    const y=157-h;
    rect(x+4,y+5,w,h,mix('#16243e','#718fa6'));rect(x,y,w,h,mix('#23334f','#92a9bb'));
    rect(x,y,w,3,mix('#42526d','#b1c2ce'));
    if(i===2||i===10){rect(x+6,y-9,w-12,9,mix('#23334f','#92a9bb'));rect(x+w/2,y-17,2,8,'#72869b');}
    else {rect(x+5,y-7,9,7,mix('#34405a','#8299a6'));rect(x+6,y-9,7,2,'#596e85');}
    for(let row=0;row<Math.floor((h-8)/9);row++) for(let col=0;col<Math.floor((w-5)/7);col++){
      const lit=(row*11+col*7+i)%5<2;
      rect(x+4+col*7,y+7+row*9,3,5,day<.6&&lit?'#efca7e':mix('#142239','#c4dbe6'));
    }
    if(i===4){for(let n=0;n<4;n++)rect(x+w-8,y+12+n*10,8,8,mix('#394064','#d7e3e9'));}
  });
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
  ctx.font='600 9px "Pixelify Sans", "Noto Sans Thai", sans-serif';ctx.fillStyle=day<.6?'#e6d5b3':'#3c5972';ctx.textAlign='right';ctx.fillText('BANGKOK · กรุงเทพฯ',VIEW.x+VIEW.w-14,VIEW.y+17);ctx.textAlign='start';
}

function drawBuildingExterior() {
  const left = [iso(1,21),iso(31,21)], right = [iso(31,1),iso(31,21)];
  const depth = H - Math.min(...left.concat(right).map(p => p[1])) + 30;
  const face = (edge, top, bottom, color) => poly([up(edge[0],-top),up(edge[1],-top),up(edge[1],-bottom),up(edge[0],-bottom)],color);
  face(left,0,depth,'#71859f'); face(right,0,depth,'#4d6382');
  // Continue the facade beyond the canvas so the tower has no visible base.
  for(let floor=0;14+floor*62<depth;floor++) {
    const z=14+floor*62;
    face(left,z-5,z-2,'#9cacc2');face(right,z-5,z-2,'#7088a6');
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
  face([iso(1,21),iso(1.45,21)],0,depth,'#a2b1c5');
  face([iso(30.55,21),iso(31,21)],0,depth,'#98aac1');
  face([iso(31,20.55),iso(31,21)],0,depth,'#637d9d');
}

function drawRoom(t) {
  drawBangkok(t);
  drawBuildingExterior();
  // floor
  for (let y = 1; y < 21; y++) for (let x = 1; x < 31; x++) {
    const area = AREAS.find(a => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h);
    poly(quad(x, y, 1, 1), floorColor(area && area.floor, x, y));
  }
  poly(quad(15, 21, 2, 1), C.blue); poly(quad(15.2, 21.15, 1.6, .7), C.blue2);   // entry mat
  poly(quad(2, 2.6, 7, 3.6), '#9fb6dc'); poly(quad(2.2, 2.8, 6.6, 3.2), '#cfdcf1');   // lounge rug
  // floor edge (gives the slab thickness)
  poly([iso(1, 21), iso(31, 21), up(iso(31, 21), -6), up(iso(1, 21), -6)], '#b9c9e0');
  poly([iso(31, 1), iso(31, 21), up(iso(31, 21), -6), up(iso(31, 1), -6)], '#cbd8ea');
  AREAS.forEach(a => floorText(a.x + .4, a.y + a.h - .4, a.title));

  // walls
  wallQuad('l', 1, 21, 0, WALL, C.wallSide); wallQuad('r', 1, 31, 0, WALL, C.wall);
  wallQuad('l', 1, 21, 0, 5, C.blue); wallQuad('r', 1, 31, 0, 5, C.blue);
  wallQuad('l', 1, 21, WALL - 5, WALL, C.navy); wallQuad('r', 1, 31, WALL - 5, WALL, C.navy);
  poly([up(iso(1, 1), WALL), up(iso(31, 1), WALL), up(iso(31, .6), WALL), up(iso(1, .6), WALL)], '#1b3a6b');   // wall caps
  poly([up(iso(1, 1), WALL), up(iso(1, 21), WALL), up(iso(.6, 21), WALL), up(iso(.6, 1), WALL)], '#1b3a6b');
  // windows
  const win = (side, a, b) => {
    wallQuad(side, a, b, 22, 60, C.navy); wallQuad(side, a + .15, b - .15, 24, 58, C.sky); wallQuad(side, a + .15, b - .15, 44, 58, C.sky2);
    for (let m = a + 1; m < b; m++) wallQuad(side, m - .05, m + .05, 24, 58, C.navy);
  };
  win('r', 2, 5); win('r', 6, 9); win('r', 13, 15); win('l', 3, 6); win('l', 7, 10);
  // company logo
  wallQuad('r', 16, 25.8, 34, 60, C.navy); wallQuad('r', 16.3, 17.6, 38, 56, C.blue); wallQuad('r', 16.65, 17.25, 41, 53, C.white);
  wallText('r', 18, 42, 'DHITETA AI', 'bold 8px "Press Start 2P", monospace', '#fff');
  // big web screen
  wallQuad('r', 26.3, 30.7, 18, 52, C.navy);
  wallQuad('r', 26.6, 30.4, 21, 49, (t / 700 | 0) % 2 ? '#2f7be0' : '#3d8bea');
  wallQuad('r', 27.4, 29.2, 27, 43, '#9fd0f5'); wallQuad('r', 27.9, 28.7, 31, 39, '#5aa0f0');
  // meeting: TV + whiteboard on the left wall
  wallQuad('l', 13.6, 17.4, 20, 46, C.navy); wallQuad('l', 13.9, 17.1, 23, 43, (t / 900 | 0) % 2 ? '#3d8bea' : '#5aa0f0');
  wallText('l', 14.3, 30, 'Q4 PLAN', 'bold 7px "Press Start 2P", monospace', '#fff');
  wallQuad('l', 18, 20.6, 18, 46, '#c9d7ec'); wallQuad('l', 18.15, 20.45, 20, 44, '#fff');
  wallQuad('l', 18.5, 19.8, 36, 37, C.blue); wallQuad('l', 18.5, 20.2, 30, 31, C.orange); wallQuad('l', 18.5, 19.4, 24, 25, C.blue);
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
      const thin = w > d ? [x, y + .45, w, .1] : [x + .45, y, .1, d];
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
      box(x + .05, y + .05, .9, .9, 46, '#3a4256', '#1d2333', '#2a3144');
      for (let i = 0; i < 7; i++) {
        const v = 5 + i * 5.8;
        poly([faceL(x + .05, y + .05, .9, .9, .1, v), faceL(x + .05, y + .05, .9, .9, .9, v), faceL(x + .05, y + .05, .9, .9, .9, v + 3.5), faceL(x + .05, y + .05, .9, .9, .1, v + 3.5)], '#0b0f18');
        const on = Math.sin(t / 170 + i * 1.7 + x * 3 + y) > 0;
        const [lx, ly] = faceL(x + .05, y + .05, .9, .9, .2, v + 2);
        rect(lx, ly - 1, 2, 1, on ? '#4ade80' : '#14532d'); rect(lx + 3, ly + .5, 2, 1, on ? '#60a5fa' : '#1e3a8a');
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
  const [x, y] = iso(a.x + .5, a.y + .5);
  a.look = a.look || lookFor(a.sid, a.kind);
  const working = !a.path.length && ['read', 'write', 'web', 'bash'].includes(a.state);
  const atBar = !a.path.length && a.state === 'idle' && barSeats.some(([sx,sy]) => a.x === sx && a.y === sy);
  const sit = atBar || (!a.path.length && ['read', 'write'].includes(a.state));
  const frame = a.path.length ? 1 + (Math.floor(t / 140) % 2) : 0;
  const prop = a.path.length ? '' : a.state === 'idle' ? 'mug' : ['think', 'talk', 'agent'].includes(a.state) ? 'tablet' : '';
  const img = sprite(a.look, atBar ? 'front' : a.dir >= 2 ? 'front' : 'back', frame, prop, sit);
  ctx.fillStyle = 'rgba(15,42,82,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  const typing = working && sit && Math.floor(t / 180) % 2 ? 1 : 0;      // tiny bob while typing
  const bob = a.path.length ? (frame === 1 ? 1 : 0) : 0;
  ctx.save();
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
  if (icon.complete && icon.naturalWidth) ctx.drawImage(icon, bx - 6, by - 6, 12, 12);
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
  const x = (pointer.x-r.left-cv.clientLeft)/cv.clientWidth*VIEW.w+VIEW.x;
  const y = (pointer.y-r.top-cv.clientTop)/cv.clientHeight*VIEW.h+VIEW.y;
  const a = hoveredAgent(x,y);
  cv.style.cursor = a ? 'help' : 'default';
  tooltip.hidden = !a;
  if (!a) return;
  document.getElementById('agent-tooltip-name').textContent = `${a.kind === 'codex' ? 'Codex' : 'Claude'} · ${a.project}`;
  document.getElementById('agent-tooltip-state').textContent = a.resident && !a.sessionSid ? 'สมาชิกประจำ · ยังไม่เชื่อม session' : `สถานะ: ${labels[a.state] || 'ทำงาน'} (จากกิจกรรมล่าสุด)`;
  document.getElementById('agent-tooltip-task').textContent = a.text || (a.state === 'idle' ? 'เดินเล่น / พักใน Lounge' : 'กำลังทำงาน');
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
  for (const a of agents.values()) if (a.sx) drawTags(a, t);
}

function drawAmbientLight() {
  const darkness = 1-lighting.daylight;
  if (!darkness) return;
  rect(0,0,W,H,`rgba(12,24,65,${darkness*.28})`);
  // Warm pools of indoor light preserve visibility while the windows turn dark.
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  [[5,4],[18,4],[6,16],[25,16]].forEach(([gx,gy]) => {
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
document.getElementById('demo').onclick=()=>{
  demoTimers.forEach(clearTimeout);demoTimers=[];
  const states=['idle','write','think','bash'];
  states.forEach((state,i)=>{
    apply({sid:'demo-'+i,kind:i%2?'codex':'claude',project:['Reception','Frontend','Planning','Backend'][i],state,text:labels[state]});
    for(let n=1;n<5;n++)demoTimers.push(setTimeout(()=>apply({sid:'demo-'+i,kind:i%2?'codex':'claude',project:['Reception','Frontend','Planning','Backend'][i],state:states[(i+n)%4],text:'Demo activity'}),n*16000));
  });
};
