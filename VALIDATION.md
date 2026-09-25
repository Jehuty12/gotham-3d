# Validation — Vigilante Gameplay V5

## Résultats

- **77 tests Node réussis** : les 53 tests V2/V3/V4 conservés et 24 nouveaux tests V5. Aucun test ignoré.
- `npm run build` : succès, **78 modules**, aucune erreur ni avertissement. Application 135,63 kB (44,64 kB gzip), cœur Three.js 217,10 kB, renderer 352,33 kB, CSS 9,77 kB.
- Chrome développement et production : contrôles automatiques réussis, **zéro erreur et zéro avertissement** dans les rapports finaux.
- Seed 1989, quatre quartiers, 64 chunks, 210 bâtiments, trois landmarks conservés. 53 toits accessibles, huit intérieurs, 25 escaliers de secours et deux escaliers de station, quatre zones souterraines.
- Trafic, pluie/vapeur, piétons, métro, portes, ascenseurs, échelles, découvertes, mini-carte et profils conservés.
- Aucune dépendance ajoutée et aucun asset téléchargé. Le gameplay utilise les géométries et matériaux partagés existants.

## Mesures

Mesures du 25 septembre 2026, Chrome headless 154 sous Windows, **1440 × 900, DPR 1**, GPU `ANGLE / Intel(R) Graphics (0x00007D45) / Direct3D11`.

Chaque profil reçoit 1,5 seconde de chauffe puis environ six secondes de mesure. Le mode **VIGILANTE est actif avec Pointer Lock**, joueur au point de départ, regard vers l’est (yaw −1,5 rad), météo, trafic, piétons et IA actifs. La vue diffère du benchmark V4 ; les nombres de primitives ne sont donc pas directement comparables à ceux de V4.

| Profil | FPS production | Draw calls moyens | Triangles/frame, environ | CPU IA ms/tick | IA complexes mesurées |
| --- | ---: | ---: | ---: | ---: | ---: |
| LOW | 60,0 | 307 | 190 315 | 0,027 | 3 |
| MEDIUM | 60,0 | 410 | 279 907 | 0,051 | 8 |
| HIGH | 60,0 | 414 | 285 239 | 0,051 | 18 |

Le développement est également proche de 60 FPS dans les trois profils. Les résultats précis sont dans les rapports [développement](artifacts/benchmark-development.json) et [production](artifacts/benchmark-production.json).

Le coût CPU IA est la moyenne échantillonnée du temps lissé de `EnemyManager.update`, par **tick de 30 Hz**, et non le coût total du gameplay ou d’une frame. Les compteurs GPU incluent les passes de post-traitement ; les triangles soumis ne sont pas des triangles uniques après occlusion. La limite observée de requestAnimationFrame est de 60 Hz. Ces mesures courtes ne garantissent pas 50/60 FPS dans tous les quartiers, en combat dense, à haute résolution ou sur d’autres appareils.

Captures : [scène et F3 production](artifacts/vertical-city-production-debug.png), [HUD gameplay](artifacts/vigilante-production-gameplay.png), [intérieur](artifacts/vertical-city-interior.png), [toit](artifacts/vertical-city-rooftop.png), [souterrain](artifacts/vertical-city-underground.png). Les noms historiques `vertical-city-*` sont conservés par le script de régression.

## Tests Node

Les **53 tests historiques** sont inchangés : génération indépendante par chunk, seeds, quartiers, monuments, rues et collisions, ZQSD/WASD, sprint, fenêtres, matériaux partagés, pluie/vapeur, circulation/feux, piétons, métro, audio, physique verticale, saut, plafond, accroupissement, franchissement, portes, ascenseurs, intérieurs, échelles, souterrains, découvertes et navigation des deux quais.

Les **24 tests V5** de `tests/gameplay.test.js` couvrent :

