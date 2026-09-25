import assert from 'node:assert/strict';

export async function selectMode(evaluate,pause,mode) {
  await evaluate(`(()=>{const s=document.querySelector('#game-mode');s.value=${JSON.stringify(mode)};s.dispatchEvent(new Event('change'))})()`);await pause(350);
}
export async function checkGameplay({evaluate,stats,key,press,pause,click,screenshot,production}) {
  await selectMode(evaluate,pause,'EXPLORATION');assert.equal((await stats()).totalEnemies,0);assert.equal((await stats()).activeCrimes,0);
  await selectMode(evaluate,pause,'VIGILANTE');assert.ok((await stats()).activeCrimes>0);assert.ok((await stats()).availableMissions>0);
  if(!await evaluate('!!document.pointerLockElement')){await click('#enter');await pause(300);}
  await press('KeyM','m',77);await pause(300);assert.ok((await stats()).activeMission);
  await press('KeyV','v',86);await pause(300);assert.ok((await stats()).scanner>0);
  assert.match(await evaluate(`document.querySelector('#mission-hud').textContent`),/OBJECTIF/);
  if(!production) {
    // Fixtures reuse a real enemy slot; the actual E action and perception/combat execute normally.
    await evaluate(`(()=>{const g=__testLiving.gameplay,e=g.enemies.enemies[0];e.spawn(e.position.clone().set(0,0,50),'guard',e.eventId,0);g.noise.clear();g.player.physics.teleport(g.camera.position.clone().set(0,1.75,48.6));g.camera.lookAt(0,1.3,50)})()`);
    await pause(350);assert.match(await evaluate(`document.querySelector('#interaction-prompt').textContent`),/Neutraliser/);
    await press('KeyE','e',69);await pause(350);assert.ok((await stats()).disabled>=1);
    await evaluate(`(()=>{const g=__testLiving.gameplay,e=g.enemies.enemies[0];e.spawn(e.position.clone().set(0,0,50),'guard',e.eventId,0);e.state='ALERT';g.player.physics.teleport(g.camera.position.clone().set(0,1.75,51.2));g.camera.lookAt(0,1.3,50)})()`);
    await pause(1100);assert.ok((await stats()).health<100,'Enemy proximity damage');
    await evaluate(`__testLiving.gameplay.health.damage(100)`);await pause(400);assert.equal((await stats()).health,0);await pause(1600);assert.equal((await stats()).health,100);
    await selectMode(evaluate,pause,'EXPLORATION');await selectMode(evaluate,pause,'VIGILANTE');
    await evaluate(`(()=>{const g=__testLiving.gameplay,a=g.vertical.grapple.points.find(a=>a.position.y>16&&a.position.y<28&&!g.city.collides(a.position.x,a.position.z+7));g.player.physics.teleport(a.position.clone().add({x:0,y:-8,z:7}));g.camera.lookAt(a.position)})()`);
    await pause(150);await press('KeyG','g',71);await pause(300);assert.equal((await stats()).grappleState,'pulling');
    await key('Space',' ',32,true);await pause(1000);assert.equal((await stats()).glideState,true,'Grapple release into glide');
    assert.ok((await stats()).speed<43);await screenshot('vigilante-glide');
    await key('Space',' ',32,false);await pause(300);assert.equal((await stats()).glideState,false);
    await evaluate(`__testLiving.gameplay.player.physics.teleport(__testLiving.camera.position.clone().set(0,1.75,54));__testLiving.camera.lookAt(11,12,-65)`);
  }
  await screenshot(`vigilante-${production?'production':'development'}-gameplay`);
  await evaluate('document.exitPointerLock()');await pause(200);
  await selectMode(evaluate,pause,'EXPLORATION');assert.equal((await stats()).totalEnemies,0);assert.equal((await stats()).activeCrimes,0);
  console.log(`${production?'production':'development'}: gameplay modes, mission activation, scanner${production?'':', takedown, damage, respawn, grapple and glide'} passed`);
}
