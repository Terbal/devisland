// CharacterController.js
// Owns the character's transform, velocity and state machine.
// Reads only from `input` (already abstracted by InputManager) and
// from `cameraYaw` for movement- and throw-direction relative to the camera.

import * as THREE from 'three';
import { CharacterAnimations, THROW_RELEASE_FRACTION } from './CharacterAnimations.js';
import { resolveCharacterCollisions } from '../physics/Collision.js';

const WALK_SPEED = 2.4;
const RUN_SPEED = 5.2;
const JUMP_VELOCITY = 6.2;
const GRAVITY = 18;
const TURN_LERP = 0.22;
const CHARACTER_RADIUS = 0.32;

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
  /**
   * @param {THREE.Object3D} characterRoot - from CharacterLoader.loadCharacter()
   * @param {object|null} riggedData - { mixer, clips } if a real .glb was loaded, else null
   */
  constructor({ scene, characterRoot, riggedData, boundary, obstacles, onRequestPickup, onThrowRelease }) {
    this.mesh = characterRoot;
    this.mesh.position.set(0, 0, 4);
    scene.add(this.mesh);

    this.animations = new CharacterAnimations(this.mesh, riggedData);

    this.velocityY = 0;
    this.grounded = true;
    this.state = States.IDLE;

    this.boundary = boundary;
    this.obstacles = obstacles || [];
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

  /**
   * @param {number} cameraYaw - the camera's current yaw, so the throw always
   *   goes toward what the player is actually looking at.
   */
  requestThrow(cameraYaw) {
    if (!this.canAcceptNewAction() || !this.grounded) return false;

    // Snap the character to face the camera direction BEFORE playing the
    // throw animation. This is the fix for the "stone flies off to the side"
    // problem: previously the avatar could stay side-on (profile) to the
    // camera while the projectile still launched along the camera's forward
    // vector, so the arm swing and the stone's actual path didn't match.
    // Now the body turns to face the throw direction first, so what the
    // player sees (the arm swinging forward) matches where the stone goes.
    this.facingAngle = cameraYaw;
    this.mesh.rotation.y = this.facingAngle;

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
      const releaseAt = this.animations.getThrowDuration() * THROW_RELEASE_FRACTION;
      if (!this._throwReleased && this.animations.throwTimer >= releaseAt) {
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
      // moveY: -1 forward, +1 backward; moveX: -1 left, +1 right (input convention).
      // NOTE: the camera's world-space "right" vector for a given yaw works out to
      // (-cos(yaw), sin(yaw)) — using +moveX here (as a previous version did)
      // pointed the character the opposite way, so pressing "right" walked left
      // and vice versa. Negating moveX fixes it.
      const targetAngle = cameraYaw + Math.atan2(-moveX, -moveY);
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

    // ---- Collision (trees/rocks) + boundary walls ----
    resolveCharacterCollisions(this.mesh.position, CHARACTER_RADIUS, this.obstacles, this.boundary);

    // ---- Orientation ----
    this.mesh.rotation.y = this.facingAngle;

    // ---- One-shot action requests (pickup / throw) ----
    if (input.pickup) {
      if (this.requestPickup()) return;
    }
    if (input.throwAction) {
      if (this.requestThrow(cameraYaw)) return;
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
