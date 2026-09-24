import assert from 'node:assert/strict';

// Development-only module instrumentation positions the player at a route's start.
// Actions, ray selection, door animations and elevator journeys still use real key input.
export async function checkVertical({evaluate,stats,press,pause,click,screenshot}) {
  await evaluate(`(()=>{const v=__testLiving.vertical;const s=v.specs.find(s=>s.building.landmark==='municipal');globalThis.__testEntrance=s;v.player.physics.teleport(__testLiving.camera.position.clone().set(s.entrance.x,1.99,s.entrance.z+2));__testLiving.camera.lookAt(s.entrance.x,1.6,s.entrance.z)})()`);
  await click('#enter');await pause(400);
  assert.match(await evaluate(`document.querySelector('#interaction-prompt').textContent`),/Ouvrir/);
  await press('KeyE','e',69);await pause(650);
  assert.equal(await evaluate(`__testLiving.vertical.interiors.entrances.find(e=>e.spec===__testEntrance).door.collider.enabled`),false);
  await press('KeyE','e',69);await pause(500);
  assert.equal((await stats()).zone,'interior');
  await screenshot('vertical-city-interior');
  // Turn toward the interior exit door, still within the 2.8 m interaction distance.
  await evaluate(`(()=>{const i=__testLiving.vertical.interiors.active;const d=i.doors[0];__testLiving.camera.lookAt(d.x,1.6,d.z)})()`);
  await pause(100);await press('KeyE','e',69);await pause(600);await press('KeyE','e',69);await pause(400);
  assert.equal((await stats()).zone,'exterior');
  await evaluate(`__testLiving.camera.lookAt(__testEntrance.entrance.x,1.6,__testEntrance.entrance.z)`);
  await press('KeyE','e',69);await pause(400);assert.equal((await stats()).zone,'interior');
  await evaluate(`(()=>{const v=__testLiving.vertical,e=v.interiors.active.elevator;v.player.physics.teleport(__testLiving.camera.position.clone().set(e.x,1.99,e.z+2.25));__testLiving.camera.lookAt(e.x-.95,1.65,e.z+1.25)})()`);
  await pause(200);await press('KeyE','e',69);await pause(200);
  assert.match(await evaluate(`document.querySelector('#interaction-prompt').textContent`),/MEZZANINE/);
  await press('Digit3','3',51);
  for(let i=0;i<40 && (await stats()).zone!=='rooftop';i++)await pause(150);
  assert.equal((await stats()).zone,'rooftop');assert.ok((await stats()).position[1]>23);
  assert.ok((await stats()).discoveries.includes('municipal'));
  await screenshot('vertical-city-rooftop');
  // A ladder's geometry and target are selected by the same center-screen raycast.
  await evaluate(`(()=>{const v=__testLiving.vertical;const l=v.routes.ladders.find(l=>l.top<18);globalThis.__testLadder=l;v.player.physics.teleport(__testLiving.camera.position.clone().set(l.x,l.bottom+1.75,l.z+2));__testLiving.camera.lookAt(l.x,l.bottom+1.2,l.z)})()`);
  await pause(300);await press('KeyE','e',69);await pause(300);assert.equal((await stats()).playerState,'climbing');
  for(let i=0;i<45 && await evaluate('Boolean(__testLiving.vertical.player.physics.motion)');i++)await pause(150);
  assert.ok((await stats()).position[1]>8);await screenshot('vertical-city-ladder-roof');
  await evaluate(`(()=>{const v=__testLiving.vertical,e=v.underground.entry;v.player.physics.teleport(__testLiving.camera.position.clone().set(e.x,1.99,e.z+2));__testLiving.camera.lookAt(e.x,.8,e.z)})()`);
  await pause(250);await press('KeyE','e',69);await pause(450);assert.equal((await stats()).zone,'underground');
  assert.equal(await evaluate('__testLiving.city.group.visible'),false);
  assert.match(await evaluate(`document.querySelector('#coordinates').textContent`),/▼/);
  await screenshot('vertical-city-underground');
  await evaluate(`__testLiving.camera.lookAt(-80,-6.7,66.7)`);await pause(100);await press('KeyE','e',69);await pause(350);
  assert.equal((await stats()).zone,'exterior');
  await evaluate('document.exitPointerLock()');await pause(200);
  console.log('development: doors, interior entry/exit, elevator rooftop, ladder, discoveries and underground passed');
}
