import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { City } from '../src/world/City.js';
import { DISTRICTS } from '../src/world/districts.js';
import { RainSystem } from '../src/systems/RainSystem.js';
import { SteamSystem } from '../src/systems/SteamSystem.js';
import { TrafficLights } from '../src/systems/TrafficLights.js';
import { TrafficSystem, VEHICLE_TYPES } from '../src/systems/TrafficSystem.js';
import { PedestrianSystem } from '../src/systems/PedestrianSystem.js';
import { AudioManager, AUDIO_CATEGORIES } from '../src/systems/AudioManager.js';
import { PerformanceManager, QUALITY_PROFILES } from '../src/systems/PerformanceManager.js';
import { ElevatedRail } from '../src/world/ElevatedRail.js';
import { LivingCity } from '../src/systems/LivingCity.js';
import { windowState } from '../src/utils/windows.js';

const scene = new THREE.Scene(), city = new City(scene), player = new THREE.Vector3(0, 1.75, 54);

test('rain is deterministic, local and reuses a single buffer across profiles', () => {
  const a = new RainSystem(new THREE.Scene(), 1989), b = new RainSystem(new THREE.Scene(), 1989);
  const buffer = a.positions;
  a.configure(QUALITY_PROFILES.HIGH); b.configure(QUALITY_PROFILES.HIGH);
  a.update(7, player); b.update(7, player);
  assert.deepEqual(a.positions, b.positions);
  assert.equal(a.count, 4000); assert.equal(a.geometry.drawRange.count, 8000);
  for (let i = 0; i < a.count; i++) assert.ok(Math.abs(a.positions[i * 6]) <= 24 && Math.abs(a.positions[i * 6 + 2]) <= 24);
  a.update(10, new THREE.Vector3(128, 2, -128));
  assert.equal(a.positions, buffer); assert.equal(a.mesh.position.x, 128);
  a.configure(QUALITY_PROFILES.LOW); assert.equal(a.count, 450);
});

test('rain off, zero intensity and invalid intensity safely disable drawing', () => {
  const rain = new RainSystem(new THREE.Scene(), 1989);
  rain.setIntensity(0.5); assert.equal(rain.count, 900);
  rain.setEnabled(false); rain.update(1, player); assert.equal(rain.geometry.drawRange.count, 0);
  rain.setEnabled(true); rain.setIntensity(NaN); rain.update(2, player); assert.equal(rain.mesh.visible, false);
  rain.setIntensity(3); assert.equal(rain.intensity, 1);
});

test('steam sources cover manholes, alleys, industry and docks, and stay local', () => {
  const steam = new SteamSystem(scene, city);
  assert.deepEqual(new Set(steam.sources.map(s => s.kind)), new Set(['manhole', 'alley', 'industrial', 'docks']));
  const buffer = steam.positions;
  for (const pos of [player, new THREE.Vector3(-128, 2, -128), new THREE.Vector3(220, 2, 100)]) {
    steam.update(12, pos);
    assert.ok(steam.count <= 320);
    for (const source of steam.nearby) assert.ok(Math.hypot(source.x - pos.x, source.z - pos.z) < 65);
  }
  assert.equal(steam.positions, buffer); assert.ok(steam.positions.every(Number.isFinite));
});

test('signal cycle is seeded, has all colors, and never gives crossing traffic simultaneous green', () => {
  const lights = new TrafficLights(scene, city), node = { x: 0, z: 0 }, states = new Set();
  for (let time = 0; time < 68; time += 0.25) {
    const x = lights.state(node, 'x', time), z = lights.state(node, 'z', time);
    assert.ok(!(x === 'green' && z === 'green')); states.add(x); states.add(z);
    assert.equal(x, lights.state(node, 'x', time + 34));
  }
  assert.deepEqual(states, new Set(['green', 'amber', 'red']));
});

