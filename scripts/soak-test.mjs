import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { connectChrome } from './cdp.mjs';

const target=process.argv[2]??'http://127.0.0.1:5177/';
const minimumSeconds=Number(process.argv.find(a=>a.startsWith('--seconds='))?.split('=')[1]??300);
const c=await connectChrome(),samples=[],routeSamples=[],artSamples=[],contentSamples=[];const started=Date.now();
async function attach(){await c.evaluate(`(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/systems/LivingCity.js'))?.name;if(!url)throw Error('Soak fixtures require the development server; production is covered by browser-check --production.');const {LivingCity}=await import(url);const update=LivingCity.prototype.update;LivingCity.prototype.update=function(dt){globalThis.__soak=this;return update.call(this,dt)}})()`);await c.pause(100);}
async function play(){await c.click('#enter');if(await c.evaluate("!document.querySelector('#new-game-confirm').hidden"))await c.click('#confirm-new');await c.pause(400);if(!await c.evaluate('!!document.pointerLockElement')){await c.pause(1000);await c.click('#enter');await c.pause(300);}assert.equal(await c.evaluate('__soak.runtime.state.state'),'PLAYING','Soak must run the simulation, not the menu');}
try{
  await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await c.send('Page.navigate',{url:target});await c.pause(3500);await attach();await play();
  await c.evaluate(`__soak.setQuality('MEDIUM');__soak.gameplay.setMode('VIGILANTE')`);
  const route=[[-192,-128],[128,-192],[192,192],[-128,192],[0,54]];
  for(let cycle=0;cycle<9||(Date.now()-started)/1000<minimumSeconds;cycle++){
    const checkpoint=await c.evaluate(`(()=>{const l=__soak,c=l.content,g=l.gameplay;c.reset();g.missions.clear();g.pursuit.clear();c.start('story-1');c.teleport(c.objective);l.runtime.transitions.remaining=0;c.update(.05);c.restart(false);return c.snapshot();})()`);
    assert.equal(checkpoint.contentCheckpoint,1);contentSamples.push({cycle,phase:'checkpoint',...checkpoint});
    const travel=await c.evaluate(`(()=>{const l=__soak,c=l.content;c.reset();l.gameplay.missions.clear();l.gameplay.enemies.clear();l.gameplay.pursuit.clear();c.discover('theatre');c.discover('garage');const a=c.fastTravel('theatre'),b=c.fastTravel('garage');return {a,b,loaded:l.city.isLoadedAt(l.camera.position.x,l.camera.position.z)};})()`);
    assert.deepEqual(travel,{a:true,b:true,loaded:true});contentSamples.push({cycle,phase:'fast-travel',...travel});await c.pause(300);
    const traversalCombat=await c.evaluate(`(()=>{const l=__soak,c=l.content,p=l.vertical.player.physics,g=l.gameplay,grapple=l.vertical.grapple;
      c.teleport(c.locations.point('relay'));const target=grapple.points.find(a=>a.compatible&&a.position.x===104.5&&Math.abs(a.position.z+160.432)<.1);grapple.step(.3);l.camera.lookAt(target.position);grapple.update(0);const engaged=grapple.use();for(let i=0;i<480&&grapple.active;i++)p.step(1/120,p.velocity.clone().set(0,0,0),{jump:false,crouch:false});const blocked=grapple.state==='blocked';grapple.cancel();p.grounded=false;p.vy=-2;let glide=0;for(let i=0;i<60;i++){p.step(1/120,p.velocity.clone().set(0,0,8),{jump:true,crouch:false});if(g.traversal.glide.active)glide++;}
      c.start('story-1');while(c.objective.kind!=='defeat')c.advance();c.teleport(c.objective);c.prepareStage();const enemies=g.enemies.enemies.filter(e=>e.eventId===c.encounter.id);let hits=0;for(const e of enemies)for(let i=0;i<3;i++){const eye=e.position.clone().add({x:0,y:1.2,z:0});p.teleport(eye.clone().add({x:0,y:0,z:1.2}));g.combat.update(.41);if(g.combat.attack([e],l.camera.position,eye.sub(l.camera.position).normalize()))hits++;}c.update(.05);c.reset();return {engaged,blocked,glide,hits};})()`);
    assert.ok(traversalCombat.engaged&&!traversalCombat.blocked&&traversalCombat.glide>0&&traversalCombat.hits>=6);contentSamples.push({cycle,phase:'grapple-glide-combat',...traversalCombat});
    for(const [x,z] of route){await c.evaluate(`__soak.vertical.player.physics.teleport(__soak.camera.position.clone().set(${x},1.75,${z}))`);await c.pause(650);routeSamples.push({cycle,...await c.stats()});}
    await c.evaluate(`(()=>{const l=__soak,g=l.gameplay,v=g.vehicles;g.missions.finish(true);const offered=g.missions.offer(l.camera.position);if(offered)g.missions.activate(offered.id);l.rain.setEnabled(${cycle%2===0});l.camera.position.copy(v.vehicle.position).add({x:2.4,y:1.75,z:0});l.vertical.player.physics.grounded=true;v.enter();})()`);
    await c.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyW',key:'w',windowsVirtualKeyCode:87});await c.pause(600);
    await c.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyW',key:'w',windowsVirtualKeyCode:87});
    artSamples.push({cycle,phase:'driving',...await c.stats()});
    await c.send('Input.dispatchKeyEvent',{type:'keyDown',code:'Space',key:' ',windowsVirtualKeyCode:32});await c.pause(800);
    await c.send('Input.dispatchKeyEvent',{type:'keyUp',code:'Space',key:' ',windowsVirtualKeyCode:32});
    await c.evaluate(`__soak.gameplay.vehicles.exit();__soak.vertical.interiors.enter(__soak.vertical.specs[${cycle%8}].id)`);await c.pause(300);artSamples.push({cycle,phase:'interior',...await c.stats()});
    await c.evaluate('__soak.vertical.interiors.exit();__soak.vertical.underground.enter()');await c.pause(300);
    await c.evaluate('__soak.vertical.underground.exit();__soak.vertical.player.physics.teleport(__soak.camera.position.clone().set(64,12.4,-128));__soak.rain.setEnabled(true);__soak.rain.setIntensity(.85)');await c.pause(500);
    artSamples.push({cycle,phase:'metro-rain',...await c.stats()});
    // Return with the same two cached interiors and the same residency envelope.
    await c.evaluate(`(()=>{const l=__soak;l.gameplay.missions.finish(true);for(const i of [0,1]){l.vertical.interiors.enter(l.vertical.specs[i].id);l.vertical.interiors.exit();}l.rain.setIntensity(1);})()`);
    await c.evaluate(`__soak.gameplay.vehicles.exit();__soak.vertical.player.physics.teleport(__soak.camera.position.clone().set(0,1.75,54));__soak.runtime.streaming.initialized=false;document.exitPointerLock()`);await c.pause(350);
    const frozen=await c.stats();await c.pause(350);assert.equal((await c.stats()).time,frozen.time,'Paused simulation');await play();await c.pause(2600);
    const sample={...await c.stats(),dom:await c.send('Memory.getDOMCounters')};samples.push({cycle,seconds:(Date.now()-started)/1000,...sample});console.log('soak',cycle,JSON.stringify({fps:sample.fps,geometries:sample.geometries,textures:sample.textures,objects:sample.activeObjects,chunks:sample.chunksLoaded,loads:sample.chunkLoads,unloads:sample.chunkUnloads}));
    if(cycle===4){await c.evaluate("__soak.content.start('story-1');__soak.content.advance();__soak.runtime.save.write()");await c.send('Page.reload');await c.pause(3000);await c.click('#continue-game');await c.pause(500);await attach();assert.equal(await c.evaluate('__soak.content.active.checkpoint'),1);assert.equal(await c.evaluate("JSON.parse(localStorage.getItem('world-polish:save')).version"),2);contentSamples.push({cycle,phase:'reload',checkpoint:1,version:2});}
  }
  const baseline=samples[2],last=samples.at(-1);
  assert.ok(last.geometries<=baseline.geometries+8,'Geometry count must plateau after warmup');assert.ok(last.textures<=baseline.textures+4,'Texture count must plateau');assert.ok(last.activeObjects<=baseline.activeObjects+80,'Objects at same route endpoint must plateau');
  for(const s of samples){assert.equal(s.chunks,64);assert.ok(s.chunksLoaded<64);assert.ok(s.totalEnemies<=20);assert.ok(s.cars<=20);assert.ok(s.chunksPending<64);for(const pool of s.pools)assert.ok(pool.active<=pool.capacity,pool.name);}
  assert.equal(last.decorativeInstancesLoaded,baseline.decorativeInstancesLoaded,'Art recipes must return to the same resident allocation');
  assert.ok(artSamples.some(s=>s.phase==='driving'&&s.driving&&Math.abs(s.vehicleSpeed)>.5),'Soak includes actual driving');
  assert.ok(artSamples.some(s=>s.phase==='interior'&&s.activeInterior));assert.ok(artSamples.some(s=>s.phase==='metro-rain'&&s.rain>0));
  assert.deepEqual(c.errors,[]);assert.deepEqual(c.warnings,[]);
  const heaps=samples.map(s=>s.heapMB).filter(Number.isFinite),heapMin=Math.min(...heaps),heapMax=Math.max(...heaps);
  const meanChunks=routeSamples.reduce((sum,s)=>sum+s.chunksLoaded,0)/routeSamples.length;
  await mkdir('artifacts',{recursive:true});await writeFile('artifacts/soak-development.json',JSON.stringify({target,seconds:(Date.now()-started)/1000,date:new Date().toISOString(),checks:'passed',minimumSeconds,heapMin,heapMax,meanChunks,baseline,last,samples,routeSamples,artSamples,contentSamples,errors:c.errors,warnings:c.warnings},null,2));
  console.log('Soak passed:',((Date.now()-started)/1000).toFixed(1),'seconds');
}finally{c.close();}
