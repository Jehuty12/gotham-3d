import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Scene,Vector3,Group} from 'three';
import {City} from '../src/world/City.js';
import {CollisionWorld,box} from '../src/world/CollisionWorld.js';
import {PlayerPhysics} from '../src/player/PlayerPhysics.js';
import {PlayerInteraction} from '../src/player/PlayerInteraction.js';
import {selectGrapplePoint,GrappleSystem,ENABLE_GRAPPLE} from '../src/player/GrappleSystem.js';
import {selectAccessibleRoofs,generateInteriors} from '../src/interiors/InteriorGenerator.js';
import {InteriorManager} from '../src/interiors/InteriorManager.js';
import {Door} from '../src/world/Door.js';
import {Elevator} from '../src/world/Elevator.js';
import {FireEscape} from '../src/world/FireEscape.js';
import {Ladder} from '../src/world/Ladder.js';
import {ElevatedRail} from '../src/world/ElevatedRail.js';
import {VerticalRoutes} from '../src/world/VerticalRoutes.js';
import {Underground} from '../src/world/Underground.js';
import {DiscoverySystem} from '../src/systems/DiscoverySystem.js';
import {PerformanceManager} from '../src/systems/PerformanceManager.js';

const city=new City(new Scene());
const zero=new Vector3();
function fixture(x=0,y=1.75,z=54) {
  const world=new CollisionWorld(city),camera=new PerspectiveCamera();camera.position.set(x,y,z);
  return {world,camera,physics:new PlayerPhysics(camera,world)};
}
function simulate(p,seconds,wish=zero,input={},fps=60) {for(let i=0;i<Math.round(seconds*fps);i++)p.update(1/fps,wish,input);}

