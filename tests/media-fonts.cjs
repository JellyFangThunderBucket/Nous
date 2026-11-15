const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../Nous_Source.js','utf8');
const section=source.slice(source.indexOf('  function scanDocument('),source.indexOf('  function livePage('));
const context=vm.createContext({URL,Set,Map});vm.runInContext(section,context);
function el(tag,attrs={},extra={}){return {tagName:tag.toUpperCase(),rel:attrs.rel||'',textContent:'',attributes:Object.entries(attrs).map(([name,value])=>({name,value})),getAttribute:n=>attrs[n]||null,closest:n=>attrs.parent===n?{}:null,...extra};}
const videos=[el('video',{src:'../hidden.mp4?sig=a%2Bb&x=1#t=2'}),el('video',{src:'/extensionless'}),el('video',{src:'blob:dead'}),el('video',{src:'blob:live'},{currentSrc:'blob:live',readyState:2})];
const sources=['/alternate.mov','/stream.m3u8','/stream.mpd','/part.m4s','/seg.ts','/chunk-1.mp4','/sound.mp3','/thumb.jpg'].map(src=>el('source',{src,parent:'video'}));
const preload=el('link',{href:'/font-endpoint',rel:'preload',as:'font'});
const json=el('script',{}, {textContent:JSON.stringify({sources:[{file:'./player-endpoint',type:'video/mp4'},{file:'/audio',type:'audio/mp4'}],poster:'/poster.mp4'})});
function face(src){return {type:5,style:{getPropertyValue:key=>({'src':src,'font-family':'Example','font-weight':'700','font-style':'italic'}[key]||'')}};}
const imported={href:'https://cdn.test/css/import.css',cssRules:[face('url(../fonts/subset.woff2) format("woff2")')]};
const map={'video':videos,'source[src]':sources,'link[href],link[imagesrcset]':[preload],'script:not([src])':[json],'*':[...videos,...sources,preload,json]};
const doc={URL:'https://page.test/path/index',baseURI:'https://page.test/path/',title:'Test',querySelector:()=>null,querySelectorAll:s=>map[s]||[],styleSheets:[{get cssRules(){throw Error('SecurityError');}},{href:'https://cdn.test/css/main.css',cssRules:[face('local("System")'),face('url(../fonts/main.woff2?sig=a%2Bb#subset) format("woff2"), url(data:font/woff2;base64,AAAA)'),face('url(../fonts/endpoint)'),{styleSheet:imported}]}]};
const timing={getEntriesByType:()=>[{name:'https://cdn.test/fonts/main.woff2?sig=a%2Bb#subset'},{name:'https://cdn.test/only.ttf'},{name:'https://page.test/timed.webm'},{name:'https://page.test/mime-font',contentType:'font/woff2'},{name:'https://page.test/mime-video',contentType:'video/mp4'}]};
const entries=context.scanDocument(doc,doc.URL,timing).records;
const video=entries.filter(x=>x.type==='Video'),fonts=entries.filter(x=>x.font);
for(const url of ['https://page.test/hidden.mp4?sig=a%2Bb&x=1#t=2','https://page.test/extensionless','https://page.test/alternate.mov','https://page.test/stream.m3u8','https://page.test/stream.mpd','https://page.test/path/player-endpoint','https://page.test/timed.webm','https://page.test/mime-video','blob:live'])assert(video.some(x=>x.value===url),url);
for(const url of ['blob:dead','/part.m4s','/seg.ts','/chunk-1.mp4','/sound.mp3','/thumb.jpg','/audio','/poster.mp4'])assert(!video.some(x=>x.value.endsWith(url)),url);
assert(video.find(x=>x.value==='blob:live').label.includes('Session only'));
assert(video.find(x=>x.value.endsWith('.mpd')).manifest);
for(const url of ['https://cdn.test/fonts/main.woff2?sig=a%2Bb#subset','https://cdn.test/fonts/endpoint','https://cdn.test/fonts/subset.woff2','https://page.test/font-endpoint','https://cdn.test/only.ttf','https://page.test/mime-font'])assert(fonts.some(x=>x.value===url),url);
assert.equal(fonts.length,6);
assert(fonts[0].label.includes('700'));
assert(fonts.find(x=>x.value.includes('main.woff2')).source.includes('Performance API'));
assert(fonts.every(x=>/^https?:/.test(x.value)&&x.label.includes('Font')));
console.log('Passed focused video/font discovery, CSS bases/imports, blocked CSSOM, signed URLs, MIME/context, deduplication, and exclusion checks.');
