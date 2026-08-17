// camera.js — third-person orbit-follow camera.
import * as THREE from 'three';

export class ThirdPersonCamera {
  constructor({ aspect }) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);

    this.distance = 5.5;
    this.height = 2.1;
    this.yaw = 0; // radians around target, world space
    this.pitch = 0.35; // radians, clamped
    this.minPitch = -0.15;
    this.maxPitch = 1.1;

    this._currentPos = new THREE.Vector3(0, this.height, this.distance);
    this._lookTarget = new THREE.Vector3();
  }

  handleLook(deltaX, deltaY) {
    const sensitivity = 0.0032;
    this.yaw -= deltaX * sensitivity * (window.__lookSensX || 1) * 60;
    this.pitch -= deltaY * sensitivity * 60 * 0.6;
    this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch);
  }

  update(delta, targetPosition) {
    // Camera sits BEHIND the direction it is looking (yaw), so that moving
    // "forward" walks the character away from the camera, matching what the
    // player sees — the standard third-person feel.
    const desiredOffset = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance,
      Math.sin(this.pitch) * this.distance + this.height * 0.4,
      -Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance
    );

    const desiredPos = new THREE.Vector3().copy(targetPosition).add(desiredOffset).add(new THREE.Vector3(0, this.height * 0.5, 0));

    // Smooth follow (frame-rate independent lerp).
    const lerpFactor = 1 - Math.pow(0.0005, delta);
    this._currentPos.lerp(desiredPos, lerpFactor);

    // Avoid camera clipping below ground.
    if (this._currentPos.y < 0.4) this._currentPos.y = 0.4;

    this.camera.position.copy(this._currentPos);

    this._lookTarget.copy(targetPosition).add(new THREE.Vector3(0, 1.2, 0));
    this.camera.lookAt(this._lookTarget);
  }

  getForwardDirection() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }

  onResize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
