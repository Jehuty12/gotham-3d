import * as THREE from 'three';

import { districtForChunk } from './districts.js';

// Roads belong to their chunk. Different curb offsets vary street widths while
// the shared 64-unit axes keep every district connected.
export class Road {
  constructor(chunk, batches) {
    const { x, z, district, platformSize: size } = chunk;
    const half = size / 2;
    const groundRect = (batch, minX, maxX, minZ, maxZ, y, height, walkable) => {
      batch.add(x + (minX + maxX) / 2, y, z + (minZ + maxZ) / 2, maxX - minX, height, maxZ - minZ);
      if (walkable) chunk.surfaces.push({ minX: x + minX, maxX: x + maxX, minZ: z + minZ, maxZ: z + maxZ, height: 0.24 });
    };
    if (chunk.waterfront) {
      // Leave a real opening in both the asphalt and the platform for the basin.
      for (const [batch, edge, y, height, walkable] of [[batches.asphalt, 32, -0.15, 0.3, false], [batches.pavement, half, 0.12, 0.24, true]]) {
        groundRect(batch, -edge, 3, -edge, edge, y, height, walkable);
        groundRect(batch, 3, edge, -edge, -20, y, height, walkable);
        groundRect(batch, 3, edge, 20, edge, y, height, walkable);
      }
    } else {
      groundRect(batches.asphalt, -32, 32, -32, 32, -0.15, 0.3, false);
      groundRect(batches.pavement, -half, half, -half, half, 0.12, 0.24, true);
    }
    // Kerb strips give the sidewalk a readable edge from street level.
    for (const side of [-1, 1]) {
      if (!chunk.waterfront || side < 0) batches.trim.add(x + side * half, 0.18, z, 0.16, 0.36, size);
      batches.trim.add(x, 0.18, z + side * half, size, 0.36, 0.16);
    }
    const westWidth = districtForChunk(Math.max(0, chunk.ix - 1), chunk.iz).roadWidth;
    const northWidth = districtForChunk(chunk.ix, Math.max(0, chunk.iz - 1)).roadWidth;
    for (let offset = -16; offset <= 16; offset += 8) {
      batches.paint.add(x - 32 + (district.roadWidth - westWidth) / 4, 0.012, z + offset, 0.12, 0.02, 3);
      batches.paint.add(x + offset, 0.012, z - 32 + (district.roadWidth - northWidth) / 4, 3, 0.02, 0.12);
    }
    // Crossings are placed at each end of the west / north street segments.
    for (let stripe = -westWidth / 2 + 1; stripe <= district.roadWidth / 2 - 1; stripe += 1.8) {
      for (const end of [-1, 1]) {
        batches.paint.add(x - 32 + stripe, 0.02, z + end * (half - 3), 0.85, 0.02, 2.5);
      }
    }
    for (let stripe = -northWidth / 2 + 1; stripe <= district.roadWidth / 2 - 1; stripe += 1.8) {
      for (const end of [-1, 1]) batches.paint.add(x + end * (half - 3), 0.02, z - 32 + stripe, 2.5, 0.02, 0.85);
    }
    const pole = new THREE.Color('#3e4b52');
    // One pair per block, sharing instanced housing and signal materials.
    for (const side of [-1, 1]) {
      const px = x + (chunk.waterfront && side > 0 ? 1 : side * (half - 1.1)), pz = z - half + 1.1;
      batches.metal.add(px, 1.9, pz, 0.14, 3.8, 0.14, 0, pole);
      batches.metal.add(px, 3.9, pz, 0.5, 1.25, 0.5, 0, pole);
      chunk.trafficSignals.push({ x: px, z: pz, nodeX: x + side * 32, nodeZ: z - 32, axis: side < 0 ? 'z' : 'x' });
    }
    const sx = x - half + 2, sz = z + half - 2;
    batches.trim.add(sx, 1.7, sz, 0.1, 3.4, 0.1);
    chunk.signs.push({ x: sx, y: 3.1, z: sz, side: 1, label: 'street', districtId: district.id });
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      chunk.lamps.push({ x: x + (chunk.waterfront && dx > 0 ? 1 : dx * (half - 2)), y: 5.8, z: z + dz * (half - 2), color: district.lampColor });
    }
  }
}
