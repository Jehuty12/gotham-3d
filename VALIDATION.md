# Validation — Playtest & Release Candidate V10

Version **0.10.0**, schéma **SAVE_VERSION = 2**, validation du **3 octobre 2026**. Les heures UTC exactes figurent dans les rapports liés. Aucun build n'a été publié.

## État de la release candidate

**210 tests passent : 185 tests historiques V2–V9 conservés, 25 tests V10.** Aucun ignoré. [Résultat Node](artifacts/tests-v10.txt).

**Campagne validée 7/7**, trois approches par mission, soit 21 parcours. Chaque objectif passe par les actions du runtime, avec sauvegarde/rechargement à chaque checkpoint et entre missions. Les déplacements, la distance de suivi du convoi et la dissimulation en poursuite utilisent des fixtures ; les scripts ne prétendent pas être un joueur humain. Ils n'appellent pas `ContentManager.advance()` pour valider directement les objectifs du parcours. [Rapport campagne](artifacts/campaign-check.json).

| Mission | Résultat | Approches |
| --- | --- | --- |
| 1 — Les heures effacées | PASS | RUE / TOIT / INTÉRIEUR |
| 2 — Le programme de minuit | PASS | RUE / TOIT / INTÉRIEUR |
| 3 — Livraison sans chaleur | PASS | RUE / TOIT / INTÉRIEUR |
| 4 — Le manifeste des Brumes | PASS | RUE / TOIT / INTÉRIEUR |
| 5 — Les hautes lignes | PASS | RUE / TOIT / INTÉRIEUR |
| 6 — Le dernier circuit | PASS | RUE / TOIT / INTÉRIEUR |
| 7 — La ville témoigne | PASS | RUE / TOIT / INTÉRIEUR |

Contenu conservé : **CITY_SEED = 1989, 64 chunks, quatre quartiers, sept missions principales, huit secondaires, vingt collectibles, dix secrets, six upgrades, dix-huit lieux**. Exploration/Vigilante, streaming, sauvegarde V2, TAB/journal, voyage rapide, combat, véhicules, grappin/planage, météo et art V8 restent présents. Aucun nouveau quartier, véhicule, moteur physique ou système d'IA majeur.

## Vérifications

- **Build réussi**, 141 modules, sans erreur ni avertissement. Application 299,31 kB / 99,05 kB gzip ; CSS 15,83 / 4,52 kB ; Three core 220,25 / 58,12 kB ; renderer 352,36 / 84,71 kB. [Build](artifacts/build-v10.txt).
- **Chrome développement et production** : suites historiques, contenu V9 et mesures de performances. [Développement](artifacts/benchmark-development.json), [production](artifacts/benchmark-production.json).
- **Contrôles RC navigateur** : carte/journal en 1280×720, 1920×1080, 2560×1440 et 2560×1080, échelle 1,3 ; commandes ; options accessibles ; backup corrompu/reprise ; récupération voiture ; commandes de développement absentes de la production. Le contrôle développement vérifie aussi la présence des trois choix d'échec et exécute le retour à l'exploration libre ; les deux redémarrages sont exercés dans les tests runtime. [RC développement](artifacts/release-browser-development.json), [RC production](artifacts/release-browser-production.json).
- **Content-check** : 102 étapes/access points, positions, sols/capsules, domaines, identifiants, routes, streaming, prérequis. [Contenu](artifacts/content-check.json).
- **Traversal-check** : trente ancrages dans quatre quartiers, dont Meridian et grue ; quatre scénarios de planage ; vingt-neuf mouvements complets d'échelle ; graphe de cinquante-trois toits, aucune destination de ce graphe isolée. [Traversée](artifacts/traversal-check.json).
- **Visual-check** : quinze caméras fixes dans `artifacts/visual-v10`, dont les cinq lieux V9. Les références `artifacts/visual` et `artifacts/visual-v9` restent conservées. [Captures et métriques](artifacts/visual-v10/metrics.json). Aucune comparaison perceptuelle automatique.
- **Soak long réussi** : **307,124 secondes**, trente cycles, 150 échantillons de parcours, 90 d'art et 91 de contenu ; déplacements, grappin, planage, conduite réelle, combat, voyages rapides, intérieurs, souterrains, météo, missions, pause et reload. [Soak](artifacts/soak-development.json).

