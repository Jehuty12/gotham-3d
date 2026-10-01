import { DISTRICT_ART } from './ArtDirection.js';

// World-space mineral grain and rain streaking; no image assets, no per-building
// materials. Stable instance color supplies the hue. A single shader variant.
export function mineralVariation(material,kind) {
  material.userData.artSurface=kind;
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vArtWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 artPosition=vec4(position,1.0);
      #ifdef USE_INSTANCING
        artPosition=instanceMatrix*artPosition;
      #endif
      vArtWorld=(modelMatrix*artPosition).xyz;`);
    shader.fragmentShader='varying vec3 vArtWorld;\n'+shader.fragmentShader;
    const ground=kind!=='stone';
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float grain=fract(sin(dot(floor(vArtWorld*${ground?'9.0':'3.0'}),vec3(12.9898,78.233,39.425)))*43758.5453);
      float streak=sin(vArtWorld.x*3.7+sin(vArtWorld.z*4.3))*sin(vArtWorld.z*6.1);
      diffuseColor.rgb*=0.92+grain*0.10;
      ${ground?'':'diffuseColor.rgb*=mix(0.78,1.0,smoothstep(0.0,4.0,vArtWorld.y)); diffuseColor.rgb*=1.0-streak*0.045;'}
      ${kind==='pavement'?'float joint=min(abs(fract(vArtWorld.x*1.7)-.5),abs(fract(vArtWorld.z*2.4)-.5)); diffuseColor.rgb*=mix(.78,1.0,smoothstep(.015,.045,joint));':''}`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 vec2 artBlend=smoothstep(vec2(-64.0),vec2(64.0),vArtWorld.xz);
 float artRough=mix(mix(${DISTRICT_ART.old.roughness},${DISTRICT_ART.downtown.roughness},artBlend.x),mix(${DISTRICT_ART.industrial.roughness},${DISTRICT_ART.docks.roughness},artBlend.x),artBlend.y);
 roughnessFactor=clamp(roughnessFactor+(artRough-.85)+(grain-.5)*.08,.08,1.0);`);
  };
  material.customProgramCacheKey=()=>`art-v8-${kind}`;
  return material;
}
