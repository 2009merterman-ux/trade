// Fish pictures: a 3D fish for jumps, and 2D drawings for catch cards and the collection.
import * as THREE from 'three';
import { rng } from '../engine/util.js';

const SHAPE = { round: [1, 0.55], long: [1.5, 0.32], eel: [2.2, 0.18], flat: [1, 0.25], spiky: [1.05, 0.5], trash: [1, 0.5] };

export function makeFishMesh(fish, kg = 1) {
  const [len, tall] = SHAPE[fish.shape] ?? SHAPE.round;
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, fish.colors[0]); gr.addColorStop(0.55, fish.colors[0]); gr.addColorStop(1, fish.colors[1]); x.fillStyle = gr; x.fillRect(0, 0, 256, 128);
  const r = rng(fish.id.length * 13 + fish.tier);
  if (r() < 0.5) { x.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 0; i < 6; i++) x.fillRect(30 + i * 34, 0, 10, 70); } else { x.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc(r() * 256, r() * 70, 3 + r() * 4, 0, 7); x.fill(); } }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.25, emissive: fish.tier >= 8 ? new THREE.Color(fish.colors[0]) : new THREE.Color(0), emissiveIntensity: fish.tier >= 8 ? 0.35 : 0 });
  const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(Math.max(0.001, Math.sin(Math.PI * Math.pow(t, 0.8)) * tall * 0.5), (t - 0.5) * len)); }
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), mat); body.rotation.z = -Math.PI / 2; body.scale.set(1, 1, fish.shape === 'flat' ? 0.35 : 0.6); g.add(body);
  const finMat = new THREE.MeshStandardMaterial({ color: fish.colors[1], side: THREE.DoubleSide, roughness: 0.5, transparent: true, opacity: 0.9 });
  const tail = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-0.35 * tall * 1.6, 0.3 * tall * 1.6), new THREE.Vector2(-0.25 * tall * 1.6, 0), new THREE.Vector2(-0.35 * tall * 1.6, -0.3 * tall * 1.6)])), finMat); tail.position.x = -len * 0.48; g.add(tail);
  const dorsal = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-len * 0.2, 0), new THREE.Vector2(0, tall * (fish.shape === 'spiky' ? 0.7 : 0.4)), new THREE.Vector2(len * 0.15, 0)])), finMat); dorsal.position.y = tall * 0.4; g.add(dorsal);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(tall * 0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 })); eye.position.set(len * 0.36, tall * 0.08, tall * 0.18); g.add(eye);
  const s = Math.max(0.25, Math.min(3.2, Math.cbrt(kg) * 0.45)); g.scale.setScalar(s);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// 2D drawing for cards and the collection. silhouette = undiscovered.
