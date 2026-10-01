import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { connectChrome } from './cdp.mjs';

const target=process.argv[2]??'http://127.0.0.1:5177/';
const views=[
  {name:'downtown',position:[64,7,-51],look:[93,65,-110]},
  {name:'old-gotham',position:[-128,4,-134],look:[-156,17,-174]},
  {name:'industrial',position:[-128,5,129],look:[-163,20,166]},
  {name:'docks',position:[195,4,128],look:[232,16,159]},
  {name:'cathedral',position:[-32,5,-57],look:[-32,46,-96]},
  {name:'meridian',position:[32,6,-51],look:[32,87,-96]},
  {name:'municipal',position:[-59,16,76],look:[-32,17,32]},
  {name:'metro',position:[65,12,-104],look:[64,13,-128]},
  {name:'interior',interior:true},
  {name:'rain',position:[64,2,-60],look:[100,9,-96],rain:1},
];
const c=await connectChrome(),results=[];
try{
  await mkdir('artifacts/visual',{recursive:true});
  await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  for(const view of views){
    // Fresh load fixes traffic random streams, camera, time and weather per view.
    await c.send('Page.navigate',{url:target});
    for(let i=0;i<100;i++){await c.pause(100);if(await c.evaluate("Boolean(document.querySelector('#debug-panel')?.dataset.stats)"))break;}
    await c.evaluate(`(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/systems/LivingCity.js'))?.name;if(!url)throw Error('visual-check requires the dev server');const {LivingCity}=await import(url);const original=LivingCity.prototype.update;LivingCity.prototype.update=function(dt){globalThis.__visual=this;return original.call(this,dt)}})()`);
    await c.pause(80);
    const fixture=await c.evaluate(`(()=>{
      const l=__visual,v=${JSON.stringify(view)};l.setQuality('HIGH');l.runtime.state.pause();
      l.time=180;l.accumulator=0;l.rain.setEnabled(true);l.rain.setIntensity(v.rain??.45);l.runtime.weather.wet=.85;
      l.runtime.options.settings.cameraMotion=0;l.runtime.options.settings.stormEnabled=false;l.runtime.options.settings.colorGrading='DEFAULT';
      if(v.interior){l.vertical.interiors.enter(l.vertical.specs.find(s=>s.type==='municipal').id);}else{l.camera.position.fromArray(v.position);l.camera.lookAt(...v.look);}
      l.runtime.streaming.ensureAt(l.camera.position);l.performance.updateVisibility(l.camera);l.vertical.update(0);
      for(let i=0;i<120;i++)l.runtime.weather.update(.1);l.runtime.atmosphere.update(1);
      document.querySelector('#menu').hidden=true;document.body.classList.add('visual-capture');
      const style=document.createElement('style');style.textContent='body.visual-capture #app>:not(#viewport),body.visual-capture> :not(#app):not(script):not(style){visibility:hidden!important}';document.head.append(style);
      return {position:l.camera.position.toArray(),quaternion:l.camera.quaternion.toArray(),time:l.time,rain:l.rain.intensity,seed:l.city.seed};
    })()`);
    await c.pause(1400);
    const stats=await c.stats();
    const render=await c.evaluate('({drawCalls:__visual.renderer.info.render.calls,triangles:__visual.renderer.info.render.triangles})');
    assert.equal(stats.seed,1989);assert.ok(render.drawCalls>0);assert.equal(stats.time,180);
    if(view.interior){assert.equal(stats.zone,'interior');assert.equal(await c.evaluate('__visual.rain.mesh.visible'),false);}
    const png=await c.send('Page.captureScreenshot',{format:'png'});
    await writeFile(`artifacts/visual/${view.name}.png`,Buffer.from(png.data,'base64'));
    results.push({name:view.name,fixture,...render,visibleBuildings:stats.buildings,props:stats.visibleProps,signs:stats.visibleSigns,lights:stats.dynamicLights,facadeInstances:stats.facadeInstances,geometries:stats.geometries,textures:stats.textures});
    console.log('visual',view.name,render.drawCalls,'calls');
  }
  assert.deepEqual(c.errors,[]);assert.deepEqual(c.warnings,[]);
  await writeFile('artifacts/visual/metrics.json',JSON.stringify({date:new Date().toISOString(),target,viewport:[1440,900],checks:'passed',comparison:'No perceptual comparison implemented; fixed fixtures and render metrics only.',views:results,errors:c.errors,warnings:c.warnings},null,2));
}finally{c.close();}
