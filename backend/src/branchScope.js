const {AsyncLocalStorage}=require('async_hooks');
const scopeStorage=new AsyncLocalStorage();
const enabled=()=>process.env.MULTIBRANCH_ENABLED==='true';
const current=()=>scopeStorage.getStore();
const fail=(message,status=403)=>Object.assign(Error(message),{status,statusCode:status});
const validId=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
function run(scope,task){
 const readIds=[...new Set(scope.readIds||[])],writeIds=[...new Set(scope.writeIds||[])];
 if(readIds.some(id=>!validId(id))||writeIds.some(id=>!readIds.includes(id))||scope.branchId&&!writeIds.includes(scope.branchId)&&!readIds.includes(scope.branchId))throw fail('Ngữ cảnh chi nhánh không hợp lệ.');
 return scopeStorage.run(Object.freeze({...scope,readIds:Object.freeze(readIds),writeIds:Object.freeze(writeIds)}),task);
}
function maintenance(task){return scopeStorage.run(Object.freeze({maintenance:true,readIds:[],writeIds:[]}),task);}
function selected(){const scope=current();if(!scope?.branchId)throw fail('Chọn một chi nhánh để thực hiện giao dịch.',400);return scope.branchId;}
function owner(user){return user?.ORGROLE==='OWNER'||user?.ORGROLE==='ORG_ADMIN';}
module.exports={enabled,current,run,maintenance,selected,owner,validId,fail};
