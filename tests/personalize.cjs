const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'..','Nous_Source.js'),'utf8');
const section=source.slice(source.indexOf('  const DEFAULTS='),source.indexOf('  let mainHeight='));
const keys=['scan','copy','save','previewcopy','inspectpage','sourcestab','minimize','maximize','Links','Images','Video','Audio','Scripts','Styles','Frames','Metadata','Network'];
let checks=0;
function setup(stored=null,blocked=false){
 const nodes=new Map(),node=()=>({hidden:false,checked:false,value:'',textContent:'',dataset:{},style:{setProperty(){}},classList:{toggle(){}},setAttribute(){}});
 const state=vm.createContext({window:{localStorage:{getItem(){if(blocked)throw Error('blocked');return stored;},setItem(k,v){if(blocked)throw Error('blocked');state.saved=JSON.parse(v);}}},
  tabs:new Map(['All','Links','Frames'].map(name=>[name,{button:node()}])),category:'All',peekFrame:null,mini:false,previewActive:false,
  $:key=>{if(!nodes.has(key))nodes.set(key,node());return nodes.get(key);},render(){state.rendered=(state.rendered||0)+1;},layout(){},
  toggleMini(){state.mini=!state.mini;},closePreview(){state.previewActive=false;},mainHeight:400,previewHeight:250,vh:()=>844});
 vm.runInContext(section,state);return {state,nodes,run:code=>vm.runInContext(code,state)};
}
for(const raw of [null,'{bad','null','[]','false','"hello"',JSON.stringify({theme:'dark',textSize:15}),...['bad',null,[],true,{scan:'false',Links:0,close:false,All:false}].map(visibility=>JSON.stringify({visibility}))]){
 const f=setup(raw);const p=JSON.parse(f.run('JSON.stringify(preferences)'));
 assert.deepEqual(Object.keys(p.visibility),keys);assert(keys.every(key=>p.visibility[key]===true));checks++;
}
const f=setup(JSON.stringify({theme:'dark',accent:'blue',visibility:{scan:false,Frames:false,inspectpage:false,close:false,All:false}}));
assert.equal(f.run('preferences.theme'),'dark');assert.equal(f.run('preferences.accent'),'blue');
assert.equal(f.run('preferences.visibility.scan'),false);assert.equal(f.run('preferences.visibility.Frames'),false);assert(!f.run('Object.hasOwn(preferences.visibility,"close")'));checks++;
f.run('applyPreferences();syncSettings()');assert(f.nodes.get('#scan').hidden);assert(f.nodes.get('#inspectpage').hidden);assert(!f.state.tabs.get('All').button.hidden);checks++;
f.run("changeVisibility('copy',false);changeVisibility('save',false)");assert(f.nodes.get('.tools').hidden);checks++;
f.run("changeVisibility('scan',true)");assert(!f.nodes.get('.tools').hidden);assert(!f.nodes.get('#scan').hidden);checks++;
f.state.peekFrame={};f.run("changeVisibility('inspectpage',true)");assert(!f.nodes.get('#inspectpage').hidden);f.state.peekFrame=null;f.run('applyVisibility()');assert(f.nodes.get('#inspectpage').hidden);checks++;
f.state.category='Frames';f.run("changeVisibility('Frames',false)");assert.equal(f.state.category,'All');assert(f.state.rendered>0);checks++;
f.run("changeVisibility('All',false);changeVisibility('close',false)");assert(!f.state.tabs.get('All').button.hidden);assert(!f.run('Object.hasOwn(preferences.visibility,"close")'));checks++;
f.state.mini=true;f.run("changeVisibility('minimize',false)");assert(!f.state.mini);checks++;
for(let i=0;i<100;i++)f.run(`changeVisibility('previewcopy',${i%2===0})`);assert.equal(f.state.saved.visibility.previewcopy,false);checks++;
f.run('preferences={...DEFAULTS};applyPreferences();syncSettings();savePreferences()');assert(keys.every(k=>f.state.saved.visibility[k]===true));checks++;
assert.equal(f.run('DEFAULTS.visibility.scan'),true);assert.equal(f.run('DEFAULTS.theme'),'light');assert.equal(f.run('DEFAULTS.wrapUrls'),false);checks++;
const noStorage=setup(null,true);noStorage.run("changeVisibility('copy',false)");assert(noStorage.nodes.get('#copy').hidden);assert.match(noStorage.nodes.get('#settingsnote').textContent,/unavailable/);checks++;
console.log(`Passed ${checks} Personalize preference checks: migration, sanitization, conditional controls, empty toolbar, critical actions, rapid changes, reset and unavailable storage.`);
