// Character.js
// Builds the visual character mesh.
//
// V1 note: no .glb asset is bundled by default, so the character is assembled
// from primitive geometries (a common, valid technique for prototypes). The
// rig is exposed as named THREE.Group parts (spine, head, torso, arms, legs)
// so CharacterAnimations.js can pose them procedurally — the same way a real
// bone hierarchy would be posed. See CharacterLoader.js for the code path
// that loads a real rigged .glb instead, when one is available.
//
// Rig hierarchy (all local rotations are around each part's own pivot):
//   root
//     hips (translates up/down for crouch/jump; also the whole-body yaw)
//       legL / legR  (hip -> knee -> foot)   — hang below the hips pivot
//       spine        (pivots AT the hips, so rotating it forward bends the
//                     whole upper body at the waist — torso, head and arms
//                     all lean together, like a real forward bend)
//         torso
//         head
//         armL / armR (shoulder -> elbow)    — hang below the shoulder pivot

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

  const hips = new THREE.Group();
  hips.position.y = 0.9;
  root.add(hips);

  // ---- Spine pivot (bend-at-the-waist point) ----
  const spine = new THREE.Group();
  hips.add(spine);

  const torso = box(0.42, 0.5, 0.26, SHIRT);
  torso.position.y = 0.32;
  spine.add(torso);

  const head = new THREE.Group();
  head.position.y = 0.66;
  spine.add(head);
  const headMesh = box(0.26, 0.28, 0.26, SKIN);
  head.add(headMesh);

  // ---- Arms (attached to the spine, so they lean with the torso) ----
  function buildArm(sign) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.28, 0.52, 0);
    spine.add(shoulder);
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

  // ---- Legs (attached directly to hips, independent of the spine bend) ----
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

  root.userData.parts = { hips, spine, head, armL, armR, legL, legR };
  root.userData.rigged = false; // procedural rig — see CharacterLoader.js

  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return root;
}
