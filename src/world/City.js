import * as THREE from 'three';
import { CityChunk } from './CityChunk.js';
import { CityResources } from './CityResources.js';
import { CITY_CONFIG, CITY_SEED, districtForChunk } from './districts.js';

export class City {
  constructor(scene, seed = CITY_SEED) {
    if (!Number.isSafeInteger(seed)) throw new TypeError('City seed must be a safe integer');
    this.seed = seed;
    this.config = CITY_CONFIG;
    this.extent = this.config.count * this.config.spacing / 2;
    this.resources = new CityResources();
    this.group = new THREE.Group(); this.group.name = 'Districts'; scene.add(this.group);
    this.chunks = new Map(); this.blocks = new Map();
    this.buildings = []; this.landmarks = []; this.water = [];
    this.lampPositions = []; this.neonPositions = [];
    for (let ix = 0; ix < this.config.count; ix++) for (let iz = 0; iz < this.config.count; iz++) {
      const chunk = this.createChunk(ix, iz);
      this.chunks.set(chunk.id, chunk); this.blocks.set(chunk.id, chunk.colliders);
      chunk.attach(this.group);
      this.buildings.push(...chunk.buildings); this.landmarks.push(...chunk.landmarks); this.water.push(...chunk.water);
      this.lampPositions.push(...chunk.lamps); this.neonPositions.push(...chunk.signs);
    }
  }

  // Pure with respect to City registries: suitable for future asynchronous loading.
  createChunk(ix, iz) {
    if (!Number.isInteger(ix) || !Number.isInteger(iz) || ix < 0 || iz < 0 || ix >= this.config.count || iz >= this.config.count) {
      throw new RangeError('Chunk outside city bounds');
    }
    return new CityChunk(ix, iz, this.seed, this.resources);
  }

  chunkAt(x, z) {
    return this.chunks.get(`${Math.floor((x + this.extent) / this.config.spacing)},${Math.floor((z + this.extent) / this.config.spacing)}`);
  }

  districtAt(x, z) {
    return this.chunkAt(x, z)?.district ?? districtForChunk(x < 0 ? 0 : 4, z < 0 ? 0 : 4);
  }

  collides(x, z, radius = 0.42) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > this.extent - radius || Math.abs(z) > this.extent - radius) return true;
    const ix = Math.floor((x + this.extent) / this.config.spacing);
    const iz = Math.floor((z + this.extent) / this.config.spacing);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const block = this.blocks.get(`${ix + dx},${iz + dz}`);
      if (!block) continue;
      for (const b of block) {
        const closestX = Math.max(b.minX, Math.min(x, b.maxX));
        const closestZ = Math.max(b.minZ, Math.min(z, b.maxZ));
        if ((x - closestX) ** 2 + (z - closestZ) ** 2 < radius ** 2) return true;
      }
    }
    return false;
  }

  groundHeight(x, z) {
    const chunk = this.chunkAt(x, z);
    return chunk?.surfaces.find(b => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ)?.height ?? 0;
  }

  dispose() {
    for (const chunk of this.chunks.values()) chunk.disposeInstances();
    this.resources.dispose(); this.group.removeFromParent();
    this.chunks.clear(); this.blocks.clear();
  }
}
