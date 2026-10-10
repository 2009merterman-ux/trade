import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { THREE };

import { rng, noise2, fbm2 } from '../engine/util.js';
export { rng, noise2, fbm2 };

// ---------- water (Gerstner waves on a polar grid that reaches the horizon) ----------
export function makeWater(o) {
  const rings = 220, segs = 320, r0 = 0.6, rMax = 9000;
  const g = Math.pow(rMax / r0, 1 / rings);
  const pos = [], idx = [];
  pos.push(0, 0, 0);
  for (let i = 0; i <= rings; i++) {
    const r = r0 * Math.pow(g, i);
    for (let j = 0; j < segs; j++) { const a = j / segs * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
  }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + (j + 1) % segs, 1 + j);
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = 1 + i * segs + j, b = 1 + i * segs + (j + 1) % segs, c = a + segs, d = b + segs;
    idx.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const u = {
    uTime: { value: o.time ?? 12.0 },
    uAmp: { value: o.amp ?? 1.0 },
    uScale: { value: o.scale ?? 1.0 },
    uDeep: { value: new THREE.Color(o.deep ?? 0x062a3a) },
    uShallow: { value: new THREE.Color(o.shallow ?? 0x1aa6a0) },
    uLagoon: { value: new THREE.Color(o.lagoon ?? 0x3fd6c8) },
    uHorizon: { value: new THREE.Color(o.horizon ?? 0xcfe6f2) },
    uZenith: { value: new THREE.Color(o.zenith ?? 0x3a7bc8) },
    uSunDir: { value: (o.sunDir ?? new THREE.Vector3(0.3, 0.5, -0.8)).clone().normalize() },
    uSunColor: { value: new THREE.Color(o.sunColor ?? 0xfff2d8) },
    uSunPower: { value: o.sunPower ?? 1.0 },
    uFogColor: { value: new THREE.Color(o.fogColor ?? 0xcfe6f2) },
    uFogDensity: { value: o.fogDensity ?? 0.00045 },
    uIslands: { value: (o.islands ?? []).concat(Array(4).fill(new THREE.Vector4(0, 0, -1, 0))).slice(0, 4) },
    uFoam: { value: o.foam ?? 0.6 },
    uNight: { value: o.night ? 1 : 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`
      uniform float uTime, uAmp, uScale;
      varying vec3 vWorld; varying vec3 vNormal; varying float vCrest;
      const int N = 6;
      void main(){
        vec3 p = (modelMatrix * vec4(position,1.0)).xyz;
        vec2 xz = p.xz;
        float dist = length(position.xz);
        float atten = uAmp * (1.0 - smoothstep(250.0, 1400.0, dist));
        vec2 dirs[N]; float lens[N]; float qs[N];
        dirs[0]=normalize(vec2(1.0,0.35)); lens[0]=38.0; qs[0]=0.22;
        dirs[1]=normalize(vec2(0.7,1.0)); lens[1]=21.0; qs[1]=0.20;
        dirs[2]=normalize(vec2(-0.4,1.0)); lens[2]=13.0; qs[2]=0.18;
        dirs[3]=normalize(vec2(1.0,-0.6)); lens[3]=8.0; qs[3]=0.14;
        dirs[4]=normalize(vec2(-1.0,0.2)); lens[4]=5.3; qs[4]=0.10;
        dirs[5]=normalize(vec2(0.2,-1.0)); lens[5]=3.4; qs[5]=0.08;
        vec3 off = vec3(0.0); vec3 n = vec3(0.0,1.0,0.0); float crest = 0.0;
        for(int i=0;i<N;i++){
          float k = 6.28318/(lens[i]*uScale); float c = sqrt(9.8/k); float a = qs[i]/k * atten;
          float f = k*(dot(dirs[i],xz) - c*uTime);
          off.x += dirs[i].x*a*cos(f); off.z += dirs[i].y*a*cos(f); off.y += a*sin(f);
          n.x -= dirs[i].x*qs[i]*atten*cos(f); n.z -= dirs[i].y*qs[i]*atten*cos(f); n.y -= qs[i]*atten*sin(f)*0.5;
          crest += qs[i]*atten*sin(f);
        }
        p += off;
        vWorld = p; vNormal = normalize(n); vCrest = crest;
        gl_Position = projectionMatrix * viewMatrix * vec4(p,1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uDeep, uShallow, uLagoon, uHorizon, uZenith, uSunDir, uSunColor, uFogColor;
      uniform float uSunPower, uFogDensity, uTime, uFoam, uNight, uAmp;
      uniform vec4 uIslands[4];
      varying vec3 vWorld; varying vec3 vNormal; varying float vCrest;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      vec2 ripple(vec2 p, float t){
        vec2 g = vec2(0.0); float a = 0.5; float f = 0.35;
        for(int i=0;i<5;i++){
          vec2 q = p*f + vec2(t*0.6*f, -t*0.4*f);
          float e = 0.05;
          float c = vn(q); g += a*vec2(vn(q+vec2(e,0))-c, vn(q+vec2(0,e))-c)/e;
          a *= 0.55; f *= 2.1;
        }
        return g;
      }
      void main(){
        vec3 V = cameraPosition - vWorld; float dist = length(V); V /= dist;
        float detailFade = 1.0 - smoothstep(30.0, 600.0, dist);
        vec2 rg = ripple(vWorld.xz, uTime) * (0.10 + 0.06*uAmp) * detailFade;
        vec3 n = normalize(vNormal + vec3(-rg.x, 0.0, -rg.y));
        float ndv = max(dot(n, V), 0.0);
        float fres = 0.02 + 0.98*pow(1.0 - ndv, 5.0);
        vec3 R = reflect(-V, n);
        float ry = max(R.y, 0.0);
        vec3 sky = mix(uHorizon, uZenith, pow(ry, 0.45));
        float sunDot = max(dot(R, uSunDir), 0.0);
        vec3 spec = uSunColor * (pow(sunDot, 900.0)*28.0 + pow(sunDot, 60.0)*0.6) * uSunPower;
        // shallow lagoon tint near islands
        float shallow = 0.0;
        for(int i=0;i<4;i++){
          if(uIslands[i].z > 0.0){
            float d = length(vWorld.xz - uIslands[i].xy) - uIslands[i].z;
            shallow = max(shallow, (1.0 - smoothstep(0.0, uIslands[i].w, d)));
          }
        }
        vec3 body = mix(uDeep, uShallow, clamp(0.25 + vCrest/max(uAmp,0.5)*0.9, 0.0, 1.0));
        body = mix(body, uLagoon, shallow*0.85);
        // light scattering through wave crests
        float sss = pow(max(dot(V, -uSunDir) * 0.5 + 0.5, 0.0), 3.0) * clamp(vCrest*2.0+0.3, 0.0, 1.0);
        body += uShallow * sss * 0.35 * (1.0 - uNight);
        vec3 col = mix(body, sky, fres) + spec;
        float cr = vCrest / max(uAmp, 0.5);
        float foam = smoothstep(0.42, 0.7, cr + vn(vWorld.xz*1.3)*0.25) * uFoam * detailFade;
        col = mix(col, vec3(0.92,0.96,0.98)*(1.0-0.85*uNight), foam*0.7);
        float fog = 1.0 - exp(-pow(dist*uFogDensity, 1.35));
        col = mix(col, uFogColor, clamp(fog,0.0,1.0));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

// ---------- procedural night sky with galaxy ----------
export function makeNightSky({ bandTilt = 0.55, intensity = 1.0, horizonGlow = 0x1a2350, bandN = null } = {}) {
  const bn = bandN ? bandN.clone().normalize() : new THREE.Vector3(0.25, Math.cos(bandTilt), Math.sin(bandTilt)).normalize();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uBand: { value: bn }, uI: { value: intensity }, uGlow: { value: new THREE.Color(horizonGlow) } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix*vec4(position,1.0)).xyz - cameraPosition); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: /* glsl */`
      uniform float uI; uniform vec3 uGlow, uBand; varying vec3 vDir;
      float h3(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<6;i++){ s+=a*n3(p); p*=2.07; a*=0.5; } return s; }
      float stars(vec3 d, float scale, float thresh){
        vec3 p = d*scale; vec3 c = floor(p); float r = h3(c);
        if(r < thresh) return 0.0;
        vec3 sp = c + 0.5 + (vec3(h3(c+1.3),h3(c+2.7),h3(c+5.1))-0.5)*0.7;
        float dd = length(p - sp);
        float b = (r - thresh)/(1.0 - thresh);
        return pow(b, 2.0) * smoothstep(0.32, 0.0, dd) * 3.0;
      }
      void main(){
        vec3 d = normalize(vDir);
        vec3 bandN = uBand;
        float bd = dot(d, bandN);
        float band = exp(-bd*bd*14.0);
        float core = exp(-bd*bd*60.0);
        float neb = fbm(d*3.2 + 4.0);
        float dust = smoothstep(0.42, 0.68, fbm(d*7.0+11.0));
        vec3 col = vec3(0.005,0.007,0.02);
        vec3 milky = mix(vec3(0.20,0.24,0.55), vec3(0.85,0.55,0.75), neb) * band * (0.35 + 0.9*neb);
        milky += vec3(1.0,0.8,0.55) * core * neb * 0.9;
        milky *= 1.0 - dust*0.75*band;
        col += milky * 0.55;
        col += vec3(0.25,0.1,0.35) * smoothstep(0.55,0.8,fbm(d*2.0+30.0)) * 0.25;
        float s = stars(d, 180.0, 0.965) + stars(d, 420.0, 0.975)*(0.6+band*1.6) + stars(d, 900.0, 0.985)*(0.4+band*2.5);
        vec3 tint = mix(vec3(0.7,0.8,1.0), vec3(1.0,0.85,0.7), h3(floor(d*180.0)));
        col += s * tint;
        float hz = exp(-max(d.y,0.0)*7.0);
        col = mix(col, uGlow, hz*0.85);
        gl_FragColor = vec4(col*uI, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(15000, 64, 32), mat);
  m.frustumCulled = false; m.renderOrder = -1;
  return m;
}

// ---------- canvas textures ----------
export function canvasTex(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
export function woodTex(base = '#8a6240', seed = 3) {
  const r = rng(seed);
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y = r() * h; g.strokeStyle = `rgba(${40 + r() * 40},${25 + r() * 25},${10},${0.08 + r() * 0.18})`;
      g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 3 * r());
      g.stroke();
    }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(40,24,10,0.35)'; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 8, 3 + r() * 4, 0, 0, 7); g.fill(); }
  });
}

