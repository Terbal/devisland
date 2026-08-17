// Stone.js — the pickup-able / throwable stone object.
import * as THREE from 'three';

let nextId = 1;
const RADIUS = 0.16;

const geometry = new THREE.IcosahedronGeometry(RADIUS, 0);
const material = new THREE.MeshStandardMaterial({ color: 0x9a9a92, roughness: 0.85, flatShading: true });

export class Stone {
  /** @param {THREE.Vector3} position */
  constructor(position) {
    this.id = nextId++;
    this.type = 'stone';
    this.collected = false;

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.stoneId = this.id;

    // Only relevant once thrown:
    this.velocity = new THREE.Vector3();
    this.grounded = true;
    this.radius = RADIUS;
    this.isProjectile = false;
  }

  get position() {
    return this.mesh.position;
  }
}