Les rapports de passage vérifient des listes d'erreurs et d'avertissements console vides. Les erreurs volontairement injectées dans les tests unitaires de corruption ou chargement sont capturées et vérifiées séparément.

## Corrections issues des contrôles

Le parcours complet a reproduit une collision des pieds au dernier bord de la liaison Relais → Chantier alors que le rayon du grappin était libre. La cible d'arrivée garde désormais une marge verticale de 0,85 m. Si une corniche bloque la traction directe, un dégagement vertical est choisi uniquement si les deux segments laissent passer la capsule ; toutes les étapes restent balayées contre les obstacles vivants. Les ancrages de sections dont l'arrivée est occupée par des escaliers ou des volumes ne sont plus proposés.

Une demande de capture souris refusée par Chrome conserve maintenant la partie préparée en PAUSE et le bouton REPRENDRE ; elle ne relance pas une nouvelle partie. Le soak vérifie PLAYING à chaque reprise. Les erreurs de démarrage ont un écran explicite avec phase et rechargement. Un échec de chunk conserve les collisions, interrompt la session et évite une boucle de nouvelles tentatives ; un intérieur indisponible laisse le joueur dehors et n'est pas reconstruit sans fin.

Les échecs narratifs préparent le checkpoint et présentent reprise, redémarrage ou retour à l'exploration libre. La récupération de NIGHTRIDER réutilise la même instance, vérifie les volumes et interdit les poursuites/étapes véhicule critiques. Le repositionnement R exige cinq secondes d'immobilisation sous accélération et une action du joueur.

## Performances et profilage CPU

Machine : **RTX 3070, Windows, Chrome headless 154, ANGLE D3D11, 1440×900, DPR 1**. Fenêtres d'environ six secondes après chauffe. FPS, 1 % low et spikes mesurés dans la même fenêtre ; le 1 % low est le réciproque de la moyenne des 1 % de frames les plus lentes.

Dernier passage production, **15:20 UTC** :

| Profil | FPS moyen | 1 % low | Frame moyenne | >20 / >33 / >50 ms | Draw calls | Triangles/frame |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| LOW | 57,14 | 55,10 | 17,50 ms | 0 / 0 / 0 | 251 | 74 248 |
| MEDIUM | 57,07 | 54,79 | 17,52 ms | 0 / 0 / 0 | 283 | 80 544 |
| HIGH | 57,14 | 55,25 | 17,50 ms | 0 / 0 / 0 | 385 | 121 901 |
| AUTO | 57,28 | 55,10 | 17,46 ms | 0 / 0 / 0 | 385 | 121 890 |

En conduite/poursuite : LOW **57,16 FPS / 55,17 low / 320 calls / 222 370 triangles**, MEDIUM **57,13 / 54,95 / 345 / 241 057**, HIGH **57,14 / 55,10 / 489 / 387 393**. Aucun dépassement de 20 ms sur ces trois fenêtres. Développement à pied : **57,07–57,28 FPS**, 1 % low **54,95 FPS**. Ces derniers résultats ne valident pas la cible HIGH/AUTO ≥59 FPS de manière stable.

Les draw calls sont la moyenne des compteurs F3 échantillonnés. Les triangles à pied sont le dernier agrégat F3 de la fenêtre ; ceux de conduite sont moyennés. F3 affiche également les statistiques des 600 dernières frames, pouvant inclure chargements et changements de qualité. Les résultats courts sur vue fixe ne garantissent pas tous les lieux, toutes les machines ou une session de plusieurs heures.

