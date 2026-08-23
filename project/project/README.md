# Stone Realm — Prototype 3D Interactif (V1)

Prototype jouable en troisième personne, en JavaScript + Three.js, jouable au clavier/souris **et** au tactile (mobile). Le joueur explore une petite zone, ramasse des pierres et les lance selon une trajectoire physique (gravité + parabole).

Aucun backend. Site 100% statique — déployable directement sur GitHub Pages / Render.

---

## 🚀 Lancer en local

Aucune installation ni build n'est nécessaire (pas de bundler, ES modules natifs + import map vers le CDN unpkg pour Three.js).

```bash
# Option 1 — via npm (utilise `serve` en one-shot, rien à installer globalement)
npm start

# Option 2 — Python
python3 -m http.server 5173

# Option 3 — n'importe quel serveur statique
npx serve .
```

Puis ouvrir : http://localhost:5173

> ⚠️ Ouvrir directement `index.html` avec `file://` ne fonctionnera pas à cause des règles CORS sur les modules ES. Il faut un vrai serveur local (même très simple).

---

## 🎮 Contrôles

### PC
| Touche | Action |
|---|---|
| Z/W, S, Q/A, D (ou flèches) | Se déplacer |
| SHIFT | Courir |
| ESPACE | Sauter |
| E | Ramasser une pierre à proximité |
| Souris (clic + glisser) | Orienter la caméra |
| Clic gauche | Lancer la pierre sélectionnée |
| 1–5 | Sélectionner un slot d'inventaire |
| I | Ouvrir/fermer l'inventaire |

### Mobile
- **Joystick virtuel** (bas-gauche) : déplacement
- **Glisser sur l'écran** (zone droite) : caméra
- **🦘** Sauter · **🪨** Ramasser · **🎯** Lancer · **RUN** Courir (maintenir)
- Double-tap sur la hotbar : ouvrir l'inventaire

---

## 🧱 Architecture

```
index.html            → page + import map (Three.js via CDN, aucun build)
styles/main.css        → UI (HUD, hotbar, contrôles tactiles, glassmorphism)
src/
  main.js              → boucle de jeu, câblage de tous les modules
  scene.js             → renderer, scène, sol
  camera.js            → caméra troisième personne (suivi + lissage)
  lighting.js          → soleil (directionnel) + lumière ambiante
  environment/
    Environment.js     → arbres et rochers décoratifs (procéduraux)
  character/
    Character.js           → mesh du personnage procédural (primitives + pivot de colonne vertébrale)
    CharacterLoader.js      → tente de charger un vrai .glb riggé, sinon retombe sur Character.js
    CharacterController.js → machine à états + mouvement + collisions + orientation vers la caméra au lancer
    CharacterAnimations.js → poses procédurales OU AnimationMixer réel, selon ce qui a été chargé
  input/
    InputManager.js    → API unique consommée par le reste du jeu
    KeyboardInput.js    → clavier brut
    TouchInput.js       → joystick + boutons + swipe caméra
  inventory/
    Inventory.js        → modèle de données (slots) + restauration depuis une sauvegarde
    Hotbar.js            → rendu DOM lié à Inventory
  objects/
    Stone.js             → objet pierre (ramassable)
    PickupSystem.js       → détection de proximité + retrait du monde
  physics/
    Collision.js          → résolveur léger cercle-contre-cercle (personnage ↔ obstacles/murs)
    CannonPhysics.js       → monde cannon-es réel (pierres lancées : gravité, rebonds, roulement)
    Physics.js             → ancienne implémentation JS simple, conservée en référence
  save/
    SaveSystem.js          → sauvegarde locale (inventaire, qualité) via localStorage
  ui/
    HUD.js, InteractionPrompt.js, MobileControls.js
```

### Machine à états du personnage
```
IDLE ⇄ WALK ⇄ RUN → JUMP → (IDLE/WALK)
IDLE/WALK/RUN → PICKUP → IDLE   (verrouillé pendant l'animation)
IDLE/WALK/RUN → THROW  → IDLE   (verrouillé pendant l'animation)
```

