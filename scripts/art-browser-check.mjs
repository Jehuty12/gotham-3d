import assert from 'node:assert/strict';

export async function checkArt({evaluate,stats,pause,production}) {
  let before=await stats();
  // Diagnostics sample once per second after shader warmup. Wait for that first
  // sample rather than assuming a fixed navigation delay covers every machine.
  for(let i=0;i<40&&!Number.isFinite(before.visibleProps);i++){await pause(100);before=await stats();}
  for(const field of ['visibleProps','visibleSigns','visibleNeon','facadeInstances','rooftopDetails','decorativeInstancesLoaded','dynamicLights','emissiveObjects','transparentObjects'])assert.ok(Number.isFinite(before[field]),field);
  assert.ok(before.decorativeInstancesLoaded>0);
  for(const preset of ['CINEMATIC','HIGH_CONTRAST','DEFAULT']){
    await evaluate(`(()=>{const e=document.querySelector('#option-colorGrading');e.value='${preset}';e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await pause(100);
    assert.equal(await evaluate("document.querySelector('#option-colorGrading').value"),preset);
  }
  await evaluate(`(()=>{for(const id of ['stormEnabled','vignette']){const e=document.querySelector('#option-'+id);e.checked=true;e.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
  if(!production){
    const settings=await evaluate('__testLiving.runtime.options.capture()');assert.equal(settings.stormEnabled,true);assert.equal(settings.vignette,true);
    const result=await evaluate(`(()=>{const l=__testLiving,s=l.runtime.storm;const before=s.remaining;s.enabled=true;s.remaining=.001;s.update(.01,1);const flash=s.flash;s.enabled=false;s.update(0,1);s.remaining=before;return {flash,off:s.flash}})()`);
    assert.equal(result.flash,1);assert.equal(result.off,0);
  }
  await evaluate(`(()=>{for(const id of ['stormEnabled','vignette']){const e=document.querySelector('#option-'+id);e.checked=false;e.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
  console.log(production?'production':'development',': V8 art diagnostics, color profiles and atmosphere options passed');
}
