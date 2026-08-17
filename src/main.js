// main.js — wires every module together and runs the game loop.
import * as THREE from 'three';

import { createRenderer, createScene, createGround } from './scene.js';
import { createLighting } from './lighting.js';
import { ThirdPersonCamera } from './camera.js';
import { populateEnvironment } from './environment/Environment.js';

import { InputManager } from './input/InputManager.js';
import { CharacterController } from './character/CharacterController.js';

import { PickupSystem } from './objects/PickupSystem.js';
import { Inventory } from './inventory/Inventory.js';
import { Hotbar } from './inventory/Hotbar.js';

import { Physics } from './physics/Physics.js';
import { HUD } from './ui/HUD.js';
import { InteractionPrompt } from './ui/InteractionPrompt.js';
import { MobileControls } from './ui/MobileControls.js';

// ---------------------------------------------------------------------------
// Boundary (play area) — see spec §10. Kept simple (clamp) for V1; can later
// be replaced with real collision volumes without touching gameplay code.
// ---------------------------------------------------------------------------
const boundary = { minX: -15, maxX: 15, minZ: -15, maxZ: 15 };

const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);
const scene = createScene();
const ground = createGround(40);
scene.add(ground);

const { sun } = createLighting(scene, 'medium');
populateEnvironment(scene, boundary);

const camRig = new ThirdPersonCamera({ aspect: window.innerWidth / window.innerHeight });

const input = new InputManager();

const hud = new HUD({
  onQualityChange: (level) => applyQuality(level),
});
const prompt = new InteractionPrompt();
const inventory = new Inventory();
const hotbar = new Hotbar(inventory);
new MobileControls({ hotbar });

const pickupSystem = new PickupSystem(scene);
const stonePositions = [
  [-3, -3], [4, 2], [-6, 4], [2, -6], [7, -2], [-2, 7], [0, 3], [-8, -1],
];
pickupSystem.spawnStones(stonePositions);

const physics = new Physics({ groundY: 0 });
const projectiles = []; // thrown stones: { mesh, position, velocity, radius, grounded }

const character = new CharacterController({
  scene,
  boundary,
  onRequestPickup: handlePickupResolved,
  onThrowRelease: handleThrowRelease,
});

sun.target.position.copy(character.position);

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
applyQuality('moyenne');

// ---------------------------------------------------------------------------
// Gameplay glue: pickup + throw
// ---------------------------------------------------------------------------
let pendingPickupTarget = null;

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

  const forward = camRig.getForwardDirection();
  const origin = character.position.clone().add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(forward, 0.6);

  const geo = new THREE.IcosahedronGeometry(0.16, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x9a9a92, roughness: 0.85, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(origin);
  mesh.castShadow = true;
  scene.add(mesh);

  const THROW_SPEED = 14;
  const velocity = forward.clone().multiplyScalar(THROW_SPEED);
  velocity.y += 3.2; // gives it a natural upward arc rather than a flat line

  projectiles.push({ mesh, position: mesh.position, velocity, radius: 0.16, grounded: false, life: 0 });
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
let bootProgress = 0;

function boot() {
  // Simulated short boot sequence (assets here are all procedural / instant,
  // but a real project would report GLTFLoader progress here instead).
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

function loop() {
  const delta = Math.min(clock.getDelta(), 0.05);

  input.update();

  // Camera look (mouse drag or touch drag).
  if (input.lookDeltaX !== 0 || input.lookDeltaY !== 0) {
    camRig.handleLook(input.lookDeltaX, input.lookDeltaY);
  }

  // Inventory toggle + slot selection.
  if (input.toggleInventory) hotbar.toggleInventoryPanel();
  if (input.selectSlot !== null) inventory.select(input.selectSlot);

  // Pickup detection + prompt (computed BEFORE the character update, so the
  // nearest stone can be captured at the exact moment a pickup is requested,
  // before the PICKUP state locks the character for the animation's duration).
  const nearStone = pickupSystem.update(character.position);
  if (nearStone && character.canAcceptNewAction()) {
    prompt.show();
  } else {
    prompt.hide();
  }
  if (input.pickup && nearStone && character.canAcceptNewAction()) {
    pendingPickupTarget = nearStone;
  }

  // Character update (movement / state machine / animation).
  character.update(delta, input, camRig.yaw);

  // Camera follows character.
  camRig.update(delta, character.position);
  sun.target.position.copy(character.position);
  sun.position.copy(character.position).add(new THREE.Vector3(12, 18, 8));

  // Thrown-stone physics.
  physics.update(projectiles, delta);
  for (const p of projectiles) {
    p.life += delta;
  }
  // Clean up stones that have been resting on the ground for a while.
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (p.grounded && p.life > 4) {
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
    }
  }

  input.postUpdate();
  renderer.render(scene, camRig.camera);
}

boot();
