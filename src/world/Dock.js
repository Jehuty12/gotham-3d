import * as THREE from 'three';

export function addDock(chunk, batches, random, waterfront) {
  const { x, z } = chunk;
  const ochre = new THREE.Color('#ba8540');
  const colors = ['#8b5945', '#486d70', '#7a783f'].map(c => new THREE.Color(c));
  if (waterfront) {
    const water = { minX: x + 3, maxX: x + 32, minZ: z - 20, maxZ: z + 20, kind: 'water', districtId: 'docks' };
    chunk.water.push(water); chunk.colliders.push(water);
    batches.water.add(x + 17.5, -0.7, z, 29, 0.12, 40);
    batches.trim.add(x + 2.4, -0.15, z, 1, 1.5, 41);
    for (const side of [-1, 1]) batches.trim.add(x + 17.5, -0.2, z + side * 20.3, 29, 1.3, 0.6);
    for (let dz = -18; dz <= 18; dz += 6) batches.cylinders.add(x + 1.4, 0.7, z + dz, 0.5, 1.3, 0.5, 0, ochre);
    // Dock crane: four legs, gantry, jib, cable and hook. The jib is safely overhead.
    const cx = x - 2, cz = z - 13;
    for (const dx of [-2, 2]) for (const dz of [-2, 2]) {
      batches.metal.add(cx + dx, 10, cz + dz, 0.65, 20, 0.65, 0, ochre);
      chunk.addObstacle(cx + dx, cz + dz, 0.65, 0.65, 'crane');
    }
    batches.metal.add(cx + 6, 21, cz, 24, 1, 2, 0, ochre);
    batches.metal.add(cx, 18, cz, 5, 1.3, 6, 0, ochre);
    batches.metal.add(cx, 20, cz - 1.5, 3, 3, 3, 0, colors[1]);
    batches.trim.add(cx + 15, 14, cz, 0.13, 14, 0.13);
    batches.metal.add(cx + 15, 7, cz, 1.2, 0.4, 0.4, 0, ochre);
  }
  for (let row = 0; row < 3; row++) {
    const cx = x + (waterfront ? -9 : 10), cz = z - 9 + row * 8;
    const levels = random() > 0.5 ? 2 : 1;
    const color = colors[Math.floor(random() * colors.length)];
    for (let level = 0; level < levels; level++) {
      batches.metal.add(cx, 1.6 + level * 2.8, cz, 5.5, 2.8, 6, 0, color);
      for (let rib = -2; rib <= 2; rib++) for (const side of [-1, 1]) {
        batches.trim.add(cx + rib, 1.6 + level * 2.8, cz + side * 3.03, 0.08, 2.5, 0.08);
      }
    }
    chunk.addObstacle(cx, cz, 5.6, 6.2, 'container');
  }
}
