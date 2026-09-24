import * as THREE from 'three';
import { Building } from './Building.js';
import { Road } from './Road.js';
import { addDock } from './Dock.js';
import { createLandmark, LANDMARK_SITES } from './Landmarks.js';
import { deriveSeed, seededRandom } from '../utils/procedural.js';
import { CITY_CONFIG, districtForChunk } from './districts.js';

export class CityChunk {
  constructor(ix, iz, seed, resources) {
    this.id = `${ix},${iz}`;
    this.ix = ix; this.iz = iz;
    this.seed = deriveSeed(seed, 'chunk', ix, iz);
    this.district = districtForChunk(ix, iz);
    this.waterfront = this.district.id === 'docks' && ix === CITY_CONFIG.count - 1;
    this.x = (ix - CITY_CONFIG.count / 2 + 0.5) * CITY_CONFIG.spacing;
    this.z = (iz - CITY_CONFIG.count / 2 + 0.5) * CITY_CONFIG.spacing;
    this.platformSize = CITY_CONFIG.spacing - this.district.roadWidth;
    this.group = new THREE.Group(); this.group.name = `chunk:${this.id}:${this.district.id}`;
    this.buildings = []; this.colliders = []; this.signs = []; this.lamps = [];
    this.surfaces = []; this.water = []; this.landmarks = []; this.plazas = []; this.trafficSignals = [];
    const random = seededRandom(deriveSeed(this.seed, 'layout'));
    const batches = resources.batches();
    new Road(this, batches);
    const site = LANDMARK_SITES[this.id];
    if (site) createLandmark(this, site, batches);
    else if (this.district.id === 'docks') {
      const waterfront = this.waterfront;
      if (random() < this.district.density || this.id === '4,4') {
        this.addBuilding(this.x - (waterfront ? 16 : 10), this.z, waterfront ? 7 : 12, 29,
          'hangar', 0, batches);
      }
      addDock(this, batches, random, waterfront);
    } else {
      const old = this.district.id === 'old';
      const industrial = this.district.id === 'industrial';
      const columns = industrial ? 1 : old ? 3 : 2;
      const rows = industrial ? 2 : columns;
      const usable = this.platformSize - 6;
      const cellW = usable / columns, cellD = usable / rows;
      for (let cx = 0; cx < columns; cx++) for (let cz = 0; cz < rows; cz++) {
        const bx = this.x + (cx - (columns - 1) / 2) * cellW;
        const bz = this.z + (cz - (rows - 1) / 2) * cellD;
        // Every old-town block has a small courtyard joined to the streets by alleys.
        if (old && cx === 1 && cz === 1) { this.addPlaza(bx, bz, batches); continue; }
        if (random() > this.district.density) continue;
        const styles = this.district.styles;
        const style = styles[Math.floor(random() * styles.length)];
        this.addBuilding(bx, bz, cellW - 3.6 - random(), cellD - 3.6 - random(), style, cx * rows + cz, batches);
      }
    }
    if (!site && ['downtown', 'industrial'].includes(this.district.id) && (ix + iz) % 5 === 0) {
      const z = this.z + this.platformSize / 2 - 1;
      this.signs.push({ x: this.x, y: 8, z, side: 1, label: 'advert', variant: ix % 2, districtId: this.district.id });
      for (const dx of [-4, 4]) batches.trim.add(this.x + dx, 4, z, 0.18, 8, 0.18);
    }
    for (const batch of Object.values(batches)) batch.build(this.group);
  }

  addBuilding(x, z, width, depth, style, slot, batches) {
    const seed = deriveSeed(this.seed, 'building', slot);
    const random = seededRandom(seed);
    const height = this.district.averageHeight + (random() * 2 - 1) * this.district.heightVariation;
    const building = new Building({ x, z, width, depth, height, style, district: this.district, seed }, batches, this.signs);
    this.buildings.push(building.record); this.colliders.push(building.bounds);
    if (random() < this.district.neonFrequency) this.signs.push({
      x, y: 5.2, z: z + depth / 2 + 0.18, side: 1, label: 'neon', variant: Math.floor(random() * 4), districtId: this.district.id,
    });
  }

  addPlaza(x, z, batches) {
    this.plazas.push({ x, z, radius: 6 });
    // A low ornamental basin, benches and a center light leave a walkable perimeter.
    batches.cylinders.add(x, 0.6, z, 3.5, 1, 3.5, 0, new THREE.Color('#6b736c'));
    batches.water.add(x, 1.12, z, 2.4, 0.08, 2.4);
    this.addObstacle(x, z, 3.5, 3.5, 'fountain');
    for (const side of [-1, 1]) {
      batches.metal.add(x + side * 5, 0.6, z, 0.7, 0.6, 3, 0, new THREE.Color('#5a4c40'));
      this.addObstacle(x + side * 5, z, 0.7, 3, 'bench');
    }
  }

  addObstacle(x, z, width, depth, kind) {
    this.colliders.push({ minX: x - width / 2, maxX: x + width / 2,
      minZ: z - depth / 2, maxZ: z + depth / 2, kind, districtId: this.district.id });
  }

  attach(parent) { parent.add(this.group); }
  detach() { this.group.removeFromParent(); }

  // Only per-chunk instance buffers are owned here; geometry/materials stay shared.
  disposeInstances() {
    this.detach();
    this.group.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
    this.group.clear();
  }
}
