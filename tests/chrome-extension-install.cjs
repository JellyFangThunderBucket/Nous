const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..'),work=path.join(root,'..','work');fs.mkdirSync(work,{recursive:true});
const temporary=fs.mkdtempSync(path.join(work,'chrome-install-')),unpacked=path.join(temporary,'extension');
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><link rel="icon" href="data:,"><title>Extension install fixture</title><a href="/story">Story</a>');});
(async()=>{
 execFileSync('python3',['chrome-extension/package.py','--check'],{cwd:root,stdio:'pipe'});
 execFileSync('python3',['-m','zipfile','-e',path.join(root,'chrome-extension/Nous-Chrome.zip'),unpacked]);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const context=await chromium.launchPersistentContext(path.join(temporary,'profile'),{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,ignoreDefaultArgs:['--disable-extensions'],args:['--no-sandbox','--enable-unsafe-extension-debugging']});
 try{
  const cdp=await context.browser().newBrowserCDPSession();let extension;
  try{extension=await cdp.send('Extensions.loadUnpacked',{path:unpacked});}
  catch(error){if(String(error.message).includes('disabled by the administrator')){console.log('SKIP actual Chrome extension installation: unpacked extensions are disabled by the browser administrator. No policy override attempted.');return;}throw error;}
  const page=await context.newPage(),other=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/');await other.goto('http://127.0.0.1:'+server.address().port+'/');await page.bringToFront();
  const tab=await context.newCDPSession(page),{targetInfo}=await tab.send('Target.getTargetInfo');
  await cdp.send('Extensions.triggerAction',{id:extension.id,targetId:targetInfo.targetId});await page.locator('#nous-bookmarklet').waitFor({timeout:10000});assert.equal(await other.locator('#nous-bookmarklet').count(),0);
  const deadline=Date.now()+3000;
  while((await cdp.send('Target.getTargets')).targetInfos.some(target=>target.url===`chrome-extension://${extension.id}/launcher.html`)){
   if(Date.now()>deadline)throw Error('Launcher popup did not close after injection');await new Promise(resolve=>setTimeout(resolve,20));
  }
  await cdp.send('Extensions.triggerAction',{id:extension.id,targetId:targetInfo.targetId});await page.locator('#nous-bookmarklet').waitFor({state:'detached',timeout:10000});
  console.log('Passed real unpacked ZIP installation and toolbar launch/close through Chrome extension APIs, with only the clicked tab inspected.');
 }finally{await context.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{server.close();fs.rmSync(temporary,{recursive:true,force:true});});
