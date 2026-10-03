# Playtest humain — V10 / 0.10.0

Cette liste reste **à exécuter par un joueur humain**. Les résultats des scripts sont dans VALIDATION.md ; ils ne cochent pas ces cases à la place d'une personne. Conserver seed 1989 et noter version, profil graphique, résolution, commandes, état de sauvegarde et temps réel.

## Classification et critères de sortie

Chaque problème doit avoir : identifiant, **BLOCKER / MAJOR / MINOR / POLISH**, reproduction, attendu, observé, mission/checkpoint, capture ou log, état et retest.

- BLOCKER : crash ; campagne impossible ; sauvegarde valide perdue sans récupération ; blocage définitif du joueur ; NIGHTRIDER obligatoire inaccessible ; erreur console répétée ; fuite mémoire claire et reproductible.
- MAJOR : objectif trompeur, récupération pénible, détection injuste, commande essentielle illisible, route difficile sans alternative compréhensible.
- MINOR : gêne locale contournable, texte imprécis, chevauchement d'interface ponctuel.
- POLISH : présentation, rythme, cadrage ou son perfectible.

La RC ne doit pas être publiée avec un BLOCKER ouvert. Un rapport automatisé vert est nécessaire, mais ne remplace pas la validation humaine des parcours et du confort.

## FIRST 10 MINUTES

- [ ] Nouvelle partie Vigilante sans README : comprendre l'enquête et ouvrir TAB.
- [ ] Identifier « Les heures effacées » et son premier accès ; comprendre la différence rue/toit/intérieur.
- [ ] Marcher, courir, sauter sans recevoir neuf commandes simultanément.
- [ ] Conseils une seule fois, rythme lisible, préférences ON/MINIMAL/OFF respectées.
- [ ] Premier scanner, interaction et ancrage compris ; aucun silence inexpliqué de l'objectif.
- [ ] Premier combat permissif ; repérer l'esquive et le repli/checkpoint.
- [ ] Mesurer délai avant première action intéressante et premier objectif accompli.

## MOVEMENT

- [ ] AZERTY et QWERTY : diagonales, sprint, saut, accroupissement, corniches.
- [ ] Escaliers, portes et ascenseurs, y compris en relâchant la souris et après reprise.
- [ ] Sortie du métro et passage à la rue sans blocage.
- [ ] Sauvegarder/reprendre pendant une transition puis vérifier la position sûre.

## GRAPPLE

- [ ] Tester les 30 ancrages du rapport traversal-check avec des approches réellement atteintes à pied.
- [ ] Old Gotham, Industrial, Docks, grue, Meridian : comprendre les points compatibles.
- [ ] Relais des Sept Nuits → Chantier : aucun accrochage des pieds à la corniche.
- [ ] Examiner le mouvement de dégagement vertical avant la traction lorsqu'une corniche l'impose.
- [ ] Annuler avec ESPACE puis reprendre ; aucune traversée de mur, câble ou plafond.
- [ ] Vérifier la sortie et l'atterrissage, pas seulement l'activation.

## GLIDE

- [ ] Grappin → planage ; toit → planage ; tour → planage ; grue → planage.
- [ ] Comprendre visuellement la perte d'altitude et la portée avant de sauter.
- [ ] Virages, maintien de vitesse, relâchement et atterrissage confortables.
- [ ] Aucune trajectoire obligatoire dépendant d'une précision excessive.

## COMBAT

- [ ] Mesurer temps de neutralisation et dégâts reçus aux missions 1, 3 et 7.
- [ ] Premier groupe : trois ennemis, coups à 6 dégâts et intervalle minimal 1,35 s ; derniers groupes : 8 et 1,1 s.
- [ ] Coups/esquives/neutralisation discrète : distance et feedback cohérents.
- [ ] Murs bloquent vision et coups ; suspicion non instantanée ; recherche s'éteint.
- [ ] Un ennemi bloqué passe en recherche au lieu de pousser éternellement dans un mur.
- [ ] NON REPÉRÉ / SOUPÇON / DÉTECTÉ compréhensibles sans couleur ni son seuls.

## MISSIONS

Pour chacune, noter durée réelle, approche, morts, checkpoints, distance, hésitations et longues traversées. Les distances de pacing-check sont des bornes géométriques, pas des distances réellement parcourues.