**Comparaisons A/B V9/V10** : le bundle production V9 a été conservé avant le premier build V10. Trois fenêtres de chaque version sont alternées, même caméra de départ, HIGH et Exploration, profileur CPU activé pour les deux. Premier passage : V9 **60,01–60,02 FPS**, V10 **60,02 FPS**. [Premier comparatif, 08:43 UTC](artifacts/performance-ab-first.json). Après reproduction des 57 FPS : V9 **56,78–56,91 FPS**, V10 **56,68–56,90 FPS**. [Dernier comparatif et échantillons CPU, 15:23 UTC](artifacts/performance-ab.json).

Un contrôle sans aucun code du jeu, sans WebGL et sans profileur mesure ensuite **56,95 et 57,00 FPS sur page vide**, et **56,91 FPS sur un simple canvas 2D animé**. Les intervalles réels `performance.now()` confirment les timestamps `requestAnimationFrame` ; le document est visible. [Contrôle de cadence Chrome](artifacts/cadence-check.json). La cadence basse de cette session existe donc indépendamment de ContentManager et du rendu 3D. Le réglage ou mécanisme Chrome/Windows qui la provoque n'est pas isolé ; l'origine de l'ancien relevé V9 ne peut pas être rétroactivement prouvée.

Sur les trois derniers relevés V10, CONTENT coûte **0,003–0,012 ms**, UPDATE **1,02–1,17 ms**, RENDER **2,35–2,68 ms** de CPU. Les profils CPU sont dominés par l'attente entre frames ; les échantillons actifs concernent notamment update, matrices et soumission du rendu. Ces observations ne justifient ni une dégradation des visuels, ni un gain garanti de trois FPS attribué aux modifications UI. La vérification ≥59 FPS reste ouverte sur une session Chrome avec une cadence de référence stable.

Une dépense évitable a néanmoins été identifiée dans `ContentUI` : réécriture des textes, accents et projections à chaque frame. Les textes sont maintenant écrits seulement lorsqu'ils changent, le journal/canvas se met à jour lors des événements et les projections/contextes à 10 Hz. Aucun matériau ou niveau visuel V8 n'a été réduit. F3 mesure UPDATE, RENDER, STREAMING, CONTENT, MISSION, HUD, MARKERS et MAP ; IA et véhicules gardent leurs compteurs. Les moyennes exponentielles CPU se chevauchent : CONTENT inclut HUD/MISSION, UPDATE inclut ces sous-systèmes. Ce ne sont pas des durées GPU.

## Mémoire et tendance sur cinq minutes

Au cycle 2 après chauffe et au dernier retour au même point :

| Ressource | Après chauffe | Fin |
| --- | ---: | ---: |
| Géométries GPU | 23 | 23 |
| Textures GPU | 47 | 47 |
| Programmes | 159 | 159 |
| Objets de scène | 1 090 | 1 090 |
| Instances décoratives V8 résidentes | 24 252 | 24 252 |
| Chunks | 36 | 36 |
| Heap JS (MiB) | 48,42 | 54,95 |
| Listeners gérés par le runtime | 16 | 16 |

Sur les trente points comparables, heap **min 41,57 / max 79,36 MiB**. Les minima redescendent encore aux cycles 16, 20 et 22 ; on n'observe pas une croissance monotone à chaque reload de chunk. Le heap n'est pas constant et ce résultat ne prouve pas une absence de fuite sur plusieurs heures.

Les compteurs CDP DOM varient avec la collecte : 56–60 listeners, retours répétés à 56 ; 859–2 013 nœuds, dernier relevé 886 ; un document après stabilisation, davantage brièvement autour des navigations. Les seize listeners gérés par WorldRuntime ne sont pas un recensement de tous les abonnements de l'application. Les capacités des pools sont vérifiées à chaque cycle.

