/* Localized prices for the commercial tier tables. Vanilla JS, no build step.

   Bands from 400 developers up are sold as two Paddle prices: the 200 to 399 price
   once, plus an "each further 200 developers" add-on a number of times. Paddle's
   preview returns a subtotal per line and no grand total, so the sum is done here.

   entries: [{ cell, priceId, addons }], addons being 0 for a band sold as one price.
   Shows `subtotal`, not `total`: the account sells tax-exclusive, so `total` already
   includes VAT and would contradict the note that tax is added at checkout. On any
   failure the EUR list prices already in the markup stand. */
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

    entries.forEach(function (entry) {
      var base = lines[entry.priceId];
      var addon = lines[addonPriceId];
      if (!base || (entry.addons && !addon)) return;
      var amount = smallest(base) + (entry.addons ? entry.addons * smallest(addon) : 0);
      entry.cell.textContent = money.format(amount / Math.pow(10, decimals));
    });
  }).catch(function () {
    // Keep the EUR list prices already in the markup.
  });
};
