import assert from 'node:assert/strict';

export async function checkContent({evaluate,stats,pause,press,click,send,screenshot,production,target}){
  await press('Tab','Tab',9);await pause(200);assert.equal(await evaluate("document.querySelector('#content-screen').hidden"),false);
  assert.match(await evaluate("document.querySelector('#content-screen').textContent"),/Les heures effacées/);
  assert.ok(await evaluate("document.querySelector('#start-story-1')&&!document.querySelector('#start-story-1').disabled"));
  await evaluate("document.querySelector('#start-story-1').scrollIntoView({block:'center'})");await click('#start-story-1');await pause(500);assert.equal((await stats()).contentMission,'story-1');
  await evaluate('document.exitPointerLock()');await pause(250);await click('#restart-checkpoint');await pause(350);assert.equal((await stats()).contentCheckpoint,0);
  await click('#save-game');await pause(200);const dto=await evaluate("JSON.parse(localStorage.getItem('world-polish:save'))");assert.equal(dto.version,2);assert.equal(dto.content.missions['story-1'].state,'ACTIVE');
  await send('Page.reload');await pause(3500);await click('#continue-game');await pause(500);assert.equal((await stats()).contentMission,'story-1');
  await press('Tab','Tab',9);await pause(150);
  for(const tab of ['LORE','DISCOVERIES','UPGRADES','MISSIONS']){await click(`[data-content-tab="${tab}"]`);await pause(70);assert.ok(await evaluate("document.querySelector('.content-list h3').textContent.length>0"));}
  await screenshot(`content-${production?'production':'development'}-journal`);await click('#content-close');await pause(300);
  if(!production){
    await evaluate(`(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/systems/LivingCity.js')).name;const {LivingCity}=await import(url);const update=LivingCity.prototype.update;LivingCity.prototype.update=function(dt){globalThis.__contentCheck=this;return update.call(this,dt)}})()`);await pause(80);
    // Physical scenes and runtime evidence, using fixtures for travel/AI outcomes.
    // This validates progression plumbing, not human completion time or tactics.
    for(let i=0;i<9;i++){
      const before=await evaluate('({id:__contentCheck.content.active?.definition.id,index:__contentCheck.content.active?.index,kind:__contentCheck.content.objective?.kind})');if(!before.id)break;
      await evaluate(`(()=>{const l=__contentCheck,c=l.content,o=c.objective;c.teleport(o);l.runtime.transitions.remaining=0;const g=l.gameplay;
        if(o.kind==='scan'){g.scanner.cooldown=0;g.scanner.activate();c.active.progress=o.duration;}
        if(o.kind==='inspect')c.interact();
        if(o.kind==='observe'){l.camera.position.x-=1;l.camera.lookAt(...o.position);c.active.progress=o.duration;}
        if(o.kind==='defeat'){c.prepareStage();for(const e of g.enemies.enemies.filter(e=>e.eventId===c.encounter?.id))e.hit(3);}
        c.update(.05);
      })()`);await pause(100);
      const after=await evaluate('({id:__contentCheck.content.active?.definition.id,index:__contentCheck.content.active?.index})');
      assert.ok(after.id!==before.id||after.index>before.index,`Objective advances: ${before.kind}`);
    }
    assert.equal(await evaluate('__contentCheck.content.completed.has("story-1")'),true);
    const travelled=await evaluate(`(()=>{const c=__contentCheck.content;__contentCheck.gameplay.enemies.clear();__contentCheck.gameplay.missions.clear();__contentCheck.gameplay.pursuit.clear();c.discover('theatre');return c.fastTravel('theatre')})()`);assert.equal(travelled,true);await pause(350);
    assert.equal(await evaluate('__contentCheck.city.isLoadedAt(__contentCheck.camera.position.x,__contentCheck.camera.position.z)'),true);
    await evaluate('__contentCheck.runtime.save.write()');
  }
  console.log('V9: TAB map, selection, checkpoint restart, V2 reload, journal'+(!production?', introductory walkthrough and fast travel':'')+' passed');
  // New game in the caller restores the historical benchmark view and load.
  await send('Page.navigate',{url:target});await pause(3000);
}
