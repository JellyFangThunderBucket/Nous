const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const folder=path.join(__dirname,'..','chrome-extension'),manifest=JSON.parse(fs.readFileSync(folder+'/manifest.json','utf8'));
assert.equal(manifest.manifest_version,3);assert.match(manifest.version,/^\d+\.\d+\.\d+$/);
assert.deepEqual(manifest.permissions,['activeTab','scripting']);
for(const key of ['host_permissions','optional_host_permissions','background','content_scripts','web_accessible_resources'])assert.equal(manifest[key],undefined,key);
for(const name of [manifest.action.default_popup,'launcher.js','launcher.css','nous.js'])assert(fs.existsSync(path.join(folder,name)),name);
for(const [size,name] of Object.entries(manifest.icons)){
 const png=fs.readFileSync(path.join(folder,name));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),Number(size));assert.equal(png.readUInt32BE(20),Number(size));
}
const source=fs.readFileSync(path.join(folder,'..','Nous_Source.js'),'utf8'),bundle=fs.readFileSync(folder+'/nous.js','utf8');
const start='/* NOUS_SOURCE_START */\n',end='\n/* NOUS_SOURCE_END */';
assert.equal(bundle.slice(bundle.indexOf(start)+start.length,bundle.lastIndexOf(end)),source,'Extension embeds the complete shared engine without changes');
assert.equal(JSON.parse(fs.readFileSync(folder+'/source.json','utf8')).sha256,crypto.createHash('sha256').update(source).digest('hex'));
new vm.Script(bundle);
const launcher=fs.readFileSync(folder+'/launcher.js','utf8');
async function run(tab,result={ok:true},failure=null){
 const nodes=new Map();let queries=0,closed=0;const injections=[];
 const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,disabled:false,textContent:'',addEventListener(event,fn){this[event]=fn;}});return nodes.get(id);}};
 const state=vm.createContext({document,window:{close(){closed++;}},chrome:{tabs:{async query(query){queries++;assert.deepEqual(JSON.parse(JSON.stringify(query)),{active:true,currentWindow:true});return tab?[tab]:[];}},scripting:{async executeScript(request){injections.push(request);if(failure)throw new Error(failure);return result===undefined?[]:[{result}];}}}});
 await vm.runInContext(launcher,state);
 return {nodes,injections,get closed(){return closed;},get queries(){return queries;},async retry(){await nodes.get('retry').click();}};
}
(async()=>{
 for(const [tab,expected] of [[null,/No active/],[{id:'invalid',url:'https://example.test'},/No active/],[{id:1,url:'chrome://extensions/'},/HTTP and HTTPS/],[{id:1,url:'file:///tmp/page.html'},/HTTP and HTTPS/],[{id:1,url:'https://chromewebstore.google.com/detail/x'},/Web Store/],[{id:1,url:'https://chrome.google.com/webstore/detail/x'},/Web Store/]]){
  const state=await run(tab);assert.equal(state.injections.length,0);assert.equal(state.closed,0);assert.match(state.nodes.get('status').textContent,expected);assert.equal(state.nodes.get('retry').hidden,false);
 }
 for(const opened of [true,false]){
  const state=await run({id:0,url:'https://example.test/?sig=a%2Bb#part'},{ok:true,opened});assert.equal(state.closed,1);
  assert.deepEqual(JSON.parse(JSON.stringify(state.injections[0])),{target:{tabId:0},world:'MAIN',files:['nous.js']});
 }
 for(const result of [{ok:false,error:'Trusted Types blocked the page'},null,{}]){
  const state=await run({id:5,url:'https://example.test'},result);assert.equal(state.closed,0);assert.match(state.nodes.get('status').textContent,/could not open/);assert.equal(state.nodes.get('details').hidden,false);await state.retry();assert.equal(state.injections.length,2);
 }
 const rejected=await run({id:5,url:'https://example.test'},{},'<blocked by Chrome>');assert.equal(rejected.closed,0);assert.match(rejected.nodes.get('error').textContent,/<blocked by Chrome>/);
 console.log('Passed MV3 permissions/assets, exact engine provenance, protected-page filtering, main-frame launch/toggle, explicit errors and retry checks.');
})().catch(error=>{console.error(error);process.exitCode=1;});
