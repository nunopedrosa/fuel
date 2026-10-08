// Pure, local history analysis. Dates are inclusive; consumption intervals are never clipped.
window.FuelLogAnalysis = (function () {
  'use strict';
  var DAY = 86400000;
  function number(value) { return value !== null && value !== undefined && value !== '' && isFinite(Number(value)); }
  function prepare(fills, vehicles) {
    var sorted = fills.filter(function (f) { return isFinite(new Date(f.date).getTime()); }).slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    var result = FuelLogData.intervals(sorted), byEnd = new Map();
    var intervals = result.intervals.map(function (x) {
      var interval = Object.assign({}, x, { t: new Date(x.end.date).getTime(), from: new Date(x.start.date).getTime(), urban: null, knownDistance: 0 });
      byEnd.set(x.end, interval); return interval;
    });
    var anchor = null, previous = null, known = 0, urbanDistance = 0, bad = false, reversed = false;
    sorted.forEach(function (f) {
      if (anchor) {
        var distance = Number(f.odometer) - Number(previous.odometer);
        if (!isFinite(distance) || distance <= 0) { bad = true; if (!isFinite(distance) || distance < 0) reversed = true; }
        else if (typeof f.cityPercentage === 'number' && isFinite(f.cityPercentage) && f.cityPercentage >= 0 && f.cityPercentage <= 1) {
          known += distance; urbanDistance += distance * f.cityPercentage;
        }
      }
      if (f.fullTank) {
        var interval = byEnd.get(f);
        if (interval && !reversed) {
          interval.knownDistance = known;
          if (!bad && Math.abs(known - interval.distance) < 0.000001) interval.urban = urbanDistance / interval.distance;
        }
        anchor = f; known = 0; urbanDistance = 0; bad = false; reversed = false;
      }
      previous = f;
    });
    return { fills: sorted, intervals: intervals, warnings: result.warnings, invalidDates: fills.length - sorted.length,
      vehicles: vehicles || [], min: sorted.length ? new Date(sorted[0].date).getTime() : 0,
      max: sorted.length ? new Date(sorted[sorted.length - 1].date).getTime() : 0 };
  }
  function summary(fills, intervals, vehicles) {
    var distance = 0, consumed = 0, litres = 0, money = {};
    intervals.forEach(function (x) { distance += x.distance; consumed += x.litres; });
    fills.forEach(function (f) {
      var c = FuelLogData.currency(f, (vehicles || []).filter(function (v) { return v.id === f.vehicleId; })[0]);
      var m = money[c] || (money[c] = { cost: null, litres: 0, price: null, pricedLitres: 0, priceAmount: 0, missingCosts: 0 });
      var volume = number(f.litres) && Number(f.litres) > 0 ? Number(f.litres) : 0;
      litres += volume; m.litres += volume;
      if (number(f.totalCost) && Number(f.totalCost) >= 0) m.cost = (m.cost || 0) + Number(f.totalCost);
      else m.missingCosts++;
      var price = number(f.totalCost) && Number(f.totalCost) >= 0 && volume > 0 ? Number(f.totalCost) / volume :
        number(f.pricePerLitre) && Number(f.pricePerLitre) >= 0 ? Number(f.pricePerLitre) : null;
      if (price !== null && volume > 0) { m.priceAmount += price * volume; m.pricedLitres += volume; }
    });
    Object.keys(money).forEach(function (c) { var m = money[c]; m.price = m.pricedLitres > 0 ? m.priceAmount / m.pricedLitres : null; });
    return { distance: distance, consumption: distance > 0 ? consumed / distance * 100 : null, litres: litres, money: money, count: intervals.length };
  }
  function select(model, start, end) {
    var fills = model.fills.filter(function (f) { var t = new Date(f.date).getTime(); return t >= start && t <= end; });
    var intervals = model.intervals.filter(function (x) { return x.from >= start && x.t <= end; });
    var crossing = model.intervals.filter(function (x) { return x.t >= start && x.from <= end && !(x.from >= start && x.t <= end); }).length;
    var known = intervals.reduce(function (sum, x) { return sum + x.knownDistance; }, 0);
    var stats = summary(fills, intervals, model.vehicles);
    return { purchases: fills, intervals: intervals, summary: stats, crossing: crossing,
      scatter: intervals.filter(function (x) { return x.urban !== null; }), profileCoverage: stats.distance > 0 ? known / stats.distance : null };
  }
  function windowFor(model, days, position) {
    var span = Math.max(0, model.max - model.min), duration = Math.min(span, Math.max(1, Number(days) || 1) * DAY);
    var start = model.min + Math.round((span - duration) * Math.max(0, Math.min(100, Number(position) || 0)) / 100);
    return { start: start, end: start + duration };
  }
  // Min/max buckets retain endpoints and spikes without making summaries approximate.
  function sample(points, limit) {
    if (points.length <= limit) return points.slice();
    var out = [points[0]], buckets = Math.max(1, Math.floor((limit - 2) / 2)), width = (points.length - 2) / buckets;
    for (var b = 0; b < buckets; b++) {
      var first = 1 + Math.floor(b * width), last = Math.min(points.length - 1, 1 + Math.floor((b + 1) * width)), low = first, high = first;
      for (var i = first; i < last; i++) { if (points[i].y < points[low].y) low = i; if (points[i].y > points[high].y) high = i; }
      out.push(points[Math.min(low, high)]); if (low !== high) out.push(points[Math.max(low, high)]);
    }
    out.push(points[points.length - 1]); return out;
  }
  function monthly(fills, currency, start, end, vehicles) {
    if (!fills.length) return [];
    var a = new Date(start), z = new Date(end), min = a.getFullYear() * 12 + a.getMonth(), max = z.getFullYear() * 12 + z.getMonth();
    var size = Math.max(1, Math.ceil((max - min + 1) / 60)), buckets = {};
    fills.forEach(function (f) {
      if (currency && FuelLogData.currency(f, (vehicles || []).filter(function (v) { return v.id === f.vehicleId; })[0]) !== currency) return;
      var d = new Date(f.date), index = Math.floor((d.getFullYear() * 12 + d.getMonth() - min) / size), month = min + index * size;
      var from = Math.max(start, new Date(Math.floor(month / 12), month % 12, 1).getTime());
      var to = Math.min(end, new Date(Math.floor((month + size) / 12), (month + size) % 12, 1).getTime() - 1);
      var bucket = buckets[index] || (buckets[index] = { t: (from + to) / 2, from: from, to: to, litres: 0, cost: null, count: 0, missingCosts: 0 });
      bucket.count++; if (number(f.litres)) bucket.litres += Number(f.litres);
      if (number(f.totalCost) && Number(f.totalCost) >= 0) bucket.cost = (bucket.cost || 0) + Number(f.totalCost); else bucket.missingCosts++;
    });
    return Object.keys(buckets).map(function (key) { return buckets[key]; }).sort(function (a, b) { return a.t - b.t; });
  }
  function trend(intervals) {
    return intervals.map(function (x, i) {
      var group = intervals.slice(Math.max(0, i - 4), i + 1), distance = 0, litres = 0;
      group.forEach(function (v) { distance += v.distance; litres += v.litres; });
      return { t: x.t, y: litres / distance * 100 };
    });
  }
  return { prepare: prepare, select: select, summary: summary, windowFor: windowFor, sample: sample, monthly: monthly, trend: trend, DAY: DAY };
})();
