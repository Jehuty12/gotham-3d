import { Vector3 } from 'three';
export const ENEMY_STATES=Object.freeze(['IDLE','PATROL','SUSPICIOUS','ALERT','SEARCHING','DISABLED']);
export class Enemy {
  constructor(id=0){this.id=id;this.position=new Vector3();this.home=new Vector3();this.direction=new Vector3(0,0,1);this.lastSeen=new Vector3();this.active=false;}
  spawn(position,archetype,eventId,phase=0) {
    this.position.copy(position);this.home.copy(position);this.archetype=archetype;this.eventId=eventId;this.phase=phase;
    this.direction.set(Math.sin(phase),0,Math.cos(phase));this.state=archetype==='patroller'?'PATROL':'IDLE';
    this.resistance=3;this.vision=archetype==='lookout'?32:23;this.fov=Math.PI*(archetype==='lookout'?.65:.55);
    this.hearing=20;this.timer=0;this.lost=0;this.seen=0;this.attackCooldown=0;this.noiseId=0;this.active=true;this.sensedAt=0;
  }
  sense({visible=false,noise=null,player},dt) {
    if(this.state==='DISABLED')return;
    if(visible) {
      this.lastSeen.copy(player);this.seen+=dt;this.lost=0;
      this.state=this.seen>=.45?'ALERT':'SUSPICIOUS';this.timer=3;
    } else {
      this.seen=Math.max(0,this.seen-dt);this.lost+=dt;
      if(noise){this.noiseId=noise.id;this.lastSeen.copy(noise.position);if(this.state!=='ALERT')this.state='SUSPICIOUS';this.timer=2;}
      else if(this.state==='ALERT'&&this.lost>1.4){this.state='SEARCHING';this.timer=6;}
    }
  }
  tick(dt) {
    this.attackCooldown=Math.max(0,this.attackCooldown-dt);
    if(['SUSPICIOUS','SEARCHING'].includes(this.state)) {
      this.timer-=dt;
      if(this.timer<=0){if(this.state==='SUSPICIOUS'){this.state='SEARCHING';this.timer=5;}else this.state=this.archetype==='patroller'?'PATROL':'IDLE';}
    }
  }
  hit(amount=1){if(this.state==='DISABLED')return false;this.resistance=Math.max(0,this.resistance-amount);this.state=this.resistance===0?'DISABLED':'ALERT';this.lost=0;return true;}
}
