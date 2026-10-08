const FuelDB = (() => {
  const DB_NAME = 'FuelLogDB';
  const DB_VERSION = 3;
  const MAP_TILE_MAX_BYTES = 32 * 1024 * 1024;
  let db;

  const open = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('vehicles')) d.createObjectStore('vehicles', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('fillups')) {
        const s = d.createObjectStore('fillups', { keyPath: 'id' });
        s.createIndex('date', 'date');
        s.createIndex('vehicleId', 'vehicleId');
      }
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });
      if (!d.objectStoreNames.contains('priceCache')) d.createObjectStore('priceCache', { keyPath: 'key' });
      if (!d.objectStoreNames.contains('promos')) d.createObjectStore('promos', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('mapTiles')) d.createObjectStore('mapTiles', { keyPath: 'key' });
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });

  const tx = (store, mode = 'readonly') => db.transaction(store, mode).objectStore(store);
  const all = store => new Promise((res, rej) => { const r = tx(store).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const get = (store, key) => new Promise((res, rej) => { const r = tx(store).get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const put = (store, val) => new Promise((res, rej) => { const r = tx(store, 'readwrite').put(val); r.onsuccess = () => res(val); r.onerror = () => rej(r.error); });
  const del = (store, key) => new Promise((res, rej) => { const r = tx(store, 'readwrite').delete(key); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
  const clear = store => new Promise((res, rej) => { const r = tx(store, 'readwrite').clear(); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });

  // All requests are enqueued synchronously; success means the transaction committed.
  const commitImport = batch => new Promise((resolve, reject) => {
    const stores = ['vehicles', 'fillups', 'settings', 'promos'].filter(name => batch[name] !== undefined);
    let transaction;
    try {
      transaction = db.transaction(stores, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error || new Error('Import aborted; existing data was preserved.'));
      transaction.onerror = () => {}; // Let the default IndexedDB action abort the whole batch.
      stores.forEach(name => {
        const store = transaction.objectStore(name);
        if (batch.replace && name !== 'settings') store.clear();
        batch[name].forEach(record => store.put(record));
      });
    } catch (error) {
      if (transaction) { try { transaction.abort(); } catch (_) {} }
      reject(error);
    }
  });

  async function evictMapTiles(maxBytes) {
    const cap = maxBytes || MAP_TILE_MAX_BYTES;
    const rows = await all('mapTiles');
    let total = rows.reduce((s, r) => s + (r.size || 0), 0);
    if (total <= cap) return;
    rows.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    for (let i = 0; i < rows.length && total > cap; i++) {
      await del('mapTiles', rows[i].key);
      total -= rows[i].size || 0;
    }
  }

  async function putMapTile(key, blob) {
    const size = blob && blob.size ? blob.size : 0;
    await put('mapTiles', { key, blob, ts: Date.now(), size });
    await evictMapTiles(MAP_TILE_MAX_BYTES);
  }

  async function getMapTile(key) {
    const row = await get('mapTiles', key);
    return row && row.blob ? row.blob : null;
  }

  return {
    open, all, get, put, del, clear, commitImport,
    putMapTile, getMapTile, evictMapTiles,
    MAP_TILE_MAX_BYTES
  };
})();
