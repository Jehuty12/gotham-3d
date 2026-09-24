import { RainSystem } from './RainSystem.js';
import { SteamSystem } from './SteamSystem.js';
import { TrafficSystem } from './TrafficSystem.js';
import { TrafficLights } from './TrafficLights.js';
import { PedestrianSystem } from './PedestrianSystem.js';
import { AudioManager } from './AudioManager.js';
import { PerformanceManager } from './PerformanceManager.js';
import { ElevatedRail } from '../world/ElevatedRail.js';

export class LivingCity {
  constructor({ scene, city, camera, renderer, composer, lights }) {
    Object.assign(this, { scene, city, camera, renderer, composer, lights });
    this.performance = new PerformanceManager(city);
    this.rain = new RainSystem(scene, city.seed);
    this.steam = new SteamSystem(scene, city);
    this.trafficLights = new TrafficLights(scene, city);
    this.rail = new ElevatedRail(scene, city);
    this.traffic = new TrafficSystem(scene, city, this.trafficLights);
    this.pedestrians = new PedestrianSystem(scene, city);
    this.audio = new AudioManager(city.seed);
    this.time = 0; this.accumulator = 0; this.visibilityTime = 0;
    this.setQuality('MEDIUM');
  }
  setQuality(level) {
    const profile = this.performance.setLevel(level);
    for (const system of [this.rain, this.steam, this.traffic, this.pedestrians]) system.configure(profile);
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, profile.pixelRatio));
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.scene.fog.density = level === 'LOW' ? 0.006 : level === 'MEDIUM' ? 0.0042 : 0.0035;
    this.lights.activeLightCount = profile.lamps; this.lights.haloDistance = profile.haloDistance;
    this.lights.lastPosition.set(Infinity, 0, Infinity);
    this.performance.updateVisibility(this.camera);
  }
  update(delta) {
    const p = this.camera.position;
    // Fixed simulation ticks make decisions independent of rendering frequency.
    this.accumulator += Math.min(delta, 0.1);
    const step = 1 / 30;
    while (this.accumulator + 1e-9 >= step) {
      this.time += step; this.accumulator -= step;
      this.trafficLights.time = this.time;
      this.traffic.update(step, p); this.pedestrians.update(step, p);
    }
    const renderTime = this.time + Math.max(0, this.accumulator);
    this.rain.update(renderTime, p); this.steam.update(renderTime, p);
    this.rail.update(renderTime); this.traffic.render(renderTime, p); this.pedestrians.render(renderTime);
    this.lights.update(p, renderTime);
    this.visibilityTime += delta;
    if (this.visibilityTime > 0.2) {
      this.visibilityTime = 0; this.performance.updateVisibility(this.camera);
      this.trafficLights.update(this.time, p, this.performance.profile.viewDistance);
      this.audio.update(this.time, { rain: this.rain.enabled ? this.rain.intensity : 0, traffic: this.traffic.count / 40,
        district: this.city.districtAt(p.x, p.z).id, trainDistance: p.distanceTo(this.rail.position), siren: this.traffic.eventActive });
    }
    const wet = this.rain.enabled ? this.rain.intensity : 0;
    this.city.resources.materials.asphalt.roughness = 0.7 - wet * 0.38;
    this.city.resources.materials.asphalt.metalness = 0.25 + wet * 0.22;
    this.city.resources.materials.pavement.roughness = 0.9 - wet * 0.27;
  }
  snapshot() {
    return { ...this.vertical?.snapshot(), triangles: this.performance.triangles ?? 0, fps: this.performance.fps, drawCalls: this.performance.drawCalls, quality: this.performance.level,
      seed: this.city.seed, chunks: this.city.chunks.size, totalBuildings: this.city.buildings.length, landmarks: this.city.landmarks.length,
      heading: this.camera.rotation.y,
      position: this.camera.position.toArray(), district: this.city.districtAt(this.camera.position.x, this.camera.position.z).name,
      chunk: this.city.chunkAt(this.camera.position.x, this.camera.position.z)?.id,
      buildings: ['interior','underground'].includes(this.vertical?.zone) ? 0 : this.performance.visibleBuildings,
      cars: this.traffic.activeCount, pedestrians: this.pedestrians.activeCount, particles: this.rain.count + this.steam.count,
      rain: this.rain.count, steam: this.steam.count, train: this.rail.position.toArray(), time: this.time,
      turns: this.traffic.turnsCompleted, redStops: this.traffic.redStops, audio: this.audio.context?.state ?? this.audio.status,
      volume: this.audio.volume,
      stoppedCars: this.traffic.cars.slice(0, this.traffic.count).filter(car => car.stopped).length };
  }
  dispose() { this.vertical?.dispose(); this.audio.dispose(); }
}
