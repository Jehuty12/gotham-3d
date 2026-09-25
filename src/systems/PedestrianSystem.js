import * as THREE from 'three';
import { seededRandom, deriveSeed } from '../utils/procedural.js';
import { DynamicInstances } from '../utils/DynamicInstances.js';

export class PedestrianSystem {
  constructor(scene, city, capacity = 25) {
    this.city = city; this.capacity = capacity; this.count = 10; this.radius = 100;
    this.paths = [...city.chunks.values()].map(chunk => {
      const half = chunk.platformSize / 2 - 0.55;
      const minX = chunk.x - half, maxX = chunk.x + (chunk.waterfront ? 1 : half);
      return { chunk, minX, maxX, minZ: chunk.z - half, maxZ: chunk.z + half, width: maxX - minX, depth: half * 2 };
    });
    const palette = ['#38434c', '#55434b', '#3a514a', '#555b60'].map(c => new THREE.Color(c));
    this.people = Array.from({ length: capacity }, (_, id) => {
      const random = seededRandom(deriveSeed(city.seed, 'pedestrian', id));
      return { id, random, color: palette[Math.floor(random() * palette.length)], speed: 0.65 + random() * 0.6,
        offset: random(), walkPhase: random() * Math.PI * 2, path: null, position: new THREE.Vector3(), yaw: 0 };
    });
    this.body = new DynamicInstances(scene, new THREE.CapsuleGeometry(0.2, 0.62, 3, 6), new THREE.MeshStandardMaterial({ color: 'white', roughness: 0.95 }), capacity);
    this.head = new DynamicInstances(scene, new THREE.SphereGeometry(0.13, 6, 5), new THREE.MeshStandardMaterial({ color: '#927e71', roughness: 0.9 }), capacity);
    this.legs = new DynamicInstances(scene, city.resources.box, new THREE.MeshStandardMaterial({ color: '#253039', roughness: 1 }), capacity * 2);
  }
  configure(profile) { this.count = Math.min(this.capacity, profile.pedestrians); this.radius = Math.min(120, profile.activityRadius); }
  get activeCount() { return this.people.reduce((count, person, i) => count + Number(i < this.count && Boolean(person.path)), 0); }
  spawn(person, player) {
    const choices = this.paths.filter(p => (p.chunk.x - player.x) ** 2 + (p.chunk.z - player.z) ** 2 < this.radius ** 2);
    for (let attempt = 0; attempt < 32; attempt++) {
      person.path = (choices.length ? choices : this.paths)[Math.floor(person.random() * (choices.length || this.paths.length))];
      person.distance = (attempt ? person.random() : person.offset) * 2 * (person.path.width + person.path.depth);
      this.place(person);
      if (this.city.isLoadedAt(person.position.x,person.position.z)&&!this.city.collides(person.position.x, person.position.z, 0.22) && person.position.y === 0.24) return true;
    }
    person.path = null; return false;
  }
  place(person) {
    const p = person.path, perimeter = 2 * (p.width + p.depth);
    let d = ((person.distance % perimeter) + perimeter) % perimeter;
    let x, z;
    if (d < p.width) { x = p.minX + d; z = p.minZ; person.yaw = Math.PI / 2; }
    else if ((d -= p.width) < p.depth) { x = p.maxX; z = p.minZ + d; person.yaw = 0; }
    else if ((d -= p.depth) < p.width) { x = p.maxX - d; z = p.maxZ; person.yaw = -Math.PI / 2; }
    else { d -= p.width; x = p.minX; z = p.maxZ - d; person.yaw = Math.PI; }
    person.position.set(x, this.city.groundHeight(x, z), z);
  }
  update(delta, player) {
    for (let i = 0; i < this.count; i++) {
      const person = this.people[i];
      if (!person.path || !this.city.isLoadedAt(person.position.x,person.position.z)||Math.hypot(person.position.x - player.x, person.position.z - player.z) > this.radius + 35) {
        if (!this.spawn(person, player)) continue;
      }
      const previous = person.distance;
      person.distance += person.speed * delta; this.place(person);
      if (this.city.collides(person.position.x, person.position.z, 0.22)) {
        person.distance = previous; person.speed *= -1; this.place(person);
      }
    }
  }
  render(time) {
    this.body.begin(); this.head.begin(); this.legs.begin();
    for (let i = 0; i < this.count; i++) {
      const person = this.people[i]; if (!person.path||!this.city.isLoadedAt(person.position.x,person.position.z)) continue;
      const p = person.position, bob = Math.sin(time * 6 + person.walkPhase) * 0.025;
      this.body.add(p.x, p.y + 1.03 + bob, p.z, 1, 1, 1, person.yaw, person.color);
      this.head.add(p.x, p.y + 1.66 + bob, p.z, 1, 1, 1);
      for (const side of [-1, 1]) {
        const stride = Math.sin(time * 6 + person.walkPhase) * 0.13 * side;
        this.legs.add(p.x + Math.cos(person.yaw) * side * 0.11 + Math.sin(person.yaw) * stride,
          p.y + 0.37, p.z - Math.sin(person.yaw) * side * 0.11 + Math.cos(person.yaw) * stride, 0.12, 0.68, 0.15, person.yaw);
      }
    }
    this.body.end(); this.head.end(); this.legs.end();
  }
}
