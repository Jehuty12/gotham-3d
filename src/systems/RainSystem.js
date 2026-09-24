import * as THREE from 'three';
import { seededRandom, deriveSeed } from '../utils/procedural.js';

export class RainSystem {
  constructor(scene, seed, capacity = 4000) {
    this.capacity = capacity; this.budget = 1800; this.intensity = 1; this.enabled = true;
    this.drops = new Float32Array(capacity * 4);
    const random = seededRandom(deriveSeed(seed, 'rain'));
    for (let i = 0; i < this.drops.length; i++) this.drops[i] = random();
    this.positions = new Float32Array(capacity * 6);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.LineBasicMaterial({ color: '#95becf', transparent: true, opacity: 0.36, depthWrite: false });
    this.mesh = new THREE.LineSegments(this.geometry, this.material);
    this.mesh.frustumCulled = false; this.mesh.name = 'local-rain'; scene.add(this.mesh);
    this.configure({ rain: this.budget });
  }
  get count() { return this.enabled ? Math.round(this.budget * this.intensity) : 0; }
  configure(profile) { this.budget = Math.min(this.capacity, profile.rain); }
  setIntensity(value) { this.intensity = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1); }
  setEnabled(value) { this.enabled = Boolean(value); }
  update(time, player) {
    this.mesh.visible = this.count > 0;
    this.geometry.setDrawRange(0, this.count * 2);
    if (!this.count) return;
    this.mesh.position.set(player.x, player.y - 2, player.z);
    const wind = Math.sin(time * 0.13) * 1.6 + Math.sin(time * 0.043) * 1.1;
    const wrap = v => ((v % 48) + 48) % 48 - 24;
    for (let i = 0; i < this.count; i++) {
      const d = i * 4, p = i * 6;
      const y = ((this.drops[d + 2] * 26 - time * (18 + this.drops[d + 3] * 8)) % 26 + 26) % 26;
      const x = wrap(this.drops[d] * 48 + wind * y * 0.15);
      const z = wrap(this.drops[d + 1] * 48 + Math.sin(time * 0.07) * y * 0.08);
      this.positions[p] = x; this.positions[p + 1] = y; this.positions[p + 2] = z;
      this.positions[p + 3] = x - wind * 0.055; this.positions[p + 4] = y - 0.65; this.positions[p + 5] = z - 0.04;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}
