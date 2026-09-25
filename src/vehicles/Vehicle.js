import { Vector3 } from 'three';

export const VEHICLE_SPECS = Object.freeze({
  NIGHTRIDER: { acceleration: 10, braking: 22, maxSpeed: 27, reverseSpeed: 8, mass: 1400, radius: .94 },
  POLICE: { acceleration: 9, braking: 20, maxSpeed: 29, reverseSpeed: 7, mass: 1550, radius: .94 },
  TARGET: { acceleration: 7, braking: 18, maxSpeed: 18, reverseSpeed: 6, mass: 1400, radius: .94 },
});

export class Vehicle {
  constructor(id, type = 'NIGHTRIDER', position = new Vector3(), rotation = Math.PI) {
    Object.assign(this, VEHICLE_SPECS[type]);
    this.id = id; this.type = type; this.position = position.clone(); this.rotation = rotation;
    this.velocity = new Vector3(); this.speed = 0; this.verticalSpeed = 0; this.steering = 0;
    this.integrity = 100; this.boost = 100; this.boosting = false; this.grounded = false;
    this.state = 'PARKED'; this.active = true; this.impact = 0; this.impactCooldown = 0;
    this.currentAcceleration = 0; this.brakingInput = false; this.handbrake = false;
  }
  damage(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.integrity = Math.max(0, this.integrity - amount);
    if (this.integrity === 0) { this.state = 'DISABLED'; this.speed = 0; this.velocity.set(0, 0, 0); }
  }
  repair(dt) {
    if (Math.abs(this.speed) > .5 || dt <= 0) return false;
    this.integrity = Math.min(100, this.integrity + 22 * dt);
    if (this.integrity > 0 && this.state === 'DISABLED') this.state = 'PARKED';
    return true;
  }
}
