const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'Nous_Source.js'),'utf8');
const requests=[];
const html=`<!doctype html><html lang="en"><head><title>Sources fixture</title></head><body><button id="site-button" onclick="this.dataset.clicked='yes'">Site control</button><a href="/working">Working frame</a><a href="/denied">Denied frame</a><a href="/slow">Slow denied frame</a><a href="/error">Unavailable frame</a><a href="/oversized">Oversized frame</a>${Array.from({length:150},(_,i)=>`<a href="/page/${i}">Page ${i}</a>`).join('')}<div id="large"></div></body></html>`;
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');requests.push({path:u.pathname,dest:req.headers['sec-fetch-dest']});
 if(u.pathname==='/fixture'||u.pathname==='/csp'){
  if(u.pathname==='/csp')res.setHeader('Content-Security-Policy',"frame-src 'none'; connect-src 'self'");
  res.setHeader('Content-Type','text/html');res.end(html.replace('</body>',`<a href="http://localhost:${server.address().port}/working">Cross origin frame</a></body>`));
 }else if(u.pathname==='/denied'||u.pathname==='/slow'||u.pathname==='/oversized'){
  res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Type','text/html');
  const body='<title>Denied page</title><main>Safe readable page<script>top.unwantedExecution=true</script><img src="/beacon" onerror="top.unwantedExecution=true"><iframe src="/beacon"></iframe></main>';
  if(u.pathname==='/slow'&&req.headers['sec-fetch-dest']==='empty')setTimeout(()=>res.end(body.replace('Safe readable page','Obsolete preview')),800);
  else if(u.pathname==='/oversized')res.end('<main>'+('x'.repeat(2*1024*1024+1))+'</main>');
  else res.end(body);
 }else if(u.pathname==='/working'){
  res.setHeader('Content-Type','text/html');res.end('<title>Working</title><main>Interactive page<button onclick="this.textContent=\'Clicked\'">Frame control</button></main>');
 }else if(u.pathname==='/error'){res.writeHead(403,{'Content-Type':'text/html','X-Frame-Options':'DENY'});res.end('No access');}
 else{res.setHeader('Content-Type','text/html');res.end('<title>Page</title><main>Page content</main>');}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  for(const width of [320,390]){
   const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(address+'/fixture');
   await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedHTML=text;}}});});
   await page.evaluate(source);
   const q=s=>page.locator('#nous-bookmarklet '+s);
   const open=async text=>{await q('#tabs .tab').first().click();await q('#find').fill(text);await q('#items .resource').first().click();};
   const originalSize=await q('.sheet').boundingBox();
   assert.equal(await q('#sourcestab').evaluate(e=>e.previousElementSibling.id),'settingstab');
   await q('#find').fill('Page ');await q('#items').evaluate(e=>e.scrollTop=75);const scroll=await q('#items').evaluate(e=>e.scrollTop);
   const before=requests.length;await q('#sourcestab').click();
   const snapshot=await q('#sourcecode').textContent();
   if(width===390&&process.env.NOUS_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.NOUS_SCREENSHOT_DIR,'sources-panel.png')});
   assert(snapshot.startsWith('<!DOCTYPE html>'));assert(snapshot.includes('<html lang="en">'));assert(!snapshot.includes('id="nous-bookmarklet"'));
   assert.equal(await q('#sourcecode').evaluate(e=>e.isContentEditable),false);
   assert(await q('#sourcecode .sourcetag').count()>0);
   await q('#sourcecopy').click();assert.equal(await page.evaluate(()=>window.copiedHTML),snapshot);
   assert.equal(requests.length,before,'Sources must not cause requests');
   const sourceSize=await q('.sheet').boundingBox();assert.equal(sourceSize.height,originalSize.height);
   await q('#sourcestab').click();assert.equal(await q('#find').inputValue(),'Page ');assert.equal(await q('#items').evaluate(e=>e.scrollTop),scroll);
   await q('#sourcestab').click();await q('#settingstab').click();assert(await q('#sourcespanel').isHidden());assert(await q('#settingspanel').isVisible());
   await q('#settingstab').click();
   await page.evaluate(()=>document.querySelector('#large').textContent='large-page-marker '.repeat(16000));
   await q('#sourcestab').click();assert((await q('#sourcecode').textContent()).includes('large-page-marker '.repeat(16000)));assert(await q('#sourcecode .sourcetag').count()>0);
   await q('#minimize').click();assert(await q('#sourcespanel').isHidden());await q('#minimize').click();assert(await q('#sourcespanel').isVisible());
   await page.keyboard.press('Escape');assert(await q('#sourcespanel').isHidden());
   await page.evaluate(()=>document.querySelector('#site-button').click());assert.equal(await page.locator('#site-button').getAttribute('data-clicked'),'yes');
   await open('Working frame');await page.waitForFunction(()=>document.querySelector('#nous-bookmarklet').shadowRoot.querySelector('#previewcanvas iframe')?.contentDocument?.title==='Working');
   assert.equal(await q('#previewcanvas .plainpreview').count(),0);
   assert.equal(requests.filter(r=>r.path==='/working'&&r.dest==='empty').length,0,'Working frames must not be fetched twice');
   await page.frameLocator('#nous-bookmarklet #previewcanvas iframe').getByRole('button',{name:'Frame control'}).click();
   assert.equal(await page.frameLocator('#nous-bookmarklet #previewcanvas iframe').getByRole('button').innerText(),'Clicked');
   await open('Cross origin frame');await page.frameLocator('#nous-bookmarklet #previewcanvas iframe').getByRole('button',{name:'Frame control'}).waitFor();assert.equal(await q('#previewcanvas .plainpreview').count(),0);
   assert.equal(requests.filter(r=>r.path==='/working'&&r.dest==='empty').length,0,'Cross-origin working frames must not be fetched again');
   await open('Denied frame');await q('#previewfoot').filter({hasText:/Read-only text preview/}).waitFor();
   assert.match(await q('#previewcanvas .plainpreview').innerText(),/Safe readable page/);assert.equal(await page.evaluate(()=>window.unwantedExecution),undefined);
   assert.equal(requests.filter(r=>r.path==='/beacon').length,0,'Fetched HTML must not load subresources');
   await q('#inspectpage').click();await q('#previewfoot').filter({hasText:/HTML scan complete/}).waitFor();assert(await q('#inspectback').isVisible());await q('#inspectback').click();
   await open('Slow denied frame');await q('#previewfoot').filter({hasText:/Reading text preview/}).waitFor();await open('Working frame');await page.waitForTimeout(900);assert.equal(await q('#previewcanvas .plainpreview').count(),0);
   await open('Unavailable frame');await q('#previewfoot').filter({hasText:/Preview blocked or unavailable/}).waitFor();
   await open('Oversized frame');await q('#previewfoot').filter({hasText:/Page too large/}).waitFor();
   await q('#close').click();assert.equal(await page.locator('#nous-bookmarklet').count(),0);await page.evaluate(source);await q('#sourcestab').click();assert(await q('#sourcespanel').isVisible());await q('#close').click();
   assert.deepEqual(errors,[]);await page.close();
   const csp=await browser.newPage({viewport:{width,height:844}});await csp.goto(address+'/csp');await csp.evaluate(source);
   const cq=s=>csp.locator('#nous-bookmarklet '+s);await cq('#find').fill('Denied frame');await cq('#items .resource').first().click();await cq('#previewfoot').filter({hasText:/Read-only text preview/}).waitFor();
   assert.match(await cq('#previewcanvas .plainpreview').innerText(),/Safe readable page/);
   await cq('#find').fill('Cross origin frame');await cq('#items .resource').first().click();await cq('#previewfoot').filter({hasText:/If blocked, use Open|This site blocks the embedded preview/}).waitFor();assert.equal(await cq('#previewcanvas .plainpreview').count(),0);
   await csp.close();
  }
  console.log('Passed Sources/copy/state/large-page checks and working/XFO-denied/CSP-blocked/error/oversize/stale Peek checks at 320/390 CSS pixels. No page scripts or subresources executed by the text preview.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
