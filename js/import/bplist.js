// Bounded binary-plist reader. No network, dependencies or modern-only syntax.
window.FuelLogBplist = (function () {
  function decode(buffer) {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength > 5 * 1024 * 1024 || buffer.byteLength < 40) throw new Error('Invalid or oversized binary plist.');
    var bytes = new Uint8Array(buffer), view = new DataView(buffer), end = bytes.length - 32;
    if (String.fromCharCode.apply(null, bytes.subarray(0, 8)) !== 'bplist00') throw new Error('Not a binary plist.');
    function bounds(pos, size, limit) { if (!Number.isSafeInteger(pos) || !Number.isSafeInteger(size) || pos < 0 || size < 0 || pos + size > limit) throw new Error('Invalid binary plist bounds.'); }
    function uint(pos, size, limit) {
      bounds(pos, size, limit); if (size < 1 || size > 8) throw new Error('Invalid integer size.');
      var n = 0; for (var i = 0; i < size; i++) { n = n * 256 + bytes[pos + i]; if (!Number.isSafeInteger(n)) throw new Error('Binary plist integer exceeds safe precision.'); } return n;
    }
    var offsetSize = bytes[end + 6], refSize = bytes[end + 7], count = uint(end + 8, 8, bytes.length), root = uint(end + 16, 8, bytes.length), table = uint(end + 24, 8, bytes.length);
    if (!count || count > 100000 || root >= count || !offsetSize || offsetSize > 8 || !refSize || refSize > 8 || table < 8) throw new Error('Invalid binary plist trailer.');
    bounds(table, count * offsetSize, end);
    var offsets = [], cache = [], active = [], complete = [], budget = 0, allocated = 0;
    for (var j = 0; j < count; j++) { var off = uint(table + j * offsetSize, offsetSize, end); if (off < 8 || off >= table) throw new Error('Invalid object offset.'); offsets.push(off); }
    var ordered = offsets.slice().sort(function(a,b){return a-b}), limits = Object.create(null);
    for (var oi=0;oi<ordered.length;oi++) { if (oi && ordered[oi]===ordered[oi-1]) throw new Error('Duplicate object offset.'); limits[ordered[oi]]=oi+1<ordered.length?ordered[oi+1]:table; }
    function allocate(size) { allocated += size; if (allocated > 16 * 1024 * 1024) throw new Error('Decoded plist allocation limit exceeded.'); }
    function object(id, depth) {
      if (id >= count) throw new Error('Invalid object reference.');
      if (depth > 64 || ++budget > 500000) throw new Error('Binary plist resource limit exceeded.');
      if (active[id]) throw new Error('Cyclic binary plist.');
      if (complete[id]) return cache[id]; active[id] = true;
      var objectEnd = limits[offsets[id]], pos = offsets[id], marker = bytes[pos++], type = marker >> 4, info = marker & 15, n, size, value, i;
      function length() {
        if (info < 15) return info;
        bounds(pos, 1, objectEnd); var m = bytes[pos++]; if ((m >> 4) !== 1 || (m & 15) > 3) throw new Error('Invalid extended length.');
        var s = Math.pow(2, m & 15), l = uint(pos, s, objectEnd); pos += s; return l;
      }
      if (type === 0) { if (info === 0) value = null; else if (info === 8 || info === 9) value = info === 9; else throw new Error('Unsupported plist simple value.'); }
      else if (type === 1) {
        size = Math.pow(2, info); bounds(pos, size, objectEnd); if (size > 8) throw new Error('Unsupported integer width.');
        // Apple encodes negative integers as signed eight-byte values.
        if (size === 8 && bytes[pos] >= 128) { n = 0; for (i = 0; i < size; i++) n = n * 256 + (255 - bytes[pos + i]); value = -n - 1; if (!Number.isSafeInteger(value)) throw new Error('Integer exceeds safe precision.'); }
        else value = uint(pos, size, objectEnd);
      } else if (type === 2 || type === 3) {
        size = Math.pow(2, info); if ((type === 3 && info !== 3) || (size !== 4 && size !== 8)) throw new Error('Unsupported plist real/date.');
        bounds(pos, size, objectEnd); n = size === 4 ? view.getFloat32(pos, false) : view.getFloat64(pos, false);
        if (!isFinite(n)) throw new Error('Non-finite plist number.');
        value = type === 3 ? new Date(Math.floor((n + 978307200) * 1000 + 0.0001)) : n;
        if (type === 3) value.plistSeconds = n;
        if (type === 3 && isNaN(value.getTime())) throw new Error('Invalid plist date.');
      } else if (type === 4 || type === 5 || type === 6) {
        n = length(); allocate(type === 4 ? n * 8 : n * 2); size = type === 6 ? n * 2 : n; bounds(pos, size, objectEnd);
        if (type === 4) value = {data: Array.prototype.slice.call(bytes.subarray(pos, pos + size))};
        else { value = ''; for (i = 0; i < n; i++) value += String.fromCharCode(type === 6 ? view.getUint16(pos + i * 2, false) : bytes[pos + i]); }
      } else if (type === 8) value = {uid: uint(pos, info + 1, objectEnd)};
      else if (type === 10 || type === 13) {
        n = length(); allocate(n * (type === 13 ? 64 : 8)); if (n > 100000) throw new Error('Too many plist members.');
        bounds(pos, n * refSize * (type === 13 ? 2 : 1), objectEnd); value = type === 10 ? [] : Object.create(null);
        for (i = 0; i < n; i++) {
          var key = object(uint(pos + i * refSize, refSize, objectEnd), depth + 1);
          if (type === 10) value.push(key);
          else { if (typeof key !== 'string') throw new Error('Invalid dictionary key.'); if (Object.prototype.hasOwnProperty.call(value, key)) throw new Error('Duplicate dictionary key.'); value[key] = object(uint(pos + (n + i) * refSize, refSize, objectEnd), depth + 1); }
        }
      } else throw new Error('Unsupported binary plist object type.');
      active[id] = false; complete[id] = true; cache[id] = value; return value;
    }
    return object(root, 0);
  }
  return {decode: decode};
})();