Résidence moyenne **30,13 / 64 chunks**. Pic de streaming échantillonné **3,8 ms**, au-dessus du budget souple de 2 ms. Plus grand maximum de frame récent parmi les échantillons de parcours : **21 ms**. Le rapport contient tous les points, pas seulement les bornes. Aucun accroissement des compteurs GPU/objets après retour à la résidence de référence.

## Sauvegarde et robustesse

Schéma V2 maintenu, migration V1 conservée. Clefs : `world-polish:save` et `world-polish:save:backup`. Avant une écriture valide, l'ancienne principale valide devient le backup ; une principale corrompue ne remplace jamais un backup valide. Si la principale ne se lit pas, le backup est essayé et une notification accompagne la reprise. Une erreur de quota pendant la copie du backup laisse la principale intacte.

Le stress de **100 cycles save/load** compare mission/checkpoint, upgrade effectivement acquis, archive, secret, véhicule, position, options et tutoriels, en ignorant seulement l'horodatage. JSON invalide, version inconnue, NaN, positions hors monde, mission inconnue et upgrade invalide sont couverts. Les doublons de récompense et d'upgrade sont refusés. Nouvelle partie efface les deux générations et les conseils vus, conserve les options.

## Rythme, variété et équilibre

[Audit des quinze missions](artifacts/pacing-check.json). Distances principales en ligne droite, incluant l'altitude :

| Mission | Distance minimale | Objectifs avec accès | Combats | Observation/scanner |
| --- | ---: | ---: | ---: | ---: |
| 1 | 158 m | 7 | 1 | 10 s |
| 2 | 392 m | 7 | 0 | 12 s |
| 3 | 291 m | 8 | 1 | 2 s |
| 4 | 760 m | 8 | 0 | 2 s |
| 5 | 284 m | 8 | 0 | 4 s |
| 6 | 523 m | 7 | 0 | 12 s |
| 7 | 316 m | 10 | 1 | 0 s |

La mission 4 est la plus dispersée, notamment à cause du retour vers NIGHTRIDER ; la mission 6 demande une attention particulière à la variété des inspections. Les missions successives alternent enquête/rencontre, ruelles/toiture, industrie/souterrain, conduite/convoi, traversée verticale, métro/archives puis combinaison finale. Les checkpoints suivent les preuves et objectifs validés ; une reprise ne répète pas les séquences déjà acquises. Les petites étapes adjacentes peuvent donc créer des checkpoints rapprochés, sans animation d'attente supplémentaire.

Les timings de combat sont des bornes mécaniques : trois coups de résistance, frappe toutes les 0,4 s, soit 0,8 s au minimum entre premier et dernier coup réussi ; esquive 0,18 s / recharge 0,85 s. Trois ennemis par rencontre. Mission 1 : dégâts 6 et intervalle 1,35 s ; ensuite 8 et 1,1 s. Vision/coups bloqués par murs, suspicion progressive, retour de recherche et récupération d'un ennemi bloqué sont testés. Ce ne sont pas des temps moyens humains de neutralisation.

[Mesures de conduite sur route humide](artifacts/handling-check.json) : 0→15 m/s en 1,50 s ; frein à main depuis 15 m/s, 1,47 s / 9,53 m ; après une seconde, 14,5 m/s avec boost contre 10 sans ; rayon de virage estimé sur un arc de 0,5 s : 15,61 m. Simulation physique à 120 Hz, sans trafic ; conduite, collisions et poursuites avec trafic également couvertes dans Chrome.

## Accueil, accessibilité et préparation

Tutoriels contextuels ON/MINIMAL/OFF, un conseil à la fois et une seule fois par sauvegarde. Marche/sprint/saut, interaction, campagne, scanner, grappin, planage, combat/esquive apparaissent selon contexte. Exploration ne propose pas de tutoriel de combat. Le HUD narratif ne cohabite plus avec une invitation contradictoire à accepter une mission locale.

