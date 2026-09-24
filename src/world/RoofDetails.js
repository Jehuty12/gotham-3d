import * as THREE from 'three';
import { box } from './CollisionWorld.js';

export function addRoofDetails(building, random, batches, signs) {
  const { x, z, roofY: y, roofWidth: width, roofDepth: depth, style } = building;
  const details = [];
  const metal = new THREE.Color('#596972');
  const rust = new THREE.Color('#795c48');
  const add = type => details.push(type);
  // Rooftop equipment stays inside the final setback's footprint.
  const unitCount = Math.max(1, Math.min(3, Math.floor(width / 5)));
  for (let i = 0; i < unitCount; i++) {
    const px = x + (i - (unitCount - 1) / 2) * 2.5;
    building.roofColliders.push(box(px,y+.8,z,1.7,1.6,2,'hvac'));
    batches.metal.add(px, y + 0.8, z, 1.7, 1.6, 2, 0, metal);
    batches.cylinders.add(px, y + 1.7, z, 0.95, 0.18, 0.95, 0, rust);
  }
  add('hvac');
  if (style === 'antenna' || random() < 0.38) {
    batches.trim.add(x, y + 6, z - depth * 0.24, 0.16, 12, 0.16);
    batches.trim.add(x, y + 8, z - depth * 0.24, 3, 0.12, 0.12);
    batches.windows.add(x, y + 12, z - depth * 0.24, 0.35, 0.35, 0.35, 0, new THREE.Color('#ff4c46'));
    add('antenna');
  }
  if (width > 9 && depth > 9 && random() < 0.36) {
    const tx = x - width * 0.27, tz = z + depth * 0.2;
    building.roofColliders.push(box(tx,y+2.5,tz,3.2,5,3.2,'tank'));
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) batches.trim.add(tx + dx, y + 1, tz + dz, 0.18, 2, 0.18);
    batches.cylinders.add(tx, y + 3.3, tz, 3.2, 3, 3.2, 0, rust);
    batches.spires.add(tx, y + 5.3, tz, 2.1, 1.1, 2.1);
    add('water-tank');
  }
  if (style === 'industrial' || style === 'cornice' || random() < 0.2) {
    const tall = style === 'industrial' ? 14 + random() * 16 : 3;
    building.roofColliders.push(box(x+width*.3,y+tall/2,z-depth*.2,1.5,tall,1.5,'chimney'));
    batches.cylinders.add(x + width * 0.3, y + tall / 2, z - depth * 0.2, 1.5, tall, 1.5, 0, rust);
    batches.cylinders.add(x + width * 0.3, y + tall - 1, z - depth * 0.2, 1.7, 0.8, 1.7, 0, metal);
    add('chimney');
  }
  if (width > 8 && random() < building.district.neonFrequency) {
    signs.push({ x, y: y + 2.5, z: z + depth / 2, side: 1, label: 'roof', districtId: building.district.id });
    batches.trim.add(x - 2.4, y + 1.3, z + depth / 2, 0.15, 2.6, 0.15);
    batches.trim.add(x + 2.4, y + 1.3, z + depth / 2, 0.15, 2.6, 0.15);
    add('sign');
  }
  return details;
}
