import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera,Vector3,MeshBasicMaterial,BoxGeometry,InstancedMesh,PointLight} from 'three';
import {City} from '../src/world/City.js';
import {CollisionWorld} from '../src/world/CollisionWorld.js';
import {ChunkStreamingManager} from '../src/world/ChunkStreamingManager.js';
import {ART_BUDGETS,DISTRICT_ART,districtWeights,skylineHeight,distanceBand} from '../src/art/ArtDirection.js';
import {facadeProfile} from '../src/art/FacadeGenerator.js';
import {buildingSilhouette} from '../src/art/BuildingSilhouettes.js';
import {signageIdentity,signText} from '../src/art/SignageSystem.js';
import {applyArtBudget,artSnapshot} from '../src/art/ArtVisibility.js';
import {streetPropLayout} from '../src/world/StreetProps.js';
import {fogParameters,rainVisualParameters} from '../src/rendering/WeatherParameters.js';
import {StormSystem} from '../src/systems/StormSystem.js';
import {PerformanceManager} from '../src/systems/PerformanceManager.js';
import {RainSystem} from '../src/systems/RainSystem.js';
import {DynamicInstances} from '../src/utils/DynamicInstances.js';
import {normalizeSettings} from '../src/save/SaveSchema.js';
import {DISTRICTS} from '../src/world/districts.js';
import {windowState} from '../src/utils/windows.js';
import {warmArtShaders} from '../src/rendering/ShaderWarmup.js';
import {generateInteriors} from '../src/interiors/InteriorGenerator.js';

