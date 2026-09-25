import assert from 'node:assert/strict';

export async function checkPersistence({evaluate,stats,key,press,pause,click,send,screenshot,target,production,approachGarage}) {
  await evaluate('document.exitPointerLock()');await pause(200);
  await send('Page.navigate',{url:target});await pause(3000);
  await evaluate(`(()=>{const s=document.querySelector('#game-mode');s.value='VIGILANTE';s.dispatchEvent(new Event('change'))})()`);
  await approachGarage({evaluate,stats,key,press,pause,click,send});
  assert.equal((await stats()).driving,true);
  await key('KeyW','w',87,true);await pause(1000);await key('KeyW','w',87,false);
  await key('Space',' ',32,true);await pause(900);await key('Space',' ',32,false);await pause(400);
  await evaluate('document.exitPointerLock()');await pause(300);
  const paused=await stats();await pause(700);const still=await stats();
  assert.equal(still.time,paused.time);assert.deepEqual(still.vehiclePosition,paused.vehiclePosition);assert.deepEqual(still.train,paused.train);assert.equal(still.sessionState,'PAUSED');
  await evaluate(`(()=>{const s=document.querySelector('#option-cameraMotion');s.value='0';s.dispatchEvent(new Event('input',{bubbles:true}));const q=document.querySelector('#quality-select');q.value='LOW';q.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await click('#save-game');await pause(250);
  const saved=await evaluate(`JSON.parse(localStorage.getItem('world-polish:save'))`);
  assert.equal(saved.mode,'VIGILANTE');assert.equal(saved.player.driving,true);assert.ok(saved.discoveries.length>0,'Garage discovered');assert.equal(saved.settings.cameraMotion,0);assert.equal(saved.settings.quality,'LOW');
  await send('Page.reload');await pause(3000);
  assert.equal(await evaluate(`document.querySelector('#continue-game').hidden`),false);
  await click('#continue-game');await pause(700);
  const restored=await stats();assert.equal(restored.driving,true);assert.equal(restored.gameMode,'VIGILANTE');assert.equal(restored.quality,'LOW');
  assert.ok(Math.hypot(...restored.vehiclePosition.map((v,i)=>v-saved.vehicle.position[i]))<.35,'Vehicle restored');
  assert.ok(Math.abs(restored.vehicleIntegrity-saved.vehicle.integrity)<.1);assert.deepEqual(restored.discoveries,saved.discoveries);
  assert.equal(await evaluate(`document.querySelector('#option-cameraMotion').value`),'0');
  await press('KeyE','e',69);await pause(500);assert.equal((await stats()).driving,false);
  if(!production){
    await evaluate(`(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/systems/LivingCity.js')).name;const {LivingCity}=await import(url);const update=LivingCity.prototype.update;LivingCity.prototype.update=function(dt){globalThis.__testLiving=this;return update.call(this,dt)}})()`);await pause(100);
    const before=await stats();
    for(const [x,z] of [[-192,-128],[128,-192],[192,192],[-128,192],[0,54]]){await evaluate(`__testLiving.vertical.player.physics.teleport(__testLiving.camera.position.clone().set(${x},1.75,${z}))`);await pause(500);const s=await stats();assert.ok(s.chunksLoaded<64);assert.equal(await evaluate('__testLiving.city.chunkAt(__testLiving.camera.position.x,__testLiving.camera.position.z).collisionsLoaded'),true);}
    const after=await stats();assert.ok(after.chunkLoads>before.chunkLoads);assert.ok(after.chunkUnloads>before.chunkUnloads);
  }else{
    // Actual street crossing in the production bundle, with no runtime globals.
    const before=await stats();await key('KeyW','w',87,true);await key('ShiftLeft','Shift',16,true);await pause(5000);await key('KeyW','w',87,false);await key('ShiftLeft','Shift',16,false);await pause(500);assert.ok((await stats()).chunksLoaded<64);assert.ok((await stats()).time>before.time);
  }
  await press('F3','F3',114);await pause(300);assert.match(await evaluate(`document.querySelector('#debug-panel').textContent`),/Streaming/);await screenshot(`persistence-${production?'production':'development'}`);
  console.log('V7: save, full reload, continue, garage discovery, settings, vehicle, pause and streaming passed');
}
