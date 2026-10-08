window.FuelLogJerrycan = (function () {
  function inspect(root) {
    if (!root || !root.Car || typeof root.Car !== 'object' || Array.isArray(root.Car) || !Array.isArray(root.Records)) throw new Error('This plist is not a Jerrycan backup (Car and Records required).');
    if (root.Records.length > 50000) throw new Error('Too many Jerrycan records.');
    return {car:root.Car,count:root.Records.length};
  }
  function iso(value, offset) {
    if (value instanceof Date) return value.toISOString();
    var s=String(value || ''), m=s.match(/^(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d)(?::(\d\d)(?:\.(\d+))?)?(Z|[+-]\d\d:\d\d)?$/);
    if (!m) throw new Error('Invalid date.');
    var t=new Date(0);t.setUTCFullYear(+m[1],+m[2]-1,+m[3]);t.setUTCHours(+m[4],+m[5],+(m[6]||0),+(String(m[7]||'').slice(0,3).padEnd(3,'0')));
    if(t.getUTCFullYear()!==+m[1]||t.getUTCMonth()!==+m[2]-1||t.getUTCDate()!==+m[3]||+m[4]>23||+m[5]>59||+(m[6]||0)>59)throw new Error('Invalid calendar date.');
    if(m[8]){if(m[8]==='Z')offset=0;else{var hours=+m[8].slice(1,3),minutes=+m[8].slice(4,6);if(hours>14||minutes>59||(hours===14&&minutes))throw new Error('Invalid timezone.');offset=(hours*60+minutes)*(m[8][0]==='-'?-1:1)}}
    if (offset===undefined || !isFinite(offset) || Math.abs(offset)>840)throw new Error('Timezone-free date requires an explicit UTC offset.');
    return new Date(t.getTime()-offset*60000).toISOString();
  }

  function number(value, name, positive) { if (typeof value !== 'number' || !isFinite(value) || value < 0 || (positive && value === 0)) throw new Error('Invalid '+name); return value; }
  function normalize(root, options) {
    inspect(root); options=options||{}; var df={km:1,mile:1.609344}[options.distanceUnit], vf={litre:1,'us-gallon':3.785411784,'imperial-gallon':4.54609}[options.volumeUnit];
    if (!df || !vf) throw new Error('Confirm source distance and volume units.');
    // Source metadata is exported as JSON. Count repeated graph edges too so
    // a small shared plist graph cannot expand into an enormous JSON tree.
    var metadataVisits=0,metadataBytes=0;
    function metadata(value,depth){
      if(++metadataVisits>100000||depth>64)throw new Error('Source metadata resource limit exceeded.');
      if(value instanceof Date)return value.toISOString();
      if(typeof value==='string'){metadataBytes+=value.length*2;if(metadataBytes>10*1024*1024)throw new Error('Source metadata size limit exceeded.');return value}
      if(!value||typeof value!=='object')return value;
      var copy=Array.isArray(value)?[]:Object.create(null);Object.keys(value).forEach(function(k){metadataBytes+=k.length*2;copy[k]=metadata(value[k],depth+1)});return copy;
    }
    var car=root.Car,c=String(car.Currency||'').toUpperCase(); if(!/^[A-Z]{3}$/.test(c))throw new Error('Vehicle currency is missing or invalid.');
    var vehicle={name:[car.Vendor,car.Model].filter(Boolean).join(' ')||'Imported vehicle',make:String(car.Vendor||''),model:String(car.Model||''),registration:'',preferredFuel:options.fuelId||null,currency:c,initialOdometer:typeof car.InitialOdometer==='number'&&car.InitialOdometer>0?car.InitialOdometer*df:0,source:{format:'jerrycan',vehicleKey:JSON.stringify([car.Vendor,car.Model,car.Year,car.Modification,car.VIN]),original:metadata(car,0)}};
    var fields={Year:'year',Modification:'modification',HorsePower:'horsepower',WheelDrive:'drive'};Object.keys(fields).forEach(function(k){if(car[k])vehicle[fields[k]]=car[k]});
    if(car.TankVolume>0)vehicle.tankCapacityLitres=car.TankVolume*vf;if(+car.EngineVolume>0)vehicle.engineDisplacementCc=+car.EngineVolume;
    if(car.VIN && !/^0+$/.test(car.VIN))vehicle.vin=car.VIN;
    var out=[],errors=[],warnings=[];
    if(car.Gearbox && /tronic/i.test(String(car.Modification)) && /manual/i.test(String(car.Gearbox)))warnings.push('Conflicting transmission metadata retained for review.');
    if(car.VIN && /^0+$/.test(car.VIN))warnings.push('Placeholder VIN kept only in source metadata.');
    root.Records.forEach(function(r,index){try{
      if(!r || typeof r!=='object')throw new Error('Invalid record');
      var date=iso(r.Date,options.stringDateOffsetMinutes),odometer=number(r.TotalDistance,'odometer',false),volume=number(r.Volume,'volume',true),total=number(r.PriceInDefaultCurr,'cost',false),unit=number(r.PricePerLiter,'unit price',false),rc=String(r.Currency||'').toUpperCase();
      if(!/^[A-Z]{3}$/.test(rc))throw new Error('Record currency missing or invalid');
      if(r.FullTank!==0 && r.FullTank!==1 && r.FullTank!==false && r.FullTank!==true)throw new Error('Invalid full-tank flag');
      var original=Object.assign({},r);original.Date=r.Date instanceof Date?r.Date.toISOString():r.Date;if(r.Date instanceof Date&&r.Date.plistSeconds!==undefined)original.DatePlistSeconds=r.Date.plistSeconds;
      var key=window.FuelLogData.sourceKey({date:original.DatePlistSeconds!==undefined?'plist:'+original.DatePlistSeconds:original.Date,odometer:odometer,litres:volume,totalCost:total,currency:rc});
      var f={date:date,odometer:odometer*df,litres:volume*vf,totalCost:total,pricePerLitre:rc===c?unit/vf:total/(volume*vf),currency:c,fullTank:r.FullTank===1||r.FullTank===true,fuelId:options.fuelId||null,station:'',notes:'',source:{format:'jerrycan',key:key,original:metadata(original,0),distanceUnit:options.distanceUnit,volumeUnit:options.volumeUnit,priceDerived:rc!==c}};
      if(rc!==c)warnings.push('Record '+(index+1)+': source unit price uses '+rc+'; comparable price derived in '+c+'.');
      else if(Math.abs(total-unit*volume)>Math.max(0.02,total*0.001))warnings.push('Record '+(index+1)+': cost differs from price × volume; both preserved.');
      if(typeof r.CityPercentage==='number' && isFinite(r.CityPercentage)&&r.CityPercentage>=0&&r.CityPercentage<=1)f.cityPercentage=r.CityPercentage;
      else if(r.CityPercentage!==undefined)warnings.push('Record '+(index+1)+': invalid urban fraction kept in source metadata.');
      var l=r.Location;if(l && typeof l==='object'){
        f.station=String(l.LocationName||'');f.stationLocation={name:f.station,address:String(l.Address||''),externalIds:{}};
        if(l.LocationID)f.stationLocation.externalIds.jerrycan=String(l.LocationID);
        if(typeof l.Latitude==='number'&&typeof l.Longitude==='number'&&isFinite(l.Latitude)&&isFinite(l.Longitude)&&Math.abs(l.Latitude)<=90&&Math.abs(l.Longitude)<=180){f.stationLocation.latitude=l.Latitude;f.stationLocation.longitude=l.Longitude}else warnings.push('Record '+(index+1)+': invalid coordinates kept in source metadata.');
      } out.push(f);
    }catch(e){if(/metadata (?:resource|size) limit/.test(e.message))throw e;errors.push({row:index+1,message:e.message})}});
    var cons=window.FuelLogData.intervals(out);warnings=warnings.concat(cons.warnings);
    var sorted=out.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date)});
    return {vehicle:vehicle,fillups:out,warnings:warnings,errors:errors,summary:{records:out.length,full:out.filter(function(f){return f.fullTank}).length,partial:out.filter(function(f){return !f.fullTank}).length,locations:out.filter(function(f){return f.stationLocation}).length,first:sorted.length?sorted[0].date:null,last:sorted.length?sorted[sorted.length-1].date:null,totals:window.FuelLogData.amountsByCurrency(out,[])}};
  }
  return {inspect:inspect,normalize:normalize};
})();
