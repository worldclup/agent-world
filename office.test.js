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
