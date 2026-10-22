const {spawn}=require('node:child_process');
// Only the tool-free Claude adapter is enabled; Codex sessions remain read-only in this UI.
module.exports=function createChatHandler({env=process.env,resolve=()=>null,list=()=>[],launch=spawn}={}) {
  let busy=false;
  const available=()=>list().map(item=>({...item,supported:item.kind==='claude'&&!item.ambiguous}));
  return async function chat(req,res) {
    const json=(status,data)=>{if(res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    const host=req.headers.host;
    if(!['localhost:4321','127.0.0.1:4321'].includes(host)||(req.headers.origin&&req.headers.origin!==`http://${host}`)||req.headers['sec-fetch-site']==='cross-site')return json(403,{error:'chat.forbidden'});
    if(req.url==='/sessions'&&req.method==='GET')return json(200,{sessions:available(),enabled:env.OFFICE_SESSION_CHAT==='1'});
    if(req.method!=='POST')return json(405,{error:'chat.method'});
    if(req.headers.origin!==`http://${host}`)return json(403,{error:'chat.forbidden'});
    if(req.headers['content-type']?.split(';')[0].trim()!=='application/json')return json(415,{error:'chat.invalid'});
    if(env.OFFICE_SESSION_CHAT!=='1')return json(503,{error:'chat.sessionSetup'});
    if(busy)return json(429,{error:'chat.busy'});
    let size=0,chunks=[],body;
    try {
      for await(const chunk of req) {
        size+=Buffer.byteLength(chunk);if(size>16384){json(413,{error:'chat.long'});req.resume();return;}
        chunks.push(Buffer.from(chunk));
      }
      body=JSON.parse(Buffer.concat(chunks).toString());
      if(typeof body.session!=='string'||typeof body.message!=='string'||!body.message.trim()||body.message.length>4000||body.confirm!==true)throw Error();
    }catch {return json(400,{error:'chat.invalid'});}
    const item=available().find(item=>item.key===body.session),source=resolve(body.session);
    if(!item||!source||source.ambiguous)return json(404,{error:'chat.expired'});
    if(!item.supported)return json(409,{error:'chat.unsupported'});
    if(item.state!=='idle'||busy)return json(409,{error:'chat.sessionBusy'});
    busy=true;
    let child,timeout,output='',failed=false,settled=false;
    const finish=(code,data)=>{if(settled)return;settled=true;clearTimeout(timeout);res.off('close',disconnect);json(code,data);};
    const stop=()=>{if(child){child.kill('SIGTERM');setTimeout(()=>{if(child.exitCode===null)child.kill('SIGKILL');},1000).unref();}};
    const disconnect=()=>{if(!res.writableEnded){failed=true;stop();}};
    try {
      // No shell, client-controlled paths/IDs/flags, tools, MCP, hooks, skills, or permission bypass.
      child=launch(env.CLAUDE_BIN||'claude',[
        '--resume',source.fullId,'--print','--output-format','json',
        '--tools','','--strict-mcp-config','--mcp-config','{"mcpServers":{}}',
        '--disable-slash-commands','--setting-sources','','--settings','{"disableAllHooks":true}',
      ],{cwd:source.cwd,shell:false,stdio:['pipe','pipe','pipe']});
      res.on('close',disconnect);
      child.stdout.setEncoding('utf8');
      timeout=setTimeout(()=>{failed=true;stop();finish(504,{error:'chat.timeout'});},120000);
      child.stdout.on('data',chunk=>{
        output+=chunk.toString();if(Buffer.byteLength(output)>1024*1024){failed=true;stop();finish(502,{error:'chat.long'});}
      });
      child.stderr.on('data',()=>{});
      child.on('error',()=>{busy=false;finish(502,{error:'chat.cliMissing'});});
      child.on('close',code=>{
        busy=false;
        if(failed||code!==0)return finish(502,{error:'chat.resumeFailed'});
        try {
          const result=JSON.parse(output);
          if(result.is_error||typeof result.result!=='string'||!result.result.trim()||result.session_id!==source.fullId)throw Error();
          finish(200,{text:result.result,session:body.session});
        }catch {finish(502,{error:'chat.resumeFailed'});}
      });
      child.stdin.on('error',()=>{});child.stdin.end(body.message);
    }catch {busy=false;finish(502,{error:'chat.cliMissing'});}
  };
};
