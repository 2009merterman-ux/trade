// Menus: bag, shop, cases, upgrader, collection, rod showroom, travel, pause, title, dialogue.
import { state, equippedRod, addCoins, addRod, removeRod, addBait, save, reset } from '../state.js';
import { TIERS } from '../data/rarity.js';
import { RODS, GRADES, rodById, wearOf, rodValue, newRodInstance, shopRods, caseInfo, openCase } from '../data/rods.js';
import { BAITS, baitById, baitUnitValue, shopBaits } from '../data/baits.js';
import { fishById, fishOfIsland } from '../data/fish.js';
import { ISLANDS, PREVIEW_ISLANDS, BANDS } from '../data/islands.js';
import { paintFinish } from '../player/rodVisual.js';
import { drawFishIcon } from '../fishing/fishArt.js';
import { h, fmt, money, wearBars } from './hud.js';
import { RodPreview, drawSwatch } from './preview.js';

const SELL_RATE = 0.85; // shops buy rods back at 85% of their value

function windowEl(title, tabs, onTab) {
  const scr = h('div', 'screen interactive');
  const win = h('div', 'panel window');
  const head = h('header'); head.innerHTML = `<h2>${title}</h2>`;
  const tabBar = h('div', 'tabs');
  for (const t of tabs) { const b = h('button', '', t); b.onclick = () => { tabBar.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); onTab(t); }; tabBar.appendChild(b); }
  head.appendChild(tabBar);
  const coins = h('div', 'money'); coins.innerHTML = money(state.coins); head.appendChild(coins);
  const close = h('button', '', 'Close <span class="key">Esc</span>'); head.appendChild(close);
  const body = h('div', 'body');
  win.append(head, body); scr.appendChild(win);
  return { scr, win, body, close, tabBar, coins, refreshCoins: () => { coins.innerHTML = money(state.coins); } };
}
function rodItem(inst, { price, equipped, onClick, sel } = {}) {
  const rod = rodById(inst.rodId), gr = GRADES[rod.grade];
  const it = h('div', `item ${sel ? 'sel' : ''}`);
  it.innerHTML = `<div class="bar" style="background:${gr.color}"></div><canvas width="300" height="140"></canvas><div class="nm">${rod.name}</div><div class="sub">${gr.name} · ${wearOf(inst.wear).name}${inst.locked ? ' · starter' : ''}</div><div class="price"><span class="coin"></span>${fmt(price ?? rodValue(inst))}</div>${equipped ? '<div class="eq">EQUIPPED</div>' : ''}`;
  drawSwatch(it.querySelector('canvas'), paintFinish(rod.finish, inst.pattern, inst.wear));
  it.onclick = onClick; return it;
}
function rodStats(inst, extra = '') {
  const rod = rodById(inst.rodId), gr = GRADES[rod.grade], w = wearOf(inst.wear);
  return `<h3 style="color:${gr.color}">${rod.name}</h3>
    <div class="stat"><span>Grade</span><span style="color:${gr.color}">${gr.name}</span></div>
    <div class="stat"><span>Wear</span><span>${w.name} (${inst.wear.toFixed(3)})</span></div>${wearBars(inst.wear, gr.color)}
    <div class="stat"><span>Pattern</span><span>#${String(inst.pattern).padStart(4, '0')}</span></div>
    <div class="stat"><span>Power (fights)</span><span>${rod.power.toFixed(1)}</span></div>
    <div class="stat"><span>Luck</span><span>×${rod.luck.toFixed(2)}</span></div>
    <div class="stat"><span>Cast distance</span><span>${rod.cast} m</span></div>
    <div class="stat"><span>Catch counter</span><span>${inst.counter ? fmt(inst.catches) : '—'}</span></div>
    <div class="stat"><span>Value</span><span>${money(rodValue(inst))}</span></div>${extra}`;
}

