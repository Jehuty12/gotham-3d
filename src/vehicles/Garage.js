import { Color, Vector3, CanvasTexture, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { deriveSeed, InstanceBatch } from '../utils/procedural.js';
import { box } from '../world/CollisionWorld.js';
import { capsuleClear } from '../utils/spatialQueries.js';

export function generateGarages(city) {
  const sites = [];
  for (const chunk of city.chunks.values()) {
    if (chunk.district.id !== 'industrial') continue;
    const position = new Vector3(chunk.x + 25, 0, chunk.z);
    if (!capsuleClear(city.collisionWorld, position, 4.5, 4, null)) continue;
    sites.push({ id: `garage-${chunk.id}`, chunk: chunk.id, position, radius: 3.5, rotation: Math.PI,
      rank: Math.hypot(position.x, position.z - 54) + deriveSeed(city.seed, 'garage', chunk.id) % 7 });
  }
  sites.sort((a, b) => a.rank - b.rank);
  const selected = [];
  for (const site of sites) if (!selected.some(s => s.position.distanceTo(site.position) < 85)) { selected.push(site); if (selected.length === 3) break; }
  if (!selected.length) throw new Error('No compatible garage location');
  return selected;
}

export function buildGarages(city, garages) {
  let signMaterial, signGeometry;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#133b3c'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#a6ebcf'; ctx.font = 'bold 46px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GARAGE / SERVICE', 256, 80);
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
    signMaterial = new MeshBasicMaterial({ map: texture }); signGeometry = new PlaneGeometry(1, 1);
  }
  for (const site of garages) {
    const { x, z } = site.position, group = city.chunks.get(site.chunk).group;
    const solid = new InstanceBatch(city.resources.box, city.resources.materials.metal);
    const glow = new InstanceBatch(city.resources.box, city.resources.materials.windows);
    const add = (px, y, pz, w, h, d, color = '#324a50') => {
      solid.add(px, y, pz, w, h, d, 0, new Color(color)); city.collisionWorld.add(box(px, y, pz, w, h, d, 'garage'));
    };
    add(x, 4, z, 6.4, .28, 8.5);
    for (const side of [-1, 1]) for (const end of [-1, 1]) add(x + side * 2.9, 2, z + end * 3.8, .24, 4, .24);
    add(x - 2.65, .55, z + 2.4, .65, 1.1, 1.2, '#586660');
    for (const side of [-1, 1]) glow.add(x + side * 2, 3.8, z, .16, .08, 5, 0, new Color('#a3dcc5'));
    for (const side of [-1, 1]) glow.add(x + side * 2, .03, z, .08, .03, 6, 0, new Color('#448d7c'));
    solid.build(group); glow.build(group);
    if (signMaterial) { const label = new InstanceBatch(signGeometry, signMaterial); label.add(x, 4.75, z + 4.3, 5, 1.1, 1); label.add(x, 4.75, z - 4.3, 5, 1.1, 1, Math.PI); label.build(group); }
  }
}
