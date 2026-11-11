// Optional synthetic Peek benchmark; never substitutes for real iPhone measurements.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
if(!process.env.NOUS_BASELINE){console.log('Peek benchmark skipped; set NOUS_BASELINE to the stable source path.');process.exit(0);}
const codes=[fs.readFileSync(process.env.NOUS_BASELINE,'utf8'),fs.readFileSync(path.join(__dirname,'..','Nous_Source.js'),'utf8')];
function make(code){
 const nodes={},node=()=>({children:[],dataset:{},append(...x){this.children.push(...x);},setAttribute(){},addEventListener(){}});
 const c=vm.createContext({previewActive:false,mainHeight:600,previewReturnHeight:600,previewToken:0,closed:false,returnFocus:null,
  canvas:node(),document:{createElement:node},vh:()=>844,icon:()=>'',layout(){},updateSelected(){},
  releaseMedia(){c.previewToken++;c.canvas.children=[];},$:s=>nodes[s]||(nodes[s]={})});
 vm.runInContext(code.slice(code.indexOf('function showPreview('),code.indexOf('function openExternal(')),c);
 return ()=>c.showPreview({type:'Images',value:'https://example.test/photo.jpg',source:'img.currentSrc',url:true,label:'Fixture'},null);
}
const run=codes.map(make),samples=[[],[]],batch=1000;
for(let k=0;k<20;k++)for(const f of run)for(let i=0;i<batch;i++)f();
for(let k=0;k<61;k++)for(const index of k%2?[1,0]:[0,1]){
 const start=performance.now();for(let i=0;i<batch;i++)run[index]();samples[index].push((performance.now()-start)/batch);
}
const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
console.log(JSON.stringify({method:'Synthetic image Peek; 20 warmup batches and 61 alternating batches of 1,000; excludes browser layout, network and iPhone',baselineMedianMsPerPreview:median(samples[0]),traceMedianMsPerPreview:median(samples[1])},null,2));
