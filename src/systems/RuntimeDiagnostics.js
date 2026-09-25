import { PoolRegistry } from './PoolRegistry.js';
import { FramePacing } from './FramePacing.js';

export class RuntimeDiagnostics {
  constructor(living) {
    this.living=living;this.pools=new PoolRegistry();this.frames=new FramePacing();this.elapsed=0;this.data={};
    const g=living.gameplay;
    for(const [name,capacity,count] of [['traffic',40,()=>living.traffic.activeCount],['police',4,()=>g.vehicles.police.filter(v=>v.active).length],['enemies',20,()=>g.enemies.enemies.length],['pedestrians',25,()=>living.pedestrians.activeCount],['rain',4000,()=>living.rain.count],['steam',600,()=>living.steam.count],['markers',128,()=>g.markers.batch.cursor]])this.pools.register(name,capacity,count);
  }
  update(dt){this.frames.record(dt);this.elapsed+=dt;if(this.elapsed<1)return;this.elapsed=0;const l=this.living;let objects=0;l.scene.traverse(()=>objects++);const info=l.renderer.info;this.data={...this.frames.snapshot(),geometries:info.memory.geometries,textures:info.memory.textures,programs:info.programs?.length??0,activeObjects:objects,pools:this.pools.snapshot(),heapMB:globalThis.performance?.memory?performance.memory.usedJSHeapSize/1048576:null,managedTimers:0,managedListeners:l.session?.listenerCount??0};}
  snapshot(){return this.data;}
  dispose(){this.pools.clear();}
}
