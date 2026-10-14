import test from 'node:test';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url));
test('display manager renders its Firebird loading state without removed browser-storage helpers',async()=>{
  const esbuild=require('esbuild'),React=require('react'),{renderToString}=require('react-dom/server'),{MemoryRouter}=require('react-router-dom');
  const result=await esbuild.build({entryPoints:[new URL('../../../frontend/src/pages/ManHinhPhuPage.jsx',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.css':'empty'},external:['react','react-router-dom'],logLevel:'silent',plugins:[{name:'stub-browser-api',setup(build){build.onResolve({filter:/^\.\.\/api\.js$/},()=>({path:'api',namespace:'test-api'}));build.onLoad({filter:/.*/,namespace:'test-api'},()=>({contents:'export default {get:async()=>({data:{data:{}}}),put:async()=>({data:{data:{}}})};',loader:'js'}));}}]});
  const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
  const html=renderToString(React.createElement(MemoryRouter,null,React.createElement(module.exports.default)));
  assert.match(html,/Đang tải cấu hình Firebird/);
  // Also render the form after Firebird has loaded, without executing network effects.
  const original=React.useState;let firstBoolean=true;
  React.useState=initial=>{if(initial===false&&firstBoolean){firstBoolean=false;return original(true);}return original(initial);};
  try{
    const ready=renderToString(React.createElement(MemoryRouter,null,React.createElement(module.exports.default)));
    assert.match(ready,/Lưu cấu hình/);assert.match(ready,/Các trang trình chiếu/);
  }finally{React.useState=original;}
  for(const screen of ['1','2','3']){
    const display=renderToString(React.createElement(MemoryRouter,{initialEntries:['/display?screen='+screen]},React.createElement(module.exports.SecondaryDisplayScreen)));
    assert.doesNotMatch(display,/Mercedes-Benz|30E-922|Combo Bảo Dưỡng 30 Điểm|850\.000|Xem trước mẫu hóa đơn|photo-1617788138017/);
    if(screen==='1'){assert.match(display,/chưa có banner/);assert.match(display,/0 banner/);assert.doesNotMatch(display,/1 \/ 0/);}
    if(screen==='3')assert.match(display,/Chưa có xe đang sửa chữa/);
  }
  for(const pageIndex of [0,1]){
    let firstNumber=true;
    React.useState=initial=>{
      if(typeof initial==='function'){
        const value=initial();
        if(value?.['1']?.pages){value['1'].pages=[{...value['1'].pages[0],name:'Trang có ảnh',banners:[1,2,3].map(id=>({id:'store-'+id,url:'data:image/png;base64,AA==',title:'Ảnh thật '+id}))},{...value['1'].pages[1],name:'Trang chưa thêm ảnh',banners:[]}];}
        return original(value);
      }
      if(initial===0&&firstNumber){firstNumber=false;return original(pageIndex);}
      return original(initial);
    };
    try{
      const display=renderToString(React.createElement(MemoryRouter,{initialEntries:['/display?screen=1']},React.createElement(module.exports.SecondaryDisplayScreen)));
      if(pageIndex===0){assert.match(display,/Ảnh thật 1/);assert.match(display,/1 \/ 3/);}
      else{assert.match(display,/Trang chưa thêm ảnh chưa có banner/);assert.match(display,/0 banner/);assert.doesNotMatch(display,/1 \/ 0/);}
    }finally{React.useState=original;}
  }
});