test('four district art profiles carry unique palette, use and silhouette rules',()=>{
  assert.equal(Object.keys(DISTRICT_ART).length,4);assert.equal(new Set(Object.values(DISTRICT_ART).map(p=>p.window.group)).size,4);
  for(const p of Object.values(DISTRICT_ART)){assert.ok(p.roughness>.5&&p.roughness<=1);assert.ok(p.palette.length<=3);assert.ok(p.silhouettes.length>=2);}
});
test('district mixing is normalized and continuous across both axes',()=>{
  for(const x of [-100,-64,-.001,0,.001,64,100])for(const z of [-100,0,100]){const w=districtWeights(x,z);assert.ok(Math.abs(Object.values(w).reduce((a,b)=>a+b)-1)<1e-12);for(const v of Object.values(w))assert.ok(v>=0&&v<=1);}
  assert.ok(Math.abs(districtWeights(-.001,0).old-districtWeights(.001,0).old)<.001);
});
test('skyline peaks in downtown and preserves low docks and industrial hierarchy',()=>{
  assert.ok(skylineHeight(70,-100,DISTRICTS.downtown,0)>skylineHeight(224,-224,DISTRICTS.downtown,0));
  assert.ok(skylineHeight(190,190,DISTRICTS.docks,0)<15);
});
test('facade palette, material variation and window family reproduce exactly',()=>{
  assert.deepEqual(facadeProfile(1989,DISTRICTS.old,-30,-100),facadeProfile(1989,DISTRICTS.old,-30,-100));
  assert.notDeepEqual(facadeProfile(1989,DISTRICTS.old,-30,-100),facadeProfile(77,DISTRICTS.old,-30,-100));
});
test('all silhouette sections fit their parcel and the final roof remains centered',()=>{
  const seen=new Set();for(const id of Object.keys(DISTRICT_ART))for(let seed=0;seed<60;seed++){
    const b=buildingSilhouette(seed,id,18,20,70,(w,d,h)=>[{w,d,h,y:0}]);seen.add(b.type);
    for(const s of b.sections){assert.ok(Math.abs(s.x??0)+s.w/2<=9.0001);assert.ok(Math.abs(s.z??0)+s.d/2<=10.0001);assert.ok(s.y+s.h<=70.0001);}
    assert.equal(b.sections.at(-1).x??0,0);assert.equal(b.sections.at(-1).z??0,0);
  }assert.ok(seen.size>=10);
});
test('fictional signs have deterministic names and a strictly bounded catalogue',()=>{
  const names=new Set();for(const district of Object.keys(DISTRICT_ART))for(let seed=0;seed<1000;seed++){
    const a=signageIdentity(seed,district);assert.deepEqual(a,signageIdentity(seed,district));names.add(a.name);assert.equal(signText({districtId:district,variant:a.variant}),a.name);
  }assert.equal(names.size,16);
});
test('V3 windows offer four colors while retaining the historical window API',()=>{
  const colors=new Set(),old=new Set();for(let row=0;row<40;row++)for(let col=0;col<20;col++){
    colors.add(windowState(1989,0,0,1,row,col,DISTRICTS.old,true).tint);old.add(windowState(1989,0,0,1,row,col,DISTRICTS.old).tint);
  }assert.equal(colors.size,4);assert.equal(old.size,2);
});
test('distance bands and budgets are nested from LOW to HIGH',()=>{
  for(const b of Object.values(ART_BUDGETS)){assert.equal(distanceBand(b.near-.01,b),'NEAR');assert.equal(distanceBand(b.near,b),'MID');assert.equal(distanceBand(b.mid,b),'FAR');assert.ok(b.near<b.mid);}
  assert.ok(ART_BUDGETS.LOW.props<ART_BUDGETS.MEDIUM.props);assert.equal(ART_BUDGETS.LOW.background,0);
});
test('prop LOD hides complete props without changing transforms or colors',()=>{
  const m=new InstancedMesh(new BoxGeometry(),new MeshBasicMaterial(),12),buffer=m.instanceMatrix.array;
  m.userData.art={kind:'props',band:'NEAR',fullCount:12,prefix:[3,5,9,12]};
  applyArtBudget(m,5,ART_BUDGETS.LOW);assert.equal(m.count,3);
  applyArtBudget(m,5,ART_BUDGETS.HIGH);assert.equal(m.count,12);assert.equal(m.instanceMatrix.array,buffer);
  applyArtBudget(m,500,ART_BUDGETS.HIGH);assert.equal(m.visible,false);m.dispose();m.geometry.dispose();m.material.dispose();
});
test('graphics changes do not modify generated identities',()=>{
  const city=new City(new Scene()),before=JSON.stringify(city.buildings),p=new PerformanceManager(city),camera=new PerspectiveCamera();
  for(const level of ['LOW','HIGH','MEDIUM','AUTO']){p.setLevel(level);p.updateVisibility(camera);assert.equal(JSON.stringify(city.buildings),before);}city.dispose();
});
test('street props use repeatable recipes clear of existing solid envelopes',()=>{
  const city=new City(new Scene());for(const c of city.chunks.values()){
    assert.deepEqual(c.artProps,streetPropLayout(c));for(const p of c.artProps)assert.ok(!c.colliders.some(b=>p.x>b.minX&&p.x<b.maxX&&p.z>b.minZ&&p.z<b.maxZ));
  }city.dispose();
});
test('decorations unload, restore art metadata and reproduce exact instance data',()=>{
  const city=new City(new Scene());city.collisionWorld=new CollisionWorld(city);const stream=new ChunkStreamingManager(city);
  const c=city.chunks.get('0,0'),original=c.group.children.filter(m=>m.userData.art).map(m=>({art:m.userData.art,matrix:[...m.instanceMatrix.array]}));
  let disposed=0;c.group.children.forEach(m=>m.addEventListener('dispose',()=>disposed++));stream.unload(c.id);assert.equal(c.group.children.length,0);assert.ok(disposed>0);
  for(let i=0;i<4;i++){stream.ensureAt(new Vector3(c.x,2,c.z));assert.deepEqual(c.group.children.filter(m=>m.userData.art).map(m=>({art:m.userData.art,matrix:[...m.instanceMatrix.array]})),original);stream.unload(c.id);}city.dispose();
});
test('material count is bounded and all mineral surfaces share procedural shader variants',()=>{
  const city=new City(new Scene());assert.equal(Object.keys(city.resources.materials).length,9);
  for(const key of ['stone','asphalt','pavement'])assert.match(city.resources.materials[key].customProgramCacheKey(),/art-v8/);city.dispose();
});
test('fixed instance pool is reused and enforces its hard limit',()=>{
  const g=new BoxGeometry(),m=new MeshBasicMaterial(),pool=new DynamicInstances(new Scene(),g,m,2),buffer=pool.mesh.instanceMatrix.array;
  for(let i=0;i<20;i++){pool.begin();pool.add(i,0,0,1,1,1);pool.end();assert.equal(pool.mesh.instanceMatrix.array,buffer);assert.equal(pool.mesh.count,1);}
  pool.add(0,0,0,1,1,1);assert.throws(()=>pool.add(0,0,0,1,1,1),RangeError);pool.mesh.dispose();g.dispose();m.dispose();
});
test('fog has continuous district transitions, altitude thinning and rain thickening',()=>{
  const a=fogParameters(-.001,2,0,1),b=fogParameters(.001,2,0,1);assert.ok(Math.abs(a.density-b.density)<1e-6);assert.ok(Math.abs(a.color.r-b.color.r)<.00001);
  assert.ok(fogParameters(100,200,100,1).density<fogParameters(100,2,100,1).density);
  assert.ok(fogParameters(100,2,100,1).density>fogParameters(100,2,100,0).density);
});
test('rain perception varies smoothly and is reduced for driving',()=>{
  const foot=rainVisualParameters(20,false),car=rainVisualParameters(20,true);assert.ok(car.density<foot.density);assert.ok(car.opacity<foot.opacity);assert.equal(car.wind,foot.wind);
  assert.ok(Math.abs(rainVisualParameters(20.01,false).density-foot.density)<.001);
});
test('rain splash pool is bounded, profile controlled and disabled with rain',()=>{
  const rain=new RainSystem(new Scene(),1989);rain.configure({rain:4000,art:ART_BUDGETS.HIGH});rain.update(10,new Vector3(0,2,0));assert.equal(rain.splashes.cursor,32);
  const buffer=rain.splashes.mesh.instanceMatrix.array;rain.update(11,new Vector3(0,2,0),true);assert.ok(rain.splashes.cursor<32);assert.equal(buffer,rain.splashes.mesh.instanceMatrix.array);
  rain.setEnabled(false);rain.update(12,new Vector3());assert.equal(rain.splashes.cursor,0);rain.dispose();
});
test('rare storms repeat on the seed, never fire every minute, and respect pause',()=>{
  const a=new StormSystem(1989),b=new StormSystem(1989);a.enabled=b.enabled=true;
  for(let i=0;i<2000;i++){a.update(1,1);b.update(1,1);assert.equal(a.flash,b.flash);assert.ok(a.remaining<=660);}
  assert.ok(a.strikes>=2&&a.strikes<=8);const t=a.remaining;a.update(0,1);assert.equal(a.remaining,t);
});
test('storm toggle suppresses flash and pending thunder',()=>{
  let sounds=0;const a=new StormSystem(1989,{thunder:()=>sounds++});a.enabled=true;a.remaining=.01;a.update(.02,1);assert.equal(a.flash,1);a.enabled=false;a.update(10,1);assert.equal(a.flash,0);assert.equal(sounds,0);
});
test('new visual options round trip and older saves receive harmless defaults',()=>{
  const old=normalizeSettings({quality:'LOW'});assert.equal(old.stormEnabled,false);assert.equal(old.colorGrading,'DEFAULT');
  const s=normalizeSettings({colorGrading:'CINEMATIC',stormEnabled:true,vignette:true});assert.deepEqual(normalizeSettings(s),s);assert.equal(normalizeSettings({colorGrading:'bad'}).colorGrading,'DEFAULT');
});
test('AUTO reduces art gradually without changing seed or buffers',()=>{
  const city=new City(new Scene()),p=new PerformanceManager(city);p.setLevel('AUTO');const mesh=city.chunks.get('0,0').group.children[0],buffer=mesh.instanceMatrix.array;
  for(let i=0;i<2500;i++)p.adjustAuto(1/35);assert.ok(p.profile.art.props>=.55&&p.profile.art.props<1);assert.ok(p.profile.art.near>=55);assert.equal(mesh.instanceMatrix.array,buffer);city.dispose();
});
test('far windows replace detailed panes and reduce the drawn instance count',()=>{
  const city=new City(new Scene()),chunk=city.chunks.get('5,1');
  const detailed=chunk.group.children.find(m=>m.userData.art?.kind==='windows'&&m.userData.art.band==='MID');
  const far=chunk.group.children.find(m=>m.userData.art?.kind==='windows'&&m.userData.art.band==='FAR');
  assert.ok(far.count<detailed.count*.5);
  for(const distance of [10,150,300]){
    applyArtBudget(detailed,distance,ART_BUDGETS.HIGH);applyArtBudget(far,distance,ART_BUDGETS.HIGH);
    assert.notEqual(detailed.visible,far.visible);
    assert.equal(far.visible,distance>=ART_BUDGETS.HIGH.mid);
  }city.dispose();
});
test('streaming created after LOW retains the full HIGH decoration allocation',()=>{
  const city=new City(new Scene()),chunk=city.chunks.get('0,0'),props=chunk.group.children.find(m=>m.userData.art?.kind==='props');
  applyArtBudget(props,0,ART_BUDGETS.LOW);assert.ok(props.count<props.userData.art.fullCount);
  city.collisionWorld=new CollisionWorld(city);const stream=new ChunkStreamingManager(city);
  stream.unload(chunk.id);stream.ensureAt(new Vector3(chunk.x,2,chunk.z));
  const restored=chunk.group.children.find(m=>m.userData.art?.kind==='props');applyArtBudget(restored,0,ART_BUDGETS.HIGH);
  assert.equal(restored.count,props.userData.art.fullCount);assert.equal(restored.instanceMatrix.count,restored.count);city.dispose();
});
test('offset wings have matching physical volumes rather than centered phantom walls',()=>{
  const city=new City(new Scene()),world=new CollisionWorld(city),colliders=new Set([...world.cells.values()].flat());
  const b=city.buildings.find(b=>b.sections?.some(s=>s.x));assert.ok(b);
  for(const s of b.sections){const cx=b.x+(s.x??0),cz=b.z+(s.z??0);
    assert.ok([...colliders].some(c=>c.kind==='building'&&Math.abs((c.minX+c.maxX)/2-cx)<1e-6&&Math.abs((c.minZ+c.maxZ)/2-cz)<1e-6&&Math.abs(c.maxY-(s.y+s.h+.1))<1e-6));
  }city.dispose();
});
for(const fail of [false,true])test(`shader warmup restores lights, target and interaction owners${fail?' after failure':''}`,async()=>{
  const scene=new Scene(),city=new City(scene),lights=Array.from({length:7},(_,i)=>{const light=new PointLight();light.visible=i<4;scene.add(light);return light;});
  const owners=[],interaction={register(target){owners.push(target);},removeOwner(owner){for(let i=owners.length-1;i>=0;i--)if(owners[i].owner===owner)owners.splice(i,1);}};
  const originalTarget={},hdr={},calls=[];let target=originalTarget;
  const living={scene,city,camera:new PerspectiveCamera(),composer:{readBuffer:hdr},lights:{localLights:lights.slice(0,6)},traffic:{eventLight:lights[6]},vertical:{specs:generateInteriors(city),interaction,underground:{build(){}}},renderer:{getRenderTarget:()=>target,setRenderTarget:t=>{target=t;},async compileAsync(){calls.push({count:lights.filter(l=>l.visible).length,target});if(fail)throw Error('context lost');}}};
  const before=scene.children.length;
  if(fail)await assert.rejects(warmArtShaders(living,{physics:{}}),/context lost/);else{await warmArtShaders(living,{physics:{}});assert.deepEqual(calls.map(c=>c.count),[0,1,3,5,7]);assert.equal(calls[2].target,null);assert.equal(calls[4].target,hdr);}
  assert.equal(target,originalTarget);assert.deepEqual(lights.map(l=>l.visible),[true,true,true,true,false,false,false]);assert.equal(owners.length,0);assert.equal(scene.children.length,before);city.dispose();
});
