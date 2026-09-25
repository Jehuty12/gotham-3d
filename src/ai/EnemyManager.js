import { Color, Vector3 } from 'three';
import { Enemy } from './Enemy.js';
import { seesPlayer } from './EnemyPerception.js';
import { capsuleClear, floorBelow, segmentBlocked } from '../utils/spatialQueries.js';
import { DynamicInstances } from '../utils/DynamicInstances.js';
import { deriveSeed } from '../utils/procedural.js';

export class EnemyManager {
  constructor(city,scene=null) {
    this.city=city;this.world=city.collisionWorld;this.pool=Array.from({length:20},(_,i)=>new Enemy(i));this.cursor=0;this.activeAI=0;this.updateMs=0;
    this.colors={IDLE:new Color('#967959'),PATROL:new Color('#917753'),SUSPICIOUS:new Color('#e4b15c'),ALERT:new Color('#d85d5c'),SEARCHING:new Color('#b88da7'),DISABLED:new Color('#566967')};
    if(scene){this.bodies=new DynamicInstances(scene,city.resources.box,city.resources.materials.metal,23);this.heads=new DynamicInstances(scene,city.resources.box,city.resources.materials.metal,23);}
  }
  get enemies(){return this.pool.filter(e=>e.active);}
  sync(events,budget) {
    const ids=new Set(events.map(e=>e.id));
    for(const e of this.pool)if(!ids.has(e.eventId))e.active=false;
    for(const event of events) {
      if(event.resolvedAt!==null)continue;
      const current=this.enemies.filter(e=>e.eventId===event.id);
      for(const e of current.slice(budget.perCrime))e.active=false;
      for(let i=current.length;i<budget.perCrime;i++) {
        const e=this.pool.find(e=>!e.active);if(!e)break;
        let position=null;
        for(let n=0;n<36;n++) {
          const angle=(n+i*7)*2.399, radius=.8+Math.floor(n/6)*.6;
          const p=event.position.clone().add(new Vector3(Math.sin(angle)*radius,.4,Math.cos(angle)*radius));
          const floor=floorBelow(this.world,p,null);if(Math.abs(floor-event.position.y)>.6)continue;p.y=floor;
          if(capsuleClear(this.world,p,1.8,.32,null)&&!this.enemies.some(other=>other.position.distanceTo(p)<.8)){position=p;break;}
        }
        if(!position)break;
        e.spawn(position,['patroller','guard','lookout'][i%3],event.id,deriveSeed(this.city.seed,event.site.id,i)%628/100);
        e.nextSense=0;
      }
    }
  }
  move(enemy,direction,dt,speed) {
    if(direction.lengthSq()<.01)return;
    direction.y=0;direction.normalize();enemy.direction.lerp(direction,1-Math.exp(-5*dt)).normalize();
    for(const axis of ['x','z']) {
      const next=enemy.position.clone();next[axis]+=direction[axis]*dt*speed;
      const probe=next.clone();probe.y+=.35;const floor=floorBelow(this.world,probe,null);
      if(Math.abs(floor-enemy.position.y)>.35||next.distanceTo(enemy.home)>18)continue;next.y=floor;
      if(capsuleClear(this.world,next,1.8,.32,null))enemy.position.copy(next);
    }
  }
  update(dt,{position,direction,time,rain,noise,health,budget,hidden=false,dodging=false}) {
    const start=performance.now();this.activeAI=0;let attackChecks=0;
    const active=[];
    for(const e of this.pool) {
      if(!e.active||e.state==='DISABLED')continue;
      const delta=e.position.clone().sub(position),distance=delta.length();
      e.complex=!hidden && this.city.isLoadedAt(e.position.x,e.position.z) && distance<95 && (distance<28||delta.normalize().dot(direction)>-.25) && active.length<Math.min(budget.enemies,this.aiBudget??20);
      if(!e.complex)continue;active.push(e);e.tick(dt);
      if(e.state==='ALERT') {
        this.move(e,position.clone().sub(e.position),dt,2.7);
        if(e.position.clone().add(new Vector3(0,1.2,0)).distanceTo(position)<1.65&&e.attackCooldown===0) {
          if(attackChecks++===0) {
            if(!dodging&&!segmentBlocked(this.world,e.position.clone().add(new Vector3(0,1.5,0)),position,null))health.damage(8);
            e.attackCooldown=1.1;
          } else e.attackCooldown=.1;
        }
      } else if(e.state==='PATROL') {
        const target=e.home.clone().add(new Vector3(Math.sin(time*.35+e.phase)*2,0,Math.cos(time*.35+e.phase)*2));this.move(e,target.sub(e.position),dt,1.1);
      } else if(['SEARCHING','SUSPICIOUS'].includes(e.state)) {
        const toward=e.lastSeen.clone().sub(e.position);if(toward.length()>2)this.move(e,toward,dt,.8);
      }
    }
    this.activeAI=active.length;
    // At most two perception samples per simulation tick, staggered across the pool.
    let samples=0;
    for(let attempts=0;attempts<this.pool.length&&samples<2;attempts++) {
      const e=this.pool[this.cursor++%this.pool.length];if(!e.active||!e.complex||e.state==='DISABLED'||time<e.nextSense)continue;
      const elapsed=Math.min(.4,Math.max(.1,time-e.sensedAt));e.sensedAt=time;e.nextSense=time+.2;samples++;
      e.sense({visible:seesPlayer(e,position,this.world,rain),noise:noise.hear(e.position,e.hearing,time,e.noiseId),player:position},elapsed);
    }
    this.updateMs=this.updateMs*.9+(performance.now()-start)*.1;
  }
  render(position,scanner,events=[]) {
    if(!this.bodies)return;this.bodies.begin();this.heads.begin();
    for(const e of this.enemies) {
      if(e.position.distanceTo(position)>100)continue;
      if(!this.city.isLoadedAt(e.position.x,e.position.z))continue;
      const p=e.position,disabled=e.state==='DISABLED',color=scanner.reveals(e,position)?new Color('#75efc4'):this.colors[e.state],yaw=Math.atan2(e.direction.x,e.direction.z);
      this.bodies.add(p.x,p.y+(disabled?.25:.85),p.z,disabled?1.3:.55,disabled?.35:1.2,.4,yaw,color);
      this.heads.add(p.x,p.y+(disabled?.35:1.62),p.z,.34,.34,.34,yaw,this.colors.DISABLED);
    }
    for(const event of events)if(event.type==='assault'&&event.position.distanceTo(position)<100) {
      const p=event.position;this.bodies.add(p.x,p.y+.7,p.z,.45,1.1,.4,0,this.colors.DISABLED);this.heads.add(p.x,p.y+1.4,p.z,.3,.3,.3,0,this.colors.DISABLED);
    }
    this.bodies.end();this.heads.end();
  }
  clear(){for(const e of this.pool)e.active=false;this.activeAI=0;this.bodies?.begin();this.bodies?.end();this.heads?.begin();this.heads?.end();}
}
