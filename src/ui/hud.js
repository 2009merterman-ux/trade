// HUD: coins, place, weather forecast, rod, bait, prompts, toasts, the cast circle, dialogue and the catch card.
import { state, equippedRod, equippedRodDef, addCoins, save } from '../state.js';
import { TIERS, tierShort } from '../data/rarity.js';
import { GRADES, wearOf, WEAR } from '../data/rods.js';
import { baitById } from '../data/baits.js';
import { WEATHER } from '../world/environment.js';
import { drawFishIcon } from '../fishing/fishArt.js';

export const h = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
export const fmt = n => Math.round(n).toLocaleString('en-US');
export const money = n => `<span class="money"><span class="coin"></span>${fmt(n)}</span>`;
const ICONS = {
  sunny: '<circle cx="13" cy="13" r="6" fill="#ffd34d"/><g stroke="#ffd34d" stroke-width="2" stroke-linecap="round"><path d="M13 2v3M13 21v3M2 13h3M21 13h3M5 5l2 2M19 19l2 2M5 21l2-2M19 7l2-2"/></g>',
  cloudy: '<circle cx="10" cy="10" r="5" fill="#ffd34d"/><path d="M8 20h11a4 4 0 0 0 0-8 6 6 0 0 0-11 1 3.5 3.5 0 0 0 0 7z" fill="#e8eef5"/>',
  rain: '<path d="M6 15h13a4 4 0 0 0 0-8 6 6 0 0 0-11 1 3.5 3.5 0 0 0-2 7z" fill="#c9d3de"/><g stroke="#7cc4ff" stroke-width="2" stroke-linecap="round"><path d="M9 18l-1 4M14 18l-1 4M19 18l-1 4"/></g>',
  fog: '<g stroke="#b9bcc6" stroke-width="2.2" stroke-linecap="round"><path d="M4 9h18M2 14h20M5 19h16"/></g>',
  storm: '<path d="M5 14h14a4 4 0 0 0 0-8 6 6 0 0 0-11 1 3.5 3.5 0 0 0-3 7z" fill="#8c97a3"/><path d="M13 14l-3 6h3l-2 5 6-8h-3l2-3z" fill="#ffe14d"/>',
  still: '<path d="M17 4a9 9 0 1 0 5 15A7 7 0 0 1 17 4z" fill="#f6e7c1"/>',
};

export class Hud {
  constructor(game, root) {
    this.g = game; this.root = root;
    root.appendChild(h('div', 'vignette'));
    this.coins = h('div', 'panel hud-coins'); root.appendChild(this.coins);
    this.place = h('div', 'hud-place'); root.appendChild(this.place);
    this.forecast = h('div', 'panel hud-forecast'); root.appendChild(this.forecast);
    this.rod = h('div', 'panel hud-rod'); root.appendChild(this.rod);
    this.bait = h('div', 'panel hud-bait'); root.appendChild(this.bait);
    this.cross = h('div', 'crosshair'); root.appendChild(this.cross);
    this.prompt = h('div', 'panel prompt'); this.prompt.style.display = 'none'; root.appendChild(this.prompt);
    this.hint = h('div', 'hint'); root.appendChild(this.hint);
    this.toasts = h('div', 'toasts'); root.appendChild(this.toasts);
    this.mgRoot = h('div', 'mgroot'); root.appendChild(this.mgRoot);
    this.echoEl = h('div', 'echo'); this.echoEl.style.opacity = 0; root.appendChild(this.echoEl);
    this.castRing = new CastRing(root);
    this.lastForecast = '';
  }
  refresh() {
    this.coins.innerHTML = `<span class="coin"></span>${fmt(state.coins)}`;
    const isl = this.g.island; this.place.innerHTML = `Island ${isl.n} of 100<b>${isl.name}</b>`;
    const inst = equippedRod(), rod = equippedRodDef(), gr = GRADES[rod.grade];
    this.rod.innerHTML = `<div class="tag" style="background:${gr.color}22;color:${gr.color};border:1px solid ${gr.color}">${gr.name.toUpperCase()} ROD</div><div class="n">${rod.name}</div><div class="s">${wearOf(inst.wear).name} · Pattern #${String(inst.pattern).padStart(4, '0')}${inst.counter ? ` · ${fmt(inst.catches)} catches` : ''}</div>`;
    const b = state.equippedBait !== null && state.baits[state.equippedBait] ? baitById(state.equippedBait) : null;
    this.bait.innerHTML = b ? `<span class="bait-dot" style="background:${b.color}"></span><span><b>${b.name}</b> × ${state.baits[b.id]}</span>` : `<span class="bait-dot" style="background:#555"></span><span style="opacity:.7">No bait · <span class="key">Tab</span> to pick</span>`;
  }
  update(dt) {
    const env = this.g.env;
    const key = env.forecast.map(f => f.type + f.hour).join() + env.clock().slice(0, 4);
    if (key !== this.lastForecast) {
      this.lastForecast = key;
      const rows = env.forecast.slice(0, 3).map((f, i) => { const w = WEATHER[f.type]; return `<div class="frow"><span class="t">${i === 0 ? 'Now' : String(f.hour).padStart(2, '0') + ':00'}</span><svg width="24" height="24" viewBox="0 0 26 26">${ICONS[f.type]}</svg><span>${w.label}</span><span class="w">${w.wind ? `Wind ${w.wind} km/h` : 'No wind'}</span></div>`; }).join('');
      this.forecast.innerHTML = `<h4><span>Weather forecast</span><span>${env.clock()}</span></h4>${rows}`;
    }
  }
  setHint(html) { this.hint.innerHTML = html; }
  setPrompt(html) { if (!html) { this.prompt.style.display = 'none'; return; } this.prompt.style.display = ''; this.prompt.innerHTML = html; }
  toast(msg, kind = '', ms = 2200) { const t = h('div', `panel toast ${kind}`, msg); this.toasts.appendChild(t); setTimeout(() => t.remove(), ms); while (this.toasts.children.length > 4) this.toasts.firstChild.remove(); }
  biteFlash(tier) { const b = h('div', 'bite', '!'); b.style.color = tier.color; this.root.appendChild(b); setTimeout(() => b.remove(), 800); }
  echo(html) { this.echoEl.innerHTML = html; this.echoEl.style.opacity = html ? 1 : 0; }
}

