const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sourcePath = process.env.NOUS_SOURCE || process.argv[2] || require('node:path').join(__dirname,'..','Nous_Source.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const findings = [];
let checks = 0;
const nodes = new Map();
const origin = new URL('https://example.test/start');
const timing = {getEntriesByType: () => [{name:'https://example.test/script.js',initiatorType:'script'}]};
function fixture(url, extra={}) {
  return {
    URL:url, baseURI:url, contentType:'text/html',readyState:'complete',title:'Fixture',
    querySelector: () => null,
    querySelectorAll: selector => extra[selector] || []
  };
}
function frame(url) {
  return {isConnected:true,dataset:{loading:'false'},contentWindow:{performance:timing},
    contentDocument:fixture(url),remove(){this.isConnected=false;}};
}
function fakeElement(tag, attrs={}, text=''){
  return {
    tagName:tag.toUpperCase(),textContent:text,content:attrs.content||'',rel:attrs.rel||'',alt:attrs.alt||'',title:attrs.title||'',currentSrc:attrs.currentSrc||'',
    getAttribute:key=>Object.prototype.hasOwnProperty.call(attrs,key)?attrs[key]:null,
    closest:parent=>attrs.parent===parent?{tagName:parent}:null
  };
}
const logs=[];
const state=vm.createContext({
  URL, AbortController, setTimeout, clearTimeout, location:origin, performance:timing,
  document:{...fixture(origin.href),createElement:()=>({content:fixture('')})},
  currentScan:null,inspectedFrame:null,peekFrame:null,pendingScan:null,pendingScanTimer:null,inspectionHistory:[],
  records:[],skipped:0,category:'All',limit:80,closed:false,previewEntry:null,
  sheet:{classList:{toggle(){}}},
  $:key=>{if(!nodes.has(key))nodes.set(key,{value:'',scrollTop:0});return nodes.get(key);},
  note:message=>logs.push(message),
  render(){state.$('#items').scrollTop=0;},
  fetch:async()=>{throw new Error('Blocked by browser');}
});
const run=code=>vm.runInContext(code,state);
run(source.slice(source.indexOf('  function scanDocument('),source.indexOf('  function domain(entry)')));
function check(name,condition){
  checks++;
  if(!condition) findings.push(name);
}
async function inspect(url, p) {
  state.peekFrame=p;
  state.previewEntry={value:url};
  await run('inspectPreview()');
}
(async()=>{
  run('collect()');
  const currentFrame=frame('https://example.test/next');
  await inspect('https://example.test/next',currentFrame);
  state.category='Images';state.$('#find').value='hero';state.limit=160;state.$('#items').scrollTop=137;state.$('#tabs').scrollLeft=29;
  const beforeHistory=state.inspectionHistory.length;
  await inspect('https://example.test/next',currentFrame);
  check('Repeat inspection preserves category and search', state.category==='Images'&&state.$('#find').value==='hero');
  check('Repeat inspection preserves pagination and scroll',state.limit===160&&state.$('#items').scrollTop===137&&state.$('#tabs').scrollLeft===29);
  check('Repeat inspection does not duplicate history',state.inspectionHistory.length===beforeHistory);
  check('A completed live inspection states completion', /scanned|complete/i.test(logs.at(-1))&&!/inspecting/i.test(logs.at(-1)));
  state.category='Images';state.limit=160;state.$('#items').scrollTop=129;
  await run('rescanCurrent()');
  check('Active rescan retains pagination and scroll',state.limit===160&&state.$('#items').scrollTop===129);
  const selected=state.currentScan;
  state.fetch=async()=>({ok:true,redirected:true,url:'https://redirected.test/actual',headers:{get:()=> 'text/html'},text:async()=>''});
  await inspect('https://other.test/requested',{isConnected:true,dataset:{loading:'false'},contentDocument:null});
  check('Unverifiable redirect does not replace active inspection',state.currentScan===selected);
  check('Unverifiable redirect reports a failure',/redirect|verif/i.test(logs.at(-1)));
  state.fetch=async()=>({ok:true,redirected:false,url:'https://other.test/direct',headers:{get:()=> 'text/html'},text:async()=>''});
  await inspect('https://other.test/direct',{isConnected:true,dataset:{loading:'false'},contentDocument:null});
  check('HTML fallback reports fetched HTML limitations',state.currentScan.mode==='html'&&/html/i.test(logs.at(-1)));
  state.fetch=async()=>({ok:true,redirected:false,url:'https://other.test/direct?query=one',headers:{get:()=> 'text/html'},text:async()=>''});
  await inspect('https://other.test/direct?query=one#part',{isConnected:true,dataset:{loading:'false'},contentDocument:null});
  check('Fragment survives a non-redirected fallback',state.currentScan.url==='https://other.test/direct?query=one#part');
  check('Displayed address includes query and fragment',state.$('#site').textContent==='other.test/direct?query=one#part');
  const beforeFailedRescan=state.currentScan;
  state.fetch=async()=>{throw new Error('Blocked by browser');};
  await run('rescanCurrent()');
  check('Failed rescan retains its prior active inspection',state.currentScan===beforeFailedRescan);
  check('Failed rescan updates the existing preview status',/unavailable|blocked/i.test(state.$('#previewfoot').textContent));
  state.fetch=async()=>({ok:true,redirected:false,url:'https://other.test/different',headers:{get:()=> 'text/html'},text:async()=>''});
  await inspect('https://other.test/requested',{isConnected:true,dataset:{loading:'false'},contentDocument:null});
  check('A different response URL is rejected even without a redirect flag',state.currentScan===beforeFailedRescan&&/verif/i.test(logs.at(-1)));
  const fallbackDoc=fixture('https://other.test/base-page',{
    'a[href],area[href]':[fakeElement('a',{href:'guide'},'Guide')]
  });
  fallbackDoc.querySelector=selector=>selector==='base[href]'?fakeElement('base',{href:'https://cdn.test/manual/'}):null;
  state.document.createElement=()=>({content:fallbackDoc});
  state.fetch=async()=>({ok:true,redirected:false,url:'https://other.test/base-page',headers:{get:()=> 'text/html'},text:async()=>'<base href="https://cdn.test/manual/">'});
  await inspect('https://other.test/base-page',{isConnected:true,dataset:{loading:'false'},contentDocument:null});
  check('HTML fallback resolves relative links against its base element',state.records.some(r=>r.value==='https://cdn.test/manual/guide'));
  const preload=fakeElement('link',{rel:'preload',as:'image',href:'/hero.jpg',imagesrcset:'/hero-400.jpg 400w, /hero-800.jpg 800w'});
  const map={
   'img[srcset],source[srcset]':[],
   'link[href],link[imagesrcset]':[preload]
  };
  const testDoc=fixture('https://example.test/page',map);
  state.testDoc=testDoc;
  const resources=run("scanDocument(testDoc,'https://example.test/page',null)").records;
  check('Responsive image preloads appear among images',resources.some(r=>r.type==='Images'&&r.value==='https://example.test/hero-800.jpg'));
  check('Preloaded image href appears among images',resources.some(r=>r.type==='Images'&&r.value==='https://example.test/hero.jpg'));
  const notPreload=fakeElement('link',{rel:'alternate',as:'image',href:'/other',imagesrcset:'/ignored.jpg 1x'});
  const strangeType=fakeElement('link',{rel:'preload',as:'constructor',href:'/strange'});
  state.testDoc=fixture('https://example.test/page',{
    'link[href],link[imagesrcset]':[notPreload,strangeType]
  });
  const invalidResources=run("scanDocument(testDoc,'https://example.test/page',null)").records;
  check('Non-image preload attributes do not create false images',!invalidResources.some(r=>r.value.endsWith('/ignored.jpg')));
  check('Unknown preload types do not create invalid categories',invalidResources.every(r=>typeof r.type==='string'));
  class CountSet extends Set{
    constructor(...a){super(...a);CountSet.last=this;}
  }
  const many=Array.from({length:12000},(_,i)=>fakeElement('a',{href:'/u/'+i},'Item'));
  const bigDoc=fixture('https://example.test/base',{'a[href],area[href]':many});
  state.bigDoc=bigDoc;state.Set=CountSet;
  const capped=run("scanDocument(bigDoc,'https://example.test/base',null)");
  check('Large scans keep 2,500 records and bounded deduplication state',capped.records.length===2500&&CountSet.last.size<=2500);
  const preserved=state.currentScan;
  let finishFetch, fireTimeout;
  const originalSetTimeout=state.setTimeout, originalClearTimeout=state.clearTimeout;
  state.fetch=()=>new Promise(resolve=>{finishFetch=resolve;});
  state.setTimeout=(callback)=>{fireTimeout=callback;return 123;};
  state.clearTimeout=()=>{};
  const pending=inspect('https://slow.test/page',{isConnected:true,dataset:{loading:'false'},contentDocument:null});
  await Promise.resolve();await Promise.resolve();
  fireTimeout();
  check('Timeout reenables controls and retains active results',state.pendingScan===null&&!state.$('#scan').disabled&&state.currentScan===preserved);
  check('Timeout reports failure',/timed out/i.test(logs.at(-1)));
  finishFetch({ok:true,redirected:false,url:'https://slow.test/page',headers:{get:()=> 'text/html'},text:async()=>''});
  await pending;
  check('Late results cannot overwrite the active inspection',state.currentScan===preserved);
  state.setTimeout=originalSetTimeout;state.clearTimeout=originalClearTimeout;
  let finishFirst;
  state.fetch=url=>url.includes('/first')?new Promise(resolve=>{finishFirst=resolve;}):Promise.resolve({ok:true,redirected:false,url,headers:{get:()=> 'text/html'},text:async()=>''});
  const first=inspect('https://rapid.test/first',{isConnected:true,dataset:{loading:'false'},contentDocument:null});
  await Promise.resolve();await Promise.resolve();
  await inspect('https://rapid.test/second',{isConnected:true,dataset:{loading:'false'},contentDocument:null});
  const afterSecond=state.currentScan;
  finishFirst({ok:true,redirected:false,url:'https://rapid.test/first',headers:{get:()=> 'text/html'},text:async()=>''});
  await first;
  check('A superseded rapid inspection cannot replace the newer result',state.currentScan===afterSecond&&state.currentScan.url==='https://rapid.test/second');
  const emptyFrame=frame('https://example.test/blank');emptyFrame.contentDocument.title='';
  emptyFrame.contentWindow.performance={getEntriesByType:()=>[]};
  await inspect('https://example.test/blank',emptyFrame);
  check('A live page with only default page details is described clearly',/page details only/i.test(logs.at(-1)));
  const emptyFallback=fixture('https://other.test/blank');emptyFallback.title='';
  state.document.createElement=()=>({content:emptyFallback});
  state.fetch=async()=>({ok:true,redirected:false,url:'https://other.test/blank',headers:{get:()=> 'text/html'},text:async()=>''});
  await inspect('https://other.test/blank',{isConnected:true,dataset:{loading:'false'},contentDocument:null});
  check('An empty HTML-only scan reports both limits',/page details only/i.test(logs.at(-1))&&/no live network/i.test(logs.at(-1)));
  console.log(JSON.stringify({source:sourcePath,checks,failures:findings},null,2));
  if(findings.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});

