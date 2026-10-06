const FuelDB = (() => {
  const DB_NAME='FuelLogDB', DB_VERSION=1;
  let db;
  const open=()=>new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=e=>{
      const d=e.target.result;
      if(!d.objectStoreNames.contains('vehicles')) d.createObjectStore('vehicles',{keyPath:'id'});
      if(!d.objectStoreNames.contains('fillups')) { const s=d.createObjectStore('fillups',{keyPath:'id'}); s.createIndex('date','date'); s.createIndex('vehicleId','vehicleId'); }
      if(!d.objectStoreNames.contains('settings')) d.createObjectStore('settings',{keyPath:'key'});
      if(!d.objectStoreNames.contains('priceCache')) d.createObjectStore('priceCache',{keyPath:'key'});
    };
    req.onsuccess=()=>{db=req.result;resolve(db)}; req.onerror=()=>reject(req.error);
  });
  const tx=(store,mode='readonly')=>db.transaction(store,mode).objectStore(store);
  const all=store=>new Promise((res,rej)=>{const r=tx(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  const get=(store,key)=>new Promise((res,rej)=>{const r=tx(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  const put=(store,val)=>new Promise((res,rej)=>{const r=tx(store,'readwrite').put(val);r.onsuccess=()=>res(val);r.onerror=()=>rej(r.error)});
  const del=(store,key)=>new Promise((res,rej)=>{const r=tx(store,'readwrite').delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
  const clear=store=>new Promise((res,rej)=>{const r=tx(store,'readwrite').clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
  return {open,all,get,put,del,clear};
})();
