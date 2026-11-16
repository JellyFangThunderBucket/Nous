const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','Nous_Source.js'),'utf8');
const baseline=process.env.NOUS_BASELINE&&fs.readFileSync(process.env.NOUS_BASELINE,'utf8');
if(baseline){
 const block=s=>s.slice(s.indexOf('  function scanDocument('),s.indexOf('  function livePage('));
 assert.equal(block(source),block(baseline),'Normal discovery remains byte-identical');
}
const state=vm.createContext({URL,host:{},viewport:null,vh:()=>800});
vm.runInContext(source.slice(source.indexOf('  function revealReferences('),source.indexOf('  let revealSession=')),state);
function doc(base='https://example.test/assets/'){
 const page={baseURI:base,elements:[]};
 page.createTreeWalker=()=>{let index=0;return {currentNode:page.elements[0]||null,nextNode:()=>page.elements[++index]||null};};
 return page;
}
function node(page,localName,attrs={},extra={}){
 const el={localName,ownerDocument:page,attributes:Object.entries(attrs).map(([name,value])=>({name,value})),closest:()=>null,...extra};
 page.elements.push(el);page.documentElement=page.elements[0];return el;
}
const page=doc(),url='https://example.test/hero.svg?sig=a%2Bb&x=1#part';
const image=node(page,'img',{src:'../hero.svg?sig=a%2Bb&x=1#part',srcset:'data:image/png;base64,AAAA 1x, ../hero.svg?sig=a%2Bb&x=1#part 2x'},{currentSrc:url});
node(page,'img',{src:'../hero.svg?sig=a%2Bb&x=2#part'});node(page,'a',{href:'../hero.svg?sig=a%2Bb&x=1#other'});
assert.deepEqual(Array.from(state.revealReferences(image,url)),['currentSrc','src','srcset']);
node(page,'div',{'data-src':url,style:'background:url("'+url+'")'});
assert.equal(state.findRevealMatches(page,url).matches.length,2);
const video=node(page,'video',{src:'/clip.mp4'});
node(page,'source',{src:'/clip.mp4'},{closest:()=>video});
const found=state.findRevealMatches(page,'https://example.test/clip.mp4');
assert.equal(found.matches.length,1);assert.equal(found.matches[0].element,video);assert.equal(found.matches[0].references.length,2);
const picture=node(page,'picture',{}, {querySelector:()=>image});
node(page,'source',{srcset:'../hero.svg?sig=a%2Bb&x=1#part 1x'},{closest:selector=>selector==='picture'?picture:null});
assert.equal(state.findRevealMatches(page,url).matches[0].references.length,2);
const embedded=doc('https://example.test/frames/');node(embedded,'img',{src:'../hero.svg?sig=a%2Bb&x=1#part'});
const frame=node(page,'iframe',{}, {contentDocument:embedded});
Object.defineProperty(node(page,'iframe'),'contentDocument',{get(){throw Error('SecurityError');}});
const result=state.findRevealMatches(page,url);
assert.equal(result.matches.length,3);assert.equal(result.matches[2].frames[0],frame);
const unrelated=doc('https://other.test/');node(unrelated,'img',{src:'/hero.svg?sig=a%2Bb&x=1#part'});assert.equal(state.findRevealMatches(unrelated,url).matches.length,0);
const duplicates=doc();for(let i=0;i<200;i++)node(duplicates,'img',{src:url});
assert.equal(state.findRevealMatches(duplicates,url).matches.length,100);assert(state.findRevealMatches(duplicates,url).limited);
const large=doc();for(let i=0;i<20001;i++)node(large,'div');node(large,'a',{href:url});
assert.equal(state.findRevealMatches(large,url).matches.length,0);assert(state.findRevealMatches(large,url).limited);
const frames=doc();for(let i=0;i<25;i++){const child=doc();node(child,'a',{href:url});node(frames,'iframe',{}, {contentDocument:child});}
assert.equal(state.findRevealMatches(frames,url).matches.length,20);
console.log('Passed exact URL/source/srcset/style matching, media/picture deduplication, CSS bases, frame access boundaries, bounded matches/nodes/frames and unchanged normal scanner.');
state.host.clientWidth=390;
const styles={visibility:'visible',opacity:'1',overflowX:'visible',overflowY:'visible'};
function measured(rect,extra={}){
 return {localName:'img',isConnected:true,parentElement:null,ownerDocument:{defaultView:{getComputedStyle:el=>({...styles,...el.computed})}},getClientRects:()=>[rect],getBoundingClientRect:()=>rect,...extra};
}
const geometry=el=>state.revealGeometry({element:el,frames:[]});
const target=measured({left:10,top:10,right:30,bottom:30,width:20,height:20});
assert.equal(geometry(target).state,'Visible reference');
assert.equal(geometry({...target,computed:{opacity:'0'}}).state,'Hidden');
assert.equal(geometry({...target,isConnected:false}).state,'Removed from page');
assert.equal(geometry({...target,localName:'script'}).state,'Declaration only');
const clip=measured({left:0,top:0,right:50,bottom:5,width:50,height:5},{computed:{overflowY:'hidden'},offsetWidth:50,offsetHeight:5,clientWidth:50,clientHeight:5,clientLeft:0,clientTop:0});
assert.equal(geometry({...target,parentElement:clip}).state,'Off screen or clipped');
const scaled=measured({left:10,top:20,right:210,bottom:220,width:200,height:200},{localName:'iframe',offsetWidth:100,offsetHeight:100,clientWidth:96,clientHeight:96,clientLeft:2,clientTop:2});
const framed=state.revealGeometry({element:target,frames:[scaled]});
assert.equal(framed.left,34);assert.equal(framed.top,44);assert.equal(framed.width,40);assert.equal(framed.height,40);
console.log('Passed rendered/hidden/declaration/removed geometry, ancestor clipping and scaled frame offsets.');
