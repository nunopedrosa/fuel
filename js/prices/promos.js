// FuelLog brand promos: user-defined per-litre or per-fill discounts matched to station brands (iOS 12 safe).
// Promo = {id, brand, country, type:'litre'|'fill', amount, fuelId, validUntil, notes, active, cumulative, updatedAt}
//   country '' = any country; fuelId '' = any fuel; validUntil 'YYYY-MM-DD' '' = no expiry.
//   cumulative === false is exclusive; any other value, including a missing field, stacks.
window.FuelLogPromos = (function () {
  var DEFAULT_FILL_LITRES = 40;
  function norm(t) {
    var s = String(t == null ? '' : t).toLowerCase().replace(/\s+/g, ' ').trim();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s;
  }
  function active(p, now) {
    if (!p || p.active === false) return false;
    if (p.validUntil) {
      var d = new Date(String(p.validUntil) + 'T23:59:59');
      if (isFinite(d.getTime()) && d.getTime() < (now || Date.now())) return false;
    }
    return true;
  }
  function perLitre(p, fillLitres) {
    if (!p || !isFinite(p.amount) || p.amount <= 0) return 0;
    if (p.type === 'fill') {
      var l = +fillLitres || DEFAULT_FILL_LITRES;
      return l > 0 ? p.amount / l : 0;
    }
    return p.amount;
  }
  function matches(p, station, canonicalFuel) {
    var pb = norm(p.brand), sb = norm(station && station.brand);
    if (!pb || pb !== sb) return false;
    if (p.country && p.country !== station.country) return false;
    if (p.fuelId && p.fuelId !== canonicalFuel) return false;
    return true;
  }
  // Single largest matching discount. Station prices use offers(), which can stack cumulative promos.
  function match(station, canonicalFuel, promos, fillLitres) {
    var now = Date.now(), best = null, bestDisc = 0;
    (promos || []).forEach(function (p) {
      if (!active(p, now) || !matches(p, station, canonicalFuel)) return;
      var d = perLitre(p, fillLitres);
      if (d > bestDisc) { bestDisc = d; best = p; }
    });
    return best;
  }
  function roundPrice(base, discount) {
    var price = Math.round((base - discount) * 1000) / 1000;
    return price < 0 ? 0 : price;
  }
  function asPackage(list, cumulative, fillLitres, base) {
    if (!list.length) return null;
    var discount = 0;
    list.forEach(function (p) { discount += perLitre(p, fillLitres); });
    if (!(discount > 0)) return null;
    return {
      promos: list,
      perLitre: discount,
      price: roundPrice(base, discount),
      cumulative: cumulative
    };
  }
  function offers(station, canonicalFuel, promos, fillLitres) {
    var base = isFinite(station && station.price) ? +station.price : null;
    if (base == null) return { base: null, winner: null, alternative: null };
    var now = Date.now(), cumulative = [], bestExclusive = null, bestExclusiveDisc = 0;
    (promos || []).forEach(function (p) {
      if (!active(p, now) || !matches(p, station, canonicalFuel)) return;
      var d = perLitre(p, fillLitres);
      if (!(d > 0)) return;
      if (p.cumulative === false) {
        if (!bestExclusive || d > bestExclusiveDisc) { bestExclusive = p; bestExclusiveDisc = d; }
      } else cumulative.push(p);
    });
    var stack = asPackage(cumulative, true, fillLitres, base);
    var exclusive = bestExclusive ? asPackage([bestExclusive], false, fillLitres, base) : null;
    var winner = null, alternative = null;
    if (stack && exclusive) {
      if (exclusive.perLitre > stack.perLitre) { winner = exclusive; alternative = stack; }
      else { winner = stack; alternative = exclusive; }
    } else winner = stack || exclusive;
    return { base: base, winner: winner, alternative: alternative };
  }
  function effective(station, canonicalFuel, promos, fillLitres) {
    var offer = offers(station, canonicalFuel, promos, fillLitres);
    if (!offer.winner) return { base: offer.base, price: offer.base, perLitre: 0 };
    return { base: offer.base, price: offer.winner.price, perLitre: offer.winner.perLitre };
  }
  return { DEFAULT_FILL_LITRES: DEFAULT_FILL_LITRES, active: active, perLitre: perLitre, match: match, offers: offers, effective: effective };
})();
