const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
if(!process.env.NOUS_BASELINE){console.log('Personalize benchmark skipped; set NOUS_BASELINE to the maintained 1.5 source.');process.exit(0);}
const sources=[fs.readFileSync(process.env.NOUS_BASELINE,'utf8'),fs.readFileSync(path.join(__dirname,'..','Nous_Source.js'),'utf8')];
function setup(source){
 const nodes=new Map(),node=()=>({hidden:false,dataset:{},style:{setProperty(){}},classList:{toggle(){}},setAttribute(){}});
 const c=vm.createContext({window:{localStorage:{getItem:()=>null,setItem(){}}},tabs:new Map(['All','Links','Images','Video','Audio','Scripts','Styles','Frames','Metadata','Network'].map(k=>[k,{button:node()}])),
  category:'All',mini:false,peekFrame:null,previewActive:false,closed:false,render(){},layout(){},$:key=>{if(!nodes.has(key))nodes.set(key,node());return nodes.get(key);}});
 vm.runInContext(source.slice(source.indexOf('  const DEFAULTS='),source.indexOf('  let mainHeight=')),c);return c;
}
const states=sources.map(setup),samples=[[],[]],batch=1000;
for(let i=0;i<20;i++)for(const c of states)for(let j=0;j<batch;j++)c.applyPreferences();
for(let i=0;i<61;i++)for(const index of i%2?[1,0]:[0,1]){
 const start=performance.now();for(let j=0;j<batch;j++)states[index].applyPreferences();samples[index].push((performance.now()-start)/batch);
}
const toggle=[];for(let i=0;i<61;i++){const start=performance.now();for(let j=0;j<batch;j++)states[1].changeVisibility('copy',j%2===0);toggle.push((performance.now()-start)/batch);}
const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
console.log(JSON.stringify({method:'Synthetic cached UI nodes; 20 warmups and 61 alternating batches of 1000 preference applications; excludes DOM layout, rendering and real storage latency',baselineMedianMsPerApply:median(samples[0]),personalizeMedianMsPerApply:median(samples[1]),personalizeMedianMsPerToggleIncludingSanitizeSyncAndSave:median(toggle)},null,2));
