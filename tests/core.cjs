const fs=require('fs'),vm=require('vm'),assert=require('assert');
const base=(process.env.NOUS_BASE || require('node:path').join(__dirname,'..'))+'/';
const source=fs.readFileSync(base+'Nous_Source.js','utf8');
const bookmarklet=fs.readFileSync(base+'Nous_Bookmarklet.txt','utf8').trim();
assert.equal(bookmarklet,'javascript:'+source.split('\n').map(line=>line.trim()).join(' ').trim(),'Bookmarklet must be built from the source');
new vm.Script(source);new vm.Script(bookmarklet.slice('javascript:'.length));
assert(bookmarklet.startsWith('javascript:'));
assert(!bookmarklet.includes('\n'));
const html=fs.readFileSync(base+'Nous_Preview.html','utf8');
const embeddedSource=html.match(/const code=("(?:\\.|[^"\\])*");/);
const embeddedBookmarklet=html.match(/const text=("(?:\\.|[^"\\])*");/);
assert(embeddedSource&&embeddedBookmarklet,'Preview must include source and bookmarklet');
assert.equal(JSON.parse(embeddedSource[1]),source,'Preview source must match');
assert.equal(JSON.parse(embeddedBookmarklet[1]),bookmarklet,'Preview bookmarklet must match');
new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
const result=[];
const collectSource=source.slice(source.indexOf('  function scanDocument('),source.indexOf('  function livePage('));
const el=(tag,attrs={},text='')=>({
  tagName:tag.toUpperCase(),textContent:text,content:attrs.content||'',alt:attrs.alt||'',title:attrs.title||'',rel:attrs.rel||'',currentSrc:attrs.currentSrc||'',
  getAttribute:key=>attrs[key]===undefined?null:attrs[key],
  closest:parent=>attrs.parent===parent?{tagName:parent}:null
});
const queries={
 'a[href],area[href]':[
  el('a',{href:'story'},'The first story'),el('a',{href:'story'},'A duplicate'),
  el('a',{href:'javascript:alert(1)'},'Unsafe'),el('a',{href:'data:text/html,hi'},'Inline data'),
  el('a',{href:'mailto:hello@example.test'},'Contact')],
 'form[action]':[el('form',{action:'submit'})],
 'img':[el('img',{src:'photo.jpg',alt:'Sample photo',currentSrc:'https://test.example/assets/photo.jpg','data-src':'lazy.webp'})],
 'img[srcset],source[srcset]':[el('img',{srcset:'data:image/png;base64,AAA 1x, small.jpg 640w, large.jpg 1280w'})],
 'video':[el('video',{src:'movie.mp4',poster:'poster.jpg'})],
 'audio':[el('audio',{src:'track.wav'})],
 'source[src]':[el('source',{src:'alternate.webm',parent:'video'}),el('source',{src:'alternate.mp3',parent:'audio'})],
 'script[src]':[el('script',{src:'app.js'})],
 'link[href],link[imagesrcset]':[el('link',{href:'app.css',rel:'stylesheet'}),el('link',{href:'icon.png',rel:'icon'}),el('link',{href:'module.js',rel:'modulepreload'})],
 'iframe[src],frame[src],embed[src],object[data]':[el('iframe',{src:'embedded',title:'Local embed'})],
 '[style]':[el('div',{style:'background:url("background.webp")'})],
 'meta[content]':[el('meta',{name:'description',content:'<img src=x onerror=alert(1)>'})]
};
const labels={};
const scanContext=vm.createContext({
 records:[],skipped:0,document:{title:'Fixture title',baseURI:'https://test.example/assets/',querySelectorAll:s=>queries[s]||[]},
 location:{href:'https://test.example/current',hostname:'test.example',pathname:'/current'},
 performance:{getEntriesByType:()=>[{name:'https://test.example/api/feed',initiatorType:'fetch'}]},
 URL,$:selector=>labels[selector]||(labels[selector]={})
});
vm.runInContext(collectSource+'; function collect(){({records,skipped}=scanDocument(document,location.href,performance));} collect();',scanContext);
const entries=scanContext.records;
const has=(type,value)=>entries.some(x=>x.type===type&&x.value===value);
for(const type of ['Links','Images','Video','Audio','Scripts','Styles','Frames','Metadata','Network']) assert(entries.some(x=>x.type===type),'Missing '+type);
assert.equal(entries.filter(x=>x.type==='Links'&&x.value.endsWith('/story')).length,1,'URLs must dedupe within a category');
assert(has('Links','https://test.example/assets/submit'));
assert(has('Images','https://test.example/assets/small.jpg'));
assert(has('Images','https://test.example/assets/large.jpg'));
assert(!entries.some(x=>/^(data:|javascript:)/.test(x.value)));
assert(!entries.some(x=>x.value.includes('/AAA')),'Data URL fragments must not become fake resources');
assert(has('Metadata','<img src=x onerror=alert(1)>'),'Metadata remains literal text');
assert(has('Network','https://test.example/api/feed'));
queries['a[href],area[href]'].push(el('a',{href:'new-story'},'Added after launch'));
vm.runInContext('collect();',scanContext);
assert(has('Links','https://test.example/assets/story'));
assert(scanContext.records.some(x=>x.value.endsWith('/new-story')),'Rescan discovers new DOM resources');
queries['a[href],area[href]']=Array.from({length:2600},(_,i)=>el('a',{href:'entry/'+i},'Entry '+i));
vm.runInContext('collect();',scanContext);
assert.equal(scanContext.records.length,2500);assert(scanContext.skipped>0);
result.push('Scanner: categories, URL resolution, deduplication, metadata, data URLs, srcset, rescan, cap');

