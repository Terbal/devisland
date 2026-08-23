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

// Tried in order — supports both a single self-contained .glb, and the
// "glTF Separate" (.gltf + .bin + textures) export some packs use.
const DEFAULT_CHARACTER_PATHS = [
  './assets/characters/character.glb',
  './assets/characters/character.gltf',
];

// A plain JSON array of extra animation-only file paths, e.g.:
//   ["./assets/characters/animations/Idle.gltf", "./assets/characters/animations/Walk.gltf"]
// Optional — if this file doesn't exist, extra animations are just skipped.
const ANIMATIONS_MANIFEST_PATH = './assets/characters/animations/manifest.json';

// The procedural rig (Character.js) is ~1.8 world units tall, which is what
// the camera distance/height and the character's collision radius in
// CharacterController.js were tuned against. Imported models rarely match
// that exactly (KayKit's Rogue, for instance, is ~2.18 units tall in its
// bind pose) — so every rigged model is auto-rescaled to this height. This
// means swapping in a different/larger/smaller character later never
// requires touching the camera or collision code.
const TARGET_HEIGHT = 1.8;

export async function loadCharacter() {
  const loader = new GLTFLoader();
  const characterResult = await tryLoadCharacter(loader);
  if (!characterResult) return fallback();

  const { root, baseClips } = characterResult;
  const extraClips = await tryLoadExtraAnimations(loader);
  const clips = [...baseClips, ...extraClips];

  if (clips.length === 0) {
    console.warn('[CharacterLoader] Character model found but no animation clips at all (base or extra) — using procedural poses for every state.');
  }

  normalizeHeight(root);

  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  root.userData.rigged = true;
  root.userData.parts = null; // real rig — bones are driven by the mixer, not manually posed

  const mixer = new THREE.AnimationMixer(root);
  return { root, riggedData: { mixer, clips } };
}

function normalizeHeight(root) {
  const box = new THREE.Box3().setFromObject(root);
  const height = box.max.y - box.min.y;
  if (height <= 0.01) return; // degenerate/empty bounds — leave untouched
  const scale = TARGET_HEIGHT / height;
  if (Math.abs(scale - 1) < 0.02) return; // already close enough, don't bother
  root.scale.setScalar(scale);
  console.info(`[CharacterLoader] Rescaled character by ${scale.toFixed(3)}x (was ${height.toFixed(2)} units tall) to match the ${TARGET_HEIGHT}-unit camera/collision tuning.`);
}

async function tryLoadCharacter(loader) {
  for (const path of DEFAULT_CHARACTER_PATHS) {
    try {
      const gltf = await loader.loadAsync(path);
      console.info(`[CharacterLoader] Loaded rigged character from ${path} (${gltf.animations.length} built-in clip(s)).`);
      return { root: gltf.scene, baseClips: gltf.animations || [] };
    } catch (err) {
      // Expected when nothing has been dropped in yet — try the next path.
    }
  }
  console.info('[CharacterLoader] No rigged character file found (tried: ' + DEFAULT_CHARACTER_PATHS.join(', ') + ') — using the built-in procedural character.');
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
  return { root: buildCharacter(), riggedData: null };
}
