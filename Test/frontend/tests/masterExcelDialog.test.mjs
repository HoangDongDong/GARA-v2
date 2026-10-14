import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {prepareRows} from '../../../frontend/src/utils/masterExcel.js';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url));
const React=require('react'),{renderToString}=require('react-dom/server'),esbuild=require('esbuild');
test('import validation handles the initial empty metadata and failed loading',()=>{
 assert.deepEqual(prepareRows([],[],{},[]),[]);
 assert.match(prepareRows([{id:1,data:{NAME:'A'}}],[],{},[])[0].errors[0],/danh mục/);
});
test('opening customer and vehicle import dialogs renders loading without crashing React',async()=>{
 // SSR tests the real component's first render. The portal is flattened only
 // for the renderer; effects and network requests do not run during SSR.
 const built=await esbuild.build({entryPoints:[fileURLToPath(new URL('../../../frontend/src/components/MasterExcelImport.jsx',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime','exceljs'],loader:{'.css':'empty'},plugins:[{name:'render-fixtures',setup(build){
  build.onResolve({filter:/^(react-dom|\.\.\/services|\.\.\/utils\/permissions)$/},args=>({path:args.path,namespace:'fixture'}));
  build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='react-dom'?'export const createPortal = element => element;':args.path==='../services'?'export const customers={},vehicles={},suppliers={},masterData={};':'export const can=()=>true;',loader:'js'}));
 }}]});
 const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,module,module.exports);
 const previous=globalThis.document;globalThis.document={body:{}};
 try{for(const kind of ['customers','vehicles','suppliers']){
  const html=renderToString(React.createElement(module.exports.default,{kind,onClose:()=>{},onImported:async()=>{}}));
  assert.match(html,/Đang tải(?: dữ liệu)? danh mục/);assert.match(html,/role="dialog"/);assert.match(html,/aria-label="Đóng(?: cửa sổ)?"/);
 }}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
