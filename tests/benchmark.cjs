const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
if(!process.env.NOUS_BASELINE){
  console.log('Benchmark skipped; set NOUS_BASELINE to the Nous 1.3 source path.');
  process.exit(0);
}
const baseline=fs.readFileSync(process.env.NOUS_BASELINE,'utf8');
const updated=fs.readFileSync(path.join(__dirname,'..','Nous_Source.js'),'utf8');
function makeScanner(source,TrackedSet=Set){
  const code=source.slice(source.indexOf('  function scanDocument('),source.indexOf('  function livePage('));
  const context=vm.createContext({URL,Set:TrackedSet});vm.runInContext(code,context);return context.scanDocument;
}
function run(size){
  const links=Array.from({length:size},(_,i)=>({
    tagName:'A',textContent:'Resource '+i,getAttribute:key=>key==='href'?'/resource/'+i:null
  }));
  const doc={baseURI:'https://example.test/base/',URL:'https://example.test/',title:'Fixture',
    querySelector:()=>null,querySelectorAll:selector=>selector==='a[href],area[href]'?links:[]};
  const scanners=[makeScanner(baseline),makeScanner(updated)];
  for(let k=0;k<20;k++)for(const scan of scanners)scan(doc,doc.URL,null);
  const measurements=[[],[]];
  for(let k=0;k<61;k++){
    const order=k%2?[1,0]:[0,1];
    for(const i of order){
      const start=performance.now();scanners[i](doc,doc.URL,null);
      measurements[i].push(performance.now()-start);
    }
  }
  const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
  const cold=[[],[]];
  for(let k=0;k<21;k++){
    const fresh=[makeScanner(baseline),makeScanner(updated)];
    for(const i of (k%2?[1,0]:[0,1])){
      const start=performance.now();fresh[i](doc,doc.URL,null);
      cold[i].push(performance.now()-start);
    }
  }
  const setSizes=[];
  for(const version of [baseline,updated]){
    let peak=0;
    class TrackedSet extends Set {add(value){super.add(value);peak=Math.max(peak,this.size);return this;}}
    makeScanner(version,TrackedSet)(doc,doc.URL,null);setSizes.push(peak);
  }
  return {entries:size,baselineColdMedianMs:median(cold[0]),updatedColdMedianMs:median(cold[1]),baselineWarmMedianMs:median(measurements[0]),updatedWarmMedianMs:median(measurements[1]),baselinePeakSetEntries:setSizes[0],updatedPeakSetEntries:setSizes[1]};
}
console.log(JSON.stringify({method:'Synthetic Node document; 21 first-call samples and 61 alternating warmed samples (20 warmups), medians; excludes UI startup, browser layout, and iPhone timings',results:[run(1000),run(12000)]},null,2));

