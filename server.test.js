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
  __dirname, Buffer, URL, console,
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
console.log('PASS: Codex prompt, exec tool activity, and latest-state replay on SSE connection.');
