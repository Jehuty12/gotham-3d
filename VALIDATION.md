# Validation — Vertical City V4

## Résultats

- **53 tests Node réussis** : 30 régressions V2/V3 conservées et 23 tests V4.
- `npm run build` : succès, 62 modules, aucune erreur ni avertissement.
- Chrome développement et production : contrôles réussis, **zéro erreur et zéro avertissement** dans les deux rapports finaux.
- Identité conservée : seed 1989, 64 chunks, quatre quartiers, 210 bâtiments, trois monuments.
- Exploration générée : 53 toits sélectionnés, huit intérieurs, 25 escaliers de secours, deux escaliers de station et quatre zones souterraines connectées.
- Aucune dépendance ajoutée. Géométrie, signalétique et ambiance sonore produites localement.

## Mesures

Mesures du 24 septembre 2026 dans Chrome headless, fenêtre 1440 × 900, DPR 1. GPU : `ANGLE / Intel(R) Graphics (0x00007D45) / Direct3D11`. Chrome 154 sous Windows.

Chaque profil reçoit 1,5 seconde de chauffe puis environ six secondes de mesure sur la vue de départ, menu masqué, acteurs et météo actifs. Les rapports JSON donnent les résultats exacts de chaque exécution.

| Profil | FPS développement | FPS production | Draw calls moyens (les deux builds) | Triangles soumis par frame, environ |
| --- | ---: | ---: | ---: | ---: |
| LOW | 60,0 | 60,0 | 336 | 284 000 |
| MEDIUM | 60,0 | 59,8 | 584 | 502 000 |
| HIGH | 60,0 | 60,0 | 586 | 507 000 |

Les compteurs incluent les passes de post-traitement. Les triangles ne sont pas des triangles uniques visibles après occlusion. Le plafond observé de requestAnimationFrame est proche de 60 Hz : ces chiffres ne mesurent pas la marge GPU au-delà, ni les performances de toutes les scènes et de tous les appareils. À DPR 1, les plafonds DPR des profils ne changent pas la résolution physique.

Rapports : [développement](artifacts/benchmark-development.json), [production](artifacts/benchmark-production.json).
Captures : [extérieur](artifacts/vertical-city-production.png), [F3](artifacts/vertical-city-production-debug.png), [intérieur](artifacts/vertical-city-interior.png), [toit municipal](artifacts/vertical-city-rooftop.png), [souterrain](artifacts/vertical-city-underground.png).

Build : application ~107,6 kB, cœur Three.js ~217,1 kB, renderer ~352,4 kB, CSS ~9 kB avant gzip. Les dépendances sont séparées en bundles.

## Tests automatiques

### Node — 53 tests

Les 30 tests historiques couvrent notamment la génération des chunks indépendamment de l’ordre, les rues, collisions de façade, ZQSD/WASD, sprint, quartiers, monuments, fenêtres, pluie/vapeur, feux, circulation, piétons, métro, audio et ressources partagées.

Les 23 tests V4 couvrent :

1. Gravité, atterrissage et stabilité au sol.
2. Saut unique par pression, absence de saut infini, fréquences 30/60/120 Hz.
3. Accroupissement et refus de se relever sous un plafond.
4. Collision de plafond et atterrissage sur plateforme.
5. Bordures, franchissement bas et refus des murs hauts.
6. Déplacement identique entre fréquences de rendu.
7. Sélection locale des volumes par position et altitude.
8. 53 toits, huit intérieurs, six types et sélection déterministe.
9. Portes, verrouillage, animation et fermeture devant un occupant.
10. Portée, priorité et domaine des interactions.
11. Occlusion des interactions par un mur.
12. Ascenseur : portes, transport, étage, indépendance du rendu.
13. Chargement différé, cache de deux intérieurs, entrée/sortie et accès au toit.
14. Montée effective d’une volée sans saut.
15. Échelle dans les deux sens et retour à la physique normale.
16. Grappin désactivé par défaut et sélection des points compatibles.
17. Découvertes uniques tenant compte de l’altitude.
18. Réseau souterrain différé et connexion des corridors.
19. Routes verticales préservant les 64 chunks et axes routiers.
20. Quatre volées connectées par des paliers franchissables.
21. Dégagement du joueur à chaque sortie de toit sélectionnée.
22. Moyennes de triangles réinitialisées entre fenêtres de mesure.
23. Parcours complets, avec la vraie géométrie de la ville, du trottoir aux deux quais.

### Chrome — développement et production

Dans les deux builds : chargement, seed/chunks/bâtiments/monuments, Pointer Lock par clic, W/Z, sprint, rotation souris, saut, accroupissement, pause, mini-carte, réglages, pluie désactivée/réactivée, intensité, volume, audio, mouvement du train, trafic, budgets et F3. Les logs JavaScript/WebGL et avertissements sont collectés.

En développement : contrôle des quatre quartiers et d’une collision avec une façade. Le module courant est instrumenté par le script de test pour positionner le joueur au début des parcours ; aucune variable de test n’est intégrée au produit. Les actions utilisent ensuite les événements clavier réels et le raycast : ouverture de porte, entrée/sortie d’intérieur, ascenseur jusqu’au toit municipal, découverte, échelle, entrée/sortie souterraine et masquage des extérieurs.

