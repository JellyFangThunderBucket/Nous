const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
if(!process.env.NOUS_BASELINE){console.log('Trace preservation skipped; set NOUS_BASELINE to the stable 1.4 source.');process.exit(0);}
const old=fs.readFileSync(process.env.NOUS_BASELINE,'utf8');
const current=fs.readFileSync(path.join(__dirname,'..','Nous_Source.js'),'utf8');
for(const [name,start,end] of [
 ['scanner','  function scanDocument(','  function livePage('],
 ['inspection, history and filtering','  function livePage(','  function showPreview('],
 ['cleanup','  function closeNous(','  function layout('],
 ['gestures','  function openExternal(','  on($(\'#settingstab\')']
]){
 const block=s=>{const a=s.indexOf(start),b=s.indexOf(end,a);assert(a>=0&&b>a,name);return s.slice(a,b);};
 assert.equal(block(current),block(old),name+' must remain unchanged');
}
console.log('Passed byte-identical 1.4 scanner, inspection/history/filtering, cleanup and gestures.');
