// Piggybacks on the existing OutputPass: no extra fullscreen pass, preserves AA.
// LOW uses tone-mapping exposure only and never invokes the compositor.
export const COLOR_PROFILES=Object.freeze({DEFAULT:{exposure:1.05,contrast:1,saturation:1,tint:[1,1,1]},CINEMATIC:{exposure:1.06,contrast:1.035,saturation:.88,tint:[.97,1.005,1.035]},HIGH_CONTRAST:{exposure:1.12,contrast:1.1,saturation:.94,tint:[1,1,1]}});
export class ColorGrading {
  constructor(renderer,output){
    this.renderer=renderer;this.output=output;this.exposure=1.05;
    const m=output.material;
    Object.assign(m.uniforms,{artContrast:{value:1},artSaturation:{value:1},artTint:{value:[1,1,1]},artVignette:{value:0}});
    m.fragmentShader='precision highp float; uniform float artContrast; uniform float artSaturation; uniform vec3 artTint; uniform float artVignette;\n'+m.fragmentShader;
    const end=m.fragmentShader.lastIndexOf('}');
    m.fragmentShader=m.fragmentShader.slice(0,end)+`vec3 artColor=gl_FragColor.rgb*artTint;
      artColor=mix(vec3(dot(artColor,vec3(.2126,.7152,.0722))),artColor,artSaturation);
      artColor=(artColor-.5)*artContrast+.5;
      artColor*=1.0-artVignette*smoothstep(.2,.75,length(vUv-.5));
      gl_FragColor.rgb=clamp(artColor,0.0,1.0);`+m.fragmentShader.slice(end);
    m.needsUpdate=true;
  }
  update(dt,living,settings,flash=0){
    const profile=COLOR_PROFILES[settings.colorGrading]??COLOR_PROFILES.DEFAULT;
    const indoor=!!living.city.collisionWorld.domain,weather=living.rain.enabled?living.rain.intensity:0;
    const target=profile.exposure+(indoor?.09:0)-weather*.025;
    this.exposure+=(target-this.exposure)*(1-Math.exp(-dt*1.2));
    this.renderer.toneMappingExposure=this.exposure+(settings.reduceFlashes?0:flash*.42);
    const u=this.output.material.uniforms;u.artContrast.value=profile.contrast;u.artSaturation.value=profile.saturation;u.artTint.value=profile.tint;u.artVignette.value=settings.vignette?.1:0;
  }
}
