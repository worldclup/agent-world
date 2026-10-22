const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let request;
const context = vm.createContext({
  require(name) {
    if (name === 'http') return { createServer(fn) { request = fn; return { listen() {} }; } };
    if (name === 'fs') return { ...fs, existsSync: () => false };
    return require(name);
  },
  __dirname, Buffer, URL, console, setInterval: () => ({ unref() {} }),
});
vm.runInContext(fs.readFileSync('server.js', 'utf8'), context);
vm.runInContext(`
  const fixture = '/tmp/session-12345678.jsonl';
  codexProject.set(fixture, 'agent-world');
  handleCodex(fixture, { type:'event_msg', payload:{ type:'user_message', message:'test' } });
  if (latest.get('codex:12345678').state !== 'think') throw new Error('User prompt not detected');
  handleCodex(fixture, { type:'response_item', payload:{ type:'custom_tool_call', name:'exec', input:'await tools.apply_patch(patch)' } });
  if (latest.get('codex:12345678').state !== 'write') throw new Error('Exec patch not detected');
`, context);
let output = '';
request({ url:'/events', on() {} }, { writeHead() {}, write(chunk) { output += chunk; } });
assert.match(output, /"kind":"codex"/);
assert.match(output, /"state":"write"/);
assert.equal((output.match(/data:/g) || []).length, 1);
const dir = fs.mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'office-poll-'));
const file = require('node:path').join(dir, 'poll.jsonl');
try {
  fs.writeFileSync(file, '');
  context.pollDir = dir;
  vm.runInContext('let polled = []; walk(pollDir, (_,e) => polled.push(e));', context);
  fs.appendFileSync(file, JSON.stringify({ timestamp:new Date().toISOString(), type:'event_msg', payload:{ type:'task_started' } })+'\n');
  vm.runInContext('walk(pollDir, (_,e) => polled.push(e), false); if(polled.length!==1) throw new Error("Polling missed appended event"); walk(pollDir, (_,e) => polled.push(e), false); if(polled.length!==1) throw new Error("Polling duplicated event");',context);
} finally { fs.unlinkSync(file); fs.rmdirSync(dir); }
console.log('PASS: Codex prompt, exec tool activity, and latest-state replay on SSE connection.');
async function checkBackgroundScript() {
  const html=fs.readFileSync('index.html','utf8');
  assert.ok(html.indexOf('/office-backgrounds.js')>=0&&html.indexOf('/office-backgrounds.js')<html.indexOf('/office.js'));
  await new Promise((resolve,reject)=>{
    let status,headers;
    request({url:'/office-backgrounds.js'}, {
      writeHead(code,value){status=code;headers=value;},
      end(body){
        try {
          assert.equal(status,200);assert.match(headers['Content-Type'],/javascript/);
          assert.match(String(body),/function drawOfficeSurroundings/);resolve();
        } catch(error){reject(error);}
      }
    });
  });
  console.log('PASS: background renderer loads before office and is served as JavaScript.');
  for(const url of ['/locales/en.js','/locales/th.js','/i18n.js'])await new Promise((resolve,reject)=>{
    let status,headers;
    request({url},{writeHead(code,value){status=code;headers=value;},end(body){
      try {assert.equal(status,200);assert.match(headers['Content-Type'],/javascript/);assert.ok(String(body).length>0);resolve();}catch(error){reject(error);}
    }});
  });
  console.log('PASS: both language catalogs and translation runtime are served.');
}
checkBackgroundScript().catch(error=>{console.error(error);process.exitCode=1;});
