export async function connectChrome(){
  const tabs=await(await fetch('http://127.0.0.1:9222/json/list')).json(),tab=tabs.find(t=>t.type==='page');
  if(!tab)throw Error('Start Chrome with --remote-debugging-port=9222');
  const ws=new WebSocket(tab.webSocketDebuggerUrl),pending=new Map(),errors=[],warnings=[];let serial=0;
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);else if(m.method==='Log.entryAdded'){const entry=m.params.entry;if(entry.level==='error')errors.push(entry);if(entry.level==='warning')warnings.push(entry);}});
  ws.addEventListener('close',()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Chrome disconnected'));}pending.clear();});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('Chrome timeout: '+method));},30000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const click=async selector=>{const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...p,button:'left',clickCount:1});};
  const stats=()=>evaluate("JSON.parse(document.querySelector('#debug-panel').dataset.stats)");
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
  return {send,evaluate,pause,click,stats,errors,warnings,close:()=>ws.close()};
}
