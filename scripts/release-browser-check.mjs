import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { connectChrome } from './cdp.mjs';
const c=await connectChrome(),production=process.argv.includes('--production'),target=process.argv[2]??'http://127.0.0.1:5177/',layouts=[];
try{
  await c.send('Page.navigate',{url:target});await c.pause(3000);assert.equal(await c.evaluate('typeof globalThis.cityDebug'),production?'undefined':'object');
  await c.click('#enter');if(await c.evaluate("!document.querySelector('#new-game-confirm').hidden"))await c.click('#confirm-new');await c.pause(350);
  for(const [width,height] of [[1280,720],[1920,1080],[2560,1440],[2560,1080]]){
    await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await c.pause(100);
    await c.send('Input.dispatchKeyEvent',{type:'keyDown',code:'Tab',key:'Tab',windowsVirtualKeyCode:9});await c.send('Input.dispatchKeyEvent',{type:'keyUp',code:'Tab',key:'Tab',windowsVirtualKeyCode:9});await c.pause(100);
    assert.equal(await c.evaluate("document.querySelector('#content-screen').hidden"),false);
    const layout=await c.evaluate(`(()=>{document.documentElement.style.setProperty('--ui-scale',1.3);return [...document.querySelectorAll('#content-screen,#content-close,.content-list,.content-body canvas')].map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.className,left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};});})()`);
    for(const r of layout){assert.ok(r.left>=-1&&r.right<=width+1&&r.top>=-1&&r.bottom<=height+1,`${width}x${height}: ${r.id} within safe area`);assert.ok(r.width>0&&r.height>0);}layouts.push({width,height,layout});
    await c.click('#content-close');await c.pause(100);
  }
  await c.evaluate('document.exitPointerLock()');await c.pause(150);await c.click('#menu-options');
  for(const [id,value] of [['tutorials','MINIMAL'],['subtitleSize','LARGE'],['cameraMotion','0'],['uiScale','1.3']])await c.evaluate(`(()=>{const e=document.querySelector('#option-${id}');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await c.evaluate("const e=document.querySelector('#option-reduceFlashes');e.checked=true;e.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#controls-screen').open=true");
  assert.match(await c.evaluate("document.querySelector('#controls-screen').textContent"),/VÉHICULE/);assert.equal(await c.evaluate("document.body.classList.contains('reduce-flashes')"),true);
  await c.evaluate("document.querySelector('#settings-panel').hidden=true");await c.click('#save-game');
  const s=await c.evaluate("JSON.parse(localStorage.getItem('world-polish:save'))");assert.equal(s.settings.tutorials,'MINIMAL');assert.equal(s.settings.subtitleSize,'LARGE');assert.equal(s.settings.cameraMotion,0);assert.equal(s.settings.reduceFlashes,true);
  await c.click('#save-game');assert.ok(await c.evaluate("localStorage.getItem('world-polish:save:backup')"));await c.evaluate("localStorage.setItem('world-polish:save','{corrupt')");await c.send('Page.reload');await c.pause(3000);await c.click('#continue-game');await c.pause(300);assert.equal(await c.evaluate("document.body.classList.contains('reduce-flashes')"),true);
  await c.evaluate('document.exitPointerLock()');await c.pause(150);await c.click('#recover-vehicle');assert.match(await c.evaluate("document.querySelector('#recovery-status').textContent"),/garage/);
  if(!production){
    await c.evaluate(`(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/systems/LivingCity.js')).name;const {LivingCity}=await import(url);const update=LivingCity.prototype.update;LivingCity.prototype.update=function(dt){globalThis.__release=this;return update.call(this,dt)}})()`);await c.pause(100);
    await c.evaluate("__release.gameplay.setMode('VIGILANTE');__release.content.start('story-1');__release.content.fail('Contrôle de la reprise')");
    assert.match(await c.evaluate("document.querySelector('.content-list').textContent"),/MISSION INTERROMPUE/);
    const actions=await c.evaluate("[...document.querySelectorAll('.content-list button')].map(b=>b.textContent)");assert.equal(actions.length,3);
    await c.evaluate("document.querySelectorAll('.content-list button')[2].click()");await c.pause(200);assert.equal(await c.evaluate('__release.content.active'),null);
  }
  assert.deepEqual(c.errors,[]);assert.deepEqual(c.warnings,[]);await writeFile(`artifacts/release-browser-${production?'production':'development'}.json`,JSON.stringify({date:new Date().toISOString(),checks:'passed',layouts,settings:s.settings,backupRecovered:true,errors:c.errors,warnings:c.warnings},null,2));console.log('RC UI, accessibility preferences, recovery, backup and production isolation PASS');
}finally{c.close();}
