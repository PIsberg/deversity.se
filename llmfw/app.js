/* Vanilla JavaScript for the llm-fw page. No build step, no dependencies. */

// ============================================================================
// Paddle configuration — THE ONLY PART THAT NEEDS EDITING TO GO LIVE
// ============================================================================
//
// Fill these in from the Paddle dashboard (Catalog → Products → Prices) and the
// buy buttons become a real checkout. Until then every button degrades to a
// mailto: link, so the page is safe to publish before the products exist —
// visitors get a working way to buy, just a manual one.
//
// TOKEN is a client-side token (`live_...` / `test_...`). It is public by
// design and safe to commit; the secret API key is a different credential and
// must never appear here.
//
// To also accept PayPal: Paddle dashboard → Checkout → Payment methods → enable
// PayPal. It then appears inside the same overlay. Nothing here changes.
const PADDLE = {
  token: 'PADDLE_CLIENT_TOKEN_UNSET',
  tiers: {
    t1: { priceId: 'PADDLE_PRICE_ID_UNSET', label: '1 to 9 developers' },
    t2: { priceId: 'PADDLE_PRICE_ID_UNSET', label: '10 to 49 developers' },
    t3: { priceId: 'PADDLE_PRICE_ID_UNSET', label: '50 to 199 developers' },
    t4: { priceId: 'PADDLE_PRICE_ID_UNSET', label: '200+ developers' },
  },
};

const SUPPORT_EMAIL = 'peter.isberg@deversity.se';
const isConfigured = (value) => typeof value === 'string' && !value.endsWith('_UNSET');

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. Dashboard showcase tab switcher
  // ==========================================
  const tabButtons = document.querySelectorAll('.showcase-tabs .tab-btn');
  const showcaseImage = document.getElementById('showcase-image');
  const viewerDescription = document.getElementById('viewer-description');

  if (tabButtons.length && showcaseImage && viewerDescription) {
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const imgSrc = button.getAttribute('data-img');
        const descText = button.getAttribute('data-desc');

        showcaseImage.style.opacity = '0';
        setTimeout(() => {
          showcaseImage.src = imgSrc;
          viewerDescription.textContent = descText;
          showcaseImage.style.opacity = '1';
        }, 150);
      });
    });
  }

  // ==========================================
  // 2. FAQ accordion
  // ==========================================
  const accordionTriggers = document.querySelectorAll('.accordion-trigger');
  accordionTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const parent = trigger.parentElement;
      const isOpen = parent.classList.contains('active');

      document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        parent.classList.add('active');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ==========================================
  // 3. Copy the install snippet
  // ==========================================
  const btnCopyCode = document.getElementById('btn-copy-code');
  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', async () => {
      const codeSnippet = document.getElementById('code-snippet').textContent;
      try {
        await navigator.clipboard.writeText(codeSnippet);
        btnCopyCode.textContent = 'Copied';
        btnCopyCode.style.color = 'var(--color-safe)';
      } catch {
        // Clipboard is blocked on insecure origins and by some browser settings.
        // Say so rather than showing "Copied" over a clipboard that never changed.
        btnCopyCode.textContent = 'Copy failed';
        btnCopyCode.style.color = 'var(--color-blocked)';
      }
      setTimeout(() => {
        btnCopyCode.textContent = 'Copy';
        btnCopyCode.style.color = 'var(--color-text-bright)';
      }, 2000);
    });
  }

  // ==========================================
  // 4. Commercial licence checkout (Paddle)
  // ==========================================
  const status = document.getElementById('checkout-status');
  const buyButtons = Array.from(document.querySelectorAll('button.buy[data-tier-key]'));

  function say(message) {
    if (!status) return;
    status.textContent = message;
    status.hidden = false;
  }

  // Replace a buy button with a mailto: link. Used both when Paddle is
  // unavailable and when a tier has no price ID yet — in either case the visitor
  // still gets a route to buying, instead of a button that does nothing.
  function degradeToEmail(button) {
    const link = document.createElement('a');
    link.className = 'buy buy-link';
    link.textContent = 'Email';
    link.href = 'mailto:' + SUPPORT_EMAIL + '?subject=' +
      encodeURIComponent('llm-fw licence: ' + button.getAttribute('data-tier'));
    button.parentNode.replaceChild(link, button);
  }

  const unconfigured = buyButtons.filter(
    button => !isConfigured((PADDLE.tiers[button.getAttribute('data-tier-key')] || {}).priceId)
  );

  // Paddle's script is loaded from their CDN without Subresource Integrity on
  // purpose: Paddle ships updates to paddle.js at that same URL, so a pinned
  // hash would start failing on their next release. The failure mode is
  // contained — if the script does not load, window.Paddle is absent and every
  // button here becomes an email link rather than a dead control.
  if (!isConfigured(PADDLE.token) || unconfigured.length === buyButtons.length) {
    buyButtons.forEach(degradeToEmail);
  } else if (!window.Paddle) {
    buyButtons.forEach(degradeToEmail);
    say('Card checkout could not load — the buttons above will email us instead.');
  } else {
    unconfigured.forEach(degradeToEmail);
    initPaddle();
  }

  function initPaddle() {
    Paddle.Initialize({ token: PADDLE.token });

    // Show Paddle's localized prices where it can detect the visitor's country.
    // Use `subtotal`, not `total`: the account sells tax-exclusive, so `total`
    // already includes VAT and would contradict the note promising tax is added
    // at checkout. On failure the EUR list prices already in the markup stand.
    const priceCells = Array.from(document.querySelectorAll('.price[data-tier-key]'))
      .map(cell => ({ cell, priceId: PADDLE.tiers[cell.getAttribute('data-tier-key')]?.priceId }))
      .filter(entry => isConfigured(entry.priceId));

    if (priceCells.length && Paddle.PricePreview) {
      Paddle.PricePreview({
        items: priceCells.map(entry => ({ priceId: entry.priceId, quantity: 1 })),
      }).then(result => {
        (result.data.details.lineItems || []).forEach(item => {
          const entry = priceCells.find(e => e.priceId === item.price.id);
          if (entry && item.formattedTotals && item.formattedTotals.subtotal) {
            entry.cell.textContent = item.formattedTotals.subtotal;
          }
        });
      }).catch(() => {
        // Keep the EUR list prices already rendered in the table.
      });
    }

    document.addEventListener('click', event => {
      const button = event.target.closest('button.buy[data-tier-key]');
      if (!button) return;

      const tier = PADDLE.tiers[button.getAttribute('data-tier-key')];
      if (!tier || !isConfigured(tier.priceId)) return;

      try {
        Paddle.Checkout.open({
          items: [{ priceId: tier.priceId, quantity: 1 }],
          settings: {
            displayMode: 'overlay',
            theme: 'dark',
            successUrl: 'https://deversity.se/llmfw/',
          },
        });
      } catch {
        say('Checkout could not be opened. Email ' + SUPPORT_EMAIL + ' and we will invoice you directly.');
      }
    });
  }

});
