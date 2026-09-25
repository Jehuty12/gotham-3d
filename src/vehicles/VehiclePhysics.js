import { Vector3 } from 'three';
import { nearbyVolumes } from '../utils/spatialQueries.js';
import { overlaps, box } from '../world/CollisionWorld.js';

const IDLE = Object.freeze({ throttle: 0, steering: 0, boost: false, handbrake: false });
export class VehiclePhysics {
  constructor(world) {
    this.world = world; this.accumulator = 0; this.tests = 0; this.activeColliders = 0;
    this.extras = new Map(); this.dynamic = new Map(); this.staticCandidates = [];
    this.frameColliders=new Set();
    for (const chunk of world.city.chunks?.values() ?? []) {
      for (const p of [...chunk.lamps, ...chunk.trafficSignals]) this.addStatic(box(p.x, 2.5, p.z, .36, 5, .36, 'vehicle-pole'));
    }
  }
  addStatic(b) {
    for (let x = Math.floor(b.minX / 64); x <= Math.floor(b.maxX / 64); x++) for (let z = Math.floor(b.minZ / 64); z <= Math.floor(b.maxZ / 64); z++) {
      const key = `${x},${z}`; if (!this.extras.has(key)) this.extras.set(key, []); this.extras.get(key).push(b);
    }
  }
  setObstacles(vehicles) {
    this.dynamic.clear();
    for (const vehicle of vehicles) {
      if (vehicle.active === false) continue;
      const key = `${Math.floor(vehicle.position.x / 16)},${Math.floor(vehicle.position.z / 16)}`;
      if (!this.dynamic.has(key)) this.dynamic.set(key, []); this.dynamic.get(key).push(vehicle);
    }
  }
  prepare(position, reach = 5) {
    const { x, z } = position;
    const found = new Set(nearbyVolumes(this.world, x - reach, x + reach, z - reach, z + reach, null));
    for (let ix = Math.floor((x - reach) / 64); ix <= Math.floor((x + reach) / 64); ix++) for (let iz = Math.floor((z - reach) / 64); iz <= Math.floor((z + reach) / 64); iz++) {
      for (const b of this.extras.get(`${ix},${iz}`) ?? []) found.add(b);
    }
    this.staticCandidates = [...found].filter(b => b.enabled !== false && b.maxX > x - reach && b.minX < x + reach && b.maxZ > z - reach && b.minZ < z + reach);
    for(const collider of this.staticCandidates)this.frameColliders.add(collider);
    this.activeColliders = this.frameColliders.size;
  }
  blocked(vehicle, position, rotation = vehicle.rotation) {
    const sin = Math.sin(rotation), cos = Math.cos(rotation), r = vehicle.radius;
    if (Math.abs(position.x) > this.world.city.extent - 2.4 || Math.abs(position.z) > this.world.city.extent - 2.4) return true;
    for (const offset of [-1.25, 0, 1.25]) {
      const x = position.x + sin * offset, z = position.z + cos * offset;
      for (const b of this.staticCandidates) {
        this.tests++;
        if (b.maxY <= position.y + .38 || b.minY >= position.y + 1.45) continue;
        if (overlaps(b, x, z, r)) return true;
      }
      for (let ix = Math.floor((x - 4) / 16); ix <= Math.floor((x + 4) / 16); ix++) for (let iz = Math.floor((z - 4) / 16); iz <= Math.floor((z + 4) / 16); iz++) {
        for (const other of this.dynamic.get(`${ix},${iz}`) ?? []) {
          if (other === vehicle || Math.abs(other.position.y - position.y) > 2) continue;
          this.frameColliders.add(other);this.activeColliders=this.frameColliders.size;
          const yaw = other.rotation ?? other.yaw ?? 0;
          for (const part of [-1.2, 1.2]) {
            this.tests++;
            if (Math.hypot(x - other.position.x - Math.sin(yaw) * part, z - other.position.z - Math.cos(yaw) * part) < r + (other.radius ?? .9)) return true;
          }
        }
      }
    }
    return false;
  }
  move(vehicle, delta, rotation = vehicle.rotation) {
    if(vehicle.type==='NIGHTRIDER')this.world.city.streaming?.ensureCollisionAt(vehicle.position.clone().add(delta));
    else if(!this.world.city.isLoadedAt?.(vehicle.position.x+delta.x,vehicle.position.z+delta.z)&&this.world.city.streaming)return false;
    this.prepare(vehicle.position, 5 + delta.length());
    const count = Math.max(1, Math.ceil(delta.length() / .25)), step = delta.clone().divideScalar(count);
    for (let i = 0; i < count; i++) {
      const next = vehicle.position.clone().add(step);
      if (this.blocked(vehicle, next, rotation)) return false;
      vehicle.position.copy(next);
    }
    vehicle.rotation = rotation; return true;
  }
  update(dt, vehicle, input = IDLE, wet = 0) {
    this.accumulator += Math.min(dt, .1); this.tests = 0;this.frameColliders.clear();this.activeColliders=0;
    while (this.accumulator + 1e-9 >= 1 / 120) { this.step(1 / 120, vehicle, input, wet); this.accumulator -= 1 / 120; }
  }
  step(dt, v, input = IDLE, wet = 0) {
    v.impact *= Math.exp(-8 * dt); v.impactCooldown = Math.max(0, v.impactCooldown - dt);
    const enabled = v.integrity > 0, throttle = enabled ? input.throttle : 0, previous = v.speed;
    if(!input.boost)v.boostExhausted=false;
    if(v.boost<=1)v.boostExhausted=true;
    v.boosting = enabled && input.boost && throttle > 0 && !v.boostExhausted && v.boost > 1;
    v.boost = Math.max(0, Math.min(100, v.boost + (v.boosting ? -24 : 12) * dt));
    v.brakingInput = throttle !== 0 && Math.sign(throttle) !== Math.sign(v.speed) && Math.abs(v.speed) > .3;
    v.handbrake = input.handbrake;
    if (throttle) v.speed += throttle * (v.brakingInput ? v.braking : v.acceleration * (v.boosting ? 1.45 : 1)) * dt;
    else v.speed *= Math.exp(-.45 * dt);
    if (input.handbrake || !enabled) v.speed *= Math.exp(-(enabled ? 2.5 : 20) * dt);
    if (Math.abs(v.speed) < .03 && !throttle) v.speed = 0;
    v.speed = Math.max(-v.reverseSpeed, Math.min(v.maxSpeed * (v.boosting ? 1.22 : 1), v.speed));
    v.steering += ((input.steering ?? 0) - v.steering) * (1 - Math.exp(-8 * dt));
    const yaw = v.rotation + v.steering * Math.sign(v.speed) * Math.min(1, Math.abs(v.speed) / 4) * (1.55 / (1 + Math.abs(v.speed) / 22)) * dt;
    const desired = new Vector3(Math.sin(yaw) * v.speed, 0, Math.cos(yaw) * v.speed);
    v.velocity.lerp(desired, 1 - Math.exp(-(input.handbrake ? 2.8 : 12 - Math.min(1, wet) * 1.5) * dt));
    if (v.velocity.length() > v.maxSpeed * 1.22) v.velocity.setLength(v.maxSpeed * 1.22);
    if (!this.move(v, v.velocity.clone().multiplyScalar(dt), yaw)) {
      const impact = Math.abs(v.speed); v.speed *= -.12; v.velocity.multiplyScalar(-.12); v.impact = Math.min(1, impact / 20);
      if (impact > 8 && v.impactCooldown === 0) { v.damage(Math.min(18, (impact - 6) * .7 * 1400 / v.mass)); v.impactCooldown = .6; }
    }
    const ground = this.world.city.groundHeight(v.position.x, v.position.z);
    v.verticalSpeed -= 18 * dt; v.position.y += v.verticalSpeed * dt;
    v.grounded = v.position.y <= ground;
    if (v.grounded) { v.position.y = ground; v.verticalSpeed = 0; }
    v.currentAcceleration = (v.speed - previous) / dt;
    if (!enabled) { v.speed = 0; v.velocity.set(0, 0, 0); v.boosting = false; }
  }
}
