const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const noop = () => {};
const elements = new Map();
const drawing = new Proxy({}, { get(target,key) { return key in target ? target[key] : key==='createLinearGradient' ? () => ({addColorStop:noop}) : noop; } });
const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, { getContext: () => drawing, showModal:noop, close:noop, prepend: noop, append: noop, replaceChildren: noop, children: [] }); return elements.get(id); }, createElement: () => ({ append:noop }) };
const settingsStore = new Map();
const localStorage = { getItem:key=>settingsStore.get(key), setItem:(key,value)=>settingsStore.set(key,value) };
const context = vm.createContext({ document, localStorage, Image:class {}, EventSource:class {}, requestAnimationFrame:noop, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync('office.js','utf8'),context);
vm.runInContext(`
  const counts={home:2,medium:6,large:8};
  for(const layout of Object.keys(OFFICE_LAYOUTS)) {
    setLayout(layout);
    if(objects.filter(o=>o.kind==='desk').length!==counts[layout])throw new Error('Wrong desk count: '+layout);
    const screens=objects.filter(o=>o.divider);
    if(screens.some(o=>o.kind!=='glass'||!o.edge))throw new Error('Room dividers must use matching glass panels');
    if(screens.length!==({home:7,medium:10,large:0})[layout])throw new Error('Wrong partition count: '+layout);
    for(const o of screens)for(let x=o.x;x<o.x+o.w;x++)for(let y=o.y;y<o.y+o.d;y++) {
      if(!blocked.has(key(x,y)))throw new Error('Partition must block walking');
      if(objects.some(other=>other!==o && other.kind!=='glass' && x>=other.x && x<other.x+other.w && y>=other.y && y<other.y+other.d))throw new Error('Partition overlaps furniture');
    }
    if(layout==='home') {
      const work=AREAS.find(a=>a.title==='WORK'),rack=objects.find(o=>o.kind==='rack');
      if(rack.x<work.x||rack.x>=work.x+work.w||rack.y<work.y||rack.y>=work.y+work.h)throw new Error('Home server must be inside work zone');
      if(rack.x!==11||rack.y!==6||zones.bash[0][0]!==12||zones.bash[0][1]!==6)throw new Error('Home server must sit beside entrance with reachable service point');
      for(const x of [7,10])if(!screens.some(o=>o.y===8&&o.joinAt&&(o.joinAt==='end'?o.x+o.w-1:o.x)===x))throw new Error('Glass intersections must have a connected corner frame');
      const endPanel=screens.find(o=>o.joinAt==='end'),originalBox=box,glassBoxes=[];
      try {
        box=(...args)=>glassBoxes.push(args);drawObject(endPanel,1000);
      } finally {box=originalBox;}
      const corner=glassBoxes[glassBoxes.length-1];
      for(const panel of glassBoxes.slice(0,3))if(Math.abs(panel[0]+panel[2]-(corner[0]+corner[2]))>1e-9)throw new Error('Glass and rails must end flush with corner post');
      const meeting=AREAS.find(a=>a.title==='MEETING'),lounge=AREAS.find(a=>a.title==='LOUNGE');
      const table=objects.find(o=>o.kind==='table'),sofa=objects.find(o=>o.kind==='sofa');
      for(const [o,area] of [[table,meeting],[sofa,lounge]])if(o.x<area.x||o.y<area.y||o.x+o.w>area.x+area.w||o.y+o.d>area.y+area.h)throw new Error('Home furniture must follow swapped room zones');
      if(table.x+table.y>=sofa.x+sofa.y)throw new Error('Home meeting must be behind lounge');
      const quiet=AREAS.find(a=>a.title==='QUIET');
      if(!quiet||objects.some(o=>o.kind==='daybed')||napSpots.length)throw new Error('Home quiet corner must replace bedroom');
      for(const kind of ['readingDesk','bookcase'])if(!objects.some(o=>o.kind===kind&&o.x>=quiet.x&&o.x+o.w<=quiet.x+quiet.w&&o.y>=quiet.y&&o.y+o.d<=quiet.y+quiet.h))throw new Error('Quiet corner furniture missing');
      for(const [points,area] of [[zones.think,meeting],[zones.read,quiet]])for(const [x,y] of points)if(x<area.x||x>=area.x+area.w||y<area.y||y>=area.y+area.h)throw new Error('Home agent destinations must follow room zones');
      for(let y=1;y<ROWS;y++)for(const x of [8,9])if(blocked.has(key(x,y)))throw new Error('Home central hall must stay clear');
      for(const x of [1,2,3,4,5,6,7,10,11,12,13,14,15,16])if(!blocked.has(key(x,8)))throw new Error('Home cross-wall must connect to room sides');
      for(const x of [7,10])for(const y of (x===7?[1,2,3,6,7,8,9,10,13,14]:[1,2,3,6,7,8]))if(!blocked.has(key(x,y)))throw new Error('Home room edges must connect except at doors');
      for(let y=9;y<15;y++)if(blocked.has(key(10,y)))throw new Error('Home lounge must be open to hall');
      for(const kind of ['kitchenCounter','coffeeBar']) {
        const counter=objects.find(o=>o.kind===kind);
        if(!counter||counter.x<lounge.x||counter.y<lounge.y||counter.x+counter.w>lounge.x+lounge.w||counter.y+counter.d>lounge.y+lounge.h)throw new Error('Home lounge must include kitchen and coffee counters');
        if(objects.some(o=>o!==counter&&o.x<counter.x+counter.w&&o.x+o.w>counter.x&&o.y<counter.y+counter.d&&o.y+o.d>counter.y))throw new Error('Counter overlaps furniture');
      }
      if(barSeats.length!==2)throw new Error('Home coffee bar must have two reachable seats');
    }
    if(layout==='medium') {
      const wallPolys=[],wallLabels=[],savedPoly=poly,savedText=wallText;
      try {
        poly=(pts,color)=>wallPolys.push({pts,color});wallText=(...args)=>wallLabels.push(args);
        drawCompactRoom(1000);
      } finally {poly=savedPoly;wallText=savedText;}
      for(const label of ['MEETING','ROADMAP','WORK','LOG','IDLE'])if(!wallLabels.some(args=>args[3]===label))throw new Error('Missing medium wall display: '+label);
      const tvLabel=wallLabels.find(args=>args[3]==='MEETING');
      if(tvLabel[1]!==3.5||tvLabel[6]!=='center'||tvLabel[4]!=='bold 4px monospace')throw new Error('Meeting label must fit centered inside TV');
      if(objects.some(o=>o.kind==='serverStatus'))throw new Error('Medium command status must be wall-mounted, not block desks');
      for(const start of [11,17]) {
        const expected=[wallPt('r',start+.15,24),wallPt('r',start+3-.15,24),wallPt('r',start+3-.15,57),wallPt('r',start+.15,57)];
        if(!wallPolys.some(p=>p.color===C.sky&&JSON.stringify(p.pts)===JSON.stringify(expected)))throw new Error('Workspace window missing');
      }
      if(wallPolys.some(p=>p.color===C.sky&&p.pts.some(pt=>pt[0]>wallPt('r',22,0)[0])&&p.pts.every(pt=>pt[1]<OY+(pt[0]-OX)*.5+12)))throw new Error('Server wall must not contain windows');
      const desks=objects.filter(o=>o.kind==='desk'),work=AREAS.find(a=>a.title==='WORKSPACE');
      for(const o of desks)if(o.x<work.x||o.y<work.y||o.x+o.w>work.x+work.w||o.y+o.d>work.y+work.h)throw new Error('Medium desks must share one workspace');
      if(Math.max(...desks.map(o=>o.x))-Math.min(...desks.map(o=>o.x))>6||Math.max(...desks.map(o=>o.y))-Math.min(...desks.map(o=>o.y))>3)throw new Error('Medium desks must stay clustered');
      const seats=[...zones.read.filter(([x])=>x>=work.x),...zones.write];
      for(const a of seats)for(const b of seats)if(key(...a)!==key(...b)&&route(a,b).length>14)throw new Error('Medium colleagues must have short walking routes');
      if(objects.some(o=>o.kind==='glass'&&o.x>=work.x&&o.x<work.x+work.w&&o.y>=work.y&&o.y<work.y+work.h))throw new Error('Medium workspace must stay open');
      const lounge=AREAS.find(a=>a.title==='LOUNGE'),quiet=AREAS.find(a=>a.title==='QUIET');
      if(!lounge||lounge.x>COLS/2||lounge.x+lounge.w<COLS/2||lounge.y>ROWS/2||lounge.y+lounge.h<ROWS/2)throw new Error('Medium lounge must occupy center');
      if(objects.filter(o=>o.kind==='readingDesk'&&o.x>=quiet.x&&o.x<quiet.x+quiet.w).length!==2)throw new Error('Medium quiet room must include individual desks');
      for(const y of [1,2,3,4,7,8,9])if(!blocked.has(key(21,y)))throw new Error('Server glass enclosure missing');
      for(let x=21;x<25;x++)if(!blocked.has(key(x,9)))throw new Error('Server front must be enclosed');
      if(objects.filter(o=>o.kind==='daybed').length!==2||napSpots.length!==4)throw new Error('Medium bedroom must include two bunk beds');
      if(!objects.some(o=>o.kind==='bedside')||objects.some(o=>o.kind==='glass'&&o.x===8&&o.y===15))throw new Error('Bedroom needs bedside lamp without overlapping glass');
      for(const [x,y] of napSpots)if(!objects.some(o=>o.kind==='daybed'&&o.x===x&&o.y===y)&&!upperBedAt({x,y}))throw new Error('Nap spots must follow moved bunks');
      if(!upperBedAt({x:2,y:17})?.rotated||upperBedAt({x:2,y:16})||!upperBedAt({x:6,y:17}))throw new Error('L-shaped bunks need correct upper/lower positions');
      for(const y of [15,18])if(!blocked.has(key(8,y)))throw new Error('Bedroom must be enclosed beside doorway');
      for(const x of [9,10,11,12,13,16,17,18,19,20,21])if(!blocked.has(key(x,8)))throw new Error('Workspace and lounge must have glass divider');
      for(const y of [6,7,8])if(!blocked.has(key(9,y)))throw new Error('Meeting glass must connect to workspace front');
      for(const [x,y,crossY] of [[9,6,8],[21,7,9]]) {
        const panel=objects.find(o=>o.kind==='glass'&&o.x===x&&o.y===y),savedBox=box,calls=[];
        try {box=(...args)=>calls.push(args);drawObject(panel,1000);} finally {box=savedBox;}
        for(const args of calls)if(Math.abs(args[1]+args[3]-(crossY+.16))>1e-9)throw new Error('Glass tail must stop at cross-wall frame');
      }
      for(const y of [4,5]) {
        const direct=route([8,y],[10,y]);
        if(direct.length!==2||!direct.some(p=>p[0]===9&&p[1]===y))throw new Error('Meeting needs direct two-tile door to workspace');
      }
      for(const x of [4,5])if(route([x,6],[x,8]).length!==2)throw new Error('Meeting must retain second entrance from hall');
      const coffee=objects.find(o=>o.kind==='coffeeBar'),kitchen=objects.find(o=>o.kind==='kitchenCounter');
      if(kitchen.x!==coffee.x+coffee.w||kitchen.y!==coffee.y)throw new Error('Coffee and kitchen must form one connected counter');
      if(kitchen.y!==10||!objects.some(o=>o.kind==='fridge'&&o.y===10))throw new Error('Kitchen must align against server wall');
      const labelsDrawn=[],oldFill=ctx.fillText,oldFloor=floorText;
      let floorLabels=0;
      try {
        floorText=()=>floorLabels++;drawCompactRoom(1000);
        ctx.fillText=(text)=>labelsDrawn.push(text);drawZoneLabels();
      } finally {ctx.fillText=oldFill;floorText=oldFloor;}
      const signedAreas=AREAS.filter(area=>zoneSigns[area.title]);
      if(floorLabels||labelsDrawn.length)throw new Error('Room plaques must not show permanent names');
      if(signedAreas.length!==5||signedAreas.some(area=>zoneSignWidth(area)!==16||!/^[A-Z ]+$/.test(zoneSigns[area.title].label)))throw new Error('Plaques need equal compact widths and English hover names');
      if(zoneSigns.SERVER.x!==21||zoneSigns.SERVER.y!==7.5)throw new Error('Server plaque must stay beside entry, away from racks');
      if(zoneSigns.LOUNGE||zoneSigns.KITCHEN)throw new Error('Lounge and kitchen must not have signs or hover targets');
      for(const area of signedAreas)if(hoveredZone(...zonePoint(area))!==area||!zoneNames[area.title]||!zoneSigns[area.title].description)throw new Error('Every sign must reveal room name and purpose');
      for(const area of signedAreas) {
        const sign=zoneSigns[area.title];
        if(JSON.stringify(zonePoint(area))!==JSON.stringify(up(iso(sign.x,sign.y),sign.h)))throw new Error('Sign hit area must match mounted position');
        const [px,py]=zonePoint(area),dx=zoneSignWidth(area)/2-2;
        if(hoveredZone(px+dx,py+zoneSignSlope(area)*dx)!==area)throw new Error('Hover must follow angled wall plaque');
      }
      if(hoveredZone(-100,-100))throw new Error('Zone name must hide outside dot');
      const shelf=objects.find(o=>o.kind==='bookcase');
      if(shelf.x!==1||shelf.d!==3)throw new Error('Quiet bookshelf must face inward from side wall');
      for(const kind of ['fridge','kitchenCounter','coffeeBar','diningTable','tvConsole','speaker']) {
        const item=objects.find(o=>o.kind===kind);
        if(!item)throw new Error('Missing medium amenity: '+kind);
        if(objects.some(o=>o!==item&&o.x<item.x+item.w&&o.x+o.w>item.x&&o.y<item.y+item.d&&o.y+o.d>item.y))throw new Error('Amenity overlaps furniture: '+kind);
      }
      if(!objects.find(o=>o.kind==='kitchenCounter').microwave)throw new Error('Kitchen microwave missing');
      if(objects.filter(o=>o.kind==='speaker').length!==2)throw new Error('Lounge needs two speakers');
    }
    const doors=layout==='home'?[[7,4],[7,5],[10,4],[10,5],[7,11],[7,12],[10,11],[10,12]]:layout==='medium'?[[4,7],[5,7],[9,4],[9,5],[8,16],[8,17],[14,8],[15,8],[8,12],[8,13],[21,5],[21,6]]:[];
    if(doors.some(p=>blocked.has(key(...p))))throw new Error('Partition doorway must stay open');
    for(const o of objects)if(o.x<1||o.y<1||o.x+o.w>COLS-1||o.y+o.d>ROWS-1)throw new Error('Furniture outside floor: '+layout);
    for(const target of [...Object.values(zones).flat(),...roamSpots,...napSpots]) {
      const path=route(ENTRY,target);
      if(!path.length || blocked.has(key(...target)))throw new Error('Unreachable layout target: '+layout+' '+target);
      if(path.some(p=>blocked.has(key(...p)) || p[0]<=0 || p[0]>=COLS-1 || p[1]<=0 || p[1]>=ROWS))throw new Error('Invalid layout path');
    }
    for(const theme of Object.keys(BUILDINGS)){
      setBuilding(theme);drawRoom(1000);for(const o of objects)drawObject(o,1000);
      const exterior=[],originalPoly=poly;
      try {poly=(pts,color)=>exterior.push({pts,color});drawBuildingExterior();} finally {poly=originalPoly;}
      if(!exterior.some(p=>p.color===BUILDINGS[theme].facade[0])||!exterior.some(p=>p.color===BUILDINGS[theme].trim))throw new Error('Exterior must follow selected theme');
      for(const {pts} of exterior)for(const [x,y] of pts)if(x<VIEW.x||x>VIEW.x+VIEW.w||y<VIEW.y)throw new Error('Building sides outside view: '+layout+' '+theme);
      const minEdgeY=Math.min(iso(1,ROWS-1)[1],iso(COLS-1,1)[1]);
      const depth=EXTERIOR_HEIGHT;
      const highestBase=minEdgeY+depth;
      for(const face of exterior.slice(0,2))if(Math.abs(face.pts[2][1]-face.pts[1][1]-depth)>1e-9)throw new Error('All building faces must have equal height');
      if(iso(1,ROWS-1)[0]!==VIEW.x||iso(COLS-1,1)[0]!==VIEW.x+VIEW.w)throw new Error('Building must meet both horizontal viewport edges');
      // Ground/base must be below the crop across both faces, not only at the front corner.
      if(highestBase<=VIEW.y+VIEW.h)throw new Error('Building base must remain hidden below viewport');
    }
  }
  setLayout('large');setBuilding('modern');
  openSettings();document.getElementById('layout-home').onchange();cancelSettings();
  if(officeLayout!=='large'||!document.getElementById('layout-large').checked)throw new Error('Cancel must restore layout');
  openSettings();setLayout('medium');document.getElementById('save-settings').onclick();
  if(localStorage.getItem('office-layout')!=='medium')throw new Error('Layout choice must persist');
  openSettings();setLayout('home');settingsDialog.oncancel({preventDefault(){}});
  if(officeLayout!=='medium')throw new Error('Escape must restore layout');
  const beforeInvalid=objects.length;setLayout('unknown');if(objects.length!==beforeInvalid||officeLayout!=='medium')throw new Error('Invalid layout must be ignored');
  const originalResident=agents.get('resident:codex');originalResident.sessionSid='layout-session';originalResident.state='read';
  const entriesBefore=activityEntries.length;setLayout('home');
  if(originalResident.sessionSid!=='layout-session'||originalResident.state!=='read'||originalResident.x!==ENTRY[0]||originalResident.path.length||activityEntries.length!==entriesBefore)throw new Error('Layout changes must preserve sessions and activities while resetting paths');
  originalResident.sessionSid=null;originalResident.state='idle';setLayout('large');
  for(const theme of ['rain','sunset','neon']) {
    backgroundSelect.value=theme;backgroundSelect.onchange();
    if(backgroundTheme!==theme) throw new Error('Background theme selection failed');
  }
  backgroundSelect.value='unknown';backgroundSelect.onchange();
  if(backgroundTheme!=='neon') throw new Error('Invalid theme must be ignored');
  setBuilding('modern');openSettings();setBuilding('cyber');backgroundSelect.value='sunset';backgroundSelect.onchange();cancelSettings();
  if(buildingTheme!=='modern'||backgroundTheme!=='neon') throw new Error('Cancel must restore both settings');
  openSettings();setBuilding('garden');document.getElementById('save-settings').onclick();
  if(localStorage.getItem('office-building')!=='garden') throw new Error('Save must persist building');
  openSettings();setBuilding('loft');settingsDialog.oncancel({preventDefault(){}});
  if(buildingTheme!=='garden') throw new Error('Escape must discard preview');
  for(const name of Object.keys(BUILDINGS)) {
    setBuilding(name);
    if(floorColor(undefined,1,1)!==BUILDINGS[name].walkway[1]) throw new Error('Walkway must use selected building palette');
    if(floorColor(undefined,1,2)!==BUILDINGS[name].walkway[0]) throw new Error('Walkway checkerboard must preserve both colors');
    for(const bg of Object.keys(BACKGROUNDS)) {
      backgroundTheme=bg;drawRoom(1000);
    }
  }
  setBuilding('modern');
  openSettings();
  for(const [style,expected] of Object.entries(MATCHING_BACKGROUNDS)) {
    document.getElementById('building-'+style).onchange();
    if(buildingTheme!==style || backgroundTheme!==expected || backgroundSelect.value!==expected) throw new Error('Building must select its matching background');
  }
  cancelSettings();
  activityEntries.push({time:300,sequence:0},{time:100,sequence:1},{time:200,sequence:2});
  if(sortedActivities('newest').map(e=>e.time).join(',')!=='300,200,100') throw new Error('Newest-first order failed');
  if(sortedActivities('oldest').map(e=>e.time).join(',')!=='100,200,300') throw new Error('Oldest-first order failed');
  activityEntries.length=0;
  if(activitySummary('think','# Context from my IDE setup:').includes('IDE')) throw new Error('IDE metadata leaked into activity summary');
  if(activitySummary('write','text(await tools.exec_command({cmd: "rg file"}))').includes('tools.')) throw new Error('Tool code must be collapsed into details');
  if(activitySummary('talk','ปรับบอร์ดแล้วครับ')!=='ปรับบอร์ดแล้วครับ') throw new Error('Readable assistant text should remain visible');
  const night = lightingAt(new Date(2026,9,21,0,5));
  if(night.hour!==0 || night.daylight!==0 || night.time!=='00:05') throw new Error('Local midnight conversion failed');
  if(lightingAt(new Date(2026,9,21,12,0)).daylight!==1) throw new Error('Local noon must be daylight');
  const dusk = lightingAt(new Date(2026,9,21,18,0));
  if(dusk.daylight!==.5 || dusk.label!=='ยามเย็น') throw new Error('Dusk transition failed');
  for (const spots of Object.values(zones)) for (const target of spots) {
    const path = route([15,21],target);
    if (!path.length) throw new Error('Unreachable zone: '+target);
    let prev=[15,21];
    for(const p of path) {
      if(blocked.has(key(...p))) throw new Error('Path enters blocked tile');
      if(Math.abs(p[0]-prev[0])+Math.abs(p[1]-prev[1])!==1) throw new Error('Path jumps tile');
      prev=p;
    }
    if(key(...prev)!==key(...target)) throw new Error('Wrong destination');
  }
  apply({sid:'test',state:'write',project:'<img src=x>',text:'hello'});
  if(agents.size!==2) throw new Error('First live session should reuse a resident');
  const resident = agents.get('resident:claude');
  if(resident.sessionSid!=='test' || resident.state!=='write') throw new Error('Resident not linked to live session');
  apply({sid:'second',state:'think',kind:'claude',project:'Another'});
  if(agents.size!==3) throw new Error('Second session should have its own agent');
  expireAgents(Date.now()+16*60e3);
  if(agents.size!==2 || resident.sessionSid || resident.state!=='idle') throw new Error('Resident should remain when activity expires');
  for(const target of roamSpots) {
    if(blocked.has(key(...target)) || !route([15,21],target).length) throw new Error('Unreachable roaming spot');
  }
  const target = chooseTarget(resident,zones.idle[0],100);
  resident.x=target[0];resident.y=target[1];resident.path=[];
  chooseTarget(resident,zones.idle[0],200);
  if(!Number.isFinite(resident.nextRoam) || resident.nextRoam<=200) throw new Error('Idle agent must pause before roaming again');
  for(const bed of napSpots) if(!route([15,21],bed).length || blocked.has(key(...bed))) throw new Error('Nap spot unreachable');
  const now=Date.now(); resident.idleSince=now-4*60e3;
  if(sleepTarget(resident,now,false)) throw new Error('Must not sleep during daytime');
  resident.idleSince=now-60e3;
  if(sleepTarget(resident,now,true)) throw new Error('Must wait for idle threshold');
  resident.idleSince=now-4*60e3;
  const bed=sleepTarget(resident,now,true);
  if(!bed) throw new Error('Idle nighttime agent should reserve a bed');
  const other=agents.get('resident:codex'); other.idleSince=now-4*60e3;
  if(key(...sleepTarget(other,now,true))===key(...bed)) throw new Error('Agents must reserve separate beds');
  resident.x=bed[0];resident.y=bed[1];resident.path=[];sleepTarget(resident,now,true);
  if(!resident.sleeping) throw new Error('Agent must sleep on arrival');
  apply({sid:'wake',kind:'claude',state:'write',project:'Work'});
  if(resident.sleeping || resident.sleepSpot) throw new Error('New work must wake agent immediately');
  apply({sid:'wake',kind:'claude',state:'bash',project:'Work'});
  apply({sid:'demo-count',kind:'codex',state:'bash',project:'Demo'});
  if(runningCommands()!==1) throw new Error('Command display must count live sessions, not demos');
`,context);
assert.ok(elements.has('log'));
console.log('PASS: all zone destinations reachable, paths avoid walls/furniture, live event creates agent.');
