/* Localized prices for the commercial tier tables. Vanilla JS, no build step.

   A page shows one currency. Paddle's preview detects the visitor's country and
   prices whatever it sells; every other amount on the page (bands whose add-on
   price is not in Paddle yet, OEM floors, the "From" card, a cross-link to the
   other product's tiers) carries its EUR list price in `data-eur` and is
   converted at the rate Paddle's own figures imply. If no rate can be derived,
   nothing is localized: a table in SEK beside a card in EUR was the defect this
   rule fixes. On any failure the EUR list prices already in the markup stand.

   Bands from 400 developers up are sold as two Paddle prices: the 200 to 399 price
   once, plus an "each further 200 developers" add-on a number of times. Paddle's
   preview returns a subtotal per line and no grand total, so the sum is done here.

   entries: [{ cell, priceId, addons }], addons being 0 for a band sold as one price.
   Shows `subtotal`, not `total`: the account sells tax-exclusive, so `total` already
   includes VAT and would contradict the note that tax is added at checkout. */
window.showTierPrices = function (entries, addonPriceId) {
  if (!entries.length || !window.Paddle || !Paddle.PricePreview) return;

  var ids = entries.map(function (entry) { return entry.priceId; });
  if (entries.some(function (entry) { return entry.addons; })) ids.push(addonPriceId);
  ids = ids.filter(function (id, index) { return ids.indexOf(id) === index; });

  Paddle.PricePreview({
    items: ids.map(function (id) { return { priceId: id, quantity: 1 }; })
  }).then(function (result) {
    var lines = {};
    (result.data.details.lineItems || []).forEach(function (line) { lines[line.price.id] = line; });

    var first = lines[ids[0]];
    if (!first) return;

    // Paddle's amounts are in the currency's smallest unit. Read how many decimals
    // that means from Paddle's own formatted amount ("52,470.54 kr" has 2, "¥9,000"
    // has 0), because guessing wrong would publish a price off by a factor of 100.
    var fraction = /[.,](\d{1,2})\D*$/.exec(first.formattedTotals.subtotal);
    var decimals = fraction ? fraction[1].length : 0;
    var money = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: result.data.currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    var smallest = function (line) { return Number(line.totals.subtotal); };
    var eurOf = function (element) { return Number(element.getAttribute('data-eur')); };

    // Amounts Paddle prices directly, in its smallest unit.
    var amounts = [];
    var reference = null;
    entries.forEach(function (entry) {
      var base = lines[entry.priceId];
      var addon = lines[addonPriceId];
      if (!base || (entry.addons && !addon)) return;
      var amount = smallest(base) + (entry.addons ? entry.addons * smallest(addon) : 0);
      amounts.push({ element: entry.cell, amount: amount });
      // The rate for everything else comes from the largest single-price band:
      // Paddle rounds each price to the smallest unit, and on the largest amount
      // that rounding moves the implied rate least.
      var eur = eurOf(entry.cell);
      if (!entry.addons && eur > 0 && (!reference || eur > reference.eur)) {
        reference = { eur: eur, amount: amount };
      }
    });

    var priced = amounts.map(function (item) { return item.element; });
    var rest = Array.prototype.slice.call(document.querySelectorAll('[data-eur]'))
      .filter(function (element) { return priced.indexOf(element) < 0; });
    if (rest.length && !reference) return;  // half a page localized is worse than none
    rest.forEach(function (element) {
      amounts.push({ element: element, amount: Math.round(eurOf(element) * reference.amount / reference.eur) });
    });

    amounts.forEach(function (item) {
      item.element.textContent = money.format(item.amount / Math.pow(10, decimals));
    });
  }).catch(function () {
    // Keep the EUR list prices already in the markup.
  });
};
