export const box = (x, y, z, w, h, d, kind = 'solid') => ({ minX: x-w/2, maxX: x+w/2, minY: y-h/2, maxY: y+h/2, minZ: z-d/2, maxZ: z+d/2, kind });
export function overlaps(b, x, z, radius) {
  return (x-Math.max(b.minX, Math.min(x,b.maxX)))**2 + (z-Math.max(b.minZ,Math.min(z,b.maxZ)))**2 < radius**2;
}

// Spatial broad phase uses the same 64 m grid as City. No triangle raycasts.
export class CollisionWorld {
  constructor(city) {
    this.city = city; this.cells = new Map(); this.local = []; this.tests = 0; this.domain = null;
    for (const b of city.buildings) {
      const sections = b.landmark==='municipal' ? [{y:0,h:22,w:36,d:29},{y:22,h:7,w:10,d:19,dx:-12,dz:-3},{y:22,h:7,w:10,d:19,dx:12,dz:-3},{y:22,h:69,w:10,d:10,dz:-4}] : b.sections ?? [{ y:0, h:b.height, w:b.width, d:b.depth }];
      for (const s of sections) this.add(box(b.x+(s.dx??0),s.y+s.h/2,b.z+(s.dz??0),s.w+1.1,s.h+0.2,s.d+1.1,'building'));
      if(b.landmark==='tower')this.add(box(b.x,162,b.z,8,12,8,'crown'));
      for (const equipment of b.roofColliders ?? []) this.add(equipment);
    }
    for (const chunk of city.chunks.values()) for (const b of chunk.colliders) {
      if (['building','landmark'].includes(b.kind)) continue;
      this.add({ ...b, minY:0, maxY:({ water:500, container:5.6, crane:20, 'rail-pillar':10, fountain:1.15, bench:0.9 })[b.kind] ?? 1 });
    }
  }
  add(b) {
    for (let ix=Math.floor(b.minX/64);ix<=Math.floor(b.maxX/64);ix++) for(let iz=Math.floor(b.minZ/64);iz<=Math.floor(b.maxZ/64);iz++) {
      const key=`${ix},${iz}`; if(!this.cells.has(key)) this.cells.set(key,[]); this.cells.get(key).push(b);
    }
    return b;
  }
  prepare(p, height) {
    if(!this.domain)this.city.streaming?.ensureCollisionAt(p);
    this.tests=0;
    if(this.domain) { this.local=this.domain.colliders; return; }
    const found = new Set();
    for(let ix=Math.floor((p.x-3)/64);ix<=Math.floor((p.x+3)/64);ix++) for(let iz=Math.floor((p.z-3)/64);iz<=Math.floor((p.z+3)/64);iz++) {
      for(const b of this.cells.get(`${ix},${iz}`) ?? []) if(b.maxY>=p.y-3 && b.minY<p.y+height+3 && b.maxX>p.x-3 && b.minX<p.x+3 && b.maxZ>p.z-3 && b.minZ<p.z+3) found.add(b);
    }
    this.local=[...found];
  }
  hits(x,y,z,height,radius=.42) {
    const hits=[];
    if(!this.domain && (Math.abs(x)>this.city.extent-radius || Math.abs(z)>this.city.extent-radius)) hits.push({minY:-1000,maxY:1000,kind:'boundary'});
    for(const b of this.local) {
      this.tests++; if(b.enabled===false || y>=b.maxY-0.001 || y+height<=b.minY+0.001) continue;
      if(overlaps(b,x,z,radius)) hits.push(b);
    }
    return hits;
  }
  ground(x,z) { return this.domain ? -Infinity : this.city.groundHeight(x,z); }
  remove(colliders) {
    const removed=new Set(colliders),keys=new Set();
    for(const b of colliders)for(let x=Math.floor(b.minX/64);x<=Math.floor(b.maxX/64);x++)for(let z=Math.floor(b.minZ/64);z<=Math.floor(b.maxZ/64);z++)keys.add(`${x},${z}`);
    for(const key of keys){const kept=(this.cells.get(key)??[]).filter(b=>!removed.has(b));if(kept.length)this.cells.set(key,kept);else this.cells.delete(key);}
    this.local=[];
  }
}
