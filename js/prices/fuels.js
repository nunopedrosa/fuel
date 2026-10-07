// FuelLog canonical fuel identifiers, related-fuel fallbacks and free-text guessing (iOS 12 safe).
window.FuelLogFuels = (function () {
  var LIST = [
    { id: 'PETROL_95', label: 'Petrol 95' },
    { id: 'PETROL_95_E5', label: 'Petrol 95 E5' },
    { id: 'PETROL_95_E10', label: 'Petrol 95 E10' },
    { id: 'PETROL_98', label: 'Petrol 98' },
    { id: 'DIESEL_B7', label: 'Diesel B7' },
    { id: 'DIESEL_B10', label: 'Diesel B10' },
    { id: 'DIESEL_PREMIUM', label: 'Premium diesel' },
    { id: 'LPG', label: 'LPG' },
    { id: 'CNG', label: 'CNG' },
    { id: 'LNG', label: 'LNG' },
    { id: 'E85', label: 'E85' },
    { id: 'ADBLUE', label: 'AdBlue' }
  ];
  var RELATED = {
    PETROL_95: ['PETROL_95_E10', 'PETROL_95_E5'],
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
    return s;
  }
  function guess(text) {
    var t = norm(text);
    if (!t) return null;
    if (/ad ?blue/.test(t)) return 'ADBLUE';
    if (/e85|super ?ethanol/.test(t)) return 'E85';
    if (/gnl|lng|gas natural licuado|liquefeito|liquefied/.test(t)) return 'LNG';
    if (/gnc|cng|gas natural comprimido|compressed natural/.test(t)) return 'CNG';
    if (/gpl|lpg|autogas|glp|gases licuados|liquefied petroleum/.test(t)) return 'LPG';
    if (/98/.test(t)) return 'PETROL_98';
    if (/95/.test(t) && /e10/.test(t)) return 'PETROL_95_E10';
    if (/95/.test(t) && /e5/.test(t)) return 'PETROL_95_E5';
    if (/95|sp95|euro95|gasolina|essence|benzine|benzina|petrol|gasoline|mogas/.test(t)) return 'PETROL_95';
    if (/diesel|gasoleo|gazole|gasoil|gasolio|motorina|gasoleo/.test(t)) {
      if (/especial|premium|excellium|ultimate|evolution|supreme|v.?power|efitec/.test(t)) return 'DIESEL_PREMIUM';
      if (/b10/.test(t)) return 'DIESEL_B10';
      return 'DIESEL_B7';
    }
    return null;
  }
  return { LIST: LIST, label: label, related: related, guess: guess, present: present, optionLabels: optionLabels };
})();
