import * as THREE from 'three';
import { deriveSeed, seededRandom, InstanceBatch } from '../utils/procedural.js';
import { softParticleTexture } from '../utils/DynamicInstances.js';

export class SteamSystem {
  constructor(scene, city, capacity = 600) {
    this.capacity = capacity; this.budget = 320; this.count = 0;
    this.sources = []; this.nearby = []; this.last = new THREE.Vector3(Infinity, 0, Infinity);
    for (const chunk of city.chunks.values()) {
      const random = seededRandom(deriveSeed(city.seed, 'steam', chunk.id));
      const grates = new InstanceBatch(city.resources.box, city.resources.materials.trim);
      const candidates = [{ x: chunk.x - 31, z: chunk.z + (random() - 0.5) * 28, kind: 'manhole' }];
      if (chunk.district.id === 'old') candidates.push({ x: chunk.x + 8, z: chunk.z + 4, kind: 'alley' });
      if (['industrial', 'docks'].includes(chunk.district.id)) {
        candidates.push({ x: chunk.x - chunk.platformSize / 2 + 0.6, z: chunk.z + 5, kind: chunk.district.id });
      }
      for (const p of candidates) {
        if (city.collides(p.x, p.z, 0.3)) continue;
        const source = { ...p, y: city.groundHeight(p.x, p.z) + 0.08, phase: random() * 7 };
        this.sources.push(source);
        for (let slit = -2; slit <= 2; slit++) grates.add(p.x + slit * 0.18, source.y - 0.04, p.z, 0.1, 0.04, 0.9);
      }
      grates.build(chunk.group);
    }
    const random = seededRandom(deriveSeed(city.seed, 'steam-particles'));
    this.seeds = Float32Array.from({ length: capacity * 3 }, () => random());
    this.positions = new Float32Array(capacity * 3); this.colors = new Float32Array(capacity * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.PointsMaterial({ map: softParticleTexture(), color: '#a5b5bc', size: 3.5,
      transparent: true, opacity: 0.17, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending });
    this.mesh = new THREE.Points(this.geometry, this.material); this.mesh.frustumCulled = false;
    this.mesh.name = 'nearby-steam'; scene.add(this.mesh);
  }
  configure(profile) { this.budget = Math.min(this.capacity, profile.steam); this.last.set(Infinity, 0, Infinity); }
  update(time, player) {
    if (this.last.distanceToSquared(player) > 16) {
      this.last.copy(player);
      this.nearby = this.sources.filter(s => (s.x - player.x) ** 2 + (s.z - player.z) ** 2 < 65 ** 2 && Math.abs(s.y-player.y)<12 && (s.y<0)===(player.y<0))
        .sort((a, b) => (a.x - player.x) ** 2 + (a.z - player.z) ** 2 - (b.x - player.x) ** 2 - (b.z - player.z) ** 2).slice(0, 12);
    }
    this.count = Math.min(this.budget, this.nearby.length * 36);
    this.geometry.setDrawRange(0, this.count);
    for (let i = 0; i < this.count; i++) {
      const source = this.nearby[i % this.nearby.length], j = i * 3;
      const life = ((time * 0.22 + this.seeds[j] + source.phase) % 1);
      this.positions[j] = source.x + (this.seeds[j + 1] - 0.5) * (0.5 + life * 2.5) + Math.sin(time * 0.3) * life;
      this.positions[j + 1] = source.y + life * 5;
      this.positions[j + 2] = source.z + (this.seeds[j + 2] - 0.5) * (0.5 + life * 2.5);
      const fade = Math.sin(life * Math.PI) * 0.75;
      this.colors[j] = this.colors[j + 1] = this.colors[j + 2] = fade;
    }
    this.geometry.attributes.position.needsUpdate = true; this.geometry.attributes.color.needsUpdate = true;
  }
}
