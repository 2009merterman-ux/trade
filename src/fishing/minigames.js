// The fight mini-games. Each gets a difficulty d from 0 (trash) to 1 (gods) and returns 'win', 'lose' or 'snap'.
// Controls: hold the left mouse button (or Space) to reel. Tug of war uses A / D (or the mouse).

const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };

class Game {
  constructor(root, d, fish, tol) { this.root = root; this.d = d; this.fish = fish; this.tol = tol; this.t = 0; this.progress = 0.25; this.paused = false; }
  end() { this.root.innerHTML = ''; }
}

export class TensionGame extends Game {
  constructor(root, d, fish, tol) {
    super(root, d, fish, tol); this.name = 'Tension'; this.tension = 0.2; this.over = 0; this.nextSurge = 1;
    root.innerHTML = '';
    this.box = el('div', 'mg mg-tension');
    this.box.innerHTML = `<div class="mg-title">Reel it in <span>hold LMB · let go before it snaps</span></div>
      <div class="mg-row"><span class="mg-lbl">Line tension</span><div class="mg-track tension-track"><div class="mg-safe"></div><div class="mg-mark"></div></div></div>
      <div class="mg-row"><span class="mg-lbl">Distance</span><div class="mg-track"><div class="mg-fill"></div></div></div>`;
    root.appendChild(this.box);
    this.mark = this.box.querySelector('.mg-mark'); this.fill = this.box.querySelector('.mg-fill'); this.track = this.box.querySelector('.tension-track');
  }
  update(dt, inp) {
    if (this.paused) return null; this.t += dt; const d = this.d;
    if (inp.reel) { this.tension += (0.35 + d * 0.6) * dt / this.tol; this.progress += (0.2 - d * 0.08) * dt; }
    else { this.tension -= 0.65 * dt; this.progress -= (0.035 + d * 0.05) * dt * this.fish.speed; }
    this.nextSurge -= dt;
    if (this.nextSurge <= 0) { this.tension += (0.12 + d * 0.42) * Math.random() / this.tol; this.nextSurge = (0.5 + Math.random() * 1.8) / (0.6 + d); this.surge = 0.25; }
    this.surge = Math.max(0, (this.surge ?? 0) - dt);
    this.tension = Math.max(0, this.tension);
    this.over = this.tension > 1 ? this.over + dt : 0;
    this.mark.style.left = `${Math.min(100, this.tension * 100)}%`;
    this.track.classList.toggle('danger', this.tension > 0.82);
    this.fill.style.width = `${Math.max(0, Math.min(1, this.progress)) * 100}%`;
    if (this.over > 0.3) return 'snap';
    if (this.progress >= 1) return 'win';
    if (this.progress <= 0 && this.t > 1.5) return 'lose';
    return null;
  }
  spike(amount) { this.tension += amount; }
}

export class ZoneGame extends Game {
  constructor(root, d, fish, tol) {
    super(root, d, fish, tol); this.name = 'Keep it in the zone';
    this.size = Math.max(0.1, (0.36 - d * 0.24) * Math.min(1.3, tol)); this.zone = 0.3; this.zv = 0; this.fishY = 0.5; this.target = 0.5; this.nextMove = 0;
    root.innerHTML = '';
    this.box = el('div', 'mg mg-zone');
    this.box.innerHTML = `<div class="mg-title">Keep it in the zone <span>hold LMB to lift the bar</span></div>
      <div class="zone-wrap"><div class="zone-bar"><div class="zone-catch"></div><div class="zone-fish">🐟</div></div><div class="zone-prog"><div class="zone-prog-fill"></div></div></div>`;
    root.appendChild(this.box);
    this.catchEl = this.box.querySelector('.zone-catch'); this.fishEl = this.box.querySelector('.zone-fish'); this.progEl = this.box.querySelector('.zone-prog-fill');
    this.catchEl.style.height = `${this.size * 100}%`;
    this.fishEl.textContent = '';
  }
  update(dt, inp) {
    if (this.paused) return null; this.t += dt; const d = this.d;
    this.zv += (inp.reel ? 2.8 : -2.0) * dt; this.zv *= Math.pow(0.25, dt);
    this.zone += this.zv * dt;
    if (this.zone < 0) { this.zone = 0; this.zv = Math.max(0, this.zv) * -0.3; }
    if (this.zone > 1 - this.size) { this.zone = 1 - this.size; this.zv = Math.min(0, this.zv) * -0.3; }
    this.nextMove -= dt;
    if (this.nextMove <= 0) { this.target = 0.05 + Math.random() * 0.9; this.nextMove = (0.4 + Math.random() * 1.2) / (0.6 + d * 0.8); }
    const sp = (0.25 + d * 1.15) * this.fish.speed;
    this.fishY += Math.sign(this.target - this.fishY) * Math.min(Math.abs(this.target - this.fishY), sp * dt);
    const inside = this.fishY >= this.zone && this.fishY <= this.zone + this.size;
    this.progress += inside ? (0.3 - d * 0.1) * dt : -(0.16 + d * 0.2) * dt;
    this.catchEl.style.bottom = `${this.zone * 100}%`; this.catchEl.classList.toggle('on', inside);
    this.fishEl.style.bottom = `calc(${this.fishY * 100}% - 12px)`;
    this.progEl.style.height = `${Math.max(0, Math.min(1, this.progress)) * 100}%`;
    if (this.progress >= 1) return 'win';
    if (this.progress <= 0) return 'lose';
    return null;
  }
  spike(amount) { this.progress -= amount * 0.3; }
}

