const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Readable,PassThrough}=require('node:stream'),{EventEmitter}=require('node:events');
const createChatHandler=require('./chat-server'),createRegistry=require('./session-registry');
const id='12345678-1234-4234-8234-123456789abc',key='claude:12345678';
const source={fullId:id,cwd:'/tmp',kind:'claude'},env={OFFICE_SESSION_CHAT:'1'};
const payload={session:key,message:'Hello',confirm:true};
function fixture(overrides={}) {
  let calls=0,args,stdin;
  const launch=(bin,argv,options)=>{
    calls++;args={bin,argv,options};const child=new EventEmitter();
    child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();child.exitCode=null;child.kill=()=>{};
    child.stdin.on('data',chunk=>stdin=String(chunk));
    child.stdin.on('finish',()=>setImmediate(()=>{
      child.stdout.write(JSON.stringify({session_id:id,result:'Hello back',is_error:false}));child.exitCode=0;child.emit('close',0);
    }));return child;
  };
  const handler=createChatHandler({env,resolve:k=>k===key?source:null,list:()=>[{key,kind:'claude',state:'idle',sid:'12345678',project:'test'}],launch,...overrides});
  return {handler,get calls(){return calls;},get args(){return args;},get stdin(){return stdin;}};
}
async function call(handler,body=payload,headers={},method='POST',url='/chat') {
  const req=Readable.from([typeof body==='string'?body:JSON.stringify(body)]);
  req.headers={host:'localhost:4321',origin:'http://localhost:4321','content-type':'application/json',...headers};req.method=method;req.url=url;
  const res=new EventEmitter();res.finished=new Promise(resolve=>res.done=resolve);
  res.writeHead=(status,headers)=>{res.status=status;res.headers=headers;};
  res.end=body=>{res.body=JSON.parse(body);res.writableEnded=true;res.done();};
  await handler(req,res);await res.finished;return res;
}
async function main() {
  const app=fixture();
  assert.equal((await call(app.handler,payload,{origin:'https://evil.test'})).status,403);
  assert.equal((await call(app.handler,payload,{host:'evil.test'})).status,403);
  assert.equal((await call(app.handler,payload,{},'GET')).status,405);
  assert.equal((await call(app.handler,payload,{'content-type':'text/plain'})).status,415);
  for(const body of ['bad json',{...payload,confirm:false},{...payload,message:'x'.repeat(4001)}])assert.equal((await call(app.handler,body)).status,400);
  assert.equal((await call(app.handler,'x'.repeat(17000))).status,413);
  assert.equal((await call(app.handler,{...payload,session:'arbitrary path'})).status,404);assert.equal(app.calls,0);
  const disabled=fixture({env:{}});assert.equal((await call(disabled.handler)).body.error,'chat.sessionSetup');
  const busy=fixture({list:()=>[{key,kind:'claude',state:'think'}]});assert.equal((await call(busy.handler)).body.error,'chat.sessionBusy');
  const codex=fixture({list:()=>[{key,kind:'codex',state:'idle'}]});assert.equal((await call(codex.handler)).body.error,'chat.unsupported');
  const ambiguous=fixture({resolve:()=>({...source,ambiguous:true})});assert.equal((await call(ambiguous.handler)).status,404);
  const listing=await call(app.handler,payload,{},'GET','/sessions');
  assert.equal(listing.body.sessions[0].key,key);assert.ok(!JSON.stringify(listing.body).includes(source.cwd));
  const result=await call(app.handler);assert.equal(result.body.text,'Hello back');assert.equal(result.body.session,key);
  assert.equal(app.calls,1);assert.equal(app.stdin,'Hello');assert.equal(app.args.options.shell,false);
  assert.equal(app.args.options.cwd,source.cwd);assert.ok(app.args.argv.includes(id));
  assert.equal(app.args.argv[app.args.argv.indexOf('--tools')+1],'');
  assert.ok(app.args.argv.includes('--strict-mcp-config'));assert.ok(!app.args.argv.join(' ').includes('bypass'));
  const wrongId=fixture({launch:()=>{
    const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();
    child.stdin.on('finish',()=>setImmediate(()=>{child.stdout.write(JSON.stringify({session_id:'other',result:'wrong'}));child.emit('close',0);}));
    return child;
  }});
  assert.equal((await call(wrongId.handler)).body.error,'chat.resumeFailed');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'office-session-'));
  try {
    const file=path.join(dir,id+'.jsonl');fs.writeFileSync(file,JSON.stringify({cwd:dir})+'\n');
    const registry=createRegistry();registry.remember(file,'claude','12345678',{});
    assert.equal(registry.resolve(key).fullId,id);
    const other=path.join(dir,'12345678-1234-4234-8234-ffffffffffff.jsonl');fs.writeFileSync(other,JSON.stringify({cwd:dir})+'\n');
    registry.remember(other,'claude','12345678',{});assert.equal(registry.resolve(key).ambiguous,true);
    const codexFile=path.join(dir,'rollout.jsonl');fs.writeFileSync(codexFile,JSON.stringify({type:'session_meta',payload:{id,cwd:dir}})+'\n');
    registry.remember(codexFile,'codex','56789abc',{});assert.equal(registry.resolve('codex:56789abc').fullId,id);
    for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));
  }finally{fs.rmdirSync(dir);}
  console.log('PASS: session selection, full IDs, collision rejection, busy/unsupported checks and tool-free CLI resume (mocked).');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
