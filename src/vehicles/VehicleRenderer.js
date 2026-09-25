import { Color, Group, SpotLight } from 'three';
import { DynamicInstances } from '../utils/DynamicInstances.js';

export class VehicleRenderer {
  constructor(scene, city) {
    this.city=city;
    this.group = new Group(); scene.add(this.group);
    this.body = new DynamicInstances(this.group, city.resources.box, city.resources.materials.metal, 100);
    this.glow = new DynamicInstances(this.group, city.resources.box, city.resources.materials.windows, 60);
    this.colors = Object.fromEntries(Object.entries({ black:'#101d26', glass:'#254957', rubber:'#0a1014', police:'#344e5a', target:'#65513a', white:'#d1f7fc', red:'#ff263d', blue:'#2575ff', boost:'#5fdfe5' }).map(([key,c]) => [key,new Color(c)]));
    this.headlight = new SpotLight('#d4edff', 0, 42, .52, .6, 1.5); this.headlight.castShadow = false;
    scene.add(this.headlight, this.headlight.target);
  }
  render(vehicles, playerVehicle, camera, time, visible, headlightEnabled) {
    this.body.begin(); this.glow.begin(); this.group.visible = visible;
    for (const v of vehicles) {
      if (!v.active || v.position.distanceTo(camera.position) > 220 || !this.city.isLoadedAt(v.position.x,v.position.z)) continue;
      const { x, y, z } = v.position, c = Math.cos(v.rotation), s = Math.sin(v.rotation), colors = this.colors;
      const part = (batch, dx, dy, dz, w, h, d, color) => batch.add(x + dx*c + dz*s, y+dy, z-dx*s+dz*c, w,h,d,v.rotation,color);
      const color = v.type === 'POLICE' ? colors.police : v.type === 'TARGET' ? colors.target : colors.black;
      part(this.body,0,.48,0,1.95,.5,4.5,color);
      part(this.body,0,.86,-.3,1.5,.42,2,colors.glass);
      part(this.body,0,1.1,-.45,1.55,.1,1.65,color);
      part(this.body,0,.79,-1.8,2.03,.12,.48,color);
      part(this.body,0,.65,1.45,1.75,.15,1.2,color);
      for (const side of [-1,1]) {
        for (const axle of [-1,1]) part(this.body,side*.95,.34,axle*1.45,.28,.56,.65,colors.rubber);
        part(this.glow,side*.63,.57,2.26,.5,.13,.04,colors.white);
        part(this.glow,side*.65,.57,-2.26,.5,v.brakingInput?.22:.12,.04,colors.red);
        if(v.boosting)part(this.glow,side*.38,.3,-2.28,.22,.12,.04,colors.boost);
        if(v.type==='POLICE')part(this.glow,side*.35,1.23,-.3,.6,.15,.3,Math.floor(time*8)%2===(side<0?0:1)?(side<0?colors.red:colors.blue):colors.black);
      }
    }
    this.body.end(); this.glow.end();
    const v = playerVehicle; this.headlight.intensity = visible && headlightEnabled && v.integrity>0 && v.position.distanceTo(camera.position)<30 ? 90 : 0;
    this.headlight.position.set(v.position.x+Math.sin(v.rotation)*1.8,v.position.y+.7,v.position.z+Math.cos(v.rotation)*1.8);
    this.headlight.target.position.set(v.position.x+Math.sin(v.rotation)*22,v.position.y+.1,v.position.z+Math.cos(v.rotation)*22);
  }
}
