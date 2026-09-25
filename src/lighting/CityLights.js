import * as THREE from 'three';
import { InstanceBatch, glowTexture, deriveSeed } from '../utils/procedural.js';
import { SkySystem } from '../rendering/SkySystem.js';
import { DISTRICTS } from '../world/districts.js';

const SIGN_NAMES = {
  downtown: ['MERIDIAN', 'ATLAS', 'HOTEL', 'ORPHEUM'],
  old: ['MINUIT', 'RIVOLI', 'CAFE', 'LIBRAIRIE'],
  industrial: ['FONDERIE', 'ACIER', 'ATELIER', 'DEPOT'],
  docks: ['PORT EST', 'DOCK 07', 'TRANSIT', 'CARGO'],
};

export class CityLights {
  constructor(scene, city) {
    this.positions = []; this.halos = [];
    this.seed = city.seed; this.activeLightCount = 6; this.haloDistance = 100;
    this.lastPosition = new THREE.Vector3(Infinity, 0, Infinity);
    scene.add(new THREE.HemisphereLight('#a9cde2', '#31303f', 1.15));
    const moonlight = new THREE.DirectionalLight('#b9d6ed', 1.65);
    moonlight.position.set(-80, 140, -90); scene.add(moonlight);
    const box = city.resources.box;
    const postMaterial = city.resources.materials.trim;
    const bulbMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) });
    const glow = glowTexture();
    const glowMaterial = new THREE.SpriteMaterial({ map: glow, color: '#ffd298', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
    const poolMaterial = new THREE.MeshBasicMaterial({ map: glow, color: '#d5a276', transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending });
    const poolGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const signGeometry = new THREE.PlaneGeometry(1, 1);
    this.signMaterials = new Map();
    for (const chunk of city.chunks.values()) {
      const posts = new InstanceBatch(box, postMaterial);
      const bulbs = new InstanceBatch(box, bulbMaterial);
      const pools = new InstanceBatch(poolGeometry, poolMaterial);
      const signs = new Map();
      for (const p of chunk.lamps) {
        const position = new THREE.Vector3(p.x, p.y, p.z);
        this.positions.push({ position, color: p.color, chunk });
        posts.add(p.x, 2.8, p.z, 0.16, 5.6, 0.16);
        posts.add(p.x, 0.5, p.z, 0.42, 0.8, 0.42);
        posts.add(p.x, 6.05, p.z, 1, 0.16, 1);
        bulbs.add(p.x, 5.75, p.z, 0.48, 0.48, 0.48, 0, new THREE.Color(p.color));
        const halo = new THREE.Sprite(glowMaterial);
        halo.position.copy(position); halo.scale.set(4, 4, 1);
        chunk.group.add(halo); this.halos.push(halo);
        pools.add(p.x, 0.255, p.z, 13, 1, 13);
      }
      for (const p of chunk.signs) {
        const key = `${p.districtId}:${p.label}:${p.variant ?? 0}`;
        if (!this.signMaterials.has(key)) {
          const material = this.createSignMaterial(p);
          material.userData.animation = p.label === 'street' || p.label === 'municipal' ? null
            : { phase: deriveSeed(city.seed, 'neon', key) % 100, base: 1.8 };
          this.signMaterials.set(key, material);
        }
        if (!signs.has(key)) signs.set(key, new InstanceBatch(signGeometry, this.signMaterials.get(key)));
        const width = p.label === 'street' ? 4 : p.label === 'municipal' ? 10 : p.label === 'advert' ? 11 : 7;
        signs.get(key).add(p.x, p.y, p.z, width, width / 4, 1, p.side < 0 ? Math.PI : 0);
      }
      for (const batch of [posts, bulbs, pools, ...signs.values()]) batch.build(chunk.group);
    }
    this.localLights = Array.from({ length: 6 }, () => {
      const light = new THREE.PointLight('#ffcb8c', 35, 17, 2); scene.add(light); return light;
    });
    this.skySystem=new SkySystem(scene,city.seed,glow);this.sky=this.skySystem.group;
  }

  createSignMaterial(p) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const district = DISTRICTS[p.districtId];
    ctx.fillStyle = p.label === 'street' ? '#23383a' : '#101a23'; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = p.districtId === 'old' ? '#eaa7b9' : '#a5ddd9';
    ctx.lineWidth = 3; ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = p.label === 'street' ? 0 : 10;
    ctx.font = '500 43px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const name = p.label === 'advert' ? ['NUIT FM · 89.1', 'MERIDIAN EXPRESS'][p.variant ?? 0] : p.label === 'municipal' ? 'GARDE MUNICIPALE' : p.label === 'street' ? district.name.toUpperCase()
      : SIGN_NAMES[p.districtId][p.variant ?? 0];
    ctx.fillText(name, 256, 68, 476);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const level = p.label === 'street' ? 0.85 : 1.8;
    return new THREE.MeshBasicMaterial({ map: texture, color: new THREE.Color(level, level, level), side: THREE.DoubleSide });
  }

  update(position, time = 0) {
    for (const material of this.signMaterials.values()) {
      const a = material.userData.animation; if (!a) continue;
      const flicker = a.phase % 4 === 0 && Math.sin(time * 11 + a.phase) * Math.sin(time * 19) > 0.84;
      const level = a.base * (flicker ? 0.16 : 0.87 + Math.sin(time * 0.6 + a.phase) * 0.13);
      material.color.setRGB(level, level, level);
    }
    this.sky.position.copy(position);
    if (this.lastPosition.distanceToSquared(position) < 16) return;
    this.lastPosition.copy(position);
    for (const halo of this.halos) halo.visible = halo.position.distanceToSquared(position) < this.haloDistance ** 2;
    const nearest = this.positions.filter(item => item.chunk.group.parent && item.chunk.group.visible)
      .map(item => ({ ...item, distance: item.position.distanceToSquared(position) })).sort((a, b) => a.distance - b.distance);
    this.localLights.forEach((light, i) => {
      light.visible = Boolean(nearest[i]) && i < this.activeLightCount;
      if (nearest[i]) { light.position.copy(nearest[i].position); light.color.set(nearest[i].color);light.intensity=nearest[i].chunk.district.id==='old'?29:nearest[i].chunk.district.id==='industrial'?32:37; }
    });
  }
}
