// main.js — wires every module together and runs the game loop.
import * as THREE from 'three';

import { createRenderer, createScene, createGround, createSky } from './scene.js';
import { createLighting } from './lighting.js';
import { ThirdPersonCamera } from './camera.js';
import { populateEnvironment } from './environment/Environment.js';

import { InputManager } from './input/InputManager.js';
import { loadCharacter } from './character/CharacterLoader.js';
import { CharacterController } from './character/CharacterController.js';

import { PickupSystem } from './objects/PickupSystem.js';
import { Inventory } from './inventory/Inventory.js';
import { Hotbar } from './inventory/Hotbar.js';

import { CannonPhysics } from './physics/CannonPhysics.js';
import { HUD } from './ui/HUD.js';
import { InteractionPrompt } from './ui/InteractionPrompt.js';
import { MobileControls } from './ui/MobileControls.js';
import { SaveSystem } from './save/SaveSystem.js';
import { AudioManager } from './audio/AudioManager.js';

// ---------------------------------------------------------------------------
// Boundary (play area) — see spec §10. The character uses a lightweight
// circle-vs-circle collision resolver (Collision.js) against this + the
// decorative obstacles; the physics world below builds *real* static wall
// bodies at the same coordinates so thrown stones bounce off them too.
// ---------------------------------------------------------------------------
const boundary = { minX: -15, maxX: 15, minZ: -15, maxZ: 15 };

const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);
const scene = createScene();
scene.add(createSky());
const ground = createGround(40);
scene.add(ground);

const { sun } = createLighting(scene, 'medium');
const { obstacles } = populateEnvironment(scene, boundary);

const camRig = new ThirdPersonCamera({ aspect: window.innerWidth / window.innerHeight });
const audio = new AudioManager(camRig.camera);

const input = new InputManager();
const saveSystem = new SaveSystem();

const hud = new HUD({ onQualityChange: (level) => { applyQuality(level); saveProgress(); } });
const prompt = new InteractionPrompt();
const inventory = new Inventory();
const hotbar = new Hotbar(inventory);
new MobileControls({ hotbar });

const pickupSystem = new PickupSystem(scene);
const stonePositions = [
  [-3, -3], [4, 2], [-6, 4], [2, -6], [7, -2], [-2, 7], [0, 3], [-8, -1],
];
pickupSystem.spawnStones(stonePositions);

// Real rigid-body physics for thrown stones (bounces off trees/rocks/walls).
const physics = new CannonPhysics({ boundary, obstacles, groundY: 0 });

// ---------------------------------------------------------------------------
// Local save (progression/inventory) — see spec §36.
// ---------------------------------------------------------------------------
function saveProgress() {
  saveSystem.save({ inventory, quality: hud.getQuality() });
}

const savedGame = saveSystem.load();
if (savedGame) {
  inventory.restore(savedGame.inventory);
  hud.setQuality(savedGame.quality);
  hud.notify('Progression chargée');
}
inventory.onChange(() => saveProgress());

// ---------------------------------------------------------------------------
// Character — tries a real rigged .glb first (assets/characters/character.glb),
// falls back to the built-in procedural rig automatically. See CharacterLoader.js.
// ---------------------------------------------------------------------------
const { root: characterRoot, riggedData } = await loadCharacter();

let pendingPickupTarget = null;

const character = new CharacterController({
  scene,
  characterRoot,
  riggedData,
  boundary,
  obstacles,
  onRequestPickup: handlePickupResolved,
  onThrowRelease: handleThrowRelease,
});

sun.target.position.copy(character.position);

// Show/hide the carried-stone visual (see objects/HeldStone.js) whenever the
// selected inventory slot's quantity changes — pickup, throw, or switching
// hotbar slots all flow through here automatically.
function syncHeldStoneVisual() {
  const slot = inventory.getSelectedSlot();
  character.setHeldStoneVisible(Boolean(slot && slot.itemType === 'stone' && slot.quantity > 0));
}
inventory.onChange(() => syncHeldStoneVisual());
syncHeldStoneVisual(); // reflect anything restored from a save immediately

// ---------------------------------------------------------------------------
// Quality settings (spec §24)
// ---------------------------------------------------------------------------
function applyQuality(level) {
  const pixelRatios = { basse: 0.85, moyenne: 1.25, elevee: Math.min(window.devicePixelRatio, 2) };
  const key = level in pixelRatios ? level : 'moyenne';
  renderer.setPixelRatio(pixelRatios[key]);
  sun.castShadow = key !== 'basse';
  renderer.shadowMap.enabled = key !== 'basse';
}
applyQuality(hud.getQuality());

// ---------------------------------------------------------------------------
// Gameplay glue: pickup + throw
// ---------------------------------------------------------------------------
function handlePickupResolved() {
  if (!pendingPickupTarget) return;
  pickupSystem.collect(pendingPickupTarget);
  inventory.addStone(1);
  hud.notify('+1 Pierre');
  pendingPickupTarget = null;
}

function handleThrowRelease() {
  const slot = inventory.getSelectedSlot();
  if (!slot || slot.itemType !== 'stone' || slot.quantity <= 0) return;
  if (!inventory.consumeSelected()) return;

  // Direction: always the camera's actual forward vector — this is what
  // makes the throw go "where the player is looking" regardless of which
  // way the character's body happens to be facing at release time.
  // (CharacterController.requestThrow already turns the character to face
  // this same direction the instant the throw starts, so the arm swing and
  // the stone's flight path always agree visually.)
  const forward = camRig.getForwardDirection();
  const origin = character.position.clone().add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(forward, 0.6);

  const geo = new THREE.IcosahedronGeometry(0.16, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x9a9a92, roughness: 0.85, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.copy(origin);
  scene.add(mesh);

  const THROW_SPEED = 14;
  const velocity = forward.clone().multiplyScalar(THROW_SPEED);
  velocity.y += 3.2; // natural upward arc rather than a flat line

  physics.throwStone(mesh, origin, velocity);
}

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camRig.onResize(window.innerWidth / window.innerHeight);
});

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();

function loop() {
  const delta = Math.min(clock.getDelta(), 0.05);

  input.update();

  if (input.lookDeltaX !== 0 || input.lookDeltaY !== 0) {
    camRig.handleLook(input.lookDeltaX, input.lookDeltaY);
  }

  if (input.toggleInventory) hotbar.toggleInventoryPanel();
  if (input.selectSlot !== null) inventory.select(input.selectSlot);

  // Pickup detection + prompt, computed BEFORE the character update so the
  // nearest stone is captured at the exact moment a pickup is requested.
  const nearStone = pickupSystem.update(character.position);
  if (nearStone && character.canAcceptNewAction()) {
    prompt.show();
  } else {
    prompt.hide();
  }
  if (input.pickup && nearStone && character.canAcceptNewAction()) {
    pendingPickupTarget = nearStone;
  }

  character.update(delta, input, camRig.yaw);

  camRig.update(delta, character.position);
  sun.target.position.copy(character.position);
  sun.position.copy(character.position).add(new THREE.Vector3(12, 18, 8));

  physics.update(delta);
  physics.cleanup(scene);

  input.postUpdate();
  renderer.render(scene, camRig.camera);
}

function boot() {
  let bootProgress = 0;
  const interval = setInterval(() => {
    bootProgress += 0.18 + Math.random() * 0.22;
    hud.setLoadingProgress(Math.min(bootProgress, 1));
    if (bootProgress >= 1) {
      clearInterval(interval);
      hud.hideLoadingScreen();
      renderer.setAnimationLoop(loop);
    }
  }, 90);
}

boot();