// ---------- terrain island ----------
export function makeIsland({ radius = 60, height = 14, seed = 1, sand = 0xe8d7a8, grass = 0x5d8f3a, rock = 0x7d776c, wet = 0xb8a57a, segments = 180, peakX = 0, peakZ = 0, cliff = 0, terrace = null, paint = null, edgeVar = 0.55, size = 2.6 } = {}) {
  const geo = new THREE.PlaneGeometry(radius * size, radius * size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; const cols = [];
  const cS = new THREE.Color(sand), cG = new THREE.Color(grass), cR = new THREE.Color(rock), cW = new THREE.Color(wet), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const ang = Math.atan2(z, x);
    const edgeN = fbm2(Math.cos(ang) * 1.3 + seed, Math.sin(ang) * 1.3 + seed, 4);
    const R = radius * (1 + edgeN * edgeVar);
    const d = Math.hypot(x, z) / R;
    const dp = Math.hypot(x - peakX * radius, z - peakZ * radius) / radius;
    let y = (1 - Math.min(1, d)) ;
    y = Math.pow(Math.max(0, y), 1.6) * height * 0.55 + Math.max(0, 1 - dp) ** 2 * height * 0.75;
    y += fbm2(x * 0.04 + seed * 3, z * 0.04, 5) * height * 0.35 * Math.min(1, (1 - d) * 3);
    if (cliff > 0) y += Math.max(0, 1 - d * 1.1) * cliff * (0.6 + fbm2(x * 0.05, z * 0.05 + seed, 3));
    y -= Math.max(0, d - 1) * 6 + 1.2;
    if (terrace && y > 0.6) {
      const td = Math.hypot(x - terrace.cx, z - terrace.cz);
      const tw = Math.min(1, Math.max(0, (terrace.r - td) / (terrace.r * 0.3)));
      const q = y / terrace.step, fl = Math.floor(q), fr = q - fl;
      const yt = terrace.step * (fl + Math.max(0, Math.min(1, (fr - 0.72) / 0.28)) ** 2);
      y = y + (Math.max(yt, 0.9) - y) * tw;
    }
    p.setY(i, y);
    const slopeN = fbm2(x * 0.15, z * 0.15 + seed, 3);
    if (y < 0.3) tmp.copy(cW).lerp(cS, Math.max(0, (y + 1.2) / 1.5));
    else if (y < 1.6 + slopeN * 1.5) tmp.copy(cS);
    else if (y < height * 0.8 + slopeN * 4) tmp.copy(cG).lerp(cS, Math.max(0, 1 - (y - 1.6) / 1.5) * 0.6);
    else tmp.copy(cR);
    tmp.offsetHSL(0, 0, slopeN * 0.06);
    if (paint) { const pc = paint(x, z, y); if (pc) tmp.copy(pc); }
    cols.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  m.receiveShadow = true; m.castShadow = true;
  const hs = new Float32Array(p.count); for (let i = 0; i < p.count; i++) hs[i] = p.getY(i);
  m.userData.hf = { hs, n: segments, size: radius * size };
  return m;
}
// bilinear lookup in the stored heightfield (world coordinates)
export function sampleHeight(mesh, x, z) {
  const hf = mesh.userData.hf; if (!hf) return heightAt(mesh, x, z);
  const n = hf.n, seg = hf.size / n;
  const fx = (x - mesh.position.x + hf.size / 2) / seg, fz = (z - mesh.position.z + hf.size / 2) / seg;
  if (fx < 0 || fz < 0 || fx >= n || fz >= n) return -6;
  const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz, w = n + 1;
  const h00 = hf.hs[iz * w + ix], h10 = hf.hs[iz * w + ix + 1], h01 = hf.hs[(iz + 1) * w + ix], h11 = hf.hs[(iz + 1) * w + ix + 1];
  return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz + mesh.position.y;
}
export function heightAt(mesh, x, z) {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 200, z), new THREE.Vector3(0, -1, 0));
  mesh.updateMatrixWorld();
  const hit = ray.intersectObject(mesh)[0];
  return hit ? hit.point.y : 0;
}

