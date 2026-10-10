// Characters. Until real models arrive, each role uses a stand-in.
// To use a real model: drop a .glb into src/assets/characters/ and register it in MODELS below,
// e.g. import fisherman from '../assets/characters/fisherman.glb?url'; MODELS.elder = fisherman;
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makePeakCharacter } from './placeholder.js';

export const MODELS = {}; // role -> url of a .glb file
const loader = new GLTFLoader();

const LOOKS = {
  market: { skin: 0x5fd6d6, hat: 'beret', expr: 'cat', look: [0, 4], pose: 'hold', blush: 'rgba(40,150,160,0.55)', seed: 1 },
  upgrader: { skin: 0xa77be0, shirt: 0x3a2f5a, shorts: 0x23203a, collar: 0xf2c94c, strap: 0xd8a93a, hat: 'beanie', hatColor: 0x2b2b2b, pom: 0xf2c94c, expr: 'smug', look: [10, 0], pose: 'point', seed: 2 },
  elder: { skin: 0xf29a2e, shirt: 0xc9dba0, shorts: 0x6b4a2e, beard: 0xf4f1ea, bushyBrows: true, browColor: '#f4f1ea', noMouth: true, hat: 'bucket', hatColor: 0xc9b07a, expr: 'happy', look: [0, 4], pose: 'wave', seed: 3 },
  sailor: { skin: 0x7fa39c, coat: 0xf2c230, hat: 'souwester', beard: 0xd9d6cc, bushyBrows: true, browColor: '#d9d6cc', noMouth: true, expr: 'sleepy', pose: 'down', shoes: 0x2a2a2a, seed: 4 },
  kid: { skin: 0xf5cf3a, shirt: 0xf4f0e6, shorts: 0xc4453a, collar: 0xe8503a, hat: 'propeller', expr: 'star', look: [0, 0], pose: 'hips', seed: 5 },
  cook: { skin: 0xff8fa8, shirt: 0xbfe0f2, shorts: 0x3f6f4a, hat: 'chef', expr: 'happy', pose: 'down', seed: 6 },
  captain: { skin: 0x8fd16a, shirt: 0xf4f2ea, shorts: 0x23304a, collar: 0x23304a, hat: 'captain', expr: 'happy', pose: 'hips', seed: 7 },
};

export function makeNPC(role, extra = {}) {
  const g = new THREE.Group(); g.userData.dynamic = true; g.userData.role = role;
  const stand = makePeakCharacter({ ...(LOOKS[role] ?? LOOKS.kid), ...extra });
  g.add(stand);
  if (MODELS[role]) {
    loader.load(MODELS[role], gltf => {
      const m = gltf.scene; const box = new THREE.Box3().setFromObject(m); const h = box.max.y - box.min.y || 1;
      m.scale.setScalar(1.9 / h); m.position.y = -box.min.y * (1.9 / h);
      m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      g.remove(stand); g.add(m);
      if (gltf.animations?.length) { const mixer = new THREE.AnimationMixer(m); mixer.clipAction(gltf.animations[0]).play(); g.userData.mixer = mixer; }
    });
  }
  return g;
}