test('cars stop at a red signal, then enter the intersection at green', () => {
  const lights = new TrafficLights(scene, city), traffic = new TrafficSystem(scene, city, lights);
  traffic.count = 1;
  const car = traffic.cars[0]; traffic.spawn(car, player); car.progress = 47.9; traffic.place(car);
  const observer = car.position.clone().add(new THREE.Vector3(30, 0, 30));
  let red = 0; while (lights.state(car.to, car.dir.x ? 'x' : 'z', red) !== 'red') red++;
  lights.time = red;
  for (let i = 0; i < 90; i++) traffic.update(1 / 30, observer);
  assert.equal(car.progress, 48); assert.equal(car.mode, 'road'); assert.equal(car.stopped, true);
  let green = 0; while (lights.state(car.to, car.dir.x ? 'x' : 'z', green) !== 'green') green++;
  lights.time = green; traffic.update(1 / 30, observer);
  assert.equal(car.mode, 'turn'); assert.equal(car.stopped, false);
});

test('forty cars turn, stay out of buildings and recycle within a fixed allocation', () => {
  const localScene = new THREE.Scene(), localCity = new City(localScene);
  const lights = new TrafficLights(localScene, localCity), traffic = new TrafficSystem(localScene, localCity, lights);
  traffic.configure(QUALITY_PROFILES.HIGH);
  const matrix = traffic.batches.body.mesh.instanceMatrix.array;
  for (let tick = 0; tick < 2100; tick++) {
    lights.time = tick / 30; traffic.update(1 / 30, player);
    if (tick % 15 === 0) for (const car of traffic.cars) {
      assert.equal(localCity.collides(car.position.x, car.position.z, 2.3), false, `vehicle ${car.id} ${car.mode} at ${car.position.toArray()}`);
    }
  }
  assert.ok(traffic.turnsCompleted > 20); assert.ok(traffic.redStops > 0);
  traffic.update(1 / 30, new THREE.Vector3(-190, 2, -190)); traffic.render(71, player);
  assert.equal(traffic.batches.body.mesh.instanceMatrix.array, matrix);
  assert.equal(traffic.batches.body.mesh.count, 40);
  assert.ok(traffic.recycles > 40); assert.ok(VEHICLE_TYPES.has('police'));
});

test('traffic trajectories are reproducible for the same seed and simulation ticks', () => {
  const lights = new TrafficLights(scene, city), a = new TrafficSystem(scene, city, lights), b = new TrafficSystem(scene, city, lights);
  for (let tick = 0; tick < 450; tick++) { lights.time = tick / 30; a.update(1 / 30, player); b.update(1 / 30, player); }
  assert.deepEqual(a.cars.map(c => c.position.toArray()), b.cars.map(c => c.position.toArray()));
});

test('vehicles at every map corner recycle locally without overlaps on spawn', () => {
  const lights = new TrafficLights(scene, city), traffic = new TrafficSystem(scene, city, lights);
  traffic.configure(QUALITY_PROFILES.LOW);
  for (const [x, z] of [[-250, -250], [250, -250], [-250, 250], [250, 250]]) {
    const observer = new THREE.Vector3(x, 2, z);
    for (let tick = 0; tick < 20; tick++) traffic.update(1 / 30, observer);
    const active = traffic.cars.slice(0, traffic.count).filter(car => car.initialized);
    assert.ok(active.length >= 5);
    for (const car of active) assert.ok(Math.hypot(car.position.x - x, car.position.z - z) < 111);
  }
});

test('distant police flash red/blue and reuse one moving light; LOW disables that light', () => {
  const lights = new TrafficLights(scene, city), traffic = new TrafficSystem(scene, city, lights);
  traffic.count = 1;
  const car = traffic.cars[0]; car.initialized = true; car.position.set(60, 0, 0); car.phaseOffset = 0;
  const observer = new THREE.Vector3();
  traffic.render(0, observer); const first = traffic.eventLight.color.clone();
  assert.equal(traffic.eventLight.intensity, 30);
  car.position.x = 65; traffic.render(0.125, observer);
  assert.notDeepEqual(traffic.eventLight.color, first); assert.equal(traffic.eventLight.position.x, 65);
  traffic.render(12, observer); assert.equal(traffic.eventLight.intensity, 0);
  traffic.configure(QUALITY_PROFILES.LOW); traffic.render(0, observer); assert.equal(traffic.eventLight.intensity, 0);
});

