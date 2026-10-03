import { FR } from '../localization/fr.js';
export function showFatal(cause,phase='Initialisation'){
  console.error('Fatal initialization:',phase,cause);document.querySelector('#loading-screen')?.remove();
  const panel=document.createElement('section');panel.id='fatal-screen';panel.setAttribute('role','alert');
  for(const text of [FR.fatal,`Phase : ${phase}`,'Le chargement 3D a été interrompu. Vous pouvez réessayer ; vos sauvegardes restent conservées.']){const p=document.createElement('p');p.textContent=text;panel.append(p);}
  const reload=document.createElement('button');reload.textContent=FR.reload;reload.onclick=()=>location.reload();panel.append(reload);document.body.append(panel);reload.focus();
}