const layoutSource=source.slice(source.indexOf('  function layout(){'),source.indexOf('  function manualCopy'));
const classList={toggle(){}};
const style=()=>({setProperty(name,value){this[name]=value;}});
const makeContext=H=>{
 const nodes={};
 const ctx=vm.createContext({
  H,viewport:null,window:{innerWidth:390},host:{style:style()},sheet:{style:style(),classList},
  viewer:{style:style()},mainHeight:H*.72,previewHeight:H*.37,mini:false,full:false,previewActive:false,
  vh:()=>H,clamp:(n,min,max)=>Math.max(min,Math.min(n,max)),icon:()=>'', 
  $:s=>nodes[s]||(nodes[s]={setAttribute(name,value){this[name]=value;}})
 });vm.runInContext(layoutSource,ctx);return ctx;
};
for(const H of [240,320,420,640,844,932]){
 const c=makeContext(H);vm.runInContext('layout();',c);
 assert(parseFloat(c.sheet.style.height)<=H,'Inspector stays within viewport');
 c.previewActive=true;c.mainHeight=H*.92;vm.runInContext('layout();',c);
 const upper=parseFloat(c.sheet.style.height),peek=parseFloat(c.viewer.style.height);
 assert(upper>0&&peek>0);
 assert(upper+peek<=H+0.01,'Split panels fit '+H);
 assert.equal(parseFloat(c.sheet.style.bottom),peek,'Panels meet without overlap');
 if(H>=640){
  const oldTop=H-upper-peek;
  c.mainHeight-=40;vm.runInContext('layout();',c);
  const newTop=H-parseFloat(c.sheet.style.height)-parseFloat(c.viewer.style.height);
  assert(newTop>oldTop+30,'Main handle actually moves inspector');
  const oldPeek=parseFloat(c.viewer.style.height);
  c.previewHeight-=35;vm.runInContext('layout();',c);
  assert(parseFloat(c.viewer.style.height)<oldPeek-30,'Peek independently resizes');
 }
 c.mini=true;vm.runInContext('layout();',c);assert.equal(c.sheet.style.height,'50px');assert(c.viewer.hidden);
}
result.push('Layout logic: viewport bounds, adjoining panels, independent resize, minimize');

const statusSource=source.slice(source.indexOf('  function showPreview(entry,trigger){'),source.indexOf('  function openExternal(){'));
let activeToken=0;
const nodes={};
const makeNode=tag=>({tagName:tag,children:[],attrs:{},dataset:{},addEventListener(){},append(...children){this.children.push(...children)},setAttribute(name,value){this.attrs[name]=value}});
const previewContext=vm.createContext({
 preferences:{visibility:{inspectpage:true}},previewActive:false,previewReturnHeight:600,mainHeight:600,previewEntry:null,previewToken:0,closed:false,returnFocus:null,
 vh:()=>844,releaseMedia(){previewContext.previewToken++;previewContext.canvas.children=[];},
 canvas:makeNode('canvas'),document:{createElement:makeNode},icon:()=>'',layout(){},updateSelected(){},
 $:s=>nodes[s]||(nodes[s]={})
});
vm.runInContext(statusSource,previewContext);
function preview(type,value,url=true){
 previewContext.entry={type,value,url,label:'Fixture'};
 vm.runInContext('showPreview(entry,null)',previewContext);
 return previewContext.canvas.children[0];
}
assert.equal(preview('Images','https://test.example/photo.jpg').children[0].tagName,'img');
assert.equal(preview('Video','https://test.example/movie.mp4').tagName,'video');
assert.equal(preview('Audio','https://test.example/audio.wav').children[0].tagName,'audio');
const frame=preview('Links','https://test.example/story');
assert.equal(frame.tagName,'iframe');
assert.equal(frame.attrs.sandbox,'allow-scripts allow-forms allow-same-origin');
assert.equal(preview('Metadata','<script>alert(1)</script>',false).textContent,'<script>alert(1)</script>');
assert(nodes['#previewopen'].disabled);
assert.equal(preview('Links','mailto:a@example.test').textContent,'mailto:a@example.test');
result.push('Preview routing: images, video, audio, iframe, literal metadata and unsupported schemes');
console.log(JSON.stringify({passed:result,bookmarkletBytes:Buffer.byteLength(bookmarklet),visualBrowserTest:'blocked by environment; not verified on iOS'},null,2));

