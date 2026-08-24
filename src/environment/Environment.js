// Environment.js — decorative low-poly trees, rocks & grass (no external assets needed).
import * as THREE from 'three';

const TREE_FOLIAGE_BASE = new THREE.Color(0x357a3f);
const ROCK_BASE = new THREE.Color(0x8d8a80);
const GRASS_BASE = new THREE.Color(0x6fae4e);

function tinted(base, variance = 0.08) {
  const c = base.clone();
  const f = 1 + (Math.random() - 0.5) * variance * 2;
  c.multiplyScalar(f);
  return c;
}

function makeTree() {
  const group = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 1 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  // Slight per-tree color variance so a cluster doesn't read as copy-pasted.
  const foliageMat = new THREE.MeshStandardMaterial({ color: tinted(TREE_FOLIAGE_BASE), roughness: 0.9, flatShading: true });
  const tiers = [
    { y: 1.6, r: 0.9, h: 1.1 },
    { y: 2.35, r: 0.68, h: 1.0 },
    { y: 3.0, r: 0.45, h: 0.9 },
  ];
  tiers.forEach((t) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 7), foliageMat);
    cone.position.y = t.y;
    cone.castShadow = true;
    cone.receiveShadow = true;
    group.add(cone);
  });

  return group;
}

function makeRock(scale = 1) {
  const geo = new THREE.DodecahedronGeometry(0.5 * scale, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const jitter = 0.12;
    pos.setXYZ(
      i,
      pos.getX(i) + (Math.random() - 0.5) * jitter,
      pos.getY(i) + (Math.random() - 0.5) * jitter,
      pos.getZ(i) + (Math.random() - 0.5) * jitter
    );
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ color: tinted(ROCK_BASE, 0.06), roughness: 1, flatShading: true });
  const rock = new THREE.Mesh(geo, mat);
  rock.position.y = 0.25 * scale;
  rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

/**
 * Scattered grass tufts as a single InstancedMesh (one draw call for
 * potentially hundreds of blades) — cheap texture-free detail that breaks up
 * the flat ground without hurting performance, per spec's PERFORMANCE >
 * ESTHÉTIQUE priority.
 */
function makeGrass(boundary, obstacles, count = 260) {
  const bladeGeo = new THREE.ConeGeometry(0.045, 0.34, 3);
  bladeGeo.translate(0, 0.17, 0);
  const mat = new THREE.MeshStandardMaterial({ color: GRASS_BASE, roughness: 1, flatShading: true });
  const mesh = new THREE.InstancedMesh(bladeGeo, mat, count);
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 6) {
    attempts++;
    const x = THREE.MathUtils.randFloat(boundary.minX + 1, boundary.maxX - 1);
    const z = THREE.MathUtils.randFloat(boundary.minZ + 1, boundary.maxZ - 1);

    const tooClose = obstacles.some((o) => {
      const dx = x - o.x;
      const dz = z - o.z;
      return dx * dx + dz * dz < (o.radius + 0.4) * (o.radius + 0.4);
    });
    if (tooClose) continue;

    dummy.position.set(x, 0, z);
    dummy.rotation.y = Math.random() * Math.PI;
    const s = 0.7 + Math.random() * 0.7;
    dummy.scale.set(s, s * (0.8 + Math.random() * 0.5), s);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/**
 * Populates the scene with decorative trees, rocks and grass, avoiding the
 * play path near the spawn point.
 *
 * Returns both the meshes AND lightweight collision descriptors
 * ({x, z, radius}) so the same layout can be used by:
 *  - the character's collision resolver (Collision.js), and
 *  - the thrown-stone physics world (CannonPhysics.js), which builds real
 *    static bodies from these so stones actually bounce off trees/rocks.
 */
export function populateEnvironment(scene, boundary) {
  const objects = [];
  const obstacles = [];

  const treeSpots = [
    [-11, -9], [11, -8], [-13, 6], [12, 9], [-6, -13], [7, 13], [14, -2], [-14, 1],
  ];
  treeSpots.forEach(([x, z]) => {
    const tree = makeTree();
    tree.position.set(x, 0, z);
    const s = 0.85 + Math.random() * 0.4;
    tree.scale.setScalar(s);
    scene.add(tree);
    objects.push(tree);
    obstacles.push({ x, z, radius: 0.32 * s, height: 3.4 * s, type: 'tree' });
  });

  const rockSpots = [
    [-4, -6, 1.1], [5, -3, 0.7], [-8, 3, 0.9], [3, 8, 1.3], [9, 2, 0.6], [-2, 10, 0.8],
  ];
  rockSpots.forEach(([x, z, s]) => {
    const rock = makeRock(s);
    rock.position.x = x;
    rock.position.z = z;
    scene.add(rock);
    objects.push(rock);
    obstacles.push({ x, z, radius: 0.55 * s, height: 0.5 * s, type: 'rock' });
  });

  const grass = makeGrass(boundary, obstacles);
  scene.add(grass);
  objects.push(grass);

  return { objects, obstacles };
}