// The cast circle: 0% at 6 o'clock, the needle sweeps clockwise while you hold the button.
export class CastRing {
  constructor(root) {
    this.el = h('div', 'castring'); root.appendChild(this.el);
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); this.svg.setAttribute('viewBox', '0 0 220 220'); this.svg.setAttribute('width', '210'); this.svg.setAttribute('height', '210');
    this.el.appendChild(this.svg); this.lbl = h('div', 'lbl'); this.el.appendChild(this.lbl); this.fl = h('div', 'flash'); this.el.appendChild(this.fl);
  }
  pt(a, r) { return [110 - r * Math.sin(a * Math.PI / 180), 110 + r * Math.cos(a * Math.PI / 180)]; }
  show(layout) {
    const R = 84; let s = `<defs><filter id="gl"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="110" cy="110" r="102" fill="rgba(8,14,22,0.5)" stroke="rgba(255,255,255,0.15)"/>`;
    for (const z of layout) {
      const [x1, y1] = this.pt(z.from, R), [x2, y2] = this.pt(z.to, R);
      s += `<path d="M${x1} ${y1}A${R} ${R} 0 ${z.to - z.from > 180 ? 1 : 0} 1 ${x2} ${y2}" fill="none" stroke="${z.color}" stroke-width="${z.key === 'gold' ? 28 : 16}" ${z.key === 'gold' ? 'filter="url(#gl)"' : ''}/>`;
    }
    s += `<line x1="110" y1="188" x2="110" y2="204" stroke="#fff" stroke-width="3"/><line id="nd" x1="110" y1="110" x2="110" y2="196" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="110" cy="110" r="8" fill="#fff"/>`;
    this.svg.innerHTML = s; this.nd = this.svg.querySelector('#nd'); this.fl.textContent = '';
    this.el.classList.add('on');
  }
  needle(a, zone) { const [x, y] = this.pt(a, 86); this.nd?.setAttribute('x2', x); this.nd?.setAttribute('y2', y); this.lbl.textContent = zone ? zone.label.toUpperCase() : ''; this.lbl.style.color = zone?.color === '#3d4552' ? '#aab' : zone?.color; }
  flash(z) { this.fl.textContent = z.key === 'gold' ? 'GOLD CAST!!' : `${z.label} cast`; this.fl.style.color = z.key === 'weak' ? '#c9ced6' : z.color; }
  hide() { this.el.classList.remove('on'); }
}

export function catchCard(ui, { fish, kg, price, isNew, isRecord }) {
  const t = TIERS[fish.tier];
  const ov = h('div', 'overlay interactive');
  const card = h('div', `panel card ${fish.tier >= 6 ? 'glow' : ''}`); card.style.setProperty('--glow', t.color); card.style.borderColor = t.color;
  card.innerHTML = `<div class="tierband" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}">${t.name.toUpperCase()}</div>
    <canvas width="600" height="340"></canvas>
    <div class="fname">${fish.name}</div>
    <div class="badges">${isNew ? '<span style="background:#38e08a;color:#042">NEW!</span>' : ''}${isRecord ? '<span style="background:#ffd23f;color:#2a1600">NEW RECORD</span>' : ''}</div>
    <div class="facts"><div>Weight<b>${kg} kg</b></div><div>Worth<b>${money(price)}</b></div><div>Caught<b>${state.collection[fish.id].count}×</b></div></div>
    <div class="row"><button class="primary" data-a="keep">Keep (bag)</button><button class="gold" data-a="sell">Sell now</button></div>`;
  drawFishIcon(card.querySelector('canvas').getContext('2d'), fish, 600, 340);
  ov.appendChild(card); ui.root.appendChild(ov);
  ui.openModal('card', ov);
  const close = (a) => {
    if (a === 'sell') { addCoins(price); ui.g.audio.play('coin'); ui.toast(`Sold for ${fmt(price)} coins`, 'good'); }
    else state.fishBag.push({ id: fish.id, kg, price });
    save(); ov.remove(); ui.closeModal(); ui.refreshHud();
  };
  card.querySelectorAll('button').forEach(b => b.onclick = () => close(b.dataset.a));
  ui.cardKeys = (code) => { if (code === 'KeyF' || code === 'Enter') close('sell'); if (code === 'KeyE' || code === 'Space') close('keep'); };
}

export function wearBars(w, color) { const idx = WEAR.findIndex(x => w <= x.max); return `<div class="wear" style="color:${color}">${WEAR.map((_, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('')}</div>`; }
export { tierShort };
