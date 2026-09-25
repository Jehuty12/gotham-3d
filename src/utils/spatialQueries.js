import { Box3, Ray, Vector3 } from 'three';
import { overlaps } from '../world/CollisionWorld.js';

const ray = new Ray(), bounds = new Box3(), hit = new Vector3();
export function nearbyVolumes(world, minX, maxX, minZ, maxZ, domain=world.domain) {
  if (domain) return domain.colliders;
  const found = new Set();
  for (let x=Math.floor(minX/64); x<=Math.floor(maxX/64); x++) {
    for (let z=Math.floor(minZ/64); z<=Math.floor(maxZ/64); z++) {
      for (const b of world.cells.get(`${x},${z}`) ?? []) found.add(b);
    }
  }
  return found;
}
export function segmentBlocked(world, start, end, domain=world.domain) {
  world.raycasts = (world.raycasts ?? 0) + 1;
  const length=start.distanceTo(end);
  if (length<.001) return false;
  ray.set(start,end.clone().sub(start).divideScalar(length));
  for (const b of nearbyVolumes(world,Math.min(start.x,end.x),Math.max(start.x,end.x),Math.min(start.z,end.z),Math.max(start.z,end.z),domain)) {
    if (b.enabled===false) continue;
    bounds.min.set(b.minX,b.minY,b.minZ); bounds.max.set(b.maxX,b.maxY,b.maxZ);
    if (bounds.containsPoint(start)) return true;
    if (ray.intersectBox(bounds,hit) && hit.distanceTo(start)<length-.06) return true;
  }
  return false;
}
export function capsuleClear(world, p, height=1.9, radius=.42, domain=world.domain) {
  if (!domain && (Math.abs(p.x)>world.city.extent-radius || Math.abs(p.z)>world.city.extent-radius)) return false;
  for (const b of nearbyVolumes(world,p.x-radius,p.x+radius,p.z-radius,p.z+radius,domain)) {
    world.extraTests=(world.extraTests??0)+1;
    if (b.enabled!==false && p.y<b.maxY-.001 && p.y+height>b.minY+.001 && overlaps(b,p.x,p.z,radius)) return false;
  }
  return true;
}
export function floorBelow(world,p,domain=world.domain) {
  let floor=domain ? -Infinity : world.city.groundHeight(p.x,p.z);
  for(const b of nearbyVolumes(world,p.x-.1,p.x+.1,p.z-.1,p.z+.1,domain)) {
    if(b.enabled!==false && b.maxY<=p.y+.01 && b.maxY>floor && overlaps(b,p.x,p.z,.1)) floor=b.maxY;
  }
  return floor;
}
export function sweepPlayer(physics,delta) {
  const steps=Math.max(1,Math.ceil(delta.length()/.12)),step=delta.clone().divideScalar(steps);
  for(let i=0;i<steps;i++) {
    const next=physics.camera.position.clone().add(step),feet=next.clone(); feet.y-=physics.height;
    physics.world.city.streaming?.ensureCollisionAt(next);
    if(!capsuleClear(physics.world,feet,physics.height+.15,physics.radius)) return false;
    physics.camera.position.copy(next);
  }
  return true;
}
