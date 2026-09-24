import { Vector3, Color } from 'three';
import { box } from './CollisionWorld.js';

export class Ladder {
  constructor({x,z,bottom=.24,top,exitX=x,exitZ=z-1.8,batches,interaction,physics,context='exterior',owner=null}) {
    Object.assign(this,{x,z,bottom,top,exitX,exitZ});
    for(const side of [-1,1]) batches.metal.add(x+side*.48,(bottom+top)/2,z,.08,top-bottom,.08,0,new Color('#829389'));
    for(let y=bottom+.3;y<top+.7;y+=.32) batches.trim.add(x,y,z,1.05,.07,.09);
    const end=(down)=>({owner,context,bounds:box(down?exitX:x,(down?top:bottom)+1.2,down?exitZ:z,1.3,2.5,.6),label:down?'Descendre':'Monter',use:()=>{
      const h=physics.height, outside=new Vector3(x,top+h+.35,z+.55), ground=new Vector3(x,bottom+h,z+.55), roof=new Vector3(exitX,top+h+.35,exitZ);
      physics.follow(down?[roof,outside,ground]:[ground,outside,roof],6,'climbing');
    }});
    this.targets=[interaction.register(end(false)),interaction.register(end(true))];
  }
}