// ---------- palm tree ----------
const frondTex = canvasTex(256, 1024, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.strokeStyle = '#3d5e1e'; g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  for (let y = 20; y < h - 10; y += 9) {
    const t = y / h, len = (w / 2 - 6) * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08));
    for (const s of [-1, 1]) {
      const gr = g.createLinearGradient(w / 2, y, w / 2 + s * len, y + 40);
      gr.addColorStop(0, '#4f7d26'); gr.addColorStop(1, '#7fae3e');
      g.strokeStyle = gr; g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + s * len * 0.6, y + 8, w / 2 + s * len, y + 34); g.stroke();
    }
  }
}, { srgb: true });
export function makePalm(height = 9, lean = 0.25, seed = 1) {
  const r = rng(seed); const grp = new THREE.Group();
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(Math.sin(t * 1.4) * lean * height * 0.5, t * height, Math.sin(t * 2.1) * lean * 0.3 * height * 0.3)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const ringTex = canvasTex(64, 512, (g, w, h) => { for (let y = 0; y < h; y += 16) { g.fillStyle = y % 32 ? '#8b7355' : '#6d5a43'; g.fillRect(0, y, w, 16); g.fillStyle = 'rgba(40,30,20,0.4)'; g.fillRect(0, y + 13, w, 3); } }, { repeat: [3, 2] });
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.22, 10), new THREE.MeshStandardMaterial({ map: ringTex, roughness: 1 }));
  trunk.castShadow = true; grp.add(trunk);
  const top = curve.getPoint(1);
  const mat = new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
  const n = 11;
  for (let i = 0; i < n; i++) {
    const L = 3.6 + r() * 1.4;
    const geo = new THREE.PlaneGeometry(1.3, L, 2, 16);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const yy = p.getY(k) + L / 2; const t = yy / L;
      p.setXYZ(k, p.getX(k) * (1 - t * 0.3), 0, yy);
      p.setY(k, -Math.pow(t, 2) * L * (0.55 + r() * 0.02) + Math.abs(p.getX(k)) * 0.25);
    }
    geo.computeVertexNormals();
    const f = new THREE.Mesh(geo, mat); f.castShadow = true;
    f.position.copy(top);
    f.rotation.y = i / n * Math.PI * 2 + r() * 0.3;
    f.rotation.x = -0.25 + r() * 0.3;
    grp.add(f);
  }
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshStandardMaterial({ color: 0x4a3a20, roughness: 0.7 })); c.position.copy(top).add(new THREE.Vector3(Math.cos(i * 1.7) * 0.25, -0.25, Math.sin(i * 1.7) * 0.25)); grp.add(c); }
  return grp;
}

