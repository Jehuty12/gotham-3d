import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { contentFixture } from './content-fixture.mjs';
const f=contentFixture(),v=f.living.gameplay.vehicles,car=v.vehicle,dt=1/120;
try{
  const reset=()=>{car.position.set(0,0,0);car.velocity.set(0,0,0);car.speed=car.vy=0;car.rotation=0;car.integrity=car.boost=100;car.grounded=true;v.physics.accumulator=0;v.physics.setObstacles([]);};
  reset();let accelerationSeconds=0;while(car.speed<15&&accelerationSeconds<15){v.physics.update(dt,car,{throttle:1,steering:0},1);accelerationSeconds+=dt;}assert.ok(car.speed>=15);const speed=car.speed,brakeStart=car.position.clone();let brakingSeconds=0;while(Math.abs(car.speed)>.2&&brakingSeconds<10){v.physics.update(dt,car,{throttle:0,steering:0,handbrake:true},1);brakingSeconds+=dt;}assert.ok(Math.abs(car.speed)<=.2);const stoppingDistance=car.position.distanceTo(brakeStart);
  reset();for(let i=0;i<120;i++)v.physics.update(dt,car,{throttle:1,steering:0,boost:true},1);const boostedSpeed=car.speed,boostRemaining=car.boost;
  reset();for(let i=0;i<120;i++)v.physics.update(dt,car,{throttle:1,steering:0,boost:false},1);const regularSpeed=car.speed;assert.ok(boostedSpeed>regularSpeed);
  const turnStart=car.position.clone(),initialRotation=car.rotation;for(let i=0;i<60;i++)v.physics.update(dt,car,{throttle:1,steering:1},1);const angle=Math.abs(car.rotation-initialRotation),chord=car.position.distanceTo(turnStart),turnRadius=angle>.001?chord/(2*Math.sin(angle/2)):null;
  const report={date:new Date().toISOString(),checks:'passed',wetness:1,accelerationTo15Mps:accelerationSeconds,brakingFromMps:speed,brakingSeconds,stoppingDistance,boostedSpeedAfter1s:boostedSpeed,regularSpeedAfter1s:regularSpeed,boostRemaining,turnRadiusMetres:turnRadius,combat:{enemyResistance:3,attackCooldown:.4,minimumNeutralizationSeconds:.8,dodgeCooldown:.85,dodgeDuration:.18,introDamage:6,introAttackInterval:1.35,standardDamage:8,standardAttackInterval:1.1,enemiesPerEncounter:3},method:'120 Hz physical simulation on existing wet road, no traffic. Turning radius is a half-second measured chord estimate. Combat timings are theoretical lower bounds, not human averages.'};await writeFile('artifacts/handling-check.json',JSON.stringify(report,null,2));console.log(report);
}finally{f.dispose();}
