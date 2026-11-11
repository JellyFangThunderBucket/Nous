const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
if(!process.env.NOUS_BASELINE){console.log('Personalize preservation skipped; set NOUS_BASELINE to the maintained 1.5 source.');process.exit(0);}
const base=path.dirname(process.env.NOUS_BASELINE),root=path.join(__dirname,'..');
const old=fs.readFileSync(process.env.NOUS_BASELINE,'utf8'),now=fs.readFileSync(path.join(root,'Nous_Source.js'),'utf8');
const block=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);assert(i>=0&&j>i,a);return s.slice(i,j);};
for(const [name,a,b] of [
 ['scanner','  function scanDocument(','  function livePage('],
 ['inspection/history','  function livePage(','  function domain(entry)'],
 ['layout','  function layout(){','  function manualCopy('],
 ['cleanup','  function closeNous(','  function layout('],
 ['Sources HTML/highlighting','  function showSources(){','  function setSourcesView('],
 ['safe preview fallback','  async function readablePreview(','  function closePreview('],
 ['gestures','  function resizeHandle(','  on($(\'#settingstab\')']
])assert.equal(block(now,a,b),block(old,a,b),name);
const markup=s=>block(s,'  root.innerHTML =','  document.documentElement.appendChild(host);');
assert.equal(markup(now).replace(/        <div class="settingsgroup">Customize controls<\/div>[\s\S]*?(?=        <div class="settingsbottom">)/,''),markup(old),'Only the requested Settings rows may change the UI template/CSS');
const preview=s=>block(s,'  function showPreview(','  function openExternal(');
assert.equal(preview(now).replace("$('#inspectpage').hidden=!preferences.visibility.inspectpage;","$('#inspectpage').hidden=false;"),preview(old),'Only contextual visibility changes Peek');
const defaults=s=>JSON.parse(vm.runInNewContext(block(s,'  const DEFAULTS=','  const PREF_KEY=')+'JSON.stringify(DEFAULTS)'));
const original=defaults(old),current=defaults(now);for(const [key,value] of Object.entries(original))assert.deepEqual(current[key],value,key);
assert(Object.values(current.visibility).every(v=>v===true));
for(const name of ['Nous_Brand.svg','Nous_Brand.png'])assert.deepEqual(fs.readFileSync(path.join(root,name)),fs.readFileSync(path.join(base,name)));
const embedded=/const (?:code|text)=("(?:\\.|[^"\\])*");/g;
assert.equal(fs.readFileSync(path.join(root,'Nous_Preview.html'),'utf8').replace(embedded,'[payload]'),fs.readFileSync(path.join(base,'Nous_Preview.html'),'utf8').replace(embedded,'[payload]'));
console.log('Passed Personalize preservation: original defaults, UI/CSS outside new Settings rows, scanner, inspection/history, cleanup, geometry, gestures, Sources, fallback, Trace/Peek, brands and outer demo.');
