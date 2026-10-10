// The faceless god, sculpted as one carved marble figure (height 10 units, feet at y = 0).
import * as THREE from 'three';
import { V, sculpt, sphere, ellipsoid, capsule, roundBox, smin, smax, vnoise3 } from './sdf.js';

const cone = (y0, y1, r0, r1, cx = 0, cz = 0) => (x, y, z) => {
  const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
  const rr = r0 + (r1 - r0) * t; const len = Math.hypot(x - cx, z - cz);
  const slope = (r1 - r0) / (y1 - y0);
  const dRad = (len - rr) / Math.sqrt(1 + slope * slope);
  return Math.max(dRad, y0 - y, y - y1);
};

export function makeGodStatue({ step = 0.04 } = {}) {
  const marble = new THREE.Color(0xebe5d8), vein = new THREE.Color(0xb9b2a4), raw = new THREE.Color(0xc2baab), shade = new THREE.Color(0xd9d2c3);
  const faceCut = (x, y, z) => {
    // a rough slab chiseled off the front of the face
    const n = vnoise3(x * 6, y * 6, z * 6) * 0.08;
    return roundBox(V(0, 8.55, 0.78), V(0.36, 0.42, 0.3), 0.06)(x, y, z) + n;
  };
  const marbleColor = (x, y, z) => {
    if (faceCut(x, y, z) < 0.06 && z > 0.3 && y > 8.05) return raw.clone().offsetHSL(0, 0, (vnoise3(x * 9, y * 9, z * 9) - 0.5) * 0.1);
    const v = Math.abs(Math.sin((x * 1.3 + y * 0.7 + vnoise3(x * 1.7, y * 1.7, z * 1.7) * 3.5) * 2.2));
    const c = marble.clone().lerp(vein, Math.max(0, 0.12 - v) * 5);
    return c.lerp(shade, vnoise3(x * 3, y * 3, z * 3) * 0.25);
  };
  const robe = (x, y, z) => {
    const ang = Math.atan2(z, x - 0.05);
    const folds = (0.06 * Math.sin(ang * 15 + Math.sin(y * 1.1) * 0.8) + 0.035 * Math.sin(ang * 6.3 + y * 0.4)) * Math.min(1, Math.max(0, (5.6 - y) / 1.2));
    const sway = 0.08 * Math.sin(y * 0.6);
    return cone(0.05, 6.3, 1.25, 0.8, 0.05 + sway * 0.3, 0.02)(x, y, z) - folds * (1 - y / 6.5) + (vnoise3(x * 4, y * 4, z * 4) - 0.5) * 0.03;
  };
  const sash = (x, y, z) => Math.min(
    capsule(V(-0.78, 7.35, 0.18), V(0.02, 6.3, 0.6), 0.26)(x, y, z),
    capsule(V(0.02, 6.3, 0.6), V(0.8, 5.25, 0.5), 0.27)(x, y, z),
    capsule(V(0.8, 5.25, 0.5), V(0.86, 4.75, 0.4), 0.22)(x, y, z),
    capsule(V(-0.78, 7.35, 0.18), V(-0.75, 6.5, -0.6), 0.25)(x, y, z),
    capsule(V(-0.75, 6.5, -0.6), V(-0.4, 4.6, -0.75), 0.24)(x, y, z),
  ) - 0.03 * Math.sin(y * 9 + x * 4);
  const hair = (x, y, z) => ellipsoid(V(0, 8.72, -0.06), V(0.55, 0.52, 0.55))(x, y, z) - (vnoise3(x * 7, y * 7, z * 7) - 0.4) * 0.09;
  const beard = (x, y, z) => ellipsoid(V(0, 8.12, 0.3), V(0.4, 0.46, 0.32))(x, y, z) - (vnoise3(x * 8, y * 8, z * 8) - 0.4) * 0.1;
  const parts = [
    { f: robe, color: marbleColor },
    { f: ellipsoid(V(0.02, 5.75, 0.02), V(0.82, 0.85, 0.58)), k: 0.35, color: marbleColor },
    { f: ellipsoid(V(0, 6.65, 0.04), V(1.08, 1.08, 0.64)), k: 0.3, color: marbleColor },
    { f: sash, k: 0.12, color: marbleColor },
    { f: ellipsoid(V(0.98, 7.32, 0), V(0.42, 0.4, 0.42)), k: 0.2, color: marbleColor },
    { f: ellipsoid(V(-0.98, 7.32, 0), V(0.42, 0.4, 0.42)), k: 0.2, color: marbleColor },
    { f: capsule(V(0, 7.45, 0), V(0, 8.05, 0.06), 0.3), k: 0.15, color: marbleColor },
    { f: ellipsoid(V(0, 8.55, 0.06), V(0.47, 0.57, 0.52)), k: 0.12, color: marbleColor },
    { f: hair, k: 0.06, color: marbleColor },
    { f: beard, k: 0.08, color: marbleColor },
    // right arm raised to hold the trident
    { f: capsule(V(1.02, 7.3, 0), V(1.62, 8.3, 0.12), 0.29, 0.24), k: 0.14, color: marbleColor },
    { f: capsule(V(1.62, 8.3, 0.12), V(1.76, 9.35, 0.16), 0.23, 0.19), k: 0.08, color: marbleColor },
    { f: sphere(V(1.78, 9.55, 0.16), 0.25), k: 0.06, color: marbleColor },
    // left arm lowered, holding a fish forward
    { f: capsule(V(-1.02, 7.3, 0), V(-1.28, 6.05, 0.14), 0.28, 0.23), k: 0.14, color: marbleColor },
    { f: capsule(V(-1.28, 6.05, 0.14), V(-1.05, 5.0, 0.62), 0.22, 0.18), k: 0.08, color: marbleColor },
    { f: sphere(V(-1.0, 4.85, 0.72), 0.23), k: 0.06, color: marbleColor },
    // feet under the hem
    { f: ellipsoid(V(0.38, 0.14, 0.95), V(0.24, 0.16, 0.42)), k: 0.1, color: marbleColor },
    { f: ellipsoid(V(-0.36, 0.14, 0.9), V(0.24, 0.16, 0.42)), k: 0.1, color: marbleColor },
    { f: faceCut, sub: true, k: 0.04 },
  ];
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42 });
  const body = sculpt(parts, { min: V(-2.0, -0.05, -1.5), max: V(2.4, 9.95, 1.6), step, material: mat });
  const grp = new THREE.Group(); grp.add(body);
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8a93a, metalness: 1, roughness: 0.28, emissive: 0xb07818, emissiveIntensity: 0.45 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 12.2, 12), gold); shaft.position.set(1.78, 6.4, 0.16); grp.add(shaft);
  const head = new THREE.Group(); head.position.set(1.78, 12.5, 0.16); grp.add(head);
  const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.75, 4, 8), gold); bar.rotation.z = Math.PI / 2; head.add(bar);
  for (const dx of [-0.42, 0, 0.42]) { const pr = new THREE.Mesh(new THREE.ConeGeometry(0.08, dx === 0 ? 1.15 : 0.85, 10), gold); pr.position.set(dx, dx === 0 ? 0.62 : 0.45, 0); head.add(pr); const side = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), gold); side.position.set(dx, 0.1, 0); head.add(side); }
  // gold fish in the left hand
  const fish = new THREE.Group(); fish.position.set(-1.0, 4.85, 0.95); fish.rotation.set(0.1, 0.3, -0.25); grp.add(fish);
  const fb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), gold); fb.scale.set(1, 0.42, 0.22); fish.add(fb);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.4, 3), gold); tail.rotation.z = Math.PI / 2; tail.scale.z = 0.25; tail.position.x = -0.6; fish.add(tail);
  // laurel wreath
  const laurel = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.055, 8, 40), gold); laurel.position.set(0, 8.86, -0.02); laurel.rotation.x = Math.PI / 2 + 0.2; grp.add(laurel);
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; if (Math.sin(a) > 0.75) continue; const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), gold); leaf.scale.set(1, 0.4, 0.5); leaf.position.set(Math.cos(a) * 0.53, 8.86 + Math.sin(a) * 0.1, Math.sin(a) * 0.52 - 0.02); grp.add(leaf); }
  grp.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return grp;
}
