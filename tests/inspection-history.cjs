const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(process.env.NOUS_SOURCE || require('node:path').join(__dirname,'..','Nous_Source.js'),'utf8');
const nodes=new Map();
const location=new URL('https://test.example/start');
const timing={getEntriesByType:()=>[{name:'https://test.example/loaded.js',initiatorType:'script'}]};
function docAt(url,title){
  return {URL:url,baseURI:url,contentType:'text/html',readyState:'complete',title,
    querySelector:()=>null,
    querySelectorAll:selector=>selector==='a[href],area[href]'?[{
      tagName:'A',textContent:'Relative link',getAttribute:key=>key==='href'?'next':null
    }]:[]};
}
function frameAt(url){
  return {isConnected:true,dataset:{loading:'false'},contentWindow:{performance:timing},
    contentDocument:docAt(url,'Preview'),remove(){this.isConnected=false;}};
}
const state=vm.createContext({
  URL,AbortController,setTimeout,clearTimeout,location,performance:timing,
  document:{...docAt(location.href,'Host'),createElement:()=>({content:docAt('','Fetched')})},
  currentScan:null,inspectedFrame:null,peekFrame:null,pendingScan:null,pendingScanTimer:null,inspectionHistory:[],
  records:[],skipped:0,category:'All',limit:80,closed:false,previewEntry:null,
  sheet:{classList:{toggle(){}}},
  $:key=>{if(!nodes.has(key))nodes.set(key,{value:'',scrollTop:0});return nodes.get(key);},
  note(){},render(){},fetch:async()=>{throw Error('Browser blocked access');}
});
const run=code=>vm.runInContext(code,state);
run(source.slice(source.indexOf('  function scanDocument('),source.indexOf('  function domain(entry)')));
run('collect()');
const inspect=async (url,frame)=>{state.peekFrame=frame;state.previewEntry={value:url};await run('inspectPreview()');};
(async()=>{
  state.category='Links';state.$('#find').value='relative';state.$('#items').scrollTop=37;
  const a=frameAt('https://test.example/first/page');
  await inspect('https://test.example/requested',a);
  assert.equal(state.currentScan.url,a.contentDocument.URL);
  assert.equal(state.category,'All');
  assert(state.records.some(r=>r.value==='https://test.example/first/next'));
  assert(state.records.some(r=>r.type==='Network'));
  assert.equal(state.inspectionHistory.length,1);
  a.contentWindow.performance={getEntriesByType:()=>[{name:'https://test.example/new.js'}]};
  await run('rescanCurrent()');
  assert(state.records.some(r=>r.value==='https://test.example/new.js'));
  assert.equal(state.inspectionHistory.length,1);
  await inspect('https://blocked.example/',{isConnected:true,dataset:{loading:'false'},contentDocument:null});
  assert.equal(state.currentScan.url,a.contentDocument.URL);
  assert.equal(state.inspectionHistory.length,1);
  state.fetch=async()=>({ok:true,url:'https://cors.example/page',headers:{get:()=> 'text/html; charset=utf-8'},text:async()=>'<title>Fetched</title>'});
  await inspect('https://cors.example/page',{isConnected:true,dataset:{loading:'false'},contentDocument:null});
  assert.equal(state.currentScan.mode,'html');
  assert(state.records.some(r=>r.value==='https://cors.example/next'));
  assert(!state.records.some(r=>r.type==='Network'));
  assert(!a.isConnected);
  run('backInspection()');
  assert.equal(state.currentScan.url,a.contentDocument.URL);
  run('backInspection()');
  assert.equal(state.currentScan.url,location.href);
  assert.equal(state.category,'Links');
  assert.equal(state.$('#find').value,'relative');
  assert.equal(state.$('#items').scrollTop,37);
  for(let i=0;i<7;i++){
    const url='https://test.example/page-'+i;
    await inspect(url,frameAt(url));
  }
  assert.equal(state.inspectionHistory.length,5);
  const last=state.currentScan;
  let respond;
  state.fetch=()=>new Promise(resolve=>{respond=resolve;});
  const pending=inspect('https://slow.example/',{isConnected:true,dataset:{loading:'false'},contentDocument:null});
  await Promise.resolve();
  run('cancelInspection()');
  respond({ok:true,url:'https://slow.example/',headers:{get:()=> 'text/html'},text:async()=>''});
  await pending;
  assert.equal(state.currentScan,last);
  console.log('Passed live inspection, redirect and URL resolution, rescan, blocked access, HTML fallback, Back state, five-page history, and cancelled request isolation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
