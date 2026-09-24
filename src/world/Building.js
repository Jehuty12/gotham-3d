import * as THREE from 'three';
import { addRoofDetails } from './RoofDetails.js';
import { deriveSeed, seededRandom } from '../utils/procedural.js';
import { windowState } from '../utils/windows.js';

// Each generator describes occupied facade volumes; windows follow those volumes.
const GENERATORS = {
  setback: (w, d, h) => [
    { y: 0, w, d, h: h * 0.5 },
    { y: h * 0.5, w: w * 0.78, d: d * 0.78, h: h * 0.28 },
    { y: h * 0.78, w: w * 0.55, d: d * 0.55, h: h * 0.22 },
  ],
  artdeco: (w, d, h) => [
    { y: 0, w, d, h: h * 0.65 },
    { y: h * 0.65, w: w * 0.72, d: d * 0.72, h: h * 0.22 },
    { y: h * 0.87, w: w * 0.45, d: d * 0.45, h: h * 0.13 },
  ],
  technical: (w, d, h) => [{ y: 0, w, d, h }, { y: h, w: w * 0.6, d: d * 0.65, h: 4 }],
  antenna: (w, d, h) => [{ y: 0, w, d, h }, { y: h, w: w * 0.62, d: d * 0.62, h: 5 }],
  cornice: (w, d, h) => [{ y: 0, w, d, h }],
  gothic: (w, d, h) => [{ y: 0, w, d, h }],
  industrial: (w, d, h) => [{ y: 0, w, d, h }, { y: h, w: w * 0.65, d: d * 0.45, h: 2 }],
  hangar: (w, d, h) => [{ y: 0, w, d, h }],
};
export const BUILDING_STYLES = Object.freeze(Object.keys(GENERATORS));

export class Building {
  constructor(options, batches, signs) {
    Object.assign(this, options);
    const { x, z, width, depth, height, style, district, seed } = options;
    const random = seededRandom(deriveSeed(seed, 'facade'));
    const color = new THREE.Color(district.color).multiplyScalar(0.8 + random() * 0.45);
    const sections = GENERATORS[style](width, depth, height);
    this.bounds = { minX: x - width / 2 - 0.55, maxX: x + width / 2 + 0.55,
      minZ: z - depth / 2 - 0.55, maxZ: z + depth / 2 + 0.55,
      districtId: district.id, kind: 'building' };
    batches.trim.add(x, 0.55, z, width + 1, 1.1, depth + 1);
    this.windowStats = { on: 0, off: 0 };
    for (const s of sections) {
      batches.stone.add(x, s.y + s.h / 2, z, s.w, s.h, s.d, 0, color);
      batches.trim.add(x, s.y + s.h, z, s.w + 0.65, 0.4, s.d + 0.65);
      const step = style === 'industrial' || style === 'hangar' ? 4.6 : 3.2;
      for (let y = s.y + 4; y < s.y + s.h - 1; y += step) {
        for (let axis = 0; axis < 2; axis++) {
          const columns = Math.floor(((axis === 0 ? s.w : s.d) - 2) / 2.8);
          for (let col = 0; col < columns; col++) for (const side of [-1, 1]) {
            const window = windowState(seed, sections.indexOf(s), axis, side, Math.round((y - s.y - 4) / step), col, district);
            this.windowStats[window.lit ? 'on' : 'off']++;
            const offset = (col - (columns - 1) / 2) * 2.8;
            (window.lit ? batches.windows : batches.metal).add(x + (axis === 0 ? offset : side * (s.w / 2 + 0.04)), y,
              z + (axis === 0 ? side * (s.d / 2 + 0.04) : offset),
              axis === 0 ? 0.9 : 0.05, style === 'gothic' ? 2 : 1.5, axis === 0 ? 0.05 : 0.9,
              0, new THREE.Color(window.lit ? window.tint : '#517080').multiplyScalar(window.brightness));
          }
        }
      }
      if (style === 'artdeco' || style === 'setback' || style === 'gothic') {
        for (const edge of [-1, 0, 1]) for (const side of [-1, 1]) {
          batches.trim.add(x + edge * (s.w / 2 - 0.35), s.y + s.h / 2, z + side * s.d / 2, 0.45, s.h, 0.45);
        }
      }
    }
    if (style === 'cornice' || style === 'gothic') {
      for (let y = 3.2; y < height; y += 6.4) batches.trim.add(x, y, z, width + 0.8, 0.35, depth + 0.8);
      if (style === 'gothic') for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
        batches.spires.add(x + dx * (width / 2 - 1), height + 3.3, z + dz * (depth / 2 - 1), 1.15, 6.6, 1.15);
      }
    }
    if (style === 'industrial' || style === 'hangar') {
      const metal = new THREE.Color('#465663');
      for (const dx of [-1, 1]) {
        batches.metal.add(x + dx * width * 0.24, 2.2, z + depth / 2 + 0.05, width * 0.3, 4.1, 0.1, 0, metal);
        for (let y = 0.6; y <= 4; y += 0.6) batches.trim.add(x + dx * width * 0.24, y, z + depth / 2 + 0.12, width * 0.3, 0.07, 0.08);
      }
      for (let dx = -width / 2 + 2; dx < width / 2; dx += 4) batches.trim.add(x + dx, height / 2, z - depth / 2, 0.22, height, 0.25);
    }
    if (style === 'hangar') {
      batches.roofs.add(x, height + 0.6, z, width, 2.3, depth * 0.6, 0, color);
    }
    const top = sections.at(-1);
    this.roofY = top.y + top.h + (style === 'hangar' ? 2.8 : 0);
    this.roofWidth = top.w; this.roofDepth = top.d;
    this.roofColliders = [];
    this.roofDetails = addRoofDetails(this, seededRandom(deriveSeed(seed, 'roof')), batches, signs);
    this.record = { ...this.bounds, x, z, width, depth, height, style, seed, sections, roofY: this.roofY, roofWidth: this.roofWidth, roofDepth: this.roofDepth, roofColliders: this.roofColliders, roofDetails: this.roofDetails, windowStats: this.windowStats };
  }
}
