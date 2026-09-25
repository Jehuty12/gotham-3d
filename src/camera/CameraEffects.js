import { Vector3, Quaternion } from 'three';

export class CameraEffects {
  constructor(camera){this.camera=camera;this.position=new Vector3();this.quaternion=new Quaternion();this.time=0;this.landing=0;this.grounded=true;this.fov=camera.fov;}
  apply(dt,living,player,settings) {
    const camera=this.camera,p=player.physics,v=living.gameplay.vehicles,driving=v.driving;
    this.position.copy(camera.position);this.quaternion.copy(camera.quaternion);this.originalFov=camera.fov;
    this.time+=dt;const motion=settings.cameraMotion,shake=motion*settings.screenShake;
    if(p.grounded&&!this.grounded)this.landing=.035;this.grounded=p.grounded;this.landing*=Math.exp(-12*dt);
    const speed=driving?Math.abs(v.vehicle.speed):p.velocity.length();
    const bob=!driving&&p.grounded?Math.sin(this.time*(speed>7?13:9))*.025*Math.min(1,speed/5):0;
    const impulse=(living.gameplay.health.hurt*.12+(driving?v.vehicle.impact*.05:0))*shake;
    camera.position.y+=motion*(bob-this.landing+p.mantleOffset);
    camera.rotateX(Math.sin(this.time*39)*impulse);camera.rotateZ(Math.sin(this.time*31)*impulse*.5);
    const mode=living.gameplay.traversal.mode;
    const extra=driving?Math.min(4,speed*.14)+(v.vehicle.boosting?3:0):mode==='grappling'?5:mode==='gliding'?4:speed>7?3:0;
    this.fov+=(settings.fov+motion*extra-this.fov)*(1-Math.exp(-5*dt));if(motion===0)this.fov=settings.fov;
    camera.fov=this.fov;camera.updateProjectionMatrix();
  }
  restore(){this.camera.position.copy(this.position);this.camera.quaternion.copy(this.quaternion);this.camera.fov=this.originalFov;this.camera.updateProjectionMatrix();}
}