1. Sélection des points de grappin marqués et limite de portée.
2. Traction et élan après lâcher identiques à 30/60/120 FPS.
3. Occlusion de cible et obstacle apparu pendant la traction.
4. Annulation, vitesse bornée et recharge du grappin.
5. Descente ralentie, avance et sortie du planage.
6. Planage interdit au sol, en intérieur et sur échelle.
7. Trajectoire planée indépendante de la fréquence de rendu.
8. Limites horizontales et verticales du momentum.
9. Esquive : durée, distance, recharge et mur.
10. Sites criminels déterministes, chunks et approches alternatives.
11. Distance de spawn, budgets et recyclage des événements terminés.
12. Activation exclusive et objectifs rejoindre/toit/inspection/intérieur.
13. Observation soutenue et neutralisation d’un groupe réel.
14. Échec des missions après expiration ou retrait de l’événement.
15. Vision : distance, angle, hauteur, mur et pluie.
16. États ennemis : suspicion, alerte, recherche, retour, désactivation.
17. Bruits bornés, expiration, distance et effet limité de la pluie.
18. Audition provoquant une suspicion sans alerte immédiate.
19. Neutralisation : distance courte, approche arrière, ennemi non alerté.
20. Combat : trois impacts, cooldown et portée.
21. Santé bornée, copie du checkpoint et réapparition unique après délai.
22. Scanner : durée, portée, recharge et désactivation.
23. Répartition de la perception, deux rayons maximum par tick et budget IA.
24. Passage Exploration/Vigilante, nettoyage du gameplay et maintien des chunks.

## Contrôle Chrome automatisé

`scripts/browser-check.mjs` utilise le protocole DevTools natif, sans bibliothèque supplémentaire. Il conserve les contrôles précédents et appelle `scripts/gameplay-browser-check.mjs`.

**Dans les deux builds** : chargement, seed/chunks/bâtiments/landmarks, Pointer Lock, W/Z, sprint, rotation souris, saut, accroupissement, pause, mini-carte, qualité, pluie et intensité, volume/audio, train, trafic, F3, changement Exploration/Vigilante, absence d’ennemis/crimes en Exploration, apparition et activation d’une mission, scanner et HUD. Les logs JavaScript/WebGL et avertissements sont collectés.

**En développement** : quatre quartiers, collision de façade, ouverture/entrée/sortie d’intérieur, ascenseur jusqu’au toit municipal, découverte, échelle, souterrain et masquage des extérieurs. Le script instrumente temporairement le module chargé pour préparer des positions de test ; les actions suivantes utilisent les véritables commandes et systèmes. V5 ajoute un ennemi du pool placé pour vérifier E, la neutralisation, des dégâts réellement infligés par l’IA, puis un dégât de fixture pour déclencher zéro PV/réapparition. Un point de grappin de la ville permet de vérifier G, annulation Espace, impulsion, planage et relâchement. Aucun accès de test n’est livré dans le produit.

**En production** : en plus des contrôles communs, parcours depuis le départ jusqu’à la porte municipale, ouverture, entrée, demi-tour et sortie exclusivement au clavier/souris et par l’interface publique. Les fixtures internes de grappin/ennemi/ascenseur ne sont pas rejouées dans le bundle compilé ; leurs cas sont couverts en développement et par Node. Les tests ne prétendent pas vérifier humainement le confort du vol ou le combat.

Commandes utilisées, dans des terminaux séparés pour les serveurs :

```powershell
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5177 --strictPort
npm run preview -- --host 127.0.0.1 --port 4177 --strictPort
npm run test:browser -- http://127.0.0.1:5177/
npm run test:browser -- http://127.0.0.1:4177/ --production
```

Chrome doit utiliser un profil isolé et `--remote-debugging-port=9222`, selon la commande du README. Ne pas employer le profil Chrome personnel.

## Procédure manuelle complémentaire

Cette procédure reste à effectuer par un joueur ; les captures inspectées et l’automatisation ne remplacent pas cette session.

1. Ouvrir la production, choisir EXPLORATION : marcher, sprinter, sauter, se baisser, changer de quartier. Vérifier pluie, train, circulation, mini-carte et F3. Visiter portes, ascenseur, échelle, toits et souterrain.
2. Échap, choisir VIGILANTE : M accepte l’objectif affiché. Suivre distance et symbole de mini-carte. Les ennemis ne doivent apparaître sur la carte que pendant le scanner V ; attendre son expiration et sa recharge.
3. Viser une corniche ou un toit proche jusqu’au marqueur vert / `[G] Point d’accroche`. G tire progressivement ; G annule. Refaire puis maintenir Espace : impulsion, chute et planage ; relâcher pour tomber normalement. Essayer contre un mur, hors portée, depuis une échelle et à l’intérieur : aucun passage à travers les volumes solides.
4. Contourner un garde derrière un obstacle, s’accroupir et approcher par derrière jusqu’à `[E] Neutraliser`. Vérifier que E échoue loin de lui ou lorsqu’il est alerté. S’exposer à son regard, se cacher et observer suspicion/alerte/recherche dans F3.
5. Attaquer de près au clic gauche : trois impacts espacés, léger recul et réticule. Alt + direction esquive ; Maj reste le sprint. Tester l’esquive contre une façade.
6. Se laisser toucher : PV diminuent, puis écran assombri et retour au point sûr à 100 PV. Atteindre un checkpoint de toit hors combat, puis vérifier que la prochaine réapparition utilise ce point.
7. Terminer plusieurs objectifs : neutraliser, inspecter avec E, regarder la cible pendant deux secondes, rejoindre un toit ou entrer dans l’intérieur indiqué. Vérifier la notification, l’expiration et le recyclage. Changer de profil pendant une mission.
8. Repasser en EXPLORATION : aucun ennemi, marqueur de crime ou mission actif ; la ville et les découvertes restent présentes.
9. Faire une promenade longue dans chaque profil, notamment toits très hauts, docks et rues denses. Vérifier confort de visée, son au casque et absence d’accumulation mémoire. Les performances sur d’autres GPU restent à mesurer.

