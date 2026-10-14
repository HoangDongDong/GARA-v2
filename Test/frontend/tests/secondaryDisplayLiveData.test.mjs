import test from 'node:test';import assert from 'node:assert/strict';
import {workshopCars,configuredBanners} from '../../../frontend/src/utils/secondaryDisplayLiveData.js';
test('empty workflow does not create demo cars, staff, tasks or progress',()=>{
 assert.deepEqual(workshopCars([]),[]);assert.deepEqual(workshopCars([{ID:'profile',TRANGTHAI:0}]),[]);
});
test('real workflow uses actual employee names/items and preserves reception state zero',()=>{
 const rows=workshopCars([{TLENHSUACHUAID:'r',TRANGTHAI:0,BIENSO:'TEST-1',TEN_KH:'Owner',TEN_KTV:'Technician',ITEMS:[{TEN_HANG_MUC:'Actual task'}]},{TLENHSUACHUAID:'done',TRANGTHAI:4}],[{STT_WORKFLOW:0,TEN:'Tiếp nhận'}]);
 assert.equal(rows.length,1);assert.equal(rows[0].TRANGTHAI,0);assert.equal(rows[0].STATUS_LABEL,'Tiếp nhận');assert.equal(rows[0].KTV,'Technician');assert.equal(rows[0].TASKS[0].name,'Actual task');assert.equal(rows[0].TASKS[0].status,'untracked');assert.equal(rows[0].CO_VAN,'Chưa phân công');assert.equal(rows[0].TIENDO,undefined);
});
test('saved demo banners are ignored while store uploaded content stays',()=>{
 const uploaded={id:'store-image',url:'data:image/jpeg;base64,AA==',title:'Store banner'};
 assert.deepEqual(configuredBanners([{url:'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=900'},uploaded]),[uploaded]);
});
