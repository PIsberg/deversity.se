#!/usr/bin/env node
/* Behaviour test for the reduced-motion opt-in in assets/mascot.js. Node stdlib only,
   no DOM library: a fake document that records what the script sets is enough, because
   the test only asks where the mascot was drawn on each frame.

   Written after the mascot looked broken on a desktop: it roamed on a phone and sat
   in the corner on a Windows machine with animation effects off. That is the script
   honouring prefers-reduced-motion, and it stays the default. The rule under test:
   under that preference the mascot does not move until the visitor asks it to with
   the control next to it, the choice is remembered, and it can be undone.

   Time is simulated: the test owns performance.now() and calls the animation frames
   itself, so 30 seconds of roaming takes milliseconds and never depends on a timer.

   Usage: node tools/test-mascot-motion.js */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'assets', 'mascot.js'), 'utf8');
const MOTION_KEY = 'heisenbug:motion';
const W = 50, H = 60;   // every fake element measures the same; only the mascot's own size matters

function element(tag) {
  const classes = new Set();
  const listeners = {};
  const el = {
    tagName: tag.toUpperCase(), children: [], parent: null, attrs: {},
    textContent: '', title: '', type: '', hidden: false,
    offsetWidth: W, offsetHeight: H,
    style: { setProperty(k, v) { this[k] = v; } },
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      toggle: (c, on) => { if (on === undefined ? !classes.has(c) : on) classes.add(c); else classes.delete(c); },
      contains: (c) => classes.has(c),
    },
    get className() { return [...classes].join(' '); },
    set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((x) => classes.add(x)); },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    removeAttribute(k) { delete this.attrs[k]; },
    append(...kids) { kids.forEach((k) => this.appendChild(k)); },
    appendChild(k) { k.parent = this; this.children.push(k); return k; },
    remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } },
    contains(n) { for (let p = n; p; p = p.parent) if (p === this) return true; return false; },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatch(type, ev = {}) {
      const e = Object.assign({ type, target: this, detail: 0, preventDefault() {}, stopPropagation() {} }, ev);
      (listeners[type] || []).forEach((fn) => fn(e));
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, right: W, bottom: H, width: W, height: H }),
    matches: () => false, closest: () => null, querySelectorAll: () => [],
    setPointerCapture() {}, focus() {},
  };
  return el;
}

function storage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)),
           removeItem: (k) => map.delete(k), map };
}