export function makeRock(size = 1, seed = 1, color = 0x77726a) {
  const geo = new THREE.IcosahedronGeometry(size, 2); const p = geo.attributes.position; const r = rng(seed);
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const n = 1 + fbm2(v.x * 1.7 + seed, v.y * 1.7 + v.z, 3) * 0.6 + (r() - 0.5) * 0.05; v.multiplyScalar(n); v.y *= 0.7; p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true }));
  m.castShadow = m.receiveShadow = true; return m;
}

// ---------- Peak-style chunky scout NPC (original design) ----------
export function makeScout({ jacket = 0xd9622b, pants = 0x3b4a5a, skin = 0xf1c7a3, hat = 0x6b7d3a, pack = 0x8a6a3c, hatType = 'bucket', mood = 'happy' } = {}) {
  const grp = new THREE.Group();
  const M = (c, r = 0.75) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.42, 8, 20), M(jacket));
  body.position.y = 0.95; body.scale.set(1, 1, 0.85); grp.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 24), M(skin, 0.6));
  head.position.y = 1.62; head.scale.set(1, 0.95, 0.95); grp.add(head);
  const eyeM = M(0x111111, 0.3);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), eyeM);
    e.scale.set(0.8, 1.35, 0.5); e.position.set(s * 0.11, 1.66, 0.3); grp.add(e);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hl.position.set(s * 0.11 + 0.012, 1.685, 0.325); grp.add(hl);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf08f8f, transparent: true, opacity: 0.55 }));
    cheek.scale.set(1, 0.6, 0.3); cheek.position.set(s * 0.19, 1.57, 0.26); grp.add(cheek);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16, Math.PI), eyeM);
  mouth.position.set(0, 1.56, 0.31); mouth.rotation.z = mood === 'happy' ? Math.PI : 0; grp.add(mouth);
  if (hatType === 'bucket') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.04, 32), M(hat)); brim.position.y = 1.83; brim.rotation.x = 0.08; grp.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.33, 0.24, 32), M(hat)); crown.position.y = 1.95; grp.add(crown);
  } else if (hatType === 'beanie') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), M(hat)); b.position.y = 1.7; grp.add(b);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), M(0xffffff)); pom.position.y = 2.05; grp.add(pom);
  } else if (hatType === 'hood') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16, Math.PI * 0.15, Math.PI * 1.7, 0, Math.PI * 0.7), M(hat)); b.position.y = 1.64; b.rotation.y = Math.PI * 0.5 + Math.PI; grp.add(b);
  }
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.38, 6, 12), M(jacket)); arm.position.set(s * 0.42, 0.98, 0.02); arm.rotation.z = s * 0.25; grp.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), M(skin, 0.6)); hand.position.set(s * 0.5, 0.7, 0.05); grp.add(hand);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.28, 6, 12), M(pants)); leg.position.set(s * 0.15, 0.36, 0); grp.add(leg);
    const boot = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.14, 0.32, 3, 0.05), M(0x2b2420)); boot.position.set(s * 0.15, 0.08, 0.05); grp.add(boot);
  }
  const bp = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.6, 0.28, 4, 0.08), M(pack)); bp.position.set(0, 1.0, -0.36); grp.add(bp);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16), M(0x4a6b8a)); roll.rotation.z = Math.PI / 2; roll.position.set(0, 1.36, -0.38); grp.add(roll);
  grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return grp;
}

