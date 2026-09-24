import { Color, Vector3 } from 'three';
import { box } from './CollisionWorld.js';
import { Ladder } from './Ladder.js';
import { FireEscape } from './FireEscape.js';

export class VerticalRoutes {
  constructor(city,roofs,rail,interaction,physics) {
    this.ladders=[];this.stairs=[];this.grapplePoints=[];this.roofs=roofs;this.bridges=[];
    const chunks=new Map(),world=city.collisionWorld;
    const batchesAt=(x,z)=>{const chunk=city.chunkAt(x,z);if(!chunks.has(chunk.id))chunks.set(chunk.id,{chunk,batches:city.resources.batches()});return chunks.get(chunk.id).batches;};
    const platform=(x,y,z,w,d,batches,kind='rooftop')=>{batches.metal.add(x,y-.1,z,w,.2,d,0,new Color('#718684'));world.add(box(x,y-.1,z,w,.2,d,kind));};
    for(const b of roofs) {
      const batches=batchesAt(b.x,b.z), top=b.landmark==='municipal'?22.2:(b.roofY??b.height)+.2;
      const roofDepth=b.roofDepth??b.depth, exitZ=b.z+roofDepth/2-1.3;
      if(b.style==='hangar') platform(b.x,top,b.z,b.roofWidth,b.roofDepth,batches);
      let stair=false;
      if(b.height<45 && b.width>10) {
        stair=true;
        for(let dx=-4;dx<=4;dx+=1)for(let dz=1;dz<=4.4;dz+=.8) if(city.collides(b.x+dx,b.maxZ+dz,.5)||city.groundHeight(b.x+dx,b.maxZ+dz)<.2)stair=false;
      }
      if(stair) {
        const stairs=new FireEscape({x:b.x,z:b.maxZ+1,top,batches,world});this.stairs.push(stairs);
        const end=stairs.exit;platform(end.x,top,(end.z+exitZ)/2,1.4,Math.abs(end.z-exitZ)+1.4,batches);
      } else {
        this.ladders.push(new Ladder({x:b.x,z:b.maxZ+.3,top,exitZ,batches,interaction,physics}));
        platform(b.x,top,(b.maxZ+.85+exitZ)/2,1.4,b.maxZ+.85-exitZ+1,batches);
      }
      this.grapplePoints.push({compatible:true,position:new Vector3(b.x,top+2,b.maxZ+.9)});
    }
    // A short rooftop bridge to a neighboring accessible roof at a similar altitude.
    outer:for(const a of roofs)for(const b of roofs) {
      const ay=(a.roofY??a.height)+.2,by=(b.roofY??b.height)+.2;
      const gap=b.minX-a.maxX;
      if(a!==b && Math.abs(a.z-b.z)<.1 && gap>1 && gap<8 && Math.abs(ay-by)<1.2 && !a.landmark&&!b.landmark) {
        const x=(a.maxX+b.minX)/2,y=Math.max(ay,by),batches=batchesAt(x,a.z);
        platform(x,y,a.z,gap+3,1.5,batches);this.bridges.push({x,y,z:a.z});break outer;
      }
    }
    for(const station of rail.stations) {
      const batches=batchesAt(station.x,station.z);
      for(const side of [-1,1]) {world.add(box(station.x,10.3,station.z+side*3.2,21,.4,2.2,'platform'));world.add(box(station.x,14,station.z+side*3.2,22,.35,3,'ceiling'));}
      const streetOffset=city.districtAt(station.x-15,station.z+5).roadWidth/2+.9;
      const stairs=new FireEscape({x:station.x-15,z:station.z+streetOffset,bottom:.24,top:10.5,batches,world});this.stairs.push(stairs);
      platform(station.x-13,10.5,station.z+3.4,12,2.3,batches,'platform');
      platform(stairs.exit.x,10.5,(stairs.exit.z+station.z+3.4)/2,1.6,stairs.exit.z-station.z-3.4+1.5,batches,'platform');
      for(const dx of [-6,5]) {batches.trim.add(station.x+dx,11,station.z+3.6,2.2,.6,.5);world.add(box(station.x+dx,11,station.z+3.6,2.2,.6,.5,'bench'));}
      // Safe platform edge; train stays visible from behind a waist-high barrier.
      for(let dx=-10;dx<=10;dx+=2) batches.trim.add(station.x+dx,11.1,station.z+2.05,.05,1.2,.05);
      batches.windows.add(station.x,12.9,station.z+3.9,5,.6,.06,0,new Color('#507c70'));
      world.add(box(station.x,11.1,station.z+2.05,21,1.2,.08,'railing'));
      station.entrance={x:station.x-18.1,z:station.z+streetOffset};
    }
    // Docks crane inspection deck reached by a marked maintenance ladder.
    const dock=[...city.chunks.values()].find(c=>c.waterfront);
    if(dock) {
      const x=dock.x-2,z=dock.z-13,batches=batchesAt(x,z);
      platform(x,22,z,6,6,batches);
      world.add(box(x,20,z-1.5,3,3,3,'crane-cabin'));
      world.add(box(x+6,21,z,24,1,2,'crane-jib'));
      this.ladders.push(new Ladder({x:x+4,z:z+3,top:22,exitX:x+2,exitZ:z+1,batches,interaction,physics}));
      this.crane={id:'crane',name:'Grue des docks',x:x+2,z:z+1,y:23.75};
    }
    for(const {chunk,batches} of chunks.values())for(const batch of Object.values(batches))batch.build(chunk.group);
  }
}