// One page load. reduce: what the visitor's system says. local: the localStorage the page sees,
// or 'blocked' for a browser that throws on any access to it.
function load({ reduce, local = storage() }) {
  let clock = 1000;
  let frames = [];
  let timers = [];
  const windowListeners = {};
  const body = element('body');
  const ctx = {
    document: { body, readyState: 'complete', createElement: element, addEventListener() {},
                querySelector: () => null, querySelectorAll: () => [] },
    innerWidth: 1440, innerHeight: 900, scrollY: 0,
    matchMedia: (q) => ({ matches: /prefers-reduced-motion:\s*reduce/.test(q) ? reduce : false }),
    addEventListener(type, fn) { (windowListeners[type] = windowListeners[type] || []).push(fn); },
    sessionStorage: storage(),
    performance: { now: () => clock },
    requestAnimationFrame: (fn) => { frames.push(fn); return frames.length; },
    setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout() {},
  };
  if (local === 'blocked') Object.defineProperty(ctx, 'localStorage', { get() { throw new Error('SecurityError'); } });
  else ctx.localStorage = local;
  ctx.window = ctx;
  vm.createContext(ctx);
  // A fixed seed: the mascot decides what to do with Math.random, and a test that passes
  // on some dice rolls only is the kind of bug this library exists to find.
  vm.runInContext('let s = 0x2545f491; Math.random = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };', ctx);
  vm.runInContext(SCRIPT, ctx);

  const root = body.children.find((c) => c.classList.contains('mx-root'));
  const find = (cls) => {
    const walk = (n) => (n.classList.contains(cls) ? n : n.children.map(walk).find(Boolean));
    return root ? walk(root) : undefined;
  };
  const pose = () => [find('mx-body'), find('mx-squash'), find('mx-glyph')].map((e) => e.style.transform).join(' | ');
  return {
    root, find, local,
    control: () => find('mx-motion'),
    // The visitor resizes the browser window. The script debounces its reaction with a
    // timer, so the pending timers are run here rather than waited for.
    resize(width, height) {
      ctx.innerWidth = width; ctx.innerHeight = height;
      (windowListeners.resize || []).forEach((fn) => fn({ type: 'resize' }));
      const due = timers; timers = [];
      due.forEach((fn) => fn());
    },
    // Top-left corner of an element as last drawn, viewport px.
    at(cls) {
      const m = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(find(cls).style.transform);
      return { x: +m[1], y: +m[2] };
    },
    // Runs the page for this many seconds at 60 frames a second and reports every distinct
    // pose (position, squash, rotation) the mascot was drawn in, and how far it travelled.
    run(seconds) {
      const poses = new Set(), controlSpots = new Set();
      let minX = Infinity, maxX = -Infinity;
      for (let i = 0; i < Math.round(seconds * 60); i++) {
        clock += 1000 / 60;
        const due = frames; frames = [];
        due.forEach((fn) => fn(clock));
        poses.add(pose());
        if (find('mx-motion')) controlSpots.add(find('mx-motion').style.transform);
        const m = /translate3d\(([-\d.]+)px/.exec(find('mx-body').style.transform);
        minX = Math.min(minX, +m[1]); maxX = Math.max(maxX, +m[1]);
      }
      return { poses: poses.size, travelled: maxX - minX, controlSpots: controlSpots.size };
    },
  };
}

const click = (el) => el.dispatch('click', { detail: 1 });

const tests = {
  'reduced motion, nothing chosen: it sits still and offers a control to let it move'() {
    const page = load({ reduce: true });
    const seen = page.run(15);
    assert.strictEqual(seen.poses, 1, 'the mascot was drawn in ' + seen.poses + ' poses in 15 s');
    const control = page.control();
    assert.ok(control, 'no .mx-motion control in the page');
    assert.strictEqual(control.tagName, 'BUTTON');
    assert.match(control.getAttribute('aria-label'), /move/i);
    assert.strictEqual(control.getAttribute('aria-pressed'), 'false');
  },

  'reduced motion, window resized: it stays in the corner, next to its control'() {
    const page = load({ reduce: true });
    page.run(1);
    page.resize(1800, 1100);
    page.run(1);
    const bug = page.at('mx-body'), control = page.at('mx-motion');
    const right = 1800 - (bug.x + W), bottom = 1100 - (bug.y + H);
    assert.ok(right >= 0 && right <= 40, 'the mascot is ' + right + ' px from the right edge after the resize');
    assert.ok(bottom >= 0 && bottom <= 40, 'the mascot is ' + bottom + ' px from the bottom edge after the resize');
    assert.ok(Math.abs(control.x - bug.x) <= 30 && Math.abs(control.y - bug.y) <= 30,
      'the control is at ' + control.x + ',' + control.y + ' and the mascot at ' + bug.x + ',' + bug.y);
  },

  'the control makes it roam, and the choice is remembered'() {
    const page = load({ reduce: true });
    page.run(2);
    const spot = page.control().style.transform;
    click(page.control());
    const seen = page.run(30);
    // The way back must not be a moving target for someone who is bothered by motion.
    assert.strictEqual(seen.controlSpots, 1, 'the control was drawn in ' + seen.controlSpots + ' places while the mascot roamed');
    assert.strictEqual(page.control().style.transform, spot, 'the control moved when it was used');
    assert.ok(seen.poses > 100, 'only ' + seen.poses + ' poses in 30 s after opting in');
    assert.ok(seen.travelled > 100, 'only travelled ' + seen.travelled.toFixed(0) + ' px in 30 s');
    assert.strictEqual(page.control().getAttribute('aria-pressed'), 'true');
    assert.strictEqual(page.local.getItem(MOTION_KEY), 'on');
  },

  'a remembered choice survives a reload: it roams without being asked again'() {
    const page = load({ reduce: true, local: storage({ [MOTION_KEY]: 'on' }) });
    const seen = page.run(30);
    assert.ok(seen.poses > 100, 'only ' + seen.poses + ' poses in 30 s');
    assert.ok(seen.travelled > 100, 'only travelled ' + seen.travelled.toFixed(0) + ' px in 30 s');
    assert.strictEqual(page.control().getAttribute('aria-pressed'), 'true');
  },

  'the control again: it sits still at once and the choice is forgotten'() {
    const page = load({ reduce: true, local: storage({ [MOTION_KEY]: 'on' }) });
    page.run(10);
    click(page.control());
    page.run(1 / 60);                       // the frame that draws the still pose
    const seen = page.run(15);
    assert.strictEqual(seen.poses, 1, 'still drawn in ' + seen.poses + ' poses in the 15 s after opting out');
    assert.strictEqual(page.control().getAttribute('aria-pressed'), 'false');
    assert.strictEqual(page.local.getItem(MOTION_KEY), null);
    // and the next visit starts still again
    assert.strictEqual(load({ reduce: true, local: page.local }).run(15).poses, 1);
  },

  'storage blocked: the control still works for this page view'() {
    const page = load({ reduce: true, local: 'blocked' });
    assert.strictEqual(page.run(5).poses, 1);
    click(page.control());
    const seen = page.run(30);
    assert.ok(seen.poses > 100, 'only ' + seen.poses + ' poses in 30 s');
  },

  'no reduced-motion preference: it roams as before and there is no control'() {
    const page = load({ reduce: false });
    const seen = page.run(30);
    assert.ok(seen.poses > 100, 'only ' + seen.poses + ' poses in 30 s');
    assert.strictEqual(page.control(), undefined);
  },
};

let failed = 0;
for (const [name, test] of Object.entries(tests)) {
  try { test(); console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + String(e.message).split('\n').join('\n     ')); }
}
console.log('\n%d test(s), %d failed', Object.keys(tests).length, failed);
process.exit(failed ? 1 : 0);