// ---------- rod skins ----------
export const finishes = {
  sunsetFade: () => canvasTex(64, 1024, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#ffd23f'); gr.addColorStop(0.45, '#ff5e8a'); gr.addColorStop(1, '#6a3cff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
  abyssMarble: () => { const r = rng(9); return canvasTex(256, 1024, (g, w, h) => { g.fillStyle = '#0b1e3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${60 + r() * 80},${200 + r() * 55},255,${0.15 + r() * 0.5})`; g.lineWidth = 1 + r() * 4; g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 12; k++) { x += (r() - 0.5) * 60; y += r() * 50; g.lineTo(x, y); } g.stroke(); } }); },
  emberDamascus: () => canvasTex(256, 1024, (g, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x += 4) { const v = Math.sin(y * 0.06 + Math.sin(x * 0.05) * 3 + Math.sin(y * 0.013) * 4); const t = (v + 1) / 2; g.fillStyle = `rgb(${60 + t * 180},${20 + t * 60},${10 + t * 10})`; g.fillRect(x, y, 4, 1); } }),
  carbonStorm: () => canvasTex(256, 1024, (g, w, h) => { g.fillStyle = '#1a1c20'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { g.fillStyle = ((x + y) / 8) % 2 ? '#2a2e35' : '#14161a'; g.fillRect(x, y, 8, 8); } g.strokeStyle = '#8fd3ff'; g.lineWidth = 3; g.beginPath(); let x = w / 2; g.moveTo(x, 0); for (let y = 0; y < h; y += 40) { x = w / 2 + (Math.sin(y * 1.7) * 60); g.lineTo(x, y); } g.stroke(); }),
  divine: () => canvasTex(256, 1024, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#7a4a0c'); gr.addColorStop(0.3, '#f7c948'); gr.addColorStop(0.6, '#fff4c2'); gr.addColorStop(1, '#f2b134'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,60,0,0.6)'; g.lineWidth = 2; for (let y = 30; y < h; y += 60) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + ((x / 16) % 2 ? 10 : -10)); g.stroke(); } }),
  driftwood: () => woodTex('#9a7650', 11),
};
export function makeRod({ finish = 'sunsetFade', length = 2.4, aura = null, auraStrength = 1, metal = 0xc9c9c9, auraWidth = 1 } = {}) {
  const grp = new THREE.Group();
  const tex = finishes[finish]();
  const blank = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.02, length, 16, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: finish === 'divine' ? 0.9 : 0.35, emissive: aura ? new THREE.Color(aura) : new THREE.Color(0), emissiveIntensity: aura ? 0.25 * auraStrength : 0, emissiveMap: aura ? tex : null }));
  blank.position.y = length / 2; grp.add(blank);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.42, 16), new THREE.MeshStandardMaterial({ color: 0x2b2018, roughness: 0.9 }));
  grip.position.y = -0.18; grp.add(grip);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.18, 16), new THREE.MeshStandardMaterial({ map: woodTex('#c49a6c', 5), roughness: 1 }));
  cork.position.y = 0.12; grp.add(cork);
  const reel = new THREE.Group();
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 24), new THREE.MeshStandardMaterial({ color: metal, metalness: 0.9, roughness: 0.25 }));
  spool.rotation.z = Math.PI / 2; reel.add(spool);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.008), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6 })); handle.position.set(0.035, 0.03, 0); reel.add(handle);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.025, 8), new THREE.MeshStandardMaterial({ color: 0x111111 })); knob.position.set(0.05, 0.06, 0); knob.rotation.z = Math.PI / 2; reel.add(knob);
  reel.position.set(0, 0.0, 0.05); grp.add(reel);
  for (let i = 1; i <= 6; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012 - i * 0.0012, 0.0018, 6, 16), new THREE.MeshStandardMaterial({ color: metal, metalness: 0.9, roughness: 0.2 })); ring.position.set(0, length * (i / 6.4), 0.02); grp.add(ring); }
  if (aura) {
    const auraMat = new THREE.MeshBasicMaterial({ color: aura, transparent: true, opacity: 0.18 * auraStrength, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let k = 1; k <= 3; k++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.006 + k * 0.012 * auraWidth, 0.02 + k * 0.018 * auraWidth, length * 1.02, 16, 1, true), auraMat); a.position.y = length / 2; grp.add(a); }
    const r = rng(finish.length * 13);
    const pg = new THREE.BufferGeometry(); const pp = [];
    for (let i = 0; i < 160 * auraStrength; i++) { const y = r() * length; const rad = (0.03 + r() * 0.12) * auraWidth; const a = r() * 6.28; pp.push(Math.cos(a) * rad, y, Math.sin(a) * rad); }
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    grp.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: aura, size: 0.012, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
  }
  grp.userData.tip = new THREE.Vector3(0, length, 0);
  return grp;
}

