const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'Nous_Source.js'),'utf8');
const baseline=process.env.NOUS_BASELINE?fs.readFileSync(process.env.NOUS_BASELINE,'utf8'):null;
const output=process.env.NOUS_ARTIFACT_DIR;
const keys=['scan','copy','save','previewcopy','inspectpage','sourcestab','minimize','maximize','Links','Images','Video','Audio','Scripts','Styles','Frames','Metadata','Network'];
const cats=keys.slice(8),prefKey='__nous_preferences_v1';
const fixture='<!doctype html><link rel="icon" href="data:,"><title>Personalize fixture</title><meta name="description" content="Fixture details"><a href="/page">Page fixture</a><img src="/image.svg" alt="Image fixture"><audio src="/tone.wav" preload="none"></audio><script src="/fixture.js"></script><link rel="stylesheet" href="/fixture.css"><iframe src="/frame" title="Frame fixture"></iframe>';
let requests=0;
const server=http.createServer((req,res)=>{
 requests++;
 if(req.url==='/fixture'){res.setHeader('Content-Type','text/html');res.end(fixture);}
 else if(req.url==='/frame'||req.url==='/page'){res.setHeader('Content-Type','text/html');res.end('<title>Inspection fixture</title><a href="/child">Child resource</a>');}
 else if(req.url==='/image.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="green"/></svg>');}
 else if(req.url==='/tone.wav'){
  const wav=Buffer.alloc(44+16000);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(8000,28);wav.writeUInt16LE(1,32);wav.writeUInt16LE(8,34);wav.write('data',36);wav.writeUInt32LE(16000,40);wav.fill(128,44);res.setHeader('Content-Type','audio/wav');res.end(wav);
 }else if(req.url==='/fixture.js'){res.setHeader('Content-Type','application/javascript');res.end('/* fixture */');}
 else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css');res.end('body{margin:0;font-family:sans-serif}');}
 else{res.statusCode=404;res.end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port,address='http://127.0.0.1:'+port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 let visualComparisons=0,checks=0;
 const newPage=async(viewport,raw=null,code=source,host=address)=>{
  const page=await browser.newPage({viewport});await page.goto(host+'/fixture',{waitUntil:'networkidle'});
  await page.evaluate(([key,raw])=>{localStorage.clear();if(raw!==null)localStorage.setItem(key,raw);},[prefKey,raw]);
  await page.evaluate(code);return page;
 };
 try{
  // Exact default rendering comparison, including dark and very narrow/short viewports.
  for(const theme of ['light','dark'])for(const viewport of [{width:390,height:844},{width:320,height:420},{width:280,height:320}]){
   const shots=[];
   for(const code of baseline?[baseline,source]:[source]){
    const p=await newPage(viewport,JSON.stringify({theme}),code);
    const shot=await p.locator('#nous-bookmarklet').screenshot({animations:'disabled'});shots.push(shot);
    if(output&&viewport.width===390)fs.writeFileSync(path.join(output,`${code===source?'personalize':'baseline'}-${theme}.png`),shot);
    await p.close();
   }
   if(baseline){assert(shots[0].equals(shots[1]),`Default pixels differ: ${theme} ${viewport.width}x${viewport.height}`);visualComparisons++;}
  }
  for(const theme of ['light','dark']){
   const page=await newPage({width:320,height:640},JSON.stringify({theme}));const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const q=s=>page.locator('#nous-bookmarklet '+s),tab=name=>q('#tabs .tab').filter({hasText:new RegExp('^'+name+'[0-9]+$')});
   const settings=async()=>q('#settingstab').click();
   const set=async(key,value)=>q('#setting-visible-'+key).setChecked(value);
   // Programmatic events exercise state changes while Peek/Sources are active, without opening Settings (which already closes Peek).
   const change=async(key,value)=>q('#setting-visible-'+key).evaluate((e,v)=>{e.checked=v;e.dispatchEvent(new Event('change',{bubbles:true}));},value);
   const open=async text=>{await tab('All').click();await q('#find').fill(text);await q('#items .resource').first().click();};
   const exportData=async()=>{const wait=page.waitForEvent('download');await q('#save').click();return JSON.parse(fs.readFileSync(await (await wait).path(),'utf8'));};
   const original=await exportData();assert.equal(original.version,'1.6');assert(original.entries.some(e=>e.type==='Frames'));checks++;
   const before=requests;await settings();
   assert.equal(await q('#settingspanel #setting-visible-scan').getAttribute('role'),'switch');
   for(const key of keys)assert(await q('#setting-visible-'+key).isChecked());checks++;
   for(const id of ['scan','copy','save']){await set(id,false);await settings();assert(await q('#'+id).isHidden());await q('#'+id).evaluate(e=>e.focus());assert(await q('#'+id).evaluate(e=>e.getRootNode().activeElement!==e));await settings();await set(id,true);checks++;}
   for(const id of ['scan','copy','save'])await set(id,false);
   await settings();assert(await q('.tools').isHidden());assert(await q('#settingstab').isVisible());assert(await q('#close').isVisible());checks++;
   await settings();await q('#settingsreset').click();assert.equal(await q('#setting-theme').inputValue(),'light');await q('#setting-theme').selectOption(theme);for(const key of keys)assert(await q('#setting-visible-'+key).isChecked());await settings();assert(await q('.tools').isVisible());checks++;
   await tab('Frames').click();await settings();await set('Frames',false);await settings();assert(await tab('Frames').isHidden());assert.equal(await tab('All').getAttribute('aria-pressed'),'true');
   const afterHide=await exportData();assert.deepEqual(afterHide.entries,original.entries);checks++;
   await settings();for(const name of cats)await set(name,false);await settings();assert(await tab('All').isVisible());for(const name of cats)assert(await tab(name).isHidden());
   const allHidden=await exportData();assert.deepEqual(allHidden.entries,original.entries);checks++;
   await q('#find').fill('/frame');const filtered=await exportData();assert(filtered.entries.some(e=>e.type==='Frames'));assert(filtered.entries.every(e=>e.value.includes('/frame')));await q('#find').fill('');checks++;
   await settings();await set('minimize',false);await set('maximize',false);await set('sourcestab',false);await settings();
   assert(await q('#minimize').isHidden());assert(await q('#maximize').isHidden());assert(await q('#sourcestab').isHidden());assert(await q('#close').isVisible());checks++;
   // Hiding Sources never serializes the page, even if its hidden button receives a synthetic click.
   await page.evaluate(()=>{const Original=XMLSerializer;window.serializationCalls=0;window.XMLSerializer=class extends Original{serializeToString(...a){window.serializationCalls++;return super.serializeToString(...a);}};});
   await q('#sourcestab').evaluate(e=>e.click());assert(await q('#sourcespanel').isHidden());assert.equal(await page.evaluate(()=>window.serializationCalls),0);checks++;
   await settings();await set('sourcestab',true);await settings();await q('#sourcestab').click();assert(await q('#sourcespanel').isVisible());const calls=await page.evaluate(()=>window.serializationCalls);assert(calls>0);
   await change('sourcestab',false);assert(await q('#sourcespanel').isHidden());assert(await q('#items').isVisible());assert.equal(await page.evaluate(()=>window.serializationCalls),calls);checks++;
   assert.equal(requests,before,'Visibility changes must not make network requests or rescan resources');checks++;
   await settings();for(const key of keys)await change(key,false);await settings();assert(await q('#settingstab').isVisible());assert(await q('#close').isVisible());assert(await tab('All').isVisible());assert(await q('.tools').isHidden());assert(await q('#items .resource').count()>0);
   if(output)await page.screenshot({path:path.join(output,'personalize-minimal-'+theme+'.png')});await page.setViewportSize({width:280,height:320});assert(await q('#settingstab').isVisible());assert(await q('#close').isVisible());assert(await tab('All').isVisible());await page.setViewportSize({width:320,height:640});checks++;
   await settings();await q('#settingsreset').click();assert.equal(await q('#setting-theme').inputValue(),'light');await q('#setting-theme').selectOption(theme);await settings();
   await open('Image fixture');await change('inspectpage',false);await change('inspectpage',true);assert(await q('#inspectpage').isHidden());await change('previewcopy',false);assert(await q('#previewcopy').isHidden());assert(await q('#previewclose').isVisible());assert(await q('#previewopen').isVisible());checks++;
   await open('Page fixture');await page.waitForFunction(()=>document.querySelector('#nous-bookmarklet').shadowRoot.querySelector('#previewcanvas iframe')?.dataset.loading==='false');assert(await q('#inspectpage').isVisible());await change('inspectpage',false);assert(await q('#inspectpage').isHidden());await change('inspectpage',true);assert(await q('#inspectpage').isVisible());
   await q('#inspectpage').click();await q('#previewfoot').filter({hasText:/Live scan complete/}).waitFor();assert(await q('#inspectback').isVisible());await q('#inspectback').click();checks++;
   await q('#find').fill('');await tab('Frames').click();await q('#items .resource').first().click();await page.waitForFunction(()=>document.querySelector('#nous-bookmarklet').shadowRoot.querySelector('#previewcanvas iframe')?.dataset.loading==='false');await q('#inspectpage').click();await q('#previewfoot').filter({hasText:/Live scan complete/}).waitFor();await settings();await q('#settingsreset').click();assert(await q('#inspectback').isVisible());await q('#setting-theme').selectOption(theme);await set('Frames',false);await settings();await q('#inspectback').click();assert.equal(await tab('All').getAttribute('aria-pressed'),'true');assert(await tab('Frames').isHidden());await q('#find').fill('');assert.deepEqual((await exportData()).entries,original.entries);await change('Frames',true);checks++;
   await open('audio[src]');await q('#previewcanvas audio').evaluate(async media=>{media.muted=true;media.loop=true;await media.play();window.heldMedia=media;});
   await change('previewcopy',true);await change('copy',false);await change('inspectpage',false);assert(await q('#inspectpage').isHidden());assert(await q('#previewcanvas audio').evaluate(media=>media===window.heldMedia&&!media.paused));checks++;
   await q('#previewclose').click();await settings();await set('Frames',false);await set('copy',false);await settings();
   await q('#close').click();await page.evaluate(source);assert(await q('#copy').isHidden());assert(await tab('Frames').isHidden());assert.equal(await q('.dock').getAttribute('data-theme'),theme);const reopened=await exportData();checks++;
   await settings();for(let i=0;i<30;i++)await change('scan',i%2===0);await q('#settingsreset').click();assert.equal(await q('#setting-theme').inputValue(),'light');await q('#setting-theme').selectOption(theme);for(const key of keys)assert(await q('#setting-visible-'+key).isChecked());
   await q('#settingspanel .settingsgroup').filter({hasText:/^Customize controls$/}).evaluate(e=>{const panel=e.parentElement;panel.scrollTop+=e.getBoundingClientRect().top-panel.getBoundingClientRect().top;});await q('#toast').waitFor({state:'hidden'});
   if(output)await q('#settingspanel').screenshot({path:path.join(output,'personalize-settings-'+theme+'.png')});
   await settings();for(const id of ['scan','copy','save','minimize','maximize','sourcestab'])assert(await q('#'+id).isVisible());assert.deepEqual((await exportData()).entries,reopened.entries);checks++;
   assert.deepEqual(errors,[]);await page.close();
  }
  // Older or malformed preferences preserve original defaults; storage can also be unavailable.
  for(const raw of ['{broken',JSON.stringify({theme:'dark',accent:'blue',wrapUrls:true}),JSON.stringify({visibility:{copy:'false',All:false,close:false}})]){
   const p=await newPage({width:280,height:320},raw);assert(await p.locator('#nous-bookmarklet #copy').isVisible());assert(await p.locator('#nous-bookmarklet #close').isVisible());await p.close();checks++;
  }
  const p=await newPage({width:320,height:420});await p.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('blocked');};});await p.locator('#nous-bookmarklet #settingstab').click();await p.locator('#nous-bookmarklet #setting-visible-copy').uncheck();assert.match(await p.locator('#nous-bookmarklet #settingsnote').innerText(),/unavailable/);await p.locator('#nous-bookmarklet #settingstab').click();assert(await p.locator('#nous-bookmarklet #copy').isHidden());await p.locator('#nous-bookmarklet #close').click();await p.evaluate(()=>{Storage.prototype.getItem=()=>{throw Error('blocked');};});await p.evaluate(source);assert(await p.locator('#nous-bookmarklet #copy').isVisible());await p.close();checks++;
  const scope=await browser.newContext({viewport:{width:320,height:640}});const a=await scope.newPage();await a.goto(address+'/fixture',{waitUntil:'networkidle'});await a.evaluate(source);await a.locator('#nous-bookmarklet #settingstab').click();await a.locator('#nous-bookmarklet #setting-visible-copy').uncheck();const b=await scope.newPage();await b.goto('http://localhost:'+port+'/fixture',{waitUntil:'networkidle'});await b.evaluate(source);assert(await b.locator('#nous-bookmarklet #copy').isVisible());await scope.close();checks++;
  console.log(`Passed ${checks} Personalize browser scenarios and ${visualComparisons} exact default screenshot comparisons; themes, mobile sizes, persistence, media, history, Sources, exports and recovery.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