test('gravity lands on ground and remains grounded without drift',()=>{
  const {physics,camera}=fixture(0,12,54);simulate(physics,3);
  assert.equal(physics.grounded,true);assert.equal(camera.position.y,1.75);assert.equal(physics.vy,0);
});
test('one jump per press, no air jump, identical at 30/60/120 FPS',()=>{
  const states=[];
  for(const fps of [30,60,120]) {
    const {physics,camera}=fixture();simulate(physics,.2,zero,{},fps);simulate(physics,.2,zero,{jump:true},fps);
    assert.ok(camera.position.y>2.5);assert.equal(physics.grounded,false);
    simulate(physics,2,zero,{jump:true},fps);assert.equal(camera.position.y,1.75);assert.equal(physics.grounded,true);
    states.push(camera.position.toArray());
  }
  assert.deepEqual(states[0],states[1]);assert.deepEqual(states[1],states[2]);
});
test('crouch preserves feet and standing is blocked under a low ceiling',()=>{
  const {physics,world,camera}=fixture();simulate(physics,.1);simulate(physics,.1,zero,{crouch:true});
  world.add(box(0,1.6,54,4,.2,4));simulate(physics,.2);
  assert.equal(physics.crouching,true);assert.equal(camera.position.y,1.05);
  camera.position.x=5;simulate(physics,.2);assert.equal(physics.height,1.75);
});
test('jump hits ceilings, fall lands on an elevated platform',()=>{
  const {physics,world,camera}=fixture(0,6,54);world.add(box(0,3,54,4,.3,4));world.add(box(0,5.4,54,4,.2,4));
  // Start above the upper slab and land on it.
  camera.position.y=9;simulate(physics,2);assert.ok(Math.abs(camera.position.y-7.25)<.001);
  camera.position.set(0,4.9,54);physics.vy=0;simulate(physics,.2);simulate(physics,.15,zero,{jump:true});
  assert.ok(camera.position.y<=5.15);assert.ok(camera.position.y>=4.9);
});
test('curbs and low mantles pass; tall walls cannot be climbed',()=>{
  for(const [height,mantle,passes] of [[.3,false,true],[.9,true,true],[2,true,false]]) {
    const {physics,world,camera}=fixture();world.add(box(0,height/2,51,4,height,1));simulate(physics,.2);
    simulate(physics,1.2,new Vector3(0,0,-4),{mantle});
    assert.equal(camera.position.z<50.7,passes,`height ${height}`);
  }
});
test('horizontal travel and falling do not depend on render frequency',()=>{
  const a=fixture(),b=fixture();simulate(a.physics,2,new Vector3(0,0,-5),{},30);simulate(b.physics,2,new Vector3(0,0,-5),{},120);
  assert.ok(a.camera.position.distanceTo(b.camera.position)<1e-9);
});
test('collision broad phase only includes nearby height bands and cells',()=>{
  const {world}=fixture();world.prepare(new Vector3(0,0,54),1.9);
  assert.ok(world.local.length<30);world.hits(0,0,54,1.9);assert.equal(world.tests,world.local.length);
  const b=city.buildings.find(b=>b.sections.length>1);world.prepare(new Vector3(b.x,b.height+50,b.z),1.9);
  assert.equal(world.hits(b.x,b.height+50,b.z,1.9).length,0);
});
test('seed selects 25% roofs, eight deterministic interiors and six types',()=>{
  const roofs=selectAccessibleRoofs(city),specs=generateInteriors(city,roofs);
  assert.equal(roofs.length,53);assert.equal(specs.length,8);assert.ok(new Set(specs.map(s=>s.type)).size>=6);
  const reversed={...city,buildings:city.buildings.slice().reverse()};
  assert.deepEqual(selectAccessibleRoofs(reversed),roofs);assert.deepEqual(generateInteriors(reversed),specs);
  const other={...city,seed:42};assert.notDeepEqual(selectAccessibleRoofs(other),roofs);
});
test('door states, animation, locked door and occupant-safe closing',()=>{
  let entries=0;const door=new Door({x:0,z:0,onEnter:()=>entries++});
  assert.equal(door.state,'closed');door.use();door.update(.1);assert.equal(door.collider.enabled,true);
  door.update(1);assert.equal(door.collider.enabled,false);door.use();assert.equal(entries,1);
  const locked=new Door({x:0,z:0,locked:true});assert.equal(locked.use(),false);assert.equal(locked.state,'locked');
  door.onEnter=null;door.use();door.update(.1,new Vector3(0,1.75,0));assert.equal(door.open,true);
});
test('interaction ray only selects the closest in-range target in its domain',()=>{
  const {camera,world}=fixture(0,1.75,0);const interaction=new PlayerInteraction(camera,world);let uses=0;
  interaction.register({bounds:box(0,1.75,-2,1,1,.2),label:'Ouvrir',use:()=>uses++});
  interaction.register({context:'elsewhere',bounds:box(0,1.75,-1,1,1,.2),label:'Hidden',use:()=>uses+=10});
  assert.ok(interaction.update());interaction.use();assert.equal(uses,1);
  camera.position.z=2;assert.equal(interaction.update(),null);
});
test('opaque wall blocks interaction through a facade',()=>{
  const {camera,world}=fixture(0,1.75,0);world.local=[box(0,1,-1,4,3,.2)];
  const interaction=new PlayerInteraction(camera,world);interaction.register({bounds:box(0,1.75,-2,1,1,.2),label:'Hidden',use:()=>assert.fail()});
  assert.equal(interaction.update(),null);
});
test('elevator closes, carries rider and opens at chosen floor across frame rates',()=>{
  for(const fps of [30,60,120]) {
    const elevator=new Elevator({x:0,z:0,floors:[0,4,20]});const rider=new Vector3(0,1.75,0);
    assert.equal(elevator.select(8),false);elevator.select(1);
    for(let i=0;i<fps*3;i++)elevator.update(1/fps,rider);
    assert.equal(elevator.floor,1);assert.equal(elevator.state,'open');assert.ok(Math.abs(rider.y-5.75)<1e-6);
  }
});
test('interiors are lazy, bounded to two cached rooms, with entry/exit and roof return',()=>{
  const {camera,world,physics}=fixture();city.collisionWorld=world;
  const interaction=new PlayerInteraction(camera,world),specs=generateInteriors(city),manager=new InteriorManager(new Scene(),city,specs,interaction,physics);
  assert.equal(manager.cache.size,0);
  for(const spec of specs.slice(0,4)) {manager.enter(spec.id);simulate(physics,.2);assert.equal(physics.grounded,true);manager.exit();assert.equal(world.domain,null);}
  assert.equal(manager.cache.size,2);manager.enter(specs[0].id,true);assert.equal(manager.active.elevator.floor,2);
  manager.exit(true);assert.ok(camera.position.y>20);manager.dispose();
});
test('fire escape risers are physically walkable without jump input',()=>{
  const {world,physics,camera}=fixture(0,1.75,54);const batches=city.resources.batches();
  new FireEscape({x:0,z:54,bottom:0,top:3.24,batches,world});camera.position.x=-3.1;
  simulate(physics,.2);simulate(physics,2,new Vector3(3,0,0));
  assert.ok(camera.position.y>4.8);assert.equal(physics.grounded,true);
});
test('ladder travels to both endpoints and releases normal physics',()=>{
  const {world,physics,camera}=fixture(0,1.75,54),interaction=new PlayerInteraction(camera,world);
  const ladder=new Ladder({x:0,z:54,bottom:0,top:8,exitZ:52,batches:city.resources.batches(),interaction,physics});
  ladder.targets[0].use();simulate(physics,2);assert.equal(physics.motion,null);assert.ok(camera.position.y>8);
  ladder.targets[1].use();simulate(physics,2);assert.equal(physics.motion,null);assert.ok(camera.position.y<2.1);
});
test('grapple defaults off, only compatible elevated points inside aim/range qualify',()=>{
  assert.equal(ENABLE_GRAPPLE,false);const origin=new Vector3(),direction=new Vector3(0,1,-1).normalize();
  const target={compatible:true,position:new Vector3(0,10,-10)};
  assert.equal(selectGrapplePoint(origin,direction,[{...target,compatible:false}]),null);
  assert.equal(selectGrapplePoint(origin,direction,[target]),target);
  assert.equal(selectGrapplePoint(origin,direction,[target],5),null);
  const {physics,camera}=fixture();const grapple=new GrappleSystem(camera,physics,[target]);grapple.update(1);assert.equal(grapple.target,null);
});
test('discoveries are altitude-aware and notify only once in memory',()=>{
  let count=0;const system=new DiscoverySystem([{id:'roof',x:0,z:0,y:30}],()=>count++);
  system.update(new Vector3());assert.equal(count,0);system.update(new Vector3(0,30,0));system.update(new Vector3(0,30,0));assert.equal(count,1);
});
test('underground generates lazily, connected corridors have floors and no partition across junction',()=>{
  const {world,physics,camera}=fixture();city.collisionWorld=world;const interaction=new PlayerInteraction(camera,world);
  const system=new Underground(new Scene(),city,interaction,physics,{sources:[]});assert.equal(system.loaded,false);system.enter();assert.equal(world.domain,system);
  for(const [x,z] of [[-80,64],[-48,64],[-64,70],[-64,82],[-64,98]]) {
    camera.position.set(x,-6.25,z);simulate(physics,.2);assert.equal(physics.grounded,true);assert.ok(Math.abs(camera.position.y+6.25)<1e-9);
    world.prepare(new Vector3(x,-8,z),1.9);assert.equal(world.hits(x,-8,z,1.9).length,0);
  }
  system.exit();assert.equal(world.domain,null);assert.equal(system.group.visible,false);
});
test('all vertical routes retain four districts/64 chunks and clear road centerlines',()=>{
  const copy=new City(new Scene()),rail=new ElevatedRail(new Scene(),copy);copy.collisionWorld=new CollisionWorld(copy);
  const camera=new PerspectiveCamera(),physics=new PlayerPhysics(camera,copy.collisionWorld),interaction=new PlayerInteraction(camera,copy.collisionWorld);
  const routes=new VerticalRoutes(copy,selectAccessibleRoofs(copy),rail,interaction,physics);
  assert.equal(copy.chunks.size,64);assert.ok(routes.stairs.length>2);assert.ok(routes.ladders.length>20);
  for(let n=-250;n<250;n+=2){assert.equal(copy.collides(0,n),false);assert.equal(copy.collides(n,0),false);}
  assert.equal(rail.stations.length,2);assert.ok(routes.crane);copy.dispose();
});

