const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
if(!process.env.NOUS_BASELINE){console.log('Reveal benchmark skipped; set NOUS_BASELINE to the source before Reveal.');process.exit(0);}
const baseline=fs.readFileSync(process.env.NOUS_BASELINE,'utf8'),source=fs.readFileSync(path.join(__dirname,'..','Nous_Source.js'),'utf8');
const scanner=s=>s.slice(s.indexOf('  function scanDocument('),s.indexOf('  function livePage('));assert.equal(scanner(source),scanner(baseline));
const flatten=s=>'javascript:'+s.split('\n').map(line=>line.trim()).join(' ').trim();
const sizes=[baseline,source].map(s=>({bookmarkletBytes:Buffer.byteLength(flatten(s)),gzipBytes:zlib.gzipSync(flatten(s)).length}));
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const html='<!doctype html><link rel="icon" href="data:,"><title>Benchmark</title>'+Array.from({length:1000},(_,i)=>'<a href="/resource/'+i+'">Resource '+i+'</a>').join('');
  await page.route('https://reveal.test/**',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('https://reveal.test/');
  const launch=[[],[]];
  for(let round=0;round<26;round++)for(const index of round%2?[1,0]:[0,1]){
   const elapsed=await page.evaluate(code=>{
    document.querySelector('#nous-bookmarklet')?.dispatchEvent(new Event('nous:close'));
    const start=performance.now();(0,eval)(code);document.querySelector('#nous-bookmarklet').getBoundingClientRect();return performance.now()-start;
   },[baseline,source][index]);
   if(round>=5)launch[index].push(elapsed);
  }
  await page.evaluate(()=>document.querySelector('#nous-bookmarklet').dispatchEvent(new Event('nous:close')));
  const findCode=source.slice(source.indexOf('  function revealReferences('),source.indexOf('  function revealGeometry('));
  const matching=[];
  for(const count of [1000,20000]){
   const samples=await page.evaluate(({code,count})=>{
    document.body.innerHTML=Array.from({length:count},(_,i)=>'<div data-id="'+i+'"></div>').join('')+'<a href="/target">Target</a>';
    const find=new Function('host',code+';return findRevealMatches;')({});
    const times=[];let last;
    for(let round=0;round<26;round++){const start=performance.now();last=find(document,'https://reveal.test/target');const elapsed=performance.now()-start;if(round>=5)times.push(elapsed);}
    return {times,matched:last.matches.length,limited:last.limited};
   },{code:findCode,count});
   matching.push({fixtureElements:count,medianMs:median(samples.times),matches:samples.matched,limited:samples.limited});
  }
  console.log(JSON.stringify({method:'Headless Chromium, 390x844; 5 warmups and 21 alternating launch samples, 1000 links, includes synchronous layout; on-demand matching has 5 warmups and 21 samples. Not iPhone/device timings.',scannerByteIdentical:true,baseline:sizes[0],reveal:sizes[1],baselineLaunchMedianMs:median(launch[0]),revealLaunchMedianMs:median(launch[1]),matching},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
