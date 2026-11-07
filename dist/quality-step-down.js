// Moves a slow device to Light quality once, shortly after entry, and offers a way back.
// A visitor who has chosen a quality in the Visit guide is never overridden.

const PREFERENCES='anansiVisitPreferences';

// Skips the first seconds, when textures and shaders are still settling, then judges the median frame.
// Time while paused (hidden tab or open dialog) doesn't count. Neither do gaps over a second, which mean an interruption.
export function createFrameWatch({settleMs=2000,sampleMs=5000,slowMs=40,minFrames=10}={}){
 let last=null,settled=0,measured=0,verdict=null;const gaps=[];
 return (now,paused=false)=>{
  if(verdict)return verdict;
  if(paused||last===null){last=paused?null:now;return null}
  const gap=now-last;last=now;
  if(gap<=0||gap>1000)return null;
  if(settled<settleMs){settled+=gap;return null}
  gaps.push(gap);measured+=gap;
  if(measured<sampleMs||gaps.length<minFrames)return null;
  const median=[...gaps].sort((a,b)=>a-b)[gaps.length>>1];
  verdict=median>slowMs?'slow':'ok';
  return verdict;
 };
}

export function setupQualityStepDown({stored,save,setQuality,toast}){
 const chosen=()=>stored(PREFERENCES,{}).quality;
 if(chosen())return null;
 const note=document.createElement('div');note.id='qualityNote';note.setAttribute('role','status');document.body.append(note);
 let timer=0;
 const close=()=>{clearTimeout(timer);note.classList.remove('open');note.replaceChildren()};
 const show=()=>{
  const text=document.createElement('p');text.textContent='Switched to Light quality so the gallery moves more smoothly on this device. You can change this any time in the Visit guide.';
  const back=document.createElement('button');back.type='button';back.textContent='Use Balanced';back.onclick=()=>{close();save(PREFERENCES,{quality:'balanced'});setQuality('balanced');toast('Balanced quality is back on.')};
  const keep=document.createElement('button');keep.type='button';keep.textContent='Keep Light';keep.onclick=close;
  note.replaceChildren(text,back,keep);note.classList.add('open');
  timer=setTimeout(close,20000);
 };
 const watch=createFrameWatch();let finished=false;
 return now=>{
  if(finished)return;
  const verdict=watch(now,document.hidden||!!document.querySelector('dialog[open]'));
  if(!verdict)return;
  finished=true;
  if(verdict!=='slow'||chosen())return;
  save(PREFERENCES,{quality:'light',auto:true});setQuality('light');show();
 };
}
