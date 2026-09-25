import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { connectChrome } from './cdp.mjs';

const target=process.argv[2]??'http://127.0.0.1:5177/';
const c=await connectChrome(),samples=[],routeSamples=[];const started=Date.now();
async function attach(){await c.evaluate(`(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/systems/LivingCity.js'))?.name;if(!url)throw Error('Soak fixtures require the development server; production is covered by browser-check --production.');const {LivingCity}=await import(url);const update=LivingCity.prototype.update;LivingCity.prototype.update=function(dt){globalThis.__soak=this;return update.call(this,dt)}})()`);await c.pause(100);}
async function play(){await c.click('#enter');if(await c.evaluate("!document.querySelector('#new-game-confirm').hidden"))await c.click('#confirm-new');await c.pause(400);}
try{
  await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await c.send('Page.navigate',{url:target});await c.pause(3500);await attach();await play();
  await c.evaluate(`__soak.setQuality('MEDIUM');__soak.gameplay.setMode('VIGILANTE')`);
  const route=[[-192,-128],[128,-192],[192,192],[-128,192],[0,54]];
  for(let cycle=0;cycle<9;cycle++){
    for(const [x,z] of route){await c.evaluate(`__soak.vertical.player.physics.teleport(__soak.camera.position.clone().set(${x},1.75,${z}))`);await c.pause(650);routeSamples.push({cycle,...await c.stats()});}
    await c.evaluate(`(()=>{const l=__soak,g=l.gameplay,v=g.vehicles;g.missions.finish(true);const offered=g.missions.offer(l.camera.position);if(offered)g.missions.activate(offered.id);l.rain.setEnabled(${cycle%2===0});l.camera.position.copy(v.vehicle.position).add({x:2.4,y:1.75,z:0});l.vertical.player.physics.grounded=true;v.enter();})()`);
    await c.pause(450);await c.evaluate(`__soak.gameplay.vehicles.exit();__soak.vertical.player.physics.teleport(__soak.camera.position.clone().set(0,1.75,54));document.exitPointerLock()`);await c.pause(350);
    const frozen=await c.stats();await c.pause(350);assert.equal((await c.stats()).time,frozen.time,'Paused simulation');await play();await c.pause(2600);
    const sample=await c.stats();samples.push({cycle,seconds:(Date.now()-started)/1000,...sample});console.log('soak',cycle,JSON.stringify({fps:sample.fps,geometries:sample.geometries,textures:sample.textures,objects:sample.activeObjects,chunks:sample.chunksLoaded,loads:sample.chunkLoads,unloads:sample.chunkUnloads}));
    if(cycle===4){await c.evaluate('__soak.runtime.save.write()');await c.send('Page.reload');await c.pause(3000);await c.click('#continue-game');await c.pause(500);await attach();}
  }
  const baseline=samples[1],last=samples.at(-1);
  assert.ok(last.geometries<=baseline.geometries+8,'Geometry count must plateau after warmup');assert.ok(last.textures<=baseline.textures+4,'Texture count must plateau');assert.ok(last.activeObjects<=baseline.activeObjects+80,'Objects at same route endpoint must plateau');
  for(const s of samples){assert.equal(s.chunks,64);assert.ok(s.chunksLoaded<64);assert.ok(s.totalEnemies<=20);assert.ok(s.cars<=20);assert.ok(s.chunksPending<64);for(const pool of s.pools)assert.ok(pool.active<=pool.capacity,pool.name);}
  assert.deepEqual(c.errors,[]);assert.deepEqual(c.warnings,[]);
  const meanChunks=routeSamples.reduce((sum,s)=>sum+s.chunksLoaded,0)/routeSamples.length;
  await mkdir('artifacts',{recursive:true});await writeFile('artifacts/soak-development.json',JSON.stringify({target,seconds:(Date.now()-started)/1000,date:new Date().toISOString(),checks:'passed',meanChunks,baseline,last,samples,routeSamples,errors:c.errors,warnings:c.warnings},null,2));
  console.log('Soak passed:',((Date.now()-started)/1000).toFixed(1),'seconds');
}finally{c.close();}
