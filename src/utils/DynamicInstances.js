import * as THREE from 'three';

// Fixed GPU allocation. Rewriting transforms never creates meshes or materials.
export class DynamicInstances {
  constructor(parent, geometry, material, capacity) {
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.capacity = capacity;
    this.cursor = 0;
    this.transform = new THREE.Object3D();
    parent.add(this.mesh);
  }
  begin() { this.cursor = 0; }
  add(x, y, z, sx, sy, sz, yaw = 0, color) {
    if (this.cursor >= this.capacity) throw new RangeError('Instance pool exhausted');
    const t = this.transform;
    t.position.set(x, y, z); t.rotation.set(0, yaw, 0); t.scale.set(sx, sy, sz); t.updateMatrix();
    this.mesh.setMatrixAt(this.cursor, t.matrix);
    if (color) this.mesh.setColorAt(this.cursor, color);
    this.cursor++;
  }
  end() {
    this.mesh.count = this.cursor;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

export function softParticleTexture(size = 32) {
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const r = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
    pixels[i + 3] = Math.round(Math.max(0, 1 - r) ** 2 * 255);
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.needsUpdate = true;
  return texture;
}
