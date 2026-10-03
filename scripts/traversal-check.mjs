import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { contentFixture } from './content-fixture.mjs';
import { capsuleClear,segmentBlocked } from '../src/utils/spatialQueries.js';

const f=contentFixture(),l=f.living,p=f.player.physics,g=l.vertical.grapple,results=[],edges=[];
try{
  l.gameplay.setMode('VIGILANTE');
  const points=g.points.filter(p=>p.compatible),priority=[...l.vertical.roofs.filter(b=>b.landmark).map(b=>points.find(a=>a.position.x===b.x&&Math.abs(a.position.z-b.maxZ-.9)<.1)),points.find(a=>a.position.distanceTo(new Vector3(...f.content.locations.get('crane').position))<1)].filter(Boolean);
  const groups=['old','downtown','industrial','docks'].map(id=>points.filter(a=>l.city.districtAt(a.position.x,a.position.z).id===id));
  const selected=[...priority];for(let i=0;selected.length<30;i++)for(const group of groups){const point=group[i];if(point&&!selected.includes(point)&&selected.length<30)selected.push(point);if(i>points.length)throw Error('Not enough grapple points');}
  for(const [index,point] of selected.entries()){
    let successful=null;const attempts=[];
    for(const [dx,dz] of [[0,6],[4,8],[-4,8],[0,12],[8,0],[-8,0]]){
      g.cancel(false);const origin=point.position.clone().add(new Vector3(dx,-6,dz));l.runtime.streaming.ensureAt(origin);p.teleport(origin);p.frozen=false;p.carried=false;p.motion=null;
      const feet=origin.clone();feet.y-=1.75;if(!capsuleClear(l.city.collisionWorld,feet,1.9,.42,null)||segmentBlocked(l.city.collisionWorld,origin,point.position,null))continue;
      l.camera.lookAt(point.position);g.step(.3);g.update(0);const used=g.use();if(!used)continue;
      for(let tick=0;tick<480&&g.active;tick++)p.step(1/120,new Vector3(),{jump:false,crouch:false});
      const result={origin:origin.toArray(),end:l.camera.position.toArray(),state:g.state};attempts.push(result);
      if(g.state!=='blocked'&&!g.active&&l.camera.position.distanceTo(point.position)<1.2){successful=result;break;}
    }
    results.push({index,district:l.city.districtAt(point.position.x,point.position.z).id,target:point.position.toArray(),result:successful?'PASS':'FAIL',attempts});
  }
  const roofs=l.vertical.roofs.map((b,i)=>({id:`roof-${i}`,position:[b.x,(b.roofY??b.height)+1.95,b.z+(b.roofDepth??b.depth)/2-1.3],building:b}));
  for(const roof of roofs){const b=roof.building,ladder=l.vertical.routes.ladders.find(a=>Math.abs(a.x-b.x)<.1&&Math.abs(a.z-b.maxZ-.3)<.1),stairs=l.vertical.routes.stairs.find(a=>Math.abs(a.x-b.x)<.1);if(ladder)edges.push({from:'street',to:roof.id,via:'ladder',top:ladder.top});else if(stairs)edges.push({from:'street',to:roof.id,via:'stairs'});}
  // Execute authored ladder motions, including crane, instead of merely listing them.
  for(const ladder of l.vertical.routes.ladders){g.cancel(false);p.teleport(new Vector3(ladder.x,ladder.bottom+1.75,ladder.z+.55));ladder.targets[0].use();for(let i=0;i<6000&&p.motion;i++)p.step(1/60,new Vector3(),{jump:false,crouch:false});assert.equal(p.motion,null,'Ladder finishes');assert.ok(Math.abs(l.camera.position.y-ladder.top-2.1)<.05,'Ladder reaches landing');}
  for(const a of roofs)for(const b of roofs){if(a===b)continue;const origin=new Vector3(...a.position),dest=new Vector3(...b.position),horizontal=Math.hypot(origin.x-dest.x,origin.z-dest.z),drop=origin.y-dest.y;if(horizontal<4&&Math.abs(drop)<1&&!segmentBlocked(l.city.collisionWorld,origin,dest,null))edges.push({from:a.id,to:b.id,via:'jump',method:'distance/LOS bound'});else if(drop>4&&horizontal<drop*2.6&&horizontal<65&&!segmentBlocked(l.city.collisionWorld,origin,dest,null))edges.push({from:a.id,to:b.id,via:'glide',method:'conservative glide ratio/LOS bound'});}
  const relay=roofs.find(r=>r.building.x===87.5&&r.building.z===-168.5),works=roofs.find(r=>r.building.x===104.5&&r.building.z===-168.5);edges.push({from:relay.id,to:works.id,via:'grapple',method:'swept runtime verified in campaign-check'});
  const glide=[];for(const id of ['relay','court','meridian','crane']){
    const loc=f.content.locations.get(id),point=loc.roof??loc.position;f.content.teleport({domain:'exterior',position:[point[0],point[1]+8,point[2]+12]});g.cancel(false);p.vy=-2;p.grounded=false;l.camera.lookAt(l.camera.position.clone().add(new Vector3(0,-1,30)));let active=0;const start=l.camera.position.clone();
    for(let i=0;i<120;i++){p.step(1/120,new Vector3(0,0,8),{jump:true,crouch:false});if(l.gameplay.traversal.glide.active)active++;}
    assert.ok(active>0,`${id} glide engages`);assert.ok(Number.isFinite(p.vy)&&Math.abs(p.vy)<20);glide.push({id,activeFrames:active,distance:start.distanceTo(l.camera.position),end:l.camera.position.toArray()});
  }
  const reachable=new Set(['street']);for(let n=0;n<roofs.length;n++)for(const e of edges)if(reachable.has(e.from))reachable.add(e.to);const unreachable=roofs.filter(r=>!reachable.has(r.id)).map(r=>r.id);
  const failed=results.filter(r=>r.result==='FAIL');await mkdir('artifacts',{recursive:true});await writeFile('artifacts/traversal-check.json',JSON.stringify({date:new Date().toISOString(),checks:failed.length||unreachable.length?'failed':'passed',grapple:results,glide,ladderMotions:l.vertical.routes.ladders.length,graph:{nodes:roofs.map(({building,...r})=>r),edges,unreachable},limitations:'Grapple origins are airborne clearance fixtures; graph glide/jump links are conservative geometric bounds, not proofs of all human trajectories.'},null,2));
  assert.equal(failed.length,0,JSON.stringify(failed));assert.deepEqual(unreachable,[]);console.log(`Traversal PASS: ${results.length} grapple points, ${glide.length} glide cases, ${roofs.length} connected roofs, ${l.vertical.routes.ladders.length} executed ladders`);
}finally{f.dispose();}
