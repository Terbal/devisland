// PickupSystem.js — places world stones, detects proximity, handles pickup.
import * as THREE from 'three';
import { Stone } from './Stone.js';

const PICKUP_RANGE = 1.4;

export class PickupSystem {
  constructor(scene) {
    this.scene = scene;
    this.worldStones = [];
    this.nearestInRange = null;
  }

  spawnStones(positions) {
    positions.forEach((p) => {
      const stone = new Stone(new THREE.Vector3(p[0], 0.16, p[1]));
      this.scene.add(stone.mesh);
      this.worldStones.push(stone);
    });
  }

  /** Call every frame with the character's world position. Returns the nearest stone in range, or null. */
  update(characterPosition) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const stone of this.worldStones) {
      if (stone.collected) continue;
      const dist = characterPosition.distanceTo(stone.position);
      if (dist < PICKUP_RANGE && dist < nearestDist) {
        nearest = stone;
        nearestDist = dist;
      }
      // Gentle idle bob + spin so stones on the ground read as "alive" objects.
      stone.mesh.rotation.y += 0.01;
      stone.mesh.position.y = 0.16 + Math.sin(performance.now() * 0.002 + stone.id) * 0.03;
    }

    this.nearestInRange = nearest;
    return nearest;
  }

  /** Removes a stone from the world (call after it's added to inventory). */
  collect(stone) {
    stone.collected = true;
    this.scene.remove(stone.mesh);
    this.worldStones = this.worldStones.filter((s) => s.id !== stone.id);
  }
}
