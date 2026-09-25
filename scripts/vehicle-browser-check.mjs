import assert from 'node:assert/strict';
import { selectMode } from './gameplay-browser-check.mjs';

export async function approachGarage({evaluate,stats,key,press,pause,click,send}) {
  const mouse=await click('#enter');await pause(300);
  for(let i=0;i<20;i++) {
    const yaw=(await stats()).heading,error=Math.atan2(Math.sin(yaw),Math.cos(yaw));if(Math.abs(error)<.02)break;
    mouse.x+=Math.max(-200,Math.min(200,error/.0013));await send('Input.dispatchMouseEvent',{type:'mouseMoved',...mouse,button:'none'});await pause(280);
  }
  // Public diagnostics and real keyboard input: walk along the road to the garage side.
  for(let i=0;i<15&&(await stats()).position[0]>-4.4;i++){await key('KeyA','a',65,true);await pause(180);await key('KeyA','a',65,false);await pause(160);}
  for(let i=0;i<35&&(await stats()).position[2]>32.7;i++){await key('KeyW','w',87,true);await pause(250);await key('KeyW','w',87,false);await pause(120);}
  await pause(300);assert.match(await evaluate(`document.querySelector('#interaction-prompt').textContent`),/Entrer.*NIGHTRIDER/);
  await press('KeyE','e',69);await pause(400);assert.equal((await stats()).driving,true);
}

export async function checkVehicles(api) {
  const {evaluate,stats,key,press,pause,click,screenshot,production}=api;
  await selectMode(evaluate,pause,'VIGILANTE');
  if(!production){
    await evaluate(`(()=>{const m=__testLiving.gameplay.vehicles;m.player.physics.teleport(m.vehicle.position.clone().add({x:2.4,y:1.75,z:0}));m.living.camera.lookAt(m.vehicle.position)})()`);
    if(!await evaluate('!!document.pointerLockElement'))await click('#enter');await pause(400);
    await press('KeyE','e',69);await pause(400);assert.equal((await stats()).driving,true);
  } else await approachGarage(api);
  assert.match(await evaluate(`document.querySelector('#vehicle-hud').textContent`),/NIGHTRIDER/);
  await key('KeyW','w',87,true);await pause(700);assert.ok((await stats()).vehicleSpeed>3);
  await key('ShiftLeft','Shift',16,true);await pause(650);assert.ok((await stats()).vehicleBoost<99);
  await key('ShiftLeft','Shift',16,false);const yaw=(await stats()).vehicleRotation;
  await key('KeyA','a',65,true);await pause(180);await key('KeyA','a',65,false);await key('KeyW','w',87,false);await pause(150);assert.notEqual((await stats()).vehicleRotation,yaw);
  await key('Space',' ',32,true);await pause(2100);await key('Space',' ',32,false);assert.ok(Math.abs((await stats()).vehicleSpeed)<1.2);
  await press('KeyV','v',86);await pause(300);assert.equal((await stats()).vehicleCamera,'CLOSE');
  await press('KeyV','v',86);await pause(300);assert.equal((await stats()).vehicleCamera,'HOOD');
  await screenshot(`vehicles-${production?'production':'development'}-hood`);
  await evaluate(`(()=>{const s=document.querySelector('#vehicle-mission-choice');s.value='evade';s.dispatchEvent(new Event('change'))})()`);
  await press('KeyM','m',77);await pause(500);assert.equal((await stats()).pursuitState,'PURSUIT');assert.ok((await stats()).policeUnits>0);
  await press('KeyV','v',86);await pause(200);await screenshot(`vehicles-${production?'production':'development'}-pursuit`);
  if(!production){
    await evaluate(`(()=>{const g=__testLiving.gameplay,m=g.vehicles;g.pursuit.clear();g.vehicleMissions.finish(false);const b=m.city.buildings.find(b=>!m.city.collides(b.x,b.maxZ+8,3));m.vehicle.position.set(b.x,0,b.maxZ+8);m.vehicle.rotation=Math.PI;m.vehicle.speed=23;m.vehicle.velocity.set(0,0,-23);m.vehicle.integrity=100})()`);
    await key('KeyW','w',87,true);await pause(1000);await key('KeyW','w',87,false);assert.ok((await stats()).vehicleIntegrity<100,'Controlled facade collision damages the vehicle');
    await evaluate(`(()=>{const m=__testLiving.gameplay.vehicles;m.vehicle.position.set(0,0,54);m.vehicle.speed=0;m.vehicle.velocity.set(0,0,0)})()`);await pause(300);
    await press('KeyE','e',69);await pause(350);assert.equal((await stats()).driving,false);
    await evaluate(`(()=>{const g=__testLiving.gameplay;g.pursuit.begin(g.camera.position,'MEDIUM','browser');g.player.physics.teleport(g.camera.position.clone().set(-192,1.75,-192))})()`);
    await pause(3800);assert.equal((await stats()).pursuitState,'SEARCHING');await pause(10200);assert.equal((await stats()).pursuitState,'LOST');await pause(3300);assert.equal((await stats()).pursuitState,'NONE');
  } else {
    await press('KeyE','e',69);await pause(350);assert.equal((await stats()).driving,false);
  }
  await evaluate('document.exitPointerLock()');await pause(200);await selectMode(evaluate,pause,'EXPLORATION');assert.equal((await stats()).pursuitState,'NONE');assert.equal((await stats()).policeUnits,0);
  console.log(`${production?'production':'development'}: garage, entry, acceleration, steering, boost, braking, cameras, pursuit mission and exit${production?'':', collision and pursuit escape'} passed`);
}