COMMANDES utilise `InputBindings.js`, avec actions communes clavier/souris et contextes distincts. Aucun remapping complet ou gamepad n'est revendiqué. V et ESPACE sont explicitement contextuels. Radio toujours textuelle, SMALL/MEDIUM/LARGE, UI scale étendu, contraste et formes distinctes sur la carte. Les marqueurs masquent les projections occultées et indiquent altitude/entrée. CAMERA MOTION = 0 supprime les effets décoratifs ; REDUCE FLASHES atténue dégâts/scanner et retire les éclairs/sirènes clignotantes.

Version centralisée dans `src/config/version.js`, textes communs dans `src/localization/fr.js`. Les textes d'histoire restent dans leurs catalogues. Menu et crédits factuels. Commandes `cityDebug` réservées au développement et absentes du bundle production : finir mission, téléporter vers lieu, récupérer véhicule, restaurer santé, effacer sauvegarde.

## Release blockers et limites

**Aucun BLOCKER technique reproduit n'est laissé ouvert dans les scénarios validés. La validation humaine reste à effectuer avant publication.** [PLAYTEST.md](PLAYTEST.md) contient les cases non cochées et les sévérités BLOCKER / MAJOR / MINOR / POLISH.

- Les objectifs de durée 60–90 minutes de campagne et 5–10 minutes par secondaire ne sont pas certifiés. Le confort, la lisibilité et l'équilibrage demandent une partie humaine complète, notamment missions 4 et 6.
- Les origines de test du grappin sont des fixtures aériennes. Les liens jump/glide du graphe sont des bornes géométriques conservatrices ; le contrôle ne prouve pas toutes les trajectoires humaines. Les accès d'échelle et la liaison narrative Relais → Chantier sont exécutés réellement.
- Les contrôles de safe areas vérifient les rectangles et options ; toutes les combinaisons simultanées de HUD, radio, combat et traduction future ne sont pas couvertes. L'ergonomie clavier complète et le confort visuel nécessitent le playtest.
- Le soak dure cinq minutes, pas plusieurs heures. Pas de garantie de performances universelle ni de comparaison perceptuelle automatique. La dernière validation plafonne autour de 57 FPS ; la page vide reproduit cette cadence, mais sa cause Chrome/Windows exacte reste à isoler. La cible HIGH/AUTO ≥59 FPS reste non validée de façon stable.
- Un secteur dont la construction échoue nécessite un retour menu/reload ; aucune réparation automatique de géométrie corrompue n'est prétendue. Les logs techniques complets restent dans la console, accompagnés d'un message utilisable.

La RC échoue si un crash, une mission principale impossible, une perte de sauvegarde, un blocage permanent, une voiture obligatoire inaccessible, une erreur console répétée ou une fuite claire est reproduit.

## Reproduction

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:content
npm.cmd run test:campaign
npm.cmd run test:traversal
npm.cmd run test:pacing
node scripts/handling-check.mjs
```

Vite sur 5177, preview sur 4177, Chrome CDP sur 9222 avec profil de test isolé. Exécuter les suites navigateur successivement :

```powershell
node scripts/browser-check.mjs http://127.0.0.1:5177/
node scripts/browser-check.mjs http://127.0.0.1:4177/ --production
node scripts/release-browser-check.mjs http://127.0.0.1:5177/
node scripts/release-browser-check.mjs http://127.0.0.1:4177/ --production
node scripts/visual-check.mjs http://127.0.0.1:5177/
node scripts/soak-test.mjs http://127.0.0.1:5177/
```

Le comparatif A/B exige aussi le build V9 conservé séparément et servi sur 4199 : `node scripts/performance-check.mjs http://127.0.0.1:4199/ http://127.0.0.1:4177/`. Le bundle temporaire est dans `node_modules/.cache/v9-baseline`, hors sources et publication.

`node scripts/cadence-check.mjs` mesure ensuite une page vide et un canvas 2D dans la même session Chrome. Aucun réglage de synchronisation ou de limitation CPU n'est modifié pour améliorer artificiellement les résultats.