export class TugGame extends Game {
  constructor(root, d, fish, tol) {
    super(root, d, fish, tol); this.name = 'Tug of war'; this.dir = Math.random() < 0.5 ? -1 : 1; this.nextFlip = 1.5; this.strain = 0; this.pos = 0;
    root.innerHTML = '';
    this.box = el('div', 'mg mg-tug');
    this.box.innerHTML = `<div class="mg-title">Tug of war <span>pull against the fish: hold A or D</span></div>
      <div class="tug-arena"><div class="tug-arrow"></div><div class="tug-fish"></div></div>
      <div class="mg-row"><span class="mg-lbl">Strain</span><div class="mg-track strain"><div class="mg-mark"></div></div></div>
      <div class="mg-row"><span class="mg-lbl">Distance</span><div class="mg-track"><div class="mg-fill"></div></div></div>`;
    root.appendChild(this.box);
    this.arrow = this.box.querySelector('.tug-arrow'); this.fishEl = this.box.querySelector('.tug-fish'); this.mark = this.box.querySelector('.mg-mark'); this.fill = this.box.querySelector('.mg-fill'); this.track = this.box.querySelector('.strain');
  }
  update(dt, inp) {
    if (this.paused) return null; this.t += dt; const d = this.d;
    this.nextFlip -= dt;
    if (this.nextFlip <= 0) { this.dir *= -1; this.nextFlip = (0.8 + Math.random() * 1.8) / (0.7 + d * 0.9); }
    const pull = inp.pull; // -1 left, 1 right, 0 none
    const correct = pull !== 0 && pull === -this.dir;
    if (correct) { this.progress += (0.24 - d * 0.08) * dt; this.strain = Math.max(0, this.strain - 0.5 * dt); }
    else if (pull !== 0) { this.progress -= (0.12 + d * 0.15) * dt; this.strain += (0.5 + d * 0.6) * dt / this.tol; }
    else { this.progress -= (0.05 + d * 0.06) * dt * this.fish.speed; this.strain = Math.max(0, this.strain - 0.25 * dt); }
    this.pos += ((this.dir * 0.9) - this.pos) * Math.min(1, dt * 3);
    this.arrow.className = `tug-arrow ${this.dir > 0 ? 'right' : 'left'}`;
    this.fishEl.style.left = `${50 + this.pos * 38}%`;
    this.mark.style.left = `${Math.min(100, this.strain * 100)}%`; this.track.classList.toggle('danger', this.strain > 0.8);
    this.fill.style.width = `${Math.max(0, Math.min(1, this.progress)) * 100}%`;
    if (this.strain > 1) return 'snap';
    if (this.progress >= 1) return 'win';
    if (this.progress <= 0 && this.t > 1.5) return 'lose';
    return null;
  }
  spike(amount) { this.strain += amount; }
}

// The fish leaps: a ring closes in, and you click (or press Space) when it lines up.
export class JumpEvent {
  constructor(root, d) {
    this.d = d; this.t = 0; this.window = Math.max(0.55, 1.15 - d * 0.55); this.tolerance = Math.max(0.07, 0.2 - d * 0.12);
    this.box = el('div', 'jump-prompt', `<div class="jump-target"></div><div class="jump-ring"></div><div class="jump-text">IT JUMPED! <b>CLICK</b> when the rings meet</div>`);
    root.appendChild(this.box); this.ring = this.box.querySelector('.jump-ring');
    this.box.querySelector('.jump-target').style.setProperty('--tol', this.tolerance);
  }
  // returns 'ok', 'fail' or null
  update(dt, pressed) {
    this.t += dt; const k = 1 - this.t / this.window; const scale = 0.25 + k * 1.75; // 1.0 is the target
    this.ring.style.transform = `translate(-50%,-50%) scale(${Math.max(0, scale)})`;
    if (pressed) return Math.abs(scale - 1) <= this.tolerance * 1.6 ? 'ok' : 'fail';
    if (scale < 1 - this.tolerance * 2) return 'fail';
    return null;
  }
  end() { this.box.remove(); }
}

export const GAMES = { tension: TensionGame, zone: ZoneGame, tug: TugGame };
