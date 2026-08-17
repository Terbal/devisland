// scene.js — renderer + core scene + ground plane.
import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setSize(window.innerWidth, window.innerHeight);
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd8ff);
  scene.fog = new THREE.Fog(0x9fd8ff, 22, 55);
  return scene;
}

export function createGround(size = 40) {
  const geo = new THREE.PlaneGeometry(size, size, 32, 32);
  geo.rotateX(-Math.PI / 2);

  // Slight vertex noise for a less "flat plastic" look.
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = Math.sin(x * 0.4) * Math.cos(z * 0.4) * 0.05;
    pos.setY(i, y);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ color: 0x4b8f3e, roughness: 1 });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  return ground;
}
