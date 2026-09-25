import { Vector3 } from 'three';
import { capsuleClear, segmentBlocked } from '../utils/spatialQueries.js';
import { canTakedown } from '../ai/EnemyPerception.js';

export class CombatSystem {
  constructor(world){this.world=world;this.cooldown=0;this.feedback=0;this.hit=false;}
  update(dt){this.cooldown=Math.max(0,this.cooldown-dt);this.feedback=Math.max(0,this.feedback-dt);}
  takedownTarget(enemies,position) {return enemies.find(e=>canTakedown(e,position,this.world))??null;}
  takedown(enemy,position) {if(!enemy||!canTakedown(enemy,position,this.world))return false;enemy.hit(3);this.feedback=.2;this.hit=true;return true;}
  attack(enemies,position,direction) {
    if(this.cooldown>0)return false;this.cooldown=.4;this.feedback=.16;this.hit=false;
    const targets=enemies.filter(e=>e.state!=='DISABLED').map(e=>({e,delta:e.position.clone().add(new Vector3(0,1.2,0)).sub(position)}))
      .filter(t=>t.delta.length()<2.3&&t.delta.clone().normalize().dot(direction)>.55).sort((a,b)=>a.delta.lengthSq()-b.delta.lengthSq());
    const target=targets.find(t=>!segmentBlocked(this.world,position,t.e.position.clone().add(new Vector3(0,1.2,0)),null));
    if(!target)return false;
    const {e,delta}=target;e.hit();e.lastSeen.copy(position);this.hit=true;
    delta.y=0;delta.normalize().multiplyScalar(.4);const next=e.position.clone().add(delta);
    if(capsuleClear(this.world,next,1.8,.32,null))e.position.copy(next);
    return true;
  }
}