### ⚠️ Note sur le personnage 3D
Le chargement d'un vrai `.glb` riggé est déjà branché (voir la section "Personnage réel (.glb)" plus haut) — mais cette V1 est livrée **sans** fichier `.glb` lui-même, faute d'accès réseau pendant la génération du projet pour en récupérer un. Sans fichier, `CharacterLoader.js` retombe automatiquement sur le personnage procédural (primitives Three.js + pivot de colonne vertébrale pour un buste qui s'incline correctement). Dès qu'un `character.glb` valide est déposé dans `assets/characters/`, il prend le relais sans aucune modification de code.

### Pierres et rochers décoratifs
Même logique : `Stone.js` utilise une géométrie procédurale (`IcosahedronGeometry`) plutôt qu'un `.glb`, et `Environment.js` génère arbres/rochers procéduralement (et exporte leurs positions/rayons pour les collisions). Les dossiers `assets/objects/stone.glb` et `assets/environment/*.glb` sont prévus pour un remplacement futur par de vrais modèles — purement visuel, aucune logique de jeu n'en dépend.

---

## ⚙️ Qualité graphique

Bouton en haut à droite (BASSE / MOYENNE / ÉLEVÉE) : ajuste le `devicePixelRatio` et la résolution des ombres pour préserver la fluidité sur appareils modestes.

---

## 📦 Déploiement

### GitHub
```bash
git init
git add .
git commit -m "V1 — prototype 3D interactif"
git remote add origin <votre-repo>
git push -u origin main
```

### Render (site statique)
Un fichier `render.yaml` est fourni : dans Render, choisissez **New → Blueprint**, pointez vers le repo, et Render détectera automatiquement la configuration (`env: static`, aucune commande de build nécessaire).

Ou manuellement : **New → Static Site**
- Build command : (laisser vide ou `echo "no build"`)
- Publish directory : `./`

Attention aux chemins relatifs si vous ajoutez de vrais fichiers `.glb` dans `assets/` : gardez des imports relatifs (`./assets/...`) pour que ça fonctionne aussi bien en local qu'en production.

---

## ✅ Ce qui fonctionne dans cette V1 (+ améliorations)

- Déplacement (marche/course), saut
- **Collisions réelles** : le personnage ne traverse plus les arbres/rochers, et les murs de périmètre sont de vrais obstacles (voir §Physique ci-dessous)
- Détection + ramassage de pierres avec mise à jour réelle de l'inventaire, **animation de ramassage réaliste** (le buste se penche en avant depuis la taille, genoux fléchis, bras qui atteignent le sol)
- Sélection de pierre (hotbar, touches 1–5)
- Visée (direction caméra) + lancer avec vitesse initiale, gravité, trajectoire parabolique, **rebonds réels sur le sol/rochers/arbres/murs**
- **Le personnage se tourne pour faire face à la direction de la caméra au moment du lancer** : le geste du bras et la trajectoire de la pierre sont donc toujours cohérents, même si le joueur était de profil juste avant
- Machine à états avec transitions et animations (procédurales, ou via un vrai modèle `.glb` si vous en fournissez un — voir plus bas)
- Contrôles complets PC (clavier + souris) et mobile (joystick + boutons + swipe caméra)
- Réglage de qualité graphique
- **Sauvegarde locale** (inventaire + qualité graphique) restaurée automatiquement au chargement
- Site 100% statique, déployable sans backend

## 🧠 Corrections récentes

- **Animation de ramassage** : le rig a maintenant un vrai pivot de colonne vertébrale (`spine`, dans `Character.js`) sur lequel le buste, la tête et les bras s'inclinent ensemble vers l'avant — au lieu de seulement faire descendre les hanches sans inclinaison, ce qui donnait l'impression que le personnage se pliait dans le mauvais sens.
- **Direction du lancer** : `CharacterController.requestThrow(cameraYaw)` oriente désormais immédiatement le personnage vers la direction de la caméra avant de jouer l'animation de lancer. Avant ce correctif, la pierre partait déjà correctement vers l'endroit visé par la caméra, mais le corps du personnage pouvait rester de profil, ce qui donnait l'impression que la pierre partait "du mauvais côté" par rapport au geste du bras. Maintenant le corps et la trajectoire sont toujours alignés.
- **Gauche/droite inversés** : la formule qui convertit l'input (joystick ou clavier) en angle de déplacement relatif à la caméra avait un signe horizontal inversé (`Math.atan2(moveX, -moveY)` au lieu de `Math.atan2(-moveX, -moveY)`), ce qui faisait aller le personnage à droite quand on appuyait à gauche et vice versa. Avant/arrière n'étaient pas concernés. Corrigé dans `CharacterController.js`.

## ⚙️ Architecture physique (mise à jour)

Deux systèmes, choisis délibérément selon le besoin :

- **`physics/Collision.js`** — résolveur léger cercle-contre-cercle utilisé pour le déplacement du personnage contre les rochers/arbres (`environment/Environment.js` exporte leurs positions et rayons) et contre les murs de périmètre. Rapide, déterministe, sans jitter — adapté à une petite arène avec peu d'obstacles statiques (priorité donnée à la performance, comme demandé dans le prompt).
- **`physics/CannonPhysics.js`** — un vrai monde physique [cannon-es](https://github.com/pmndrs/cannon-es) (chargé via CDN dans l'import map, aucune installation nécessaire) pour les pierres lancées : gravité réelle, rebonds sur le sol/les rochers/les arbres/les murs, roulement, sommeil automatique des corps immobiles pour rester léger. C'est le point d'extension prévu par le prompt ("prévoir une architecture permettant d'intégrer ultérieurement Rapier ou Cannon-es").

## 🧍 Personnage réel (.glb/.gltf) — prêt à brancher, 100% navigateur

`character/CharacterLoader.js` essaie automatiquement, au démarrage, `assets/characters/character.glb` puis `assets/characters/character.gltf`. Si l'un des deux existe et contient des animations, `CharacterAnimations.js` bascule en mode "rigged" et pilote un vrai `THREE.AnimationMixer` avec cross-fades. Si rien n'est trouvé, le jeu retombe silencieusement sur le personnage procédural — aucune erreur, aucun code à modifier.

**Aucune nomenclature exacte de clip requise.** Plutôt que d'exiger des clips nommés pile `Idle`/`Walk`/`Run`/etc., `CharacterAnimations.js` fait correspondre chaque état du jeu au premier clip dont le nom *contient* un mot-clé proche (`STATE_ALIASES` en haut du fichier — "pickup", "pick_up", "interact", "grab", "loot" matchent tous l'état PICKUP, par exemple). Ça évite d'avoir à renommer quoi que ce soit à la main, ce qui compte puisque la plupart des packs gratuits n'utilisent pas cette convention. Un état sans clip correspondant garde simplement la dernière animation affichée — le jeu reste jouable, seul cet état précis est moins poli visuellement.

### Obtenir un personnage riggé sans Blender (100% web)

Mixamo est capricieux ces derniers temps (pannes récurrentes côté Adobe). Une alternative fiable et **entièrement navigateur**, sans logiciel à installer :

1. Téléchargez un personnage sur **[KayKit — Character Pack: Adventurers](https://kaylousberg.itch.io/kaykit-adventurers)** (gratuit, CC0, fourni en `.GLTF` directement).
2. Téléchargez **[KayKit — Character Animations](https://kaylousberg.itch.io/kaykit-character-animations)** (gratuit, CC0, 161 animations, même squelette que les personnages Adventurers — donc compatibles sans retargeting).
3. Repérez dans le zip du personnage le fichier `.glb` (ou le dossier `.gltf` + `.bin` + textures), et déposez-le dans `assets/characters/` sous le nom `character.glb` (ou `character.gltf` + ses fichiers associés si c'est le format "Separate").
4. Choisissez dans le pack d'animations les fichiers qui vous intéressent (idle, walk, run, jump, une animation "interact"/"pickup", une animation de lancer/tir...) et déposez-les dans `assets/characters/animations/`.
5. Listez leurs chemins dans `assets/characters/animations/manifest.json`, un simple tableau JSON :
   ```json
   ["./assets/characters/animations/Idle.gltf", "./assets/characters/animations/Walk.gltf"]
   ```
6. Rechargez la page. `CharacterLoader.js` charge le personnage, charge chaque fichier du manifeste, fusionne tous les clips trouvés, et `CharacterAnimations.js` s'occupe du mapping par mots-clés automatiquement.

Pourquoi ça marche sans Blender : le personnage et les animations partagent le même squelette (mêmes noms d'os), donc `mixer.clipAction(clip)` fonctionne même si le clip vient d'un fichier différent de celui du mesh — exactement le même principe que le retargeting Mixamo entre personnages compatibles.

Si `manifest.json` reste vide ou absent, ce dossier est simplement ignoré (pas d'erreur) — pratique si vous voulez d'abord tester avec juste les animations déjà incluses dans `character.glb`.

## 💾 Sauvegarde locale

`save/SaveSystem.js` persiste l'inventaire (quantité de pierres, slot sélectionné) et la qualité graphique dans `localStorage`, et les restaure automatiquement à l'ouverture de la page. C'est une vraie page web statique classique : `localStorage` fonctionne normalement dans un déploiement réel (GitHub Pages / Render). Effacer les données : ouvrez la console et appelez `localStorage.removeItem('stone-realm-save-v1')`.

> Note : le fichier `stone-realm-preview.html` fourni séparément (aperçu rapide en un seul fichier) n'inclut volontairement pas ce module — l'environnement d'aperçu intégré ne supporte pas `localStorage`. Le vrai projet ci-dessus l'a en entier.

## 🔜 Prochaines étapes suggérées (au-delà de cette version)
- ~~Vrai modèle `.glb` riggé + `AnimationMixer`~~ → architecture prête (`CharacterLoader.js`), il ne manque que le fichier `.glb` lui-même
- ~~Physique avancée (Rapier / Cannon-es) pour collisions pierre↔objets~~ → fait avec cannon-es (`CannonPhysics.js`)
- ~~Obstacles/rochers collidables remplaçant le clamp de périmètre~~ → fait (`Collision.js` + murs physiques dans `CannonPhysics.js`)
- ~~Système de sauvegarde locale (progression, inventaire)~~ → fait (`SaveSystem.js`)
- Sauvegarde des pierres déjà ramassées dans le monde (actuellement seul le compte total est sauvegardé, le monde se réinitialise au rechargement)
- Vraies collisions de personnage en 3D (capsule physique) plutôt qu'un cercle 2D sur le plan XZ, si le terrain devient accidenté
- Système de dégâts/destruction quand une pierre touche un objet
