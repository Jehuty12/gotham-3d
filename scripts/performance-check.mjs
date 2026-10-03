import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { connectChrome } from './cdp.mjs';
const c=await connectChrome(),runs=[];
try{
  await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  for(let repeat=0;repeat<3;repeat++)for(const [version,url] of [['V9',process.argv[2]??'http://127.0.0.1:4199/'],['V10',process.argv[3]??'http://127.0.0.1:4177/']]){
    await c.send('Page.navigate',{url});await c.pause(3000);await c.evaluate("localStorage.clear()");await c.click('#enter');await c.pause(1800);
    await c.evaluate("const q=document.querySelector('#quality-select');q.value='HIGH';q.dispatchEvent(new Event('change',{bubbles:true}))");await c.pause(1500);
    await c.send('Profiler.enable');await c.send('Profiler.start');
    const frames=await c.evaluate(`new Promise(resolve=>{let start,last;const values=[];function frame(t){if(last!==undefined)values.push(t-last);last=t;start??=t;if(t-start<6000)requestAnimationFrame(frame);else {const slow=values.slice().sort((a,b)=>b-a).slice(0,Math.ceil(values.length*.01));resolve({fps:1000/(values.reduce((a,b)=>a+b,0)/values.length),low1:1000/(slow.reduce((a,b)=>a+b,0)/slow.length),meanMs:values.reduce((a,b)=>a+b,0)/values.length,maxMs:Math.max(...values),over20:values.filter(t=>t>20).length,over33:values.filter(t=>t>33).length});}}requestAnimationFrame(frame);})`);
    const {profile}=await c.send('Profiler.stop'),cpu=profile.nodes.map(n=>({function:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber,hits:n.hitCount??0})).sort((a,b)=>b.hits-a.hits).slice(0,15);
    runs.push({version,repeat,...frames,stats:await c.stats(),cpuSamples:profile.samples?.length,topCpu:cpu});console.log(version,repeat,frames.fps.toFixed(2),'FPS',frames.meanMs.toFixed(3),'ms');
  }
  assert.deepEqual(c.errors,[]);assert.deepEqual(c.warnings,[]);await mkdir('artifacts',{recursive:true});await writeFile('artifacts/performance-ab.json',JSON.stringify({date:new Date().toISOString(),method:'Interleaved production bundles, same Chrome, HIGH, spawn camera, exploration, 6s windows; sampling profiler enabled equally. V9 bundle retained before V10 build.',runs,errors:c.errors,warnings:c.warnings},null,2));
}finally{c.close();}
