export function paymentQrUrl(bank,amount=0,memo=''){
  const number=String(bank.accountNo||'').replace(/\s/g,'');
  if(!/^\d{6}$/.test(bank.bankBin||'')||!/^\d{6,19}$/.test(number))return '';
  return 'https://img.vietqr.io/image/'+bank.bankBin+'-'+number+'-compact2.png?amount='+Math.max(0,Math.round(Number(amount)||0))+'&addInfo='+encodeURIComponent(memo)+'&accountName='+encodeURIComponent(bank.accountName||'');
}
