// CharacterLoader.js
// Tries to load a real rigged character, then optionally merges in extra
// animation clips loaded from SEPARATE .glb/.gltf files.
//
// Why "separate animation files" matters: many free community packs (e.g.
// KayKit — see README) ship the character mesh and the animation library as
// different downloads that share the same skeleton/bone naming. Three.js
// doesn't need them baked into one file to use them together: as long as a
// clip's bone track names match bone names that exist in the loaded
// character's skeleton, `mixer.clipAction(externalClip)` just works. This is
// the same principle that lets Mixamo-rigged characters swap animations
// freely — no Blender merge step required, entirely in the browser.
//
// Robustness: every step here degrades gracefully. Missing character file →
// procedural rig. Character found but no clips → still rigged, but
// CharacterAnimations falls back to procedural poses per state as needed.
// Missing/partial extra-animation manifest → simply skipped. The game is
// always playable.
//
// Usage:
//   const { root, riggedData } = await loadCharacter();
//   const animations = new CharacterAnimations(root, riggedData);

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildCharacter } from './Character.js';
import { CHARACTER_CONFIG } from './characterConfig.js';

// Tried in order — the configured model first, then generic fallback names
// (supports both a single self-contained .glb, and the "glTF Separate"
// .gltf + .bin + textures export some packs use).
const CANDIDATE_CHARACTER_PATHS = [
  CHARACTER_CONFIG.modelPath,
  './assets/characters/character.glb',
  './assets/characters/character.gltf',
];

// A plain JSON array of extra animation-only file paths, e.g.:
//   ["./assets/characters/animations/Idle.gltf", "./assets/characters/animations/Walk.gltf"]
// Optional — if this file doesn't exist, extra animations are just skipped.
const ANIMATIONS_MANIFEST_PATH = './assets/characters/animations/manifest.json';

export async function loadCharacter() {
  const loader = new GLTFLoader();
  const characterResult = await tryLoadCharacter(loader);
  if (!characterResult) return fallback();

  const { scene, baseClips } = characterResult;
  const extraClips = await tryLoadExtraAnimations(loader);
  const clips = [...baseClips, ...extraClips];

  if (clips.length === 0) {
    console.warn('[CharacterLoader] Character model found but no animation clips at all (base or extra) — using procedural poses for every state.');
  }

  normalizeHeightAndGrounding(scene, CHARACTER_CONFIG.targetHeight);

  scene.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  // Isolate the loaded asset inside its own untouched wrapper. This fixes
  // two things at once:
  //  1) "Floating" characters — some rigs don't put their bind-pose feet
  //     exactly at the model's own origin; normalizeHeightAndGrounding()
  //     shifts the INNER scene so feet sit at y=0, while CharacterController
  //     keeps driving the OUTER wrapper, so the offset never has to be
  //     special-cased anywhere else.
  //  2) Any risk of an animation clip's root-bone track fighting with our
  //     own manual position/rotation — the wrapper has zero animation
  //     tracks targeting it, only the inner scene's bones do.
  const wrapper = new THREE.Group();
  wrapper.name = 'CharacterWrapper';
  wrapper.add(scene);
  wrapper.userData.rigged = true;
  wrapper.userData.parts = null; // real rig — bones are driven by the mixer, not manually posed
  // Attachment points for held items (see objects/HeldStone.js). KayKit rigs
  // expose a purpose-built "handslot.r" bone for this; hips doubles as a
  // reasonable "stored on the belt" point. Both are optional — HeldStone
  // degrades to hiding the item if neither exists.
  wrapper.userData.handSlot = scene.getObjectByName('handslot.r') || scene.getObjectByName('hand.r') || null;
  wrapper.userData.hipsBone = scene.getObjectByName('hips') || null;

  const mixer = new THREE.AnimationMixer(scene);
  return { root: wrapper, riggedData: { mixer, clips } };
}

/**
 * Rescales `scene` in place to `targetHeight` world units, then shifts it
 * vertically so its bind-pose feet sit exactly at local y=0. Works for any
 * model regardless of how its own origin/pivot was authored.
 */
function normalizeHeightAndGrounding(scene, targetHeight) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const height = box.max.y - box.min.y;
  if (height <= 0.01) return; // degenerate/empty bounds — leave untouched

  const scale = targetHeight / height;
  scene.scale.setScalar(scale);
  scene.updateMatrixWorld(true);

  const rescaledBox = new THREE.Box3().setFromObject(scene);
  scene.position.y -= rescaledBox.min.y;

  console.info(`[CharacterLoader] Rescaled to ${targetHeight} units tall (was ${height.toFixed(2)}) and grounded feet to y=0.`);
}

async function tryLoadCharacter(loader) {
  for (const path of CANDIDATE_CHARACTER_PATHS) {
    try {
      const gltf = await loader.loadAsync(path);
      console.info(`[CharacterLoader] Loaded rigged character from ${path} (${gltf.animations.length} built-in clip(s)).`);
      return { scene: gltf.scene, baseClips: gltf.animations || [] };
    } catch (err) {
      // Expected when nothing has been dropped in yet — try the next path.
    }
  }
  console.info('[CharacterLoader] No rigged character file found (tried: ' + CANDIDATE_CHARACTER_PATHS.join(', ') + ') — using the built-in procedural character.');
  return null;
}

async function tryLoadExtraAnimations(loader) {
  let manifest;
  try {
    const res = await fetch(ANIMATIONS_MANIFEST_PATH);
    if (!res.ok) return [];
    manifest = await res.json();
    if (!Array.isArray(manifest)) return [];
  } catch (err) {
    return []; // no manifest — perfectly normal, not an error
  }

  const clips = [];
  for (const path of manifest) {
    try {
      const gltf = await loader.loadAsync(path);
      if (gltf.animations && gltf.animations.length) {
        clips.push(...gltf.animations);
        console.info(`[CharacterLoader] Loaded ${gltf.animations.length} clip(s) from ${path}.`);
      }
    } catch (err) {
      console.warn(`[CharacterLoader] Failed to load animation file ${path}, skipping it.`, err);
    }
  }
  return clips;
}

function fallback() {
  const root = buildCharacter();
  const parts = root.userData.parts;
  // Approximate attachment points on the procedural rig, so HeldStone.js
  // can rely on the same userData contract regardless of which mode is active.
  root.userData.handSlot = parts ? parts.armR.elbow : null;
  root.userData.hipsBone = parts ? parts.hips : null;
  return { root, riggedData: null };
}
