// Sound effects made on the fly with Web Audio (no music, as designed).
export class Audio {
  constructor() { this.ctx = null; this.master = null; this.loops = {}; this.volume = 0.7; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(this.ctx.destination);
    // one second of white noise reused by many sounds
    const len = this.ctx.sampleRate * 2; this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.loop('waves', 0.12, 500, 0.15); this.loop('rain', 0, 3500, 0); this.loop('wind', 0, 300, 0);
  }
  noiseSrc() { const s = this.ctx.createBufferSource(); s.buffer = this.noise; return s; }
  env(node, t0, a, peak, d) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); node.connect(g); g.connect(this.master); return g; }
  loop(name, vol, freq, lfo) {
    const src = this.noiseSrc(); src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    if (lfo) { const o = this.ctx.createOscillator(); o.frequency.value = 0.12; const og = this.ctx.createGain(); og.gain.value = lfo * 0.5; o.connect(og); og.connect(g.gain); o.start(); }
    this.loops[name] = { g, f };
  }
  setLoop(name, vol, freq) { const l = this.loops[name]; if (!l || !this.ctx) return; l.g.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.5); if (freq) l.f.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.5); }
  play(name, opt = {}) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    const tone = (type, f0, f1, dur, vol, at = 0) => { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + at + dur); this.env(o, t + at, 0.005, vol, dur); o.start(t + at); o.stop(t + at + dur + 0.05); };
    const noise = (freq, q, dur, vol, type = 'bandpass', at = 0) => { const s = this.noiseSrc(); const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; s.connect(f); this.env(f, t + at, 0.01, vol, dur); s.start(t + at); s.stop(t + at + dur + 0.1); };
    switch (name) {
      case 'cast': noise(1800, 0.8, 0.35, 0.25, 'bandpass'); tone('sine', 900, 300, 0.3, 0.04); break;
      case 'splash': noise(900, 0.6, 0.5, 0.5 * (opt.big ? 1.6 : 1), 'lowpass'); noise(2400, 1.2, 0.25, 0.2); break;
      case 'reel': noise(4200, 6, 0.04, 0.12); break;
      case 'snap': tone('square', 1400, 180, 0.18, 0.2); noise(3000, 2, 0.15, 0.3); break;
      case 'coin': tone('triangle', 1320, 1320, 0.09, 0.12); tone('triangle', 1760, 1760, 0.16, 0.12, 0.07); break;
      case 'click': tone('sine', 700, 600, 0.05, 0.06); break;
      case 'tick': tone('square', 2200, 2000, 0.02, 0.03); break;
      case 'lose': tone('sawtooth', 300, 90, 0.5, 0.12); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.18, 0.12, i * 0.08)); break;
      case 'catch': {
        const tier = opt.tier ?? 0; const base = [392, 440, 494, 523, 587, 659, 740, 784, 880, 988, 1047, 1175][tier];
        const n = 2 + Math.min(5, Math.floor(tier / 2));
        for (let i = 0; i < n; i++) tone(tier >= 7 ? 'sawtooth' : 'triangle', base * Math.pow(1.26, i), base * Math.pow(1.26, i), 0.2, tier >= 7 ? 0.08 : 0.1, i * 0.09);
        if (tier >= 8) noise(6000, 0.5, 1.2, 0.08, 'highpass', 0.1);
        break;
      }
      case 'jump': noise(700, 0.7, 0.6, 0.5, 'lowpass'); break;
      case 'thunder': noise(120, 0.5, 2.5, 0.8, 'lowpass'); noise(60, 0.5, 3, 0.6, 'lowpass', 0.2); break;
      case 'step': noise(400 + Math.random() * 300, 1, 0.08, 0.05, 'bandpass'); break;
      case 'case': tone('square', 600 + (opt.i ?? 0) * 3, 600, 0.03, 0.04); break;
    }
  }
}
