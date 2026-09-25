import * as THREE from 'three';
import { seededRandom,deriveSeed } from '../utils/procedural.js';

export class SkySystem {
  constructor(scene,seed,glow) {
    this.group=new THREE.Group();scene.add(this.group);
    const dome=new THREE.SphereGeometry(650,24,12),positions=dome.attributes.position,colors=new Float32Array(positions.count*3),low=new THREE.Color('#182c3b'),high=new THREE.Color('#040b17'),color=new THREE.Color();
    for(let i=0;i<positions.count;i++){color.copy(low).lerp(high,Math.max(0,positions.getY(i)/650));color.toArray(colors,i*3);}dome.setAttribute('color',new THREE.BufferAttribute(colors,3));
    this.dome=new THREE.Mesh(dome,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));this.dome.renderOrder=-10;this.group.add(this.dome);
    const random=seededRandom(deriveSeed(seed,'sky')),stars=[];
    for(let i=0;i<1500;i++){const angle=random()*Math.PI*2,y=.15+random()*.85,r=Math.sqrt(1-y*y);stars.push(Math.cos(angle)*r*550,y*550,Math.sin(angle)*r*550);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
    this.stars=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#adbfcc',size:.6,transparent:true,opacity:.65,fog:false,depthWrite:false}));this.group.add(this.stars);
    this.moon=new THREE.Mesh(new THREE.SphereGeometry(10,20,12),new THREE.MeshBasicMaterial({color:'#bcd1cf',fog:false}));this.moon.position.set(-160,230,-420);this.group.add(this.moon);
    const moonHalo=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:'#85a7bf',opacity:.18,transparent:true,fog:false,depthWrite:false,blending:THREE.AdditiveBlending}));moonHalo.position.copy(this.moon.position);moonHalo.scale.set(90,90,1);this.group.add(moonHalo);
    this.cloudMaterial=new THREE.SpriteMaterial({map:glow,color:'#5a7080',transparent:true,opacity:.055,depthWrite:false,fog:false});
    this.clouds=Array.from({length:7},(_,i)=>{const cloud=new THREE.Sprite(this.cloudMaterial);cloud.userData.phase=random()*6.28;cloud.position.set((random()-.5)*750,120+random()*160,-300+random()*150);cloud.userData.baseX=cloud.position.x;cloud.scale.set(180+random()*180,30+random()*45,1);this.group.add(cloud);return cloud;});
  }
  update(position,time,rain=0){this.group.position.copy(position);this.stars.material.opacity=.65*(1-rain*.7);this.dome.material.color.setScalar(1-rain*.18);this.cloudMaterial.opacity=.035+rain*.045;for(const cloud of this.clouds)cloud.position.x=cloud.userData.baseX+Math.sin(time*.008+cloud.userData.phase)*28;}
}
