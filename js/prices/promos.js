// FuelLog brand promos: user-defined per-litre or per-fill discounts matched to station brands (iOS 12 safe).
// Promo = {id, brand, country, type:'litre'|'fill', amount, fuelId, validUntil, notes, active, updatedAt}
//   country '' = any country; fuelId '' = any fuel; validUntil 'YYYY-MM-DD' '' = no expiry.
window.FuelLogPromos = (function () {
  var DEFAULT_FILL_LITRES = 40;
  function norm(t) {
    return window.FuelProviders ? FuelProviders.norm(t) : String(t == null ? '' : t).toLowerCase();
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
  function match(station, canonicalFuel, promos, fillLitres) {
    var now = Date.now(), best = null, bestDisc = 0;
    (promos || []).forEach(function (p) {
      if (!active(p, now) || !matches(p, station, canonicalFuel)) return;
      var d = perLitre(p, fillLitres);
      if (d > bestDisc) { bestDisc = d; best = p; }
    });
    return best;
  }
  function effective(station, canonicalFuel, promos, fillLitres) {
    var base = isFinite(station && station.price) ? +station.price : null;
    var promo = match(station, canonicalFuel, promos, fillLitres);
    if (base == null || !promo) return { base: base, price: base, promo: null, perLitre: 0 };
    var d = perLitre(promo, fillLitres);
    var price = Math.round((base - d) * 1000) / 1000;
    return { base: base, price: price < 0 ? 0 : price, promo: promo, perLitre: d };
  }
  return { DEFAULT_FILL_LITRES: DEFAULT_FILL_LITRES, active: active, perLitre: perLitre, match: match, effective: effective };
})();
