// Ties the HUD and the menus together and tracks whether a menu has the mouse.
import { Hud, catchCard } from './hud.js';
import { Menus, CONTROLS } from './menus.js';
import { h } from './hud.js';

export class UI {
  constructor(game) {
    this.g = game; this.root = document.getElementById('ui');
    this.hud = new Hud(game, this.root);
    this.menus = new Menus(this);
    this.modal = null;
  }
  get castRing() { return this.hud.castRing; }
  get mgRoot() { return this.hud.mgRoot; }
  toast(...a) { this.hud.toast(...a); }
  biteFlash(t) { this.hud.biteFlash(t); }
  refreshHud() { this.hud.refresh(); }
  catchCard(info) { catchCard(this, info); }
  openModal(name, el) {
    this.modal = name; this.openedAt = performance.now(); this.g.input.uiOpen = true; this.g.input.unlock();
    this.g.player.frozen = true; this.g.player.lookFrozen = true;
  }
  closeModal() {
    if (this.modal === 'card') { /* the card removes itself */ }
    this.menus.close(); this.modal = null; this.cardKeys = null; this.g.input.uiOpen = false;
    this.g.player.frozen = false; this.g.player.lookFrozen = false;
    this.hud.setHint(this.g.defaultHint());
    // take the mouse back so you can keep looking around
    const c = this.g.renderer.domElement; if (!window.__TEST__ && c.requestPointerLock) { try { const p = c.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
  }
  open(name, ...a) { this.openModal(name); this.menus.open(name, ...a); }
  talk(npc) { this.openModal('talk'); this.menus.talk(npc); }
  title(onPlay, hasSave) {
    const scr = h('div', 'screen title interactive');
    scr.innerHTML = `<h1>Reel of the Gods<span>A FISHING GAME ACROSS 100 ISLANDS</span></h1>
      <div class="menu"><button class="primary" data-a="play">${hasSave ? 'Continue' : 'Play'}</button><button data-a="controls">Controls</button></div>
      <div class="small">First playable version. One island to fish, plus a preview trip to islands 20, 50, 80 and 100. Characters are stand-ins until the real models are in.</div>
      <div class="panel controls" style="display:none;padding:14px 18px">${CONTROLS}</div>`;
    this.root.appendChild(scr);
    scr.querySelector('[data-a=controls]').onclick = () => { const c = scr.querySelector('.controls'); c.style.display = c.style.display === 'none' ? 'grid' : 'none'; };
    scr.querySelector('[data-a=play]').onclick = () => { scr.remove(); onPlay(); };
    return scr;
  }
  loading(text) {
    let el = document.querySelector('.loading');
    if (!text) { el?.remove(); return; }
    if (!el) { el = h('div', 'loading interactive'); this.root.appendChild(el); }
    el.innerHTML = `<div class="spin"></div><div>${text}</div>`;
  }
}
