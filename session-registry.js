const fs=require('node:fs'),path=require('node:path');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
module.exports=function createRegistry() {
  const sources=new Map(),cache=new Map();
  function remember(file,kind,sid,event) {
    let source=cache.get(file);
    if(!source) {
      let metadata=event;
      try {
        const buffer=Buffer.alloc(65536),fd=fs.openSync(file,'r');
        try {
          const lines=buffer.subarray(0,fs.readSync(fd,buffer,0,buffer.length,0)).toString().split('\n');
          for(const line of lines)try {
            const item=JSON.parse(line);
            if(kind==='codex'&&item.type==='session_meta'){metadata=item.payload;break;}
            if(kind==='claude'&&typeof item.cwd==='string'){metadata=item;break;}
          }catch {}
        }finally{fs.closeSync(fd);}
      }catch {}
      const fullId=kind==='claude'?path.basename(file,'.jsonl'):metadata?.id;
      const cwd=metadata?.cwd;
      if(!UUID.test(fullId||'')||typeof cwd!=='string'||!path.isAbsolute(cwd))return;
      source={fullId,cwd,kind,sid};cache.set(file,source);
    }
    const key=`${kind}:${sid}`,previous=sources.get(key);
    // Never resolve a collision of the short IDs used by the visualizer.
    sources.set(key,previous&&(previous.fullId!==source.fullId||previous.ambiguous)?{...source,ambiguous:true}:source);
  }
  return {remember,resolve:key=>sources.get(key)};
};
