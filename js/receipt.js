(function (root) {
  'use strict';

  function numberFrom(text) {
    var value = String(text || '').replace(/[^0-9,.-]/g, '');
    var comma = value.lastIndexOf(',');
    var dot = value.lastIndexOf('.');
    if (comma >= 0 && dot >= 0) {
      if (comma > dot) value = value.replace(/\./g, '').replace(',', '.');
      else value = value.replace(/,/g, '');
    } else if (comma >= 0) {
      value = value.replace(',', '.');
    }
    var result = Number(value);
    return isFinite(result) ? result : null;
  }

  function parseDate(text) {
    var iso = String(text || '').match(/(?:^|\D)(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (iso) {
      var isoYear = +iso[1], isoMonth = +iso[2], isoDay = +iso[3], isoHour = +(iso[4] || 0), isoMinute = +(iso[5] || 0);
      if (isoMonth < 1 || isoMonth > 12 || isoDay < 1 || isoDay > new Date(isoYear, isoMonth, 0).getDate() || isoHour > 23 || isoMinute > 59) return null;
      return iso[1] + '-' + String(isoMonth).padStart(2, '0') + '-' + String(isoDay).padStart(2, '0') + 'T' + String(+(iso[4] || 0)).padStart(2, '0') + ':' + String(+(iso[5] || 0)).padStart(2, '0');
    }
    var match = String(text || '').match(/(?:^|\D)(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (!match) return null;
    var day = +match[1], month = +match[2], year = +match[3];
    if (year < 100) year += year < 70 ? 2000 : 1900;
    var hour = +(match[4] || 0), minute = +(match[5] || 0);
    if (month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate() || hour > 23 || minute > 59) return null;
    return String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0') + 'T' + String(+(match[4] || 0)).padStart(2, '0') + ':' + String(+(match[5] || 0)).padStart(2, '0');
  }

  function lastAmount(line) {
    var matches = String(line || '').match(/\d[\d\s.,]*\d|\d/g);
    if (!matches || !matches.length) return null;
    for (var i = matches.length - 1; i >= 0; i--) {
      var value = numberFrom(matches[i]);
      if (value != null) return value;
    }
    return null;
  }

  function labelledAmount(line, pattern) {
    var match = String(line || '').match(pattern);
    return match ? numberFrom(match[1]) : null;
  }

  function parse(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
    var result = { station: '', date: null, fuelType: '', litres: null, pricePerLitre: null, totalCost: null, amountsMatch: null, warnings: [] };
    var datePattern = /(?:data|date|\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b)/i;
    var fuelPattern = /(gas[oó]leo|diesel|gasolina|petrol|gpl|lpg)/i;
    var litrePattern = /(litros?|litres?|\bL\b)/i;
    var pricePattern = /(pre[cç]o\s*\/?\s*l|price\s*\/?\s*l|€\s*\/?\s*l|eur\s*\/?\s*l|\/?\s*l\s*€)/i;
    var totalPattern = /(total|valor\s*(?:a\s*pagar)?|amount\s*due)/i;
    var skipStation = /(data|date|total|litros?|litres?|pre[cç]o|price|€|eur|gas[oó]leo|diesel|gasolina|petrol|gpl|lpg|fatura|recibo|nif|contribuinte)/i;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!result.date && datePattern.test(line)) result.date = parseDate(line);
      if (!result.fuelType && fuelPattern.test(line)) result.fuelType = line;
      if (result.litres == null && litrePattern.test(line)) {
        var litreValue = labelledAmount(line, /(\d[\d\s.,]*\d|\d)\s*(?:litros?|litres?|\bL\b)/i);
        if (litreValue == null && !pricePattern.test(line)) litreValue = lastAmount(line);
        if (litreValue != null) result.litres = litreValue;
      }
      if (result.pricePerLitre == null && pricePattern.test(line)) result.pricePerLitre = labelledAmount(line, /(\d[\d\s.,]*\d|\d)\s*(?:€|EUR)?\s*\/\s*L/i) || lastAmount(line);
      if (result.totalCost == null && totalPattern.test(line)) result.totalCost = lastAmount(line);
      if (!result.station && !skipStation.test(line) && !/\d{4,}/.test(line)) result.station = line;
    }
    if (result.litres != null && result.pricePerLitre != null && result.totalCost != null) {
      var expected = result.litres * result.pricePerLitre;
      result.amountsMatch = Math.abs(expected - result.totalCost) <= Math.max(0.05, result.totalCost * 0.01);
      if (!result.amountsMatch) result.warnings.push('Litres × unit price does not match the receipt total. Check all three values.');
    }
    return result;
  }

  root.FuelLogReceipt = { parse: parse, numberFrom: numberFrom };
})(window);
