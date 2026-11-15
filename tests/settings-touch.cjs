const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(process.env.NOUS_SOURCE || require('node:path').join(__dirname,'..','Nous_Source.js'),'utf8');
const psrc=src.slice(src.indexOf('  const DEFAULTS='),src.indexOf('  let mainHeight='));
const nodeMap={};
function node(){return {value:'',checked:false,textContent:'',hidden:false,dataset:{},style:{setProperty(k,v){this[k]=v}},classList:{toggle(){}},setAttribute(){}}}
const stored={data:null,writes:0,fail:false};
const ctxt=vm.createContext({tabs:new Map(),category:'All',peekFrame:null,mini:false,
 window:{localStorage:{getItem(){if(stored.fail)throw Error('blocked');return stored.data;},setItem(k,v){if(stored.fail)throw Error('blocked');stored.data=v;stored.writes++;}}},
 $:s=>nodeMap[s]||(nodeMap[s]=node()),Number,Object,JSON,Math,
 mainHeight:500,previewHeight:280,rememberedHeight:500,previewReturnHeight:500,full:false,previewActive:false,closed:false,
 vh:()=>800,render(){},layout(){},closePreview(){ctxt.previewActive=false}
});
vm.runInContext(psrc,ctxt);
const run=s=>vm.runInContext(s,ctxt);
const obj=s=>JSON.parse(JSON.stringify(run(s)));
assert.equal(obj('preferences').theme,'light');
assert.equal(obj("sanitizePreferences({theme:'hacked',accent:'url(evil)',textSize:999,inspectorHeight:-100,previewHeight:NaN,wrapUrls:'true',density:'comfortable',rememberSizes:false})").textSize,16);
const clean=obj("sanitizePreferences({theme:'hacked',accent:'url(evil)',textSize:999,inspectorHeight:-100,previewHeight:NaN,wrapUrls:'true',density:'comfortable',rememberSizes:false})");
assert.equal(clean.theme,'light');assert.equal(clean.accent,'mint');assert.equal(clean.inspectorHeight,30);assert.equal(clean.previewHeight,34);assert.equal(clean.wrapUrls,false);assert.equal(clean.density,'comfortable');assert.equal(clean.rememberSizes,false);
run("changePreference('theme','dark');savePreferences();applyPreferences();");
assert.equal(nodeMap['.dock'].dataset.theme,'dark');
run("changePreference('accent','blue');changePreference('wrapUrls',true);changePreference('textSize',15);savePreferences()");
assert.equal(JSON.parse(stored.data).accent,'blue');
assert.equal(nodeMap['.dock'].style['--resource-size'],'15px');
assert.equal(obj('preferences').wrapUrls,true);
run("changePreference('inspectorHeight',50)");assert.equal(ctxt.mainHeight,400);
run("changePreference('previewHeight',30)");assert.equal(ctxt.previewHeight,240);
ctxt.previewActive=true;run("setSettingsView(true)");
assert(nodeMap['#items'].hidden);assert(!nodeMap['#settingspanel'].hidden);assert(!ctxt.previewActive);
run("setSettingsView(false)");assert(!nodeMap['#items'].hidden);assert(nodeMap['#settingspanel'].hidden);
stored.fail=true;run("changePreference('theme','light');savePreferences()");
assert(nodeMap['#settingsnote'].textContent.includes('unavailable'));
for(const bad of ['{broken','null','[]','"hello"']){
 const c=vm.createContext({window:{localStorage:{getItem(){return bad}}}});
 vm.runInContext(psrc,c);assert.equal(vm.runInContext('preferences.theme',c),'light');
}
const blocked=vm.createContext({window:{localStorage:{getItem(){throw Error('denied')}}}});
vm.runInContext(psrc,blocked);assert.equal(vm.runInContext('preferences.textSize',blocked),12);

