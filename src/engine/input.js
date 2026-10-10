// Keyboard + mouse. Mouse look uses pointer lock; if that is unavailable, dragging with the right button looks around.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.buttons = new Set();
    this.dx = 0; this.dy = 0;
    this.handlers = {};
    this.locked = false;
    this.uiOpen = false;
    window.addEventListener('keydown', e => {
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.emit('key', e.code, e);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => { this.keys.delete(e.code); this.emit('keyup', e.code, e); });
    window.addEventListener('blur', () => { this.keys.clear(); this.buttons.clear(); });
    canvas.addEventListener('mousedown', e => {
      if (!this.uiOpen && !this.locked && e.button === 0 && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
      this.buttons.add(e.button); this.emit('mousedown', e.button, e);
    });
    window.addEventListener('mouseup', e => { this.buttons.delete(e.button); this.emit('mouseup', e.button, e); });
    window.addEventListener('mousemove', e => {
      if (this.locked || this.buttons.has(2)) { this.dx += e.movementX || 0; this.dy += e.movementY || 0; }
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; this.emit('lock', this.locked); });
  }
  on(ev, fn) { (this.handlers[ev] ??= []).push(fn); }
  emit(ev, ...a) { for (const fn of this.handlers[ev] ?? []) fn(...a); }
  down(code) { return this.keys.has(code); }
  takeMouse() { const d = [this.dx, this.dy]; this.dx = 0; this.dy = 0; return d; }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
}
