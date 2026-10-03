import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { contentFixture } from './content-fixture.mjs';
import { completeRuntimeObjective } from './campaign-runtime.mjs';
import { SaveManager } from '../src/save/SaveManager.js';

const results=[];await mkdir('artifacts',{recursive:true});
for(const route of ['STREET','ROOFTOP','INTERIOR']){
  const f=contentFixture(),c=f.content,l=f.living,storage=new Map(),save=new SaveManager({getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},{capture:()=>f.persistence.capture()});
  try{l.gameplay.setMode('VIGILANTE');
    for(let n=1;n<=7;n++){
      const id=`story-${n}`,m=c.missions.find(m=>m.definition.id===id);assert.equal(m.state,'AVAILABLE');assert.ok(c.start(id,route));const steps=[];
      while(c.active){assert.equal(c.active.definition.id,id);assert.ok(steps.length<20);steps.push(completeRuntimeObjective(f));if(c.active){const checkpoint=c.active.checkpoint;assert.ok(save.write());assert.ok(f.persistence.restore(save.read()));assert.equal(c.active.checkpoint,checkpoint);assert.equal(c.active.definition.id,id);}}
      assert.ok(c.completed.has(id));const earned=c.upgrades.earned;assert.equal(c.start(id),false);assert.equal(c.upgrades.earned,earned);assert.ok(save.write());assert.ok(f.persistence.restore(save.read()));
      if(n<7)assert.equal(c.missions.find(m=>m.definition.id===`story-${n+1}`).state,'AVAILABLE');
      results.push({mission:id,route,result:'PASS',steps});console.log(`MISSION ${n} PASS (${route}, ${steps.length} runtime objectives, checkpoint reloads)`);
    }
    assert.equal(c.snapshot().storyProgress,7);
  }finally{f.dispose();}
}
await writeFile('artifacts/campaign-check.json',JSON.stringify({date:new Date().toISOString(),checks:'passed',missions:7,routes:3,results,method:'Actual runtime objective actions; travel, follow distance and concealed pursuit are fixtures, not human playtime. Save/reload at every checkpoint and between missions.'},null,2));
