import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, PerspectiveCamera, Vector3 } from 'three';
import { Vehicle } from '../src/vehicles/Vehicle.js';
import { VehiclePhysics } from '../src/vehicles/VehiclePhysics.js';
import { vehicleInput } from '../src/vehicles/VehicleController.js';
import { VehicleCamera } from '../src/vehicles/VehicleCamera.js';
import { VehicleManager } from '../src/vehicles/VehicleManager.js';
import { VehicleAudio } from '../src/vehicles/VehicleAudio.js';
import { generateGarages } from '../src/vehicles/Garage.js';
import { RoadVehicleAgent, missionRoute, roadRoute } from '../src/vehicles/RoadVehicleAgent.js';
import { PursuitSystem, policeDetects, PURSUIT_BUDGETS } from '../src/gameplay/PursuitSystem.js';
import { VehicleMissionManager, DRIVING_OBJECTIVES } from '../src/gameplay/VehicleMissionManager.js';
import { CollisionWorld, box } from '../src/world/CollisionWorld.js';
import { City } from '../src/world/City.js';
import { PlayerPhysics } from '../src/player/PlayerPhysics.js';
import { RoadNetwork } from '../src/utils/routes.js';
import { TrafficSystem } from '../src/systems/TrafficSystem.js';
import { TrafficLights } from '../src/systems/TrafficLights.js';

const input=(throttle=0,steering=0,boost=false,handbrake=false)=>({throttle,steering,boost,handbrake});
function flat() {
  const city={extent:2000,chunks:new Map(),buildings:[],groundHeight:()=>0};
  const world=new CollisionWorld(city),physics=new VehiclePhysics(world),vehicle=new Vehicle('test','NIGHTRIDER',new Vector3(),0);
  return {world,physics,vehicle};
}
function simulate(f,seconds,command=input(),fps=60){for(let i=0;i<Math.round(seconds*fps);i++)f.physics.update(1/fps,f.vehicle,command);return f.vehicle;}
function managerFixture() {
  const scene=new Scene(),city=new City(scene),camera=new PerspectiveCamera();city.collisionWorld=new CollisionWorld(city);camera.position.set(0,1.75,54);
  const player={keys:new Set(),controls:{isLocked:true,pointerSpeed:.65},physics:new PlayerPhysics(camera,city.collisionWorld),resetInput(){this.keys.clear();}};
  const living={scene,city,camera,traffic:{cars:[],count:0,network:new RoadNetwork(city)},rain:{enabled:true,intensity:1},audio:{},performance:{level:'HIGH',profile:{}},vertical:{prompt:{}}};
  const manager=new VehicleManager(living,player,{ui:false});return {scene,city,camera,player,living,manager};
}
function approach(f){f.player.physics.teleport(f.manager.vehicle.position.clone().add(new Vector3(2.4,1.75,0)));f.player.physics.update(.05,new Vector3());}

