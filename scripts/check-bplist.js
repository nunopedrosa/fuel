'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const window={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/import/bplist.js'),'utf8'),{window,ArrayBuffer,Uint8Array,DataView,Date});
function read(name){const b=fs.readFileSync(path.join(__dirname,'fixtures/jerrycan',name));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}
const decode=window.FuelLogBplist.decode;
const d=decode(read('types.bplist'));
assert.equal(d.name,'São João');assert.equal(d.values[2],-1);assert.equal(d.values[4],1.25);
assert.equal(d.date.toISOString(),'2026-10-07T16:18:33.497Z');assert.equal(d.uid.uid,7);assert.deepEqual(Array.from(d.bytes.data),[97,98,99]);
const original=new Uint8Array(read('types.bplist'));
assert.throws(()=>decode(original.slice(0,15).buffer));
const bad=original.slice();bad[bad.length-1]=255;assert.throws(()=>decode(bad.buffer));
assert.throws(()=>decode(new ArrayBuffer(5*1024*1024+1)));
// One array referring to itself. Trailer: one object, root 0, table offset 10.
const cyclic=Uint8Array.from([98,112,108,105,115,116,48,48,0xa1,0,8,...new Array(32).fill(0)]);
cyclic[cyclic.length-26]=1;cyclic[cyclic.length-25]=1;cyclic[cyclic.length-17]=1;cyclic[cyclic.length-1]=10;
assert.throws(()=>decode(cyclic.buffer),/cycl/i);
// Duplicate offsets must not reallocate the same payload under distinct IDs.
const amplified=Uint8Array.from([98,112,108,105,115,116,48,48,0xa2,1,2,0x43,1,2,3,8,11,11,...new Array(32).fill(0)]);
amplified[amplified.length-26]=1;amplified[amplified.length-25]=1;amplified[amplified.length-17]=3;amplified[amplified.length-1]=15;
assert.throws(()=>decode(amplified.buffer),/offset|overlap/i);
assert.equal(d.date.plistSeconds,813082713.497745,'preserve source date precision');
// Aggregate allocation must be bounded, even when every object is small.
function uint64(n){const a=new Array(8).fill(0);for(let i=7;i>=0;i--){a[i]=n%256;n=Math.floor(n/256)}return a}
const objects=66,n=65535,parts=[Buffer.from('bplist00')],offsets=[];let position=8;
function append(b){offsets.push(position);parts.push(b);position+=b.length}
append(Buffer.from([0xaf,0x10,64,...Array.from({length:64},(_,i)=>i+1)]));
for(let i=0;i<64;i++){const a=Buffer.alloc(n+4,65);a[0]=0xaf;a[1]=0x11;a[2]=255;a[3]=255;append(a)}
append(Buffer.from([0x00]));const table=position;
const offsetBytes=Buffer.alloc(objects*4);offsets.forEach((o,i)=>offsetBytes.writeUInt32BE(o,i*4));parts.push(offsetBytes);
parts.push(Buffer.from([...new Array(6).fill(0),4,1,...uint64(objects),...uint64(0),...uint64(table)]));
const allocation=Buffer.concat(parts);assert.throws(()=>decode(allocation.buffer.slice(allocation.byteOffset,allocation.byteOffset+allocation.byteLength)),/resource|allocation/i);
console.log('binary plist checks passed');
