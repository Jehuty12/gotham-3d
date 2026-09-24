import { CanvasTexture, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { InstanceBatch } from '../utils/procedural.js';

// Three shared procedural labels, batched by chunk. No external images or models.
export class NavigationSigns {
  constructor(city,vertical) {
    this.materials=[];this.geometry=new PlaneGeometry(1,1);
    if(typeof document==='undefined')return;
    const labels=['ACCÈS  /  [E]','MÉTRO  /  QUAI','ASCENSEUR  /  [E]'];
    for(const text of labels) {
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#163c3c';ctx.fillRect(0,0,512,128);
      ctx.strokeStyle='#85c9ac';ctx.lineWidth=5;ctx.strokeRect(5,5,502,118);
      ctx.fillStyle='#cef3d9';ctx.textAlign='center';ctx.font='bold 34px sans-serif';ctx.fillText(text,256,78);
      const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
      this.materials.push(new MeshBasicMaterial({map:texture}));
    }
    const batches=new Map();
    const label=(x,y,z,type=0)=>{
      const chunk=city.chunkAt(x,z),key=`${chunk.id}:${type}`;
      if(!batches.has(key))batches.set(key,{chunk,batch:new InstanceBatch(this.geometry,this.materials[type])});
      batches.get(key).batch.add(x,y,z,1.8,.45,1);
    };
    for(const spec of vertical.specs) {
      label(spec.entrance.x,3.35,spec.entrance.z+.12);
      const b=spec.building;label(b.x,spec.roofY+1,b.z+(b.roofDepth??b.depth)/2-1.3,2);
    }
    for(const ladder of vertical.routes.ladders)label(ladder.x,1.6,ladder.z+.1);
    for(const station of vertical.living.rail.stations) {
      label(station.x,12.9,station.z+3.92,1);
      label(station.entrance.x,2.7,station.entrance.z+.2,1);
    }
    const e=vertical.underground.entry;label(e.x,1.3,e.z+.15);
    for(const {chunk,batch} of batches.values())batch.build(chunk.group);
  }
}
