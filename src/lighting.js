// lighting.js — sun (directional) + ambient/hemisphere fill.
import * as THREE from 'three';

export function createLighting(scene, quality = 'medium') {
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x3a5a2a, 0.65);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff3d6, 1.15);
  sun.position.set(12, 18, 8);
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
