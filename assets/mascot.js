/* Heisenbug, the Deversity homepage mascot.

   A small bug drawn entirely from text (antennae, two eyes, a beetle body and six
   legs in a 5x7 monospace grid) that scuttles along the page's own elements, rides
   them while you scroll, reacts to the cursor, can be picked up and thrown, and
   says things about async-test-lib. Vanilla JS, no build step, no dependencies.
   index.html is the only page that loads it.

   Everything it says lives in the QUIPS block at the top. Every number in there
   was checked against the async-test-lib source at v1.9.3 (DetectorType has 135
   constants, Preset.ESSENTIALS lists 12, the JUnit CI matrix runs 7 versions),
   so if the library changes, change the words here too.

   Respects prefers-reduced-motion (it sits still and still answers clicks) and
   stays gone for the session once dismissed. */

(() => {
  'use strict';

  const NAME = 'Heisenbug';
  const DISMISS_KEY = 'heisenbug:dismissed';

  // ---------------------------------------------------------------------------
  // Words
  // ---------------------------------------------------------------------------

  const QUIPS = {
    // Facts about async-test-lib. Verified against the source, see the header.
    facts: [
      'async-test-lib ships 135 detectors. I counted the enum, not the README.',
      'One annotation. @AsyncTest runs the test body on N threads for M invocations, and lines them all up on a CyclicBarrier first so they collide on purpose.',
      '@AsyncTest is a JUnit @TestTemplate under the hood. That is why it works from Kotlin and Groovy too.',
      'It supports JUnit Jupiter 5.9.3 through 6.1.2. CI runs the consumer fixture against seven versions in that range, so the floor is measured, not remembered.',
      'Deadlocks between class initializers hide from ThreadMXBean.findDeadlockedThreads(), because a class-init lock is not a monitor. STATIC_INIT_DEADLOCK sees them anyway.',
      'Pooling virtual threads is the central anti-pattern of JEP 444. There is a detector for that: VIRTUAL_THREAD_POOLING.',
      'Sharing one SplittableRandom across threads silently corrupts its sequence. Yes, there is a detector for that too.',
      'SimpleDateFormat is not thread-safe and never was. SIMPLE_DATE_FORMAT catches the ones you inherited.',
      'Preset.ESSENTIALS is 12 high-signal detectors for everyday CI. Preset.CI_FAST is 6 of those for pull-request gates. Preset.ALL is all 135.',
      'The default is FailOn.NONE: findings are printed and the test still passes. Set failOn = FailOn.CRITICAL and a finding fails the build.',
      'The optional async-test-agent weaves your accessors with Byte Buddy, so detectors watch reads and writes without hand-written hooks. The core artifact does not carry Byte Buddy at all.',
      'It writes JUnit XML and JSON reports, so CI reads the findings and nobody greps a log.',
      'There is an IntelliJ plugin in the repo. Findings show up in a tool window with severity colours.',
      'StaticPinningScanner is an ASM pre-scanner that finds Loom pinning sites in compiled classes before a single test runs.',
      'MessageDigest keeps state between update() and digest(). Share one across threads and two hashes get mixed. SHARED_MESSAGE_DIGEST catches it.',
      'It needs Java 21 or newer. Virtual threads arrived in 21, and so did a whole family of detectors for them.',
      'Free for non-commercial use under PolyForm Noncommercial 1.0.0. No license key needed.',
      'A commercial license covers every developer on your company email domain. No per-seat keys.',
      'JDBC connections, statements and result sets are not for sharing between threads. JDBC_CONNECTION_SHARED notices when you do.',
      'It also flags false sharing, livelocks, and explicit System.gc() calls in the middle of a concurrent test.',
    ],
    // Nice things about the library. Opinions, clearly labelled as such.
    nice: [
      'async-test-lib is my favourite JUnit extension. I am not biased. I am a little biased.',
      'One annotation, 135 detectors. That is a good ratio.',
      'It finds the bug that only shows up on the CI box at 3 a.m. Before 3 a.m.',
      'No executor boilerplate. No CountDownLatch. No Thread.join loops. Just @AsyncTest on the test you already have.',
      'It runs on whichever JUnit you already declare. Yours wins over its transitive one.',
      'Deadlock detection needs zero configuration. Zero is my favourite amount of configuration.',
      'Every detector is on by default. Opting out is a Preset. Opting in is not a chore.',
      'counter++ looks innocent. Ten threads, a hundred invocations, and it confesses.',
      'It is a JUnit @TestTemplate, so your IDE already knows how to run it. Green triangle and everything.',
      'The whole library is one word in your test: @AsyncTest. I respect brevity. I am five characters myself.',
    ],
    // Concurrency trivia, for the interesting-facts quota.
    trivia: [
      'counter++ is three operations: read, add, write. Ten threads doing it a hundred times each almost never reach 1000.',
      'Deadlock needs four things at once: mutual exclusion, hold and wait, no preemption, circular wait. Break any one and it cannot happen.',
      'A data race and a race condition are different bugs. You can have either one without the other.',
      'Virtual threads arrived in Java 21 with JEP 444. Pinning them inside synchronized blocks stayed a footgun until JEP 491 in Java 24.',
      'Heisenbug: a bug that vanishes when you look at it. Concurrency bugs are the classic kind. Contention is how you make one hold still.',
      'Amdahl\'s law: if 10 percent of a program is serial, a thousand cores get you at most a 10x speedup.',
      'Dijkstra\'s semaphore operations are P and V, from the Dutch proberen and verhogen. Try, and raise.',
      'Double-checked locking was broken in Java until JSR 133 rewrote the memory model for Java 5.',
      'A CyclicBarrier releases every waiting thread at the same instant. It is the starting gun of concurrency testing.',
      'A CPU cache line is typically 64 bytes. Two threads writing to neighbours inside one line fight over it. That is false sharing.',
      'The JVM does not promise that a thread sees another thread\'s write unless something establishes happens-before. Volatile, locks, and a few friends do.',
      'Thread.sleep() is not synchronization. It just makes the race slower to find.',
      'wait() belongs in a loop that rechecks its condition. Spurious wakeups are allowed by the spec, and they happen.',
    ],
    // About itself and how to play with it.
    meta: [
      'Click me for a fact. Drag me if you must. Throw me and I will forgive you.',
      'I am a concurrency bug. async-test-lib forced me out of hiding, and now I live on the homepage as a warning to the others.',
      'A Heisenbug vanishes when you look at it. Move the mouse at me quickly and watch.',
      'Try scrolling. Six legs. I hold on.',
      'The page says 100+ detectors. The enum says 135. One of them found me.',
      'Six legs, two antennae, one line down the back. All of it typed. Nothing here is an image, not even me.',
      'Insects have six legs. Spiders have eight and better PR.',
      'If I am ever in your way, move the mouse at me quickly. I startle easily. It is in the name.',
    ],
    hello:   ['hello.', 'hi there.', 'oh, hi.', 'you found me. that is the whole problem with me.', 'yes?', '*antennae twitch*'],
    curious: ['what are you looking at?', 'reading? me too.', 'is that a cursor. hello, cursor.', 'I will just stand here.', 'hm.', '*waves antennae*'],
    flee:    ['whoa.', 'too fast!', 'eep.', 'personal space!', 'you looked. I vanish. It is what I do.', 'I said hello, not tag.'],
    grabbed: ['hey.', 'put me down. or do not. your call.', 'ok. we are doing this.', 'I can see the whole page from here.', 'six legs and none of them touching anything.'],
    thrown:  ['wheeee.', 'airborne. not my strongest skill.', 'that was rude and I loved it.', 'physics!', 'again. again.', 'I have wings, technically. Never learned.'],
    dropped: ['thank you.', 'new spot. I like it.', 'fine.', 'delivered.'],
    landed:  ['oof.', '*bounces*', 'stuck the landing.', 'ow.', '10/10 landing.', 'on my feet. all six.'],
    wake:    ['oh. hello.', 'I was resting my legs. all six.', 'not sleeping. thinking.', 'hm? yes. detectors. 135.'],
    sleep:   ['z z z', 'z z z . . .', 'z z z  (dreaming of deadlocks)'],
    bye:     ['ok. bye. back into hiding.', 'fine. vanishing. very on brand.', 'ok. I know a good crack in the footer. bye.'],
    scroll:  ['you scroll fast. six legs, holding on.', 'wheee. scrolling.', 'hold on.'],
    milestone: (n) => [
      n + ' clicks. That is more contention than most tests get.',
      n + ' clicks. I am starting to think you are the race condition.',
      n + '. Still a bug. Still here.',
      n + ' clicks and no deadlock. Suspicious.',
    ],
    greeting: 'Hi. I am ' + NAME + '. I was forced out of hiding and now I live here.',
  };

  // Said sometimes when it lands on one of these. First match wins.
  const ON_PLATFORM = [
    ['.cat-race',   ['Race conditions. My cousins. We do not talk.', 'This card is about lost updates. I have lost nothing. Yet.']],
    ['.cat-lock',   ['Deadlocks. Two threads, each holding what the other needs. A bad handshake, forever.', 'A bug standing on the deadlock card. Nobody panic.']],
    ['.cat-signal', ['Missed signals. A notify with nobody waiting is a tree falling in an empty forest.', 'This card is about waits that never wake. Relatable, on Mondays.']],
    ['.cat-pub',    ['Unsafe publication. An object seen before it is finished. Like reading a draft.', 'Standing on the publication card. Fully constructed, I promise.']],
    ['.card.hot',   ['The commercial card. It covers everyone on your email domain. No per-seat keys. I asked.']],
    ['.term',       ['This terminal shows two findings. I was going to be the third.', '8 threads, 500 rounds, two findings. Nice view from up here.']],
    ['.cta',        ['I am standing on the pricing button. That is not an endorsement. OK, it is.', 'This button leads to pricing. I am not blocking it. Much.']],
    ['.ghost',      ['This one goes to GitHub. The code is in there. So am I, in a sense.']],
    ['.stats',      ['Three stats and a strip to stand on. Sturdy.', 'N times M, all forced to collide. I just stand here and wave my antennae.']],
    ['.site-foot',  ['This is the footer. Everything below is the void. And a copyright line.', 'End of the page. Good place for a bug. I will wait here.']],
    ['h2',          ['Section heading. Good view.', 'Standing on a heading. It is a very stable heading.']],
  ];
  const ON_FLOOR = ['Ground floor. Everybody off.', 'I fell off the page and landed on your screen. It happens.', 'A bug on the floor. Traditional.'];

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { if (sessionStorage.getItem(DISMISS_KEY)) return; } catch { /* storage blocked: just show it */ }

  // Elements it can stand on. Top edges become platforms; the viewport bottom is the floor.
  const PLATFORM_SELECTOR = '.term, .stats, .card, .actions > a, main h2, .site-foot';

  const GRAVITY = 1500;      // px/s^2
  const MAX_FALL = 1100;     // px/s
  const STEP = 6;           // px of travel per frame of the walk cycle

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  // Shuffled bags, so nothing repeats until everything in the bag has been said.
  // Ambient chatter includes the lines about itself; a click asked for a fact, so it gets one.
  function makeBag(source) {
    return { items: [], refill() {
      this.items = source();
      for (let i = this.items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
      }
    }, next() { if (!this.items.length) this.refill(); return this.items.pop(); } };
  }
  const ambient = makeBag(() => [...QUIPS.facts, ...QUIPS.nice, ...QUIPS.trivia, ...QUIPS.meta]);
  const asked = makeBag(() => [...QUIPS.facts, ...QUIPS.facts, ...QUIPS.nice, ...QUIPS.trivia]);

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------

  const root = document.createElement('div');
  root.className = 'mx-root';

  const body = document.createElement('button');
  body.type = 'button';
  body.className = 'mx-body';
  body.setAttribute('aria-label', NAME + ', the site mascot. Activate for a fact about async-test-lib.');
  body.title = NAME;

  const squash = document.createElement('span');
  squash.className = 'mx-squash';
  const glyph = document.createElement('pre');
  glyph.className = 'mx-glyph';
  glyph.setAttribute('aria-hidden', 'true');
  squash.appendChild(glyph);
  body.appendChild(squash);

  const bubble = document.createElement('div');
  bubble.className = 'mx-bubble';
  bubble.setAttribute('aria-hidden', 'true');
  const bubbleText = document.createElement('span');
  bubbleText.className = 'mx-text';
  const caret = document.createElement('span');
  caret.className = 'mx-caret';
  caret.textContent = '▍';
  caret.hidden = true;
  bubble.append(bubbleText, caret);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'mx-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Send ' + NAME + ' away for this visit');

  const live = document.createElement('div');
  live.className = 'mx-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');

  root.append(body, bubble, closeBtn, live);

  // ---------------------------------------------------------------------------
  // The glyph: a top-down bug in a 7x5 text grid
  //
  //     \ /      antennae   up | alert | droop | twitchL | twitchR
  //    (o o)     eyes       three characters between the parentheses
  //   -(   )-    legs       one pair per row: rest, a 4-frame walk cycle, splayed in the air
  //   -( | )-
  //   -(_|_)-
  // ---------------------------------------------------------------------------

  const ANTENNAE = { up: '\\ /', alert: '| |', droop: '. .', twitchL: '| /', twitchR: '\\ |' };
  const BODY = ['(   )', '( | )', '(_|_)'];
  //                     row2      row3      row4        (left, right) per body row
  const LEGS = {
    rest:  [['-', '-'], ['-', '-'], ['-', '-']],
    walk0: [['/', '\\'], ['\\', '/'], ['/', '\\']],
    walk1: [['-', '-'], ['-', '-'], ['-', '-']],
    walk2: [['\\', '/'], ['/', '\\'], ['\\', '/']],
    walk3: [['-', '-'], ['-', '-'], ['-', '-']],
    air:   [['\\', '/'], ['-', '-'], ['/', '\\']],
  };
  const EYES = { open: 'o o', right: ' oo', left: 'oo ', wide: 'O O', shut: '- -', ouch: '> <', dizzy: '@ @', happy: '^ ^' };

  let antennae = 'up', eyes = 'o o', legs = 'rest';
  let walkFrame = 0;
  let glyphDirty = true;

  function renderGlyph() {
    const l = LEGS[legs] || LEGS.rest;
    return [
      '  ' + (ANTENNAE[antennae] || ANTENNAE.up) + '  ',
      ' (' + eyes + ') ',
      l[0][0] + BODY[0] + l[0][1],
      l[1][0] + BODY[1] + l[1][1],
      l[2][0] + BODY[2] + l[2][1],
    ].join('\n');
  }
  function setEyes(e) { if (eyes !== e) { eyes = e; glyphDirty = true; } }
  function setAntennae(a) { if (antennae !== a) { antennae = a; glyphDirty = true; } }
  function setLegs(l) { if (legs !== l) { legs = l; glyphDirty = true; } }
  function stepLegs() {               // one frame of the tripod gait
    walkFrame = (walkFrame + 1) % 4;
    setLegs('walk' + walkFrame);
  }
  let restoreEyes = 'o o', eyesUntil = 0, antennaeUntil = 0;
  function blink(now) { restoreEyes = eyes; setEyes(EYES.shut); eyesUntil = now + 110; }
  function twitch(now) { setAntennae(Math.random() < 0.5 ? 'twitchL' : 'twitchR'); antennaeUntil = now + 140; }
  function faceTick(now) {            // ends a blink or a twitch when its time is up
    if (eyesUntil && now > eyesUntil) { eyesUntil = 0; setEyes(restoreEyes); }
    if (antennaeUntil && now > antennaeUntil) { antennaeUntil = 0; setAntennae(mode === 'sleep' ? 'droop' : 'up'); }
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let vw = 0, vh = 0, ceilY = 0;          // viewport, and the sticky header's bottom edge
  let w = 50, h = 60;                     // measured from the glyph
  let x = 0, y = 0, vx = 0, vy = 0;       // body top-left, viewport px
  let mode = 'air';                       // air | stand | drag | sleep | gone
  let plat = null;                        // platform it stands on; null on the floor
  let walking = false, facing = 1, speed = 60;
  let nextDecision = 0;
  let theta = 0, omega = 0;               // glyph rotation, deg and deg/s (thrown spins)
  let spin = null;                        // {from, to, t0, dur} eased spin, used by clicks
  let bob = 0, walkPhase = 0;
  let sx = 1, sy = 1;                     // squash and stretch, eased back to 1
  let stepAcc = 0;
  let nextBlink = 0, nextTwitch = 0, wiggleUntil = 0, surprisedUntil = 0;
  let clicks = 0, landedOnce = false;
  let nextQuipAt = 0, platQuipCooldown = 0, greetCooldown = 0, fleeCooldown = 0, landQuipCooldown = 0, scrollQuipCooldown = 0;
  let curiousUntil = 0, avoidUntil = 0, avoidDir = 1;
  let lastActivity = 0, nextSnore = 0;
  let platforms = [];
  let drag = null;
  let particles = [];
  let running = true;
  let lastScrollY = window.scrollY, scrollVel = 0;

  // Pointer, page-wide, for the curious/flee/avoid behaviours.
  const ptr = { x: -9999, y: -9999, vx: 0, vy: 0, t: 0, overLink: false, seen: false };

  // ---------------------------------------------------------------------------
  // Platforms
  // ---------------------------------------------------------------------------

  function refreshPlatforms() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    const head = document.querySelector('.site-head');
    ceilY = head ? head.getBoundingClientRect().bottom : 0;
    const scrollY = window.scrollY;
    const next = [];
    document.querySelectorAll(PLATFORM_SELECTOR).forEach((el) => {
      let r = el.getBoundingClientRect();
      if (el.matches('h2')) {
        // A heading's box spans the whole column; only the text is something to stand on.
        const range = document.createRange();
        range.selectNodeContents(el);
        const tr = range.getBoundingClientRect();
        if (tr.width > 0) r = { left: tr.left, right: tr.right, top: r.top, width: tr.width, height: r.height };
      }
      if (r.width < 40 || r.height === 0) return;
      next.push({ el, left: r.left, right: r.right, top: r.top + scrollY });
    });
    platforms = next;
    if (plat) {                                   // keep standing on the same element after a re-layout
      const same = platforms.find((p) => p.el === plat.el);
      if (same) plat = same; else { plat = null; if (mode === 'stand') { mode = 'air'; vy = 0; } }
    }
  }
  const platTop = (p) => p.top - window.scrollY;   // viewport y of a platform's edge

  function measure() {
    const r = glyph.getBoundingClientRect();
    if (r.width > 0) { w = glyph.offsetWidth; h = glyph.offsetHeight; }
  }

  // Where the body may be when standing: on a platform, between its edges; on the floor, between the walls.
  function standRange() {
    if (plat) return [plat.left - w / 2 + 6, plat.right - w / 2 - 6];
    return [0, vw - w];
  }

  // ---------------------------------------------------------------------------
  // Speech
  // ---------------------------------------------------------------------------

  const speech = { text: '', shown: 0, typing: false, acc: 0, until: 0, priority: -1, on: false };

  function say(text, opts = {}) {
    const now = performance.now();
    const priority = opts.priority || 0;
    if (speech.on && now < speech.until && priority < speech.priority) return false;
    speech.text = text;
    speech.shown = 0;
    speech.acc = 0;
    speech.priority = priority;
    speech.typing = !reduceMotion;
    speech.on = true;
    const typeMs = reduceMotion ? 0 : (text.length / 34) * 1000;
    speech.until = now + typeMs + (opts.hold || Math.min(8000, 1900 + text.length * 48));
    // Measure the finished bubble first, so it does not grow under the reader while the text types out.
    bubbleText.textContent = text;
    caret.hidden = reduceMotion;
    bubble.style.minWidth = '';
    bubble.style.minHeight = '';
    bubble.style.minWidth = bubble.offsetWidth + 'px';
    bubble.style.minHeight = bubble.offsetHeight + 'px';
    bubbleText.textContent = reduceMotion ? text : '';
    bubble.classList.add('on');
    if (opts.live) live.textContent = text;
    // Space the ambient lines out; incidental remarks (priority 0) barely move the schedule.
    nextQuipAt = Math.max(nextQuipAt, speech.until + (priority >= 1 ? rand(12000, 22000) : 3000));
    return true;
  }
  function hush() { speech.on = false; bubble.classList.remove('on'); caret.hidden = true; }

  function speechTick(now, dt) {
    if (!speech.on) return;
    if (speech.typing) {
      speech.acc += dt * 34;
      const n = Math.min(speech.text.length, Math.floor(speech.acc));
      if (n !== speech.shown) { speech.shown = n; bubbleText.textContent = speech.text.slice(0, n); }
      if (n >= speech.text.length) { speech.typing = false; caret.hidden = true; }
    }
    if (now > speech.until) hush();
  }

  function positionBubble() {
    if (!speech.on) return;
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    const cx = x + w / 2;
    let bx = clamp(cx - bw / 2, 8, Math.max(8, vw - bw - 8));
    let by = y - bh - 12;
    const below = by < ceilY + 4;
    if (below) by = y + h + 12;
    bubble.classList.toggle('below', below);
    bubble.style.setProperty('--mx-tail', clamp(cx - bx, 14, bw - 14).toFixed(0) + 'px');
    bubble.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0)';
  }

  // ---------------------------------------------------------------------------
  // Text particles
  // ---------------------------------------------------------------------------

  function burst(cx, cy, n, chars, opts = {}) {
    if (reduceMotion) return;
    for (let i = 0; i < n && particles.length < 40; i++) {
      const el = document.createElement('span');
      el.className = 'mx-p';
      el.setAttribute('aria-hidden', 'true');
      el.textContent = pick(chars);
      if (opts.color) el.style.color = opts.color;
      root.appendChild(el);
      const a = opts.up ? rand(-Math.PI * 0.85, -Math.PI * 0.15) : rand(0, Math.PI * 2);
      const s = rand(opts.minSpeed || 90, opts.maxSpeed || 260);
      particles.push({ el, x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, ttl: rand(0.45, 0.8) });
    }
  }
  function particlesTick(dt) {
    if (!particles.length) return;
    const keep = [];
    for (const p of particles) {
      p.life += dt;
      if (p.life >= p.ttl) { p.el.remove(); continue; }
      p.vy += 700 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.el.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0)';
      p.el.style.opacity = (1 - p.life / p.ttl).toFixed(2);
      keep.push(p);
    }
    particles = keep;
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function jump(upSpeed, sideSpeed) {
    if (mode !== 'stand') return;
    mode = 'air';
    plat = null;
    walking = false;
    vy = upSpeed;
    vx = sideSpeed;
    sx = 0.8; sy = 1.25;
    setLegs('air');
    if (!surprisedUntil) setEyes(EYES.open);
  }

  function land(onPlat, hard) {
    const now = performance.now();
    mode = 'stand';
    plat = onPlat;
    vy = 0;
    vx = 0;
    const dizzy = Math.abs(omega) > 500;         // came down spinning: it was thrown
    omega = 0;
    theta = ((theta % 360) + 540) % 360 - 180;   // spin back to upright the short way
    spin = { from: theta, to: 0, t0: now, dur: 380 };
    sx = hard ? 1.35 : 1.15;
    sy = hard ? 0.62 : 0.85;
    setLegs('rest');
    setAntennae('up');
    setEyes(dizzy ? EYES.dizzy : hard ? EYES.ouch : EYES.open);
    if (dizzy || hard) { surprisedUntil = now + (dizzy ? 1500 : 700); }
    if (plat) y = platTop(plat) - h;
    nextDecision = now + (hard ? 900 : rand(300, 1400));
    walking = false;
    if (hard) {
      burst(x + w / 2, y + h, 6, ['.', '·', ','], { up: true, minSpeed: 60, maxSpeed: 170 });
      if (now > landQuipCooldown && Math.random() < 0.35) { say(pick(QUIPS.landed), { priority: 0 }); landQuipCooldown = now + 15000; }
    }
    if (!landedOnce) {
      landedOnce = true;
      say(QUIPS.greeting, { priority: 3, hold: 5200 });
      nextQuipAt = performance.now() + 9000;
      return;
    }
    if (now > platQuipCooldown && Math.random() < 0.4) {
      let lines = null;
      if (plat) { for (const [sel, l] of ON_PLATFORM) { if (plat.el.matches(sel)) { lines = l; break; } } }
      else if (Math.random() < 0.3) lines = ON_FLOOR;
      if (lines) { say(pick(lines)); platQuipCooldown = now + 22000; }
    }
  }

  function flee(now) {
    const cx = x + w / 2;
    const dir = ptr.x > cx ? -1 : 1;
    jump(-380, dir * 340);
    setEyes(EYES.wide);
    setAntennae('alert');
    surprisedUntil = now + 800;
    fleeCooldown = now + 3500;
    curiousUntil = 0;
    say(pick(QUIPS.flee), { priority: 2, hold: 1800 });
  }

  function poke(fromKeyboard) {
    const now = performance.now();
    clicks++;
    lastActivity = now;
    if (mode === 'sleep') { wake(now); }
    if (!reduceMotion) {
      sx = 1.35; sy = 0.65;
      spin = { from: theta, to: theta + 360 * (Math.random() < 0.5 ? 1 : -1), t0: now, dur: 620 };
      burst(x + w / 2, y + h / 2, 8, ['*', '+', '·']);
    }
    let text;
    if (clicks % 5 === 0) text = pick(QUIPS.milestone(clicks));
    else text = asked.next();
    say(text, { priority: 5, live: true });   // asked for directly, so it outranks whatever it was saying
    if (fromKeyboard || reduceMotion) return;
    setEyes(EYES.happy);
    surprisedUntil = now + 900;
  }

  function wake(now) {
    mode = 'stand';
    setEyes(EYES.wide);
    setAntennae('alert');
    surprisedUntil = now + 600;
    lastActivity = now;
    hush();
    jump(-330, 0);
    say(pick(QUIPS.wake), { priority: 2 });
  }

  function dismiss() {
    if (mode === 'gone') return;
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* fine */ }
    hush();
    drag = null;
    if (reduceMotion) { running = false; root.remove(); return; }   // nothing to animate, just go
    say(pick(QUIPS.bye), { priority: 9, hold: 2200 });
    mode = 'gone';
    facing = x + w / 2 < vw / 2 ? -1 : 1;
    vy = -260;
  }

  // ---------------------------------------------------------------------------
  // Simulation
  // ---------------------------------------------------------------------------

  function step(dt, now) {
    const floorY = vh;
    const feetBefore = y + h;

    if (mode === 'drag') {
      const k = Math.min(1, dt * 20);
      const nx = x + (drag.tx - x) * k, ny = y + (drag.ty - y) * k;
      vx = (nx - x) / Math.max(dt, 1e-3);
      vy = (ny - y) / Math.max(dt, 1e-3);
      x = nx; y = ny;
      theta += (clamp(vx * 0.05, -32, 32) - theta) * Math.min(1, dt * 10);
      // legs scrabble in the air while it is carried
      if (Math.abs(vx) + Math.abs(vy) > 40) { stepAcc += Math.hypot(vx, vy) * dt; while (stepAcc > STEP * 2) { stepAcc -= STEP * 2; stepLegs(); } }
      else setLegs('air');
    } else if (mode === 'gone') {
      vy += GRAVITY * 0.35 * dt;
      x += facing * 460 * dt;
      y += vy * dt;
      theta += facing * 900 * dt;
      if (x > vw + 80 || x + w < -80) { running = false; root.remove(); }
    } else if (mode === 'air') {
      vy = Math.min(MAX_FALL, vy + GRAVITY * dt);
      x += vx * dt;
      y += vy * dt;
      theta += omega * dt;
      omega *= Math.pow(0.55, dt);
      // walls
      if (x < 0) { x = 0; vx = -vx * 0.55; omega = -omega; }
      else if (x > vw - w) { x = vw - w; vx = -vx * 0.55; omega = -omega; }
      // the header is a ceiling, but only for things moving up: the entrance falls in from above it
      if (y < ceilY && vy < 0) { y = ceilY; vy = -vy * 0.3; }
      setLegs('air');
      // landing: the highest platform edge crossed by the feet this frame, else the floor
      if (vy > 0) {
        const feet = y + h, cx = x + w / 2;
        let best = null, bestTop = Infinity;
        for (const p of platforms) {
          const t = platTop(p);
          if (t < feetBefore - 0.01 || t > feet) continue;
          if (cx < p.left + 4 || cx > p.right - 4) continue;
          if (t - h < ceilY - 2) continue;              // would poke through the header
          if (t < bestTop) { bestTop = t; best = p; }
        }
        if (best) { y = bestTop - h; land(best, vy > 620); }
        else if (feet >= floorY) {
          y = floorY - h;
          if (vy > 640) { vy = -vy * 0.42; vx *= 0.8; sx = 1.3; sy = 0.7; burst(x + w / 2, y + h, 5, ['.', '·'], { up: true, minSpeed: 60, maxSpeed: 160 }); }
          else land(null, vy > 480);
        }
      }
    } else if (mode === 'stand' || mode === 'sleep') {
      // ride whatever we stand on
      if (plat) {
        const t = platTop(plat);
        if (t > floorY) { plat = null; y = floorY - h; }
        else if (t - h < ceilY - 2) { mode = 'air'; plat = null; vy = 0; vx = 0; walking = false; }
        else y = t - h;
      } else {
        y = floorY - h;
      }
      if (mode === 'stand') {
        const [lo, hi] = standRange();
        if (walking) {
          x += facing * speed * dt;
          stepAcc += speed * dt;
          while (stepAcc > STEP) { stepAcc -= STEP; stepLegs(); }
          walkPhase += dt * speed / 5;
          bob = -Math.abs(Math.sin(walkPhase)) * 2;
          if (!surprisedUntil && !eyesUntil) setEyes(facing > 0 ? EYES.right : EYES.left);
          if (x < lo) { x = lo; atEdge(-1, now); }
          else if (x > hi) { x = hi; atEdge(1, now); }
        } else {
          bob += (Math.sin(now / 650) * 0.9 - bob) * Math.min(1, dt * 6);
          if (x < lo || x > hi) { x = clamp(x, lo, hi); }
          setLegs('rest');
          if (!surprisedUntil && !eyesUntil && now >= curiousUntil) setEyes(EYES.open);
        }
        x = clamp(x, 0, vw - w);
      }
    }

    // scroll speed, for the "hold on" line
    const sYnow = window.scrollY;
    scrollVel = (sYnow - lastScrollY) / Math.max(dt, 1e-3);
    lastScrollY = sYnow;
    if (Math.abs(scrollVel) > 3800 && now > scrollQuipCooldown && (mode === 'stand') && plat && !reduceMotion) {
      scrollQuipCooldown = now + 30000;
      say(pick(QUIPS.scroll), { priority: 1 });
    }

    // eased bits
    sx += (1 - sx) * Math.min(1, dt * 12);
    sy += (1 - sy) * Math.min(1, dt * 12);
    if (spin) {
      const p = Math.min(1, (now - spin.t0) / spin.dur);
      const e = 1 - Math.pow(1 - p, 3);
      theta = spin.from + (spin.to - spin.from) * e;
      if (p >= 1) { theta = spin.to % 360; spin = null; }
    }
    if (mode !== 'air' && mode !== 'drag' && !spin) theta += (0 - theta) * Math.min(1, dt * 8);
    if (surprisedUntil && now > surprisedUntil) { surprisedUntil = 0; if (mode !== 'sleep') { setEyes(EYES.open); setAntennae('up'); } }

    // small life: blinks, antenna twitches, and a whole-body wiggle when petted
    faceTick(now);
    if (now < wiggleUntil) { theta = Math.sin(now / 40) * 12; if (now > nextTwitch) { twitch(now); nextTwitch = now + 160; } }
    else if (mode !== 'sleep') {
      if (now > nextBlink) { if (!surprisedUntil) blink(now); nextBlink = now + rand(2500, 6000); }
      if (now > nextTwitch) { if (!surprisedUntil) twitch(now); nextTwitch = now + rand(1500, 4500); }
    }
  }

  function atEdge(dir, now) {
    if (!plat) { facing = -dir; return; }              // walls: turn around
    const r = Math.random();
    if (r < 0.55) facing = -dir;
    else if (r < 0.82) jump(-200, dir * speed * 1.4);   // step off, fall to whatever is below
    else jump(-560, dir * 150);                          // hop, maybe onto something higher
    nextDecision = now + rand(800, 2000);
  }

  function decide(now) {
    if (mode !== 'stand' || now < nextDecision || reduceMotion) return;
    if (now < curiousUntil || now < avoidUntil) return;
    const r = Math.random();
    const onFloorLong = !plat;
    if (r < 0.42) {
      walking = true;
      speed = rand(42, 92);
      if (Math.random() < 0.35) facing = -facing;
      nextDecision = now + rand(2200, 5500);
    } else if (r < 0.66) {
      walking = false;
      nextDecision = now + rand(1200, 3600);
    } else if (r < 0.80) {
      jump(-430, facing * rand(40, 90));
      nextDecision = now + 1200;
    } else if (r < 0.93 || onFloorLong) {
      jump(-640, facing * rand(90, 170));                // high enough to reach a card from the floor
      nextDecision = now + 1200;
    } else {
      spin = { from: theta, to: theta + 360, t0: now, dur: 700 };
      nextDecision = now + 1500;
    }
  }

  function cursorBehaviour(now, dt) {
    if (reduceMotion || !ptr.seen) return;
    const cx = x + w / 2, cy = y + h / 2;
    const dx = ptr.x - cx, dy = ptr.y - cy;
    const d = Math.hypot(dx, dy);
    const sinceMove = now - ptr.t;
    const pspeed = sinceMove > 150 ? 0 : Math.hypot(ptr.vx, ptr.vy);   // a pointer that stopped is not moving fast, whatever its last sample said

    if (mode === 'sleep') {
      if (d < 320 && sinceMove < 200) wake(now);
      return;
    }
    if (mode !== 'stand') return;

    // approaching fast: get out of the way
    const approaching = ptr.vx * (cx - ptr.x) + ptr.vy * (cy - ptr.y) > 0;
    if (pspeed > 750 && d < 130 && approaching && sinceMove < 120 && now > fleeCooldown) { flee(now); return; }

    // sitting on top of a link someone is about to click: step aside
    if (ptr.overLink && d < 95 && sinceMove < 1500 && now > avoidUntil) {
      avoidUntil = now + 900;
      avoidDir = dx > 0 ? -1 : 1;
      curiousUntil = 0;
    }
    if (now < avoidUntil) { walking = true; facing = avoidDir; speed = 110; return; }

    // an idle cursor nearby is worth a look
    if (now < curiousUntil) {
      if (Math.abs(dx) > 46) { walking = true; facing = dx > 0 ? 1 : -1; speed = 62; }
      else { walking = false; if (!surprisedUntil && !eyesUntil) setEyes(dx > 8 ? EYES.right : dx < -8 ? EYES.left : EYES.open); }
      return;
    }
    if (d < 260 && Math.abs(dy) < 170 && pspeed < 60 && sinceMove > 500 && !ptr.overLink && Math.random() < dt * 0.3) {
      curiousUntil = now + rand(2500, 4500);
      if (Math.random() < 0.45) say(pick(QUIPS.curious), { priority: 0 });
    }
  }

  function sleepiness(now) {
    if (reduceMotion || mode !== 'stand' || speech.on || drag) return;
    if (now - lastActivity > 75000) {
      mode = 'sleep';
      walking = false;
      setEyes(EYES.shut);
      setAntennae('droop');
      setLegs('rest');
      nextSnore = now + 800;
    }
  }
  function snoreTick(now) {
    if (mode !== 'sleep' || now < nextSnore) return;
    say(pick(QUIPS.sleep), { priority: 0, hold: 3500 });
    nextSnore = now + rand(9000, 14000);
  }

  let hinted = false;
  function randomQuip(now) {
    if (!landedOnce || speech.on || now < nextQuipAt || mode === 'sleep' || mode === 'gone' || mode === 'drag') return;
    if (!hinted) { hinted = true; say(QUIPS.meta[0], { priority: 1 }); return; }   // the first thing after hello is how to play
    say(ambient.next(), { priority: 1 });   // outranks the incidental lines, so a fact gets read to the end
  }

  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------

  function draw() {
    body.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    squash.style.transform = 'translateY(' + bob.toFixed(1) + 'px) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
    glyph.style.transform = 'rotate(' + theta.toFixed(1) + 'deg)';
    if (glyphDirty) { glyph.textContent = renderGlyph(); glyphDirty = false; }
    closeBtn.style.transform = 'translate3d(' + Math.min(x + w - 12, vw - 20).toFixed(1) + 'px,' + (y - 6).toFixed(1) + 'px,0)';
    positionBubble();
  }

  // ---------------------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------------------

  let last = performance.now();
  let nextRefresh = 0;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;               // a hidden tab or a slow frame must not tunnel through platforms
    if (now > nextRefresh) { refreshPlatforms(); nextRefresh = now + 2500; }
    if (!reduceMotion) {
      step(dt, now);
      decide(now);
      cursorBehaviour(now, dt);
      sleepiness(now);
      snoreTick(now);
    } else {
      x = clamp(x, 0, vw - w); y = clamp(y, ceilY, vh - h);
    }
    randomQuip(now);
    speechTick(now, dt);
    particlesTick(dt);
    draw();
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    lastActivity = now;
    if (ptr.seen && ptr.t) {
      const dtp = Math.max(8, now - ptr.t) / 1000;
      // light smoothing so a single jittery sample does not read as a lunge
      ptr.vx = ptr.vx * 0.5 + ((e.clientX - ptr.x) / dtp) * 0.5;
      ptr.vy = ptr.vy * 0.5 + ((e.clientY - ptr.y) / dtp) * 0.5;
    }
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now; ptr.seen = true;
    const t = e.target;
    ptr.overLink = !!(t && t.closest && !root.contains(t) && t.closest('a, button, input, select, textarea, summary, label'));
  }, { passive: true });
  ['keydown', 'scroll', 'touchstart', 'pointerdown'].forEach((ev) =>
    window.addEventListener(ev, () => { lastActivity = performance.now(); if (mode === 'sleep' && ev !== 'pointerdown') wake(lastActivity); }, { passive: true }));

  // The dismiss button sits just outside the body, so it stays visible for a
  // moment after the pointer leaves; otherwise it fades before it can be reached.
  let hoverTimer = 0;
  function showClose(ms) {
    clearTimeout(hoverTimer);
    root.classList.add('mx-hover');
    hoverTimer = setTimeout(() => { if (!drag) root.classList.remove('mx-hover'); }, ms);
  }
  body.addEventListener('pointerenter', (e) => {
    showClose(e.pointerType === 'touch' ? 3500 : 60000);
    if (drag || mode === 'gone') return;
    const now = performance.now();
    if (mode === 'sleep') { wake(now); return; }
    wiggleUntil = now + 650;
    if (now > greetCooldown) { say(pick(QUIPS.hello), { priority: 0, hold: 1600 }); greetCooldown = now + 25000; }
  });
  body.addEventListener('pointerleave', (e) => { if (!drag) showClose(e.pointerType === 'touch' ? 3500 : 900); });
  closeBtn.addEventListener('pointerenter', () => showClose(60000));
  closeBtn.addEventListener('pointerleave', () => showClose(600));

  body.addEventListener('pointerdown', (e) => {
    if (mode === 'gone') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { body.setPointerCapture(e.pointerId); } catch { /* not all pointers can be captured */ }
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - x, oy: e.clientY - y,
             moved: false, t0: performance.now(), tx: x, ty: y, hist: [] };
  });
  body.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now();
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
      drag.moved = true;
      setEyes(EYES.wide); setAntennae('alert'); surprisedUntil = now + 800;   // picked up: eyes go wide, asleep or not
      mode = reduceMotion ? 'stand' : 'drag';
      plat = null; walking = false; spin = null; hush();
      if (!reduceMotion) say(pick(QUIPS.grabbed), { priority: 4, hold: 1500 });
    }
    drag.tx = clamp(e.clientX - drag.ox, -w / 2, vw - w / 2);
    drag.ty = clamp(e.clientY - drag.oy, ceilY - h / 2, vh - h / 2);
    if (reduceMotion) { x = clamp(drag.tx, 0, vw - w); y = clamp(drag.ty, ceilY, vh - h); }
    drag.hist.push([now, e.clientX, e.clientY]);
    if (drag.hist.length > 8) drag.hist.shift();
  });
  function endDrag(e, cancelled) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag;
    drag = null;
    if (e && e.pointerType === 'touch') showClose(3500);   // a mouse is still hovering; pointerleave handles it
    const now = performance.now();
    if (!d.moved) { if (!cancelled && now - d.t0 < 700) poke(false); return; }
    if (reduceMotion) { mode = 'stand'; return; }
    // throw velocity from the last ~100 ms of pointer travel
    let tvx = 0, tvy = 0;
    const recent = d.hist.filter((s) => now - s[0] < 110);
    if (recent.length >= 2) {
      const a = recent[0], b = recent[recent.length - 1];
      const dtp = Math.max(0.016, (b[0] - a[0]) / 1000);
      tvx = (b[1] - a[1]) / dtp; tvy = (b[2] - a[2]) / dtp;
    }
    if (cancelled) { tvx = 0; tvy = 0; }
    mode = 'air';
    plat = null;
    x = clamp(x, 0, vw - w); y = clamp(y, ceilY, vh - h);
    vx = clamp(tvx, -1600, 1600);
    vy = clamp(tvy, -1300, 900);
    omega = clamp(vx * 1.1, -1400, 1400);
    const fast = Math.hypot(vx, vy) > 520;
    if (fast) { setEyes(EYES.wide); setAntennae('alert'); surprisedUntil = now + 900; say(pick(QUIPS.thrown), { priority: 4 }); }
    else if (Math.random() < 0.6) say(pick(QUIPS.dropped), { priority: 0, hold: 1500 });
  }
  body.addEventListener('pointerup', (e) => endDrag(e, false));
  body.addEventListener('pointercancel', (e) => endDrag(e, true));
  body.addEventListener('lostpointercapture', (e) => { if (drag && e.pointerId === drag.id) endDrag(e, true); });
  // Keyboard activation arrives as a click with detail 0; mouse clicks are handled by the pointer path above.
  body.addEventListener('click', (e) => { if (e.detail === 0) poke(true); });
  body.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismiss(); });
  body.addEventListener('dragstart', (e) => e.preventDefault());
  closeBtn.addEventListener('click', dismiss);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { measure(); refreshPlatforms(); x = clamp(x, 0, vw - w); y = clamp(y, -h, vh - h); }, 120);
  });
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  // ---------------------------------------------------------------------------
  // Go
  // ---------------------------------------------------------------------------

  function start() {
    document.body.appendChild(root);
    glyph.textContent = renderGlyph();
    glyphDirty = false;
    measure();
    refreshPlatforms();
    const now = performance.now();
    lastActivity = now;
    if (reduceMotion) {
      mode = 'stand';
      x = vw - w - 22;
      y = vh - h - 18;
      landedOnce = true;
      draw();
      say(QUIPS.greeting, { priority: 3, hold: 6000 });
      nextQuipAt = now + 20000;
    } else {
      // enter from above, somewhere in the middle, and fall onto whatever is there
      x = clamp(vw * rand(0.3, 0.72) - w / 2, 8, vw - w - 8);
      y = -h - 4;
      vy = 0;
      mode = 'air';
      facing = Math.random() < 0.5 ? -1 : 1;
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); refreshPlatforms(); });
    requestAnimationFrame((t) => { last = t; frame(t); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
