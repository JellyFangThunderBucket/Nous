'use strict';
const status=document.getElementById('status'),help=document.getElementById('help');
const details=document.getElementById('details'),errorText=document.getElementById('error');
const retry=document.getElementById('retry');
let running=false;
function showFailure(message,detail=''){
  status.textContent=message;help.hidden=false;
  errorText.textContent=detail;details.hidden=!detail;retry.hidden=false;
}
async function launch(){
  if(running)return;
  running=true;retry.disabled=true;help.hidden=true;details.hidden=true;retry.hidden=true;
  status.textContent='Opening the page inspector...';
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab||!Number.isInteger(tab.id)){
      showFailure('No active page is available.');return;
    }
    if(!/^https?:\/\//i.test(tab.url||'')){
      showFailure('Nous opens on HTTP and HTTPS webpages.');return;
    }
    if(/^https?:\/\/(?:chromewebstore\.google\.com|chrome\.google\.com\/webstore)(?:[/?#]|$)/i.test(tab.url)){
      showFailure('Chrome protects its Web Store from extensions.');return;
    }
    const [injection]=await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',files:['nous.js']});
    if(!injection?.result?.ok){
      showFailure('Nous could not open on this page.',injection?.result?.error||'The page did not confirm that the inspector changed state.');return;
    }
    window.close();
  }catch(error){
    showFailure('Chrome could not run Nous on this page.',error instanceof Error?error.message:String(error));
  }finally{
    running=false;retry.disabled=false;
  }
}
retry.addEventListener('click',launch);
launch();
