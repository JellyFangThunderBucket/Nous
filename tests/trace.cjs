const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'..');
let source=fs.readFileSync(path.join(base,'Nous_Source.js'),'utf8');
const entry=process.env.NOUS_ENTRY||'source';
if(entry==='bookmarklet')source=fs.readFileSync(path.join(base,'Nous_Bookmarklet.txt'),'utf8').trim().slice(11);
if(entry==='preview')source=JSON.parse(fs.readFileSync(path.join(base,'Nous_Preview.html'),'utf8').match(/const code=("(?:\\.|[^"\\])*");/)[1]);
const scanContext=vm.createContext({URL});
vm.runInContext(source.slice(source.indexOf('function scanDocument('),source.indexOf('function livePage(')),scanContext);
function el(tag,attrs={}){return {tagName:tag.toUpperCase(),textContent:'Fixture',title:'Fixture',alt:'Fixture',rel:attrs.rel||'',content:attrs.content||'',currentSrc:attrs.currentSrc||'',getAttribute:key=>attrs[key]??null,closest:tag=>attrs.parent===tag?{}:null};}
const queries={
 'a[href],area[href]':[el('a',{href:'/page'})],
 'img':[el('img',{src:'/duplicate.jpg',currentSrc:'https://example.test/duplicate.jpg'}),el('img',{currentSrc:'https://example.test/current.jpg'})],
 'img[srcset],source[srcset]':[el('source',{srcset:'/responsive.jpg 2x'})],
 'video':[el('video',{src:'/video.mp4'}),el('video',{currentSrc:'https://example.test/current.mp4'})],
 'audio':[el('audio',{src:'/audio.mp3'}),el('audio',{currentSrc:'https://example.test/current.mp3'})],
 'script[src]':[el('script',{src:'/code.js'})],
 'link[href],link[imagesrcset]':[el('link',{href:'/style.css',rel:'stylesheet'}),el('link',{href:'/preload.jpg',rel:'preload',as:'image',imagesrcset:'/preload-large.jpg 2x'})],
 'iframe[src],frame[src],embed[src],object[data]':[el('iframe',{src:'/frame'})],
 'meta[content]':[el('meta',{name:'description',content:'<img src=x onerror=alert(1)>'})]
};
const doc={URL:'https://example.test/',baseURI:'https://example.test/',title:'Fixture',querySelector:()=>null,querySelectorAll:s=>queries[s]||[]};
const records=scanContext.scanDocument(doc,doc.URL,{getEntriesByType:()=>[{name:'https://example.test/fetched',initiatorType:'fetch'}]}).records;
const nodes={};
const node=tag=>({tagName:tag,children:[],dataset:{},events:{},append(...items){this.children.push(...items);},setAttribute(){},addEventListener(name,fn){this.events[name]=fn;}});
const state=vm.createContext({previewActive:false,mainHeight:600,previewReturnHeight:600,previewToken:0,closed:false,returnFocus:null,
 canvas:node('canvas'),vh:()=>844,document:{createElement:node},icon:()=>'',layout(){},updateSelected(){},
 releaseMedia(){state.previewToken++;state.canvas.children=[];state.peekFrame=null;},
 readablePreview(){},updatePreviewAddress(){},previewUrl:()=>state.previewEntry.value,
 $:s=>nodes[s]||(nodes[s]={})});
vm.runInContext(source.slice(source.indexOf('function showPreview('),source.indexOf('function openExternal(')),state);
let checks=0;
const foot=()=>nodes['#previewfoot'].textContent;
function open(resource){state.resource=resource;vm.runInContext('showPreview(resource,null)',state);return state.canvas.children[0];}
for(const [suffix,method] of [
 ['/page','a[href]'],['/duplicate.jpg','img[src]'],['/current.jpg','img.currentSrc'],['/responsive.jpg','srcset'],
 ['/video.mp4','video[src]'],['/current.mp4','video.currentSrc'],['/audio.mp3','audio[src]'],['/current.mp3','audio.currentSrc'],
 ['/code.js','script[src]'],['/style.css','link[rel]'],['/frame','iframe[src]'],['/fetched','Performance API'],
 ['/preload-large.jpg','link[imagesrcset]']]){
 const resource=records.find(r=>r.value.endsWith(suffix));assert(resource,suffix);assert.equal(resource.source,method);
 open(resource);assert(foot().includes('Discovered via '+method),foot());checks++;
}
assert.equal(records.filter(r=>r.value.endsWith('/duplicate.jpg')).length,1);checks++;
for(const method of ['meta','document.title','location']){
 const resource=records.find(r=>r.source===method);const preview=open(resource);
 assert.equal(foot(),'Discovered via '+method);assert.equal(preview.textContent,resource.value);checks++;
}
for(const bad of [undefined,'','img[unknown]','<script>alert(1)</script>',{},'network origin']){
 open({type:'Images',value:'https://example.test/image.jpg',label:'Fixture',url:true,source:bad});
 assert.equal(foot(),'Image preview · drag the handle for more room.');checks++;
}
const resource=(type,source,value='https://example.test/item')=>({type,source,value,label:'Fixture',url:true});
const oldImage=open(resource('Images','img[src]')).children[0];
oldImage.onerror();assert.equal(foot(),'Image unavailable here. Try Open.');checks++;
const oldVideo=open(resource('Video','video[src]'));
assert.match(foot(),/May not play/);oldVideo.onerror();assert.equal(foot(),'This source cannot play here. Try Open.');checks++;
const oldAudio=open(resource('Audio','audio[src]')).children[0];
oldAudio.onerror();assert.equal(foot(),'This source cannot play here. Try Open.');checks++;
open(resource('Images','img.currentSrc'));const current=foot();
oldImage.onerror();oldVideo.onerror();oldAudio.onerror();assert.equal(foot(),current);checks++;
const activeImage=state.canvas.children[0].children[0];
state.closed=true;activeImage.onerror();assert.equal(foot(),current);state.closed=false;checks++;
const frame=open(resource('Links','a[href]'));
assert.match(foot(),/If blocked, use Open/);const warning=foot();frame.events.load();assert.equal(foot(),warning);checks++;
// Inspection status has priority; the existing frame load callback cannot restore Trace.
nodes['#previewfoot'].textContent='Browser access blocked or page unavailable. Open it and run Nous there.';
frame.events.load();assert.match(foot(),/^Browser access blocked/);checks++;
open(resource('Links','a[href]','mailto:a@example.test'));assert.equal(foot(),'Link scheme shown as text. Copy it to use elsewhere.');checks++;
// Close/reopen invalidates old callbacks and derives the explanation afresh.
state.previewActive=false;state.previewToken++;open(resource('Images','srcset'));const reopened=foot();oldImage.onerror();assert.equal(foot(),reopened);checks++;
console.log(`Passed ${checks} Trace checks (${entry}): retained discovery metadata, duplicates, safe omission, preview warnings/errors, stale callbacks and reopen.`);
