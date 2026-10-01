import { Color, Group } from 'three';
import { InstanceBatch, seededRandom, deriveSeed } from '../utils/procedural.js';

export class BackgroundSkyline {
  constructor(city){
    this.group=new Group();this.group.name='distant-city';city.group.add(this.group);
    const batch=new InstanceBatch(city.resources.box,city.resources.materials.stone),random=seededRandom(deriveSeed(city.seed,'background-skyline'));
    for(let i=0;i<64;i++){
      // Interleaved angles keep MEDIUM a subset covering the entire horizon.
      const a=((i*17)%64)/64*Math.PI*2,r=355+random()*70,h=25+random()*65;
      batch.add(Math.cos(a)*r,h/2,Math.sin(a)*r,10+random()*18,h,12+random()*16,0,new Color('#263a49'));
    }
    this.mesh=batch.build(this.group);
  }
  update(budget,indoor){this.mesh.count=budget.background;this.group.visible=!indoor&&budget.background>0;}
  dispose(){this.mesh.dispose();this.group.removeFromParent();}
}
