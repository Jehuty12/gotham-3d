import * as THREE from 'three';
import { InstanceBatch } from '../utils/procedural.js';

// One resource owner per city, never per building. Instance colors provide variety.
export class CityResources {
  constructor() {
    this.box = new THREE.BoxGeometry(1, 1, 1);
    this.cone = new THREE.ConeGeometry(1, 1, 4);
    this.cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
    this.roof = new THREE.CylinderGeometry(1, 1, 1, 3).rotateZ(Math.PI / 2);
    this.rosette = new THREE.TorusGeometry(1, 0.12, 6, 24);
    this.materials = {
      stone: new THREE.MeshStandardMaterial({ color: 'white', roughness: 0.85, metalness: 0.15 }),
      trim: new THREE.MeshStandardMaterial({ color: '#48525a', roughness: 0.7, metalness: 0.4 }),
      windows: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.65, 1.65, 1.65) }),
      spires: new THREE.MeshStandardMaterial({ color: '#2e3c46', roughness: 0.65, metalness: 0.45 }),
      metal: new THREE.MeshStandardMaterial({ color: 'white', roughness: 0.65, metalness: 0.55 }),
      pavement: new THREE.MeshStandardMaterial({ color: '#45505a', roughness: 0.9 }),
      asphalt: new THREE.MeshStandardMaterial({ color: '#17252d', roughness: 0.7, metalness: 0.25 }),
      paint: new THREE.MeshBasicMaterial({ color: '#909c98' }),
      water: new THREE.MeshStandardMaterial({ color: '#0b3544', roughness: 0.23, metalness: 0.65 }),
    };
  }

  batches() {
    const result = {};
    for (const [name, material] of Object.entries(this.materials)) {
      result[name] = new InstanceBatch(name === 'spires' ? this.cone : this.box, material);
    }
    result.cylinders = new InstanceBatch(this.cylinder, this.materials.metal);
    result.roofs = new InstanceBatch(this.roof, this.materials.stone);
    result.rosette = new InstanceBatch(this.rosette, this.materials.windows);
    return result;
  }

  dispose() {
    for (const geometry of [this.box, this.cone, this.cylinder, this.roof, this.rosette]) geometry.dispose();
    for (const material of Object.values(this.materials)) material.dispose();
  }
}
