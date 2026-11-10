#!/usr/bin/env node
/* Behaviour test for assets/tier-prices.js. Node stdlib only, no DOM library:
   a fake document and a fake Paddle are enough, because the script only reads
   attributes, sets textContent and calls Paddle.PricePreview.

   Written after the tier tables showed SEK for the bands Paddle can price and
   EUR for everything else (the 400+ bands, OEM, the "From" card) on the same
   page. The rule under test: a page shows one currency. Either every amount is
   localized, or none is.

   Usage: node tools/test-tier-prices.js */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'assets', 'tier-prices.js'), 'utf8');

function el(eur, text) {
  const attrs = eur === null ? {} : { 'data-eur': String(eur) };
  return { attrs, textContent: text, getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; } };
}

// Smallest-unit SEK subtotals at Paddle's rate on 2026-11-10 (SEK 2,205.02 for EUR 250, 52,920.57 for 6,000).
const SEK = { t1: 220502, t4: 5292057, addon: 2646029 };
function line(id, subtotal) {
  return { price: { id }, totals: { subtotal: String(subtotal) },
    formattedTotals: { subtotal: 'SEK ' + (subtotal / 100).toFixed(2) } };
}

async function run({ elements, entries, addonPriceId, preview }) {
  const ctx = {
    document: { querySelectorAll: (sel) => {
      assert.strictEqual(sel, '[data-eur]');
      return elements.filter((e) => e.getAttribute('data-eur') !== null);
    } },
    Paddle: { PricePreview: preview },
    Intl, Number, Math, Array, Object, String, Promise,
  };
  ctx.window = ctx;
  vm.runInNewContext(SCRIPT, ctx);
  ctx.window.showTierPrices(entries, addonPriceId);
  await new Promise((resolve) => setImmediate(resolve));
}

const sek = (amount) => new Intl.NumberFormat(undefined, {
  style: 'currency', currency: 'SEK', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(amount);

function page() {
  const t1 = el(250, '€250');
  const t4 = el(6000, '€6,000');
  const t5 = el(9000, '€9,000');     // 200 to 399 price plus one add-on
  const oem = el(10000, '€10,000');  // negotiated, no Paddle price
  const card = el(450, '€450');      // "From €450" elsewhere on the page
  return { t1, t4, t5, oem, card, elements: [t1, t4, t5, oem, card] };
}

const resolved = (items) => () => Promise.resolve({ data: { currencyCode: 'SEK', details: { lineItems: items } } });

const tests = {
  async 'add-on price not in Paddle yet: unpriced amounts convert at the rate Paddle used'() {
    const p = page();
    await run({
      elements: p.elements,
      entries: [{ cell: p.t1, priceId: 'pri_t1', addons: 0 }, { cell: p.t4, priceId: 'pri_t4', addons: 0 }],
      addonPriceId: 'pri_UNSET',
      preview: resolved([line('pri_t1', SEK.t1), line('pri_t4', SEK.t4)]),
    });
    assert.strictEqual(p.t1.textContent, sek(2205.02));
    assert.strictEqual(p.t4.textContent, sek(52920.57));
    assert.strictEqual(p.t5.textContent, sek(79380.86));
    assert.strictEqual(p.oem.textContent, sek(88200.95));
    assert.strictEqual(p.card.textContent, sek(3969.04));
  },

  async 'add-on price in Paddle: band is base plus add-ons in Paddle amounts'() {
    const p = page();
    await run({
      elements: p.elements,
      entries: [{ cell: p.t1, priceId: 'pri_t1', addons: 0 }, { cell: p.t4, priceId: 'pri_t4', addons: 0 },
        { cell: p.t5, priceId: 'pri_t4', addons: 1 }],
      addonPriceId: 'pri_addon',
      preview: resolved([line('pri_t1', SEK.t1), line('pri_t4', SEK.t4), line('pri_addon', SEK.addon)]),
    });
    assert.strictEqual(p.t5.textContent, sek(79380.86));
    for (const e of p.elements) assert.ok(!e.textContent.includes('€'), e.textContent);
  },

  async 'Paddle fails: every amount keeps its EUR list price'() {
    const p = page();
    await run({
      elements: p.elements,
      entries: [{ cell: p.t1, priceId: 'pri_t1', addons: 0 }],
      addonPriceId: 'pri_UNSET',
      preview: () => Promise.reject(new Error('offline')),
    });
    assert.deepStrictEqual(p.elements.map((e) => e.textContent), ['€250', '€6,000', '€9,000', '€10,000', '€450']);
  },

  async 'no rate to convert with: nothing is localized rather than half the page'() {
    const p = page();
    p.t1.attrs = {};  // a priced cell without its EUR list price gives no rate
    await run({
      elements: p.elements,
      entries: [{ cell: p.t1, priceId: 'pri_t1', addons: 0 }],
      addonPriceId: 'pri_UNSET',
      preview: resolved([line('pri_t1', SEK.t1)]),
    });
    assert.deepStrictEqual(p.elements.map((e) => e.textContent), ['€250', '€6,000', '€9,000', '€10,000', '€450']);
  },
};

(async () => {
  let failed = 0;
  for (const [name, test] of Object.entries(tests)) {
    try { await test(); console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + e.message.split('\n').join('\n     ')); }
  }
  console.log('\n%d test(s), %d failed', Object.keys(tests).length, failed);
  process.exit(failed ? 1 : 0);
})();
