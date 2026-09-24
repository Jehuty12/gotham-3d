import { Group, Mesh } from 'three';
import { box } from './CollisionWorld.js';

export class Elevator {
  constructor({x,z,floors,resources,parent,onRoof=()=>{}}) {
    Object.assign(this,{x,z,floors,onRoof}); this.y=floors[0];this.target=0;this.floor=0;this.state='open';this.doorProgress=1;
    this.collider=box(x,this.y-.12,z,2.5,.24,2.5,'cabin');
    this.walls=[box(x-1.2,1.4,z,.1,2.8,2.5),box(x+1.2,1.4,z,.1,2.8,2.5),box(x,1.4,z-1.2,2.5,2.8,.1),box(x,1.3,z+1.22,2.5,2.6,.1),box(x,2.8,z,2.5,.12,2.5)];
    this.wallLevels=this.walls.map(b=>[b.minY,b.maxY]);
    this.group=new Group(); this.group.position.set(x,this.y,z);parent?.add(this.group);
    if(resources) {
      const add=(x,y,z,w,h,d,mat='trim')=>{const m=new Mesh(resources.box,resources.materials[mat]);m.position.set(x,y,z);m.scale.set(w,h,d);this.group.add(m);return m;};
      add(0,-.12,0,2.5,.24,2.5); add(0,2.8,0,2.5,.12,2.5);add(0,1.4,-1.2,2.5,2.8,.1);
      for(const side of [-1,1]) add(side*1.2,1.4,0,.1,2.8,2.5);
      add(0,2.7,0,1,.04,.8,'windows');
      this.doors=[add(-.6,1.3,1.22,1.2,2.6,.1),add(.6,1.3,1.22,1.2,2.6,.1)];
    }
  }
  contains(p) { return Math.abs(p.x-this.x)<1.1 && Math.abs(p.z-this.z)<1.1 && Math.abs(p.y-this.y-1.75)<1; }
  select(index) { if(!Number.isInteger(index)||index<0||index>=this.floors.length||this.state!=='open') return false; if(index===this.floor)return true;this.target=index;this.state='closing';return true; }
  update(dt,rider=null,physics=null) {
    const aboard=rider && this.contains(rider);
    if(this.state==='closing') {this.doorProgress=Math.max(0,this.doorProgress-dt*2);if(this.doorProgress===0)this.state='moving';}
    else if(this.state==='moving') {
      const difference=this.floors[this.target]-this.y, step=Math.sign(difference)*Math.min(Math.abs(difference),dt*14);
      this.y+=step;if(aboard) {rider.y+=step;if(physics)physics.vy=0;}
      if(Math.abs(difference)<.001) {this.floor=this.target;this.state='opening';}
    } else if(this.state==='opening') {
      this.doorProgress=Math.min(1,this.doorProgress+dt*2);
      if(this.doorProgress===1) {this.state='open';if(aboard && this.floor===this.floors.length-1)this.onRoof();}
    }
    if(physics) physics.carried=Boolean(aboard && this.state!=='open');
    this.collider.minY=this.y-.24;this.collider.maxY=this.y;this.group.position.y=this.y;
    this.walls.forEach((b,i)=>{b.minY=this.y+this.wallLevels[i][0];b.maxY=this.y+this.wallLevels[i][1];});
    this.walls[3].enabled=this.doorProgress<.95;
    this.doors?.forEach((door,i)=>door.position.x=(i===0?-1:1)*(.6+this.doorProgress*1.15));
  }
}
