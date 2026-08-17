// Environment.js — decorative low-poly trees & rocks (no external assets needed).
import * as THREE from 'three';

function makeTree() {
  const group = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 1 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2f7d3a, roughness: 0.9, flatShading: true });
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
  // Deform slightly for a less uniform, more natural rock silhouette.
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

  const mat = new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 1, flatShading: true });
  const rock = new THREE.Mesh(geo, mat);
  rock.position.y = 0.25 * scale;
  rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

/**
 * Populates the scene with decorative trees and rocks, avoiding the
 * play path near the spawn point. Purely visual — not collidable in V1.
 */
export function populateEnvironment(scene, boundary) {
  const objects = [];

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
  });

  return objects;
}