// ---------- fluted marble column ----------
export function makeColumn(h = 10, r = 0.7, marble = 0xf2eee6, gold = 0xd8a93a) {
  const grp = new THREE.Group();
  const geo = new THREE.CylinderGeometry(r * 0.92, r, h, 48, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const a = Math.atan2(z, x); const f = 1 - 0.05 * Math.pow(Math.abs(Math.sin(a * 12)), 0.5); p.setX(i, x * f); p.setZ(i, z * f); }
  geo.computeVertexNormals();
  const mm = new THREE.MeshStandardMaterial({ color: marble, roughness: 0.45 });
  const shaft = new THREE.Mesh(geo, mm); shaft.position.y = h / 2; grp.add(shaft);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.35, 0.5, 32), mm); base.position.y = 0.25; grp.add(base);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.4, r * 0.95, 0.6, 32), mm); cap.position.y = h + 0.3; grp.add(cap);
  const abacus = new THREE.Mesh(new THREE.BoxGeometry(r * 3, 0.3, r * 3), mm); abacus.position.y = h + 0.75; grp.add(abacus);
  const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.95, 0.06, 8, 48), new THREE.MeshStandardMaterial({ color: gold, metalness: 1, roughness: 0.25, emissive: gold, emissiveIntensity: 0.15 }));
  band.rotation.x = Math.PI / 2; band.position.y = h * 0.97; grp.add(band);
  grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return grp;
}

