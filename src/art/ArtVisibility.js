import { distanceBand } from './ArtDirection.js';

export function applyArtBudget(mesh,distance,budget) {
  const art=mesh.userData.art;if(!art)return;
  const band=distanceBand(distance,budget);
  mesh.visible=art.band==='NEAR'?band==='NEAR':art.band==='MID'?band!=='FAR':art.band==='FAR'?band==='FAR':true;
  if(art.kind==='props') {
    const n=Math.max(0,Math.ceil(art.prefix.length*budget.props));
    mesh.count=n?art.prefix[n-1]:0;art.logicalCount=n;
  } else if(art.kind==='sign'&&art.neon){
    // Whole deterministic groups remain stable across reloads and profiles.
    mesh.visible=distance<budget.mid&&(art.rank??0)<budget.signs;
  }
}

export function artSnapshot(living) {
  const result={visibleProps:0,visibleSigns:0,visibleNeon:0,facadeInstances:0,rooftopDetails:0,decorativeInstancesLoaded:0,emissiveObjects:0,dynamicLights:0,transparentObjects:0,postprocessingEnabled:living.performance.profile.bloom};
  for(const chunk of living.city.chunks.values())if(chunk.loaded!==false)chunk.group.traverse(o=>{if(o.userData.art)result.decorativeInstancesLoaded+=o.userData.art.fullCount??o.count??0;});
  living.scene.updateMatrixWorld();
  living.scene.traverseVisible(o=>{
    if(o.isLight){if((o.isPointLight||o.isSpotLight)&&o.intensity>0)result.dynamicLights++;return;}
    if(!o.material||o.isInstancedMesh&&o.count===0)return;
    if(o.geometry&&o.frustumCulled&&!living.performance.frustum.intersectsObject(o))return;
    const art=o.userData.art;
    if(art){if(art.kind==='props')result.visibleProps+=art.logicalCount??art.prefix?.length??0;
      if(art.kind==='sign'){result.visibleSigns+=o.count;if(art.neon)result.visibleNeon+=o.count;}
      if(art.kind==='facade')result.facadeInstances+=o.count;
      if(art.kind==='rooftop')result.rooftopDetails+=o.count;}
    const materials=[o.material].flat();
    if(materials.some(m=>m.transparent))result.transparentObjects++;
    if(materials.some(m=>m.emissive?.getHex()>0||m.isMeshBasicMaterial&&Math.max(m.color.r,m.color.g,m.color.b)>1))result.emissiveObjects++;
  });
  return result;
}
