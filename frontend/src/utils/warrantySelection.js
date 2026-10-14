const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function key(storage,session){const user=JSON.parse(storage.getItem('garage_user')||'{}');return `garage_warranty_job:${user.TENANT?.id||'legacy'}:${user.ID||user.USERNAME||'anonymous'}:${session.getItem('garage_branch')||'legacy'}`;}
export function rememberWarrantyJob(storage,session,id){try{storage.setItem(key(storage,session),id||'new');}catch{}}
export function readWarrantyJob(storage,session){try{return storage.getItem(key(storage,session))||'';}catch{return '';}}
export function restoreWarrantyJob(jobs,requested,remembered){
 if(requested==='new'||!requested&&remembered==='new')return '';
 if(uuid.test(requested||''))return requested;
 if(jobs.some(job=>job.ID===remembered))return remembered;
 return jobs.find(job=>Number(job.TRANGTHAI)<4)?.ID||'';
}

