// Character.js
// Builds the visual character mesh.
//
// V1 note: no .glb asset is bundled, so the character is assembled from
// primitive geometries (a common, perfectly valid technique for prototypes).
// The rig is exposed as named THREE.Group parts (head, torso, arms, legs)
// so CharacterAnimations.js can pose them procedurally — exactly the way a
// real bone hierarchy would be posed. Swapping in a real rigged .glb later
// only means replacing `buildCharacter()` and feeding real AnimationClips
// into CharacterAnimations.js; CharacterController.js does not need to change.

import * as THREE from 'three';

const SKIN = 0xe0b58c;
const SHIRT = 0x3a6b8a;
const PANTS = 0x2b2f38;
const SHOE = 0x1a1c22;

function box(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildCharacter() {
  const root = new THREE.Group();
  root.name = 'Character';

  // ---- Torso ----
  const hips = new THREE.Group();
  hips.position.y = 0.9;
  root.add(hips);

  const torso = box(0.42, 0.5, 0.26, SHIRT);
  torso.position.y = 0.32;
  hips.add(torso);

  const head = new THREE.Group();
  head.position.y = 0.66;
  hips.add(head);
  const headMesh = box(0.26, 0.28, 0.26, SKIN);
  head.add(headMesh);

  // ---- Arms ----
  function buildArm(sign) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.28, 0.52, 0);
    hips.add(shoulder);
    const upper = box(0.13, 0.32, 0.13, SHIRT);
    upper.position.y = -0.16;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.32;
    shoulder.add(elbow);
    const lower = box(0.11, 0.3, 0.11, SKIN);
    lower.position.y = -0.15;
    elbow.add(lower);

    return { shoulder, elbow };
  }

  const armL = buildArm(-1);
  const armR = buildArm(1);

  // ---- Legs ----
  function buildLeg(sign) {
    const hip = new THREE.Group();
    hip.position.set(sign * 0.12, 0, 0);
    hips.add(hip);
    const upper = box(0.16, 0.36, 0.16, PANTS);
    upper.position.y = -0.18;
    hip.add(upper);

    const knee = new THREE.Group();
    knee.position.y = -0.36;
    hip.add(knee);
    const lower = box(0.14, 0.34, 0.14, PANTS);
    lower.position.y = -0.17;
    knee.add(lower);

    const foot = box(0.16, 0.1, 0.24, SHOE);
    foot.position.set(0, -0.36, 0.05);
    knee.add(foot);

    return { hip, knee };
  }

  const legL = buildLeg(-1);
  const legR = buildLeg(1);

  // A small forward-facing marker so "front" is unambiguous while iterating.
  root.userData.parts = { hips, head, armL, armR, legL, legR };

  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return root;
}
