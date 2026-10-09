// FuelLog canonical fuel identifiers, related-fuel fallbacks and free-text guessing (iOS 12 safe).
window.FuelLogFuels = (function () {
  var LIST = [
    { id: 'PETROL_95', label: 'Petrol 95' },
    { id: 'PETROL_95_ADDITIVATED', label: 'Petrol 95 (additivated)' },
    { id: 'PETROL_95_E5', label: 'Petrol 95 E5' },
    { id: 'PETROL_95_E10', label: 'Petrol 95 E10' },
    { id: 'PETROL_98', label: 'Petrol 98' },
    { id: 'PETROL_98_ADDITIVATED', label: 'Petrol 98 (additivated / premium)' },
    { id: 'DIESEL_B7', label: 'Diesel B7' },
    { id: 'DIESEL_B10', label: 'Diesel B10' },
    { id: 'DIESEL_PREMIUM', label: 'Additivated / premium diesel' },
    { id: 'LPG', label: 'LPG' },
    { id: 'CNG', label: 'CNG' },
    { id: 'LNG', label: 'LNG' },
    { id: 'E85', label: 'E85' },
    { id: 'ADBLUE', label: 'AdBlue' }
  ];
  var RELATED = {
    PETROL_95: ['PETROL_95_E10', 'PETROL_95_E5'],
    PETROL_95_ADDITIVATED: ['PETROL_95', 'PETROL_95_E5', 'PETROL_95_E10'],
    PETROL_98_ADDITIVATED: ['PETROL_98'],
    PETROL_95_E5: ['PETROL_95', 'PETROL_95_E10'],
    PETROL_95_E10: ['PETROL_95', 'PETROL_95_E5'],
    PETROL_98: [],
    DIESEL_B7: ['DIESEL_B10'],
    DIESEL_B10: ['DIESEL_B7'],
    DIESEL_PREMIUM: ['DIESEL_B7']
  };
  function label(id) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i].label;
    return id || '';
  }
  function known(id) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i].label;
    return '';
  }
  function present(id, text) {
    var named = known(id);
    if (named) return named;
    var guessed = guess(text);
    if (guessed) return label(guessed);
    return text == null ? '' : String(text);
  }
  function optionLabels(rows) {
    var list = rows || [];
    var counts = {};
    var i;
    for (i = 0; i < list.length; i++) {
      var id = list[i] && list[i].canonical;
      if (!id) continue;
      counts[id] = (counts[id] || 0) + 1;
    }
    var out = [];
    for (i = 0; i < list.length; i++) {
      var row = list[i] || {};
      var base = known(row.canonical);
      var local = row.label == null ? '' : String(row.label);
      if (!base) {
        out.push(local);
        continue;
      }
      if (counts[row.canonical] > 1 && local && norm(local) !== norm(base)) out.push(base + ' · ' + local);
      else out.push(base);
    }
    return out;
  }
  function related(id) {
    return RELATED[id] || [];
  }
  function norm(text) {
    var s = FuelProviders && FuelProviders.norm ? FuelProviders.norm(text) : String(text == null ? '' : text).toLowerCase();
    return s.replace(/ev[o0]\s*l[o0]g[i1]c/g, 'evologic').replace(/\b(evologic|ultimate|active|efitec|top|optima)(95|98)\b/g, '$1 $2');
  }
  function guess(text) {
    var t = norm(text);
    if (!t) return null;
    if (/ad ?blue/.test(t)) return 'ADBLUE';
    if (/e85|super ?ethanol/.test(t)) return 'E85';
    if (/gnl|lng|gas natural licuado|liquefeito|liquefied/.test(t)) return 'LNG';
    if (/gnc|cng|gas natural comprimido|compressed natural/.test(t)) return 'CNG';
    if (/gpl|lpg|autogas|glp|gases licuados|liquefied petroleum/.test(t)) return 'LPG';
    var special = /\b(aditivad[oa]s?|especial|premium|evologic|excellium|ultimate|active|evolution|supreme|v.?power|efitec|neotech|top|optima)\b|\be\s*\+/.test(t);
    if (/\bsimples\b/.test(t)) special = false;
    if (/diesel|gasoleo|gazole|gasoil|gasolio|motorina|gasoleo/.test(t)) {
      // ECO is a distinct biofuel product; its name does not specify B7/B10.
      if (/\beco\s*diesel\b/.test(t)) return null;
      if (special) return 'DIESEL_PREMIUM';
      if (/\bb10\b/.test(t)) return 'DIESEL_B10';
      return 'DIESEL_B7';
    }
    if (/(?:^|[^\d.,])98(?:$|[^\d.,])/.test(t)) return special ? 'PETROL_98_ADDITIVATED' : 'PETROL_98';
    if (/(?:^|[^\d.,])(?:95|sp95|euro95)(?:$|[^\d.,])/.test(t)) {
      if (special) return 'PETROL_95_ADDITIVATED';
      if (/e10/.test(t)) return 'PETROL_95_E10';
      if (/e5/.test(t)) return 'PETROL_95_E5';
      return 'PETROL_95';
    }
    if (/gasolina|essence|benzine|benzina|petrol|gasoline|mogas/.test(t)) return null;
    return null;
  }
  return { LIST: LIST, label: label, related: related, guess: guess, present: present, optionLabels: optionLabels };
})();
