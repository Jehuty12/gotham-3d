import { Vector3 } from 'three';

export class PlayerHealth {
  constructor(spawn=new Vector3(0,1.75,54)) {this.max=100;this.hp=100;this.dead=false;this.timer=0;this.hurt=0;this.safe={position:spawn.clone(),district:'docks',height:spawn.y};}
  save(position,district) {this.safe={position:position.clone(),district,height:position.y};}
  damage(amount) {
    if(this.dead||!Number.isFinite(amount)||amount<=0)return false;
    this.hp=Math.max(0,this.hp-amount);this.hurt=.25;
    if(this.hp===0){this.dead=true;this.timer=1.5;}
    return true;
  }
  update(dt,onRespawn) {
    this.hurt=Math.max(0,this.hurt-dt);
    if(!this.dead)return;
    this.timer-=dt;if(this.timer<=0){this.hp=this.max;this.dead=false;onRespawn(this.safe.position.clone());}
  }
}
