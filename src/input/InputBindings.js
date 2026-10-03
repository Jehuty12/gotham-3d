// Stable actions for keyboard/mouse and a future gamepad adapter. No gamepad polling.
export const INPUT_BINDINGS = Object.freeze({
  MOVE_FORWARD:{codes:['KeyW','KeyZ','ArrowUp'],context:'movement',label:'Z / W / ↑ · avancer'},
  MOVE_BACK:{codes:['KeyS','ArrowDown'],context:'movement',label:'S / ↓ · reculer'},
  MOVE_LEFT:{codes:['KeyA','KeyQ','ArrowLeft'],context:'movement',label:'Q / A / ← · gauche'},
  MOVE_RIGHT:{codes:['KeyD','ArrowRight'],context:'movement',label:'D / → · droite'},
  SPRINT:{codes:['ShiftLeft','ShiftRight'],context:'foot',label:'MAJ · courir'},
  JUMP:{codes:['Space'],context:'foot',label:'ESPACE · saut / lâcher le grappin / maintenir pour planer'},
  CROUCH:{codes:['ControlLeft','ControlRight'],context:'foot',label:'CTRL · s’accroupir'},
  INTERACT:{codes:['KeyE'],context:'shared',label:'E · examiner, porte, échelle, voiture ou neutralisation discrète'},
  GRAPPLE:{codes:['KeyG','Mouse2'],context:'foot',label:'G / clic droit · grappin (Vigilante)'},
  SCANNER:{codes:['KeyV'],context:'foot',label:'V · scanner (Vigilante)'},
  ATTACK:{codes:['Mouse0'],context:'foot',label:'Clic gauche · frapper (Vigilante)'},
  DODGE:{codes:['AltLeft','AltRight'],context:'foot',label:'ALT + direction · esquiver'},
  BOOST:{codes:['ShiftLeft','ShiftRight'],context:'vehicle',label:'MAJ · boost'},
  HANDBRAKE:{codes:['Space'],context:'vehicle',label:'ESPACE · frein à main'},
  VEHICLE_CAMERA:{codes:['KeyV'],context:'vehicle',label:'V · caméra de conduite'},
  RECOVER:{codes:['KeyR'],context:'vehicle',label:'R · repositionner si immobilisé, hors poursuite'},
  LEGACY_MISSION:{codes:['KeyM'],context:'shared',label:'M · mission locale / trajet, hors campagne active'},
  MAP:{codes:['Tab'],context:'interface',label:'TAB · carte et journal'},
  PAUSE:{codes:['Escape'],context:'interface',label:'ÉCHAP · pause / options'},
  DEBUG:{codes:['F3'],context:'interface',label:'F3 · diagnostics'},
  FLOOR_1:{codes:['Digit1'],context:'foot',label:'1 · rez-de-chaussée (ascenseur)'},
  FLOOR_2:{codes:['Digit2'],context:'foot',label:'2 · étage (ascenseur)'},
  FLOOR_3:{codes:['Digit3'],context:'foot',label:'3 · toiture (ascenseur)'},
});
export const INPUT_CODES=[...new Set(Object.values(INPUT_BINDINGS).flatMap(b=>b.codes))];
export const pressed=(keys,action)=>INPUT_BINDINGS[action].codes.some(code=>keys.has(code));
export const matches=(code,action)=>INPUT_BINDINGS[action].codes.includes(code);
export function bindingConflicts(bindings=INPUT_BINDINGS){const entries=Object.entries(bindings),conflicts=[];for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){const [a,x]=entries[i],[b,y]=entries[j];if(x.context!==y.context&&x.context!=='shared'&&y.context!=='shared')continue;for(const code of x.codes)if(y.codes.includes(code))conflicts.push({a,b,code});}return conflicts;}