- [ ] 01 Les heures effacées : toit municipal, relevé, atelier, combat, radio.
- [ ] 02 Le programme de minuit : théâtre, hôtel, cour haute, bobine.
- [ ] 03 Livraison sans chaleur : fonderie, passerelle, soupapes et maintenance.
- [ ] 04 Le manifeste des Brumes : grue, récupération NIGHTRIDER, convoi, hangar ; surveiller le détour du garage.
- [ ] 05 Les hautes lignes : liaison Relais → Chantier, shunt, couronne Meridian.
- [ ] 06 Le dernier circuit : observation métro, station, collecteur, archives ; surveiller le rythme des inspections.
- [ ] 07 La ville témoigne : livraison, poursuite, sous-sol, ascenseur, combat et transmission.
- [ ] À chaque étape : texte précis, bon étage, entrée guidée, carte/minimap cohérentes.
- [ ] Échec : reprendre checkpoint, recommencer mission, quitter vers exploration libre.
- [ ] Rechargement entre deux missions et au milieu d'une poursuite ; récompenses uniques.
- [ ] Huit secondaires jouables et rejouables ; six upgrades sans doublon.
- [ ] Vingt archives, dix secrets et dix-huit lieux accessibles ; secrets non révélés prématurément.

## VEHICLE

- [ ] Accélération, freinage, marche arrière, braquage, caméra et boost sous pluie.
- [ ] Rues étroites et carrefours : pas de collision trompeuse.
- [ ] Voiture détruite loin du garage : récupération depuis pause, même instance.
- [ ] Cinq secondes d'accélération sans mouvement : proposition R, aucune téléportation automatique.
- [ ] R et récupération refusés en poursuite ou mission véhicule critique ; checkpoint disponible.
- [ ] Voyage rapide à pied, en voiture, intérieur, souterrain, pluie et après reload : aucun doublon.

## UI

- [ ] 1280×720, 1920×1080, 2560×1440 et 2560×1080, échelle 0,8 puis 1,3.
- [ ] HUD, radio, mini-carte, prompts, objectifs, pause, carte et journal restent lisibles ensemble.
- [ ] Aucun objectif à travers un mur ; indication ↑/↓ et accès d'entrée utiles.
- [ ] Les commandes sont visibles dans OPTIONS → COMMANDES ; contexte de V et ESPACE explicite.
- [ ] Navigation clavier/focus visible, scroll et fermeture TAB/Échap, reprise souris.
- [ ] Sauvegarde principale corrompue : reprise de la précédente et signalement compréhensible.
- [ ] Menu propre, crédits factuels et version discrète ; aucune commande de triche en production.

## AUDIO

- [ ] Radio toujours transcrite ; alerte et poursuite visibles volume à zéro.
- [ ] Volumes ambiance/effets séparés ; pas de crête désagréable ni audio pendant pause.
- [ ] Les communications ne masquent pas les indices nécessaires.

## ACCESSIBILITY

- [ ] Sous-titres SMALL/MEDIUM/LARGE et taille UI réellement appliqués.
- [ ] Contraste renforcé ; missions triangulaires et refuges carrés sur la carte.
- [ ] CAMERA MOTION = 0 : pas de bob, secousse d'impact, de dégâts ou de boost.
- [ ] REDUCE FLASHES : aucun flash d'orage, sirènes visuelles stables, scanner et dégâts atténués.
- [ ] Guidance OFF/MINIMAL/FULL, tutoriels OFF/MINIMAL/ON et Exploration sans ennemis imposés.

## PERFORMANCE

- [ ] Session humaine de 30 minutes puis deux heures : F3, ressources et sensation de fluidité.
- [ ] Comparer les mêmes lieux et météo en LOW/MEDIUM/HIGH/AUTO sur RTX 3070 à 1440×900.
- [ ] Relever FPS, 1 % low, frames >20/>33/>50 ms, pics de streaming et CPU.
- [ ] Détecter une tendance après retours au même point, pas seulement deux valeurs de heap.
- [ ] Vérifier console vide après campagne, plusieurs voyages, sauvegardes et reloads.

## Registre de retours

| ID | Sévérité | Reproduction / attendu / observé | État | Retest |
| --- | --- | --- | --- | --- |
| HUMAN-01 | MAJOR | Durée de campagne, confort des routes et onboarding à chronométrer humainement | À tester | Non exécuté |
| HUMAN-02 | MINOR | Mission 4 : juger le détour vers NIGHTRIDER ; mission 6 : variété des inspections | À tester | Non exécuté |
| HUMAN-03 | POLISH | Valider le confort de la levée du grappin avant franchissement des corniches | À tester | Non exécuté |

Ces lignes représentent des validations encore nécessaires, pas des défauts humains prétendument observés. Ajouter une ligne distincte pour chaque problème réellement reproduit.

| ID | Sévérité | Problème mesuré | État | Retest |
| --- | --- | --- | --- | --- |
| PERF-01 | MAJOR | Dernière session production : 57,07–57,28 FPS, cible HIGH/AUTO ≥59 non atteinte. V9 et page vide reproduisent la cadence ; cause Chrome/Windows exacte non isolée. | Ouvert pour validation sur cadence de référence stable | Comparatifs et contrôle page vide dans VALIDATION.md |
