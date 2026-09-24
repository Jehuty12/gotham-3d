import * as THREE from 'three';
import { Building } from './Building.js';

export const LANDMARK_SITES = Object.freeze({
  '3,2': { type: 'cathedral', name: 'Cathédrale des Veilleurs', symbol: '✦' },
  '4,2': { type: 'tower', name: 'Tour Meridian', symbol: '◆' },
  '3,4': { type: 'municipal', name: 'Hôtel de la Garde', symbol: '■' },
});

export function createLandmark(chunk, site, batches) {
  const { x, z, district } = chunk;
  const light = new THREE.Color('#b9e2e9');
  const stone = new THREE.Color(site.type === 'cathedral' ? '#726d65' : '#677b87');
  let width, depth, height;
  const solid = (dx, y, dz, w, h, d) => batches.stone.add(x + dx, y + h / 2, z + dz, w, h, d, 0, stone);
  if (site.type === 'tower') {
    width = depth = 29; height = 190;
    const tower = new Building({ x, z, width, depth, height: 156, style: 'artdeco', district, seed: chunk.seed }, batches, chunk.signs);
    solid(0, 156, 0, 8, 12, 8);
    batches.spires.add(x, 178, z, 5, 24, 5);
    for (const side of [-1, 1]) {
      batches.windows.add(x + side * 4.1, 164, z, 0.12, 8, 5, 0, light);
      batches.windows.add(x, 164, z + side * 4.1, 5, 8, 0.12, 0, light);
    }
    chunk.buildings.push({ ...tower.record, landmark: site.type });
  } else if (site.type === 'cathedral') {
    width = 34; depth = 40; height = 108;
    solid(0, 0, 0, 18, 35, 38);
    solid(0, 0, -5, 32, 24, 13);
    batches.roofs.add(x, 37, z, 18, 7, 23, Math.PI / 2, stone);
    for (const side of [-1, 1]) {
      solid(side * 11, 0, 12, 9, 68, 12);
      batches.spires.add(x + side * 11, 82, z + 12, 6, 28, 6);
      for (let dz = -15; dz < 14; dz += 7) {
        solid(side * 11, 0, dz, 2, 24, 2);
        batches.spires.add(x + side * 11, 27, z + dz, 1.5, 6, 1.5);
        batches.windows.add(x + side * 9.05, 22, z + dz, 0.1, 9, 1.6, 0, light);
      }
      batches.windows.add(x + side * 11, 53, z + 18.06, 2, 9, 0.12, 0, light);
    }
    solid(0, 35, -5, 7, 40, 7);
    batches.spires.add(x, 91.5, z - 5, 5.5, 33, 5.5);
    // Rose window, stone tracery and a recessed-looking pointed portal.
    batches.rosette.add(x, 26, z + 19.1, 4, 4, 1, 0, new THREE.Color('#df9cce'));
    batches.windows.add(x, 26, z + 19.12, 0.25, 7, 0.1, 0, light);
    batches.windows.add(x, 26, z + 19.12, 7, 0.25, 0.1, 0, light);
    batches.metal.add(x, 5, z + 19.04, 5, 10, 0.12, 0, new THREE.Color('#17202b'));
    batches.spires.add(x, 12, z + 19, 3.7, 5, 0.3);
  } else {
    width = 36; depth = 29; height = 91;
    solid(0, 0, 0, width, 22, depth);
    solid(-12, 22, -3, 10, 7, 19); solid(12, 22, -3, 10, 7, 19);
    solid(0, 22, -4, 10, 54, 10);
    batches.spires.add(x, 83, z - 4, 7, 16, 7);
    for (let dx = -14; dx <= 14; dx += 4) {
      batches.cylinders.add(x + dx, 8, z + 13.5, 1, 16, 1, 0, stone);
      for (const side of [-1, 1]) batches.windows.add(x + dx, 18, z + side * 14.56, 1.3, 3, 0.1, 0, light);
    }
    batches.trim.add(x, 16.5, z + 14, 35, 1, 3);
    for (const side of [-1, 1]) {
      batches.windows.add(x, 68, z - 4 + side * 5.1, 5.5, 5.5, 0.12, 0, light);
      batches.windows.add(x + side * 5.1, 68, z - 4, 0.12, 5.5, 5.5, 0, light);
    }
    chunk.signs.push({ x, y: 12, z: z + 14.7, side: 1, label: 'municipal', districtId: district.id });
  }
  const bounds = { minX: x - width / 2 - 0.6, maxX: x + width / 2 + 0.6,
    minZ: z - depth / 2 - 0.6, maxZ: z + depth / 2 + 0.6, districtId: district.id, kind: 'landmark' };
  chunk.colliders.push(bounds);
  if (site.type !== 'tower') chunk.buildings.push({ ...bounds, x, z, width, depth, height, style: site.type, landmark: site.type });
  chunk.landmarks.push({ ...site, x, z, height, districtId: district.id });
}
