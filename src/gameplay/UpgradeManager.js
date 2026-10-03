export const UPGRADES=Object.freeze([
  {id:'health',title:'Gilet de quart',description:'Santé maximale : 110.',cost:2},
  {id:'scanner-time',title:'Mémoire du scanner',description:'Impulsion du scanner : 5 secondes.',cost:1},
  {id:'scanner-range',title:'Antenne accordée',description:'Portée du scanner : 65 mètres.',cost:1},
  {id:'grapple',title:'Treuil révisé',description:'Recharge du grappin : 0,12 seconde.',cost:2},
  {id:'boost',title:'Récupération moteur',description:'Boost : consommation réduite de 24 à 20 unités/seconde.',cost:2},
  {id:'amber',title:'Signal ambre',description:'Accent ambre pour le journal, la radio et les objectifs V9.',cost:1},
]);
export class UpgradeManager {
  constructor(){this.owned=new Set();this.earned=0;}
  get points(){return Math.max(0,this.earned-UPGRADES.filter(u=>this.owned.has(u.id)).reduce((n,u)=>n+u.cost,0));}
  buy(id){const u=UPGRADES.find(u=>u.id===id);if(!u||this.owned.has(id)||this.points<u.cost)return false;this.owned.add(id);return true;}
  restore(ids=[],earned=0){this.owned.clear();this.earned=earned;for(const u of UPGRADES)if(ids.includes(u.id))this.buy(u.id);}
  apply(living){
    const g=living.gameplay;if(!g)return;
    g.health.max=this.owned.has('health')?110:100;g.health.hp=Math.min(g.health.hp,g.health.max);
    g.scanner.pulseDuration=this.owned.has('scanner-time')?5:4;g.scanner.range=this.owned.has('scanner-range')?65:55;
    living.vertical.grapple.recharge=this.owned.has('grapple')?.12:.18;
    if(g.vehicles)g.vehicles.vehicle.boostDrain=this.owned.has('boost')?20:24;
  }
}
