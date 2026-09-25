// Requires a running Vite/preview server and Chrome started with --remote-debugging-port=9222.
// No browser automation dependency is installed; this uses the native Chrome DevTools protocol.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { checkVertical } from './vertical-browser-check.mjs';
import { checkGameplay, selectMode } from './gameplay-browser-check.mjs';
import { checkVehicles, approachGarage } from './vehicle-browser-check.mjs';

const target = process.argv[2] ?? 'http://127.0.0.1:5173/';
const production = process.argv.includes('--production');
const mode = production ? 'production' : 'development';
const tabs = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
const pending = new Map(), errors = [], warnings = []; let id = 0;
ws.addEventListener('close',()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Chrome DevTools connection closed during validation'));}pending.clear();});
ws.addEventListener('message', event => {
  const data = JSON.parse(event.data);
  if (data.id) {
    const p = pending.get(data.id); if(!p)return;pending.delete(data.id);clearTimeout(p.timer);
    if (data.error) p.reject(data.error); else p.resolve(data.result);
  } else if (data.method === 'Runtime.exceptionThrown') errors.push(data.params);
  else if (data.method === 'Log.entryAdded') {
    if (data.params.entry.level === 'error') errors.push(data.params.entry);
    if (data.params.entry.level === 'warning') warnings.push(data.params.entry);
  }
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => { const next = ++id;const timer=setTimeout(()=>{pending.delete(next);reject(new Error(`Chrome timeout: ${method}`));},30000);pending.set(next, { resolve, reject,timer }); ws.send(JSON.stringify({ id: next, method, params })); });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result?.value;
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const stats = () => evaluate(`JSON.parse(document.querySelector('#debug-panel').dataset.stats)`);
const key = async (code, value, keyCode, down) => send('Input.dispatchKeyEvent', { type: down ? 'keyDown' : 'keyUp', code, key: value, windowsVirtualKeyCode: keyCode });
async function press(code, value, keyCode) { await key(code, value, keyCode, true); await key(code, value, keyCode, false); }
async function click(selector) {
  const p = await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...p, button: 'left', clickCount: 1 });
  return p;
}
async function quality(level) {
  await evaluate(`(()=>{const select=document.querySelector('#quality-select');select.value=${JSON.stringify(level)};select.dispatchEvent(new Event('change'))})()`);
  await pause(1500);
}
async function screenshot(name) {
  await writeFile(`artifacts/${name}.png`, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
}

try {
  await mkdir('artifacts', { recursive: true });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: target }); await send('Page.bringToFront');
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    await pause(200);
    if (await evaluate(`Boolean(document.querySelector('#debug-panel')?.dataset.stats)`)) { ready = true; break; }
  }
  assert.ok(ready, `Scene failed to start: ${JSON.stringify(errors.slice(0,2))}`);
  assert.equal(await evaluate(`document.querySelector('#error').textContent`), '');
  assert.match(await evaluate('document.title'), /Vehicles & Pursuit/);
  let state = await stats();
  assert.equal(state.seed, 1989); assert.equal(state.chunks, 64); assert.equal(state.landmarks, 3); assert.equal(state.totalBuildings, 210);
  assert.equal(state.cars, 20); assert.equal(state.pedestrians, 10); assert.equal(state.rain, 1800);
  const gpu = await evaluate(`(()=>{const gl=document.querySelector('#viewport canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),browser:navigator.userAgent,dpr:devicePixelRatio,width:innerWidth,height:innerHeight}})()`);
  await screenshot(`vertical-city-${mode}`);
  await press('F3', 'F3', 114); assert.equal(await evaluate(`document.querySelector('#debug-panel').hidden`), false);
  await press('F3', 'F3', 114); assert.equal(await evaluate(`document.querySelector('#debug-panel').hidden`), true);
  await click('#settings-toggle'); await click('#rain-enabled'); await pause(350);
  assert.equal((await stats()).rain, 0);
  await click('#rain-enabled');
  await evaluate(`(()=>{const slider=document.querySelector('#rain-intensity');slider.value='0.5';slider.dispatchEvent(new Event('input'))})()`); await pause(350);
  assert.equal((await stats()).rain, 900);
  await evaluate(`(()=>{const slider=document.querySelector('#rain-intensity');slider.value='1';slider.dispatchEvent(new Event('input'));const volume=document.querySelector('#master-volume');volume.value='0';volume.dispatchEvent(new Event('input'))})()`);
  await pause(300); assert.equal((await stats()).volume, 0);
  await click('#settings-close');
  await click('#enter'); await pause(400);
  assert.equal(await evaluate('!!document.pointerLockElement'), true);
  const before = await stats();
  await key('KeyW', 'w', 87, true); await pause(850); await key('KeyW', 'w', 87, false); await pause(200);
  const walked = await stats();
  const walkDistance = Math.hypot(walked.position[0] - before.position[0], walked.position[2] - before.position[2]);
  assert.ok(walkDistance > 2, 'W movement');
  await key('ShiftLeft', 'Shift', 16, true); await key('KeyZ', 'z', 90, true); await pause(850);
  await key('KeyZ', 'z', 90, false); await key('ShiftLeft', 'Shift', 16, false); await pause(200);
  const sprinted = await stats();
  assert.ok(Math.hypot(sprinted.position[0] - walked.position[0], sprinted.position[2] - walked.position[2]) > walkDistance * 1.4, 'Z + sprint');
  assert.equal(sprinted.audio, 'running');
  await pause(300);
  const groundY=(await stats()).position[1];
  await key('Space',' ',32,true);await pause(280);const jumped=await stats();
  assert.ok(jumped.position[1]>groundY+.35,'jump lifts the player');
  await key('Space',' ',32,false);await pause(950);assert.equal((await stats()).grounded,true);
  await key('ControlLeft','Control',17,true);await pause(350);assert.equal((await stats()).crouching,true);
  assert.ok((await stats()).position[1]<groundY-.5);
  await key('ControlLeft','Control',17,false);await pause(350);assert.equal((await stats()).crouching,false);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 960, y: 300, button: 'none' }); await pause(350);
  assert.notEqual((await stats()).heading, sprinted.heading, 'PointerLock mouse orientation');
  await evaluate('document.exitPointerLock()'); await pause(250);
  assert.equal(await evaluate(`document.querySelector('#menu').hidden`), false);
  assert.match(await evaluate(`document.querySelector('#coordinates').textContent`), new RegExp(`Z ${Math.round((await stats()).position[2])}`));
  assert.notDeepEqual(before.train, (await stats()).train, 'Train movement');
  console.log(`${mode}: UI, rain, FPS, sprint, mouse, mini-map, train, audio and pause passed`);

  if (!production) {
    await evaluate(`(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/systems/LivingCity.js')).name;const {LivingCity}=await import(url);const update=LivingCity.prototype.update;LivingCity.prototype.update=function(dt){globalThis.__testLiving=this;return update.call(this,dt)}})()`);
    for (let attempt = 0; attempt < 20; attempt++) { if (await evaluate('Boolean(globalThis.__testLiving)')) break; await pause(100); }
    assert.equal(await evaluate('Boolean(globalThis.__testLiving)'), true, 'Attach to the current Vite module, including its HMR timestamp');
    for (const [x, z, name] of [[-64, -53, 'Old Gotham'], [64, -20, 'Downtown'], [-64, 110, 'Industrial District'], [224, 128, 'Docks']]) {
      await evaluate(`__testLiving.camera.position.set(${x},1.75,${z});__testLiving.camera.lookAt(${x},5,${z - 30})`); await pause(400);
      assert.equal((await stats()).district, name);
      assert.equal(await evaluate('__testLiving.city.collides(__testLiving.camera.position.x,__testLiving.camera.position.z)'), false);
      assert.equal(await evaluate(`document.querySelector('#district-name').textContent`), name.toUpperCase());
    }
    // Real input against a generated facade, including sprint and the V2 collision solver.
    const wall = await evaluate(`(()=>{const city=__testLiving.city;return city.buildings.find(b=>!city.collides((b.minX+b.maxX)/2,b.maxZ+3))})()`);
    const x = (wall.minX + wall.maxX) / 2;
    await evaluate(`__testLiving.camera.position.set(${x},1.75,${wall.maxZ + 3});__testLiving.camera.lookAt(${x},1.75,${wall.minZ})`);
    await click('#enter'); await pause(100); await key('KeyW', 'w', 87, true); await key('ShiftLeft', 'Shift', 16, true); await pause(900);
    await key('KeyW', 'w', 87, false); await key('ShiftLeft', 'Shift', 16, false); await pause(150);
    assert.ok((await stats()).position[2] >= wall.maxZ + 0.42);
    await evaluate('document.exitPointerLock()'); await pause(200);
    await checkVertical({evaluate,stats,press,pause,click,screenshot});
    await checkGameplay({evaluate,stats,key,press,pause,click,screenshot,production});
    await evaluate('__testLiving.vertical.player.physics.teleport(__testLiving.camera.position.clone().set(0,1.75,54));__testLiving.camera.lookAt(11,12,-65)');
    assert.equal(await evaluate('__testLiving.traffic.cars.slice(0,__testLiving.traffic.count).every(c=>!__testLiving.city.collides(c.position.x,c.position.z,2.3))'), true);
    console.log('development: all districts, collision and road trajectory checks passed');
  } else {
    // Production uses public UI and native input only, with no test globals.
    await send('Page.navigate', { url: target }); await pause(3000);
    const mouse=await click('#enter');await pause(300);
    await key('KeyA','a',65,true);await pause(5600);await key('KeyA','a',65,false);await pause(400);
    for(let attempt=0;attempt<16 && (await stats()).position[0]>-31.6;attempt++) {
      await key('KeyA','a',65,true);await pause(80);await key('KeyA','a',65,false);await pause(300);
    }
    await key('KeyW','w',87,true);await pause(140);await key('KeyW','w',87,false);await pause(350);
    assert.match(await evaluate(`document.querySelector('#interaction-prompt').textContent`),/Ouvrir/,'Municipal entrance approached from spawn');
    await press('KeyE','e',69);await pause(650);await press('KeyE','e',69);await pause(400);
    assert.equal((await stats()).zone,'interior');
    await screenshot('vertical-city-production-interior');
    for(let attempt=0;attempt<20;attempt++) {
      const heading=(await stats()).heading;
      const error=Math.atan2(Math.sin(heading-Math.PI),Math.cos(heading-Math.PI));
      if(Math.abs(error)<.05)break;
      mouse.x+=Math.max(-200,Math.min(200,error/.0013));
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...mouse,button:'none'});await pause(300);
    }
    assert.match(await evaluate(`document.querySelector('#interaction-prompt').textContent`),/Ouvrir/,'Interior exit aimed with pointer lock');
    await press('KeyE','e',69);await pause(650);await press('KeyE','e',69);await pause(400);
    assert.equal((await stats()).zone,'exterior');
    console.log('production: native keyboard/mouse door, interior entry and exit passed');
    await checkGameplay({evaluate,stats,key,press,pause,click,screenshot,production});
    // Restore the exact same initial benchmark view as development.
    await send('Page.navigate',{url:target});await pause(3000);
  }
  await checkVehicles({evaluate,stats,key,press,pause,click,screenshot,send,production});
  await send('Page.navigate',{url:target});await pause(3000);
  await selectMode(evaluate,pause,'VIGILANTE');
  const benchmarkMouse=await click('#enter');await pause(300);
  // Face the nearby events so AI is actually active during the benchmark.
  for(let attempt=0;attempt<15;attempt++) {
    const heading=(await stats()).heading,error=Math.atan2(Math.sin(heading+1.5),Math.cos(heading+1.5));
    if(Math.abs(error)<.03)break;
    benchmarkMouse.x+=Math.max(-200,Math.min(200,error/.0013));
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...benchmarkMouse,button:'none'});await pause(300);
  }
  const benchmark = [];
  for (const level of ['LOW', 'MEDIUM', 'HIGH']) {
    await quality(level); state = await stats();
    assert.equal(state.cars, { LOW: 10, MEDIUM: 20, HIGH: 40 }[level]);
    assert.equal(state.pedestrians, { LOW: 0, MEDIUM: 10, HIGH: 25 }[level]);
    const measured = await evaluate(`new Promise(resolve=>{let frames=0,start=null,last=0,calls=0,triangles=0,aiMs=0,activeAI=0;const sample=t=>{if(start===null)start=t;frames++;last=t;calls+=JSON.parse(document.querySelector('#debug-panel').dataset.stats).drawCalls;triangles+=JSON.parse(document.querySelector('#debug-panel').dataset.stats).triangles;aiMs+=JSON.parse(document.querySelector('#debug-panel').dataset.stats).aiUpdateMs;activeAI+=JSON.parse(document.querySelector('#debug-panel').dataset.stats).activeAI;if(t-start<6000)requestAnimationFrame(sample);else resolve({fps:(frames-1)*1000/(last-start),drawCalls:calls/frames,triangles:triangles/frames,aiMs:aiMs/frames,activeAI:activeAI/frames,seconds:(last-start)/1000})};requestAnimationFrame(sample)})`);
    benchmark.push({ level, ...measured, ...(await stats()), measuredFPS: measured.fps, measuredDrawCalls: measured.drawCalls });
    console.log(mode, level, measured);
  }
  assert.ok((await stats()).turns > 0); assert.ok((await stats()).redStops > 0);
  await evaluate('document.exitPointerLock()');await pause(200);
  await send('Page.navigate',{url:target});await pause(3000);await selectMode(evaluate,pause,'VIGILANTE');
  await approachGarage({evaluate,stats,key,press,pause,click,send});
  const drivingBenchmark=[];
  for(const level of ['LOW','MEDIUM','HIGH']) {
    await quality(level);await selectMode(evaluate,pause,'EXPLORATION');await selectMode(evaluate,pause,'VIGILANTE');
    await evaluate(`(()=>{const s=document.querySelector('#vehicle-mission-choice');s.value='evade';s.dispatchEvent(new Event('change'))})()`);
    await press('KeyM','m',77);await pause(1000);
    const measured=await evaluate(`new Promise(resolve=>{let start=null,frames=0,calls=0,triangles=0,cpu=0,units=0;const sample=t=>{start??=t;frames++;const s=JSON.parse(document.querySelector('#debug-panel').dataset.stats);calls+=s.drawCalls;triangles+=s.triangles;cpu+=s.vehicleUpdateMs;units+=s.policeUnits;if(t-start<6000)requestAnimationFrame(sample);else resolve({fps:(frames-1)*1000/(t-start),drawCalls:calls/frames,triangles:triangles/frames,vehicleMs:cpu/frames,policeUnits:units/frames,seconds:(t-start)/1000})};requestAnimationFrame(sample)})`);
    drivingBenchmark.push({level,...measured,stats:await stats()});console.log(mode,'DRIVING',level,measured);
  }
  await press('F3', 'F3', 114); await pause(350);
  assert.match(await evaluate(`document.querySelector('#debug-panel').textContent`), /FPS/);
  await screenshot(`vehicles-${mode}-debug`);
  assert.deepEqual(errors, []);
  const report = { mode, target, gpu, benchmark, drivingBenchmark, errors, warnings, checks: 'passed', date: new Date().toISOString() };
  await writeFile(`artifacts/benchmark-${mode}.json`, JSON.stringify(report, null, 2));
  console.log(`${mode}: complete; ${warnings.length} browser warnings`);
} finally {
  ws.close();
}

