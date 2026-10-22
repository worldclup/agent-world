const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const noop = () => {};
const elements = new Map();
const drawing = new Proxy({}, { get(target,key) { return key in target ? target[key] : key==='measureText' ? text=>({width:text.length*2}) : key==='createLinearGradient' ? () => ({addColorStop:noop}) : noop; } });
const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, { setAttribute(name,value){this[name]=value;},style:{},clientWidth:840,clientHeight:670,offsetLeft:0,offsetTop:0,clientLeft:4,clientTop:4,getContext: () => drawing, showModal:noop, close:noop, prepend: noop, append: noop, replaceChildren: noop, children: [] }); return elements.get(id); }, createElement: () => ({ append:noop, getContext:()=>drawing }) };
const settingsStore = new Map();
const localStorage = { getItem:key=>settingsStore.get(key), setItem:(key,value)=>settingsStore.set(key,value) };
const context = vm.createContext({ document, localStorage, location:{search:process.argv.includes('--home')?'?scene=home':'?scene=office'}, Image:class {}, EventSource:class {}, requestAnimationFrame:noop, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync('office.js','utf8'),context);
vm.runInContext(`
  if(HOME) {
    if((COLS-2)*(ROWS-2)!==256 || VIEW.w!==420) throw new Error('Compact home layout and close camera must stay paired');
    for(const o of objects) if(o.x<1 || o.y<1 || o.x+o.w>COLS-1 || o.y+o.d>ROWS-1) throw new Error('Home furniture extends outside the room');
    if(objects.filter(o=>o.kind==='desk').length!==2 || objects.some(o=>['sofa','daybed','coffeeBar'].includes(o.kind))) throw new Error('HQ must contain two workstations and no residential furniture');
    if(hqLayers.some(layer=>layer.name==='automation') || blocked.has(key(8,16)) || !route(ENTRY,[8,10]).length)throw new Error('Removed workstation must be a clear entrance');
    if(zones.write.some(p=>p[0]===9&&p[1]===15) || HQ_HOTSPOTS.some(zone=>zone.id==='automation'))throw new Error('Old workstation targets and marker must be removed');
  }
  for(const theme of ['rain','sunset','neon']) {
    backgroundSelect.value=theme;backgroundSelect.onchange();
    if(backgroundTheme!==theme) throw new Error('Background theme selection failed');
  }
  backgroundSelect.value='unknown';backgroundSelect.onchange();
  if(backgroundTheme!=='neon') throw new Error('Invalid theme must be ignored');
  setBuilding('modern');openSettings();setBuilding('cyber');backgroundSelect.value='sunset';backgroundSelect.onchange();cancelSettings();
  if(buildingTheme!=='modern'||backgroundTheme!=='neon') throw new Error('Cancel must restore both settings');
  openSettings();setBuilding('garden');document.getElementById('save-settings').onclick();
  if(document.getElementById(HOME?'scene-home':'scene-office')['aria-current']!=='page')throw new Error('Settings must identify the current scene');
  if(localStorage.getItem('office-building')!=='garden') throw new Error('Save must persist building');
  openSettings();setBuilding('loft');settingsDialog.oncancel({preventDefault(){}});
  if(buildingTheme!=='garden') throw new Error('Escape must discard preview');
  detailedAssets=true;openSettings();detailedToggle.checked=false;detailedToggle.onchange();cancelSettings();
  if(!detailedAssets || !detailedToggle.checked) throw new Error('Cancel must restore detailed asset choice');
  if(drawDetailedFurniture({kind:'desk',x:14,y:2,w:2,d:1})) throw new Error('Unloaded asset must fall back to procedural drawing');
  for(const [kind,asset] of Object.entries(detailedSprites)) {
    asset.image.complete=true;asset.image.naturalWidth=1536;asset.image.naturalHeight=1536;
    if(!drawDetailedFurniture({kind,x:14,y:2,w:kind==='desk'?2:1,d:1})) throw new Error('Loaded detailed asset was not drawn');
  }
  detailedAssets=false;
  if(drawDetailedFurniture({kind:'rack',x:22,y:15,w:1,d:1})) throw new Error('Disabled asset must use procedural drawing');
  detailedAssets=true;
  for(const o of objects) drawObject(o,1000);
  if(HOME) for(const target of [...Object.values(zones).flat(),...roamSpots]) {
    if(target[0]<=0 || target[0]>=COLS-1 || target[1]<=0 || target[1]>=ROWS-1) throw new Error('HQ target outside the room');
  }
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
    const path = route(ENTRY,target);
    if (!path.length) throw new Error('Unreachable zone: '+target);
    let prev=ENTRY;
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
    if(blocked.has(key(...target)) || !route(ENTRY,target).length) throw new Error('Unreachable roaming spot');
  }
  const target = chooseTarget(resident,zones.idle[0],100);
  resident.x=target[0];resident.y=target[1];resident.path=[];
  chooseTarget(resident,zones.idle[0],200);
  if(!Number.isFinite(resident.nextRoam) || resident.nextRoam<=200) throw new Error('Idle agent must pause before roaming again');
  for(const bed of napSpots) if(!route(ENTRY,bed).length || blocked.has(key(...bed))) throw new Error('Nap spot unreachable');
  const now=Date.now(); resident.idleSince=now-4*60e3;
  if(sleepTarget(resident,now,false)) throw new Error('Must not sleep during daytime');
  resident.idleSince=now-60e3;
  if(sleepTarget(resident,now,true)) throw new Error('Must wait for idle threshold');
  resident.idleSince=now-4*60e3;
  if(HOME && sleepTarget(resident,now,true)) throw new Error('HQ has no beds and must not reserve a sleep spot');
  if(!HOME) {
  const bed=sleepTarget(resident,now,true);
  if(!bed) throw new Error('Idle nighttime agent should reserve a bed');
  const other=agents.get('resident:codex'); other.idleSince=now-4*60e3;
  if(key(...sleepTarget(other,now,true))===key(...bed)) throw new Error('Agents must reserve separate beds');
  resident.x=bed[0];resident.y=bed[1];resident.path=[];sleepTarget(resident,now,true);
  if(!resident.sleeping) throw new Error('Agent must sleep on arrival');
  }
  apply({sid:'wake',kind:'claude',state:'write',project:'Work'});
  if(resident.sleeping || resident.sleepSpot) throw new Error('New work must wake agent immediately');
  apply({sid:'wake',kind:'claude',state:'bash',project:'Work'});
  apply({sid:'demo-count',kind:'codex',state:'bash',project:'Demo'});
  if(runningCommands()!==1) throw new Error('Command display must count live sessions, not demos');
  if(HOME) {
    hqImage.complete=true;hqImage.naturalWidth=1536;
    if(!hqReady())throw new Error('Approved HQ image must activate the scene');
    if(HQ_HOTSPOTS.filter(z=>!z.room).length!==5 || HQ_HOTSPOTS.length!==9)throw new Error('HQ needs five work markers and four lounge/rest markers');
    let zoneOpens=0,zoneCloses=0;
    zoneDialog.showModal=()=>zoneOpens++;zoneDialog.close=()=>zoneCloses++;
    for(const zone of HQ_HOTSPOTS.filter(z=>!z.room)) {
      const small=hotspotPosition(zone.point,420,335),large=hotspotPosition(zone.point,840,670),wide=hotspotPosition(zone.point,1040,670);
      if(Math.abs(large[0]-2*small[0])>.001 || Math.abs(large[1]-2*small[1])>.001 || Math.abs(wide[0]-large[0]-100)>.001)throw new Error('Zone marker must follow scene scaling and letterboxing');
      if(zone.targets.some(p=>!route(ENTRY,p).length))throw new Error('Zone details must reference reachable targets');
      document.getElementById('zone-'+zone.id).onclick();
      if(document.getElementById('zone-title').textContent!==zone.title || !document.getElementById('zone-target').textContent.includes('('))throw new Error('Zone details missing');
    }
    openZone('unknown');
    if(zoneOpens!==5)throw new Error('Unknown zone must not open a dialog');
    document.getElementById('close-zone').onclick();if(zoneCloses!==1)throw new Error('Zone close failed');
    positionHotspots();if(hotspotGroup.hidden || !document.getElementById('zone-dev').style.left.endsWith('px'))throw new Error('Ready HQ must position visible markers');
    drawScene(1000);
    for(const a of agents.values())if(!Number.isFinite(a.sx)||!Number.isFinite(a.sy))throw new Error('HQ agent projection failed');
    hqCharacters.walk.complete=true;hqCharacters.walk.naturalWidth=1536;hqCharacters.walk.naturalHeight=1024;
    hqCharacters.seated.complete=true;hqCharacters.seated.naturalWidth=1024;hqCharacters.seated.naturalHeight=1536;
    const walker={x:12,y:14,path:[[12,13]],dir:3,flip:false,state:'idle'};
    if(hqCharacterFrame(walker,0).crop.join(',')!=='512,0,512,512' || hqCharacterFrame(walker,360).crop[0]!==1024)throw new Error('Walking phases failed');
    walker.dir=2;walker.flip=true;
    if(hqCharacterFrame(walker,0).crop[1]!==512 || !hqCharacterFrame(walker,0).flip)throw new Error('Four-direction atlas selection failed');
    walker.path=[];
    if(hqCharacterFrame(walker,0).crop[0]!==0)throw new Error('Idle must use neutral pose');
    walker.state='write';
    walker.x=4;walker.y=8;
    if(hqCharacterFrame(walker,0).image!==hqCharacters.seated)throw new Error('Work must use seated pose');
    const removedSeat={...walker,x:9,y:15};
    if(hqCharacterFrame(removedSeat,0).image===hqCharacters.seated)throw new Error('Removed entrance desk must not retain a seated pose');
    if(!drawHQCharacter(walker,0) || !Number.isFinite(walker.top))throw new Error('New character draw failed');
    const seatedFrame=hqCharacterFrame(walker,0), seatScale=seatedFrame.height/seatedFrame.crop[3];
    const drawnHip=[walker.sx-(410-175-400)*seatScale,walker.top+(900-100)*seatScale];
    const expectedHip=hqScreen([620,419]);
    if(Math.abs(drawnHip[0]-expectedHip[0])>.001 || Math.abs(drawnHip[1]-expectedHip[1])>.001)throw new Error('Seated hip must align with the chair cushion');
    if(seatedFrame.height!==56)throw new Error('Seated scale must match the larger chair proportions');
    walker.state='idle';
    if(hqCharacterFrame(walker,0).height!==70)throw new Error('Standing scale must stay enlarged');
    let clips=0,translucentActors=0;
    ctx.clip=()=>clips++;
    ctx.drawImage=(image)=>{if(Object.values(hqCharacters).includes(image) && ctx.globalAlpha!==1)translucentActors++;};
    drawScene(1000);
    if(clips || translucentActors)throw new Error('HQ avatars must render opaque without furniture masks');
    delete ctx.clip;delete ctx.drawImage;
    walker.state='write';
    drawScene(1000);
    hqCharacters.seated.complete=false;
    if(hqCharacterFrame(walker,0)!==null)throw new Error('Missing character asset must fall back');
    if(!insidePolygon([1,1],[[0,0],[2,0],[2,2],[0,2]]) || insidePolygon([3,3],[[0,0],[2,0],[2,2],[0,2]]))throw new Error('Furniture footprint collision failed');
    hqImage.complete=false;
    if(hqReady())throw new Error('Missing scene art must use fallback');
    positionHotspots();if(!hotspotGroup.hidden)throw new Error('Unavailable scene must hide markers');
    const probe={sid:'room-probe',kind:'codex',state:'idle',idleSince:Date.now()-200000,path:[],x:ENTRY[0],y:ENTRY[1],last:Date.now()};
    if(agentRoom(probe,Date.now(),false)!=='lounge' || agentRoom(probe,Date.now(),true)!=='rest')throw new Error('Idle rooms must follow local night and idle threshold');
    probe.idleSince=Date.now();if(agentRoom(probe,Date.now(),true)!=='lounge')throw new Error('Newly idle agent must not enter rest early');
    probe.state='write';if(agentRoom(probe,Date.now(),true)!=='work')throw new Error('Active work must always return to work room');
    agents.set(probe.sid,probe);
    for(const name of ['lounge','rest']) {
      HQ_ROOMS[name].image.complete=true;HQ_ROOMS[name].image.naturalWidth=1536;HQ_ROOMS[name].image.naturalHeight=1024;
      for(const target of [[6,15],[9,15],[12,15],[8,16]]) {
        const path=route(ENTRY,target,name);
        if(!path.length || path.some(p=>HQ_ROOMS[name].blocked.has(key(...p))))throw new Error('Room roaming route must stay walkable: '+name);
      }
      document.getElementById('room-'+name).onclick();
      if(selectedRoom!==name || !hqReady() || localStorage.getItem('office-hq-room')!==name)throw new Error('Room selection must persist');
      probe.room=name;probe.state='idle';probe.roamTarget=null;probe.nextRoam=0;
      const target=chooseTarget(probe,[4,8],1000);
      if(!route(ENTRY,target,name).length)throw new Error('Room target unreachable');
      drawScene(1000);
      if(!Number.isFinite(probe.sx) || hotspotGroup.hidden || !document.getElementById('zone-dev').hidden)throw new Error('Other rooms must draw agents and hide work markers');
      for(const zone of HQ_HOTSPOTS.filter(z=>z.room===name)) {
        const button=document.getElementById('zone-'+zone.id);
        if(button.hidden || !button.style.left.endsWith('px'))throw new Error('Current room marker must be positioned');
        if(zone.targets.some(p=>!route(ENTRY,p,name).length))throw new Error('Room marker approach must be reachable');
        button.onclick();if(document.getElementById('zone-title').textContent!==zone.title)throw new Error('Room marker details failed');
      }
      const opensBefore=zoneOpens;openZone('dev');if(zoneOpens!==opensBefore)throw new Error('Hidden room marker must not open');
      probe.state='read';updateAgentRoom(probe);
      if(probe.room!=='work' || probe.path.length || probe.x!==ENTRY[0])throw new Error('New work must reset room approach');
    }
    const remembered=selectedRoom;chooseRoom('unknown');if(selectedRoom!==remembered)throw new Error('Invalid room must be ignored');
    chooseRoom('work');agents.delete(probe.sid);
  }
`,context);
assert.ok(elements.has('log'));
const previewElements=new Map();
const previewDocument={getElementById(id){if(!previewElements.has(id))previewElements.set(id,{setAttribute(name,value){this[name]=value;}});return previewElements.get(id);}};
const previewScript=fs.readFileSync('shell.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInNewContext(previewScript,{document:previewDocument});
for(const stage of ['room','floor','furnished']) {
  previewElements.get(stage).onclick();
  assert.equal(previewElements.get('room-layer').hidden,stage!=='room');
  assert.equal(previewElements.get('floor-layer').hidden,stage!=='floor');
  assert.equal(previewElements.get('furnished-layer').hidden,stage!=='furnished');
  assert.equal(previewElements.get(stage)['aria-pressed'],'true');
}
vm.runInNewContext(fs.readFileSync('character.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1],{document:previewDocument});
for(const pose of ['seated','standing']) {
  previewElements.get(pose).onclick();
  assert.equal(previewElements.get('standing-layer').hidden,pose!=='standing');
  assert.equal(previewElements.get('seated-layer').hidden,pose!=='seated');
  assert.equal(previewElements.get(pose)['aria-pressed'],'true');
  const png=fs.readFileSync('assets/detailed/hq-character-'+pose+'-v1.png');
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png[25],6,'Character original must retain RGBA');
  assert.ok(png.readUInt32BE(16)>0 && png.readUInt32BE(20)>0);
}
{
  const png=fs.readFileSync('assets/detailed/hq-character-walk-v2.png');
  assert.equal(png[25],6,'Walking atlas must retain RGBA');
  assert.equal(png.readUInt32BE(16),1536);assert.equal(png.readUInt32BE(20),1024);
}
for(const file of ['hq-floor-v1.png','hq-shell-v1.png','hq-furnished-v2.png','hq-entry-v3.png','hq-lounge-v1.png','hq-rest-v1.png']) {
  const png=fs.readFileSync('assets/detailed/'+file);
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png[25],6,'Architectural original must retain RGBA');
  assert.equal(png.readUInt32BE(16),1536);
  assert.equal(png.readUInt32BE(20),1024);
}
for (const [kind,asset] of Object.entries(vm.runInContext('detailedSprites',context))) {
  const file=asset.image.src.split('/').pop();
  const png=fs.readFileSync('assets/detailed/'+file);
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png[25],6,'Generated sprite must retain RGBA transparency');
  const [x,y,w,h]=asset.crop;
  assert.ok(x>=0 && y>=0 && w>0 && h>0 && x+w<=png.readUInt32BE(16) && y+h<=png.readUInt32BE(20),kind+' crop must fit the original PNG');
}
console.log('PASS: all zone destinations reachable, paths avoid walls/furniture, live event creates agent.');
