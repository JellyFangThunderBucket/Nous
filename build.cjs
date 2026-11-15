const fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/Nous_Source.js','utf8');
const bookmarklet='javascript:'+source.split('\n').map(line=>line.trim()).join(' ').trim();
fs.writeFileSync(__dirname+'/Nous_Bookmarklet.txt',bookmarklet+'\n');
let html=fs.readFileSync(__dirname+'/Nous_Preview.html','utf8');
for(const [name,value] of [['code',source],['text',bookmarklet]]){
  const pattern=new RegExp('const '+name+'=("(?:\\\\.|[^"\\\\])*");');
  if(!pattern.test(html))throw Error('Missing preview payload: '+name);
  html=html.replace(pattern,()=> 'const '+name+'='+JSON.stringify(value)+';');
}
fs.writeFileSync(__dirname+'/Nous_Preview.html',html);