test('switchback stair landings connect four flights without jumping or clipping',()=>{
  const {world,physics,camera}=fixture(-3.1,1.75,54);
  const stairs=new FireEscape({x:0,z:54,bottom:0,top:10.5,batches:city.resources.batches(),world});
  const go=(x,z)=>{
    for(let i=0;i<900;i++) {
      const delta=new Vector3(x-camera.position.x,0,z-camera.position.z);
      if(delta.length()<.12)return;
      physics.update(1/120,delta.normalize().multiplyScalar(2.5));
    }
    assert.fail(`stuck at ${camera.position.toArray()} heading to ${x},${z}`);
  };
  simulate(physics,.2);
  for(let f=0;f<stairs.flights;f++) {
    const direction=f%2===0?1:-1;go(direction*3.65,54+(f%2)*1.65);
    if(f+1<stairs.flights)go(direction*3.65,54+((f+1)%2)*1.65);
  }
  assert.ok(Math.abs(camera.position.y-12.25)<.1);assert.equal(physics.grounded,true);
});

test('all accessible roof exits have capsule clearance above facade and equipment',()=>{
  const copy=new City(new Scene());const world=new CollisionWorld(copy);
  for(const b of selectAccessibleRoofs(copy)) {
    const top=b.landmark==='municipal'?22.2:(b.roofY??b.height)+.2;
    const p=new Vector3(b.x,top+.1,b.z+(b.roofDepth??b.depth)/2-1.3);
    world.prepare(p,1.9);assert.equal(world.hits(p.x,p.y,p.z,1.9).length,0,`${b.style} ${b.x},${b.z}`);
  }
  copy.dispose();
});