## Fichiers créés pour V5

- `src/player/GlideSystem.js`
- `src/player/Momentum.js`
- `src/player/PlayerTraversal.js`
- `src/player/PlayerHealth.js`
- `src/gameplay/CrimeSystem.js`
- `src/gameplay/MissionManager.js`
- `src/gameplay/NoiseSystem.js`
- `src/gameplay/CombatSystem.js`
- `src/gameplay/ScannerSystem.js`
- `src/gameplay/WorldMarkers.js`
- `src/gameplay/GameDirector.js`
- `src/ai/Enemy.js`
- `src/ai/EnemyManager.js`
- `src/ai/EnemyPerception.js`
- `src/ui/MissionHUD.js`
- `src/utils/spatialQueries.js`
- `tests/gameplay.test.js`
- `scripts/gameplay-browser-check.mjs`
- Captures `artifacts/vigilante-*.png`.

## Fichiers modifiés pour V5

- `src/player/GrappleSystem.js` : visée, traction à pas fixe, collisions et élan.
- `src/player/PlayerPhysics.js` : coordination du déplacement spécial et gel à zéro PV.
- `src/player/PlayerController.js` : commandes supplémentaires.
- `src/main.js` : assemblage et appel de GameDirector.
- `src/systems/LivingCity.js` : diagnostics et nettoyage gameplay.
- `src/ui/Interface.js` : identité et sélection des deux modes.
- `src/ui/Minimap.js` : événements, objectif, zone, altitude et ennemis scannés.
- `src/ui/DebugPanel.js` : statistiques V5 en plus des statistiques existantes.
- `src/style.css` : mode, HUD, dégâts et réticule.
- `index.html`, `package.json`, `package-lock.json` : identité/version V5.
- `scripts/browser-check.mjs` : orchestration V5 et mesures IA en Vigilante.
- `README.md`, `VALIDATION.md` : fonctionnement, architecture, commandes et résultats.
- `artifacts/benchmark-development.json`, `artifacts/benchmark-production.json`, captures de régression `artifacts/vertical-city-*.png`.

## Optimisations et limites

Physique à pas fixe, index local d’AABB partagé, collisions balayées du grappin, IA à 30 Hz avec distance/angle de caméra, perception répartie à deux échantillons par tick, au plus une ligne de vue d’attaque IA par tick, pools bornés, rendu des ennemis en deux lots instanciés, marqueurs instanciés sans nouvelles lumières, matériaux/géométries réutilisés. Les optimisations V3/V4 restent actives : météo locale, trafic/piétons recyclés, culling des chunks, intérieurs différés et cache borné à deux pièces.

L’IA est un prototype local : déplacement au sol avec évitement des solides, sans navmesh ou recherche de chemin globale. Les ennemis éloignés sont suspendus ; ils ne poursuivent pas dans les intérieurs, échelles ou ascenseurs. Certains événements proposent plusieurs accès existants, sans génération de conduits nouveaux. Vols/cambriolages restent des situations abstraites représentées par des silhouettes et objectifs.

Les intérieurs gardent la transition explicite V4 et le masquage du chunk de façade ; pas de vue continue par les portes. Pas d’embarquement métro, de nage, de dégâts de chute, de collisions solides avec les voitures/piétons, de sauvegarde disque ou de streaming réel : 64 chunks restent en mémoire. Les détails fins du décor ne sont pas tous solides. Les marqueurs respectent le test de profondeur ; le scanner n’est pas une vision à travers toutes les façades. Les collisions locales sont conservatrices et la validation ergonomique prolongée du grappin/planage reste manuelle.