export class Menus {
  constructor(ui) { this.ui = ui; this.g = ui.g; this.previews = []; }
  get root() { return this.ui.root; }
  open(name, ...a) { this.close(); this.current = name; this[`open_${name}`](...a); }
  close() { if (this.cur) { this.cur.remove(); this.cur = null; } this.previews = []; this.current = null; if (this.spinTimer) { clearInterval(this.spinTimer); this.spinTimer = null; } }
  mount(w) { this.cur = w.scr; this.root.appendChild(w.scr); w.close.onclick = () => this.ui.closeModal(); }
  tick(dt) { for (const p of this.previews) p.draw(dt); }
  preview(canvas, inst) { const p = new RodPreview(canvas); p.set(inst); this.previews = [p]; return p; }

  // ---------- bag ----------
  open_bag(tab = 'Rods') {
    const w = windowEl('Your bag', ['Rods', 'Bait', 'Fish', 'Stats'], t => render(t)); this.mount(w);
    const render = (t) => {
      w.refreshCoins(); w.body.innerHTML = ''; this.previews = [];
      if (t === 'Rods') {
        const split = h('div', 'split'); const grid = h('div', 'grid'); const side = h('div', 'side');
        split.append(grid, side); w.body.appendChild(split);
        let sel = state.rods.find(r => r.uid === state.equippedRod) ?? state.rods[0];
        const drawSide = () => {
          side.innerHTML = `<canvas class="preview"></canvas>${rodStats(sel)}<div style="display:flex;gap:8px;margin-top:6px"><button class="primary" data-a="equip" ${sel.uid === state.equippedRod ? 'disabled' : ''}>Equip</button><button class="danger" data-a="sell" ${sel.locked ? 'disabled' : ''}>Sell for ${fmt(rodValue(sel) * SELL_RATE)}</button></div><button data-a="showroom">Open rod showroom (all 1,000 rods)</button>`;
          this.preview(side.querySelector('canvas'), sel);
          side.querySelector('[data-a=equip]').onclick = () => { state.equippedRod = sel.uid; save(); this.g.fishing.rebuildRod(); this.ui.refreshHud(); render('Rods'); };
          side.querySelector('[data-a=sell]').onclick = () => { const v = Math.round(rodValue(sel) * SELL_RATE); if (removeRod(sel.uid)) { addCoins(v); this.g.audio.play('coin'); this.g.fishing.rebuildRod(); save(); this.ui.refreshHud(); render('Rods'); } };
          side.querySelector('[data-a=showroom]').onclick = () => this.open('showroom');
        };
        for (const inst of state.rods) grid.appendChild(rodItem(inst, { equipped: inst.uid === state.equippedRod, sel: inst === sel, onClick: () => { sel = inst; grid.querySelectorAll('.item').forEach(x => x.classList.remove('sel')); grid.children[state.rods.indexOf(inst)].classList.add('sel'); drawSide(); } }));
        drawSide();
      } else if (t === 'Bait') {
        const grid = h('div', 'grid'); w.body.appendChild(grid);
        const ids = Object.keys(state.baits).map(Number).filter(id => state.baits[id] > 0);
        if (!ids.length) w.body.innerHTML = '<div class="empty">No bait. Buy some at the market.</div>';
        for (const id of ids) { const b = baitById(id); const it = h('div', `item ${state.equippedBait === id ? 'sel' : ''}`); it.innerHTML = `<div class="bar" style="background:${b.color}"></div><div class="nm">${b.name}</div><div class="sub">× ${state.baits[id]} · luck ×${b.luck.toFixed(2)}<br>Fish like it: ${b.likes.join(', ')}</div>${state.equippedBait === id ? '<div class="eq">ON HOOK</div>' : ''}`; it.onclick = () => { state.equippedBait = state.equippedBait === id ? null : id; save(); this.ui.refreshHud(); render('Bait'); }; grid.appendChild(it); }
        if (ids.length) w.body.appendChild(h('div', 'empty', 'Click a bait to put it on your hook (click again to take it off). One piece is used per cast.'));
      } else if (t === 'Fish') this.fishList(w, () => render('Fish'));
      else {
        const s = state.stats; const big = s.biggest ? fishById(s.biggest.id) : null;
        const caught = Object.keys(state.collection).length;
        w.body.innerHTML = `<div class="side" style="border:0;padding:0;max-width:520px">${[['Casts', s.casts], ['Fish caught', s.catches], ['Got away', s.lost], ['Gold casts', s.gold], ['Species found', `${caught} / 3,001`], ['Biggest catch', big ? `${big.name} · ${s.biggest.kg} kg` : '—'], ['Upgrades tried', s.upgrades], ['Cases opened', s.cases], ['Coins earned', fmt(s.earned)]].map(([a, b]) => `<div class="stat"><span>${a}</span><span>${b}</span></div>`).join('')}</div>`;
      }
    };
    w.tabBar.querySelectorAll('button')[['Rods', 'Bait', 'Fish', 'Stats'].indexOf(tab)].classList.add('on');
    render(tab);
  }
  fishList(w, rerender) {
    if (!state.fishBag.length) { w.body.innerHTML = '<div class="empty">Your fish bag is empty. Keep a catch to put it here, then sell it at any market.</div>'; return; }
    const total = state.fishBag.reduce((a, f) => a + f.price, 0);
    const top = h('div', '', `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><span>${state.fishBag.length} fish worth ${money(total)}</span><button class="gold">Sell all</button></div>`);
    top.querySelector('button').onclick = () => { addCoins(total); state.fishBag = []; this.g.audio.play('coin'); save(); this.ui.refreshHud(); w.refreshCoins(); rerender(); };
    const grid = h('div', 'grid'); w.body.append(top, grid);
    state.fishBag.forEach((bf, i) => {
      const f = fishById(bf.id), t = TIERS[f.tier]; const it = h('div', 'item');
      it.innerHTML = `<div class="bar" style="background:${t.color}"></div><canvas width="300" height="140"></canvas><div class="nm">${f.name}</div><div class="sub" style="color:${t.color}">${t.short ?? t.name} · ${bf.kg} kg</div><div class="price"><span class="coin"></span>${fmt(bf.price)} <button style="margin-left:auto;padding:3px 8px;font-size:11px">Sell</button></div>`;
      drawFishIcon(it.querySelector('canvas').getContext('2d'), f, 300, 140);
      it.querySelector('button').onclick = (e) => { e.stopPropagation(); addCoins(bf.price); state.fishBag.splice(i, 1); this.g.audio.play('coin'); save(); this.ui.refreshHud(); w.refreshCoins(); rerender(); };
      grid.appendChild(it);
    });
  }