En production : parcours jusqu’à la porte municipale depuis le départ, ouverture, entrée, demi-tour avec Pointer Lock et sortie, exclusivement par entrées clavier/souris et interface publique. Les parcours d’ascenseur/échelle ne sont pas rejoués automatiquement dans le bundle de production ; ils sont couverts en développement et par les tests Node.

Commandes utilisées :

```powershell
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5176 --strictPort
npm run preview -- --host 127.0.0.1 --port 4175 --strictPort
npm run test:browser -- http://127.0.0.1:5176/
npm run test:browser -- http://127.0.0.1:4175/ --production
```

Chrome nécessite un profil isolé lancé avec `--remote-debugging-port=9222`, comme décrit dans README.md.

## Contrôles visuels et vérifications humaines restantes

Les captures Chrome de l’extérieur, du hall et du souterrain ont été inspectées : scène nocturne, interface, éclairage, particules, pièces fermées et notification de découverte. Cette inspection d’images ne remplace pas une session de jeu humaine ni une écoute audio.

À vérifier manuellement pour l’ergonomie :

- Parcourir les 53 accès, notamment les escaliers les plus hauts et la passerelle entre voisins.
- Monter sur les deux quais, observer le train, tester les demi-tours et descentes.
- Tester tous les intérieurs, appels de cabine depuis chaque niveau et montées/descentes prolongées.
- Activer temporairement le grappin et évaluer la visée/traction, puis remettre `ENABLE_GRAPPLE = false`.
- Évaluer le son au casque, la vitesse d’ascension et le confort du franchissement.
- Mesurer une longue promenade dans chaque profil et sur des machines moins puissantes.

Aucune de ces sessions humaines prolongées n’est déclarée effectuée.

## Fichiers créés pour V4

- `src/player/PlayerPhysics.js`, `PlayerInteraction.js`, `GrappleSystem.js`.
- `src/interiors/InteriorGenerator.js`, `Interior.js`, `InteriorManager.js`.
- `src/world/CollisionWorld.js`, `VerticalRoutes.js`, `FireEscape.js`, `Ladder.js`, `Door.js`, `Elevator.js`, `Underground.js`, `NavigationSigns.js`.
- `src/systems/VerticalCity.js`, `VisibilityManager.js`, `DiscoverySystem.js`.
- `tests/vertical.test.js`.
- `scripts/vertical-browser-check.mjs`.
- Captures `artifacts/vertical-city-*.png`.

## Fichiers modifiés pour V4

- `src/main.js` : assemblage, mise à jour V4, mouvement de caméra au franchissement, compteurs de triangles.
- `src/player/PlayerController.js` : nouvelles touches et intégration physique.
- `src/world/Building.js`, `RoofDetails.js` : métadonnées de volumes et équipements solides.
- `src/systems/LivingCity.js` : raccordement V4 et diagnostics.
- `src/systems/SteamSystem.js` : sélection selon altitude et domaine souterrain.
- `src/systems/AudioManager.js` : adaptation de l’ambiance aux espaces fermés.
- `src/systems/PerformanceManager.js` : moyennes de triangles.
- `src/ui/Interface.js`, `Minimap.js`, `DebugPanel.js`, `src/style.css` : identité, commandes, interactions, découvertes et F3.
- `index.html`, `package.json`, `package-lock.json` : identité/version V4, sans dépendance supplémentaire.
- `scripts/browser-check.mjs` : contrôles V4, navigation production et mesures.
- `README.md`, `VALIDATION.md` et rapports `artifacts/benchmark-*.json`.

Les générateurs de quartiers, routes et monuments, le métro, le trafic et les profils restent en place. Aucun fichier historique de test n’a été supprimé.

## Choix techniques et limites

Index local d’AABB, physique à pas fixe, instancing par chunk, matériaux partagés, cache d’intérieurs borné, particules réutilisées, sélection à proximité et visibilité selon la zone. Aucune simulation physique lourde, aucun raycast sur tous les triangles de la ville.

Les intérieurs utilisent une transition explicite : pas de vue continue à travers une porte ouverte ; le chunk de façade est masqué pendant la visite. Les huit types sélectionnés utilisent une base de pièce/mezzanine commune avec mobilier simple. Les stations aériennes sont accessibles, le train ne s’arrête pas pour embarquer le joueur.

Les collisions sont conservatrices : certaines décorations fines sont ignorées, les pans de toit inclinés ne sont pas des rampes, les acteurs d’ambiance ne sont pas solides. Pas de nage ni de dégâts de chute. Le sommet Meridian est la terrasse praticable sous la flèche. La pluie n’est pas occultée individuellement sous chaque pont. Les découvertes ne sont pas sauvegardées.

Les 64 chunks restent en mémoire ; le masquage n’est pas du streaming. Le grappin est expérimental, borné et désactivé par défaut. Les performances ci-dessus proviennent d’une mesure courte, pas d’une garantie de 50/60 FPS dans toute la ville.
