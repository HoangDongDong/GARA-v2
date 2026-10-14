import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRepairPrintDocument as resolve} from '../../../frontend/src/utils/repairPrintDocument.js';
const never=()=>assert.fail('Unexpected mutation or fetch');
test('completed repair prints the linked invoice ID rather than the repair ID',async()=>{
 assert.deepEqual(await resolve({state:'4',repairId:'repair',invoiceId:'invoice'}, {loadOrder:never,createQuote:never}),{type:'MauHoaDonSuaChua',id:'invoice'});
});
test('completed repair reloads its own invoice when cached data is absent',async()=>{
 assert.deepEqual(await resolve({state:4,repairId:'repair'},{loadOrder:async id=>{assert.equal(id,'repair');return {invoice:{ID:'fresh-invoice'}};},createQuote:never}),{type:'MauHoaDonSuaChua',id:'fresh-invoice'});
 await assert.rejects(()=>resolve({state:4,repairId:'repair'},{loadOrder:async()=>({invoice:null}),createQuote:never}),/chưa có hóa đơn/);
});
test('earlier workflow stages keep quote, repair-order and provisional document behavior',async()=>{
 for(const state of [0,1])assert.deepEqual(await resolve({state,repairId:'repair',quoteId:'quote'},{loadOrder:never,createQuote:never}),{type:'MauBaoGia',id:'quote'});
 assert.deepEqual(await resolve({state:2,repairId:'repair'},{loadOrder:never,createQuote:never}),{type:'MauPhieuSuaChua',id:'repair'});
 assert.deepEqual(await resolve({state:3,repairId:'repair'},{loadOrder:never,createQuote:never}),{type:'MauPhieuTamTinh',id:'repair'});
 assert.deepEqual(await resolve({state:0,repairId:'repair'},{loadOrder:never,createQuote:async id=>{assert.equal(id,'repair');return {quoteId:'new-quote'};}}),{type:'MauBaoGia',id:'new-quote'});
});