  // ---------- shop ----------
  open_shop(npcName) {
    const isl = this.g.island; const level = isl.level;
    const w = windowEl(npcName ?? 'Market', ['Rods', 'Cases', 'Bait', 'Sell fish'], t => render(t)); this.mount(w);
    const render = (t) => {
      w.refreshCoins(); w.body.innerHTML = ''; this.previews = [];
      if (t === 'Rods') {
        const split = h('div', 'split'); const grid = h('div', 'grid'); const side = h('div', 'side'); split.append(grid, side); w.body.appendChild(split);
        const stock = shopRods(level, isl.n * 17 + Math.floor(this.g.env.hour / 6)).map(id => newRodInstance(id, Math.random, { wear: 0.02 + (id % 7) * 0.012, pattern: (id * 37) % 1000, counter: false }));
        let sel = stock[0];
        const drawSide = () => {
          const price = rodById(sel.rodId).price;
          side.innerHTML = `<canvas class="preview"></canvas>${rodStats(sel)}<button class="gold" ${state.coins < price ? 'disabled' : ''}>Buy for ${fmt(price)}</button>`;
          this.preview(side.querySelector('canvas'), sel);
          side.querySelector('button').onclick = () => { if (state.coins < price) return; addCoins(-price); addRod({ ...sel, uid: newRodInstance(sel.rodId).uid }); this.g.audio.play('coin'); save(); this.ui.refreshHud(); this.ui.toast(`Bought ${rodById(sel.rodId).name}`, 'good'); render('Rods'); };
        };
        stock.forEach((inst, i) => grid.appendChild(rodItem(inst, { price: rodById(inst.rodId).price, sel: i === 0, onClick: () => { sel = inst; grid.querySelectorAll('.item').forEach(x => x.classList.remove('sel')); grid.children[i].classList.add('sel'); drawSide(); } })));
        drawSide();
      } else if (t === 'Cases') {
        const wrap = h('div', 'grid'); wrap.style.gridTemplateColumns = 'repeat(auto-fill,minmax(300px,1fr))'; w.body.appendChild(wrap);
        for (const wide of [false, true]) {
          const info = caseInfo(level, wide);
          const it = h('div', 'item'); it.style.cursor = 'default';
          it.innerHTML = `<div class="nm" style="font-size:17px">${info.name}</div><div class="sub">${wide ? 'A wider spread of rods: bigger wins, more junk.' : "Rods from around this island's level."} ${info.odds.length} rods inside.</div>
            <div style="margin:10px 0">${info.grades.map(g => `<div class="oddsrow"><span style="color:${GRADES[g.g].color}">${GRADES[g.g].name}</span><span>${(g.p * 100).toFixed(2)}%</span></div>`).join('')}</div>
            <div style="display:flex;justify-content:space-between;align-items:center"><span>${money(info.price)}</span><button class="gold" ${state.coins < info.price ? 'disabled' : ''}>Open case</button></div>`;
          it.querySelector('button').onclick = () => { if (state.coins < info.price) return; addCoins(-info.price); state.stats.cases++; this.ui.refreshHud(); this.caseOpening(info, () => render('Cases')); };
          wrap.appendChild(it);
        }
        w.body.appendChild(h('div', 'empty', 'Odds are exact. Each grade\'s chance is shared evenly by the rods of that grade in the case.'));
      } else if (t === 'Bait') {
        const grid = h('div', 'grid'); w.body.appendChild(grid);
        for (const id of shopBaits(level)) { const b = BAITS[id]; const it = h('div', 'item'); it.innerHTML = `<div class="bar" style="background:${b.color}"></div><div class="nm">${b.name}</div><div class="sub">Pack of ${b.pack} · luck ×${b.luck.toFixed(2)}<br>Fish like it: ${b.likes.join(', ')}</div><div class="price"><span class="coin"></span>${fmt(b.price)}<button style="margin-left:auto;padding:3px 10px;font-size:12px" ${state.coins < b.price ? 'disabled' : ''}>Buy</button></div>`; it.querySelector('button').onclick = () => { if (state.coins < b.price) return; addCoins(-b.price); addBait(id, b.pack); if (state.equippedBait === null) state.equippedBait = id; this.g.audio.play('coin'); save(); this.ui.refreshHud(); render('Bait'); }; grid.appendChild(it); }
      } else this.fishList(w, () => render('Sell fish'));
    };
    w.tabBar.querySelector('button').classList.add('on'); render('Rods');
  }
  caseOpening(info, done) {
    const ov = h('div', 'overlay interactive'); const box = h('div', 'panel', ''); box.style.cssText = 'width:min(900px,94vw);padding:18px';
    box.innerHTML = `<div style="font-weight:800;font-size:18px">${info.name}</div><div class="reel"><div class="pointer"></div><div class="strip"></div></div><div class="res" style="min-height:90px;text-align:center"></div>`;
    ov.appendChild(box); this.root.appendChild(ov);
    const result = openCase(info); const strip = box.querySelector('.strip');
    const cells = []; const N = 60, winAt = 52;
    for (let i = 0; i < N; i++) { const rod = i === winAt ? result : openCase(info); cells.push(rod); const c = h('div', 'cell'); c.style.borderColor = GRADES[rod.grade].color; c.innerHTML = `<canvas width="300" height="140"></canvas><div>${rod.name}</div>`; drawSwatch(c.querySelector('canvas'), paintFinish(rod.finish, i * 13, 0.05)); strip.appendChild(c); }
    const cellW = 158; const reelW = box.querySelector('.reel').clientWidth || 860;
    const target = winAt * cellW + 75 - reelW / 2 + (Math.random() - 0.5) * 120;
    const T = 5200; const t0 = performance.now(); let lastCell = -1;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / T); const e = 1 - Math.pow(1 - k, 4);
      const x = target * e; strip.style.transform = `translateX(${-x}px)`;
      const cell = Math.floor((x + reelW / 2) / cellW); if (cell !== lastCell) { lastCell = cell; this.g.audio.play('case', { i: cell }); }
      if (k < 1) requestAnimationFrame(step);
      else {
        const inst = addRod(newRodInstance(result.id)); save();
        const gr = GRADES[result.grade];
        this.g.audio.play(result.grade >= 3 ? 'win' : 'coin');
        box.querySelector('.res').innerHTML = `<div style="font-size:12px;letter-spacing:2px;color:${gr.color};font-weight:800">${gr.name.toUpperCase()}</div><div style="font-size:22px;font-weight:800">${result.name}</div><div style="color:var(--muted);font-size:13px;margin:4px 0 10px">${wearOf(inst.wear).name} · worth ${fmt(rodValue(inst))} coins</div><button class="primary">Nice</button>`;
        box.querySelector('button').onclick = () => { ov.remove(); done(); };
      }
    };
    requestAnimationFrame(step);
  }

  // ---------- upgrader ----------
  open_upgrader() {
    const w = windowEl('Upgrader', [], () => {}); this.mount(w);
    const picked = new Map(); // key -> {kind, ref, qty, value}
    let target = null; let spinning = false;
    const wrap = h('div', 'upg'); w.body.appendChild(wrap);
    const left = h('div', 'col'), mid = h('div', 'center'), right = h('div', 'col');
    wrap.append(left, mid, right);
    const inValue = () => [...picked.values()].reduce((a, p) => a + p.value * p.qty, 0);
    const chance = () => (target ? Math.min(0.95, inValue() / rodById(target).price * 0.95) : 0);
    const drawLeft = () => {
      left.innerHTML = '<h3 style="margin:0">Put in (rods and bait)</h3><div class="list"></div>';
      const list = left.querySelector('.list');
      for (const inst of state.rods) {
        if (inst.locked) continue; const rod = rodById(inst.rodId); const key = inst.uid; const on = picked.has(key);
        const row = h('div', `row ${on ? 'sel' : ''}`); row.innerHTML = `<span class="g" style="background:${GRADES[rod.grade].color}"></span><span class="nm">${rod.name}<br><span style="color:var(--muted)">${wearOf(inst.wear).name}${inst.uid === state.equippedRod ? ' · equipped' : ''}</span></span>${money(rodValue(inst))}`;
        row.onclick = () => { if (spinning) return; on ? picked.delete(key) : picked.set(key, { kind: 'rod', ref: inst.uid, qty: 1, value: rodValue(inst) }); drawAll(); };
        list.appendChild(row);
      }
      for (const id of Object.keys(state.baits).map(Number)) {
        const have = state.baits[id]; if (!have) continue; const b = baitById(id); const key = `b${id}`; const p = picked.get(key);
        const row = h('div', `row ${p ? 'sel' : ''}`); row.innerHTML = `<span class="g" style="background:${b.color}"></span><span class="nm">${b.name}<br><span style="color:var(--muted)">${p ? p.qty : 0} of ${have} · ${fmt(baitUnitValue(id))} each</span></span><button style="padding:2px 8px">−</button><button style="padding:2px 8px">+</button>`;
        const [minus, plus] = row.querySelectorAll('button');
        minus.onclick = e => { e.stopPropagation(); if (spinning || !p) return; p.qty--; if (p.qty <= 0) picked.delete(key); drawAll(); };
        plus.onclick = e => { e.stopPropagation(); if (spinning) return; const cur = picked.get(key) ?? { kind: 'bait', ref: id, qty: 0, value: baitUnitValue(id) }; cur.qty = Math.min(have, cur.qty + Math.max(1, Math.floor(have / 5))); picked.set(key, cur); drawAll(); };
        row.onclick = () => plus.onclick({ stopPropagation() {} });
        list.appendChild(row);
      }
      if (!list.children.length) list.innerHTML = '<div class="empty">Nothing to put in. Your starter rod can\'t be upgraded away. Buy rods or bait first.</div>';
    };
    const drawRight = () => {
      const v = Math.max(1, inValue());
      right.innerHTML = '<h3 style="margin:0">Pick a target rod</h3><div class="list"></div>';
      const list = right.querySelector('.list');
      const options = RODS.filter(r => r.price > v * 1.02).sort((a, b) => a.price - b.price).slice(0, 80);
      if (!picked.size) { list.innerHTML = '<div class="empty">Put something in first.</div>'; return; }
      for (const r of options) { const c = Math.min(0.95, v / r.price * 0.95); const row = h('div', `row ${target === r.id ? 'sel' : ''}`); row.innerHTML = `<span class="g" style="background:${GRADES[r.grade].color}"></span><span class="nm">${r.name}<br><span style="color:var(--muted)">${(c * 100).toFixed(2)}% chance</span></span>${money(r.price)}`; row.onclick = () => { if (spinning) return; target = r.id; drawAll(); }; list.appendChild(row); }
    };
    const drawMid = (spinAngle = null, resultText = '') => {
      const c = chance(); const v = inValue();
      if (!mid.querySelector('canvas')) mid.innerHTML = `<canvas width="520" height="520"></canvas><div class="chance"></div><div class="formula"></div><button class="gold" style="padding:12px 30px;font-size:17px">UPGRADE</button><div class="result" style="min-height:44px;text-align:center;font-weight:800"></div>`;
      const cv = mid.querySelector('canvas'), ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, 520, 520); ctx.lineWidth = 46; ctx.strokeStyle = '#3a2f5a'; ctx.beginPath(); ctx.arc(260, 260, 200, 0, 7); ctx.stroke();
      if (c > 0) { ctx.strokeStyle = '#38e08a'; ctx.shadowColor = '#38e08a'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(260, 260, 200, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c); ctx.stroke(); ctx.shadowBlur = 0; }
      const a = (spinAngle ?? -90) * Math.PI / 180; ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(260, 260); ctx.lineTo(260 + Math.cos(a) * 225, 260 + Math.sin(a) * 225); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(260, 260, 14, 0, 7); ctx.fill();
      mid.querySelector('.chance').textContent = target ? `${(c * 100).toFixed(2)}%` : '—';
      mid.querySelector('.formula').innerHTML = target ? `${fmt(v)} ÷ ${fmt(rodById(target).price)} × 0.95<br>Win: you get <b>${rodById(target).name}</b>. Lose: everything you put in is gone.` : 'Chance = value put in ÷ target value × 0.95 (max 95%)';
      const btn = mid.querySelector('button'); btn.disabled = !target || !picked.size || spinning;
      btn.onclick = spin;
      if (resultText !== null) mid.querySelector('.result').innerHTML = resultText;
    };
    const drawAll = () => { if (target && rodById(target).price <= inValue() * 1.02) target = null; drawLeft(); drawRight(); drawMid(); w.refreshCoins(); };
    const spin = () => {
      if (!target || !picked.size || spinning) return;
      spinning = true; state.stats.upgrades++;
      const c = chance(); const win = Math.random() < c;
      // the needle stops inside the green arc on a win, outside on a loss
      const stopFrac = win ? Math.random() * c : c + Math.random() * (1 - c);
      const endAngle = -90 + 360 * 5 + stopFrac * 360; const t0 = performance.now(), T = 3600; let lastTick = 0;
      const tgt = target;
      for (const p of picked.values()) { if (p.kind === 'rod') removeRod(p.ref); else addBait(p.ref, -p.qty); }
      picked.clear(); this.g.fishing.rebuildRod(); save();
      const anim = () => {
        const k = Math.min(1, (performance.now() - t0) / T); const e = 1 - Math.pow(1 - k, 3); const ang = -90 + (endAngle + 90) * e;
        if (Math.floor(ang / 15) !== lastTick) { lastTick = Math.floor(ang / 15); this.g.audio.play('tick'); }
        drawMid(ang, null);
        if (k < 1) return requestAnimationFrame(anim);
        spinning = false;
        if (win) { const inst = addRod(newRodInstance(tgt)); this.g.audio.play('win'); target = null; save(); drawAll(); mid.querySelector('.result').innerHTML = `<span style="color:var(--good)">YOU WON ${rodById(tgt).name}!</span><br><span style="font-size:12px;color:var(--muted)">${wearOf(inst.wear).name}</span>`; }
        else { this.g.audio.play('lose'); target = null; save(); drawAll(); mid.querySelector('.result').innerHTML = '<span style="color:var(--bad)">Lost it all. Bad luck.</span>'; }
        this.ui.refreshHud();
      };
      requestAnimationFrame(anim);
    };
    drawAll();
  }

  // ---------- collection ----------
  open_collection(n) {
    const shown = n ?? this.g.island.n;
    const options = [...new Set([shown, ...state.visited, ...PREVIEW_ISLANDS])].sort((a, b) => a - b);
    const w = windowEl('Fish collection', [], () => {}); this.mount(w);
    const sel = h('select'); sel.style.cssText = 'background:#111a;color:#fff;border:1px solid var(--line);border-radius:8px;padding:6px'; for (const o of options) { const op = h('option', '', `Island ${o} · ${ISLANDS[o - 1].name}`); op.value = o; if (o === shown) op.selected = true; sel.appendChild(op); }
    sel.onchange = () => this.open('collection', Number(sel.value));
    w.win.querySelector('header').insertBefore(sel, w.win.querySelector('.tabs'));
    const fish = fishOfIsland(shown); const got = fish.filter(f => state.collection[f.id]).length;
    w.body.innerHTML = `<div style="margin-bottom:12px;color:var(--muted)">${got} of ${fish.length} found on ${ISLANDS[shown - 1].name}. Undiscovered fish show as silhouettes.</div>`;
    const grid = h('div', 'grid'); w.body.appendChild(grid);
    for (const f of fish) {
      const c = state.collection[f.id]; const t = TIERS[f.tier]; const it = h('div', 'item'); it.style.cursor = 'default';
      it.innerHTML = `<div class="bar" style="background:${c ? t.color : '#333'}"></div><canvas width="300" height="140"></canvas><div class="nm">${c ? f.name : '???'}</div><div class="sub" style="color:${t.color}">${t.short ?? t.name}</div><div class="sub">${c ? `Record ${c.bestKg} kg · caught ${c.count}×` : 'Not caught yet'}</div>`;
      drawFishIcon(it.querySelector('canvas').getContext('2d'), f, 300, 140, !c);
      grid.appendChild(it);
    }
  }

  // ---------- showroom: all 1,000 rods ----------
  open_showroom() {
    const w = windowEl('Rod showroom', ['All', ...GRADES.map(g => g.name)], t => render(t)); this.mount(w);
    const render = (t) => {
      w.body.innerHTML = ''; const split = h('div', 'split'); const grid = h('div', 'grid'); const side = h('div', 'side'); split.append(grid, side); w.body.appendChild(split);
      const list = RODS.filter(r => t === 'All' || GRADES[r.grade].name === t);
      let page = 0; const per = 60;
      const show = (r) => { const inst = { uid: 'preview', rodId: r.id, wear: 0.03, pattern: 77, catches: 0, counter: false }; side.innerHTML = `<canvas class="preview"></canvas>${rodStats(inst)}<div class="stat"><span>Shop price</span><span>${money(r.price)}</span></div>`; this.preview(side.querySelector('canvas'), inst); };
      const more = () => {
        for (const r of list.slice(page * per, (page + 1) * per)) { const inst = { uid: 'p', rodId: r.id, wear: 0.03, pattern: 77 }; grid.appendChild(rodItem(inst, { price: r.price, onClick: () => { grid.querySelectorAll('.item').forEach(x => x.classList.remove('sel')); show(r); } })); }
        page++;
        if (page * per < list.length) { const b = h('button', '', `Show more (${list.length - page * per} left)`); b.style.gridColumn = '1/-1'; b.onclick = () => { b.remove(); more(); }; grid.appendChild(b); }
      };
      more(); show(list[list.length - 1]);
    };
    w.tabBar.querySelector('button').classList.add('on'); render('All');
  }

  // ---------- travel ----------
  open_travel() {
    const w = windowEl('Travel (preview)', [], () => {}); this.mount(w);
    w.body.innerHTML = '<div style="color:var(--muted);margin-bottom:12px">In the full game you sail between islands with a GPS and a boat. For this first version you can jump straight to five islands to see how the world changes.</div>';
    const list = h('div', 'travel-list'); w.body.appendChild(list);
    for (const n of PREVIEW_ISLANDS) {
      const isl = ISLANDS[n - 1]; const band = BANDS[isl.band];
      const it = h('div', `item ${n === this.g.island.n ? 'sel' : ''}`);
      it.innerHTML = `<div class="n">Island ${n} · ${band.name}</div><div class="nm">${isl.name}</div><div class="sub">Danger: ${band.danger}<br>${fishOfIsland(n).filter(f => state.collection[f.id]).length}/20 fish found</div>`;
      it.onclick = () => { this.ui.closeModal(); this.g.travel(n); };
      list.appendChild(it);
    }
  }

  // ---------- pause ----------
  open_pause() {
    const w = windowEl('Paused', [], () => {}); this.mount(w); w.win.style.height = 'auto'; w.win.style.width = 'min(640px,94vw)';
    w.body.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px">
      <button class="primary" data-a="resume">Resume</button><button data-a="travel">Travel to another island</button><button data-a="collection">Fish collection</button><button data-a="showroom">Rod showroom</button>
      <div class="side" style="border:0;padding:0;margin-top:6px"><div class="stat"><span>Volume</span><input class="slider" type="range" min="0" max="1" step="0.05" value="${state.settings.volume}" data-s="volume"></div><div class="stat"><span>Mouse sensitivity</span><input class="slider" type="range" min="0.3" max="2.5" step="0.05" value="${state.settings.sensitivity}" data-s="sensitivity"></div></div>
      <div class="controls" style="margin-top:6px">${CONTROLS}</div>
      <button class="danger" data-a="reset" style="margin-top:8px">Start over (deletes your save)</button></div>`;
    w.body.querySelector('[data-a=resume]').onclick = () => this.ui.closeModal();
    w.body.querySelector('[data-a=travel]').onclick = () => this.open('travel');
    w.body.querySelector('[data-a=collection]').onclick = () => this.open('collection');
    w.body.querySelector('[data-a=showroom]').onclick = () => this.open('showroom');
    // two clicks instead of confirm(), which embedded pages can't show
    const rb = w.body.querySelector('[data-a=reset]');
    rb.onclick = () => { if (rb.dataset.armed) { reset(); location.reload(); return; } rb.dataset.armed = '1'; rb.textContent = 'Click again to delete your save'; setTimeout(() => { delete rb.dataset.armed; rb.textContent = 'Start over (deletes your save)'; }, 4000); };
    w.body.querySelectorAll('input[data-s]').forEach(inp => inp.oninput = () => { state.settings[inp.dataset.s] = Number(inp.value); this.g.applySettings(); save(); });
  }

  // ---------- dialogue ----------
  talk(npc) {
    let i = 0; const box = h('div', 'panel talk interactive');
    const show = () => { box.innerHTML = `<div class="who">${npc.name}</div><div class="say">${npc.lines[i]}</div><div class="more">${i < npc.lines.length - 1 ? 'Click or press E for more' : 'Click or press E to close'}</div>`; };
    show(); this.root.appendChild(box); this.cur = box; this.current = 'talk';
    const next = () => { i++; if (i >= npc.lines.length) this.ui.closeModal(); else show(); };
    box.onclick = next; this.talkNext = next;
  }
}

export const CONTROLS = [
  ['W A S D', 'Move'], ['Mouse', 'Look (click the game to capture the mouse)'], ['Hold LMB', 'Charge the cast, let go in a zone'], ['LMB / Space', 'Reel in during a fight'], ['A / D', 'Pull against the fish (tug of war)'],
  ['Tab', 'Bag: rods, bait, fish'], ['E', 'Talk / shop / upgrader'], ['C', 'Fish collection'], ['T', 'Travel (preview)'], ['Shift', 'Run'], ['Esc', 'Pause'],
].map(([k, v]) => `<span class="key">${k}</span><span>${v}</span>`).join('');
