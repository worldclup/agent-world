// Agent World: watches Claude Code session logs and streams events to a pixel-art page.
// Run: node server.js  ->  open http://localhost:4321
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(os.homedir(), '.claude', 'projects');
const CODEX_ROOT = path.join(os.homedir(), '.codex', 'sessions');
const codexProject = new Map();
const PORT = 4321;
const clients = new Set();
const offsets = new Map();
const latest = new Map();
const ACTIVE_MS = 15 * 60e3;

function send(ev) {
  latest.set(`${ev.kind}:${ev.sid}`, ev);
  const data = `data: ${JSON.stringify(ev)}\n\n`;
  for (const c of clients) c.write(data);
}

const STATE_BY_TOOL = {
  Read: 'read', Grep: 'read', Glob: 'read', LS: 'read', NotebookRead: 'read',
  Edit: 'write', Write: 'write', MultiEdit: 'write', NotebookEdit: 'write',
  Bash: 'bash', BashOutput: 'bash',
  WebSearch: 'web', WebFetch: 'web',
  Task: 'agent', Agent: 'agent',
};

function detail(input = {}) {
  const v = input.file_path || input.command || input.pattern || input.query ||
            input.url || input.description || input.path || '';
  return String(v).replace(/\s+/g, ' ').slice(0, 80);
}

function handle(file, e) {
  const sid = path.basename(file, '.jsonl').slice(0, 8);
  const project = path.basename(path.dirname(file)).split('-').filter(Boolean).pop() || '?';
  const base = { sid, project, kind: 'claude', t: Date.now() };
  const content = e.message && e.message.content;

  if (e.type === 'user') {
    if (typeof content === 'string') send({ ...base, state: 'think', text: content.slice(0, 80) });
    else if (Array.isArray(content)) {
      const prompt = content.find(c => c.type === 'text');
      send({ ...base, state: 'think', text: prompt ? prompt.text.slice(0, 80) : '' });
    }
  } else if (e.type === 'assistant' && Array.isArray(content)) {
    for (const c of content) {
      if (c.type === 'tool_use') send({ ...base, state: STATE_BY_TOOL[c.name] || 'bash', tool: c.name, text: detail(c.input) });
      else if (c.type === 'text' && c.text.trim()) send({ ...base, state: 'talk', text: c.text.trim().slice(0, 80) });
    }
    if (e.message.stop_reason === 'end_turn') send({ ...base, state: 'idle', text: 'เสร็จงาน' });
  }
}

const READ_CMD = /^\s*(sed|cat|head|tail|rg|grep|ls|find|nl|wc|git (log|show|diff|status))\b/;

function handleCodex(file, e) {
  const sid = path.basename(file, '.jsonl').slice(-8);
  const p = e.payload || {};
  if (!codexProject.has(file)) {               // project name lives in the file's first line (session_meta)
    const buf = Buffer.alloc(65536), fd = fs.openSync(file, 'r');
    const m = buf.subarray(0, fs.readSync(fd, buf, 0, buf.length, 0)).toString().match(/"cwd":\s*"([^"]+)"/);
    fs.closeSync(fd);
    if (m && m[1].includes('/')) codexProject.set(file, path.basename(m[1]));
  }
  const base = { sid, project: codexProject.get(file) || 'codex', kind: 'codex', t: Date.now() };

  if (e.type === 'event_msg' && p.type === 'task_started') send({ ...base, state: 'think', text: '' });
  else if (e.type === 'event_msg' && p.type === 'user_message') send({ ...base, state: 'think', text: String(p.message || '').slice(0, 80) });
  else if (e.type === 'event_msg' && p.type === 'task_complete') send({ ...base, state: 'idle', text: 'เสร็จงาน' });
  else if (e.type !== 'response_item') return;
  else if (p.type === 'message' && p.role === 'assistant') {
    const t = (p.content || []).map(c => c.text || '').join(' ').trim();
    if (t) send({ ...base, state: 'talk', text: t.replace(/\s+/g, ' ').slice(0, 80) });
  } else if (p.type === 'custom_tool_call' && /(?:^|\.)apply_patch$/.test(p.name || '')) {
    const f = (p.input || '').match(/\*\*\* \w+ File: (.+)/);
    send({ ...base, state: 'write', tool: 'apply_patch', text: f ? f[1] : '' });
  } else if (p.type === 'custom_tool_call' && /(?:^|\.)exec$/.test(p.name || '')) {
    const code = String(p.input || '');
    const state = /apply_patch/.test(code) ? 'write' : /web__run|web_search/.test(code) ? 'web' : /exec_command|write_stdin/.test(code) ? 'bash' : 'read';
    send({ ...base, state, tool: p.name, text: code.replace(/\s+/g, ' ').slice(0, 80) });
  } else if (p.type === 'web_search_call') {
    send({ ...base, state: 'web', tool: 'web_search', text: (p.action && p.action.query) || '' });
  } else if (p.type === 'function_call') {
    let args = {}; try { args = JSON.parse(p.arguments); } catch {}
    if (p.name === 'exec_command' || p.name === 'shell') {
      const cmd = [].concat(args.cmd || args.command || '').join(' ');
      send({ ...base, state: READ_CMD.test(cmd) ? 'read' : 'bash', tool: 'shell', text: cmd.replace(/\s+/g, ' ').slice(0, 80) });
    } else if (p.name !== 'write_stdin') {
      send({ ...base, state: 'read', tool: p.name, text: detail(args) });
    }
  }
}

