// Time of day, weather and the lights, fog, water and rain that follow from them.
import * as THREE from 'three';
import { Sky, skyAt } from './sky.js';
import { makeWater } from './common.js';
import { rng } from '../engine/util.js';

export const WEATHER = {
  sunny: { label: 'Sunny', cloud: 0.25, fog: 0, rain: 0, wind: 8, storm: 0 },
  cloudy: { label: 'Partly cloudy', cloud: 0.62, fog: 0.08, rain: 0, wind: 14, storm: 0.1 },
  rain: { label: 'Light rain', cloud: 0.88, fog: 0.3, rain: 0.55, wind: 18, storm: 0.4 },
  fog: { label: 'Fog', cloud: 0.7, fog: 1, rain: 0, wind: 3, storm: 0.2 },
  storm: { label: 'Storm', cloud: 0.98, fog: 0.45, rain: 1, wind: 62, storm: 1 },
  still: { label: 'Still air', cloud: 0.05, fog: 0.05, rain: 0, wind: 0, storm: 0 },
};
// how likely each weather follows another, per band (the storm belt is rough, the start is gentle)
const CHAIN = [
  { sunny: ['sunny', 'sunny', 'cloudy'], cloudy: ['sunny', 'cloudy', 'rain'], rain: ['cloudy', 'rain', 'sunny'], fog: ['sunny'], storm: ['rain'] },
  { sunny: ['sunny', 'cloudy', 'cloudy'], cloudy: ['sunny', 'rain', 'fog'], rain: ['cloudy', 'rain', 'storm'], fog: ['cloudy', 'fog'], storm: ['rain', 'cloudy'] },
  { sunny: ['cloudy', 'rain'], cloudy: ['rain', 'storm', 'fog'], rain: ['storm', 'rain', 'cloudy'], fog: ['fog', 'rain', 'storm'], storm: ['storm', 'rain', 'fog'] },
  { sunny: ['fog', 'cloudy'], cloudy: ['fog', 'rain'], rain: ['fog', 'storm'], fog: ['fog', 'fog', 'rain'], storm: ['fog', 'rain'] },
  { sunny: ['still'], cloudy: ['still'], rain: ['still'], fog: ['still'], storm: ['still'], still: ['still'] },
];

