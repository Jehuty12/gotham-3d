export const VEHICLE_AUDIO_CATEGORIES=Object.freeze(['engine','acceleration','brake','tires','boost','collision']);

// Lazily connected to AudioManager's existing master gain. No network or assets.
export class VehicleAudio {
  constructor(context,master) {
    this.context=context;this.nodes=new Map();
    const noise=context.createBuffer(1,Math.ceil(context.sampleRate*.5),context.sampleRate),data=noise.getChannelData(0);
    let seed=1989;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*.15;}
    for(const name of VEHICLE_AUDIO_CATEGORIES) {
      const gain=context.createGain();gain.gain.value=0;gain.connect(master);
      let source;
      if(['engine','acceleration','boost'].includes(name)){source=context.createOscillator();source.type='triangle';source.frequency.value=name==='boost'?180:50;}
      else {source=context.createBufferSource();source.buffer=noise;source.loop=true;}
      source.connect(gain);source.start();this.nodes.set(name,{source,gain});
    }
  }
  update(state) {
    const {driving=false,speed=0,throttle=0,brake=false,tires=false,boost=false,impact=0}=state;
    const levels={engine:driving?.035:0,acceleration:driving&&throttle>0?.012:0,brake:driving&&brake?.06:0,tires:driving&&tires?.11:0,boost:driving&&boost?.013:0,collision:driving?impact*.25:0};
    for(const [name,{source,gain}] of this.nodes) {
      gain.gain.setTargetAtTime(levels[name],this.context.currentTime,.06);
      if(source.frequency)source.frequency.setTargetAtTime((name==='boost'?180:name==='acceleration'?85:40)+Math.min(speed,40)*4,this.context.currentTime,.08);
    }
  }
  registerBuffer(category,buffer) {
    const node=this.nodes.get(category);if(!node)throw new RangeError('Unknown vehicle audio category');
    node.source.stop();node.source.disconnect();const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(node.gain);source.start();node.source=source;
  }
  dispose(){for(const {source,gain} of this.nodes.values()){source.stop();source.disconnect();gain.disconnect();}this.nodes.clear();}
}
