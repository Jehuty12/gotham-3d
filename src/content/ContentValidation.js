import { Vector3 } from 'three';
import { capsuleClear, floorBelow, segmentBlocked } from '../utils/spatialQueries.js';
import { roundedLoop } from '../utils/routes.js';

export function validateContent(content){
  const {living,locations,registry,catalogue}=content,city=living.city,world=city.collisionWorld,errors=[];
  const ids=[...locations.locations,...registry.missions,...catalogue.lore,...catalogue.secrets].map(x=>x.id);
  if(new Set(ids).size!==ids.length)errors.push('Duplicate content id');
  const domains=new Map();living.vertical.underground.build();domains.set('underground',living.vertical.underground);
  const check=(point,label)=>{
    if(!locations.byId.has(point.locationId))errors.push(`${label}: unknown location`);
    if(!Array.isArray(point.position)||point.position.length!==3||point.position.some(n=>!Number.isFinite(n))){errors.push(`${label}: invalid position`);return;}
    const p=new Vector3(...point.position);if(!city.chunkAt(p.x,p.z)){errors.push(`${label}: outside streamable world`);return;}
    let domain=null;
    if(point.domain!=='exterior'){
      if(point.domain==='underground')domain=domains.get('underground');else{
        const spec=living.vertical.specs.find(s=>s.id===point.domain);if(!spec){errors.push(`${label}: unknown interior`);return;}
        living.vertical.interiors.enter(spec.id);domain=living.vertical.interiors.active;
      }
    }
    const feet=p.clone();feet.y-=1.75;const floor=floorBelow(world,p,domain);
    if(!Number.isFinite(floor)||Math.abs(feet.y-floor)>.4)errors.push(`${label}: unsupported floor ${feet.y.toFixed(2)} / ${floor.toFixed(2)}`);
    if(!capsuleClear(world,feet,1.9,.35,domain))errors.push(`${label}: blocked capsule`);
    if(living.vertical.interiors.active)living.vertical.interiors.exit();
  };
  for(const l of locations.locations){check({...locations.point(l.id)},`location ${l.id}`);check(locations.point(l.id,'outside'),`entrance ${l.id}`);if(l.roof)check(locations.point(l.id,'roof'),`roof ${l.id}`);}
  for(const item of [...catalogue.lore,...catalogue.secrets])check(item,item.id);
  let objectives=0,vehicleSegments=0;
  for(const mission of registry.missions){
    check(mission.start,`${mission.id} start`);
    if(mission.kind==='story'&&Object.keys(mission.routes).length<2)errors.push(`${mission.id}: needs alternate routes`);
    for(const o of [...mission.objectives,...Object.values(mission.routes).flatMap(r=>r.objectives)]){
      objectives++;check(o,`${mission.id} ${o.text}`);
      for(let i=1;i<(o.vehicleRoute?.length??0);i++){
        const a=new Vector3(...o.vehicleRoute[i-1]),b=new Vector3(...o.vehicleRoute[i]);
        if(a.x!==b.x&&a.z!==b.z)errors.push(`${mission.id}: diagonal driving segment`);
        for(let t=0;t<=1;t+=.1){const p=a.clone().lerp(b,t);p.y=city.groundHeight(p.x,p.z);living.gameplay.vehicles.physics.prepare(p);if(living.gameplay.vehicles.physics.blocked(living.gameplay.vehicles.vehicle,p,Math.atan2(b.x-a.x,b.z-a.z)))errors.push(`${mission.id}: blocked driving lane`);}
        vehicleSegments++;
      }
      if(o.vehicleLoop){
        const path=roundedLoop(o.vehicleLoop,7,0),vehicle=living.gameplay.vehicles;
        for(let i=0;i<160;i++){const t=i/160,p=path.getPointAt(t),next=path.getPointAt((t+.002)%1),yaw=Math.atan2(next.x-p.x,next.z-p.z);p.y=city.groundHeight(p.x,p.z);vehicle.physics.prepare(p);if(vehicle.physics.blocked(vehicle.target,p,yaw))errors.push(`${mission.id}: blocked rounded convoy route`);}
        vehicleSegments+=o.vehicleLoop.length;
      }
    }
  }
  const from=new Vector3(...locations.get('relay').position),to=locations.get('works').position;
  const anchor=living.vertical.grapple.points.find(a=>Math.abs(a.position.x-to[0])<.1&&a.position.y>to[1]);
  if(!anchor||from.distanceTo(anchor.position)>55||segmentBlocked(world,from,anchor.position,null))errors.push('Downtown roof chain has no reachable grapple anchor');
  return {checks:errors.length?'failed':'passed',seed:city.seed,chunks:city.chunks.size,story:registry.missions.filter(m=>m.kind==='story').length,side:registry.missions.filter(m=>m.kind==='side').length,locations:locations.locations.length,lore:catalogue.lore.length,secrets:catalogue.secrets.length,objectives,vehicleSegments,errors};
}
