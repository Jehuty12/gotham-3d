import { Vector3 } from 'three';
import { roundedLoop } from '../utils/routes.js';
import { deriveSeed } from '../utils/procedural.js';

export function nearestNode(network, position) {
  return network.nodes.reduce((best,n) => !best || Math.hypot(n.x-position.x,n.z-position.z)<Math.hypot(best.x-position.x,best.z-position.z) ? n : best, null);
}
export function roadRoute(network, start, destination) {
  const first=nearestNode(network,start), last=nearestNode(network,destination), queue=[first], previous=new Map([[first,null]]);
  for(let i=0;i<queue.length&&!previous.has(last);i++)for(const n of queue[i].neighbors)if(!previous.has(n)){previous.set(n,queue[i]);queue.push(n);}
  const route=[];for(let n=last;n;n=previous.get(n))route.unshift(new Vector3(n.x,0,n.z));
  return route;
}
export function missionRoute(network, seed, index=0) {
  const candidates=network.nodes.filter(n=>n.x>=-128&&n.x<=64&&n.z>=-128&&n.z<=64);
  const origin=candidates[deriveSeed(seed,'vehicle-mission',index)%candidates.length];
  const nodes=[origin,{x:origin.x+64,z:origin.z},{x:origin.x+64,z:origin.z+64},{x:origin.x,z:origin.z+64}];
  return { nodes: nodes.map(n=>({x:n.x,z:n.z})), path:roundedLoop(nodes,7,0) };
}

export class RoadVehicleAgent {
  constructor(vehicle, physics, network) { this.vehicle=vehicle;this.physics=physics;this.network=network;this.points=[];this.index=0;this.replan=0;this.distance=0;this.path=null;this.accumulator=0; }
  followLoop(path) { this.path=path;this.length=path.getLength();this.distance=0;this.accumulator=0;this.vehicle.position.copy(path.getPointAt(0)); }
  update(dt, destination, speed=13) {
    this.accumulator+=Math.min(dt,.1);
    while(this.accumulator+1e-9>=1/30){this.step(1/30,destination,speed);this.accumulator-=1/30;}
  }
  step(dt, destination, speed=13) {
    const v=this.vehicle;if(!v.active)return;
    let goal;
    if(this.path)goal=this.path.getPointAt(((this.distance+speed*dt)%this.length)/this.length);
    else {
      this.replan-=dt;
      if(this.replan<=0){this.points=roadRoute(this.network,this.points[this.index]??v.position,destination);this.index=0;this.replan=1.2;}
      while(this.index<this.points.length&&v.position.distanceTo(this.points[this.index])<.5)this.index++;
      goal=this.points[this.index];if(!goal){v.speed=0;return;}
    }
    const delta=goal.clone().sub(v.position);delta.y=0;
    if(delta.length()<.001){v.speed=0;return;}
    delta.setLength(Math.min(delta.length(),speed*dt));
    const yaw=Math.atan2(delta.x,delta.z);
    if(this.physics.move(v,delta,yaw)) {v.speed=speed;v.position.y=this.physics.world.city.groundHeight(v.position.x,v.position.z);if(this.path)this.distance=(this.distance+speed*dt)%this.length;}
    else v.speed=0;
  }
}
