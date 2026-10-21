const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const noop = () => {};
const elements = new Map();
const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, { getContext: () => ({}), prepend: noop, append: noop, children: [] }); return elements.get(id); }, createElement: () => ({ append:noop }) };
const context = vm.createContext({ document, Image:class {}, EventSource:class {}, requestAnimationFrame:noop, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync('office.js','utf8'),context);
vm.runInContext(`
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
`,context);
assert.ok(elements.has('log'));
console.log('PASS: all zone destinations reachable, paths avoid walls/furniture, live event creates agent.');
