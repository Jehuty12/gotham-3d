import * as THREE from 'three';
import { PlayerPhysics } from './PlayerPhysics.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class PlayerController {
  constructor(camera, element, city) {
    this.camera = camera;
    this.city = city;
    this.controls = new PointerLockControls(camera, element);
    this.controls.pointerSpeed = 0.65;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = Math.PI - 0.12;
    this.keys = new Set();
    this.velocity = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.wish = new THREE.Vector3();
    this.events = new AbortController();
    const options = { signal: this.events.signal };
    const codes = ['KeyW', 'KeyZ', 'KeyA', 'KeyQ', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space', 'ControlLeft', 'ControlRight', 'KeyE', 'KeyG', 'Digit1', 'Digit2', 'Digit3'];
    window.addEventListener('keydown', event => {
      if (!this.controls.isLocked || !codes.includes(event.code)) return;
      event.preventDefault();
      this.keys.add(event.code);
      if(!event.repeat) this.onAction?.(event.code);
    }, options);
    window.addEventListener('keyup', event => this.keys.delete(event.code), options);
    window.addEventListener('blur', () => { this.resetInput(); this.controls.unlock(); }, options);
    this.controls.addEventListener('unlock', () => this.resetInput());
  }

  resetInput() {
    this.keys.clear();
    this.velocity.set(0, 0, 0);
    this.physics?.velocity.set(0,0,0);
  }

  update(delta) {
    if (!this.controls.isLocked) return;
    const pressed = (...codes) => codes.some(code => this.keys.has(code));
    const ahead = Number(pressed('KeyW', 'KeyZ', 'ArrowUp')) - Number(pressed('KeyS', 'ArrowDown'));
    const sideways = Number(pressed('KeyD', 'ArrowRight')) - Number(pressed('KeyA', 'KeyQ', 'ArrowLeft'));
    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    this.forward.normalize();
    this.right.crossVectors(this.forward, this.camera.up).normalize();
    this.wish.copy(this.forward).multiplyScalar(ahead).addScaledVector(this.right, sideways).normalize();
    const crouch=pressed('ControlLeft','ControlRight');
    const speed = crouch ? 2.6 : pressed('ShiftLeft', 'ShiftRight') ? 10 : 5.3;
    this.wish.multiplyScalar(speed);
    this.physics ??= PlayerPhysics.forCity(this.camera,this.city);
    this.physics.update(delta,this.wish,{jump:pressed('Space'),crouch,mantle:ahead>0});
    this.velocity.copy(this.physics.velocity);
  }

  dispose() {
    this.events.abort();
    this.controls.dispose();
  }
}