// ---------- day / dusk sky with procedural clouds ----------
export function makeDaySky({ zenith = 0x2a6fc9, horizon = 0xcfe3f0, sunDir = new THREE.Vector3(0, 1, 0), sunColor = 0xfff4dc, cloud = 0.5, cloudColor = 0xffffff, cloudShade = 0x8a9bb0, sunSize = 1, dark = 0 } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uZ: { value: new THREE.Color(zenith) }, uH: { value: new THREE.Color(horizon) }, uSun: { value: sunDir.clone().normalize() }, uSunC: { value: new THREE.Color(sunColor) }, uCloud: { value: cloud }, uCC: { value: new THREE.Color(cloudColor) }, uCS: { value: new THREE.Color(cloudShade) }, uSunSize: { value: sunSize }, uDark: { value: dark } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix*vec4(position,1.0)).xyz - cameraPosition); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uZ, uH, uSun, uSunC, uCC, uCS; uniform float uCloud, uSunSize, uDark; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<7;i++){ s+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float y = max(d.y, 0.0);
        vec3 col = mix(uH, uZ, pow(y, 0.55));
        float sd = max(dot(d, uSun), 0.0);
        col += uSunC * (pow(sd, 8.0)*0.25 + pow(sd, 64.0)*0.5);
        col += uSunC * smoothstep(0.9993 - 0.0004*uSunSize, 0.9997, sd) * 18.0;
        if (d.y > 0.0) {
          vec2 uv = d.xz / (d.y + 0.08) * 1.2;
          float c = fbm(uv*0.9 + vec2(3.0, 1.0));
          float cov = smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.28, c);
          float thick = fbm(uv*1.8 + vec2(c*2.0));
          vec3 cc = mix(uCS, uCC, smoothstep(0.3, 0.75, thick + sd*0.3));
          cc += uSunC * pow(sd, 6.0) * 0.6 * (1.0 - cov*0.5);
          float fadeH = smoothstep(0.0, 0.12, d.y);
          col = mix(col, cc, cov * fadeH * 0.95);
        }
        col = mix(col, uH, exp(-y*18.0)*0.6);
        col *= 1.0 - uDark;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(15000, 64, 32), mat);
  m.frustumCulled = false; m.renderOrder = -1;
  return m;
}

export function makeBush(size = 1, seed = 1, color = 0x4f7f30) {
  const grp = new THREE.Group(); const r = rng(seed);
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(size * (0.5 + r() * 0.5), 1), new THREE.MeshStandardMaterial({ color: new THREE.Color(color).offsetHSL((r() - 0.5) * 0.04, 0, (r() - 0.5) * 0.08), roughness: 0.9, flatShading: true })); b.position.set((r() - 0.5) * size * 1.4, size * 0.4 + r() * size * 0.3, (r() - 0.5) * size * 1.4); b.castShadow = b.receiveShadow = true; grp.add(b); }
  return grp;
}
