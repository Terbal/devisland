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
    Character.js           → mesh du personnage (primitives, voir note ci-dessous)
    CharacterController.js → machine à états + mouvement + limites de zone
    CharacterAnimations.js → poses procédurales par état (idle/walk/run/jump/…)
  input/
    InputManager.js    → API unique consommée par le reste du jeu
    KeyboardInput.js    → clavier brut
    TouchInput.js       → joystick + boutons + swipe caméra
  inventory/
    Inventory.js        → modèle de données (slots)
    Hotbar.js            → rendu DOM lié à Inventory
  objects/
    Stone.js             → objet pierre (ramassable)
    PickupSystem.js       → détection de proximité + retrait du monde
  physics/
    Physics.js           → gravité + trajectoire + collision sol pour les pierres lancées
  ui/
    HUD.js, InteractionPrompt.js, MobileControls.js
```

### Machine à états du personnage
```
IDLE ⇄ WALK ⇄ RUN → JUMP → (IDLE/WALK)
IDLE/WALK/RUN → PICKUP → IDLE   (verrouillé pendant l'animation)
IDLE/WALK/RUN → THROW  → IDLE   (verrouillé pendant l'animation)
```

### ⚠️ Note importante sur le personnage 3D
Cette V1 ne télécharge **aucun modèle `.glb` externe** (environnement sans accès réseau pendant la génération). Le personnage est donc assemblé à partir de primitives Three.js (`BoxGeometry`) organisées en hiérarchie de groupes (tronc → bras/jambes), et animé **procéduralement** (poses calculées chaque frame selon l'état courant), plutôt qu'avec un vrai rig + `AnimationMixer`.

L'architecture a été conçue pour absorber un vrai modèle sans rien casser :
- Remplacez `buildCharacter()` dans `Character.js` par un chargement `GLTFLoader` d'un personnage riggé.
- Remplacez le corps de `CharacterAnimations.update()` par de vrais `THREE.AnimationMixer` / `AnimationAction` (le code en commentaire dans le fichier montre exactement comment).
- `CharacterController.js` n'a besoin d'aucune modification : il ne connaît que la machine à états, pas la façon dont les poses sont produites.

Pour ajouter un vrai modèle : déposez-le dans `assets/characters/character.glb` (dossier déjà prévu) avec des clips nommés `Idle, Walk, Run, Jump, Fall, Pickup, Throw`.

### Pierres et rochers décoratifs
Même logique : `Stone.js` utilise une géométrie procédurale (`IcosahedronGeometry`) plutôt qu'un `.glb`, et `Environment.js` génère arbres/rochers procéduralement. Les dossiers `assets/objects/stone.glb` et `assets/environment/*.glb` sont prévus pour un remplacement futur par de vrais modèles.

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

## ✅ Ce qui fonctionne dans cette V1

- Déplacement (marche/course), saut, limites de zone
- Détection + ramassage de pierres avec mise à jour réelle de l'inventaire
- Sélection de pierre (hotbar, touches 1–5)
- Visée (direction caméra) + lancer avec vitesse initiale, gravité, trajectoire parabolique, collision sol
- Machine à états avec transitions et animations procédurales par état
- Contrôles complets PC (clavier + souris) et mobile (joystick + boutons + swipe caméra)
- Réglage de qualité graphique
- Site 100% statique, déployable sans backend

## 🔜 Prochaines étapes suggérées (hors V1)
- Vrai modèle `.glb` riggé + `AnimationMixer`
- Physique avancée (Rapier / Cannon-es) pour collisions pierre↔objets
- Obstacles/rochers collidables remplaçant le clamp de périmètre
- Système de sauvegarde local (progression, inventaire)
