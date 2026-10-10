import './ui/style.css';
import * as THREE from 'three';
import { createRenderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { Audio } from './engine/audio.js';
import { Environment } from './world/environment.js';
import { buildIsland } from './world/scenes.js';
import { Player } from './player/controller.js';
import { Fishing } from './fishing/fishing.js';
import { UI } from './ui/ui.js';
import { state, save } from './state.js';
import { ISLANDS } from './data/islands.js';

const ECHO_LINES = [
  '“…the one who taught you the <b>sea</b>… <span class="x">███████</span> was forged in bronze…”',
  '“…they lived here once, beside us… <span class="x">██████</span> gave you the nets…”',
  '“…speak it, and the curse… <span class="x">████</span> …the name too heavy…”',
];

class Game {
  constructor() {
    const app = document.getElementById('app');
    Object.assign(this, createRenderer(app));
    this.input = new Input(this.renderer.domElement);
    this.audio = new Audio();
    this.env = new Environment(this.scene, this.camera, this.audio);
    this.player = new Player(this.camera, this.input, this.audio);
    this.ui = new UI(this);
    this.clock = new THREE.Clock();
    this.island = ISLANDS[(state.island ?? 1) - 1];
    this.env.hour = state.hour ?? 9;
    this.applySettings();
    this.bindKeys();
    window.__game = this;
  }
  get state() { return state; } // for tests and debugging
  applySettings() { this.audio.volume = state.settings.volume; if (this.audio.master) this.audio.master.gain.value = state.settings.volume; this.player.sensitivity = 0.0022 * state.settings.sensitivity; }
  defaultHint() { return this.fishing?.busy ? '' : 'Hold <span class="key">LMB</span> to charge a cast · <span class="key">Tab</span> bag · <span class="key">E</span> talk · <span class="key">Esc</span> menu'; }

  async start() {
    await this.load(this.island.n, true);
    this.fishing = new Fishing(this);
    this.ui.refreshHud(); this.ui.hud.setHint(this.defaultHint());
    this.running = true; this.clock.getDelta();
    this.loop();
    const persist = () => { state.hour = this.env.hour; save(); };
    setInterval(persist, 10000);
    addEventListener('pagehide', persist);
  }
  async load(n, first = false) {
    this.ui.loading(`Sailing to ${ISLANDS[n - 1].name}…`);
    await new Promise(r => setTimeout(r, 30));
    if (this.def) { this.scene.remove(this.def.root); this.def.root.traverse(o => { o.geometry?.dispose?.(); }); }
    this.island = ISLANDS[n - 1];
    const def = buildIsland(this.island);
    this.def = def; this.scene.add(def.root);
    this.env.setIsland(this.island, def);
    this.player.place(def);
    state.island = n; if (!state.visited.includes(n)) state.visited.push(n); save();
    this.renderer.compile(this.scene, this.camera);
    this.ui.loading(null);
    if (!first) { this.ui.refreshHud(); this.ui.toast(`Island ${n} · ${this.island.name}`, 'good', 3000); }
  }
  async travel(n) {
    if (n === this.island.n) return;
    if (this.ui.modal) this.ui.closeModal();
    this.fishing?.cleanup(); this.near = null; await this.load(n);
  }

  bindKeys() {
    const inp = this.input;
    inp.on('mousedown', (b) => {
      this.audio.start();
      if (b !== 0 || !this.running) return;
      if (this.ui.modal === 'talk') return this.ui.menus.talkNext?.();
      if (this.ui.modal) return;
      if (!inp.locked && !window.__TEST__) return; // the first click only captures the mouse
      this.fishing.pressDown();
    });
    inp.on('mouseup', (b) => { if (b === 0 && this.fishing) this.fishing.pressUp(); });
    // losing the mouse (Esc in the browser) opens the pause menu
    inp.on('lock', (locked) => { if (!locked && this.running && !this.ui.modal && !window.__TEST__) this.ui.open('pause'); });
    inp.on('key', (code) => {
      this.audio.start();
      if (!this.running) return;
      if (this.ui.cardKeys) return this.ui.cardKeys(code);
      if (code === 'Escape') { if (this.ui.modal && performance.now() - (this.ui.openedAt ?? 0) < 250) return; if (this.ui.modal) this.ui.closeModal(); else if (this.fishing.busy) this.fishing.cancel('Reeled in.'); else this.ui.open('pause'); return; }
      if (this.ui.modal === 'talk' && (code === 'KeyE' || code === 'Space')) return this.ui.menus.talkNext?.();
      if (code === 'Tab') { if (this.ui.modal === 'bag') this.ui.closeModal(); else if (!this.ui.modal && !this.fishing.busy) this.ui.open('bag'); return; }
      if (this.ui.modal) { if (code === 'KeyC' && this.ui.modal === 'collection') this.ui.closeModal(); return; }
      if (code === 'Space' && this.fishing.busy) return this.fishing.pressDown();
      if (code === 'KeyE' && this.near && !this.fishing.busy) return this.interact(this.near);
      if (code === 'KeyC' && !this.fishing.busy) return this.ui.open('collection');
      if (code === 'KeyT' && !this.fishing.busy) return this.ui.open('travel');
    });
  }
  interact(npc) {
    if (npc.action === 'shop') this.ui.open('shop', npc.name);
    else if (npc.action === 'upgrader') this.ui.open('upgrader');
    else this.ui.talk(npc);
  }
  findNear() {
    if (!this.def) return null; const p = this.player.pos; const f = this.player.forward(); let best = null, bd = 3.4;
    for (const npc of this.def.npcs) {
      const o = npc.obj.position; const dx = o.x - p.x, dz = o.z - p.z; const d = Math.hypot(dx, dz);
      if (d < bd && (dx * f.x + dz * f.z) / Math.max(0.01, d) > 0.35) { bd = d; best = npc; }
    }
    return best;
  }
  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(0.05, this.clock.getDelta());
    this.step(dt);
    this.composer.render();
  }
  step(dt) {
    const inp = this.input;
    this.player.frozen = !!this.ui.modal || (this.fishing && this.fishing.busy);
    this.player.update(dt);
    this.env.update(this.ui.modal === 'pause' ? 0 : dt, this.player.pos);
    const reel = inp.buttons.has(0) || inp.down('Space');
    const pull = (inp.down('KeyA') ? -1 : 0) + (inp.down('KeyD') ? 1 : 0);
    if (this.ui.modal !== 'pause') this.fishing.update(dt, { reel, pull });
    this.ui.hud.update(dt);
    this.ui.menus.tick(dt);
    for (const npc of this.def.npcs) { const o = npc.obj; o.userData.t = (o.userData.t ?? Math.random() * 10) + dt; const c = o.children[0]; if (c) c.position.y = Math.abs(Math.sin(o.userData.t * 1.6)) * 0.03; o.userData.mixer?.update(dt); }
    // interaction prompt
    this.near = this.ui.modal || this.fishing.busy ? null : this.findNear();
    this.ui.hud.setPrompt(this.near ? `<span class="key">E</span> ${this.near.action === 'shop' ? `Shop · ${this.near.name}` : this.near.action === 'upgrader' ? 'Use the upgrader' : `Talk to ${this.near.name}`}` : null);
    if (this.fishing.busy) this.ui.hud.setHint(this.fishing.mode === 'charging' ? 'Let go of <span class="key">LMB</span> inside a zone · gold sends it furthest' : this.fishing.mode === 'fight' ? '<span class="key">Esc</span> to give up' : '');
    else if (!this.ui.modal) this.ui.hud.setHint(!this.input.locked && !window.__TEST__ ? 'Click the game to look around' : this.defaultHint());
    // island 100: echoes near the temple
    if (this.def.echo) { const d = Math.hypot(this.player.pos.x, this.player.pos.z + 38); const on = d < 70; if (on !== this.echoOn) { this.echoOn = on; this.ui.hud.echo(on ? ECHO_LINES[Math.floor(Math.random() * ECHO_LINES.length)] : ''); } }
    else if (this.echoOn) { this.echoOn = false; this.ui.hud.echo(''); }
  }
}

const game = new Game();
const begin = () => game.start().catch(e => { console.error(e); game.ui.loading(`Something went wrong: ${e.message}`); });
if (window.__TEST__) begin();
else game.ui.title(begin, state.stats.casts > 0);
