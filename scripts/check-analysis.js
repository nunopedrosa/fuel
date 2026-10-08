'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const context=vm.createContext({window:{},Date,Intl,console});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/data.js'),'utf8'),context);
const file=path.join(__dirname,'../js/analysis.js');
assert.ok(fs.existsSync(file),'analysis module must provide period and profile semantics');
context.FuelLogData=context.window.FuelLogData;
vm.runInContext(fs.readFileSync(file,'utf8'),context);const A=context.window.FuelLogAnalysis;
const date=n=>'2026-01-'+String(n).padStart(2,'0')+'T00:00:00Z';
const fills=[
 {id:'a',date:date(1),odometer:0,litres:50,totalCost:90,fullTank:true,currency:'EUR',cityPercentage:1},
 {id:'b',date:date(2),odometer:100,litres:10,totalCost:20,fullTank:false,currency:'EUR',cityPercentage:0},
 {id:'c',date:date(3),odometer:400,litres:30,totalCost:45,fullTank:true,currency:'EUR',cityPercentage:1},
 {id:'d',date:date(4),odometer:1400,litres:50,totalCost:100,fullTank:true,currency:'USD'},
 {id:'e',date:date(5),odometer:1500,litres:10,totalCost:20,fullTank:false,currency:'EUR'}];
const before=JSON.stringify(fills),m=A.prepare(fills,[]),all=A.select(m,m.min,m.max);
assert.equal(all.intervals.length,2);assert.equal(all.summary.distance,1400);assert.equal(all.summary.consumption,90/1400*100);
assert.equal(all.intervals[0].urban,0.75,'profile weights segment distance and excludes starting full fill');
assert.equal(all.profileCoverage,400/1400,'missing profile is unknown');assert.equal(all.scatter.length,1);
assert.equal(all.summary.money.EUR.cost,175);assert.equal(all.summary.money.EUR.price,175/100);assert.equal(all.summary.money.USD.price,2);
let s=A.select(m,+new Date(date(2)),+new Date(date(4)));
assert.equal(s.intervals.length,1);assert.equal(s.crossing,1);assert.equal(s.summary.consumption,5);assert.equal(s.purchases.length,3);
assert.equal(JSON.stringify(fills),before,'analysis never mutates source data');
const zero=A.prepare(fills.map(f=>Object.assign({},f,{cityPercentage:0})),[]);assert.equal(A.select(zero,zero.min,zero.max).scatter.length,2);assert.equal(zero.intervals[0].urban,0);
const broken=A.prepare(fills.map((f,i)=>Object.assign({},f,i===1?{odometer:500}:{})),[]);assert.equal(A.select(broken,broken.min,broken.max).scatter.length,0,'nonpositive segment distances invalidate interval urban profile');
const same=A.prepare([fills[0],Object.assign({},fills[1],{date:date(1)})],[]);assert.ok(A.windowFor(same,1,50).end>=A.windowFor(same,1,50).start);
const empty=A.prepare([],[]);assert.equal(A.select(empty,0,1).summary.consumption,null);assert.equal(A.windowFor(empty,30,0).start,0);
const many=Array.from({length:10000},(_,i)=>({t:i,y:i===4555?10000:i===7777?-10000:i%3}));const sampled=A.sample(many,160);assert.ok(sampled.length<=160);assert.equal(sampled[0].t,0);assert.equal(sampled[sampled.length-1].t,9999);assert.ok(sampled.some(p=>p.y===10000));assert.ok(sampled.some(p=>p.y===-10000));
const invalid=A.prepare([{date:'bad',litres:5,totalCost:10},{date:date(1),litres:10,totalCost:null,currency:'EUR'}],[]);assert.equal(invalid.fills.length,1);assert.equal(A.select(invalid,invalid.min,invalid.max).summary.money.EUR.price,null,'missing amount is not zero');
assert.equal(A.windowFor(m,2,0).start,m.min);assert.equal(A.windowFor(m,2,100).end,m.max);
const outlier=A.prepare([fills[0],Object.assign({},fills[2],{odometer:1})],[]);assert.ok(outlier.intervals[0].warnings.length);assert.equal(A.select(outlier,outlier.min,outlier.max).intervals.length,1);
const months=A.monthly(m.fills,'EUR',m.min,m.max);assert.equal(months.length,1);assert.equal(months[0].cost,175);assert.equal(months[0].litres,100);
const sparse=[];for(let i=0;i<1000;i++)sparse.push({date:new Date(Date.UTC(1900,0+i,1)).toISOString(),litres:10,totalCost:20,currency:'EUR'});const span=A.prepare(sparse,[]);assert.ok(A.monthly(span.fills,'EUR',span.min,span.max).length<=60);
const trend=A.trend(m.intervals);assert.equal(trend[1].y,90/1400*100,'rolling trend weights distance');
const unusual=A.prepare([fills[0],Object.assign({},fills[2],{totalCost:0})],[]);assert.equal(A.select(unusual,unusual.min,unusual.max).summary.money.EUR.cost,90,'recorded zero is valid');
const legacyVehicle=[{id:'usd',currency:'USD'}],legacyFills=[{vehicleId:'usd',date:date(1),litres:20,totalCost:40},{vehicleId:'usd',date:date(2),litres:10,totalCost:20}];
assert.equal(A.monthly(legacyFills,'USD',+new Date(date(1)),+new Date(date(2)),legacyVehicle).length,1,'monthly purchases must use vehicle currency fallback');assert.equal(A.monthly(legacyFills,'EUR',+new Date(date(1)),+new Date(date(2)),legacyVehicle).length,0);
const repeated=A.prepare([{date:date(1),odometer:0,litres:20,fullTank:true},{date:date(2),odometer:100,litres:10,fullTank:false,cityPercentage:0.5},{date:date(3),odometer:100,litres:5,fullTank:false,cityPercentage:0.5},{date:date(4),odometer:300,litres:15,fullTank:true,cityPercentage:0.5}],[]);
assert.equal(A.select(repeated,repeated.min,repeated.max).profileCoverage,1,'zero-distance segment must not erase known positive-distance coverage');assert.equal(A.select(repeated,repeated.min,repeated.max).scatter.length,0,'questionable zero segment is omitted from urban scatter');
console.log('analysis intervals, weights, boundaries, currencies, profiles and bounded rendering passed');
