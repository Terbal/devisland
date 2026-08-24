// HeldStone.js
// A small stone mesh attached to the character's own skeleton (or the
// procedural rig's arm, as a fallback), so picking up a stone actually shows
// the character carrying it instead of it just vanishing into the inventory.
//
// Behaviour: visible whenever the selected inventory slot holds at least one
// stone. Parented to the hand attachment point during the PICKUP/THROW
// gestures (so it visually reads as "grabbing" / "about to throw"), and to
// the hip/belt attachment point the rest of the time (so it reads as
// "carried/stored" rather than permanently gripped in a raised hand).

import * as THREE from 'three';

const geometry = new THREE.IcosahedronGeometry(0.14, 0);
const material = new THREE.MeshStandardMaterial({ color: 0x9a9a92, roughness: 0.85, flatShading: true });

export class HeldStone {
  /** @param {THREE.Object3D} characterRoot - has userData.handSlot / userData.hipsBone (see CharacterLoader.js) */
  constructor(characterRoot) {
    this.handSlot = characterRoot.userData.handSlot || null;
    this.hipsBone = characterRoot.userData.hipsBone || null;

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.scale.setScalar(0.9);
    this.mesh.visible = false;
    this.mesh.castShadow = true;

    // Tucked at the side of the hip, like a small pouch — not centered
    // inside the body, which would look like it's floating in the torso.
    this.hipOffset = new THREE.Vector3(0.16, -0.04, 0.1);

    this._attachedTo = null;
  }

  get available() {
    return Boolean(this.handSlot || this.hipsBone);
  }

  setVisible(visible) {
    this.mesh.visible = visible && this.available;
    if (visible && !this._attachedTo) {
      this._attach(this.hipsBone || this.handSlot, this.hipsBone ? this.hipOffset : new THREE.Vector3());
    }
  }

  /** Called every frame with the character's current state — moves the stone
   *  between the hand (during the gesture) and the hip (otherwise). Cheap
   *  no-op if already in the right place. */
  syncToState(state) {
    if (!this.mesh.visible) return;
    if (state === 'PICKUP' || state === 'THROW') {
      this._attach(this.handSlot || this.hipsBone, new THREE.Vector3());
    } else {
      this._attach(this.hipsBone || this.handSlot, this.hipsBone ? this.hipOffset : new THREE.Vector3());
    }
  }

  _attach(target, offset) {
    if (!target || this._attachedTo === target) {
      if (target) this.mesh.position.copy(offset);
      return;
    }
    if (this._attachedTo) this._attachedTo.remove(this.mesh);
    target.add(this.mesh);
    this.mesh.position.copy(offset);
    this.mesh.rotation.set(0, 0, 0);
    this._attachedTo = target;
  }
}
