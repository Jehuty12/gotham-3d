import * as THREE from 'three';

export function seededRandom(seed = 1927) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Stable streams keyed by chunk / purpose. Never depend on traversal order.
export function deriveSeed(seed, ...keys) {
  let hash = seed >>> 0;
  for (const char of keys.join(':')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash;
}

// One draw call per material and block; each block can be culled independently.
export class InstanceBatch {
  constructor(geometry, material) {
    this.geometry = geometry;
    this.material = material;
    this.items = [];
  }

  add(x, y, z, sx, sy, sz, rotation = 0, color) {
    this.items.push({ x, y, z, sx, sy, sz, rotation, color });
  }

  build(parent) {
    if (!this.items.length) return;
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.items.length);
    const dummy = new THREE.Object3D();
    this.items.forEach((item, i) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.scale.set(item.sx, item.sy, item.sz);
      dummy.rotation.y = item.rotation;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (item.color) mesh.setColorAt(i, item.color);
    });
    mesh.computeBoundingSphere();
    parent.add(mesh);
    this.items.length = 0;
    return mesh;
  }
}

export function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
