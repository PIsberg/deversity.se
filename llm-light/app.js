/* Vanilla JavaScript for the llm-light page. No build step, no dependencies. */

// ============================================================================
// Paddle configuration: THE ONLY CODE THAT NEEDS EDITING TO GO LIVE
// ============================================================================
//
// llm-light has no Paddle products yet. Every price ID below ends in _UNSET,
// so the tier table stays hidden and the page shows the "checkout not open yet"
// card instead. Going live:
//
//   1. Create the product and its yearly prices in the Paddle dashboard
//      (Catalog → Products), and paste each price ID over its _UNSET value.
//      That includes addonPriceId, one yearly "each further 200 developers" price.
//   2. Put the EUR list price in each `.price` cell in index.html. Paddle
//      replaces it with a localized price when it can; the markup value is what
//      visitors see when paddle.js is blocked.
//   3. Rewrite the Commercial card in #licensing, which still says checkout is
//      not open, and add llm-light to terms.html and refunds.html.
//
// As soon as the token and at least one price ID are set, the table appears
// and its Buy buttons open a checkout. A tier still left _UNSET degrades to a
// mailto: link, so a partly configured catalogue is safe to publish.
//
// TOKEN is a client-side token (`live_...` / `test_...`), the same one the
// other product pages use. It is public by design and safe to commit; the
// secret API key is a different credential and must never appear here.
const PADDLE = {
  token: 'live_b240a77b002cdcfbfb7907b4783',
  // The yearly "each further 200 developers" price. Bands from 400 up check out as
  // the t4 price once plus this one `addons` times. While it is _UNSET those bands
  // show their list price and offer email instead of Buy.
  addonPriceId: 'pri_UNSET',
  tiers: {
    t1: { priceId: 'pri_UNSET', label: '1 to 9 developers' },
    t2: { priceId: 'pri_UNSET', label: '10 to 49 developers' },
    t3: { priceId: 'pri_UNSET', label: '50 to 199 developers' },
    t4: { priceId: 'pri_UNSET', label: '200 to 399 developers' },
    t5: { priceId: 'pri_UNSET', addons: 1, label: '400 to 599 developers' },
    t6: { priceId: 'pri_UNSET', addons: 2, label: '600 to 799 developers' },
    t7: { priceId: 'pri_UNSET', addons: 3, label: '800 to 999 developers' },
  },
};

const SUPPORT_EMAIL = 'peter.isberg@deversity.se';
const isConfigured = (value) => typeof value === 'string' && !value.endsWith('_UNSET');
// A band sold with add-ons cannot be bought until the add-on price exists too.
const isOnSale = (tier) => Boolean(tier) && isConfigured(tier.priceId)
  && (!tier.addons || isConfigured(PADDLE.addonPriceId));

document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('checkout-status');
  const live = document.getElementById('tiers-live');
  const pending = document.getElementById('tiers-pending');
  const buyButtons = Array.from(document.querySelectorAll('button.buy[data-tier-key]'));

  function say(message) {
    if (!status) return;
    status.textContent = message;
    status.hidden = false;
  }

  // Replace a buy button with a mailto: link, so a tier with no price ID, or a
  // page where paddle.js did not load, still offers a way to buy.
  function degradeToEmail(button) {
    const link = document.createElement('a');
    link.className = 'buy buy-link';
    link.textContent = 'Email';
    link.href = 'mailto:' + SUPPORT_EMAIL + '?subject=' +
      encodeURIComponent('llm-light licence: ' + button.getAttribute('data-tier'));
    button.parentNode.replaceChild(link, button);
  }

  const unconfigured = buyButtons.filter(
    button => !isOnSale(PADDLE.tiers[button.getAttribute('data-tier-key')])
  );

  // Nothing to sell yet: leave the table hidden and the pending card showing.
  // A table of Email buttons with no prices would read as a price list that
  // forgot its prices.
  if (!isConfigured(PADDLE.token) || unconfigured.length === buyButtons.length) {
    return;
  }

  if (live) live.hidden = false;
  if (pending) pending.hidden = true;

  // Loaded without Subresource Integrity on purpose: Paddle ships updates at the
  // same URL, so a pinned hash would break on their next release. If the script
  // does not load, every button becomes an email link rather than a dead control.
  if (!window.Paddle) {
    buyButtons.forEach(degradeToEmail);
    say('Card checkout could not load. The buttons above will email us instead.');
    return;
  }

  unconfigured.forEach(degradeToEmail);

  // The environment follows the token: a test_ token cannot reach the live
  // catalogue, and a live_ token cannot be left pointing at sandbox.
  if (PADDLE.token.startsWith('test_') && Paddle.Environment) {
    Paddle.Environment.set('sandbox');
  }
  Paddle.Initialize({ token: PADDLE.token });

  // Localized prices; see assets/tier-prices.js.
  showTierPrices(Array.from(document.querySelectorAll('.price[data-tier-key]'))
    .map(cell => ({ cell, tier: PADDLE.tiers[cell.getAttribute('data-tier-key')] }))
    .filter(entry => isOnSale(entry.tier))
    .map(({ cell, tier }) => ({ cell, priceId: tier.priceId, addons: tier.addons || 0 })),
  PADDLE.addonPriceId);

  document.addEventListener('click', event => {
    const button = event.target.closest('button.buy[data-tier-key]');
    if (!button) return;

    const tier = PADDLE.tiers[button.getAttribute('data-tier-key')];
    if (!isOnSale(tier)) return;

    const items = [{ priceId: tier.priceId, quantity: 1 }];
    if (tier.addons) items.push({ priceId: PADDLE.addonPriceId, quantity: tier.addons });

    try {
      Paddle.Checkout.open({
        items,
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          successUrl: 'https://deversity.se/llm-light/',
        },
      });
    } catch {
      say('Checkout could not be opened. Email ' + SUPPORT_EMAIL + ' and we will invoice you directly.');
    }
  });
});
