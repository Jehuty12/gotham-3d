import { seededRandom, deriveSeed } from '../utils/procedural.js';
import { VehicleAudio } from '../vehicles/VehicleAudio.js';

export const AUDIO_CATEGORIES = Object.freeze(['rain', 'traffic', 'sirens', 'metro', 'wind', 'industrial']);

// No downloads. Gentle procedural placeholders can later be replaced by AudioBuffers.
export class AudioManager {
  constructor(seed, contextFactory = null) {
    this.seed = seed; this.volume = 0.22; this.active = false; this.context = null;
    this.contextFactory = contextFactory; this.channels = new Map(); this.sources = [];
    this.buffers = new Map(); this.status = 'ready';
  }
  async activate() {
    try {
      if (!this.context) {
        const Constructor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!this.contextFactory && !Constructor) { this.status = 'unavailable'; return; }
        this.context = this.contextFactory ? this.contextFactory() : new Constructor();
        const ctx = this.context;
        this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
        for (const name of AUDIO_CATEGORIES) {
          const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(this.master);
          this.channels.set(name, gain);
        }
        const random = seededRandom(deriveSeed(this.seed, 'audio-noise'));
        const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (random() * 2 - 1) * 0.25;
        for (const [category, cutoff] of [['rain', 1700], ['wind', 230], ['traffic', 150], ['industrial', 90]]) {
          const source = ctx.createBufferSource(); source.buffer = noise; source.loop = true;
          const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff;
          source.connect(filter); filter.connect(this.channels.get(category)); source.start();
          this.sources.push({ source, category, filter });
        }
        for (const [category, frequency] of [['metro', 85], ['sirens', 530]]) {
          const source = ctx.createOscillator(); source.type = 'sine'; source.frequency.value = frequency;
          source.connect(this.channels.get(category)); source.start(); this.sources.push({ source, category });
        }
        for (const [category, buffer] of this.buffers) this.registerBuffer(category, buffer);
      }
      await this.context.resume(); this.status = this.context.state;
    } catch { this.status = 'unavailable'; }
  }
  setVolume(value) { this.volume = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); this.applyVolume(); }
  setActive(active) { this.active = Boolean(active); this.applyVolume(); }
  setVehicle(state) {
    this.vehicleState=state;
    if(this.context?.state!=='running')return;
    if(!this.vehicleAudio&&state.driving)this.vehicleAudio=new VehicleAudio(this.context,this.master);
    this.vehicleAudio?.update(state);
  }
  applyVolume() { if (this.master) this.master.gain.setTargetAtTime(this.active ? this.volume : 0, this.context.currentTime, 0.1); }
  registerBuffer(category, buffer) {
    if (!AUDIO_CATEGORIES.includes(category)) throw new RangeError('Unknown audio category');
    this.buffers.set(category, buffer);
    if (!this.context) return;
    for (const item of this.sources.filter(s => s.category === category)) { item.source.stop(); item.source.disconnect(); item.filter?.disconnect(); }
    this.sources = this.sources.filter(s => s.category !== category);
    const source = this.context.createBufferSource(); source.buffer = buffer; source.loop = true;
    source.connect(this.channels.get(category)); source.start(); this.sources.push({ source, category, asset: true });
  }
  update(time, { rain, traffic, district, trainDistance, siren }) {
    if (this.context?.state !== 'running') return;
    const levels = { rain: rain * 0.26, wind: 0.12, traffic: traffic * 0.18, industrial: district === 'industrial' ? 0.24 : 0.015,
      metro: Math.max(0, 1 - trainDistance / 95) * 0.018, sirens: this.vehicleState?.siren?0.018:siren ? 0.009 : 0 };
    if(this.environment==='underground') {levels.metro=.025;levels.rain=0;levels.traffic=.015;levels.wind=.015;levels.industrial=.12;}
    else if(this.environment==='interior') {levels.rain*=.08;levels.traffic*=.15;levels.wind*=.1;}
    for (const name of AUDIO_CATEGORIES) this.channels.get(name).gain.setTargetAtTime(levels[name], this.context.currentTime, 0.3);
    const sirens = this.sources.find(s => s.category === 'sirens' && !s.asset);
    if (sirens) sirens.source.frequency.setTargetAtTime(590 + Math.sin(time * 2.5) * 110, this.context.currentTime, 0.12);
    this.applyVolume();
  }
  dispose() {
    this.vehicleAudio?.dispose();
    for (const { source, filter } of this.sources) { source.stop(); source.disconnect(); filter?.disconnect(); }
    this.sources.length = 0;
    if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
  }
}
