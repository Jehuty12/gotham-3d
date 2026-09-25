import { Vector3 } from 'three';
import { segmentBlocked } from '../utils/spatialQueries.js';

export function inVisionCone(enemy,player,rain=0) {
  const eye=enemy.position.clone().add(new Vector3(0,1.5,0)),delta=player.clone().sub(eye);
  if(delta.length()>enemy.vision*(1-.15*rain)||Math.abs(delta.y)>8)return false;
  delta.y=0;if(delta.lengthSq()<.1)return true;
  return delta.normalize().dot(enemy.direction)>=Math.cos(enemy.fov/2);
}
export function seesPlayer(enemy,player,world,rain=0) {
  if(!inVisionCone(enemy,player,rain))return false;
  return !segmentBlocked(world,enemy.position.clone().add(new Vector3(0,1.5,0)),player,null);
}
export function canTakedown(enemy,player,world) {
  if(['ALERT','DISABLED'].includes(enemy.state)||player.distanceTo(enemy.position.clone().add(new Vector3(0,1.2,0)))>2.1)return false;
  const toward=player.clone().sub(enemy.position);toward.y=0;
  return toward.normalize().dot(enemy.direction)<-.35 && !segmentBlocked(world,player,enemy.position.clone().add(new Vector3(0,1.2,0)),null);
}
