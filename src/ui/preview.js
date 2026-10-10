// A small 3D view for showing one rod (bag, shop, showroom). One renderer is shared and drawn into any canvas.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildRod } from '../player/rodVisual.js';

let shared = null;
function get() {
  if (shared) return shared;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223, 1.2)); const k = new THREE.DirectionalLight(0xffffff, 1.5); k.position.set(1, 2, 3); scene.add(k);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
  shared = { renderer, scene, camera, holder: new THREE.Group() }; scene.add(shared.holder);
  return shared;
}

export class RodPreview {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.t = 0; this.inst = null; }
  set(inst) {
    const s = get(); s.holder.clear();
    if (!inst) { this.inst = null; return; }
    this.inst = inst;
    const rod = buildRod(inst, { length: 2.0, auraWidth: 0.9, auraBoost: 1.3 });
    rod.scale.set(2.6, 1, 2.6); rod.position.y = -0.9; rod.rotation.z = -0.35; this.rod = rod; s.holder.add(rod);
  }
  draw(dt) {
    if (!this.inst) return; const s = get(); this.t += dt;
    const w = this.canvas.clientWidth || 300, hh = this.canvas.clientHeight || 300;
    if (this.canvas.width !== w * 2) { this.canvas.width = w * 2; this.canvas.height = hh * 2; }
    s.renderer.setSize(w, hh, false); s.camera.aspect = w / hh; s.camera.updateProjectionMatrix();
    s.camera.position.set(0, 0.1, 3.4); s.camera.lookAt(0, 0.1, 0);
    s.holder.rotation.y = this.t * 0.6; s.holder.rotation.x = Math.sin(this.t * 0.5) * 0.15;
    s.renderer.render(s.scene, s.camera);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(s.renderer.domElement, 0, 0, this.canvas.width, this.canvas.height);
  }
}

// flat swatch of a rod's finish for list items
export function drawSwatch(canvas, tex) {
  const c = canvas.getContext('2d'); const img = tex.image; const w = canvas.width, h = canvas.height;
  c.clearRect(0, 0, w, h);
  c.save(); c.translate(w / 2, h / 2); c.rotate(-Math.PI / 2 + 0.22);
  const L = w * 1.05, T = h * 0.24;
  c.beginPath(); c.moveTo(-T * 0.5, -L / 2); c.lineTo(T * 0.5, -L / 2); c.lineTo(T * 0.1, L / 2); c.lineTo(-T * 0.1, L / 2); c.closePath(); c.clip();
  c.drawImage(img, -T / 2, -L / 2, T, L); c.restore();
}
