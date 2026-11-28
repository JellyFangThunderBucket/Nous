const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..'),bundle=fs.readFileSync(root+'/chrome-extension/nous.js','utf8');
const source=fs.readFileSync(root+'/Nous_Source.js','utf8'),requests=[];
const html=`<!doctype html><html><head><title>Desktop fixture</title><link rel="icon" href="data:,"><style>body{font:18px Georgia;margin:40px;background:#f5eee4;color:#253f37}img{width:180px;height:90px}@font-face{font-family:Fixture;src:url('/fonts/declared.woff2');font-weight:700}</style><link rel="preload" as="font" type="font/woff2" href="/fonts/preloaded.woff2" crossorigin></head><body><h1>Follow the thread.</h1><img src="/image.svg?sig=a%2Bb&x=1#part" alt="Shared image"><img src="/image.svg?sig=a%2Bb&x=1#part" style="display:none"><video preload="none" hidden><source src="/movie.mp4?sig=a%2Bb#t=2" type="video/mp4"></video><div data-video-url="/stream.m3u8?sig=xyz#one"></div><a href="/child">Inspect child</a><button id="site" onclick="this.textContent='Clicked'">Site control</button></body></html>`;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://test');requests.push(url.pathname+url.search);
 if(url.pathname==='/fixture'){res.setHeader('Content-Type','text/html');res.end(html);}
 else if(url.pathname==='/child'){res.setHeader('Content-Type','text/html');res.end('<title>Child fixture</title><a href="/next">Next</a>');}
 else if(url.pathname==='/image.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="90"><rect width="180" height="90" fill="#25745b"/></svg>');}
 else if(['/launcher.html','/launcher.css','/launcher.js','/icons/48.png'].includes(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('.html')?'text/html':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.png')?'image/png':'text/javascript');res.end(fs.readFileSync(root+'/chrome-extension'+url.pathname));}
 else{res.setHeader('Content-Type','application/octet-stream');res.end('fixture');}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const address='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),other=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(address+'/fixture',{waitUntil:'networkidle'});await other.goto(address+'/fixture',{waitUntil:'networkidle'});
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copied=text;}}});});
  const before=requests.length;assert.equal((await page.evaluate(bundle)).ok,true);
  const q=selector=>page.locator('#nous-bookmarklet '+selector),tab=name=>q('#tabs .tab').filter({hasText:new RegExp('^'+name+'[0-9]+$')});
  assert(await q('.sheet').isVisible());assert.equal(await other.locator('#nous-bookmarklet').count(),0);assert.equal(requests.length,before,'Opening the inspector must not request assets');
  await tab('Video').click();await q('#find').fill('movie.mp4');assert.equal(await q('.val').first().innerText(),address+'/movie.mp4?sig=a%2Bb#t=2');await q('.copyitem').first().click();assert.equal(await page.evaluate(()=>window.copied),address+'/movie.mp4?sig=a%2Bb#t=2');
  await q('#find').fill('stream.m3u8');assert.match(await q('.label').first().innerText(),/Manifest/);
  await tab('Styles').click();await q('#find').fill('font');assert.equal(await q('.item').count(),2);
  await q('#find').fill('declared.woff2');await q('.copyitem').first().click();assert.equal(await page.evaluate(()=>window.copied),address+'/fonts/declared.woff2');
  await tab('Images').click();await q('#find').fill('sig=a%2Bb');await q('.revealitem').first().click();assert.equal(await q('#revealcount').innerText(),'1 / 2');assert(await q('#revealring').isVisible());await q('#revealnext').click();assert.match(await q('#revealstatus').innerText(),/^Hidden/);await page.keyboard.press('Escape');assert(await q('.sheet').isVisible());
  await q('#sourcestab').click();assert((await q('#sourcecode').innerText()).includes('Desktop fixture'));assert(!(await q('#sourcecode').innerText()).includes('id="nous-bookmarklet"'));await q('#sourcecopy').click();assert((await page.evaluate(()=>window.copied)).includes('Desktop fixture'));await q('#sourcestab').click();
  await tab('All').click();await q('#find').fill('Inspect child');await q('.resource').first().click();await page.waitForFunction(()=>document.querySelector('#nous-bookmarklet').shadowRoot.querySelector('#previewcanvas iframe')?.dataset.loading==='false');await q('#inspectpage').click();await q('#previewfoot').filter({hasText:/Live scan complete/}).waitFor();await q('#inspectback').click();assert.equal(await q('#find').inputValue(),'Inspect child');
  await q('#previewclose').click();await q('#find').fill('');const downloadPromise=page.waitForEvent('download');await q('#save').click();const download=await downloadPromise;const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(exported.page,address+'/fixture');assert(exported.entries.some(entry=>entry.font));
  await q('#settingstab').click();await q('#setting-theme').selectOption('dark');await q('#settingstab').click();assert.equal(await q('.dock').getAttribute('data-theme'),'dark');
  if(process.env.NOUS_ARTIFACT_DIR)await page.screenshot({path:path.join(process.env.NOUS_ARTIFACT_DIR,'desktop-inspector.png')});
  assert.deepEqual(await page.evaluate(bundle),{ok:true,opened:false});assert.equal(await page.locator('#nous-bookmarklet').count(),0);assert.deepEqual(await page.evaluate(bundle),{ok:true,opened:true});assert.equal(await q('.dock').getAttribute('data-theme'),'dark');
  await page.evaluate(source);assert.equal(await page.locator('#nous-bookmarklet').count(),0);await page.evaluate(source);assert.deepEqual(await page.evaluate(bundle),{ok:true,opened:false});assert.equal(await other.locator('#nous-bookmarklet').count(),0);assert.deepEqual(errors,[]);
  const blocked=await browser.newPage();await blocked.goto(address+'/fixture');await blocked.evaluate(()=>{const original=Element.prototype.attachShadow;Element.prototype.attachShadow=function(...args){throw Error('Fixture initialization failure');};window.restoreShadow=()=>{Element.prototype.attachShadow=original;};});const failed=await blocked.evaluate(bundle);assert.equal(failed.ok,false);assert.match(failed.error,/Fixture initialization failure/);assert.equal(await blocked.locator('#nous-bookmarklet').count(),0);await blocked.evaluate(()=>window.restoreShadow());assert.equal((await blocked.evaluate(bundle)).ok,true);
  const popup=await browser.newPage({viewport:{width:360,height:400}});
  await popup.addInitScript(()=>{window.popupUrl='chrome://extensions/';window.popupCalls=0;window.chrome=window.chrome||{};window.chrome.tabs={query:async()=>[{id:1,url:window.popupUrl}]};window.chrome.scripting={executeScript:async()=>{window.popupCalls++;return [{result:{ok:false,error:'Fixture page blocks this action.'}}];}};});
  await popup.goto(address+'/launcher.html');await popup.locator('#status').filter({hasText:/HTTP and HTTPS/}).waitFor();assert.equal(await popup.evaluate(()=>window.popupCalls),0);
  await popup.evaluate(()=>window.popupUrl='https://chromewebstore.google.com/detail/x');await popup.locator('#retry').click();await popup.locator('#status').filter({hasText:/Web Store/}).waitFor();assert.equal(await popup.evaluate(()=>window.popupCalls),0);
  await popup.evaluate(()=>window.popupUrl='https://example.test/');await popup.locator('#retry').click();await popup.locator('#status').filter({hasText:/could not open/}).waitFor();await popup.locator('summary').click();assert.equal(await popup.locator('#error').innerText(),'Fixture page blocks this action.');
  if(process.env.NOUS_ARTIFACT_DIR)await popup.screenshot({path:path.join(process.env.NOUS_ARTIFACT_DIR,'launcher-error.png')});
  console.log('Passed desktop generated-engine fixtures: Video/font full-URL Copy, manifests, Reveal, Sources, Peek/live inspection/Back, export, preferences, toggle/bookmarklet interoperability, failure reporting, zero automatic asset requests and tab separation. Actual extension loading is separately subject to browser administrator policy.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
