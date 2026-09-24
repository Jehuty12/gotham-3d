import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { City } from '../src/world/City.js';
import { PlayerController } from '../src/player/PlayerController.js';
import { createHash } from 'node:crypto';
import { DISTRICTS, CITY_SEED } from '../src/world/districts.js';

const city = new City(new THREE.Scene());

function playerAt(x, z) {
  const player = Object.create(PlayerController.prototype);
  Object.assign(player, {
    camera: new THREE.PerspectiveCamera(), city, controls: { isLocked: true },
    keys: new Set(), velocity: new THREE.Vector3(), forward: new THREE.Vector3(),
    right: new THREE.Vector3(), wish: new THREE.Vector3(),
  });
  player.camera.position.set(x, 1.75, z);
  return player;
}

function chunkDigest(chunk) {
  const hash = createHash('sha256');
  hash.update(JSON.stringify([chunk.buildings, chunk.colliders, chunk.signs, chunk.lamps, chunk.water]));
  chunk.group.traverse(object => {
    if (!object.isInstancedMesh) return;
    hash.update(Buffer.from(object.instanceMatrix.array.buffer));
    if (object.instanceColor) hash.update(Buffer.from(object.instanceColor.array.buffer));
  });
  return hash.digest('hex');
}

test('seed reproduces all transforms, colors, roofs, signs and colliders', () => {
  assert.equal(city.blocks.size, 64);
  assert.equal(city.seed, CITY_SEED);
  const same = new City(new THREE.Scene());
  const different = new City(new THREE.Scene(), 88);
  assert.deepEqual([...same.chunks.values()].map(chunkDigest), [...city.chunks.values()].map(chunkDigest));
  assert.notDeepEqual(different.buildings, city.buildings);
  same.dispose(); different.dispose();
});

