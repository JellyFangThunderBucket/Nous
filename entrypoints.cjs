const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
require('node:events').setMaxListeners(0);

const base = path.join(__dirname,'..');
const entry = process.env.NOUS_ENTRY || 'source';
let source = fs.readFileSync(process.env.NOUS_SOURCE || path.join(base,'Nous_Source.js'),'utf8');
if(entry==='bookmarklet')source=fs.readFileSync(path.join(base,'Nous_Bookmarklet.txt'),'utf8').trim().slice('javascript:'.length);
if(entry==='preview'){
  const html=fs.readFileSync(path.join(base,'Nous_Preview.html'),'utf8');
  source=JSON.parse(html.match(/const code=("(?:\\.|[^"\\])*");/)[1]);
}
const downloads = [], blobs = new Map(), revoked = [];
let focused = null, clipboardText = '', clipboardWorks = true, activeHost = null;

class Classes {
  constructor(value=''){this.names=new Set(value.split(/\s+/).filter(Boolean));}
  add(name){this.names.add(name);}
  remove(name){this.names.delete(name);}
  contains(name){return this.names.has(name);}
  toggle(name, force){
    const add=force===undefined?!this.names.has(name):Boolean(force);
    if(add)this.names.add(name);else this.names.delete(name);
    return add;
  }
}
class Element extends EventTarget {
  constructor(tag='div'){
    super();
    this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;
    this.style={setProperty(name,value){this[name]=value;}};
    this.classList=new Classes();this.dataset={};this.attributes={};
    this.hidden=false;this.disabled=false;this.value='';this.textContent='';
    this.scrollTop=0;this.scrollLeft=0;this.isConnected=true;this._html='';
  }
  set className(value){this.classList=new Classes(value);}
  get className(){return [...this.classList.names].join(' ');}
  set innerHTML(value){this._html=value;}
  get innerHTML(){return this._html;}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return Object.prototype.hasOwnProperty.call(this.attributes,name)?this.attributes[name]:null;}
  append(...items){
    for(const item of items){
      if(item.fragment){this.append(...item.children.slice());continue;}
      if(!item)continue;
      item.parentNode=this;this.children.push(item);
    }
  }
  appendChild(item){this.append(item);return item;}
  replaceChildren(...items){this.children.forEach(x=>{x.parentNode=null;});this.children=[];this.append(...items);}
  remove(){
    if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);
    this.parentNode=null;this.isConnected=false;
    if(this===activeHost)activeHost=null;
  }
  querySelectorAll(selector){
    const all=[];
    const visit=node=>{for(const child of node.children){all.push(child);visit(child);}};
    visit(this);
    if(selector==='.item')return all.filter(x=>x.classList.contains('item'));
    if(selector==='audio,video')return all.filter(x=>['AUDIO','VIDEO'].includes(x.tagName));
    return [];
  }
  querySelector(selector){
    if(selector==='.resource')return this.children.find(x=>x.classList.contains('resource'))||null;
    return null;
  }
  focus(){focused=this;}
  select(){}
  setSelectionRange(){}
  scrollIntoView(){}
  pause(){}
  load(){}
  setPointerCapture(){}
  releasePointerCapture(){}
  closest(selector){return this.tagName==='BUTTON'?this:null;}
  click(){
    if(this.disabled)return;
    if(this.tagName==='A'&&this.download)downloads.push({url:this.href,name:this.download});
    const event=new Event('click',{cancelable:true});
    if(this.onclick)this.onclick(event);
    this.dispatchEvent(event);
  }
}
class Shadow extends Element {
  constructor(){super('shadow');this.ids=new Map();this.classes=new Map();}
  set innerHTML(value){
    this._html=value;
    for(const match of value.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
      const attributes=match[2], id=attributes.match(/\bid="([^"]+)"/), cl=attributes.match(/\bclass="([^"]+)"/);
      if(!id&&!cl)continue;
      const element=new Element(match[1]);
      if(id){element.id=id[1];this.ids.set(id[1],element);}
      if(cl){element.className=cl[1];for(const name of element.classList.names)if(!this.classes.has(name))this.classes.set(name,element);}
      if(/\shidden(?:\s|>|$)/.test(attributes))element.hidden=true;
    }
  }
  get innerHTML(){return this._html;}
  querySelector(selector){
    return selector.startsWith('#')?this.ids.get(selector.slice(1)):this.classes.get(selector.slice(1));
  }
}
const pageFixtures={
  'a[href],area[href]':[
    Object.assign(new Element('a'),{textContent:'First page',attributes:{href:'/first'}}),
    Object.assign(new Element('a'),{textContent:'Second page',attributes:{href:'/second'}})
  ],
  'img':[Object.assign(new Element('img'),{alt:'Photo',attributes:{src:'/image.jpg'}})]
};
const doc={
  title:'Example',baseURI:'https://example.test/root',activeElement:{isConnected:false},body:new Element('body'),
  querySelector:()=>null,
  querySelectorAll:selector=>pageFixtures[selector]||[],
  getElementById:id=>activeHost?.id===id?activeHost:null,
  createElement(tag){
    const element=new Element(tag);
    if(tag==='div')element.attachShadow=()=>{element.shadowRoot=new Shadow();return element.shadowRoot;};
    return element;
  },
  createDocumentFragment(){const fragment=new Element('fragment');fragment.fragment=true;return fragment;},
  execCommand(command){if(command==='copy'&&clipboardWorks){clipboardText=focused.value;return true;}return false;}
};
doc.documentElement=new Element('html');
doc.documentElement.appendChild=element=>{activeHost=element;element.parentNode=doc.documentElement;return element;};
const browser=new EventTarget();
Object.assign(browser,{
  innerWidth:390,innerHeight:844,visualViewport:null,isSecureContext:false,PointerEvent:function(){},
  localStorage:{getItem(){return null;},setItem(){}}
});
class TestURL extends URL {
  static createObjectURL(blob){const value='blob:fixture/'+(blobs.size+1);blobs.set(value,blob);return value;}
  static revokeObjectURL(url){revoked.push(url);}
}
const context=vm.createContext({
  document:doc,window:browser,navigator:{},location:new URL('https://example.test/root'),
  performance:{getEntriesByType(){return [];}},URL:TestURL,Blob,AbortController,Event,Set,Map,
  setTimeout,clearTimeout,console,fetch:async()=>{throw Error('offline');}
});
function event(target,type,properties={}){
  const e=new Event(type,{cancelable:true});
  for(const [name,value] of Object.entries(properties))Object.defineProperty(e,name,{value});
  target.dispatchEvent(e);
}
function open(){vm.runInContext(source,context);assert(activeHost);return activeHost.shadowRoot;}
(async()=>{
  let root=open();
  assert.match(root.querySelector('#total').textContent,/found/);
  const find=root.querySelector('#find');
  find.value='First';event(find,'input');
  assert.equal(root.querySelector('#items').children.length,1);
  root.querySelector('#copy').click();
  assert.match(clipboardText,/https:\/\/example\.test\/first/);
  clipboardWorks=false;root.querySelector('#copy').click();
  assert.equal(root.querySelector('#copydialog').hidden,false);
  assert.match(root.querySelector('#copytext').value,/first/);
  root.querySelector('#copydialogclose').click();
  assert.equal(root.querySelector('#copydialog').hidden,true);
  root.querySelector('#save').click();
  assert.equal(downloads.at(-1).name,'nous-resources.json');
  const exported=JSON.parse(await blobs.get(downloads.at(-1).url).text());
  assert.equal(exported.version,'1.4');
  assert.equal(exported.page,'https://example.test/root');
  assert.equal(exported.entries.length,1);
  assert.equal(exported.entries[0].value,'https://example.test/first');
  root.querySelector('#minimize').click();
  assert(root.querySelector('.sheet').classList.contains('minimized'));
  root.querySelector('#minimize').click();
  assert(!root.querySelector('.sheet').classList.contains('minimized'));
  const height=root.querySelector('.sheet').style.height;
  root.querySelector('#maximize').click();
  assert.notEqual(root.querySelector('.sheet').style.height,height);
  root.querySelector('#maximize').click();
  root.querySelector('#settingstab').click();
  assert.equal(root.querySelector('#settingspanel').hidden,false);
  const theme=root.querySelector('#setting-theme');
  theme.value='dark';event(theme,'change');
  assert.equal(root.querySelector('.dock').dataset.theme,'dark');
  root.querySelector('#settingstab').click();
  find.value='';event(find,'input');
  root.querySelector('#tabs').children[2].click();
  root.querySelector('#items').children[0].children[0].click();
  assert.equal(root.querySelector('#viewer').hidden,false);
  assert.equal(root.querySelector('#previewcanvas').children[0].className,'imagestage');
  for(const [key,start,end] of [['#grab',300,250],['#previewgrab',650,600]]){
    const handle=root.querySelector(key);
    event(handle,'pointerdown',{pointerType:'touch',button:0,pointerId:3,clientY:start,isPrimary:true});
    event(browser,'pointermove',{pointerId:3,clientY:end});
    event(browser,'pointerup',{pointerId:3,clientY:end});
    assert.equal(root.querySelector('#dragshield').hidden,true);
  }
  browser.innerWidth=320;browser.innerHeight=420;event(browser,'resize');
  assert(parseFloat(root.querySelector('.sheet').style.height)<=420);
  root.querySelector('#close').click();
  assert.equal(activeHost,null);
  assert(revoked.includes(downloads.at(-1).url));
  for(let i=0;i<3;i++){root=open();vm.runInContext(source,context);assert.equal(activeHost,null);}
  console.log('Passed synthetic '+entry+' entry-point interactions for filtering, copy fallback, JSON export, minimize, expand, settings, previews, both drag handles, short viewport, close and repeated launch.');
})().catch(error=>{console.error(error);process.exitCode=1;});

