import * as THREE from 'three';
import { seededRandom, deriveSeed } from '../utils/procedural.js';
import { DynamicInstances } from '../utils/DynamicInstances.js';
import { RoadNetwork, direction, lanePoint, TURN_RADIUS } from '../utils/routes.js';

export const VEHICLE_TYPES = new Map([
  ['car', Object.freeze({ width: 1.7, length: 4.1, roofLight: false })],
  ['police', Object.freeze({ width: 1.7, length: 4.3, roofLight: true })],
  ['taxi', Object.freeze({ width: 1.7, length: 4.1, roofLight: false, taxi: true })],
  ['delivery', Object.freeze({ width: 1.8, length: 4.3, roofLight: false, delivery: true })],
]);

export class TrafficSystem {
  constructor(scene, city, lights, capacity = 40) {
    this.city = city; this.lights = lights; this.capacity = capacity; this.count = 20; this.radius = 150;
    this.network = new RoadNetwork(city); this.turnsCompleted = 0; this.redStops = 0; this.recycles = 0;
    const palette = ['#293f4e', '#473b42', '#2d4943', '#52504b', '#30333f'].map(c => new THREE.Color(c));
    this.cars = Array.from({ length: capacity }, (_, id) => {
      const random = seededRandom(deriveSeed(city.seed, 'vehicle', id));
      const type=id%17===0?'police':id%9===0?'taxi':id%13===0?'delivery':'car';
      return { id, random, type, category:({car:'CIVILIAN',police:'POLICE',taxi:'TAXI',delivery:'DELIVERY'})[type],color:type==='taxi'?new THREE.Color('#736137'):palette[Math.floor(random() * palette.length)],
        speed: 6 + random() * 3, phaseOffset: random() * 43, initialized: false, position: new THREE.Vector3(), yaw: 0,
        progress: 0, mode: 'road', stopped: false };
    });
    const box = city.resources.box;
    this.batches = {
      body: new DynamicInstances(scene, box, new THREE.MeshStandardMaterial({ color: 'white', roughness: 0.4, metalness: 0.5 }), capacity),
      glass: new DynamicInstances(scene, box, new THREE.MeshStandardMaterial({ color: '#263e4d', roughness: 0.2, metalness: 0.65 }), capacity),
      wheels: new DynamicInstances(scene, box, new THREE.MeshStandardMaterial({ color: '#10171d', roughness: 0.9 }), capacity * 4),
      headlights: new DynamicInstances(scene, box, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.7, 2.1) }), capacity * 2),
      tail: new DynamicInstances(scene, box, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.8, 0.05, 0.03) }), capacity * 2),
      police: new DynamicInstances(scene, box, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) }), capacity * 2),
    };
    this.flashColors = [new THREE.Color('#ff243e'), new THREE.Color('#286eff')];
    this.eventLight = new THREE.PointLight('#386dff', 0, 18, 2); scene.add(this.eventLight);
    this.eventLightEnabled = true; this.eventActive = false;
  }
  configure(profile) { this.count = Math.min(this.capacity, profile.cars); this.radius = profile.activityRadius; this.eventLightEnabled = profile.policeLight;this.simulationDistance=profile.vehicleSimulationDistance??this.radius; }
  get activeCount() { return this.cars.reduce((count, car, i) => count + Number(i < this.count && car.initialized), 0); }
  spawn(car, player) {
    const candidates = this.network.edges.filter(e => (e.a.x + e.b.x - 2 * player.x) ** 2 + (e.a.z + e.b.z - 2 * player.z) ** 2 < ((this.radius + 32) * 2) ** 2);
    const edges = candidates.length ? candidates : this.network.edges;
    for (let attempt = 0; attempt < 56; attempt++) {
      const edge = edges[Math.floor(car.random() * edges.length)];
      car.from = edge.a; car.to = edge.b; car.dir = edge.dir;
      car.progress = car.random() * (64 - TURN_RADIUS * 2);
      car.mode = 'road'; this.place(car);
      const distance = Math.hypot(car.position.x - player.x, car.position.z - player.z);
      if (distance < 8 || distance > this.radius) continue;
      if(!this.city.isLoadedAt(car.position.x,car.position.z))continue;
      if(this.vehicleObstacles?.some(v=>v.position.distanceToSquared(car.position)<64))continue;
      if (this.cars.every((other, index) => index >= this.count || other === car || !other.initialized || other.position.distanceToSquared(car.position) > 64)) {
        car.initialized = true; car.stopped = false; this.recycles++; return true;
      }
    }
    car.initialized = false; return false;
  }
  place(car) {
    if (car.mode === 'road') {
      const p = lanePoint(car.from, car.dir, TURN_RADIUS + car.progress);
      car.position.set(p.x, 0, p.z); car.yaw = Math.atan2(car.dir.x, car.dir.z);
    } else {
      const t = Math.min(1, car.progress / car.turnLength);
      car.turn.getPoint(t, car.position);
      const tangent = car.turn.getTangent(t);
      car.yaw = Math.atan2(tangent.x, tangent.z);
    }
  }
  enterTurn(car) {
    const choices = car.to.neighbors.filter(n => n !== car.from);
    car.next = choices[Math.floor(car.random() * choices.length)];
    car.nextDir = direction(car.to, car.next);
    const start = lanePoint(car.to, car.dir, -TURN_RADIUS), end = lanePoint(car.to, car.nextDir, TURN_RADIUS);
    const control = new THREE.Vector3(car.to.x - (car.dir.z + car.nextDir.z) * 1.05, 0, car.to.z + (car.dir.x + car.nextDir.x) * 1.05);
    car.turn = new THREE.QuadraticBezierCurve3(new THREE.Vector3(start.x, 0, start.z), control, new THREE.Vector3(end.x, 0, end.z));
    car.turnLength = car.turn.getLength(); car.mode = 'turn'; car.progress = 0;
  }
  update(delta, player) {
    this.simplifiedCount=0;
    for (let i = 0; i < this.count; i++) {
      const car = this.cars[i];
      if (!car.initialized || !this.city.isLoadedAt(car.position.x,car.position.z) || Math.hypot(car.position.x - player.x, car.position.z - player.z) > this.radius) {
        if (!this.spawn(car, player)) continue;
      }
      let step=delta;
      if(this.vehicleObstacles&&car.position.distanceTo(player)>(this.simulationDistance??120)){
        this.simplifiedCount++;car.slowTime=(car.slowTime??0)+delta;if(car.slowTime<.1-1e-9)continue;step=car.slowTime;car.slowTime=0;
      } else car.slowTime=0;
      const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
      if(!this.city.isLoadedAt(car.position.x+fx*3,car.position.z+fz*3)){car.stopped=true;continue;}
      const ahead = (x, z, gap) => { const dx = x - car.position.x, dz = z - car.position.z;
        return dx * fx + dz * fz > 0 && dx * fx + dz * fz < gap && Math.abs(dx * fz - dz * fx) < 1.8; };
      car.stopped = ahead(player.x, player.z, 4);
      let pace=1;
      for(const obstacle of this.vehicleObstacles??[]){
        if(Math.abs(obstacle.position.y-car.position.y)>3)continue;
        if(ahead(obstacle.position.x,obstacle.position.z,18))pace=.4;
        const dx=obstacle.position.x-car.position.x,dz=obstacle.position.z-car.position.z;
        if(Math.hypot(dx,dz)<5||(dx*fx+dz*fz>0&&dx*fx+dz*fz<9&&Math.abs(dx*fz-dz*fx)<2.8))car.stopped=true;
      }
      for (let j = 0; j < this.count && !car.stopped; j++) {
        const other = this.cars[j];
        if (j !== i && other.initialized && ahead(other.position.x, other.position.z, 7)) car.stopped = true;
      }
      if (car.stopped) continue;
      car.progress += car.speed * step * pace * (car.type==='police'?1.12:car.type==='delivery'?.85:1);
      if (car.mode === 'road' && car.progress >= 48) {
        car.progress = 48;
        const occupied = this.cars.some((other, index) => index < this.count && other !== car && other.initialized && other.mode === 'turn' && other.to === car.to);
        if (this.lights.canEnter(car.to, car.dir) && !occupied) this.enterTurn(car);
        else { car.stopped = true; this.redStops++; }
      } else if (car.mode === 'turn' && car.progress >= car.turnLength) {
        car.from = car.to; car.to = car.next; car.dir = car.nextDir; car.progress = 0; car.mode = 'road'; this.turnsCompleted++;
      }
      this.place(car);
    }
  }
  render(time, player) {
    for (const batch of Object.values(this.batches)) batch.begin();
    this.eventLight.intensity = 0; this.eventActive = false;
    for (let i = 0; i < this.count; i++) {
      const car = this.cars[i]; if (!car.initialized) continue;
      if(!this.city.isLoadedAt(car.position.x,car.position.z))continue;
      const type = VEHICLE_TYPES.get(car.type), p = car.position;
      const part = (batch, x, y, z, w, h, d, color) => {
        const cos = Math.cos(car.yaw), sin = Math.sin(car.yaw);
        batch.add(p.x + x * cos + z * sin, y, p.z - x * sin + z * cos, w, h, d, car.yaw, color);
      };
      part(this.batches.body, 0, 0.65, 0, type.width, 0.65, type.length, car.color);
      part(this.batches.glass, 0, type.delivery?1.35:1.12, -0.2, type.delivery?1.65:1.35, type.delivery?1.3:.65, type.delivery?2.4:2.1);
      if(type.taxi)part(this.batches.police,0,1.6,-.2,.65,.25,.3,car.color);
      for (const side of [-1, 1]) {
        for (const axle of [-1, 1]) part(this.batches.wheels, side * 0.85, 0.38, axle * 1.25, 0.25, 0.6, 0.65);
        part(this.batches.headlights, side * 0.56, 0.68, type.length / 2 + 0.025, 0.38, 0.2, 0.08);
        part(this.batches.tail, side * 0.56, 0.65, -type.length / 2 - 0.025, 0.35, car.stopped ? 0.25 : 0.15, 0.08);
      }
      const distance = Math.hypot(p.x - player.x, p.z - player.z);
      const flashing = type.roofLight && (time + car.phaseOffset) % 43 < 9 && distance > 35;
      if (type.roofLight) for (let side = 0; side < 2; side++) {
        const on = flashing && Math.floor(time * 8) % 2 === side;
        part(this.batches.police, side ? 0.3 : -0.3, 1.55, -0.2, 0.5, 0.15, 0.3, on ? this.flashColors[side] : car.color);
        if (on && this.eventLightEnabled && distance < 120) {
          this.eventLight.position.set(p.x, 2, p.z); this.eventLight.color.copy(this.flashColors[side]); this.eventLight.intensity = 30;
        }
      }
      this.eventActive ||= flashing;
    }
    for (const batch of Object.values(this.batches)) batch.end();
  }
}
