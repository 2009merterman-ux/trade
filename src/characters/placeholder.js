// Ball-head characters with drawn faces and patterned clothes (original designs in the style the user referenced).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, rng } from '../world/common.js';

const hex = c => '#' + new THREE.Color(c).getHexString();
const shade = (c, l) => '#' + new THREE.Color(c).offsetHSL(0, 0, l).getHexString();

// ---------- textures ----------
function faceTexture(o) {
  const skin = hex(o.skin);
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    // soft painted variation
    const r = rng(o.seed ?? 3);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.035})`; g.beginPath(); g.arc(r() * w, r() * h, 6 + r() * 26, 0, 7); g.fill(); }
    const cx = 256, cy = 262; // u = 0.25 faces +z on a three.js sphere
    const K = 1.45; g.save(); g.translate(cx, cy); g.scale(K, K); g.translate(-cx, -cy);
    const ex = 64, ey = cy - 18, er = o.eyeR ?? 31;
    const look = o.look ?? [6, 2];
    const expr = o.expr ?? 'happy';
    // blush
    g.fillStyle = o.blush ?? 'rgba(255,120,140,0.55)';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 98, cy + 34, 24, 15, 0, 0, 7); g.fill(); }
    // eyes
    for (const s of [-1, 1]) {
      const x = cx + s * ex;
      if (expr === 'sleepy') { g.strokeStyle = '#151226'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.arc(x, ey + 4, er * 0.7, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); continue; }
      g.fillStyle = '#fbf6e8'; g.beginPath(); g.ellipse(x, ey, er, er * 1.05, 0, 0, 7); g.fill();
      g.fillStyle = '#0b1340'; g.beginPath(); g.ellipse(x + look[0], ey + look[1], er * 0.66, er * 0.74, 0, 0, 7); g.fill();
      if (expr === 'star') { g.fillStyle = '#ffffff'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? 6 : 15; g.lineTo(x + look[0] + Math.cos(a) * rr, ey + look[1] + Math.sin(a) * rr); } g.fill(); }
      else { g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x + look[0] + 8, ey + look[1] - 10, 6, 0, 7); g.fill(); }
      if (expr === 'smug' || expr === 'grumpy') { g.fillStyle = skin; g.beginPath(); g.ellipse(x, ey - er * 0.55, er * 1.2, er * 0.62, 0, 0, 7); g.fill(); g.strokeStyle = '#151226'; g.lineWidth = 5; g.beginPath(); g.moveTo(x - er * 1.0, ey - er * 0.1); g.lineTo(x + er * 1.0, ey - er * 0.1); g.stroke(); }
    }
    // brows: little dots, or angled bars
    for (const s of [-1, 1]) {
      const x = cx + s * (ex + 4), y = ey - er - 22;
      g.fillStyle = o.browColor ?? '#120c08';
      g.save(); g.translate(x, y);
      if (expr === 'grumpy') { g.rotate(s * 0.45); g.beginPath(); g.roundRect(-20, -6, 40, 12, 6); g.fill(); }
      else if (o.bushyBrows) { g.rotate(s * -0.12); g.beginPath(); g.ellipse(0, 0, 26, 12, 0, 0, 7); g.fill(); }
      else { g.rotate(s * -0.2); g.beginPath(); g.ellipse(0, 0, 15, 11, 0, 0, 7); g.fill(); }
      g.restore();
    }
    // mouth
    if (!o.noMouth) {
      g.strokeStyle = '#151226'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
      const my = cy + 46;
      g.beginPath();
      if (expr === 'cat') { g.moveTo(cx - 22, my - 4); g.quadraticCurveTo(cx - 11, my + 12, cx, my); g.quadraticCurveTo(cx + 11, my + 12, cx + 22, my - 4); }
      else if (expr === 'grumpy') { g.moveTo(cx - 16, my + 4); g.quadraticCurveTo(cx, my - 4, cx + 16, my + 4); }
      else if (expr === 'smug') { g.moveTo(cx - 14, my); g.quadraticCurveTo(cx + 6, my + 10, cx + 22, my - 6); }
      else if (expr === 'sleepy') { g.moveTo(cx - 8, my + 2); g.lineTo(cx + 8, my + 2); }
      else { g.moveTo(cx - 20, my - 2); g.quadraticCurveTo(cx, my + 16, cx + 20, my - 2); }
      g.stroke();
    }
    g.restore();
  });
}
function clothTex(color, mark, seed = 1, opts = {}) {
  const r = rng(seed);
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = hex(color); g.fillRect(0, 0, w, h);
    g.fillStyle = mark ?? shade(color, -0.1);
    for (let i = 0; i < 520; i++) { const x = r() * w, y = r() * h; g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.3); g.beginPath(); g.roundRect(-2.5, -7, 5, 14, 2.5); g.fill(); g.restore(); }
    if (opts.placket) { g.strokeStyle = shade(color, -0.16); g.lineWidth = 5; g.beginPath(); g.moveTo(w * 0.25, 0); g.lineTo(w * 0.25, h); g.stroke(); g.fillStyle = shade(color, -0.25); for (let y = 60; y < h; y += 90) { g.beginPath(); g.arc(w * 0.25 + 10, y, 6, 0, 7); g.fill(); } }
    if (opts.pockets) { g.strokeStyle = shade(color, -0.14); g.lineWidth = 4; for (const x of [w * 0.17, w * 0.33]) g.strokeRect(x - 26, h * 0.3, 52, 46); }
  });
}
const sockTex = () => canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#f3efe2'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9c3b2'; for (let x = 0; x < w; x += 22) g.fillRect(x, 0, 6, h); g.fillStyle = '#e2dccb'; g.fillRect(0, 0, w, 14); });
const shoeTex = (c) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = hex(c); g.fillRect(0, 0, w, h); g.fillStyle = shade(c, 0.1); for (const y of [80, 110]) g.fillRect(40, y, 120, 10); g.fillStyle = shade(c, -0.15); g.fillRect(0, h - 40, w, 40); });

// ---------- geometry helpers ----------
function limb(a, b, r, mat, r2) {
  const len = a.distanceTo(b);
  const geo = r2 ? new THREE.CylinderGeometry(r2, r, len, 18, 1) : new THREE.CapsuleGeometry(r, len, 8, 18);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
const lathe = (pts, mat, seg = 40) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat);

export function makePeakCharacter(o = {}) {
  const g = new THREE.Group();
  const skin = new THREE.Color(o.skin ?? 0xf29a2e);
  const M = (opt) => new THREE.MeshStandardMaterial({ roughness: 0.88, ...opt });
  const skinM = M({ color: skin });
  const shirtC = o.shirt ?? 0xefe3a0, shortsC = o.shorts ?? 0x4f7fa6;
  const shirtM = M({ map: clothTex(shirtC, null, 3, { placket: true, pockets: true }) });
  const sleeveM = M({ map: clothTex(shirtC, null, 5) });
  const shortsM = M({ map: clothTex(shortsC, null, 7) });
  const collarM = M({ color: o.collar ?? 0x9fd3e0 });
  const strapM = M({ color: o.strap ?? 0x2f4258, roughness: 0.7 });

  // legs, socks, shoes
  const shoeM = M({ map: shoeTex(o.shoes ?? 0x7a3f2a), roughness: 0.6 });
  const sockM = M({ map: sockTex() });
  for (const s of [-1, 1]) {
    const x = s * 0.13;
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.13, 0.32, 4, 0.06), shoeM); shoe.position.set(x, 0.065, 0.04); g.add(shoe);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.2, 18), sockM); sock.position.set(x, 0.22, 0); g.add(sock);
    g.add(limb(new THREE.Vector3(x, 0.3, 0), new THREE.Vector3(x, 0.5, 0), 0.075, skinM));
    const leg = lathe([[0.0, 0.43], [0.115, 0.43], [0.125, 0.52], [0.12, 0.6], [0, 0.62]], shortsM, 24); leg.position.x = x; g.add(leg);
  }
  // hips + shirt torso
  const hips = lathe([[0, 0.52], [0.25, 0.52], [0.27, 0.6], [0.27, 0.66], [0, 0.66]], shortsM); hips.scale.z = 0.8; g.add(hips);
  const coatLen = o.coat ? 0.3 : 0;
  const torso = lathe([[0, 0.6 - coatLen], [0.27 + coatLen * 0.25, 0.6 - coatLen], [0.29, 0.72], [0.305, 0.86], [0.29, 0.98], [0.2, 1.04], [0.1, 1.07], [0, 1.08]], o.coat ? M({ map: clothTex(o.coat, null, 9, { placket: true }), roughness: 0.55 }) : shirtM);
  torso.scale.z = 0.8; torso.rotation.y = -Math.PI / 2; g.add(torso);
  // collar flaps
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 3), o.coat ? M({ color: new THREE.Color(o.coat).offsetHSL(0, 0, -0.1) }) : collarM); c.scale.z = 0.25; c.rotation.set(0.3, 0, s * 2.2); c.position.set(s * 0.07, 1.0, 0.2); g.add(c); }
  // strap across the chest with a little bag
  if (o.strapOn !== false && !o.coat) {
    const prof = [[0.27, 0.6], [0.29, 0.72], [0.305, 0.86], [0.29, 0.98], [0.2, 1.04], [0.1, 1.07]];
    const rAt = y => { if (y <= prof[0][1]) return prof[0][0]; for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return prof.at(-1)[0]; };
    const pts = []; const tilt = 0.82;
    for (let i = 0; i < 64; i++) { const t = i / 64 * Math.PI * 2; const x0 = Math.cos(t) * 0.32, z0 = Math.sin(t); const y = Math.min(1.06, Math.max(0.62, 0.83 + Math.cos(t) * Math.sin(tilt) * 0.42)); const th = Math.atan2(z0, x0 * Math.cos(tilt)); const R = rAt(y) + 0.03; pts.push(new THREE.Vector3(Math.cos(th) * R, y, Math.sin(th) * R * 0.8)); }
    const strap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, 0.036, 8, true), strapM); strap.scale.set(1, 1, 1); g.add(strap);
    const bag = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.14, 0.07, 3, 0.03), M({ color: o.bag ?? 0x8a5a32 })); bag.position.set(0.24, 0.62, 0.12); bag.rotation.y = 0.6; g.add(bag);
  }
  // arms
  const pose = o.pose ?? 'down';
  const sh = [new THREE.Vector3(-0.3, 0.95, 0), new THREE.Vector3(0.3, 0.95, 0)];
  const elbows = { down: [[-0.4, 0.74, 0.02], [0.4, 0.74, 0.02]], wave: [[-0.4, 0.74, 0.02], [0.52, 1.06, 0.06]], hold: [[-0.38, 0.75, 0.08], [0.38, 0.75, 0.08]], point: [[-0.4, 0.74, 0.02], [0.52, 0.9, 0.16]], hips: [[-0.46, 0.8, -0.05], [0.46, 0.8, -0.05]] }[pose];
  const hands = { down: [[-0.43, 0.52, 0.05], [0.43, 0.52, 0.05]], wave: [[-0.43, 0.52, 0.05], [0.58, 1.3, 0.1]], hold: [[-0.3, 0.68, 0.32], [0.3, 0.68, 0.32]], point: [[-0.43, 0.52, 0.05], [0.74, 0.96, 0.36]], hips: [[-0.3, 0.64, 0.12], [0.3, 0.64, 0.12]] }[pose];
  for (let i = 0; i < 2; i++) {
    const a = sh[i], e = new THREE.Vector3(...elbows[i]), hnd = new THREE.Vector3(...hands[i]);
    const dir = e.clone().sub(a).normalize();
    const sleeveEnd = a.clone().add(dir.clone().multiplyScalar(0.15));
    g.add(limb(a.clone().add(dir.clone().multiplyScalar(-0.03)), sleeveEnd, 0.105, o.coat ? M({ map: clothTex(o.coat, null, 11), roughness: 0.55 }) : sleeveM, 0.115));
    g.add(limb(sleeveEnd, e, 0.072, o.coat ? M({ color: o.coat, roughness: 0.55 }) : skinM));
    g.add(limb(e, hnd, 0.078, o.coat && o.longSleeves ? M({ color: o.coat }) : skinM));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 14), skinM); hand.scale.set(1, 0.9, 1.1); hand.position.copy(hnd); g.add(hand);
    const thumb = limb(hnd.clone().add(new THREE.Vector3(i ? -0.05 : 0.05, 0.03, 0.05)), hnd.clone().add(new THREE.Vector3(i ? -0.07 : 0.07, 0.07, 0.08)), 0.03, skinM); g.add(thumb);
  }
  // the ball head with a drawn face
  const headR = o.headR ?? 0.43;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 64, 48), M({ map: faceTexture({ skin, ...o }), roughness: 0.8 }));
  head.position.set(0, 1.03 + headR * 0.92, 0.02); head.rotation.y = o.headTurn ?? 0; head.rotation.z = o.headTilt ?? 0; g.add(head);
  const hy = head.position.y;
  if (o.beard) {
    const geo = new THREE.SphereGeometry(headR * 0.62, 32, 20, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65); const p = geo.attributes.position; const rr = rng(5);
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); v.multiplyScalar(1 + (Math.sin(v.x * 40) * Math.sin(v.y * 40) * 0.05 + (rr() - 0.5) * 0.04)); p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    const beard = new THREE.Mesh(geo, M({ color: o.beard, roughness: 1 })); beard.scale.set(0.95, 0.9, 0.7); beard.position.set(0, hy - headR * 0.5, headR * 0.6); g.add(beard);
    const mus = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 6, 12), M({ color: o.beard, roughness: 1 })); mus.rotation.z = Math.PI / 2; mus.position.set(0, hy - headR * 0.3, headR * 0.92); g.add(mus);
  }
  // hats
  const hatM = M({ color: o.hatColor ?? 0x111111, roughness: 0.8 });
  const top = hy + headR;
  const hat = new THREE.Group(); g.add(hat);
  if (o.hat === 'beret') { const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 16), hatM); b.scale.set(1, 0.32, 1); b.position.set(0.06, top + 0.02, -0.02); b.rotation.z = -0.25; hat.add(b); const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.06, 8), hatM); nub.position.set(0.04, top + 0.1, -0.02); hat.add(nub); }
  if (o.hat === 'bucket') { const b = lathe([[0, top + 0.16], [0.24, top + 0.15], [0.29, top - 0.02], [0.44, top - 0.08], [0.46, top - 0.1], [0.3, top - 0.06], [0, top - 0.06]], hatM); hat.add(b); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.292, 0.3, 0.05, 32, 1, true), M({ color: o.bandColor ?? 0x3a2a1a })); band.position.y = top + 0.0; hat.add(band); hat.rotation.z = -0.08; }
  if (o.hat === 'chef') { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.16, 32), M({ color: 0xf2eee2 })); band.position.y = top - 0.02; hat.add(band); for (const [x, z] of [[0, 0], [0.13, 0.06], [-0.13, 0.06], [0.06, -0.12], [-0.08, -0.1]]) { const puff = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), M({ color: 0xf6f2e6 })); puff.position.set(x, top + 0.16, z); hat.add(puff); } }
  if (o.hat === 'beanie') { const b = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.03, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.3), M({ map: canvasTex(256, 128, (c, w, h2) => { c.fillStyle = hex(o.hatColor ?? 0x2b2b2b); c.fillRect(0, 0, w, h2); c.fillStyle = shade(o.hatColor ?? 0x2b2b2b, 0.08); for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 6, h2); }) })); b.position.y = hy; hat.add(b); const cuff = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.98, 0.05, 10, 40), M({ color: new THREE.Color(o.hatColor ?? 0x2b2b2b).offsetHSL(0, 0, -0.05) })); cuff.rotation.x = Math.PI / 2; cuff.position.y = hy + headR * 0.6; cuff.scale.setScalar(0.83); hat.add(cuff); const pom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), M({ color: o.pom ?? 0xf2c94c })); pom.position.y = top + 0.06; hat.add(pom); }
  if (o.hat === 'propeller') { const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.02, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.32), M({ map: canvasTex(256, 64, (c, w, h2) => { const cols = ['#e8503a', '#3f7fd0', '#f2c94c', '#3fae6a']; for (let i = 0; i < 8; i++) { c.fillStyle = cols[i % 4]; c.fillRect(i * w / 8, 0, w / 8, h2); } }) })); cap.position.y = hy; hat.add(cap); const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 24, 1, false, -0.9, 1.8), M({ color: 0x3f7fd0 })); brim.position.set(0, hy + headR * 0.52, headR * 0.72); brim.rotation.x = 0.25; hat.add(brim); const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 8), M({ color: 0x666666 })); stem.position.y = top + 0.04; hat.add(stem); for (const s of [-1, 1]) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.012, 0.06), M({ color: s > 0 ? 0xf2c94c : 0xe8503a })); bl.position.set(s * 0.12, top + 0.09, 0); bl.rotation.x = 0.2 * s; hat.add(bl); } }
  if (o.hat === 'souwester') { const b = lathe([[0, top + 0.13], [0.26, top + 0.1], [0.32, top - 0.04], [0.47, top - 0.12], [0.5, top - 0.15], [0.3, top - 0.08], [0, top - 0.08]], M({ color: o.hatColor ?? 0xf2c230, roughness: 0.45 })); b.scale.z = 1.12; b.position.z = -0.04; hat.add(b); hat.rotation.x = -0.18; }
  if (o.hat === 'captain') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.27, 0.16, 32), M({ color: 0xf4f2ea })); c.position.y = top + 0.0; hat.add(c); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.06, 32), M({ color: 0x14141c })); band.position.y = top - 0.07; hat.add(band); const vis = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.025, 24, 1, false, -0.9, 1.8), M({ color: 0x111111, roughness: 0.3 })); vis.position.set(0, top - 0.1, 0.22); vis.rotation.x = 0.3; hat.add(vis); const badge = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), M({ color: 0xd8a93a, metalness: 1, roughness: 0.3 })); badge.position.set(0, top - 0.02, 0.29); badge.rotation.x = -0.25; hat.add(badge); }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  if (o.lean) g.rotation.x = o.lean;
  return g;
}
