import * as THREE from 'three';
import { Building } from './Building.js';

export const LANDMARK_SITES = Object.freeze({
  '3,2': { type: 'cathedral', name: 'Cathédrale des Veilleurs', symbol: '✦' },
  '4,2': { type: 'tower', name: 'Tour Meridian', symbol: '◆' },
  '3,4': { type: 'municipal', name: 'Hôtel de la Garde', symbol: '■' },
});

export function createLandmark(chunk, site, batches) {
  const { x, z, district } = chunk;
  const light = new THREE.Color('#b9e2e9');
  const stone = new THREE.Color(site.type === 'cathedral' ? '#726d65' : '#677b87');
  let width, depth, height;
  const solid = (dx, y, dz, w, h, d) => batches.stone.add(x + dx, y + h / 2, z + dz, w, h, d, 0, stone);
  if (site.type === 'tower') {
    width = depth = 29; height = 190;
    const tower = new Building({ x, z, width, depth, height: 156, style: 'artdeco', district, seed: chunk.seed }, batches, chunk.signs);
    solid(0, 156, 0, 8, 12, 8);
    batches.spires.add(x, 178, z, 5, 24, 5);
    for (const side of [-1, 1]) {
      batches.windows.add(x + side * 4.1, 164, z, 0.12, 8, 5, 0, light);
      batches.windows.add(x, 164, z + side * 4.1, 5, 8, 0.12, 0, light);
    }
    chunk.buildings.push({ ...tower.record, landmark: site.type });
  } else if (site.type === 'cathedral') {
    width = 34; depth = 40; height = 108;
    solid(0, 0, 0, 18, 35, 38);
    solid(0, 0, -5, 32, 24, 13);
    batches.roofs.add(x, 37, z, 18, 7, 23, Math.PI / 2, stone);
    for (const side of [-1, 1]) {
      solid(side * 11, 0, 12, 9, 68, 12);
      batches.spires.add(x + side * 11, 82, z + 12, 6, 28, 6);
      for (let dz = -15; dz < 14; dz += 7) {
        solid(side * 11, 0, dz, 2, 24, 2);
        batches.spires.add(x + side * 11, 27, z + dz, 1.5, 6, 1.5);
        batches.windows.add(x + side * 9.05, 22, z + dz, 0.1, 9, 1.6, 0, light);
      }
      batches.windows.add(x + side * 11, 53, z + 18.06, 2, 9, 0.12, 0, light);
    }
    solid(0, 35, -5, 7, 40, 7);
    batches.spires.add(x, 91.5, z - 5, 5.5, 33, 5.5);
    // Rose window, stone tracery and a recessed-looking pointed portal.
    batches.rosette.add(x, 26, z + 19.1, 4, 4, 1, 0, new THREE.Color('#df9cce'));
    batches.windows.add(x, 26, z + 19.12, 0.25, 7, 0.1, 0, light);
    batches.windows.add(x, 26, z + 19.12, 7, 0.25, 0.1, 0, light);
    batches.metal.add(x, 5, z + 19.04, 5, 10, 0.12, 0, new THREE.Color('#17202b'));
    batches.spires.add(x, 12, z + 19, 3.7, 5, 0.3);
  } else {
    width = 36; depth = 29; height = 91;
    solid(0, 0, 0, width, 22, depth);
    solid(-12, 22, -3, 10, 7, 19); solid(12, 22, -3, 10, 7, 19);
    solid(0, 22, -4, 10, 54, 10);
    batches.spires.add(x, 83, z - 4, 7, 16, 7);
    for (let dx = -14; dx <= 14; dx += 4) {
      batches.cylinders.add(x + dx, 8, z + 13.5, 1, 16, 1, 0, stone);
      for (const side of [-1, 1]) batches.windows.add(x + dx, 18, z + side * 14.56, 1.3, 3, 0.1, 0, light);
    }
    batches.trim.add(x, 16.5, z + 14, 35, 1, 3);
    for (const side of [-1, 1]) {
      batches.windows.add(x, 68, z - 4 + side * 5.1, 5.5, 5.5, 0.12, 0, light);
      batches.windows.add(x + side * 5.1, 68, z - 4, 0.12, 5.5, 5.5, 0, light);
    }
    chunk.signs.push({ x, y: 12, z: z + 14.7, side: 1, label: 'municipal', districtId: district.id });
  }
  // V8 landmark dress: every piece stays within the historic footprint.
  const brass=new THREE.Color('#b99a68'),dark=new THREE.Color('#374650');
  const detail=batches.facade;
  if(site.type==='cathedral'){
    for(const side of [-1,1]){
      for(const y of [12,32,46,65])batches.stone.add(x+side*11,y,z+12,9.5,.6,12.4,0,new THREE.Color('#8b8d87'));
      for(const dx of [-3.7,3.7])batches.stone.add(x+side*11+dx,34,z+18.15,.45,67,.5,0,new THREE.Color('#9a9c92'));
      for(const y of [20,37,56])for(const dx of [-2,0,2]){
        batches.metal.add(x+side*11+dx,y,z+18.12,.85,5,.12,0,dark);
        batches.windows.add(x+side*11+dx,y,z+18.21,.22,3.4,.06,0,new THREE.Color('#9b7d65'));
      }
    }
    for(let n=0;n<12;n++){const a=n/12*Math.PI*2;batches.windows.add(x+Math.cos(a)*2.7,26+Math.sin(a)*2.7,z+19.2,.35,1.4,.04,a,new THREE.Color('#c19a82'));}
    for(const side of [-1,1])for(const dz of [-14,-7,0,7]){
      for(let n=0;n<4;n++)detail.add(x+side*(10+n*.75),20-n*2,z+dz,1,1.5,1.1,0,stone);
      batches.windows.add(x+side*9.12,21,z+dz,.06,6,.6,0,new THREE.Color(dz%2?'#d19eae':'#8fbed5'));
    }
    for(let n=0;n<7;n++){const a=Math.PI*n/6;detail.add(x+Math.cos(a)*3.2,9+Math.sin(a)*4,z+19.2,.7,.9,.5,0,stone);}
    for(const side of [-1,1]){detail.add(x+side*5.5,2,z+18,1.4,4,1.4,0,dark);batches.spires.add(x+side*5.5,4.7,z+18,.65,1.5,.65);}
    for(let n=0;n<4;n++)detail.add(x,.15+n*.2,z+19.7-n*.25,8,.15,1.3-n*.2,0,stone);
  }else if(site.type==='tower'){
    for(const side of [-1,1])for(const dx of [-10,-5,5,10])detail.add(x+dx,28,z+side*14.55,.35,50,.3,0,brass);
    for(const y of [150,155,163])for(const side of [-1,1]){
      batches.windows.add(x,y,z+side*4.2,8,.22,.1,0,brass);
      batches.windows.add(x+side*4.2,y,z,.1,.22,8,0,brass);
    }
    batches.trim.add(x,193,z,.17,14,.17);
    for(const side of [-1,1])detail.add(x+side*11,4,z+14,4,8,1,0,stone);
  }else{
    for(let n=0;n<4;n++)detail.add(x,.15+n*.16,z+14.6-n*.2,16,.15,1.1-n*.15,0,stone);
    batches.rosette.add(x,68,z+1.17,2.3,2.3,.3,0,brass);
    for(const side of [-1,1]){detail.add(x+side*3,67,z+1.24,.15,6,.12,0,dark);detail.add(x,68+side*3,z+1.24,6,.15,.12,0,dark);}
    detail.add(x,68.7,z+1.3,.15,1.7,.15,0,dark);detail.add(x+.6,68,z+1.3,1.35,.15,.15,0,dark);
    for(const side of [-1,1])batches.windows.add(x+side*15,10,z+14.61,.15,15,.08,0,brass);
  }
  const bounds = { minX: x - width / 2 - 0.6, maxX: x + width / 2 + 0.6,
    minZ: z - depth / 2 - 0.6, maxZ: z + depth / 2 + 0.6, districtId: district.id, kind: 'landmark' };
  chunk.colliders.push(bounds);
  if (site.type !== 'tower') chunk.buildings.push({ ...bounds, x, z, width, depth, height, style: site.type, landmark: site.type });
  chunk.landmarks.push({ ...site, x, z, height, districtId: district.id });
}
