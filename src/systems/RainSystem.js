import * as THREE from 'three';
import { DynamicInstances } from '../utils/DynamicInstances.js';
import { rainVisualParameters } from '../rendering/WeatherParameters.js';
import { seededRandom, deriveSeed } from '../utils/procedural.js';

export class RainSystem {
  constructor(scene, seed, capacity = 4000) {
    this.capacity = capacity; this.budget = 1800; this.intensity = 1; this.enabled = true;
    this.drops = new Float32Array(capacity * 4);
    const random = seededRandom(deriveSeed(seed, 'rain'));
    for (let i = 0; i < this.drops.length; i++) this.drops[i] = random();
    this.positions = new Float32Array(capacity * 6);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.LineBasicMaterial({ color: '#95becf', transparent: true, opacity: 0.36, depthWrite: false });
    this.mesh = new THREE.LineSegments(this.geometry, this.material);
    this.mesh.frustumCulled = false; this.mesh.name = 'local-rain'; scene.add(this.mesh);
    this.splashGeometry=new THREE.RingGeometry(.65,1,6).rotateX(-Math.PI/2);
    this.splashMaterial=new THREE.MeshBasicMaterial({color:'#8ab4bf',transparent:true,opacity:.2,depthWrite:false});
    this.splashes=new DynamicInstances(scene,this.splashGeometry,this.splashMaterial,32);this.splashBudget=20;
    this.configure({ rain: this.budget });
  }
  dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();this.splashes.mesh.removeFromParent();this.splashes.mesh.dispose();this.splashGeometry.dispose();this.splashMaterial.dispose();}
  get count() { return this.enabled ? Math.round(this.budget * this.intensity) : 0; }
  configure(profile) { this.budget = Math.min(this.capacity, profile.rain);this.splashBudget=profile.art?.splashes??20; }
  setIntensity(value) { this.intensity = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1); }
  setEnabled(value) { this.enabled = Boolean(value); }
  update(time, player, driving=false,groundHeight=()=>0) {
    this.mesh.visible = this.count > 0;
    const visual=rainVisualParameters(time,driving),visibleCount=Math.floor(this.count*visual.density);
    this.material.opacity=visual.opacity;this.geometry.setDrawRange(0, this.count * 2);
    this.splashes.begin();
    if(this.count&&player.y-groundHeight(player.x,player.z)<8)for(let i=0;i<Math.floor(this.splashBudget*this.intensity*(driving?.4:1));i++){const age=(time*2.5+this.drops[i*4])%1,x=player.x+(this.drops[i*4+1]-.5)*18,z=player.z+(this.drops[i*4+2]-.5)*18;const size=.03+age*.14;this.splashes.add(x,groundHeight(x,z)+.04,z,size,1,size);}
    this.splashes.end();
    if (!this.count) return;
    this.mesh.position.set(player.x, player.y - 2, player.z);
    const wind = visual.wind;
    const wrap = v => ((v % 48) + 48) % 48 - 24;
    for (let i = 0; i < this.count; i++) {
      const d = i * 4, p = i * 6;
      const y = ((this.drops[d + 2] * 26 - time * (18 + this.drops[d + 3] * 8)) % 26 + 26) % 26;
      const x = wrap(this.drops[d] * 48 + wind * y * 0.15);
      const z = wrap(this.drops[d + 1] * 48 + Math.sin(time * 0.07) * y * 0.08);
      this.positions[p] = x; this.positions[p + 1] = y; this.positions[p + 2] = z;
      if(i>=visibleCount){this.positions[p]=this.positions[p+3]=x;this.positions[p+1]=this.positions[p+4]=y;this.positions[p+2]=this.positions[p+5]=z;continue;}
      this.positions[p + 3] = x - wind * 0.055; this.positions[p + 4] = y - (Math.hypot(x,z)<8?.85:.45); this.positions[p + 5] = z - 0.04;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}