function readNew(file, handler) {
  let size;
  try { size = fs.statSync(file).size; } catch { return; }
  let off = offsets.get(file) ?? 0;          // files created after startup are read from the start
  if (size < off) off = 0;
  if (size === off) return;
  const buf = Buffer.alloc(size - off);
  const fd = fs.openSync(file, 'r');
  fs.readSync(fd, buf, 0, buf.length, off);
  fs.closeSync(fd);
  const end = buf.lastIndexOf(10);            // only consume complete lines
  if (end < 0) return;
  offsets.set(file, off + end + 1);
  for (const line of buf.subarray(0, end).toString('utf8').split('\n')) {
    try { handler(file, JSON.parse(line)); } catch {}
  }
}

// Skip existing history: start every known file at its current end.
function walk(dir, handler, initial = true) {
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const d of items) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, handler, initial);
    else if (p.endsWith('.jsonl')) {
      if (!initial && offsets.has(p)) { readNew(p, handler); continue; }
      const stat = fs.statSync(p);
      offsets.set(p, stat.size);
      // Restore only recent activity, without replaying the full conversation history.
      if (Date.now() - stat.mtimeMs <= ACTIVE_MS) {
        const start = Math.max(0, stat.size - 256 * 1024), buf = Buffer.alloc(stat.size - start);
        const fd = fs.openSync(p, 'r');
        try { fs.readSync(fd, buf, 0, buf.length, start); } finally { fs.closeSync(fd); }
        const lines = buf.toString('utf8').split('\n');
        if (start) lines.shift();
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.timestamp && Date.now() - Date.parse(event.timestamp) <= ACTIVE_MS) handler(p, event);
          } catch {}
        }
      }
    }
  }
}

// File-system notifications can be missed by recursive watchers on session directories.
// Polling also discovers new date folders and session files without replaying old history.
setInterval(() => {
  for (const [root, handler] of [[ROOT, handle], [CODEX_ROOT, handleCodex]]) {
    try { walk(root, handler, false); }
    catch (err) { console.warn('Session polling failed:', err.message); }
  }
}, 2000).unref();

for (const [root, handler] of [[ROOT, handle], [CODEX_ROOT, handleCodex]]) {
  if (!fs.existsSync(root)) continue;
  walk(root, handler);
  fs.watch(root, { recursive: true }, (_, f) => {
    if (f && f.endsWith('.jsonl')) readNew(path.join(root, f), handler);
  });
}

http.createServer((req, res) => {
  if (req.url === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': hi\n\n');
    clients.add(res);
    for (const ev of latest.values()) if (Date.now() - ev.t <= ACTIVE_MS) res.write(`data: ${JSON.stringify(ev)}\n\n`);
    req.on('close', () => clients.delete(res));
  } else {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const allowed = { '/': 'index.html', '/index.html': 'index.html', '/office.js': 'office.js', '/office-backgrounds.js': 'office-backgrounds.js', '/assets/roguelikeCity_magenta.png': 'assets/roguelikeCity_magenta.png' };
    const file = allowed[pathname];
    const iconFile = /^\/assets\/icons\/(coffee|book|edit|globe|message|terminal|users|play|info-box|sliders)\.svg$/.test(pathname) ? pathname.slice(1) : null;
    const target = file || iconFile;
    if (!target) { res.writeHead(404); res.end('Not found'); return; }
    fs.readFile(path.join(__dirname, target), (err, data) => {
      if (err) { res.writeHead(500); res.end('Unable to load file'); return; }
      res.writeHead(200, { 'Content-Type': target.endsWith('.svg') ? 'image/svg+xml' : target.endsWith('.png') ? 'image/png' : target.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8' });
      res.end(data);
    });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Agent World -> http://localhost:${PORT}`));
