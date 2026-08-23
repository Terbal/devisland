// lighting.js — sun (directional) + ambient/hemisphere fill.
// Tuned to match the golden-hour sky in scene.js: a warmer, lower sun and a
// hemisphere fill that samples the same peach/teal palette.
import * as THREE from 'three';

export function createLighting(scene, quality = 'medium') {
  const hemi = new THREE.HemisphereLight(0x9fd0e8, 0x3a5a2a, 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffcf8a, 1.25);
  sun.position.set(12, 15, 8);
  sun.castShadow = true;

  const shadowMapSizes = { low: 512, medium: 1024, high: 2048 };
  const size = shadowMapSizes[quality] || 1024;
  sun.shadow.mapSize.set(size, size);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 50;
  sun.shadow.bias = -0.0025;

  scene.add(sun);
  scene.add(sun.target);

  return { hemi, sun };
}
