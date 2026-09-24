import * as THREE from 'three';
import { deriveSeed, seededRandom } from '../utils/procedural.js';
import { DynamicInstances } from '../utils/DynamicInstances.js';
import { roundedLoop } from '../utils/routes.js';

export class ElevatedRail {
  constructor(scene, city) {
    this.city = city; this.speed = 10;
    const random = seededRandom(deriveSeed(city.seed, 'elevated-rail'));
    this.phase = random();
    const nodes = [{ x: 0, z: -128 }, { x: 128, z: -128 }, { x: 128, z: 64 }, { x: -128, z: 64 }, { x: -128, z: 0 }, { x: 0, z: 0 }];
    if (random() > 0.5) nodes.reverse();
    this.path = roundedLoop(nodes); this.length = this.path.getLength();
    this.stations = [{ x: 64, z: -128, name: 'Meridian', districtId: 'downtown' }, { x: -64, z: 64, name: 'Fonderies', districtId: 'industrial' }];
    this.pillars = [];
    const chunks = new Map();
    const get = (x, z) => {
      const chunk = city.chunkAt(x, z); if (!chunk) return null;
      if (!chunks.has(chunk.id)) chunks.set(chunk.id, { chunk, batches: city.resources.batches() });
      return chunks.get(chunk.id).batches;
    };
    const count = Math.ceil(this.length / 3);
    const metal = new THREE.Color('#4a5962');
    for (let i = 0; i < count; i++) {
      const a = this.path.getPointAt(i / count), b = this.path.getPointAt((i + 1) / count);
      const midpoint = a.clone().add(b).multiplyScalar(0.5);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z), length = a.distanceTo(b) + 0.12;
      const batches = get(midpoint.x, midpoint.z); if (!batches) continue;
      batches.metal.add(midpoint.x, 10, midpoint.z, 3.8, 0.6, length, yaw, metal);
      for (const side of [-1, 1]) batches.trim.add(midpoint.x + Math.cos(yaw) * side, 10.45, midpoint.z - Math.sin(yaw) * side, 0.13, 0.2, length, yaw);
      if (i % 8 !== 0) continue;
      // Supports sit on free sidewalk ground, never in the road or in a building.
      for (let offset = 6; offset <= 15; offset++) {
        const x = midpoint.x + Math.cos(yaw) * offset, z = midpoint.z - Math.sin(yaw) * offset;
        if (city.groundHeight(x, z) < 0.2 || city.collides(x, z, 0.75)) continue;
        const owner = city.chunkAt(x, z), support = get(x, z);
        support.trim.add(x, 5, z, 0.8, 10, 0.8);
        support.trim.add((x + midpoint.x) / 2, 9.5, (z + midpoint.z) / 2, offset + 1, 0.5, 0.6, yaw);
        owner.addObstacle(x, z, 0.8, 0.8, 'rail-pillar');
        this.pillars.push({ x, z }); break;
      }
    }
    for (const station of this.stations) {
      const batches = get(station.x, station.z);
      for (const side of [-1, 1]) {
        batches.metal.add(station.x, 10.3, station.z + side * 3.2, 21, 0.4, 2.2, 0, metal);
        batches.metal.add(station.x, 14, station.z + side * 3.2, 22, 0.35, 3, 0, metal);
        for (const dx of [-8, 0, 8]) batches.trim.add(station.x + dx, 12, station.z + side * 4, 0.18, 4, 0.18);
        batches.windows.add(station.x, 13.6, station.z + side * 3.2, 18, 0.12, 0.15, 0, new THREE.Color('#c1e3d7'));
      }
    }
    for (const { chunk, batches } of chunks.values()) for (const batch of Object.values(batches)) batch.build(chunk.group);
    const box = city.resources.box;
    this.body = new DynamicInstances(scene, box, new THREE.MeshStandardMaterial({ color: '#4d686b', roughness: 0.4, metalness: 0.6 }), 3);
    this.windows = new DynamicInstances(scene, box, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.4, 0.95) }), 36);
    this.trim = new DynamicInstances(scene, box, city.resources.materials.trim, 12);
    this.position = new THREE.Vector3(); this.visibleCars = 3;
  }
  positionAt(time, offset = 0) {
    const progress = ((this.phase + (time * this.speed - offset) / this.length) % 1 + 1) % 1;
    return { position: this.path.getPointAt(progress), tangent: this.path.getTangentAt(progress) };
  }
  update(time) {
    this.body.begin(); this.windows.begin(); this.trim.begin();
    for (let car = 0; car < 3; car++) {
      const { position: p, tangent } = this.positionAt(time, car * 8.2);
      if (car === 0) this.position.copy(p);
      const yaw = Math.atan2(tangent.x, tangent.z), bob = Math.sin(time * 15 + car) * 0.015;
      const part = (batch, x, y, z, w, h, d) => batch.add(p.x + x * Math.cos(yaw) + z * Math.sin(yaw), p.y + y + bob,
        p.z - x * Math.sin(yaw) + z * Math.cos(yaw), w, h, d, yaw);
      part(this.body, 0, 1.25, 0, 2.5, 2.4, 7.5);
      for (const side of [-1, 1]) {
        for (let window = -2; window <= 2; window++) part(this.windows, side * 1.26, 1.6, window * 1.25, 0.05, 0.85, 0.85);
        for (const axle of [-1, 1]) part(this.trim, side * 0.95, 0.05, axle * 2.3, 0.3, 0.4, 0.8);
      }
    }
    this.body.end(); this.windows.end(); this.trim.end();
  }
}