test('spawn and road centers remain clear, buildings and boundaries block movement', () => {
  assert.equal(city.collides(0, 54), false);
  for (let n = -250; n <= 250; n += 2) {
    assert.equal(city.collides(0, n), false);
    assert.equal(city.collides(n, 0), false);
  }
  for (const b of city.buildings) {
    assert.equal(city.collides((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2), true);
  }
  assert.equal(city.collides(256, 0), true);
  assert.equal(city.collides(-256, 0), true);
});

test('running into a facade stops outside it even with long update steps', () => {
  const b = city.buildings.find(b => !city.collides((b.minX + b.maxX) / 2, b.maxZ + 3));
  const p = playerAt((b.minX + b.maxX) / 2, b.maxZ + 3);
  p.keys.add('KeyW'); p.keys.add('ShiftLeft');
  for (let i = 0; i < 50; i++) p.update(0.15);
  assert.ok(p.camera.position.z >= b.maxZ + 0.42);
  assert.ok(p.camera.position.z < b.maxZ + 0.7);
  assert.equal(city.collides(p.camera.position.x, p.camera.position.z), false);
});

test('W and Z move forward equally; diagonal speed stays normalized', () => {
  const w = playerAt(0, 54), z = playerAt(0, 54), diagonal = playerAt(0, 54);
  w.keys.add('KeyW'); z.keys.add('KeyZ'); diagonal.keys.add('KeyW'); diagonal.keys.add('KeyD');
  for (let i = 0; i < 20; i++) { w.update(0.016); z.update(0.016); diagonal.update(0.016); }
  assert.deepEqual(w.camera.position, z.camera.position);
  assert.ok(w.camera.position.z < 54);
  const straightDistance = Math.hypot(w.camera.position.x, w.camera.position.z - 54);
  const diagonalDistance = Math.hypot(diagonal.camera.position.x, diagonal.camera.position.z - 54);
  assert.ok(Math.abs(straightDistance - diagonalDistance) < 0.0001);
});

test('unlocked controls stop movement and reset clears held keys', () => {
  const p = playerAt(0, 54);
  p.keys.add('KeyW'); p.controls.isLocked = false; p.update(0.1);
  assert.equal(p.camera.position.z, 54);
  p.resetInput(); assert.equal(p.keys.size, 0); assert.equal(p.velocity.length(), 0);
});

test('chunks reproduce independently of load order and detach without owning shared resources', () => {
  for (const [ix, iz] of [[7, 7], [3, 2], [0, 0], [4, 2]]) {
    const copy = city.createChunk(ix, iz);
    assert.equal(chunkDigest(copy), chunkDigest(city.chunks.get(copy.id)));
    copy.attach(new THREE.Group()); copy.detach();
    assert.equal(copy.group.parent, null); copy.disposeInstances();
  }
  assert.throws(() => city.createChunk(-1, 0), RangeError);
});

test('all district road networks and boundaries remain connected and traversable', () => {
  for (let line = -192; line <= 192; line += 64) for (let n = -250; n <= 250; n += 2) {
    assert.equal(city.collides(line, n), false, `north-south ${line},${n}`);
    assert.equal(city.collides(n, line), false, `east-west ${n},${line}`);
  }
  for (const [x, z, code] of [[0, 230, 'KeyW'], [-230, 0, 'KeyD']]) {
    const p = playerAt(x, z); p.keys.add(code); p.keys.add('ShiftLeft');
    for (let i = 0; i < 950; i++) p.update(0.05);
    assert.ok(code === 'KeyW' ? p.camera.position.z < -230 : p.camera.position.x > 230);
    assert.equal(city.collides(p.camera.position.x, p.camera.position.z), false);
  }
});

test('districts have distinct heights, all building styles and all roof details', () => {
  for (const district of Object.values(DISTRICTS)) {
    const chunks = [...city.chunks.values()].filter(c => c.district === district);
    assert.equal(chunks.length, 16);
    const buildings = city.buildings.filter(b => b.districtId === district.id && !b.landmark);
    assert.ok(buildings.length > 0);
    const mean = buildings.reduce((sum, b) => sum + b.height, 0) / buildings.length;
    assert.ok(Math.abs(mean - district.averageHeight) < district.heightVariation);
    for (const c of chunks) {
      assert.equal(c.platformSize, 64 - district.roadWidth);
      assert.equal(city.groundHeight(c.x, c.z), 0.24);
      assert.equal(city.groundHeight(c.x - 31, c.z), 0);
    }
  }
  assert.equal(new Set(city.buildings.map(b => b.style)).size, 10);
  const details = new Set(city.buildings.flatMap(b => b.roofDetails ?? []));
  for (const type of ['hvac', 'water-tank', 'antenna', 'chimney', 'sign']) assert.ok(details.has(type), type);
});

test('three unique landmarks are tall and have a clear street approach', () => {
  assert.equal(city.landmarks.length, 3);
  assert.equal(new Set(city.landmarks.map(l => l.type)).size, 3);
  for (const landmark of city.landmarks) {
    assert.ok(landmark.height >= 90);
    assert.equal(city.collides(landmark.x, landmark.z), true);
    assert.equal(city.collides(landmark.x, landmark.z + 30), false);
  }
});

test('water, containers and crane feet block movement; old-town alleys reach plazas', () => {
  assert.equal(city.water.length, 4);
  for (const chunk of city.chunks.values()) {
    for (const b of chunk.colliders) if (['water', 'container', 'crane'].includes(b.kind)) {
      assert.equal(city.collides((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2), true);
    }
    for (const plaza of chunk.plazas) {
      // Enter between two building rows, then turn into the courtyard, avoiding the fountain.
      for (let dz = 3; dz <= 31; dz += 0.5) assert.equal(city.collides(plaza.x + 8, plaza.z + dz), false);
      for (let dx = 0; dx <= 8; dx += 0.5) assert.equal(city.collides(plaza.x + dx, plaza.z + 3), false);
    }
  }
});

test('A/Q strafe equivalently, sprint is faster and wall sliding works', () => {
  const a = playerAt(0, 54), q = playerAt(0, 54), sprint = playerAt(0, 54);
  a.keys.add('KeyA'); q.keys.add('KeyQ'); sprint.keys.add('KeyA'); sprint.keys.add('ShiftLeft');
  for (let i = 0; i < 15; i++) { a.update(0.016); q.update(0.016); sprint.update(0.016); }
  assert.deepEqual(a.camera.position, q.camera.position);
  assert.ok(Math.abs(sprint.camera.position.x) > Math.abs(a.camera.position.x) * 1.8);
  const b = city.buildings[0];
  const p = playerAt((b.minX + b.maxX) / 2, b.maxZ + 0.5);
  p.keys.add('KeyW'); p.keys.add('KeyD');
  const startX = p.camera.position.x;
  for (let i = 0; i < 30; i++) p.update(0.016);
  assert.ok(p.camera.position.x > startX + 1);
  assert.ok(p.camera.position.z >= b.maxZ + 0.42);
});

test('geometry shares at most nine materials and every instance transform is finite', () => {
  const materials = new Set();
  city.group.traverse(object => {
    if (object.material) materials.add(object.material);
    if (object.isInstancedMesh) assert.ok(object.instanceMatrix.array.every(Number.isFinite));
  });
  assert.ok(materials.size <= 9);
});