test('triangle averages reset between sample windows instead of accumulating',()=>{
  const performance=new PerformanceManager(city);
  for(let i=0;i<120;i++)performance.recordFrame(1/60,200,100000);
  assert.equal(performance.triangles,100000);assert.equal(performance.drawCalls,200);
});

test('both real metro stations can be reached on foot through their complete stair route',()=>{
  const copy=new City(new Scene()),rail=new ElevatedRail(new Scene(),copy);copy.collisionWorld=new CollisionWorld(copy);
  const camera=new PerspectiveCamera(),physics=new PlayerPhysics(camera,copy.collisionWorld),interaction=new PlayerInteraction(camera,copy.collisionWorld);
  const routes=new VerticalRoutes(copy,selectAccessibleRoofs(copy),rail,interaction,physics);
  const go=(x,z)=>{
    for(let i=0;i<1300;i++) {
      const delta=new Vector3(x-camera.position.x,0,z-camera.position.z);
      if(delta.length()<.1)return;
      physics.update(1/120,delta.normalize().multiplyScalar(2.5));
    }
    assert.fail(`station obstruction ${camera.position.toArray()} toward ${x},${z}`);
  };
  for(const station of rail.stations) {
    const stair=routes.stairs.find(s=>s.x===station.x-15 && s.top===10.5);
    physics.teleport(new Vector3(station.entrance.x,1.99,station.entrance.z));simulate(physics,.2);
    for(let f=0;f<stair.flights;f++) {
      const direction=f%2===0?1:-1;
      go(stair.x+direction*3.65,stair.z+(f%2)*1.65);
      if(f+1<stair.flights)go(stair.x+direction*3.65,stair.z+((f+1)%2)*1.65);
    }
    go(stair.exit.x,station.z+3.4);go(station.x-8,station.z+3.4);
    assert.ok(Math.abs(camera.position.y-12.25)<.1);
  }
  copy.dispose();
});
