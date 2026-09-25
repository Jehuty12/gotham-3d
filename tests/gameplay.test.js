import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera,Vector3} from 'three';
import {City} from '../src/world/City.js';
import {CollisionWorld,box} from '../src/world/CollisionWorld.js';
import {PlayerPhysics} from '../src/player/PlayerPhysics.js';
import {GrappleSystem,selectGrapplePoint} from '../src/player/GrappleSystem.js';
import {PlayerTraversal} from '../src/player/PlayerTraversal.js';
import {clampMomentum,releaseMomentum} from '../src/player/Momentum.js';
import {PlayerHealth} from '../src/player/PlayerHealth.js';
import {Enemy} from '../src/ai/Enemy.js';
import {EnemyManager} from '../src/ai/EnemyManager.js';
import {seesPlayer,canTakedown} from '../src/ai/EnemyPerception.js';
import {NoiseSystem} from '../src/gameplay/NoiseSystem.js';
import {CrimeSystem,generateCrimeSites,GAMEPLAY_BUDGETS} from '../src/gameplay/CrimeSystem.js';
import {MissionManager} from '../src/gameplay/MissionManager.js';
import {CombatSystem} from '../src/gameplay/CombatSystem.js';
import {ScannerSystem} from '../src/gameplay/ScannerSystem.js';
import {GameDirector} from '../src/gameplay/GameDirector.js';
import {selectAccessibleRoofs,generateInteriors} from '../src/interiors/InteriorGenerator.js';
import {segmentBlocked,sweepPlayer} from '../src/utils/spatialQueries.js';

const city=new City(new Scene()),zero=new Vector3();
function fixture(y=1.75) {
  const world=new CollisionWorld(city),camera=new PerspectiveCamera();camera.position.set(0,y,54);
  const physics=new PlayerPhysics(camera,world),points=[{compatible:true,position:new Vector3(0,15,44)}];
  const grapple=new GrappleSystem(camera,physics,points),traversal=new PlayerTraversal(physics,grapple);traversal.configure(true);
  return {world,camera,physics,grapple,traversal};
}
function simulate(f,seconds,input={},fps=60,wish=zero){for(let i=0;i<Math.round(seconds*fps);i++){f.grapple.update(1/fps);f.physics.update(1/fps,wish,input);}}
function enemy(position=new Vector3(0,0,50),type='guard'){const e=new Enemy(1);e.spawn(position,type,'crime-1');e.direction.set(0,0,1);return e;}

