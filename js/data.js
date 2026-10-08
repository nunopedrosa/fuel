// Shared data semantics; storage and UI stay with their respective callers.
window.FuelLogData = (function () {
  function currency(record, vehicle) { return String(record && record.currency || vehicle && vehicle.currency || 'EUR').toUpperCase(); }
  function amountsByCurrency(fills, vehicles) {
    var out = {}; fills.forEach(function (f) { var v = (vehicles || []).filter(function (x) { return x.id === f.vehicleId; })[0], c = currency(f, v); out[c] = (out[c] || 0) + Number(f.totalCost || 0); }); return out;
  }
  function sourceKey(f) { return JSON.stringify([f.date,Number(f.odometer),Number(f.litres),String(f.currency || 'EUR'),Number(f.totalCost)]); }
  function intervals(fills) {
    var sorted = fills.slice().sort(function (a,b) { return new Date(a.date)-new Date(b.date); }), out = [], warnings = [], anchor = null, sum = 0;
    sorted.forEach(function (f) {
      sum += Number(f.litres); if (!f.fullTank) return;
      if (anchor) { var dist = Number(f.odometer)-Number(anchor.odometer), cons = sum/dist*100, flags = [];
        if (dist <= 0 || !isFinite(dist) || !isFinite(cons)) warnings.push('Nonpositive or invalid distance ending '+f.date);
        else { if (cons < 2 || cons > 30) { flags.push('Review unusual consumption: '+cons.toFixed(2)+' L/100 km'); warnings.push(flags[0]+' ending '+f.date); } out.push({start:anchor,end:f,distance:dist,litres:sum,consumption:cons,warnings:flags}); }
      } anchor = f; sum = 0;
    }); return {intervals:out,warnings:warnings};
  }
  function edited(old, changes) { return Object.assign({}, old, changes); }
  function editedDate(old, input) { return old && old.date && input === old.date.slice(0,16) ? old.date : new Date(input).toISOString(); }
  return {currency:currency,amountsByCurrency:amountsByCurrency,sourceKey:sourceKey,intervals:intervals,edited:edited,editedDate:editedDate};
})();
