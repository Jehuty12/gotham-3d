import { Vector3 } from 'three';
import { segmentBlocked } from '../utils/spatialQueries.js';

export class VehicleCamera {
  constructor(camera, world) { this.camera = camera; this.world = world; this.modes = ['CHASE', 'CLOSE', 'HOOD']; this.index = 0; this.initialized = false; this.baseFov = camera.fov; }
  get mode() { return this.modes[this.index]; }
  cycle() { this.index = (this.index + 1) % this.modes.length; this.initialized = false; }
  update(dt, vehicle) {
    const hood = this.mode === 'HOOD', distance = this.mode === 'CHASE' ? 7 : 4.2;
    const forward = new Vector3(Math.sin(vehicle.rotation), 0, Math.cos(vehicle.rotation));
    const pivot = vehicle.position.clone().add(new Vector3(0, 1.45, 0));
    const desired = pivot.clone().addScaledVector(forward, hood ? .65 : -distance); desired.y += hood ? .06 : this.mode === 'CHASE' ? 2.8 : 1.1;
    if (!this.initialized) { this.camera.position.copy(desired); this.initialized = true; }
    else this.camera.position.lerp(desired, 1 - Math.exp(-10 * dt));
    if (!hood) {
      // At most five short local AABB queries; binary search for an unobstructed boom.
      const target = this.camera.position.clone();
      if (segmentBlocked(this.world, pivot, target, null)) {
        let low = 0, high = 1;
        for (let i = 0; i < 4; i++) { const mid = (low + high) / 2; if (segmentBlocked(this.world, pivot, pivot.clone().lerp(target, mid), null)) high = mid; else low = mid; }
        this.camera.position.copy(pivot).lerp(target, Math.max(0, low - .04));
      }
    }
    const look = pivot.clone().addScaledVector(forward, 6);
    look.x += Math.cos(vehicle.rotation) * vehicle.steering * .55; look.z -= Math.sin(vehicle.rotation) * vehicle.steering * .55;
    look.y += vehicle.impact * .12; this.camera.lookAt(look);
    const fov = this.baseFov + (vehicle.boosting ? 5 : 0);
    this.camera.fov += (fov - this.camera.fov) * (1 - Math.exp(-4 * dt)); this.camera.updateProjectionMatrix();
  }
  reset() { this.initialized = false; this.camera.fov = this.baseFov; this.camera.updateProjectionMatrix(); }
}
