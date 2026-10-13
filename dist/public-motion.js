/* A closer reference-led homepage; catalogue routes stay unchanged. */
(() => {
 document.body.classList.add('anansi-public');
 const main=document.getElementById('main');let active=null,revision=0;
 function mount(){
  if(active?.root.isConnected)return;
  active?.dispose();active=null;const version=++revision;
  if(!main.querySelector('.hero-copy'))return;
  import('./reference-home.js?v=5').then(module=>{if(version!==revision||!main.querySelector('.hero-copy'))return;active=module.mountReferenceHome(main)}).catch(()=>{/* Original editorial home remains available if the enhancement cannot load. */});
 }
 new MutationObserver(mount).observe(main,{childList:true});mount();
})();