export class Environment {
  constructor(scene, camera, audio) {
    this.scene = scene; this.camera = camera; this.audio = audio;
    this.hour = 9; this.dayLength = 20 * 60; // real seconds per game day
    this.sky = new Sky(); scene.add(this.sky.mesh);
    this.sun = new THREE.DirectionalLight(0xffffff, 3); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.02;
    Object.assign(this.sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 400 });
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbfe3ff, 0x9a8a62, 1.1); scene.add(this.hemi);
    this.fill = new THREE.DirectionalLight(0xffe8d0, 0.5); scene.add(this.fill);
    scene.fog = new THREE.FogExp2(0xc4ddef, 0.0016);
    this.water = makeWater({ amp: 0.5, islands: [] }); scene.add(this.water);
    this.w = { ...WEATHER.sunny }; this.forecast = []; this.flash = 0; this.nextBolt = 8;
    this.baseFog = 0.0016; this.lagoon = 0x47e0cf;
    this.makeRain();
  }
  makeRain() {
    const N = 7000; const pos = new Float32Array(N * 6); this.rainVel = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = (Math.random() - 0.5) * 50, y = Math.random() * 24, z = (Math.random() - 0.5) * 50; pos.set([x, y, z, x + 0.12, y - 0.8, z + 0.05], i * 6); this.rainVel[i] = 14 + Math.random() * 6; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaebfd0, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.rain.frustumCulled = false; this.scene.add(this.rain);
  }
  setIsland(isl, def) {
    this.island = isl; this.band = isl.band;
    this.baseFog = def.fogBase ?? 0.0016;
    const u = this.water.material.uniforms;
    u.uIslands.value = (def.waterIslands ?? []).concat(Array(4).fill(new THREE.Vector4(0, 0, -1, 0))).slice(0, 4);
    u.uLagoon.value.set(def.lagoon ?? 0x47e0cf); u.uShallow.value.set(def.shallow ?? 0x0f8f99); u.uDeep.value.set(def.deep ?? 0x05324a);
    this.cloudC = new THREE.Color(def.cloudColor ?? 0xffffff);
    if (def.startHour !== undefined) this.hour = def.startHour;
    this.makeForecast(isl.n);
    this.w = { ...WEATHER[this.forecast[0].type] };
  }
  makeForecast(seed) {
    const r = rng(seed * 131 + Math.floor(this.hour));
    const chain = CHAIN[this.band ?? 0];
    let cur = this.band === 4 ? 'still' : this.band === 2 ? 'rain' : this.band === 3 ? 'fog' : 'sunny';
    const start = Math.floor(this.hour / 3) * 3;
    this.forecast = [];
    for (let i = 0; i < 8; i++) { this.forecast.push({ hour: (start + i * 3) % 24, type: cur }); const next = chain[cur] ?? ['sunny']; cur = next[Math.floor(r() * next.length)]; }
  }
  get current() { return this.forecast[0]?.type ?? 'sunny'; }
  update(dt, focus) {
    this.hour = (this.hour + dt * 24 / this.dayLength) % 24;
    if (this.forecast.length && ((this.hour - this.forecast[0].hour + 24) % 24) >= 3 && ((this.hour - this.forecast[0].hour + 24) % 24) < 12) { this.forecast.shift(); const last = this.forecast.at(-1); const chain = CHAIN[this.band ?? 0]; const next = chain[last.type] ?? ['sunny']; this.forecast.push({ hour: (last.hour + 3) % 24, type: next[Math.floor(Math.random() * next.length)] }); }
    // ease toward the current weather
    const target = WEATHER[this.current]; const k = 1 - Math.exp(-dt * 0.25);
    for (const key of ['cloud', 'fog', 'rain', 'wind', 'storm']) this.w[key] += (target[key] - this.w[key]) * k;
    // sun path
    const ang = (this.hour - 6) / 12 * Math.PI;
    const sunDir = new THREE.Vector3(Math.cos(ang), Math.sin(ang) * 0.95, -0.38).normalize();
    const moonDir = new THREE.Vector3(-Math.cos(ang) * 0.8, -Math.sin(ang) * 0.9 + 0.15, -0.5).normalize();
    const el = sunDir.y;
    const s = skyAt(el);
    const night = Math.min(1, Math.max(0, (-el + 0.02) / 0.2));
    const dark = 1 - this.w.storm * 0.55 - this.w.cloud * 0.15;
    const zen = s.zen.clone().lerp(new THREE.Color(0x2a3240), this.w.storm * 0.7).multiplyScalar(dark);
    const hor = s.hor.clone().lerp(new THREE.Color(0x6a7280), this.w.storm * 0.6 + this.w.fog * 0.35).multiplyScalar(Math.max(0.35, dark));
    if (this.flash > 0) { zen.lerp(new THREE.Color(0xcfd8ff), this.flash); hor.lerp(new THREE.Color(0xcfd8ff), this.flash); }
    const u = this.sky.u;
    u.uSun.value.copy(sunDir); u.uMoon.value.copy(moonDir); u.uZenith.value.copy(zen); u.uHorizon.value.copy(hor); u.uSunColor.value.copy(s.sun);
    u.uDay.value = 1 - night; u.uCloud.value = this.w.cloud; u.uStorm.value = this.w.storm; u.uTime.value += dt; u.uFog.value = this.w.fog * 0.6;
    u.uCloudC.value.copy(this.cloudC ?? new THREE.Color(0xffffff));
    // lights: the sun by day, the moon by night
    const useMoon = el < -0.04;
    const lightDir = useMoon ? moonDir : sunDir;
    this.sun.color.copy(useMoon ? new THREE.Color(0x9fb0ff) : s.sun);
    this.sun.intensity = (useMoon ? 0.45 * Math.max(0, moonDir.y) * 2 : s.li) * (1 - this.w.cloud * 0.55) * (1 - this.w.storm * 0.3) + this.flash * 2;
    this.sun.target.position.set(focus.x, 0, focus.z);
    this.sun.position.copy(this.sun.target.position).addScaledVector(lightDir, 150);
    this.hemi.color.copy(zen).lerp(new THREE.Color(0xffffff), 0.4); this.hemi.groundColor.set(0x6a5a42).multiplyScalar(0.5 + (1 - night) * 0.5);
    this.hemi.intensity = 0.35 + (1 - night) * 0.8 + this.flash * 1.5;
    this.fill.position.copy(focus).add(new THREE.Vector3(-lightDir.x, 0.5, -lightDir.z).multiplyScalar(60)); this.fill.intensity = (0.15 + (1 - night) * 0.45);
    this.scene.fog.color.copy(hor);
    this.scene.fog.density = this.baseFog * (1 + this.w.fog * 2.2 + this.w.rain * 1.2);
    // water
    const wu = this.water.material.uniforms;
    wu.uTime.value += dt; wu.uHorizon.value.copy(hor); wu.uZenith.value.copy(zen); wu.uSunDir.value.copy(useMoon ? moonDir : sunDir);
    wu.uSunColor.value.copy(useMoon ? new THREE.Color(0xdfe6ff) : s.sun); wu.uSunPower.value = (useMoon ? 0.5 : 1) * (1 - this.w.cloud * 0.7);
    wu.uFogColor.value.copy(hor); wu.uFogDensity.value = this.scene.fog.density * 0.6; wu.uNight.value = night;
    wu.uAmp.value = 0.4 + this.w.wind / 70; wu.uFoam.value = 0.3 + this.w.wind / 80;
    this.water.position.set(this.camera.position.x, 0, this.camera.position.z);
    // rain follows the camera
    const rainOn = this.w.rain;
    this.rain.material.opacity = rainOn * 0.35; this.rain.visible = rainOn > 0.02;
    if (this.rain.visible) {
      const p = this.rain.geometry.attributes.position.array; const cx = this.camera.position.x, cz = this.camera.position.z, cy = this.camera.position.y;
      for (let i = 0; i < this.rainVel.length; i++) {
        const o = i * 6; let y = p[o + 1] - this.rainVel[i] * dt;
        let x = p[o], z = p[o + 2];
        if (y < cy - 6 || Math.abs(x - cx) > 25 || Math.abs(z - cz) > 25) { x = cx + (Math.random() - 0.5) * 50; z = cz + (Math.random() - 0.5) * 50; y = cy + 6 + Math.random() * 14; }
        p[o] = x; p[o + 1] = y; p[o + 2] = z; p[o + 3] = x + 0.12 + this.w.wind * 0.004; p[o + 4] = y - 0.8; p[o + 5] = z + 0.05;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    // lightning in storms
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.w.storm > 0.7) { this.nextBolt -= dt; if (this.nextBolt <= 0) { this.flash = 1; this.nextBolt = 6 + Math.random() * 14; setTimeout(() => this.audio?.play('thunder'), 600 + Math.random() * 1500); } }
    this.audio?.setLoop('rain', rainOn * 0.35, 3500);
    this.audio?.setLoop('wind', Math.min(0.4, this.w.wind / 120), 250 + this.w.wind * 6);
    this.audio?.setLoop('waves', 0.08 + this.w.wind / 400, 450 + this.w.wind * 5);
    this.night = night; this.sunDir = sunDir;
  }
  clock() { const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
}
