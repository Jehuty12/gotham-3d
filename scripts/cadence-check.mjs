import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { connectChrome } from './cdp.mjs';

// Control experiment: no game, no WebGL, no profiler and no throttling flags.
const c = await connectChrome(), runs = [];
try {
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: 'about:blank' });
  await c.pause(1000);
  for (const mode of ['empty', 'canvas', 'empty']) {
    const frames = await c.evaluate(`new Promise(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = 1440; canvas.height = 900;
      document.body.replaceChildren(canvas);
      const ctx = ${JSON.stringify(mode)} === 'canvas' ? canvas.getContext('2d') : null;
      const times = [], actual = []; let start, last, lastActual;
      function frame(t) {
        const now = performance.now();
        if (last !== undefined) { times.push(t-last); actual.push(now-lastActual); }
        start ??= t; last = t; lastActual = now;
        if (ctx) { ctx.fillStyle = '#121e28'; ctx.fillRect(0,0,1440,900); ctx.fillStyle = '#ffffff'; ctx.fillRect((t/10)%1400,400,40,40); }
        if (t-start < 6000) requestAnimationFrame(frame);
        else {
          const mean = times.reduce((a,b)=>a+b,0)/times.length;
          const slow = times.slice().sort((a,b)=>b-a).slice(0,Math.ceil(times.length*.01));
          resolve({ fps:1000/mean, meanMs:mean, low1:1000/(slow.reduce((a,b)=>a+b,0)/slow.length), maxMs:Math.max(...times), actualMeanMs:actual.reduce((a,b)=>a+b,0)/actual.length, over20:times.filter(t=>t>20).length, over33:times.filter(t=>t>33).length, over50:times.filter(t=>t>50).length, frames:times.length, visibility:document.visibilityState, browser:navigator.userAgent });
        }
      }
      requestAnimationFrame(frame);
    })`);
    runs.push({ mode, ...frames });
    console.log(mode, frames.fps.toFixed(2), 'FPS', frames.meanMs.toFixed(3), 'ms');
  }
  assert.deepEqual(c.errors, []); assert.deepEqual(c.warnings, []);
  await writeFile('artifacts/cadence-check.json', JSON.stringify({ date:new Date().toISOString(), method:'Same Chrome session; blank document and animated 2D canvas, no game code, no WebGL, three six-second windows. Browser scheduling control, not a hardware refresh-rate measurement.', runs, errors:c.errors, warnings:c.warnings }, null, 2));
} finally { c.close(); }
