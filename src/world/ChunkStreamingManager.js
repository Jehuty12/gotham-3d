import { InstancedMesh, InstancedBufferAttribute } from 'three';

export const MAX_CHUNK_BUILD_MS=2;
export class ChunkStreamingManager {
  constructor(city,{budgetMs=MAX_CHUNK_BUILD_MS,radius=224,clock=()=>performance.now()}={}) {
    this.city=city;this.world=city.collisionWorld;this.budgetMs=budgetMs;this.radius=radius;this.clock=clock;this.queue=[];this.loaded=new Set();this.pending=new Map();this.buildMs=0;this.peakBuildMs=0;this.loads=0;this.unloads=0;this.lastKey='';this.recipes=new Map();this.volumes=new Map();
    const colliders=new Set([...this.world.cells.values()].flat());
    for(const chunk of city.chunks.values()){
      const recipes=[],retained=[];
      for(const node of [...chunk.group.children]) {
        if(node.isInstancedMesh)recipes.push({geometry:node.geometry,material:node.material,count:node.count,matrix:node.instanceMatrix.array,colors:node.instanceColor?.array,matrixWorld:node.matrix.clone(),name:node.name,detail:node.userData.streamDetail});
        else retained.push(node); // Interactive door groups and pooled lamp sprites keep their state.
      }
      this.recipes.set(chunk.id,{recipes,retained});chunk.loaded=true;chunk.collisionsLoaded=true;this.loaded.add(chunk.id);this.volumes.set(chunk.id,[]);
    }
    for(const b of colliders){const chunk=city.chunkAt((b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2);if(chunk)this.volumes.get(chunk.id).push(b);}
    city.streaming=this;
  }
  isLoadedAt(x,z){return this.city.chunkAt(x,z)?.loaded===true;}
  ensureCollisions(id) {
    const chunk=this.city.chunks.get(id);if(!chunk||chunk.collisionsLoaded)return;
    for(const b of this.volumes.get(id))this.world.add(b);chunk.collisionsLoaded=true;
  }
  ensureCollisionAt(position) {
    // One-cell safety ring is synchronous and cheap: no GPU work is needed.
    const c=this.city.chunkAt(position.x,position.z);if(!c)return;
    for(const chunk of this.city.chunks.values())if(Math.abs(chunk.ix-c.ix)<=1&&Math.abs(chunk.iz-c.iz)<=1)this.ensureCollisions(chunk.id);
  }
  unload(id) {
    const chunk=this.city.chunks.get(id);if(!chunk||(!chunk.loaded&&!chunk.collisionsLoaded&&!this.pending.has(id)))return;
    chunk.group.removeFromParent();for(const node of [...chunk.group.children])if(node.isInstancedMesh){node.dispose();chunk.group.remove(node);}
    chunk.loaded=false;this.loaded.delete(id);this.pending.delete(id);this.unloads++;
    this.world.remove(this.volumes.get(id));
    chunk.collisionsLoaded=false;this.world.local=[];
  }
  request(id,priority=1) {
    const chunk=this.city.chunks.get(id);if(!chunk||chunk.loaded)return;
    this.ensureCollisions(id);
    if(this.pending.has(id)){this.pending.get(id).priority=Math.min(priority,this.pending.get(id).priority);return;}
    const job={id,index:0,priority};this.pending.set(id,job);this.queue.push(job);
  }
  buildOne(job) {
    const chunk=this.city.chunks.get(job.id),data=this.recipes.get(job.id),r=data.recipes[job.index++];
    if(r){const mesh=new InstancedMesh(r.geometry,r.material,r.count);mesh.instanceMatrix=new InstancedBufferAttribute(r.matrix,16);if(r.colors)mesh.instanceColor=new InstancedBufferAttribute(r.colors,3);mesh.matrix.copy(r.matrixWorld);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);mesh.name=r.name;mesh.userData.streamDetail=r.detail;mesh.computeBoundingSphere();chunk.group.add(mesh);}
    if(job.index>=data.recipes.length){chunk.loaded=true;this.loaded.add(job.id);this.pending.delete(job.id);this.city.group.add(chunk.group);this.loads++;return true;}return false;
  }
  ensureAt(position) {
    this.ensureCollisionAt(position);const chunk=this.city.chunkAt(position.x,position.z);if(!chunk||chunk.loaded)return;
    this.request(chunk.id,0);const job=this.pending.get(chunk.id);while(this.pending.has(chunk.id))this.buildOne(job);this.queue=this.queue.filter(j=>this.pending.has(j.id));
  }
  update(position,velocity={x:0,z:0},pins=[]) {
    const start=this.clock(),c=this.city.chunkAt(position.x,position.z);if(!c)return;
    this.ensureCollisionAt(position);
    const look={x:position.x+velocity.x*2.5,z:position.z+velocity.z*2.5};
    const pinned=new Set(pins.map(p=>this.city.chunkAt(p.x,p.z)?.id));pinned.add(c.id);
    for(const chunk of this.city.chunks.values()) {
      const distance=Math.hypot(chunk.x-position.x,chunk.z-position.z),ahead=Math.hypot(chunk.x-look.x,chunk.z-look.z);
      const safety=Math.max(Math.abs(chunk.ix-c.ix),Math.abs(chunk.iz-c.iz))<=1;
      if(safety||pinned.has(chunk.id)||distance<this.radius||ahead<100)this.request(chunk.id,pinned.has(chunk.id)?0:safety?1:distance<130?2:3);
      else if(distance>this.radius+(this.initialized?70:0)&&ahead>160&&this.clock()-start<this.budgetMs)this.unload(chunk.id);
    }
    this.queue=this.queue.filter(j=>this.pending.has(j.id)).sort((a,b)=>a.priority-b.priority);
    while(this.queue.length&&this.clock()-start<this.budgetMs){const job=this.queue[0];if(this.buildOne(job))this.queue.shift();}
    this.buildMs=this.clock()-start;this.peakBuildMs=Math.max(this.peakBuildMs,this.buildMs);
    this.initialized=this.initialized||[...this.city.chunks.values()].every(chunk=>!chunk.loaded||Math.hypot(chunk.x-position.x,chunk.z-position.z)<=this.radius||pinned.has(chunk.id)||Math.hypot(chunk.x-look.x,chunk.z-look.z)<=160);
  }
  snapshot(){return {chunksLoaded:this.loaded.size,chunksPending:this.pending.size,streamingQueue:this.queue.length,chunkBuildMs:this.buildMs,chunkBuildPeakMs:this.peakBuildMs,chunkLoads:this.loads,chunkUnloads:this.unloads};}
  dispose(){const geometries=new Set();for(const data of this.recipes.values())for(const recipe of data.recipes)geometries.add(recipe.geometry);for(const id of [...this.loaded,...this.pending.keys()])this.unload(id);for(const geometry of geometries)geometry.dispose();this.queue.length=0;this.pending.clear();this.recipes.clear();this.volumes.clear();delete this.city.streaming;}
}
