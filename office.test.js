const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const noop = () => {};
const elements = new Map();
const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, { getContext: () => ({}), prepend: noop, append: noop, children: [] }); return elements.get(id); }, createElement: () => ({ append:noop }) };
const context = vm.createContext({ document, Image:class {}, EventSource:class {}, requestAnimationFrame:noop, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync('office.js','utf8'),context);
vm.runInContext(`
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
`,context);
assert.ok(elements.has('log'));
console.log('PASS: all zone destinations reachable, paths avoid walls/furniture, live event creates agent.');
