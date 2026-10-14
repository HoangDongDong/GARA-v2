const key='garage_branch';
export function branchId(){return sessionStorage.getItem(key)||'';}
export function initializeBranches(user){
 const branches=user.BRANCHES||[],current=branchId();
 if(!branches.length){sessionStorage.removeItem(key);return;}
 const owner=['OWNER','ORG_ADMIN'].includes(user.ORGROLE);
 if(!(owner&&current==='all')&&!branches.some(b=>b.ID===current))sessionStorage.setItem(key,branches[0].ID);
}
export function prepareBranch(config){
 if(String(config.url).endsWith('/auth/me')){if(branchId())config.headers['X-Branch-Id']=branchId();return config;}
 if(/^\/?(?:auth|saas|branches)(?:\/|$)/.test(String(config.url).replace(/^\/api\//,'')))return config;
 const id=branchId();config.branchSnapshot=id;
 const reportOverride=String(config.url).startsWith('/reports/center/')&&config.reportBranchId!==undefined&&(!config.method||config.method.toLowerCase()==='get');
 const requested=reportOverride?config.reportBranchId:id;
 if(requested)config.headers['X-Branch-Id']=requested;return config;
}
export function checkBranch(response){if(response.config.branchSnapshot!==undefined&&response.config.branchSnapshot!==branchId())throw new Error('Chi nhánh đã thay đổi.');return response;}
export function selectBranch(id){sessionStorage.setItem(key,id);window.location.reload();}
