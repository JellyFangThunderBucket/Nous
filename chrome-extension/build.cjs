const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'..','Nous_Source.js'),'utf8');
const hash=crypto.createHash('sha256').update(source).digest('hex');
const prefix=`/* Generated from Nous_Source.js; sha256: ${hash}. Do not edit. */
(() => {
  const id='nous-bookmarklet',previous=document.getElementById(id);
  try{
/* NOUS_SOURCE_START */
`;
const suffix=`
/* NOUS_SOURCE_END */
    const opened=!!document.getElementById(id);
    if(opened===!!previous)throw new Error('The inspector did not change state. Reload this page before trying again.');
    return {ok:true,opened};
  }catch(error){
    const created=document.getElementById(id);
    if(!previous&&created)created.remove();
    return {ok:false,error:error instanceof Error?error.message:String(error)};
  }
})();
`;
fs.writeFileSync(path.join(__dirname,'nous.js'),prefix+source+suffix);
fs.writeFileSync(path.join(__dirname,'source.json'),JSON.stringify({source:'Nous_Source.js',sha256:hash},null,2)+'\n');