test('rail loop is closed, reproducible, continuously moving and has two named stations', () => {
  const localScene = new THREE.Scene(), localCity = new City(localScene), rail = new ElevatedRail(localScene, localCity);
  assert.ok(rail.path.getPointAt(0).distanceTo(rail.path.getPointAt(1)) < 0.001);
  const secondCity = new City(new THREE.Scene()), second = new ElevatedRail(new THREE.Scene(), secondCity);
  assert.deepEqual(rail.positionAt(20).position.toArray(), second.positionAt(20).position.toArray());
  assert.ok(rail.positionAt(20).position.distanceTo(rail.positionAt(20.1).position) > 0.8);
  assert.deepEqual(rail.stations.map(s => s.districtId), ['downtown', 'industrial']);
  for (const pillar of rail.pillars) assert.equal(localCity.collides(pillar.x, pillar.z), true);
  for (let line = -192; line <= 192; line += 64) for (let n = -250; n <= 250; n += 2) {
    assert.equal(localCity.collides(line, n), false, `rail pillar blocks road ${line},${n}`);
    assert.equal(localCity.collides(n, line), false);
  }
  for (let t = 0; t < 1; t += 0.005) {
    const p = rail.path.getPointAt(t);
    for (const b of localCity.buildings) {
      assert.ok(p.x + 1.6 < b.minX || p.x - 1.6 > b.maxX || p.z + 1.6 < b.minZ || p.z - 1.6 > b.maxZ, 'rail intersects a building');
    }
  }
});

test('pedestrians remain on sidewalks, outside obstacles and below the visible cap', () => {
  const localScene = new THREE.Scene(), localCity = new City(localScene);
  new ElevatedRail(localScene, localCity);
  const pedestrians = new PedestrianSystem(localScene, localCity); pedestrians.configure(QUALITY_PROFILES.HIGH);
  for (let tick = 0; tick < 900; tick++) {
    pedestrians.update(1 / 30, player);
    if (tick % 30 === 0) for (const person of pedestrians.people) {
      assert.equal(localCity.collides(person.position.x, person.position.z, 0.22), false);
      assert.equal(localCity.groundHeight(person.position.x, person.position.z), 0.24);
    }
  }
  pedestrians.render(30); assert.equal(pedestrians.body.mesh.count, 25);
  pedestrians.configure(QUALITY_PROFILES.LOW); pedestrians.render(31); assert.equal(pedestrians.body.mesh.count, 0);
});

test('pedestrians spawn safely after relocation into every district, including waterfront', () => {
  const localScene = new THREE.Scene(), localCity = new City(localScene);
  new ElevatedRail(localScene, localCity);
  const pedestrians = new PedestrianSystem(localScene, localCity); pedestrians.configure(QUALITY_PROFILES.HIGH);
  for (const [x, z] of [[-180, -180], [180, -180], [-180, 180], [230, 180]]) {
    const observer = new THREE.Vector3(x, 2, z);
    for (let tick = 0; tick < 60; tick++) pedestrians.update(1 / 30, observer);
    for (const person of pedestrians.people) if (person.path) {
      assert.equal(localCity.collides(person.position.x, person.position.z, 0.22), false);
      assert.equal(localCity.groundHeight(person.position.x, person.position.z), 0.24);
    }
  }
});

test('steam sources and particle positions repeat exactly for a seed', () => {
  const a = new SteamSystem(scene, city), b = new SteamSystem(scene, city);
  assert.deepEqual(a.sources, b.sources);
  a.update(9, player); b.update(9, player); assert.deepEqual(a.positions, b.positions);
});

test('window groups contain lit and dark panes, repeat exactly, and vary in tint', () => {
  const samples = [];
  for (let row = 0; row < 25; row++) for (let column = 0; column < 15; column++) {
    const args = [1989, 0, 0, 1, row, column, DISTRICTS.downtown];
    const state = windowState(...args); assert.deepEqual(state, windowState(...args)); samples.push(state);
  }
  assert.ok(samples.some(s => s.lit)); assert.ok(samples.some(s => !s.lit));
  assert.equal(new Set(samples.map(s => s.tint)).size, 2);
  const sameGroup = [0, 1, 2].flatMap(row => [0, 1].map(col => windowState(1989, 0, 0, 1, row, col, DISTRICTS.old).tint));
  assert.equal(new Set(sameGroup).size, 1);
});