test('grapple ray selects only marked points inside configurable range',()=>{
  const origin=new Vector3(0,1,0),direction=new Vector3(0,1,-1).normalize(),p={compatible:true,position:new Vector3(0,12,-11)};
  assert.equal(selectGrapplePoint(origin,direction,[p],10),null);assert.equal(selectGrapplePoint(origin,direction,[p],30),p);
  assert.equal(selectGrapplePoint(origin,direction,[{...p,compatible:false}],30),null);
});
test('grapple pull and released momentum are identical at 30/60/120 FPS',()=>{
  const states=[];
  for(const fps of [30,60,120]){const f=fixture();f.camera.lookAt(f.grapple.points[0].position);f.grapple.update(0);assert.ok(f.grapple.use());simulate(f,1.5,{},fps);states.push([...f.camera.position.toArray(),f.physics.vy]);}
  for(let i=0;i<4;i++){assert.ok(Math.abs(states[0][i]-states[1][i])<1e-7);assert.ok(Math.abs(states[0][i]-states[2][i])<1e-7);}
});
test('grapple cannot select through a wall or pull through a newly blocking wall',()=>{
  const f=fixture();f.camera.lookAt(f.grapple.points[0].position);f.grapple.update(0);assert.ok(f.grapple.use());
  f.world.add(box(0,10,49,6,24,.4));simulate(f,1);
  assert.ok(f.camera.position.z>=49.5);assert.equal(f.grapple.active,false);
  f.physics.teleport(new Vector3(0,1.75,54));f.grapple.update(0);assert.equal(f.grapple.target,null);
});
test('grapple cancellation releases bounded velocity and permits reuse after cooldown',()=>{
  const f=fixture();f.camera.lookAt(f.grapple.points[0].position);f.grapple.update(0);f.grapple.use();simulate(f,.2);
  assert.equal(f.grapple.use(),true);assert.equal(f.grapple.active,false);assert.ok(f.physics.vy>0);assert.ok(f.physics.velocity.length()<=24);
  simulate(f,.3);assert.equal(f.grapple.cooldown,0);
});
test('glide reduces descent, advances and exits when Space is released',()=>{
  const f=fixture(30);f.physics.vy=-10;f.camera.lookAt(0,30,0);simulate(f,1,{jump:true});
  assert.equal(f.traversal.glide.active,true);assert.ok(f.camera.position.y>25);assert.ok(f.camera.position.z<50);assert.ok(f.physics.vy>-4);
  simulate(f,.3,{jump:false});assert.equal(f.traversal.glide.active,false);assert.ok(f.physics.vy<-5);
});
test('glide is excluded on ground, inside rooms and during ladder travel',()=>{
  const f=fixture();simulate(f,.1,{jump:true});assert.equal(f.traversal.glide.active,false);
  f.camera.position.y=30;f.physics.vy=-5;f.world.domain={colliders:[]};simulate(f,.1,{jump:true});assert.equal(f.traversal.glide.active,false);
  f.world.domain=null;f.physics.follow([new Vector3(0,40,54)]);simulate(f,.1,{jump:true});assert.equal(f.traversal.glide.active,false);
});
test('glide trajectory is independent of render frequency',()=>{
  const a=fixture(30),b=fixture(30);a.physics.vy=b.physics.vy=-8;simulate(a,1,{jump:true},30);simulate(b,1,{jump:true},120);assert.ok(a.camera.position.distanceTo(b.camera.position)<1e-7);
});
test('momentum strictly bounds horizontal and vertical velocities',()=>{
  const v=new Vector3(100,50,200);assert.equal(clampMomentum(v,-100),-35);assert.ok(v.length()<=24.000001);
  const f=fixture();releaseMomentum(f.physics,new Vector3(100,100,100));assert.ok(f.physics.velocity.length()<=24.000001);assert.ok(f.physics.vy<=18);
});
test('dodge has a bounded duration/distance, cooldown and respects walls',()=>{
  const f=fixture();simulate(f,.2);assert.ok(f.traversal.dodge(new Vector3(0,0,-1)));assert.equal(f.traversal.dodge(new Vector3(0,0,-1)),false);
  f.world.add(box(0,2,52,6,4,.2));simulate(f,.6);assert.ok(f.camera.position.z>=52.5);assert.equal(f.traversal.dodgeTime,0);assert.ok(54-f.camera.position.z<5);
});
test('crime site generation is deterministic, chunk-based and offers alternate approaches',()=>{
  city.collisionWorld=new CollisionWorld(city);const vertical={roofs:selectAccessibleRoofs(city),specs:generateInteriors(city)};
  const sites=generateCrimeSites(city,vertical);assert.ok(sites.length>=40);assert.equal(new Set(sites.map(s=>s.type)).size,6);
  assert.deepEqual(generateCrimeSites(city,vertical),sites);assert.ok(sites.some(s=>s.approaches.includes('TOIT')));assert.ok(sites.some(s=>s.approaches.includes('INTÉRIEUR')));
  for(const s of sites)assert.equal(city.chunkAt(s.position.x,s.position.z).id,s.chunk);
});
test('crime spawning avoids the player, honors budgets and recycles resolved events',()=>{
  city.collisionWorld=new CollisionWorld(city);const sites=generateCrimeSites(city,{roofs:selectAccessibleRoofs(city),specs:generateInteriors(city)});
  const a=new CrimeSystem(sites),b=new CrimeSystem(sites),player=new Vector3(0,1.75,54);a.setEnabled(true);b.setEnabled(true);a.update(0,player,3);b.update(0,player,3);
  assert.equal(a.events.length,3);assert.deepEqual(a.events,b.events);for(const e of a.events)assert.ok(e.position.distanceTo(player)>=35);
  const first=a.events[0].id;a.resolve(first);a.update(9,player,3);assert.equal(a.events.some(e=>e.id===first),false);
  a.update(0,player,1);assert.equal(a.events.length,1);a.setEnabled(false);assert.equal(a.events.length,0);
});
function missionOf(type){const m=new MissionManager();const record={id:'m',eventId:'crime-1',type,position:new Vector3(0,0,50),state:'AVAILABLE',progress:0,elapsed:0,interiorId:'room'};m.missions.push(record);m.activate('m');return m;}
test('mission activation is exclusive and reach/roof/inspect/enter objectives complete',()=>{
  for(const type of ['reach','roof','inspect','enter']){const m=missionOf(type);assert.equal(m.activate('m'),false);const result=m.update(.1,{position:new Vector3(0,1.75,50),inspected:true,interior:'room'});assert.equal(result.state,'COMPLETED');assert.equal(m.active,null);}
});
test('observation requires sustained aim; neutralization requires a real disabled group',()=>{
  const m=missionOf('observe');for(let i=0;i<60;i++)m.update(1/30,{position:new Vector3(0,1.75,50),observing:true});assert.equal(m.completed,1);
  const n=missionOf('neutralize'),e=enemy();assert.equal(n.update(.1,{position:zero,enemies:[]}),null);e.hit(3);assert.equal(n.update(.1,{position:zero,enemies:[e]}).state,'COMPLETED');
});
test('missions fail on expiration or removal of their event',()=>{
  const m=missionOf('reach');assert.equal(m.update(241,{position:new Vector3(200,0,200)}).state,'FAILED');
  const n=missionOf('reach');n.sync([]);assert.equal(n.active,null);
});
test('enemy vision respects cone, height, occlusion and a small rain penalty',()=>{
  const f=fixture(),e=enemy();assert.equal(seesPlayer(e,new Vector3(0,1.75,60),f.world),true);
  assert.equal(seesPlayer(e,new Vector3(0,1.75,40),f.world),false);assert.equal(seesPlayer(e,new Vector3(0,25,60),f.world),false);
  assert.equal(seesPlayer(e,new Vector3(0,1.75,72),f.world,0),true);assert.equal(seesPlayer(e,new Vector3(0,1.75,72),f.world,1),false);
  f.world.add(box(0,2,55,5,4,.2));assert.equal(seesPlayer(e,new Vector3(0,1.75,60),f.world),false);
});
test('enemy transitions from suspicion to alert, search and patrol; disabled is terminal',()=>{
  const e=enemy(undefined,'patroller'),player=new Vector3(0,1.75,54);
  e.sense({visible:true,player},.2);assert.equal(e.state,'SUSPICIOUS');e.sense({visible:true,player},.3);assert.equal(e.state,'ALERT');
  e.sense({visible:false,player},2);assert.equal(e.state,'SEARCHING');e.tick(7);assert.equal(e.state,'PATROL');e.hit(3);e.sense({visible:true,player},1);assert.equal(e.state,'DISABLED');
});
test('noise is bounded, expires, respects range and is slightly masked by rain',()=>{
  const noise=new NoiseSystem(4);const event=noise.emit(zero,10,'running',0,1);assert.ok(Math.abs(event.radius-8.2)<1e-9);
  assert.ok(noise.hear(new Vector3(5,0,0),20,1));assert.equal(noise.hear(new Vector3(9,0,0),20,1),undefined);
  for(let i=0;i<10;i++)noise.emit(zero,5,'steps',1);assert.equal(noise.events.length,4);noise.update(3);assert.equal(noise.events.length,0);
});
test('hearing creates suspicion without immediately alerting the enemy',()=>{
  const e=enemy(),noise=new NoiseSystem();const event=noise.emit(new Vector3(0,0,55),14,'jump',0);
  e.sense({noise:event,player:new Vector3(0,1.75,55)},.2);assert.equal(e.state,'SUSPICIOUS');assert.equal(e.noiseId,event.id);
});
test('takedown requires short distance, rear approach, no wall and non-alert enemy',()=>{
  const f=fixture(),e=enemy(),behind=new Vector3(0,1.75,48.8),combat=new CombatSystem(f.world);
  assert.ok(canTakedown(e,behind,f.world));assert.equal(canTakedown(e,new Vector3(0,1.75,45),f.world),false);assert.equal(canTakedown(e,new Vector3(0,1.75,51),f.world),false);
  assert.ok(combat.takedown(e,behind));assert.equal(e.state,'DISABLED');e.spawn(new Vector3(0,0,50),'guard','crime-1');e.state='ALERT';assert.equal(combat.takedown(e,behind),false);
});
test('combat takes three hits, enforces cooldown, range and line of sight',()=>{
  const f=fixture(),e=enemy(),combat=new CombatSystem(f.world),p=new Vector3(0,1.75,51.4),direction=new Vector3(0,0,-1);
  assert.ok(combat.attack([e],p,direction));assert.equal(combat.attack([e],p,direction),false);
  for(let i=0;i<2;i++){combat.update(.5);p.z=e.position.z+1.3;assert.ok(combat.attack([e],p,direction));}assert.equal(e.state,'DISABLED');
  const other=enemy(new Vector3(0,0,45));combat.update(1);assert.equal(combat.attack([other],p,direction),false);
});
test('health clamps damage, saves safe point and respawns once after a fixed delay',()=>{
  const h=new PlayerHealth();const safe=new Vector3(10,22,10);h.save(safe,'Downtown');safe.y=0;h.damage(-2);assert.equal(h.hp,100);h.damage(150);assert.equal(h.hp,0);
  let respawns=0;for(let i=0;i<120;i++)h.update(1/60,p=>{respawns++;assert.equal(p.y,22);});assert.equal(respawns,1);assert.equal(h.hp,100);assert.equal(h.dead,false);
});
test('scanner has a limited duration, radius and cooldown and reveals nothing when disabled',()=>{
  const s=new ScannerSystem(),target={position:new Vector3(0,0,10)};assert.equal(s.activate(),false);s.enabled=true;assert.ok(s.activate());assert.ok(s.reveals(target,zero));
  assert.equal(s.reveals({position:new Vector3(0,0,100)},zero),false);assert.equal(s.activate(),false);s.update(4.1);assert.equal(s.reveals(target,zero),false);s.update(3);assert.ok(s.activate());
});
test('AI perception is staggered to at most two vision rays per simulation tick',()=>{
  const f=fixture();city.collisionWorld=f.world;const ai=new EnemyManager(city);
  for(let i=0;i<20;i++)ai.pool[i].spawn(new Vector3((i%5)-2,0,40-Math.floor(i/5)),'guard','crime-1');
  const noise=new NoiseSystem(),health=new PlayerHealth();
  for(let t=0;t<30;t++){f.world.raycasts=0;ai.update(1/30,{position:f.camera.position,direction:new Vector3(0,0,-1),time:t/30,rain:0,noise,health,budget:GAMEPLAY_BUDGETS.LOW});assert.ok(f.world.raycasts<=2);assert.ok(ai.activeAI<=6);}
});
test('exploration/vigilante switch enables and clears all gameplay without changing the city',()=>{
  const f=fixture();city.collisionWorld=f.world;
  const vertical={grapple:f.grapple,roofs:selectAccessibleRoofs(city),specs:generateInteriors(city),routes:{},discoveries:{points:[]},interiors:{active:null},underground:{active:false},interaction:{targets:[]},prompt:{textContent:''},notify(){}};
  const living={city,camera:f.camera,scene:new Scene(),vertical,rail:{stations:[]},performance:{level:'HIGH'},rain:{enabled:true,intensity:1}};
  const player={camera:f.camera,physics:f.physics,wish:new Vector3(),controls:{isLocked:true},resetInput(){},onAction(){}};
  const game=new GameDirector(living,player,undefined,{ui:false});assert.equal(game.mode,'EXPLORATION');assert.equal(game.crimes.events.length,0);
  game.setMode('VIGILANTE');assert.equal(game.crimes.events.length,3);assert.ok(game.enemies.enemies.length>0);assert.ok(game.traversal.enabled);
  game.update(.05);game.setMode('EXPLORATION');assert.equal(game.enemies.enemies.length,0);assert.equal(game.missions.missions.length,0);assert.equal(game.scanner.enabled,false);assert.equal(city.chunks.size,64);
  assert.throws(()=>game.setMode('invalid'),RangeError);game.dispose();
});
