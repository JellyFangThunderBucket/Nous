const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(process.env.NOUS_SOURCE || path.join(__dirname,'..','Nous_Source.js'),'utf8');
function scanner(code,fixture,SetClass=Set){
  const section=code.slice(code.indexOf('  function scanDocument('),code.indexOf('  function livePage('));
  const context=vm.createContext({URL,Set:SetClass});
  vm.runInContext(section,context);
  return context.scanDocument(fixture,fixture.URL,null);
}
function element(tag,attrs={},text=''){
  return {
    tagName:tag.toUpperCase(),textContent:text,alt:attrs.alt||'',rel:attrs.rel||'',
    content:attrs.content||'',currentSrc:attrs.currentSrc||'',
    getAttribute:key=>Object.hasOwn(attrs,key)?attrs[key]:null,
    closest:parent=>attrs.parent===parent?{tagName:parent}:null
  };
}
function fixture(map={},url='https://example.test/docs/page',base='https://cdn.test/assets/'){
  return {URL:url,baseURI:base,title:'Fixture',querySelector:()=>null,querySelectorAll:selector=>map[selector]||[]};
}
const picture=element('source',{srcset:'./wide.jpg?x=1#part 1600w, ./wide.jpg?x=2#part 2x'});
const image=element('img',{src:'./fallback.jpg',currentSrc:'https://cdn.test/assets/wide.jpg?x=1#part',srcset:'data:image/png;base64,AAA 1x, ./small%2Cblue.jpg?size=1#one 640w'});
const audio=element('source',{src:'./sound.mp3',parent:'audio'});
const video=element('source',{src:'./clip.mp4',parent:'video'});
const map={
  'a[href],area[href]':[
    element('a',{href:'../guide?edition=1#one'},'Guide'),
    element('a',{href:'../guide?edition=1#one'},'Duplicate'),
    element('a',{href:'../guide?edition=1#two'},'Distinct fragment'),
    element('a',{href:'../guide?edition=2#one'},'Distinct query'),
    element('a',{href:'https://elsewhere.test/a%2Cb'},'Encoded')
  ],
  'img':[image],
  'img[srcset],source[srcset]':[picture,image],
  'source[src]':[audio,video]
};
let result=scanner(source,fixture(map));
const has=(type,url)=>result.records.some(entry=>entry.type===type&&entry.value===url);
assert(has('Links','https://cdn.test/guide?edition=1#one'));
assert(has('Links','https://cdn.test/guide?edition=1#two'));
assert(has('Links','https://cdn.test/guide?edition=2#one'));
assert(has('Links','https://elsewhere.test/a%2Cb'));
assert.equal(result.records.filter(entry=>entry.type==='Links'&&entry.value==='https://cdn.test/guide?edition=1#one').length,1);
assert(has('Images','https://cdn.test/assets/small%2Cblue.jpg?size=1#one'));
assert(has('Images','https://cdn.test/assets/wide.jpg?x=1#part'));
assert.equal(result.records.filter(entry=>entry.type==='Images'&&entry.value==='https://cdn.test/assets/wide.jpg?x=1#part').length,1);
assert(has('Audio','https://cdn.test/assets/sound.mp3'));
assert(has('Video','https://cdn.test/assets/clip.mp4'));
assert(!result.records.some(entry=>entry.value.startsWith('data:')));
const empty=fixture();empty.title='';
result=scanner(source,empty);
assert.deepEqual(Array.from(result.records,entry=>entry.label),['Page title','Page address']);
map['a[href],area[href]'].push(element('a',{href:'/new'},'Added later'));
assert(scanner(source,fixture(map)).records.some(entry=>entry.value==='https://cdn.test/new'));
const pretrained=element('link',{rel:'preload',as:'image',imagesrcset:'/hero-1.jpg 1x, /hero-2.jpg 2x'});
map['link[href],link[imagesrcset]']=[pretrained];
assert(scanner(source,fixture(map)).records.some(entry=>entry.value==='https://cdn.test/hero-2.jpg'));
const duplicateAfterCap=Array.from({length:2600},(_,i)=>element('a',{href:'/resource/'+i},'Resource'));
const bigFixture=fixture({'a[href],area[href]':duplicateAfterCap,'link[href],link[imagesrcset]':[pretrained]});
const big=scanner(source,bigFixture);
assert.equal(big.records.length,2500);
assert(big.skipped>0);
assert(!big.records.some(entry=>entry.value.includes('hero-2')));
if(process.env.NOUS_BASELINE){
  const baseline=fs.readFileSync(process.env.NOUS_BASELINE,'utf8');
  const old=scanner(baseline,bigFixture);
  assert.equal(JSON.stringify(big.records),JSON.stringify(old.records),'Existing records retain their order at the cap');
}
console.log('Passed relative URLs, base paths, distinct queries and fragments, encoded characters, srcset/currentSrc deduplication, picture, audio/video source, empty and dynamic pages, and cap behavior.');

