// CharacterController.js
// Owns the character's transform, velocity and state machine.
// Reads only from `input` (already abstracted by InputManager) and
// from `cameraRig.yaw` for movement-relative-to-camera direction.

import * as THREE from 'three';
import { buildCharacter } from './Character.js';
import { CharacterAnimations, THROW_RELEASE_FRACTION } from './CharacterAnimations.js';

const WALK_SPEED = 2.4;
const RUN_SPEED = 5.2;
const JUMP_VELOCITY = 6.2;
const GRAVITY = 18;
const TURN_LERP = 0.22;

export const States = {
  IDLE: 'IDLE',
  WALK: 'WALK',
  RUN: 'RUN',
  JUMP: 'JUMP',
  FALL: 'FALL',
  PICKUP: 'PICKUP',
  THROW: 'THROW',
};

export class CharacterController {
  constructor({ scene, boundary, onRequestPickup, onThrowRelease }) {
    this.mesh = buildCharacter();
    this.mesh.position.set(0, 0, 4);
    scene.add(this.mesh);

    this.animations = new CharacterAnimations(this.mesh);

    this.velocityY = 0;
    this.grounded = true;
    this.state = States.IDLE;

    this.boundary = boundary;
    this.onRequestPickup = onRequestPickup;
    this.onThrowRelease = onThrowRelease;
    this._throwReleased = false;

    this.facingAngle = 0; // radians, world space
  }

  get position() {
    return this.mesh.position;
  }

  /** World-space forward direction the character currently faces. */
  getForward() {
    return new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
  }

  canAcceptNewAction() {
    return this.state !== States.PICKUP && this.state !== States.THROW;
  }

  requestPickup() {
    if (!this.canAcceptNewAction() || !this.grounded) return false;
    this.state = States.PICKUP;
    this.animations.setState(States.PICKUP);
    return true;
  }

  requestThrow() {
    if (!this.canAcceptNewAction() || !this.grounded) return false;
    this.state = States.THROW;
    this._throwReleased = false;
    this.animations.setState(States.THROW);
    return true;
  }

  update(delta, input, cameraYaw) {
    const moveX = input.moveX || 0;
    const moveY = input.moveY || 0;
    const hasMoveInput = Math.abs(moveX) > 0.05 || Math.abs(moveY) > 0.05;
    const running = input.run && hasMoveInput;

    // ---- Locked states: let the animation finish, no movement ----
    if (this.state === States.PICKUP) {
      this.animations.update(delta, States.PICKUP);
      if (this.animations.isPickupFinished()) {
        this.state = States.IDLE;
        this.onRequestPickup && this.onRequestPickup();
      }
      return;
    }

    if (this.state === States.THROW) {
      this.animations.update(delta, States.THROW);
      if (!this._throwReleased && this.animations.throwTimer >= 0.45 * THROW_RELEASE_FRACTION) {
        this._throwReleased = true;
        this.onThrowRelease && this.onThrowRelease();
      }
      if (this.animations.isThrowFinished()) {
        this.state = States.IDLE;
      }
      return;
    }

    // ---- Movement (camera-relative) ----
    let speed = 0;
    if (hasMoveInput) {
      // moveY: -1 forward, +1 backward (from input convention); moveX: -1 left, +1 right
      const targetAngle = cameraYaw + Math.atan2(moveX, -moveY);
      let diff = targetAngle - this.facingAngle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facingAngle += diff * TURN_LERP;

      speed = running ? RUN_SPEED : WALK_SPEED;
      const forward = this.getForward();
      this.mesh.position.addScaledVector(forward, speed * delta);
    }

    // ---- Jump / gravity ----
    if (this.grounded && input.jump) {
      this.velocityY = JUMP_VELOCITY;
      this.grounded = false;
    }

    if (!this.grounded) {
      this.velocityY -= GRAVITY * delta;
      this.mesh.position.y += this.velocityY * delta;
      if (this.mesh.position.y <= 0) {
        this.mesh.position.y = 0;
        this.grounded = true;
        this.velocityY = 0;
      }
    }

    // ---- Boundary clamp ----
    const b = this.boundary;
    this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, b.minX, b.maxX);
    this.mesh.position.z = THREE.MathUtils.clamp(this.mesh.position.z, b.minZ, b.maxZ);

    // ---- Orientation ----
    this.mesh.rotation.y = this.facingAngle;

    // ---- One-shot action requests (pickup / throw) ----
    if (input.pickup) {
      if (this.requestPickup()) return;
    }
    if (input.throwAction) {
      if (this.requestThrow()) return;
    }

    // ---- State resolution ----
    if (!this.grounded) {
      this.state = this.velocityY > 0.2 ? States.JUMP : States.FALL;
    } else if (hasMoveInput) {
      this.state = running ? States.RUN : States.WALK;
    } else {
      this.state = States.IDLE;
    }

    const speedFactor = speed / RUN_SPEED;
    this.animations.update(delta, this.state, speedFactor);
  }
}
