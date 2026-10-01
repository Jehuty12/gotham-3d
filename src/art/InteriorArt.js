import { Color } from 'three';
import { addLabel } from './TechnicalMarks.js';

export function addInteriorArt(spec,batches){
  const {x,z}=spec.building,w=spec.width,d=spec.depth,type=spec.type;
  const industrial=['warehouse','industrial'].includes(type);
  const tone=new Color(industrial?'#685c47':type==='municipal'?'#867b63':type==='shop'?'#755853':'#507780');
  const light=new Color(industrial?'#acd6c9':type==='shop'?'#ebc091':'#b7dbe4');
  const wall=z-d/2+.35;
  // Fixtures are against the back wall and above head height, clear of stairs,
  // elevator and the existing three furniture colliders.
  for(const floor of [0,3.6]){
    for(let i=-1;i<=1;i++){
      const px=x+i*Math.max(1,(w-5)/3);
      if(industrial){
        for(let n=0;n<3;n++)batches.metal.add(px,1.6+floor+n*.4,wall,.75,.12,.55,0,tone);
        batches.trim.add(px,2.2+floor,wall,.08,2,.08);
      }else if(type==='municipal'||type==='lobby'){
        batches.trim.add(px,2.6+floor,wall,.2,2.1,.25);
        batches.metal.add(px,3.15+floor,wall,.6,.12,.45,0,tone);
      }else{
        batches.metal.add(px,2.15+floor,wall,.8,1,.15,0,tone);
        batches.windows.add(px,2.25+floor,wall+.09,.55,.35,.02,0,light);
      }
    }
    batches.metal.add(x,3.45+floor,wall,Math.max(2,w-2),.12,.16,0,tone);
  }
  const label={municipal:'ARCHIVES',lobby:'VELRUNE',shop:'ORMELLE',metro:'LIGNE 01',warehouse:'DEPOT 04',industrial:'CALDREN'}[type]??'ACCES';
  for(const y of [2.85,6.45])addLabel(batches.windows,label,x,y,wall+.15,Math.min(.13,(w-2)/(label.length*4)),light);
  // Floor inlays guide the eye to the existing entrance without obstruction.
  for(const side of [-1,1])batches.paint.add(x+side*.7,.255,z, .035,.012,Math.max(2,d-3),0,tone);
}