export function drawFishIcon(ctx, fish, w, h, silhouette = false) {
  ctx.save(); ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2; const dark = '#0c0f16';
  const main = silhouette ? dark : fish.colors[0], belly = silhouette ? dark : fish.colors[1];
  if (fish.shape === 'trash') { drawTrash(ctx, fish, w, h, silhouette); ctx.restore(); return; }
  const [len, tall] = SHAPE[fish.shape] ?? SHAPE.round;
  const L = Math.min(w * 0.78, h * 1.6 * len / 1.2), T = L * tall / len;
  ctx.translate(cx + L * 0.06, cy);
  // tail
  ctx.fillStyle = silhouette ? dark : belly; ctx.beginPath(); ctx.moveTo(-L * 0.42, 0); ctx.lineTo(-L * 0.62, -T * 0.55); ctx.quadraticCurveTo(-L * 0.52, 0, -L * 0.62, T * 0.55); ctx.closePath(); ctx.fill();
  // fins
  ctx.beginPath(); ctx.moveTo(-L * 0.15, -T * 0.42); ctx.quadraticCurveTo(0, -T * (fish.shape === 'spiky' ? 1.05 : 0.8), L * 0.12, -T * 0.42); ctx.fill();
  if (fish.shape === 'spiky' && !silhouette) { ctx.strokeStyle = belly; ctx.lineWidth = 2; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * L * 0.05, -T * 0.4); ctx.lineTo(i * L * 0.06, -T * 0.95); ctx.stroke(); } }
  // body
  const grad = ctx.createLinearGradient(0, -T / 2, 0, T / 2); grad.addColorStop(0, main); grad.addColorStop(0.6, main); grad.addColorStop(1, belly);
  ctx.fillStyle = silhouette ? dark : grad; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.45, T * 0.5, 0, 0, 7); ctx.fill();
  if (!silhouette) {
    const r = rng(fish.id.length * 13 + fish.tier);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, L * 0.45, T * 0.5, 0, 0, 7); ctx.clip();
    if (r() < 0.5) { ctx.fillStyle = 'rgba(0,0,0,0.16)'; for (let i = -3; i <= 3; i++) ctx.fillRect(i * L * 0.11 - 4, -T, 8, T * 1.3); } else { ctx.fillStyle = 'rgba(255,255,255,0.28)'; for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.arc((r() - 0.5) * L * 0.8, (r() - 0.7) * T * 0.7, 2 + r() * 3, 0, 7); ctx.fill(); } }
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(L * 0.3, -T * 0.08, Math.max(2.5, T * 0.11), 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(L * 0.31, -T * 0.08, Math.max(1.5, T * 0.065), 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(L * 0.18, 0, T * 0.32, -0.9, 0.9); ctx.stroke();
    if (fish.tier >= 8) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,180,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, T * 0.58, 0, 0, 7); ctx.fill(); }
  }
  ctx.restore();
}
function drawTrash(ctx, fish, w, h, sil) {
  const n = fish.name.toLowerCase(); const c = sil ? '#0c0f16' : fish.tier === 1 ? '#7fc3e8' : '#8a7a62'; const c2 = sil ? '#0c0f16' : fish.tier === 1 ? '#e8f4fa' : '#5a4a38';
  ctx.translate(w / 2, h / 2); const s = Math.min(w, h) / 100; ctx.scale(s, s); ctx.fillStyle = c; ctx.strokeStyle = c2; ctx.lineWidth = 3;
  if (n.includes('boot')) { ctx.beginPath(); ctx.moveTo(-20, -35); ctx.lineTo(5, -35); ctx.lineTo(5, 10); ctx.lineTo(35, 15); ctx.lineTo(35, 30); ctx.lineTo(-20, 30); ctx.closePath(); ctx.fill(); }
  else if (n.includes('can') || n.includes('bottle') || n.includes('lantern') || n.includes('candle') || n.includes('lamp') || n.includes('amphora')) { ctx.beginPath(); ctx.roundRect(-16, -30, 32, 60, 6); ctx.fill(); ctx.fillStyle = c2; ctx.fillRect(-16, -8, 32, 14); }
  else if (n.includes('duck')) { ctx.beginPath(); ctx.ellipse(0, 10, 30, 18, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(14, -16, 14, 0, 7); ctx.fill(); ctx.fillStyle = sil ? c : '#ff9a2a'; ctx.beginPath(); ctx.moveTo(26, -16); ctx.lineTo(40, -12); ctx.lineTo(26, -8); ctx.fill(); }
  else if (n.includes('tire') || n.includes('ring') || n.includes('cap') || n.includes('coin')) { ctx.lineWidth = 14; ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.stroke(); }
  else if (n.includes('bag') || n.includes('net') || n.includes('sail') || n.includes('letter') || n.includes('map')) { ctx.beginPath(); ctx.moveTo(-28, -20); ctx.quadraticCurveTo(0, -36, 28, -20); ctx.lineTo(22, 30); ctx.quadraticCurveTo(0, 38, -22, 30); ctx.closePath(); ctx.fill(); }
  else if (n.includes('ball')) { ctx.beginPath(); ctx.arc(0, 0, 30, 0, 7); ctx.fill(); if (!sil) { ctx.fillStyle = '#ff6a5a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 30, -0.5, 0.6); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 30, 1.6, 2.7); ctx.fill(); } }
  else if (n.includes('goggles') || n.includes('glasses') || n.includes('snorkel')) { ctx.beginPath(); ctx.arc(-16, 0, 14, 0, 7); ctx.arc(16, 0, 14, 0, 7); ctx.fill(); ctx.fillRect(-4, -3, 8, 6); }
  else if (n.includes('hat') || n.includes('helm') || n.includes('laurel')) { ctx.beginPath(); ctx.ellipse(0, 14, 38, 9, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.roundRect(-20, -22, 40, 38, 10); ctx.fill(); }
  else if (n.includes('boat') || n.includes('plank') || n.includes('mast')) { ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(36, 0); ctx.lineTo(24, 18); ctx.lineTo(-24, 18); ctx.closePath(); ctx.fill(); ctx.fillRect(-2, -34, 4, 34); }
  else if (n.includes('crab')) { ctx.beginPath(); ctx.ellipse(0, 4, 26, 16, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(-30, -16, 9, 0, 7); ctx.arc(30, -16, 9, 0, 7); ctx.fill(); }
  else if (n.includes('phone') || n.includes('case') || n.includes('crate') || n.includes('portrait') || n.includes('mirror') || n.includes('mosaic')) { ctx.beginPath(); ctx.roundRect(-24, -30, 48, 60, 8); ctx.fill(); ctx.strokeRect(-16, -22, 32, 44); }
  else if (n.includes('flip')) { ctx.beginPath(); ctx.ellipse(0, 0, 16, 36, 0.3, 0, 7); ctx.fill(); }
  else { ctx.save(); ctx.rotate(-0.5); ctx.beginPath(); ctx.roundRect(-38, -8, 76, 16, 6); ctx.fill(); ctx.restore(); ctx.beginPath(); ctx.arc(18, -18, 10, 0, 7); ctx.fill(); }
}
