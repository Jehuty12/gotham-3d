export class VisibilityManager {
  constructor(living) {this.living=living;}
  update(zone,interior) {
    const l=this.living, outside=zone==='exterior'||zone==='rooftop';
    l.city.group.visible=zone!=='underground';
    if(interior) {
      for(const chunk of l.city.chunks.values()) chunk.group.visible=chunk.group.visible && Math.hypot(chunk.x-l.camera.position.x,chunk.z-l.camera.position.z)<95;
      l.city.chunkAt(interior.spec.building.x,interior.spec.building.z).group.visible=false;
    }
    l.rain.mesh.visible=outside && l.rain.count>0;
    l.trafficLights.bulbs.mesh.visible=outside;
    for(const system of [l.traffic,l.pedestrians,l.rail]) for(const value of Object.values(system)) {
      if(value?.mesh?.isObject3D)value.mesh.visible=outside;
    }
    l.traffic.eventLight.visible=outside;
    // Street point lights must not illuminate sealed underground rooms.
    for(const value of Object.values(l.lights)) if(Array.isArray(value))for(const o of value)if(o?.isPointLight)o.visible=outside && o.visible;
  }
}