const dragSource=src.slice(src.indexOf('  function resizeHandle('),src.indexOf("  resizeHandle($('#grab')"));
class Target extends EventTarget{
 constructor(){super();this.classList={add(){},remove(){}};this.captureFailed=false;this.captures=[];}
 setPointerCapture(id){if(this.captureFailed)throw Error('capture unavailable');this.captures.push(id);}
 releasePointerCapture(){}
 closest(){return null;}
}
function setup(pointer=true,kind='main'){
 const controller=new AbortController(),win=new Target(),handle=new Target(),title=new Target();
 if(pointer)win.PointerEvent=function(){};
 const dock=new Target(),shield={hidden:true};
 const c=vm.createContext({
 controller,window:win,AbortController,mainHeight:480,previewHeight:270,mini:false,full:false,remembered:[],layouts:0,handle,title,
 $:selector=>selector==='.dock'?dock:shield,
 on:(target,event,fn,opts={})=>target.addEventListener(event,fn,{...opts,signal:controller.signal}),
 layout(){c.layouts++;},rememberPanelSize:kind=>c.remembered.push(kind)
 });
 vm.runInContext(dragSource,c);vm.runInContext("resizeHandle(handle,'"+kind+"',title)",c);
 return {c,controller,win,handle,title,shield};
}
function fire(target,type,properties={}){
 const e=new Event(type,{cancelable:true});for(const [k,v]of Object.entries(properties))Object.defineProperty(e,k,{value:v});
 target.dispatchEvent(e);return e;
}
let d=setup();d.handle.captureFailed=true;
fire(d.title,'pointerdown',{pointerType:'touch',button:-1,pointerId:7,clientY:400,isPrimary:true});
assert(!d.shield.hidden,'Title bar begins gesture even if pointer capture fails');
fire(d.win,'pointermove',{pointerId:7,clientY:340});assert.equal(d.c.mainHeight,540);
fire(d.win,'pointermove',{pointerId:8,clientY:200});assert.equal(d.c.mainHeight,540,'Ignore other fingers');
fire(d.handle,'lostpointercapture',{pointerId:7});
fire(d.win,'pointermove',{pointerId:7,clientY:320});assert.equal(d.c.mainHeight,560,'Continue after lost capture');
fire(d.win,'pointerup',{pointerId:7,clientY:310});assert.equal(d.c.mainHeight,570);
assert(d.shield.hidden);assert.deepEqual(d.c.remembered,['main']);
const previous=d.c.layouts;fire(d.win,'pointermove',{pointerId:7,clientY:200});assert.equal(d.c.layouts,previous,'Temporary tracking removed');
d=setup(true,'preview');
fire(d.handle,'pointerdown',{pointerType:'touch',pointerId:1,clientY:600,isPrimary:true});
fire(d.win,'pointermove',{pointerId:1,clientY:530});assert.equal(d.c.previewHeight,340);assert.equal(d.c.mainHeight,480);
fire(d.win,'pointercancel',{pointerId:1});assert(d.shield.hidden);assert.equal(d.c.remembered.length,0);
d=setup();fire(d.handle,'pointerdown',{pointerType:'mouse',button:2,pointerId:1,clientY:500,isPrimary:true});assert(d.shield.hidden);
fire(d.handle,'pointerdown',{pointerType:'touch',pointerId:2,clientY:500,isPrimary:false});assert(d.shield.hidden);
d=setup();fire(d.handle,'pointerdown',{pointerType:'touch',pointerId:3,clientY:500,isPrimary:true});
d.controller.abort();assert(d.shield.hidden);const n=d.c.mainHeight;
fire(d.win,'pointermove',{pointerId:3,clientY:100});assert.equal(d.c.mainHeight,n,'Close cleans active drag');
d=setup(false);
fire(d.title,'touchstart',{changedTouches:[{identifier:9,clientY:500}],touches:[{identifier:9,clientY:500}]});
fire(d.win,'touchmove',{touches:[{identifier:9,clientY:420}]});assert.equal(d.c.mainHeight,560);
fire(d.win,'touchend',{changedTouches:[{identifier:9,clientY:410}]});assert.equal(d.c.mainHeight,570);assert(d.shield.hidden);
d=setup();fire(d.handle,'keydown',{key:'ArrowUp'});assert.equal(d.c.mainHeight,508);assert.deepEqual(d.c.remembered,['main']);
console.log(JSON.stringify({passed:['Preference validation and safe defaults','Live appearance and height changes','Per-site save and storage failures','Settings/list transitions','Title bar touch start and failed pointer capture','Tracking after capture loss; other fingers ignored','Independent Peek resizing; cancel and close cleanup','Touch-event fallback and keyboard resize'],visual_iPhone_test:'Not performed'},null,2));

