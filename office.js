'use strict';
// Dhiteta AI open-plan office, isometric (2.5D) pixel view.
// Logic runs on a plain grid (route / zones / blocked); only drawing is projected to isometric.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const COLS = 32, ROWS = 22, TW = 24, TH = 12, WALL = 72, SCALE = 2;
const OX = 274, OY = WALL + 16;
const W = 668, H = OY + 336;
cv.width = W * SCALE; cv.height = H * SCALE;
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
object(2, 1, 4, 1, 'sofa'); object(3, 3, 2, 1, 'coffeeTable'); object(7, 3, 1, 1, 'armchair'); object(9, 1, 2, 1, 'coffeeBar');
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
const icons = { read:'📖', write:'💻', web:'🌐', bash:'⚙️', think:'💭', talk:'💬', agent:'👥', idle:'☕' };
const colors = { read:'#47a8d8', write:'#2f6fd6', web:'#dda043', bash:'#44b68e', think:'#ce79b0', talk:'#ce79b0', agent:'#ce79b0', idle:'#7894a9' };

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
  let a = agents.get(ev.sid);
  if (!a) { a = { sid:ev.sid, x:15, y:21, dir:3, path:[], hue:agents.size % 5 }; agents.set(ev.sid,a); }
  Object.assign(a, { kind:ev.kind || 'claude', project:String(ev.project || 'Agent'), state:ev.state, text:String(ev.text || ''), last:Date.now() });
  a.target = null;
  const li = document.createElement('li'), b = document.createElement('b');
  b.textContent = `${a.kind === 'codex' ? 'Codex' : 'Claude'} · ${a.project} `;
  li.append(new Date().toLocaleTimeString()+' ', b, `${labels[a.state] || 'ทำงาน'}: ${a.text}`);
  const log = document.getElementById('log'); log.prepend(li); while (log.children.length > 60) log.lastChild.remove();
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
function drawRoom(t) {
  ctx.fillStyle = '#dce8f7'; ctx.fillRect(0, 0, W, H);
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
  const now = new Date(), am = now.getMinutes() / 60 * Math.PI * 2, ah = (now.getHours() % 12) / 12 * Math.PI * 2;
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
      box(x, y, w, d, 18, '#ffffff', '#dfe7f2', '#c9d7ec');
      box(x, y + d - .08, w, .08, 4, C.blue, C.blue, C.blue3, 0);
      box(x + .3, y + .15, .6, .5, 12, C.navy, '#1b3a6b', '#16315c', 18);
      const [lx, ly] = faceL(x + .3, y + .15, .6, .5, .5, 26);
      rect(lx - 1, ly, 2, 2, (t / 500 | 0) % 2 ? '#4ade80' : '#14532d');
      box(x + 1.3, y + .3, .25, .25, 4, '#fff', '#e9eef6', '#dfe7f2', 18);
      break;
    }
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
const fronts=['....HHHH....','...HHHHHH...','...HSSSSH...','...HSEESH...','....SSSS....','...BBTBBB...','..SBBTBBBS..','..SBBTBBBS..','...BBBBBB...','...PPPPPP...','...PP..PP...','...FF..FF...'];
const backs=['....HHHH....','...HHHHHH...','...HHHHHH...','...HHHHHH...','....HHHH....','...BBBBBB...','..SBBBBBBS..','..SBBBBBBS..','...BBBBBB...','...PPPPPP...','...PP..PP...','...FF..FF...'];
const P = 2;
function drawAgent(a, t) {
  const [x, y] = iso(a.x + .5, a.y + .5);
  ctx.fillStyle = 'rgba(15,42,82,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  const codex = a.kind === 'codex';
  const pal = { H: codex ? '#1d1d24' : ['#47322d','#273349','#805b39','#a36a45','#64436c'][a.hue], S:'#eabf9a', E:'#25364b',
    B: codex ? '#2b2f3a' : C.blue2, T: codex ? '#e9eef6' : C.orange, P:'#1b2440', F:'#0f1424' };
  const rows = a.dir >= 2 ? fronts : backs;          // 2: toward viewer, 3/0/1 handled in frame()
  const flip = a.flip;
  const beat = a.path.length ? (Math.floor(t / 140) % 2) * P : 0;
  rows.forEach((r, j) => [...r].forEach((c, i) => {
    if (pal[c]) rect(x + (flip ? 11 - i : i) * P - 6 * P, y - 12 * P - 1 + j * P + (j > 9 && i < 6 ? beat : 0), P, P, pal[c]);
  }));
  a.sx = x; a.sy = y;
}
function drawTags(a, t) {
  const { sx: x, sy: y } = a;
  const name = `${a.kind === 'codex' ? 'Codex' : 'Claude'} · ${a.project.slice(0, 16)}`;
  ctx.font = '600 9px system-ui'; const w = ctx.measureText(name).width + 10;
  rect(x - w / 2, y + 4, w, 13, a.kind === 'codex' ? 'rgba(43,47,58,.92)' : 'rgba(31,95,191,.92)');
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(name, x, y + 13.5);
  const bx = x + 11, by = y - 12 * P - 9 + Math.sin(t / 300) * 1.2;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = colors[a.state] || '#7894a9'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = '9px system-ui'; ctx.fillText(icons[a.state] || '•', bx, by + 3); ctx.textAlign = 'start';
}

function drawScene(t) {
  drawRoom(t);
  const items = objects.map(o => ({ k: o.depth, draw: () => drawObject(o, t) }));
  for (const a of agents.values()) items.push({ k: a.x + a.y + .6, draw: () => drawAgent(a, t) });
  items.sort((p, q) => p.k - q.k).forEach(i => i.draw());
  for (const a of agents.values()) if (a.sx) drawTags(a, t);
}

let lastFrame=0;
function frame(t) {
  const dt=Math.min((t-lastFrame)/1000,.05);lastFrame=t;
  ctx.setTransform(SCALE,0,0,SCALE,0,0);ctx.imageSmoothingEnabled=false;
  const counts=new Map();
  for(const [sid,a] of agents){
    if(Date.now()-a.last>15*60e3){agents.delete(sid);continue;}
    const spots=zones[a.state]||zones.idle, idx=counts.get(spots)||0;counts.set(spots,idx+1);
    const target=spots[idx%spots.length], targetKey=key(...target);
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
  if(!agents.size){ctx.font='bold 12px system-ui';const m='รอ Claude / Codex เข้างาน หรือกด DEMO',w=ctx.measureText(m).width+20;
    const [mx,my]=iso(16,11);rect(mx-w/2,my-12,w,22,'rgba(15,42,82,.88)');ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(m,mx,my+3);ctx.textAlign='start';}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
const status=document.getElementById('status'),es=new EventSource('/events');
es.onopen=()=>status.textContent='🟢 เชื่อมต่อแล้ว: Claude + Codex';
es.onerror=()=>status.textContent='🔴 เชื่อมต่อไม่ได้ กรุณารัน node server.js';
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
