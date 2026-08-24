// scene.js — renderer + core scene + sky dome + ground plane.
import * as THREE from 'three';

// Golden-hour palette: warm peach near the horizon, cool teal at the zenith —
// matches the HUD's moss/gold identity instead of a flat cartoon blue.
const SKY_HORIZON = new THREE.Color(0xffd9a0);
const SKY_ZENITH = new THREE.Color(0x4f9bc9);
const FOG_COLOR = new THREE.Color(0xf2c98a);

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
  scene.background = SKY_ZENITH.clone();
  scene.fog = new THREE.Fog(FOG_COLOR.getHex(), 20, 52);
  return scene;
}

/** A large inverted sphere with a vertical gradient — cheap, no extra draw-call heavy shader complexity. */
export function createSky(radius = 90) {
  const geo = new THREE.SphereGeometry(radius, 20, 14);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: SKY_ZENITH.clone() },
      bottomColor: { value: SKY_HORIZON.clone() },
      offset: { value: 12 },
      exponent: { value: 0.65 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.renderOrder = -1;
  return sky;
}

export function createGround(size = 40) {
  const geo = new THREE.PlaneGeometry(size, size, 48, 48);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const deepGreen = new THREE.Color(0x3f7a3c);
  const meadowGreen = new THREE.Color(0x6fae4e);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Gentle rolling noise for a less "flat plastic" look.
    const bump = Math.sin(x * 0.35) * Math.cos(z * 0.35) * 0.06 + Math.sin(x * 0.9 + z * 0.6) * 0.015;
    pos.setY(i, bump);

    // Two-tone patchy meadow: blend based on a second, unrelated noise field
    // so color patches don't just trace the height bumps (would look flat/fake).
    const patch = (Math.sin(x * 0.22 + 1.7) * Math.cos(z * 0.17 - 0.4) + 1) * 0.5;
    tmp.copy(deepGreen).lerp(meadowGreen, patch);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  return ground;
}
