import assert from 'node:assert/strict';
import { Vector3 } from 'three';

// Travel fixtures replace human navigation, never ContentManager.advance or a
// synthetic completed flag. Each objective is driven through its runtime action.
export function enterVehicle(f,position){const {living:l,player}=f,v=l.gameplay.vehicles;v.exit(new Vector3(0,1.75,54));if(l.vertical.interiors.active)l.vertical.interiors.exit();if(l.vertical.underground.active)l.vertical.underground.exit();v.vehicle.position.copy(position??v.garages[0].position);v.vehicle.integrity=100;v.vehicle.speed=0;v.vehicle.velocity.set(0,0,0);v.vehicle.grounded=true;l.runtime.streaming.ensureAt(v.vehicle.position);player.physics.teleport(v.vehicle.position.clone().add(new Vector3(2.4,1.75,0)));player.physics.grounded=true;assert.ok(v.enter(),'Can enter NIGHTRIDER');}
export function completeRuntimeObjective(f){
  const {content:c,living:l,player}=f,g=l.gameplay,o=c.objective,index=c.active.index,mission=c.active.definition.id;let simulatedSeconds=0;
  const tick=dt=>{simulatedSeconds+=dt;c.update(dt);};
  c.teleport(o);g.health.dead=false;
  switch(o.kind){
    case 'reach':tick(.05);break;
    case 'inspect':assert.ok(c.interact(),`${mission}: interaction ${o.text}`);tick(.05);break;
    case 'scan':g.scanner.cooldown=0;assert.ok(g.scanner.activate());for(let t=0;t<o.duration+.1&&c.active?.index===index;t+=.05){g.scanner.update(.05);tick(.05);}break;
    case 'observe':l.camera.position.x-=1;l.camera.lookAt(...o.position);for(let t=0;t<o.duration+.1&&c.active?.index===index;t+=.05)tick(.05);break;
    case 'defeat':{
      c.prepareStage();const enemies=g.enemies.enemies.filter(e=>e.eventId===c.encounter?.id);assert.equal(enemies.length,o.count,'Authored enemies spawned');
      for(const enemy of enemies){for(let hit=0;hit<4&&enemy.state!=='DISABLED';hit++){const eye=enemy.position.clone().add(new Vector3(0,1.2,0));player.physics.teleport(eye.clone().add(new Vector3(0,0,1.2)));l.camera.lookAt(eye);g.combat.update(.41);assert.ok(g.combat.attack([enemy],l.camera.position,eye.sub(l.camera.position).normalize()),'Combat reaches target');simulatedSeconds+=.41;}}
      tick(.05);break;
    }
    case 'drive':enterVehicle(f,new Vector3(o.position[0],0,o.position[2]));l.camera.position.fromArray(o.position);tick(.05);break;
    case 'vehicle':{
      enterVehicle(f);c.prepareStage();assert.ok(c.vehicleId,'Runtime vehicle mission activated');
      for(let t=0;t<20&&c.active?.index===index;t+=.05){
        if(o.vehicleType==='evade')g.pursuit.update(.05,g.vehicles.vehicle.position,l.performance.level,true);
        else g.vehicles.vehicle.position.copy(g.vehicles.target.position).add(new Vector3(0,0,3));
        g.vehicleMissions.update(.05,true);tick(.05);
      }break;
    }
    case 'traverse':{
      const origin=c.locations.point('relay');c.teleport(origin);const grapple=l.vertical.grapple;
      const target=grapple.points.filter(p=>p.position.distanceTo(new Vector3(...o.position))<12).sort((a,b)=>a.position.distanceTo(l.camera.position)-b.position.distanceTo(l.camera.position))[0];
      assert.ok(target);for(let i=0;i<30;i++)grapple.step(1/120);l.camera.lookAt(target.position);grapple.update(0);assert.ok(grapple.use(),'Authored grapple engages');
      for(let t=0;t<4&&grapple.active;t+=1/120){player.physics.step(1/120,new Vector3(),{jump:false,crouch:false});tick(1/120);}
      assert.notEqual(grapple.state,'blocked','Authored grapple sweep clear');
      // Settle on the adjacent roof to test the arrival trigger after real pull.
      player.physics.teleport(new Vector3(...o.position));tick(.05);break;
    }
    default:assert.fail(`Unsupported objective ${o.kind}`);
  }
  assert.ok(c.active?.definition.id!==mission||c.active.index>index,`${mission} objective ${index} (${o.kind}) did not complete`);
  return {index,kind:o.kind,text:o.text,simulatedSeconds};
}
