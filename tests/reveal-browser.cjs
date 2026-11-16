const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
let source=fs.readFileSync(root+'/Nous_Source.js','utf8');
const entry=process.env.NOUS_ENTRY||'source';
if(entry==='bookmarklet')source=fs.readFileSync(root+'/Nous_Bookmarklet.txt','utf8').trim().slice(11);
if(entry==='preview')source=JSON.parse(fs.readFileSync(root+'/Nous_Preview.html','utf8').match(/const code=("(?:\\.|[^"\\])*");/)[1]);
const output=process.env.NOUS_ARTIFACT_DIR,requests=[];
const fixture=`<!doctype html><html><head><base href="/assets/"><link rel="icon" href="data:,"><title>Reveal fixture</title><style>
body{margin:0;padding:24px;font:16px Georgia;background:#f5eee4;color:#26392d}h1{margin:0 0 12px}.hidden{display:none}.ghost{opacity:0}img{display:block}#hero{width:200px;height:90px}#offscreen{margin-top:900px}#inline{width:80px;height:40px;background:url('/image.svg?bg=1')}iframe{width:240px;height:180px;border:3px solid #345}#scrollbox{height:60px;overflow:hidden}#clipped{margin-top:300px}
</style><script src="/fixture.js"></script></head><body><h1>Follow the thread.</h1><button id="sitebutton" onclick="this.dataset.clicked='yes'">Site control</button><img id="hero" src="../image.svg?sig=a%2Bb&x=1#frag" alt="Hero"><img id="hidden" class="hidden" src="/image.svg?sig=a%2Bb&x=1#frag"><img src="/image.svg?sig=other" alt="Different signature"><div id="inline" style="background-image:url('/image.svg?bg=1')"></div><div class="ghost" data-video-src="/invisible-endpoint"></div><div id="data" data-video-src="/declared-endpoint?sig=a%2Bb#one">Declared reference</div><video id="hiddenvideo" class="hidden" preload="none"><source src="../movie.mp4?sig=abc#t=1" type="video/mp4"></video><picture><source srcset="/responsive.svg?variant=1 1x, /responsive.svg?variant=2 2x"><img id="responsive" src="/fallback.svg" width="80" height="40"></picture><a href="/inspected">Live inspection</a><a href="/denied">HTML inspection</a><iframe src="/nested" id="nested"></iframe><div id="scrollbox"><div id="clipped" data-video-src="/clipped-ref">Clipped reference</div></div><img id="offscreen" src="/image.svg?sig=a%2Bb&x=1#frag" width="160" height="70"><div id="lazy" data-video-src="/lazy-only?sig=a%2Bb#part">Off-screen declared reference</div><a href="/signed-link?sig=a%2Bb#part">Signed link</a><iframe src="http://localhost:PORT/cross" id="blocked"></iframe><div data-video-src="http://localhost:PORT/cross-only.mp4">Access boundary</div><div style="height:500px"></div></body></html>`;
const image='<svg xmlns="http://www.w3.org/2000/svg" width="200" height="90"><rect width="200" height="90" rx="6" fill="#25745b"/><circle cx="100" cy="45" r="24" fill="#c6f6d8"/></svg>';
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://fixture');requests.push(u.pathname+u.search);
 if(u.pathname==='/fixture'){res.setHeader('Content-Type','text/html');res.end(fixture.replaceAll('PORT',server.address().port));}
 else if(u.pathname==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end('window.siteScriptRuns=(window.siteScriptRuns||0)+1;');}
 else if(u.pathname==='/inspected'||u.pathname==='/denied'){
  res.setHeader('Content-Type','text/html');if(u.pathname==='/denied')res.setHeader('X-Frame-Options','DENY');
  res.end('<!doctype html><title>Inspection</title><img src="/live-image.svg" width="100" height="80" alt="Live image"><a href="/other">Other</a>');
 }else if(u.pathname==='/nested'){
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><video id="frameimage" src="/frame-video.mp4" preload="none" width="100" height="70"></video><video class="hidden" style="display:none" src="/frame-video.mp4" preload="none"></video>');
 }else if(u.pathname==='/cross'){res.setHeader('Content-Type','text/html');res.end('<video src="/cross-only.mp4" preload="none"></video>');}
 else if(/\.svg$/.test(u.pathname)){res.setHeader('Content-Type','image/svg+xml');res.end(image);}
 else{res.setHeader('Content-Type','text/plain');res.end('fixture');}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let checks=0;
 try{
  for(const [theme,width,height] of [['light',390,844],['dark',320,640],['light',280,320]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(address+'/fixture',{waitUntil:'networkidle'});
   await page.evaluate(theme=>{
    localStorage.setItem('__nous_preferences_v1',JSON.stringify({theme}));
    const walk=document.createTreeWalker.bind(document);window.revealWalks=0;
    document.createTreeWalker=(...args)=>{window.revealWalks++;return walk(...args);};
    const original=window.fetch;window.revealFetches=0;window.fetch=(...args)=>{window.revealFetches++;return original(...args);};
    const raf=window.requestAnimationFrame.bind(window);window.revealRafs=0;window.requestAnimationFrame=(...args)=>{window.revealRafs++;return raf(...args);};
    window.revealMediaPlays=0;HTMLMediaElement.prototype.play=()=>{window.revealMediaPlays++;return Promise.resolve();};
   },theme);
   await page.evaluate(source);
   const q=s=>page.locator('#nous-bookmarklet '+s);
   const reveal=async query=>{await q('#find').fill(query);await q('.revealitem').first().click({timeout:5000});await q('#revealhud').waitFor();};
   const done=async()=>{await q('#revealdone').click();assert(await q('#revealhud').isHidden());assert(await q('.sheet').isVisible());};
   const status=()=>q('#revealstatus').innerText();
   const all=await q('#total').innerText();await q('#find').fill('Hero');await q('#find').fill('');
   assert.equal(await page.evaluate(()=>window.revealWalks),0,'Launch/filter must not traverse for Reveal');assert.equal(await q('#revealhud').count(),0,'Reveal UI is created on demand');checks++;
   const count=requests.length;
   await reveal('sig=a%2Bb&x=1#frag');
   assert.equal(await q('#revealcount').innerText(),'1 / 3');assert.match(await status(),/Visible reference.*img.*currentSrc/);
   assert(await q('#revealring').isVisible());assert.equal(await q('#previewcanvas img').count(),0,'Reveal does not open Peek');
   const rect=await page.locator('#hero').boundingBox(),ring=await q('#revealring').boundingBox();assert(Math.abs(rect.x-ring.x)<1&&Math.abs(rect.y-ring.y)<1);checks++;
   await page.locator('#sitebutton').click();assert.equal(await page.locator('#sitebutton').getAttribute('data-clicked'),'yes','Page controls remain interactive');checks++;
   const hud=await q('#revealhud').boundingBox();assert(hud.x>=0&&hud.x+hud.width<=width&&hud.y>=0,'HUD fits mobile viewport');
   if(output&&height>320)await page.screenshot({path:path.join(output,'reveal-'+theme+'.png')});
   await q('#revealnext').click();assert.match(await status(),/^Hidden/);assert(await q('#revealring').isHidden());assert(await q('#revealjump').isHidden());checks++;
   await q('#revealnext').click();assert.match(await status(),/^Off screen/);assert(await q('#revealjump').isVisible());
   assert.equal(await page.evaluate(()=>scrollY),0,'Reveal must not auto-scroll');checks++;
   await q('#revealnext').click();assert.equal(await q('#revealcount').innerText(),'1 / 3');await q('#revealprev').click();assert.equal(await q('#revealcount').innerText(),'3 / 3');checks++;
   assert.equal(requests.length,count,'Reveal, hidden navigation and cycling must not request resources');
   assert.equal(await page.evaluate(()=>window.revealFetches),0);assert.equal(await page.evaluate(()=>window.revealMediaPlays),0);checks++;
   await q('#revealjump').click();assert(await page.evaluate(()=>scrollY)>0);assert.match(await status(),/^Visible reference/);
   await page.keyboard.press('Escape');assert(await q('#revealhud').isHidden());assert(await q('.revealitem').first().evaluate(e=>e.getRootNode().activeElement===e));
   assert.equal(await q('#find').inputValue(),'sig=a%2Bb&x=1#frag');assert.equal(await q('#total').innerText(),all);checks++;
   await page.evaluate(()=>scrollTo(0,0));
   await reveal('declared-endpoint');if((await status()).startsWith('Off screen'))await q('#revealjump').click();assert.match(await status(),/Visible reference.*data-video-src/);assert(await q('#revealprev').isDisabled());assert.equal(await q('#revealurl').innerText(),address+'/declared-endpoint?sig=a%2Bb#one');
   await page.evaluate(()=>document.querySelector('#data').setAttribute('data-video-src','/changed'));
   await q('#revealagain').click();assert.match(await status(),/^Reference changed/);assert(await q('#revealring').isHidden());await done();checks++;
   await reveal('invisible-endpoint');assert.match(await status(),/^Hidden/);await done();checks++;
   await reveal('movie.mp4');assert.match(await status(),/^Hidden.*video.*src/);assert.equal(await q('#revealcount').innerText(),'1 / 1');assert.equal(await page.evaluate(()=>window.revealMediaPlays),0);await done();checks++;
   await reveal('responsive.svg?variant=1');assert.equal(await q('#revealcount').innerText(),'1 / 1');assert.match(await status(),/img.*srcset/);await done();checks++;
   await reveal('bg=1');assert.match(await status(),/div.*style url/);await done();checks++;
   await reveal('/fixture.js');assert.match(await status(),/^Declaration only.*script.*src/);assert(await q('#revealring').isHidden());await done();checks++;
   await page.evaluate(async()=>{await (await fetch('/timing-only?token=a%2Bb#one')).text();});await page.waitForFunction(()=>performance.getEntriesByType('resource').some(entry=>entry.name.includes('/timing-only')));await q('#scan').click();
   await reveal('timing-only');assert.match(await status(),/^No element match/);assert.equal(await q('#revealcount').innerText(),'0 references');assert(await q('#revealagain').isDisabled());await done();checks++;
   await reveal('lazy-only');assert.match(await status(),/^Off screen/);assert(!requests.some(x=>x.startsWith('/lazy-only')));await done();checks++;
   await reveal('clipped-ref');assert.match(await status(),/^Off screen/);await q('#revealjump').click();assert.match(await status(),/^Visible reference/);await done();checks++;
   await page.evaluate(()=>scrollTo(0,0));await reveal('frame-video.mp4');assert.equal(await q('#revealcount').innerText(),'1 / 2');
   if((await status()).startsWith('Off screen'))await q('#revealjump').click();
   assert.match(await status(),/^Visible reference/);const nested=await page.locator('#nested').boundingBox(),nestedRing=await q('#revealring').boundingBox();assert(nestedRing.x>=nested.x+3&&nestedRing.x+nestedRing.width<=nested.x+nested.width);
   await q('#revealnext').click();assert.match(await status(),/^Hidden/);await done();checks++;
   await reveal('cross-only.mp4');assert.equal(await q('#revealcount').innerText(),'1 / 1');assert.match(await status(),/div.*data-video-src/);await done();checks++;
   await page.evaluate(()=>scrollTo(0,0));await reveal('sig=a%2Bb&x=1#frag');
   await q('#revealring').waitFor({state:'hidden',timeout:4000});assert(await q('#revealhud').isVisible());assert(await page.evaluate(async()=>{const before=window.revealRafs;window.dispatchEvent(new Event('scroll'));await new Promise(resolve=>setTimeout(resolve,40));return before===window.revealRafs;}),'Highlight tracking stops after timeout');await q('#revealagain').click();assert(await q('#revealring').isVisible());checks++;
   await page.evaluate(()=>document.querySelector('#hero').remove());await q('#revealagain').click();assert.match(await status(),/^Removed from page/);await done();checks++;
   await q('#find').fill('Live inspection');await q('#items .resource').first().click();
   await page.waitForFunction(()=>document.querySelector('#nous-bookmarklet').shadowRoot.querySelector('#previewcanvas iframe')?.dataset.loading==='false');
   await q('#inspectpage').click();await q('#previewfoot').filter({hasText:/Live scan complete/}).waitFor();
   if(height<420)await q('#previewclose').click();
   await page.evaluate(()=>{const frame=document.querySelector('#nous-bookmarklet').shadowRoot.querySelector('#previewcanvas iframe');window.revealHeldFrame=frame;window.revealHeldDocument=frame.contentDocument;});
   const liveRequests=requests.length;await reveal('live-image.svg');assert.match(await status(),/^Visible reference/);assert(await q('.dock').evaluate(e=>e.classList.contains('revealing-frame')));
   assert.equal(requests.length,liveRequests);assert(await page.evaluate(()=>window.revealHeldFrame.contentDocument===window.revealHeldDocument));await done();assert.equal(await q('#viewer').isVisible(),height>=420);await q('#inspectback').click();checks++;
   await q('#find').fill('HTML inspection');await q('#items .resource').first().click();
   await page.waitForFunction(()=>document.querySelector('#nous-bookmarklet').shadowRoot.querySelector('#previewcanvas iframe')?.dataset.loading==='false');
   await q('#inspectpage').click();await q('#previewfoot').filter({hasText:/HTML scan complete/}).waitFor();
   if(height<420)await q('#previewclose').click();
   await q('#find').fill('live-image.svg');const htmlRequests=requests.length;await q('.revealitem').first().click();assert(await q('#revealhud').isHidden());assert.match(await q('#notice').innerText(),/Reveal needs the live page/);assert.equal(requests.length,htmlRequests);await q('#inspectback').click();checks++;
   await q('#find').fill('');await q('.revealitem').first().click();await q('.revealitem').first().evaluate(e=>window.oldRevealTrigger=e);await page.evaluate(source);assert.equal(await page.locator('#nous-bookmarklet').count(),0);assert(await page.evaluate(()=>{const before=window.revealWalks;window.oldRevealTrigger.click();return before===window.revealWalks;}));await page.evaluate(source);assert(await q('#revealhud').isHidden());assert(await q('.sheet').isVisible());checks++;
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log(`Passed ${checks} Reveal browser checks (${entry}) at 390/320/280 CSS pixels: on-demand DOM matching, exact signed URLs, shared/hidden/off-screen/declaration references, source mapping, frames, history, cleanup and zero discovery requests/playback.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
