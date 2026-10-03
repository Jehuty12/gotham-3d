export const TUTORIALS=Object.freeze([
  {id:'move',important:false,text:'ZQSD / WASD · avancez vers les rues éclairées. La souris dirige le regard.'},
  {id:'sprint',important:false,text:'Maintenez MAJ pour courir. Relâchez pour observer les lieux.'},
  {id:'jump',important:false,text:'ESPACE · sauter. Avancez pour franchir une corniche basse.'},
  {id:'mission',important:true,text:'TAB · carte et journal. Choisissez « Les heures effacées » pour commencer l’enquête.'},
  {id:'interact',important:true,text:'E · interagir avec la porte, l’échelle ou la trace proche.'},
  {id:'scanner',important:true,text:'V · scanner. Restez près du relevé pendant la mesure.'},
  {id:'grapple',important:true,text:'G / clic droit · viser un ancrage au-dessus de vous. ESPACE libère le câble.'},
  {id:'glide',important:true,text:'En chute, maintenez ESPACE pour planer. Visez un toit plus bas ; le planage perd de l’altitude.'},
  {id:'combat',important:true,text:'Clic gauche · frapper à courte portée. E permet une neutralisation discrète sans être vu.'},
  {id:'dodge',important:true,text:'ALT + direction · esquiver. Gardez de la distance entre deux frappes.'},
]);
export const normalizeTutorials=raw=>[...new Set(Array.isArray(raw)?raw:[])].filter(id=>TUTORIALS.some(t=>t.id===id));
export class TutorialManager {
  constructor(living,player,{ui=true}={}){Object.assign(this,{living,player});this.seen=new Set();this.time=0;this.cooldown=0;this.current=null;if(ui){this.element=document.createElement('div');this.element.id='tutorial-tip';this.element.setAttribute('role','status');this.element.hidden=true;document.body.append(this.element);}}
  restore(ids=[]){this.seen=new Set(normalizeTutorials(ids));this.time=0;this.cooldown=0;this.current=null;if(this.element)this.element.hidden=true;}
  capture(){return [...this.seen];}
  show(id){const preference=this.living.runtime?.options.settings.tutorials??'ON',tip=TUTORIALS.find(t=>t.id===id);if(!tip||preference==='OFF'||preference==='MINIMAL'&&!tip.important||this.seen.has(id))return false;this.current=tip;this.seen.add(id);this.cooldown=12;this.remaining=7;this.living.runtime?.save?.request('tutorial');return true;}
  update(dt){
    const l=this.living,g=l.gameplay,p=this.player.physics;
    if(dt<=0||l.runtime?.options.settings.tutorials==='OFF'){if(this.element)this.element.hidden=true;return;}
    this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.remaining=Math.max(0,(this.remaining??0)-dt);if(!this.remaining)this.current=null;
    if(!this.cooldown&&!g.vehicles.driving&&!g.health.dead){const vigilante=g.mode==='VIGILANTE',o=l.content?.objective;
      const candidates=[['move',this.time>1],['sprint',this.time>12&&p.velocity.length()>2],['jump',this.time>22&&p.grounded],['mission',vigilante&&this.time>8&&!l.content.active],['interact',!!l.vertical.interaction?.current||o?.kind==='inspect'&&Math.hypot(l.camera.position.x-o.position[0],l.camera.position.y-o.position[1],l.camera.position.z-o.position[2])<5],['scanner',vigilante&&o?.kind==='scan'],['grapple',vigilante&&!!l.vertical.grapple.target],['glide',vigilante&&!p.grounded&&l.camera.position.y>9],['combat',vigilante&&g.enemies.enemies.some(e=>e.state!=='DISABLED'&&e.position.distanceTo(l.camera.position)<15)],['dodge',vigilante&&g.enemies.enemies.some(e=>e.state==='ALERT'&&e.position.distanceTo(l.camera.position)<9)]];
      for(const [id,useful] of candidates)if(useful&&this.show(id))break;
    }
    if(this.element){this.element.hidden=!this.current;if(this.current&&this.element.textContent!==this.current.text)this.element.textContent=this.current.text;}
  }
  dispose(){this.element?.remove();}
}