test('arcade acceleration is progressive and identical at 30/60/120 render FPS',()=>{
  const results=[30,60,120].map(fps=>simulate(flat(),2,input(1),fps));
  assert.ok(results[0].speed>19&&results[0].speed<21);for(const v of results.slice(1))assert.ok(v.position.distanceTo(results[0].position)<1e-8);
});
test('braking first slows forward motion, then permits bounded reverse',()=>{
  const f=flat();simulate(f,1,input(1));const before=f.vehicle.speed;simulate(f,.2,input(-1));assert.ok(f.vehicle.speed>0&&f.vehicle.speed<before);
  simulate(f,3,input(-1));assert.ok(f.vehicle.speed<0&&f.vehicle.speed>=-8);
});
test('friction stops coasting and handbrake stops substantially faster',()=>{
  const a=flat(),b=flat();simulate(a,2,input(1));simulate(b,2,input(1));simulate(a,1);simulate(b,1,input(0,0,false,true));assert.ok(Math.abs(b.vehicle.speed)<Math.abs(a.vehicle.speed)*.2);
  simulate(a,20);assert.equal(a.vehicle.speed,0);
});
test('steering depends on movement, supports reverse and never rotates a stopped vehicle',()=>{
  const f=flat();simulate(f,1,input(0,1));assert.equal(f.vehicle.rotation,0);simulate(f,1,input(1,1));assert.ok(f.vehicle.rotation>.3);
  const r=flat();simulate(r,1,input(-1,1));assert.ok(r.vehicle.rotation<-.3);
});
test('normal and boosted maximum speeds are bounded and boost recharges',()=>{
  const a=flat(),b=flat();simulate(a,7,input(1));simulate(b,3.5,input(1,0,true));assert.equal(a.vehicle.speed,27);assert.ok(b.vehicle.speed>27&&b.vehicle.speed<=27*1.22);
  const charge=b.vehicle.boost;simulate(b,2);assert.ok(b.vehicle.boost>charge);simulate(b,20);assert.equal(b.vehicle.boost,100);
});
test('vehicle control mapping respects WASD and ZQSD without consuming sprint on foot',()=>{
  assert.deepEqual(vehicleInput(new Set(['KeyW','KeyA','ShiftLeft'])),vehicleInput(new Set(['KeyZ','KeyQ','ShiftRight'])));
  assert.deepEqual(vehicleInput(new Set(['KeyS','KeyD','Space'])),input(-1,-1,false,true));
});
test('an exhausted held boost recharges without rapidly toggling until the key is released',()=>{
  const f=flat();simulate(f,5,input(1,0,true));assert.equal(f.vehicle.boosting,false);const charge=f.vehicle.boost;simulate(f,1,input(1,0,true));assert.ok(f.vehicle.boost>charge);assert.equal(f.vehicle.boosting,false);
  simulate(f,.1,input(1));simulate(f,.1,input(1,0,true));assert.equal(f.vehicle.boosting,true);
});
test('swept vehicle collision prevents tunnelling through thin walls and causes limited damage',()=>{
  const f=flat();f.world.add(box(0,2,18,20,4,.12));simulate(f,4,input(1,0,true));
  assert.ok(f.vehicle.position.z<16);assert.ok(f.vehicle.integrity<100&&f.vehicle.integrity>50);assert.ok(f.physics.tests>0);
});
test('vehicles collide with another vehicle through the local dynamic spatial index',()=>{
  const f=flat(),other=new Vehicle('other','TARGET',new Vector3(0,0,16),0);f.physics.setObstacles([f.vehicle,other]);simulate(f,3,input(1));assert.ok(f.vehicle.position.z<12);
});
test('vehicle gravity settles on ground without bouncing or a frame-rate dependency',()=>{
  for(const fps of [30,60,120]){const f=flat();f.vehicle.position.y=8;simulate(f,3,input(),fps);assert.equal(f.vehicle.position.y,0);assert.equal(f.vehicle.verticalSpeed,0);assert.ok(f.vehicle.grounded);}
});
test('vehicle damage disables propulsion without an explosion and repair is progressive',()=>{
  const f=flat();f.vehicle.damage(110);simulate(f,2,input(1,0,true));assert.equal(f.vehicle.speed,0);assert.equal(f.vehicle.state,'DISABLED');
  f.vehicle.repair(1);assert.equal(f.vehicle.integrity,22);assert.equal(f.vehicle.state,'PARKED');f.vehicle.speed=3;assert.equal(f.vehicle.repair(2),false);
});
test('garage and principal spawn are reproducible and preserve all 64 chunks',()=>{
  const a=managerFixture(),b=managerFixture();assert.equal(a.city.seed,1989);assert.equal(a.city.chunks.size,64);
  assert.deepEqual(a.manager.garages.map(g=>g.position.toArray()),b.manager.garages.map(g=>g.position.toArray()));
  assert.deepEqual(a.manager.vehicle.position.toArray(),[-7,0,32]);a.manager.physics.prepare(a.manager.vehicle.position);assert.equal(a.manager.physics.blocked(a.manager.vehicle,a.manager.vehicle.position),false);
  // Generation is pure before garage geometry is attached; independent cities reproduce it.
  const c=new City(new Scene());c.collisionWorld=new CollisionWorld(c);assert.deepEqual(generateGarages(c).map(g=>g.id),a.manager.garages.map(g=>g.id));
});
test('enter and exit transfer controls cleanly and reject speed, distance and both blocked sides',()=>{
  const f=managerFixture(),m=f.manager;assert.equal(m.enter(),false);approach(f);assert.ok(m.enter());assert.ok(f.player.physics.frozen);assert.equal(f.player.controls.pointerSpeed,0);m.update(.05);
  m.vehicle.speed=3;assert.equal(m.exit(),false);m.vehicle.speed=0;assert.ok(m.exit());assert.equal(f.player.controls.pointerSpeed,.65);assert.equal(f.player.physics.frozen,false);
  approach(f);assert.ok(m.enter());m.update(.05);const p=m.vehicle.position;
  f.city.collisionWorld.add(box(p.x-2.4,1,p.z,1.8,3,7));f.city.collisionWorld.add(box(p.x+2.4,1,p.z,1.8,3,7));assert.equal(m.exit(),false);assert.ok(m.exit(new Vector3(0,1.75,54)));
});
test('repair only runs in a garage while stopped and a disabled driver can leave',()=>{
  const f=managerFixture(),m=f.manager;approach(f);m.enter();m.update(.05);m.vehicle.damage(100);assert.ok(m.interact());assert.ok(m.repairing);
  for(let i=0;i<60;i++)m.update(1/60);assert.ok(m.vehicle.integrity>20&&m.vehicle.integrity<24);m.interact();assert.equal(m.driving,false);
  m.vehicle.position.set(0,0,90);approach(f);m.enter();m.update(.05);m.vehicle.damage(100);assert.ok(m.exit());
});
test('exit never teleports through a thin barrier between the car and a clear destination',()=>{
  const f=managerFixture(),m=f.manager;m.vehicle.position.set(0,0,100);approach(f);m.enter();m.update(.05);
  f.city.collisionWorld.add(box(-1.55,1,100,.1,2,8));f.city.collisionWorld.add(box(1.55,1,100,.1,2,8));assert.equal(m.exitPosition(),null);
});
test('vehicle camera cycles modes, respects an obstructed boom and restores original FOV',()=>{
  const f=flat(),camera=new PerspectiveCamera(72),rig=new VehicleCamera(camera,f.world);f.world.add(box(0,3,-4,10,6,.3));rig.update(.1,f.vehicle);assert.ok(camera.position.z>-4);
  rig.cycle();assert.equal(rig.mode,'CLOSE');rig.cycle();assert.equal(rig.mode,'HOOD');rig.cycle();assert.equal(rig.mode,'CHASE');f.vehicle.boosting=true;rig.update(.3,f.vehicle);assert.ok(camera.fov>72);rig.reset();assert.equal(camera.fov,72);
});
test('police detection has a finite range, height limit and blocks behind walls',()=>{
  const f=flat(),police=new Vehicle('police','POLICE',new Vector3(0,0,10));assert.ok(policeDetects(police,new Vector3(0,1.75,25),f.world));
  assert.equal(policeDetects(police,new Vector3(0,1.75,100),f.world),false);f.world.add(box(0,3,18,10,6,.2));assert.equal(policeDetects(police,new Vector3(0,1.75,25),f.world),false);
});
test('pursuit states go PURSUIT to SEARCHING to LOST to NONE and never trigger in Exploration',()=>{
  const f=managerFixture(),p=new PursuitSystem(f.manager);assert.equal(p.begin(new Vector3(0,0,54)),false);p.setEnabled(true);assert.ok(p.begin(new Vector3(0,0,54),'LOW'));assert.equal(p.snapshot().policeUnits,2);
  for(let i=0;i<100;i++)p.update(1/30,new Vector3(0,0,54),'LOW',true);assert.equal(p.state,'SEARCHING');
  for(let i=0;i<305;i++)p.update(1/30,new Vector3(0,0,54),'LOW',true);assert.equal(p.state,'LOST');
  for(let i=0;i<100;i++)p.update(1/30,new Vector3(0,0,54),'LOW',true);assert.equal(p.state,'NONE');assert.equal(p.snapshot().policeUnits,0);
});
test('pursuit budgets shrink with quality and detection uses at most one ray per sample',()=>{
  const f=managerFixture(),p=new PursuitSystem(f.manager);p.setEnabled(true);p.begin(new Vector3(0,0,54),'HIGH');assert.equal(p.snapshot().policeUnits,PURSUIT_BUDGETS.HIGH);
  for(let i=0;i<60;i++){f.city.collisionWorld.raycasts=0;p.update(1/30,new Vector3(0,0,54),'LOW');assert.ok(f.city.collisionWorld.raycasts<=1);}assert.ok(p.snapshot().policeUnits<=2);p.setEnabled(false);assert.equal(p.state,'NONE');
});
test('mission routes reproduce by seed and use connected main roads',()=>{
  const f=managerFixture(),network=f.living.traffic.network;const a=missionRoute(network,1989,0),b=missionRoute(network,1989,0);assert.deepEqual(a.nodes,b.nodes);
  for(let i=0;i<400;i++){const p=a.path.getPointAt(i/400);assert.equal(f.city.collides(p.x,p.z,2.3),false);}
  const route=roadRoute(network,new Vector3(-128,0,128),new Vector3(128,0,-128));for(let i=1;i<route.length;i++)assert.equal(route[i].distanceTo(route[i-1]),64);
});
test('target vehicle follows its predetermined route deterministically without crossing buildings',()=>{
  const results=[];
  for(const fps of [30,60,120]){const f=managerFixture(),v=f.manager.target;v.active=true;const agent=new RoadVehicleAgent(v,f.manager.physics,f.living.traffic.network);agent.followLoop(missionRoute(agent.network,1989).path);
    for(let i=0;i<fps*12;i++){agent.update(1/fps,null,10);assert.equal(f.city.collides(v.position.x,v.position.z,1.8),false);}results.push(v.position.clone());}
  assert.ok(results[0].distanceTo(results[1])<1e-7);assert.ok(results[0].distanceTo(results[2])<1e-7);
});
test('police route replanning preserves forward progress between intersections',()=>{
  const f=managerFixture(),v=f.manager.police[0];v.active=true;v.position.set(0,0,128);const agent=new RoadVehicleAgent(v,f.manager.physics,f.living.traffic.network);
  for(let i=0;i<300;i++)agent.update(1/30,new Vector3(0,0,-128),13);assert.ok(v.position.z<10);
});
test('all six driving objectives validate conditions and timeout failures',()=>{
  for(const type of DRIVING_OBJECTIVES){const f=managerFixture(),m=f.manager,p=new PursuitSystem(m),missions=new VehicleMissionManager(m,p);p.setEnabled(true);missions.enabled=true;
    assert.equal(missions.startNext(type),false);m.driving=true;assert.ok(missions.startNext(type));assert.equal(missions.startNext(type),false);
    if(type==='evade')p.state='LOST';
    for(let i=0;i<800&&missions.active;i++){m.vehicle.position.copy(missions.active.destination);missions.update(1/30);}
    assert.equal(missions.last.state,'COMPLETED',type);assert.equal(m.target.active,false);
  }
  const f=managerFixture(),p=new PursuitSystem(f.manager),m=new VehicleMissionManager(f.manager,p);m.enabled=true;f.manager.driving=true;m.startNext();m.update(151);assert.equal(m.last.state,'FAILED');
});
test('traffic stops for a drivable vehicle and contains four civilian categories',()=>{
  const f=managerFixture(),traffic=new TrafficSystem(f.scene,f.city,new TrafficLights(f.scene,f.city));traffic.count=1;const car=traffic.cars[0];traffic.spawn(car,new Vector3(0,0,54));
  const obstacle={position:car.position.clone().add(new Vector3(Math.sin(car.yaw)*6,0,Math.cos(car.yaw)*6))};traffic.vehicleObstacles=[obstacle];const before=car.position.clone();traffic.update(1/30,car.position.clone().add(new Vector3(Math.cos(car.yaw)*20,0,-Math.sin(car.yaw)*20)));assert.ok(car.stopped);assert.ok(car.position.distanceTo(before)<.001);
  assert.deepEqual([...new Set(traffic.cars.map(c=>c.category))].sort(),['CIVILIAN','DELIVERY','POLICE','TAXI']);
});
test('procedural vehicle audio uses a bounded set of sources and releases all of them',()=>{
  const param=()=>({value:0,setTargetAtTime(v){this.value=v;}}),node=()=>({gain:param(),frequency:param(),connect(){},disconnect(){},start(){},stop(){}});
  const context={currentTime:0,sampleRate:100,createGain:node,createOscillator:node,createBufferSource:node,createBuffer:(_c,n)=>({getChannelData:()=>new Float32Array(n)})};
  const audio=new VehicleAudio(context,node());audio.update({driving:true,speed:20,boost:true,throttle:1});assert.equal(audio.nodes.size,6);assert.ok(audio.nodes.get('engine').gain.gain.value>0);audio.dispose();assert.equal(audio.nodes.size,0);
});
