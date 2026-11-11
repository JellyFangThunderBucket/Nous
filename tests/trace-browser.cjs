// Optional rendered checks: use installed Playwright and Chromium, without app dependencies.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'Nous_Source.js'),'utf8');
const baseline=process.env.NOUS_BASELINE?fs.readFileSync(process.env.NOUS_BASELINE,'utf8'):null;
const fixture=`<!doctype html><meta name="viewport" content="width=device-width"><title>Trace fixture</title><meta name="description" content="Fixture metadata"><a href="/page">Article fixture</a><a href="/blocked">Blocked fixture</a><a href="mailto:fixture@example.test">Mail fixture</a><img src="/image.svg" alt="Image fixture"><img srcset="/responsive.svg 1x" alt="Responsive fixture"><video src="/video.mp4" preload="none"></video><audio src="/audio.mp3" preload="none"></audio><script src="/fixture.js"></script><link rel="stylesheet" href="/fixture.css"><iframe src="/embedded"></iframe>`;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost').pathname;
 if(url==='/fixture'){res.setHeader('Content-Type','text/html');res.end(fixture);}
 else if(url==='/blocked'){res.writeHead(403,{'X-Frame-Options':'DENY','Content-Type':'text/html'});res.end('Blocked');}
 else if(url==='/page'||url==='/embedded'){res.setHeader('Content-Type','text/html');res.end('<title>Inspected fixture</title><a href="/deep">Deep fixture</a>');}
 else if(url.endsWith('.svg')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="green"/></svg>');}
 else if(url==='/fixture.js'){res.setHeader('Content-Type','application/javascript');res.end('/* Fixture script */');}
 else if(url==='/fixture.css'){res.setHeader('Content-Type','text/css');res.end('body{font-family:sans-serif}');}
 else if(url==='/Nous_Preview.html'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(root,'Nous_Preview.html')));}
 else{res.statusCode=404;res.end('Not found');}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  let comparisons=0;
  for(const width of [320,390]){
   const dimensions=[];
   for(const code of baseline?[baseline,source]:[source]){
    const page=await browser.newPage({viewport:{width,height:844}});const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    // Hold media responses to measure their initial status before a format error.
    await page.route(/\/(?:video\.mp4|audio\.mp3)$/,()=>{});
    await page.goto(address+'/fixture');await page.evaluate(code);
    const q=s=>page.locator('#nous-bookmarklet '+s);
    await q('#items .resource').first().waitFor();
    const open=async (search,category='All')=>{await q('#tabs .tab').nth(category==='Network'?9:0).click();await q('#find').fill(search);await q('#items .resource').first().click();};
    const measured=[];
    for(const [search,method,category] of [['Image fixture','img[src]'],['responsive.svg','img.currentSrc'],['Article fixture','a[href]'],['/fixture.js','script[src]'],['/fixture.css','link[rel]'],['Fixture metadata','meta'],['Trace fixture','document.title'],['/video.mp4','video[src]'],['/audio.mp3','audio[src]'],['Embedded content','iframe[src]'],['/fixture.js','Performance API','Network']]){
     await open(search,category);
     if(code===source)assert((await q('#previewfoot').innerText()).includes('Discovered via '+method),search+': '+await q('#previewfoot').innerText());
     measured.push(await page.locator('#nous-bookmarklet').evaluate(host=>{
      const r=host.shadowRoot,b=sel=>{const x=r.querySelector(sel).getBoundingClientRect();return [x.x,x.y,x.width,x.height];};
      return {sheet:b('.sheet'),viewer:b('#viewer'),footer:b('.previewfoot'),buttons:r.querySelectorAll('button').length};
     }));
    }
    // Ordinary page inspection owns the footer, including repeats, Back and failures.
    await open('Article fixture');await q('#previewcanvas iframe').waitFor();
    await page.waitForFunction(()=>document.querySelector('#nous-bookmarklet').shadowRoot.querySelector('#previewcanvas iframe')?.dataset.loading==='false');
    await q('#inspectpage').click();await q('#previewfoot').filter({hasText:/Live scan complete/}).waitFor();
    assert(!(await q('#previewfoot').innerText()).includes('Discovered via'));
    await q('#find').fill('Deep fixture');await q('#inspectpage').click();
    await page.waitForFunction(()=>!document.querySelector('#nous-bookmarklet').shadowRoot.querySelector('#inspectpage').disabled);
    assert.equal(await q('#find').inputValue(),'Deep fixture');
    await q('#inspectback').click();await open('Blocked fixture');
    await page.waitForFunction(()=>document.querySelector('#nous-bookmarklet').shadowRoot.querySelector('#previewcanvas iframe')?.dataset.loading==='false');
    await q('#inspectpage').click();await q('#previewfoot').filter({hasText:/Browser access blocked/}).waitFor();
    assert(!(await q('#previewfoot').innerText()).includes('Discovered via'));
    await open('Mail fixture');assert.match(await q('#previewfoot').innerText(),/^Link scheme shown as text/);
    await q('#close').click();await page.evaluate(code);await q('#items .resource').first().waitFor();
    assert.deepEqual(errors,[]);dimensions.push(measured);await page.close();
   }
   if(baseline){
    for(let i=0;i<dimensions[0].length;i++){
     assert.deepEqual(dimensions[1][i].sheet,dimensions[0][i].sheet);
     assert.deepEqual(dimensions[1][i].viewer,dimensions[0][i].viewer);
     assert.equal(dimensions[1][i].buttons,dimensions[0][i].buttons);
     assert(dimensions[1][i].footer[3]<=dimensions[0][i].footer[3],'Trace must not expand the footer');comparisons++;
    }
   }
  }
  const demo=await browser.newPage();await demo.goto(address+'/Nous_Preview.html');
  await demo.locator('#nous-bookmarklet #items .resource').first().click();
  assert.match(await demo.locator('#nous-bookmarklet #previewfoot').innerText(),/Discovered via/);await demo.close();
  console.log(`Passed Chromium Trace interactions at 320/390 CSS pixels, live/repeated/failed inspection, Back, unsupported links, close/reopen, embedded demo; ${comparisons} baseline geometry comparisons.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
