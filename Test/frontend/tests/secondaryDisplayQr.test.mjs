import test from 'node:test';import assert from 'node:assert/strict';
import {paymentQrUrl} from '../../../frontend/src/utils/secondaryDisplayQr.js';
test('display QR uses selected catalog bank/account and never a hardcoded beneficiary',()=>{
 const url=new URL(paymentQrUrl({bankBin:'970416',accountNo:'000 123456',accountName:'Chủ tài khoản'},25000,'GARA TEST'));
 assert.match(url.pathname,/970416-000123456-compact2\.png$/);assert.equal(url.searchParams.get('amount'),'25000');assert.equal(url.searchParams.get('accountName'),'Chủ tài khoản');assert.equal(url.searchParams.get('addInfo'),'GARA TEST');
 assert.equal(paymentQrUrl({bankBin:'',accountNo:'0917664444'}),'');assert.equal(paymentQrUrl({bankBin:'970416',accountNo:''}),'');
});
