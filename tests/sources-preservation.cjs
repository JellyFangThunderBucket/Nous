const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
if(!process.env.NOUS_BASELINE){console.log('Sources preservation skipped; set NOUS_BASELINE to the maintained 1.5 source.');process.exit(0);}
const currentRoot=path.join(__dirname,'..'),baselineRoot=path.dirname(process.env.NOUS_BASELINE);
const old=fs.readFileSync(process.env.NOUS_BASELINE,'utf8'),now=fs.readFileSync(path.join(currentRoot,'Nous_Source.js'),'utf8');
function block(s,a,b){const start=s.indexOf(a),end=s.indexOf(b,start);assert(start>=0&&end>start,a);return s.slice(start,end);}
for(const [name,a,b] of [
 ['scanner','  function scanDocument(','  function livePage('],
 ['inspection/history','  function livePage(','  function domain(entry)'],
 ['layout','  function layout(){','  function manualCopy('],
 ['gestures','  function resizeHandle(','  on($(\'#settingstab\')']
])assert.equal(block(now,a,b),block(old,a,b),name);
const oldcss=block(old,'<style>','  </style>');
const newcss=block(now,'<style>','  </style>').replace(/    \.sourcespanel\{[\s\S]*?(?=    \.settingspanel\{)/,'');
assert.equal(newcss,oldcss,'Existing CSS must remain unchanged outside the added Sources rules');
for(const name of ['Nous_Brand.svg','Nous_Brand.png'])assert.deepEqual(fs.readFileSync(path.join(currentRoot,name)),fs.readFileSync(path.join(baselineRoot,name)));
const embedded=/const (?:code|text)=("(?:\\.|[^"\\])*");/g;
assert.equal(fs.readFileSync(path.join(currentRoot,'Nous_Preview.html'),'utf8').replace(embedded,'[payload]'),fs.readFileSync(path.join(baselineRoot,'Nous_Preview.html'),'utf8').replace(embedded,'[payload]'));
console.log('Passed unchanged scanner, inspection/history, layout, gestures, pre-existing CSS, brands and outer preview.');
