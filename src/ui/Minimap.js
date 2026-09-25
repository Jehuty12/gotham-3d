import * as THREE from 'three';
import { DISTRICTS } from '../world/districts.js';

export class Minimap {
  constructor(canvas, city, camera, vertical=null) {
    this.vertical=vertical; this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.city = city; this.camera = camera; this.direction = new THREE.Vector3();
    this.coords = document.querySelector('#coordinates');
    this.districtName = document.querySelector('#district-name');
    this.sector = document.querySelector('#sector');
  }

  draw() {
    const { canvas, ctx, city, camera } = this;
    const { x, z } = camera.position;
    const scale = 0.68, cx = canvas.width / 2, cy = canvas.height / 2;
    ctx.fillStyle = '#0e1b20'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(cx - x * scale, cy - z * scale); ctx.scale(scale, scale);
    for (const chunk of city.chunks.values()) {
      ctx.fillStyle = chunk.district.mapGround;
      ctx.fillRect(chunk.x - chunk.platformSize / 2, chunk.z - chunk.platformSize / 2, chunk.platformSize, chunk.platformSize);
    }
    for (const b of city.buildings) {
      ctx.fillStyle = DISTRICTS[b.districtId].mapColor;
      ctx.fillRect(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ);
    }
    ctx.fillStyle = '#235465';
    for (const b of city.water) ctx.fillRect(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ);
    for (const chunk of city.chunks.values()) for (const b of chunk.colliders) {
      if (b.kind !== 'container') continue;
      ctx.fillStyle = '#a18559'; ctx.fillRect(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ);
    }
    if(this.vertical) {
      ctx.fillStyle='#91d7c2';
      for(const s of this.vertical.specs)ctx.fillRect(s.entrance.x-2,s.entrance.z-2,4,4);
      ctx.font='bold 11px sans-serif';
      for(const station of this.vertical.living.rail.stations)ctx.fillText('M',station.x,station.z);
      ctx.fillStyle='#efd582';
      for(const point of this.vertical.discoveries.points)if(this.vertical.discoveries.visited.has(point.id)){ctx.beginPath();ctx.arc(point.x,point.z,4,0,Math.PI*2);ctx.fill();}
      const game=this.vertical.gameplay;
      const vehicles=game?.vehicles;
      if(vehicles&&!city.collisionWorld.domain){
        ctx.font='bold 11px sans-serif';ctx.fillStyle='#97dbbc';
        for(const garage of vehicles.garages)ctx.fillText('G',garage.position.x,garage.position.z);
        const car=vehicles.vehicle;ctx.save();ctx.translate(car.position.x,car.position.z);ctx.rotate(-car.rotation);ctx.fillStyle='#c4f5eb';ctx.fillRect(-2,-4,4,8);ctx.restore();
        if(vehicles.target.active){ctx.fillStyle='#f1c86d';ctx.fillText('T',vehicles.target.position.x,vehicles.target.position.z);}
        const mission=game.vehicleMissions?.active;
        if(mission&&mission.type!=='evade'){ctx.strokeStyle='#ebce77';ctx.beginPath();ctx.arc(mission.destination.x,mission.destination.z,6,0,Math.PI*2);ctx.stroke();}
        ctx.fillStyle='#da7898';for(const unit of vehicles.police)if(unit.active&&unit.position.distanceTo(car.position)<95)ctx.fillText('P',unit.position.x,unit.position.z);
      }
      if(game?.mode==='VIGILANTE') {
        ctx.fillStyle='#e8aa69';
        for(const event of game.crimes.events)if(event.resolvedAt===null&&event.position.distanceTo(camera.position)<170)ctx.fillText('!',event.position.x,event.position.z);
        const m=game.missions.active;
        if(m) {
          ctx.strokeStyle='#94efc7';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(m.position.x,m.position.z,7,0,Math.PI*2);ctx.stroke();
          ctx.fillStyle='#c9ffe1';ctx.fillText(Math.abs(m.position.y-camera.position.y)>5?(m.position.y>camera.position.y?'↑':'↓'):'◇',m.position.x,m.position.z-9);
        }
        ctx.fillStyle='#f07a70';
        for(const enemy of game.enemies.enemies)if(enemy.state!=='DISABLED'&&game.scanner.reveals(enemy,camera.position))ctx.fillRect(enemy.position.x-2,enemy.position.z-2,4,4);
      }
    }
    ctx.restore();
    // Edge-clamped markers retain the direction of distant city landmarks.
    ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    for (const landmark of city.landmarks) {
      const dx = (landmark.x - x) * scale, dz = (landmark.z - z) * scale;
      const ratio = Math.max(1, Math.abs(dx) / (cx - 12), Math.abs(dz) / (cy - 12));
      const px = cx + dx / ratio, py = cy + dz / ratio;
      ctx.fillStyle = this.vertical?.discoveries.visited.has(landmark.type)?'#91e2c0':'#e6c785'; ctx.fillRect(px - 3, py - 3, 6, 6);
      ctx.fillText({ cathedral: 'C', tower: 'T', municipal: 'M' }[landmark.type], px, py - 6);
    }
    ctx.save(); ctx.translate(cx, cy);
    camera.getWorldDirection(this.direction); ctx.rotate(Math.atan2(this.direction.x, -this.direction.z));
    ctx.fillStyle = '#b9f9e8'; ctx.shadowColor = '#71dec7'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 3); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.restore();
    this.coords.textContent = `${this.vertical?.zone==='underground'?'▼ ':''}X ${Math.round(x)} · Z ${Math.round(z)}`;
    this.districtName.textContent = city.districtAt(x, z).name.toUpperCase();
    this.sector.textContent = `CHUNK ${city.chunkAt(x, z)?.id ?? '—'}`;
  }
}