test('quality budgets are bounded; frame statistics include all draw calls', () => {
  const manager = new PerformanceManager(city);
  assert.deepEqual(Object.values(QUALITY_PROFILES).map(p => p.cars), [10, 20, 40]);
  assert.deepEqual(Object.values(QUALITY_PROFILES).map(p => p.pedestrians), [0, 10, 25]);
  assert.throws(() => manager.setLevel('ULTRA'), RangeError);
  for (let i = 0; i < 60; i++) manager.recordFrame(1 / 60, 200);
  assert.ok(Math.abs(manager.fps - 60) < 0.01); assert.equal(manager.drawCalls, 200);
  manager.setLevel('LOW'); const camera = new THREE.PerspectiveCamera(); camera.position.copy(player); manager.updateVisibility(camera);
  assert.ok([...city.chunks.values()].some(c => !c.group.visible));
  for (const chunk of city.chunks.values()) if (chunk.landmarks.length) assert.equal(chunk.group.visible, true);
});

test('audio is gesture-gated, supports all categories and clamps volume without downloads', () => {
  const audio = new AudioManager(1989);
  assert.equal(audio.context, null); assert.equal(AUDIO_CATEGORIES.length, 6);
  audio.setVolume(2); assert.equal(audio.volume, 1);
  audio.setVolume(-1); assert.equal(audio.volume, 0);
  assert.throws(() => audio.registerBuffer('missing', {}), RangeError);
  audio.registerBuffer('rain', { test: true }); assert.equal(audio.context, null);
  audio.dispose();
});

test('audio activates once, routes volume, replaces a category buffer and releases sources', async () => {
  let contexts = 0;
  const parameter = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() { this.stopped = true; } });
  const factory = () => {
    contexts++;
    return { sampleRate: 100, currentTime: 0, destination: {}, state: 'suspended',
      createGain: node, createBufferSource: node, createBiquadFilter: node, createOscillator: node,
      createBuffer: (_channels, length) => { const data = new Float32Array(length); return { getChannelData: () => data }; },
      async resume() { this.state = 'running'; }, async close() { this.state = 'closed'; } };
  };
  const audio = new AudioManager(1989, factory);
  await audio.activate(); await audio.activate();
  assert.equal(contexts, 1); assert.equal(audio.channels.size, 6); assert.equal(audio.sources.length, 6);
  audio.setActive(true); audio.setVolume(0.35); assert.equal(audio.master.gain.value, 0.35);
  const original = audio.sources.find(s => s.category === 'rain').source;
  const buffer = { supplied: true }; audio.registerBuffer('rain', buffer);
  assert.equal(original.stopped, true); assert.equal(audio.sources.find(s => s.category === 'rain').source.buffer, buffer);
  audio.setActive(false); assert.equal(audio.master.gain.value, 0);
  audio.dispose(); assert.equal(audio.sources.length, 0); assert.equal(audio.context.state, 'closed');
});

test('fixed-step LivingCity simulation gives the same traffic at 30 and 60 render FPS', () => {
  const create = () => {
    const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2('#172e3b', 0.0035);
    const city = new City(scene), camera = new THREE.PerspectiveCamera(); camera.position.copy(player);
    const renderer = { setPixelRatio() {}, getPixelRatio: () => 1 }, composer = { setPixelRatio() {} };
    const lights = { lastPosition: new THREE.Vector3(), update() {} };
    return new LivingCity({ scene, city, camera, renderer, composer, lights });
  };
  const a = create(), b = create();
  for (let i = 0; i < 150; i++) a.update(1 / 30);
  for (let i = 0; i < 300; i++) b.update(1 / 60);
  assert.deepEqual(a.traffic.cars.map(c => c.position.toArray()), b.traffic.cars.map(c => c.position.toArray()));
  assert.deepEqual(a.rail.position.toArray(), b.rail.position.toArray());
  assert.deepEqual(a.rain.positions, b.rain.positions);
  a.dispose(); b.dispose();
});
