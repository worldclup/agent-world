(()=>{
  const form=document.getElementById('chat-form'),input=document.getElementById('chat-input');
  const log=document.getElementById('chat-log'),send=document.getElementById('chat-send'),clear=document.getElementById('chat-clear');
  const notice=document.getElementById('chat-status'),picker=document.getElementById('chat-sessions'),menu=document.getElementById('chat-session-options');
  const trigger=document.getElementById('chat-session-trigger'),confirm=document.getElementById('chat-confirm');
  const conversations=new Map();let sessions=[],selected='',busy=false,enabled=false,statusKey='chat.choose';
  function status(key){statusKey=key;notice.textContent=i18n.t(key);}
  function current(){return sessions.find(item=>item.key===selected);}
  function renderLog(){
    log.replaceChildren();
    for(const message of conversations.get(selected)||[]) {
      const item=document.createElement('li'),label=document.createElement('strong'),body=document.createElement('p');
      item.className=message.role==='user'?'chat-user':'chat-assistant';
      label.textContent=message.role==='user'?i18n.t('chat.you'):(current()?.kind==='codex'?'Codex':'Claude');
      body.textContent=message.text;item.append(label,body);log.append(item);
    }
    log.scrollTop=log.scrollHeight;
  }
  function refresh(){
    const item=current();trigger.textContent=item?label(item):i18n.t('chat.choose');
    menu.replaceChildren();
    for(const session of sessions){
      const button=document.createElement('button');button.type='button';button.textContent=label(session);
      button.setAttribute('aria-pressed',String(session.key===selected));button.disabled=busy;
      button.onclick=()=>{selected=session.key;confirm.checked=false;picker.open=false;renderLog();refresh();};
      menu.append(button);
    }
    send.disabled=busy||!enabled||!item?.supported||item.state!=='idle'||!confirm.checked;
    input.disabled=busy;clear.disabled=busy;
    if(!busy)status(!item?'chat.choose':!enabled?'chat.sessionSetup':!item.supported?'chat.unsupported':item.state!=='idle'?'chat.sessionBusy':'chat.sessionReady');
  }
  function label(item){return `${item.kind==='codex'?'Codex':'Claude'} · ${item.project} · ${item.sid} · ${labels[item.state]||item.state}`;}
  async function load(){
    try {
      const response=await fetch('/sessions',{cache:'no-store'});if(!response.ok)throw Error();
      const data=await response.json();enabled=data.enabled===true;
      sessions=(data.sessions||[]).filter(item=>[...agents.values()].some(a=>a.kind===item.kind&&a.sessionSid===item.sid&&!a.sessionSid.startsWith('demo-')));
      refresh();
    }catch {send.disabled=true;status('chat.upstream');}
  }
  confirm.onchange=refresh;
  i18n.onChange(()=>{input.placeholder=i18n.t('chat.placeholder');renderLog();refresh();if(busy)status(statusKey);});
  input.placeholder=i18n.t('chat.placeholder');
  clear.onclick=()=>{if(busy)return;conversations.delete(selected);renderLog();};
  form.onsubmit=async event=>{
    event.preventDefault();const content=input.value.trim(),item=current();
    if(!content||busy||send.disabled||!item)return;
    if(content.length>4000){status('chat.long');return;}
    const key=selected;
    if(!conversations.has(key))conversations.set(key,[]);
    const history=conversations.get(key);history.push({role:'user',text:content});renderLog();
    input.value='';busy=true;refresh();status('chat.thinking');
    try {
      const response=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:key,message:content,confirm:true}),signal:AbortSignal.timeout(125000)});
      const data=await response.json();if(!response.ok)throw Error(data.error||'chat.resumeFailed');
      if(data.session!==key||typeof data.text!=='string')throw Error('chat.resumeFailed');
      history.push({role:'assistant',text:data.text});
    }catch(error){
      history.push({role:'assistant',text:i18n.t(error.message.startsWith('chat.')?error.message:'chat.resumeFailed')});
      // Do not silently retry: a failed response may still have appended to the real session.
    }finally {
      busy=false;confirm.checked=false;renderLog();await load();input.focus();
    }
  };
  load();setInterval(load,5000);
})();
