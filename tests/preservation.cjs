const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
if(!process.env.NOUS_BASELINE){
  console.log('Preservation comparison skipped; set NOUS_BASELINE to the Nous 1.3 source path.');
  process.exit(0);
}
const baseline=fs.readFileSync(process.env.NOUS_BASELINE,'utf8');
const current=fs.readFileSync(path.join(__dirname,'..','Nous_Source.js'),'utf8');
const blocks=[
  ['markup and styles','  root.innerHTML = `','`;\n  document.documentElement.appendChild(host);'],
  ['icons and brand mark','  const icons = {','  root.innerHTML = `'],
  ['panel geometry','  function layout(){','  function manualCopy(text){'],
  ['touch and resize handling','  function resizeHandle(',"  resizeHandle($('#grab')"],
  ['categories and ordering','  const categories=','  const categoryIcons=']
];
for(const [name,start,end] of blocks){
  const section=source=>{
    const first=source.indexOf(start),last=source.indexOf(end,first);
    assert(first>=0&&last>first,`Missing ${name} block`);
    return source.slice(first,last);
  };
  assert.equal(section(current),section(baseline),`${name} changed`);
}
for(const name of ['Nous_Brand.svg','Nous_Brand.png']){
  const oldFile=path.join(path.dirname(process.env.NOUS_BASELINE),name);
  assert.deepEqual(fs.readFileSync(path.join(__dirname,'..',name)),fs.readFileSync(oldFile),`${name} changed`);
}
console.log('Passed baseline comparison of UI template, icons, categories, geometry, touch handling and brand files.');
