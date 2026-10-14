const scope=require('./branchScope');
const mapping=require('./branchTables.json');
function table(name){
 const key=String(name).toUpperCase();
 if(!/^[A-Z][A-Z0-9_]*$/.test(key))throw Error('Invalid SQL table identifier');
 return scope.enabled()&&!scope.current()?.maintenance?(mapping[key]||key):key;
}
// Firebird 2.5 cannot lock a view. Lock the base row only when its ID is
// visible in the scoped view; the request never supplies the identifier.
function lockPredicate(name){const base=String(name).toUpperCase();const view=table(base);return view===base?'':`ID IN (SELECT ID FROM ${view}) AND `;}
module.exports={table,lockPredicate};
