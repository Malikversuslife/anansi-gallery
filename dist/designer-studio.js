// Full-screen avatar studio: the guest's character stands in the room, with glass panels around it.
// A category rail on the left, the options for that category on the right (picture cards rendered from the guest's
// own avatar), face sliders, undo / redo / reset, and a save button. The look object is the same one the gallery saves.
import * as THREE from 'three';
import {createAvatar,disposeAvatar,characterOptions,normalizeLook,defaultLook,a01Trial,partsReady,ensureParts,setFace,FACE_SLIDERS} from './real-characters.js';
import {skinOptions,hairOptions,skinColourFor,hairColourFor} from './avatar-appearance.js';
import {snapshot as renderSnapshot} from './snapshot.js';

const svg=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON={
 body:svg('<circle cx="12" cy="4.6" r="2.4"/><path d="M8.5 21l.8-8.5L7 12l1.4-4.6h7.2L17 12l-2.3.5.8 8.5M12 13v8"/>'),
 face:svg('<path d="M12 3c-4 0-6.5 3-6.5 7.5 0 4.6 2.8 8.5 6.5 10.5 3.7-2 6.5-5.9 6.5-10.5C18.5 6 16 3 12 3z"/><path d="M9.3 10.5h.01M14.7 10.5h.01M9.7 15.3c1.4.9 3.2.9 4.6 0"/>'),
 hair:svg('<path d="M5.5 20c-1.4-6.5-.4-15 6.5-15s7.9 8.5 6.5 15"/><path d="M8.5 20c-.2-4.6.7-8.4 3.5-9.7 2.8 1.3 3.7 5.1 3.5 9.7"/>'),
 outfits:svg('<path d="M8.5 3.5 4 5.8l1.6 4.1 2.4-.8V20.5h8V9.1l2.4.8L20 5.8l-4.5-2.3c-.8 1.8-2 2.6-3.5 2.6S9.3 5.3 8.5 3.5z"/>'),
 shoes:svg('<path d="M3 16.5V9.8h5l2.6 3 7.9 1.6c1.6.3 2.5 1.3 2.5 2.6v.5H3zM3 19.5h18"/>'),
 accessories:svg('<circle cx="7" cy="14" r="3.6"/><circle cx="17" cy="14" r="3.6"/><path d="M10.6 13.6c.9-.6 1.9-.6 2.8 0M3.4 13.4 5 7.5M20.6 13.4 19 7.5"/>'),
 colours:svg('<path d="M12 3a9 9 0 1 0 0 18c1.3 0 1.9-1 1.4-2.1-.6-1.2.2-2.4 1.5-2.4H17a4 4 0 0 0 4-4C21 7.4 17 3 12 3z"/><circle cx="7.6" cy="11" r=".9"/><circle cx="10" cy="7.2" r=".9"/><circle cx="15" cy="7.6" r=".9"/>'),
 undo:svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
 redo:svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
 reset:svg('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/>'),
 shuffle:svg('<path d="M3 7h3c5 0 7 10 12 10h3M3 17h3c2 0 3.3-1.6 4.5-3.5M14 9.5C15.2 8 16.4 7 18 7h3M18 4l3 3-3 3M18 14l3 3-3 3"/>'),
 back:svg('<path d="m14.5 5-7 7 7 7"/>'),
 close:svg('<path d="M6 6l12 12M18 6 6 18"/>'),
 turn:svg('<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.5"/><path d="M20 3.5v5h-5"/>')
};

const SHORT={female:'Tied-back hair',male:'Short hair',bob:'Dark bob',polo:'Polo & shorts',curls:'Curly hair',covered:'Head covering',a01:'Original A01',a02:'Original A02'};
const TINTS=[['#ffffff','Original'],['#1d1d1f','Ink'],['#f1ece2','Chalk'],['#3b4a5c','Slate'],['#2f4f45','Forest'],['#6b2f2f','Oxblood'],['#9a4b2f','Terracotta'],['#c49a3c','Ochre'],['#8a6a3d','Tan'],['#5e2a41','Plum'],['#9db7cc','Sky'],['#c9b79c','Oat']];
const LIPS=[['original','Own',null],['#9c6656','Nude'],['#b0545c','Rose'],['#c2414b','Red'],['#a3352b','Brick'],['#8e2f45','Berry'],['#5a2236','Plum'],['#6b3a2e','Cocoa']];
const ORIGINAL_ONLY=new Set(['facialHair','lipColor','hairStyle','topStyle','bottomStyle','outer','bag','headwear','topPrint','bottomPrint']);
const isOriginal=look=>/^a0[12]$/.test(look.model);

// Categories on the rail. Each section is a set of cards (with a framing for its pictures), swatches, or sliders.
function categories(){
 const models=characterOptions.map(([v])=>[v,SHORT[v]||v]);
 return [
  {id:'body',label:'Body',sections:[
   {key:'model',label:'Character',frame:'full',options:models},
   {key:'build',label:'Build',frame:'full',options:[['slim','Slim'],['balanced','Balanced'],['broad','Broad']]},
   {key:'skinTone',label:'Skin tone',swatch:skinOptions.map(([v,l])=>[v,l,v==='original'?null:skinColourFor(v)])}]},
  {id:'face',label:'Face',view:'face',sections:[
   {label:'Shape',sliders:[['faceShape','Face shape','Soft','Angular'],['jaw','Jaw','Narrower','Wider'],['chin','Chin','Softer','Stronger'],['cheeks','Cheekbones','Flatter','Higher']]},
   {label:'Features',sliders:[['nose','Nose width','Narrow','Wide'],['noseLength','Nose length','Shorter','Longer'],['lips','Lips','Thinner','Fuller'],['mouth','Mouth width','Narrower','Wider'],['eyes','Eyes','Smaller','Larger'],['eyeSpacing','Eye spacing','Closer','Wider']],reset:true},
   {key:'lipColor',label:'Lip colour',swatch:LIPS}]},
  {id:'hair',label:'Hair',view:'face',sections:[
   {key:'hairStyle',label:'Hairstyle',frame:'head',options:[['default','This body’s own'],['coils','Short coils'],['straight','Straight, long'],['buzz','Close crop']]},
   {key:'facialHair',label:'Facial hair',frame:'head',options:[['default','This body’s own'],['none','Clean-shaven'],['stubble','Stubble'],['moustache','Moustache'],['goatee','Goatee'],['boxed','Short beard'],['full','Full beard']]},
   {key:'hairColor',label:'Hair colour',swatch:hairOptions.map(([v,l])=>[v,l,v==='original'?null:hairColourFor(v)])}]},
  {id:'outfits',label:'Outfits',chips:true,sections:[
   {key:'topStyle',label:'Tops',frame:'torso',options:[['tee','Crewneck tee'],['knit','Long-sleeve knit'],['quarterzip','Quarter-zip'],['sleeveless','Sleeveless top'],['vneck','V-neck blouse'],['turtleneck','Turtleneck'],['dress','Dress'],['mididress','Midi dress'],['offshoulder','Off-shoulder dress']]},
   {key:'bottomStyle',label:'Bottoms',frame:'legs',options:[['trousers','Pressed trousers'],['wide','Wide pleated'],['slim','Slim cropped'],['shorts','Shorts'],['skirt','Midi skirt'],['mini','Mini skirt'],['pencil','Pencil skirt'],['jeans','Wide jeans']]},
   {key:'outer',label:'Outer layer',frame:'torso',options:[['none','None'],['jacket','Chore jacket'],['zip','Zip jacket'],['leather','Leather jacket'],['harrington','Harrington'],['overcoat','Overcoat'],['cardigan','Cardigan'],['blazer','Blazer'],['longcoat','Long coat'],['bomber','Bomber'],['shearling','Shearling jacket']]},
   {label:'Fabric',groups:[{key:'topPrint',label:'Top',frame:'torso',options:[['plain','Plain'],['wax','Wax print']]},{key:'bottomPrint',label:'Bottoms',frame:'legs',options:[['plain','Plain'],['wax','Wax print']]}]}]},
  {id:'shoes',label:'Shoes',view:'feet',sections:[
   {key:'shoes',label:'Footwear',frame:'feet',options:[['original','Loafers'],['sneakers','Trainers'],['court','Court sneakers'],['boots','Ankle boots'],['workboots','Work boots'],['kneeboots','Knee boots'],['none','Barefoot']]   /* heels (sandals, heelboots) paused: parts not built yet */},
   {key:'shoeColor',label:'Footwear colour',tint:true}]},
  {id:'accessories',label:'Accessories',chips:true,sections:[
   {key:'headwear',label:'Headwear',frame:'head',options:[['none','None'],['wrap','Headwrap'],['cap','Baseball cap'],['fedora','Fedora'],['newsboy','Newsboy cap'],['beret','Beret']]},
   {key:'eyewear',label:'Eyewear',frame:'head',options:[['none','None'],['optical','Fine-rim glasses'],['sun','Sunglasses']]},
   {key:'earrings',label:'Earrings',frame:'head',options:[['none','None'],['hoops','Small hoops'],['links','Link earrings']]},
   {key:'watch',label:'Wrist',frame:'wrist',options:[['none','None'],['watch','Watch']]},
   {key:'bag',label:'Bag',frame:'torso',options:[['none','None'],['crossbody','Crossbody bag'],['hobo','Hobo bag']]}]},
  {id:'colours',label:'Colours',sections:[
   {key:'top',label:'Top & outer layer',tint:true},{key:'bottom',label:'Bottoms',tint:true},
   {key:'shoeColor',label:'Footwear',tint:true},{key:'accessoryColor',label:'Accessories',tint:true}]}
 ];
}

function disabledReason(key,value,look){
 const orig=isOriginal(look);
 if(ORIGINAL_ONLY.has(key)&&!orig)return 'Original bodies only';
 if(key==='bottomStyle'&&['dress','mididress','offshoulder'].includes(look.topStyle))return 'A dress replaces the bottoms';
 if(key==='shoes'&&look.model==='female')return 'This outfit has its own boots';
 if(key==='shoes'&&['none','court','workboots','kneeboots','sandals','heelboots'].includes(value)&&!orig)return 'Original bodies only';
 if(key==='earrings'&&value==='links'&&!orig)return 'Original bodies only';
 if((key==='hairColor'||key==='earrings')&&look.model==='covered')return 'Not with the head covering';
 return '';
}
function categoryNote(cat,look){
 const orig=isOriginal(look);
 if(cat.id==='face')return orig?'The middle of each slider is this body’s own face.':'Face sliders work on the original bodies, A01 and A02.';
 if(cat.id==='outfits'&&!orig)return 'Preset characters keep their fitted outfit. Choose an original body to mix and match.';
 if(cat.id==='body')return 'Skin tone and hair colour are separate choices, never tied to a body.';
 if(cat.id==='colours')return '“Original” keeps each garment’s own colours.';
 return '';
}

export function setupStudio({renderer,stored,save,toast,getGuest,onEnter}){
 const $=id=>document.getElementById(id);
 const dialog=$('avatarDesigner');
 dialog.classList.add('studio');
 dialog.innerHTML=`<div class="st-bg"></div><div class="st-stage" id="avatarPreview"></div><div class="st-loading" id="studioLoading" hidden>Loading this character…</div>
 <header class="st-top"><div class="st-brand">anansi<span>Create your look</span></div>
  <div class="st-tabs" role="tablist" aria-label="Camera">${[['full','Full look'],['face','Face'],['feet','Shoes']].map(([v,l])=>`<button type="button" role="tab" data-view="${v}">${l}</button>`).join('')}</div>
  <div class="st-icons"><button type="button" class="st-icon st-back" id="studioBack"><span>${ICON.back}</span><b>Back</b></button><button type="button" class="st-icon" id="closeAvatarDesigner" aria-label="Close the designer">${ICON.close}</button></div></header>
 <div class="st-card st-id"><img id="studioFace" alt=""><div class="st-id-text"><b id="studioName"></b><small id="studioBody"></small></div><button type="button" class="st-icon" id="studioShuffle" title="Surprise me" aria-label="Surprise me">${ICON.shuffle}</button></div>
 <nav class="st-card st-rail" id="studioRail" aria-label="Designer sections"></nav>
 <section class="st-card st-panel" aria-live="polite"><header class="st-panel-head"><h3 id="studioTitle"></h3><p id="studioNote"></p></header><div class="st-chips" id="studioChips"></div><div class="st-panel-body" id="studioOptions"></div></section>
 <div class="st-card st-turn"><span>${ICON.turn}</span><label>Turn<input type="range" id="studioTurn" min="-180" max="180" step="1"></label></div>
 <div class="st-card st-tools"><button type="button" id="studioUndo">${ICON.undo}<span>Undo</span></button><button type="button" id="studioRedo">${ICON.redo}<span>Redo</span></button><button type="button" id="studioSurprise">${ICON.shuffle}<span>Surprise</span></button><button type="button" id="studioReset">${ICON.reset}<span>Reset</span></button></div>
 <button type="button" class="st-save" id="saveAvatar">Save my look</button>`;

 const CATS=categories();
 const previous=stored('anansiAvatar',{});
 // A first visit starts on the gallery's default body (A02), not a preset that would have to download first.
 let look=normalizeLook(previous.model?previous:previous.body==='masculine'?{model:a01Trial?'a01':'male'}:{model:defaultLook.model});
 let savedLook={...look},entryStep=false,current=CATS[0],chip=0,view='full',autoView=true,past=[],future=[];

 // ---------------------------------------------------------------- the stage
 const stage=$('avatarPreview');
 // The studio borrows the gallery's renderer while it is open (one WebGL context for the page: phones ran out of
 // memory with two, each holding its own copy of every texture). Its canvas moves into the stage and back.
 const home=renderer.domElement.parentElement,clear=new THREE.Color();let clearAlpha=1,looping=false;
 function borrow(){renderer.getClearColor(clear);clearAlpha=renderer.getClearAlpha();renderer.setClearColor(0,0);stage.append(renderer.domElement)}
 function giveBack(){home.append(renderer.domElement);renderer.setClearColor(clear,clearAlpha);renderer.setSize(innerWidth,innerHeight);window.dispatchEvent(new Event('resize'))}
 const scene=new THREE.Scene();
 // The backdrop is drawn in the scene, not seen through a transparent canvas: Safari on iPhone composited the
 // transparent canvas wrongly and the characters came out as dark silhouettes. The atrium photo is drawn small (so it
 // is soft when stretched), darkened like the CSS backdrop, and cropped to fill the stage.
 const backdropImg=new Image();backdropImg.src='assets/gallery-hero.png';
 const backdropCanvas=document.createElement('canvas');const backdrop=new THREE.CanvasTexture(backdropCanvas);backdrop.colorSpace=THREE.SRGBColorSpace;
 let backdropKey='';
 function paintBackdrop(w,h){
  const bw=Math.max(32,Math.round(w/7)),bh=Math.max(32,Math.round(h/7)),key=bw+'x'+bh+backdropImg.complete;
  if(key===backdropKey)return;backdropKey=key;
  backdropCanvas.width=bw;backdropCanvas.height=bh;const c=backdropCanvas.getContext('2d');
  c.fillStyle='#1b2220';c.fillRect(0,0,bw,bh);
  if(backdropImg.complete&&backdropImg.naturalWidth){const iw=backdropImg.naturalWidth,ih=backdropImg.naturalHeight,k=Math.max(bw/iw,bh/ih),dw=iw*k,dh=ih*k;c.globalAlpha=.5;c.drawImage(backdropImg,(bw-dw)/2,(bh-dh)*.4,dw,dh);c.globalAlpha=1}
  const glow=c.createRadialGradient(bw/2,bh*.58,0,bw/2,bh*.58,Math.max(bw,bh)*.55);glow.addColorStop(0,'rgba(255,244,228,.16)');glow.addColorStop(1,'rgba(255,244,228,0)');c.fillStyle=glow;c.fillRect(0,0,bw,bh);
  const fade=c.createLinearGradient(0,0,0,bh);fade.addColorStop(0,'rgba(10,16,15,.35)');fade.addColorStop(.3,'rgba(10,16,15,0)');fade.addColorStop(1,'rgba(10,16,15,.55)');c.fillStyle=fade;c.fillRect(0,0,bw,bh);
  backdrop.needsUpdate=true;scene.background=backdrop;
 }
 backdropImg.onload=()=>{backdropKey='';if(dialog.open)layout()};
 const lights=s=>{s.add(new THREE.HemisphereLight('#fffaf2','#6f6457',1.7));const key=new THREE.DirectionalLight('#fff4e6',2.6);key.position.set(1.6,2.8,3.2);s.add(key);const rim=new THREE.DirectionalLight('#cfe3ff',1.4);rim.position.set(-2.5,2.2,-2.4);s.add(rim);const fill=new THREE.DirectionalLight('#ffffff',.6);fill.position.set(-2,1,3);s.add(fill)};
 lights(scene);
 // A soft contact shadow under the feet.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
 {const c=shadowCanvas.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(0,0,0,.42)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,128)}
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.7),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.002;scene.add(shadow);
 const camera=new THREE.PerspectiveCamera(28,1,.05,30);
 let preview=null,previewToken=0,height=1.75,headY=1.6;

 function measure(avatar){avatar.updateMatrixWorld(true);let head=null;avatar.traverse(o=>{if(!head&&o.isBone&&/^head$/i.test(o.name))head=o});const box=new THREE.Box3().setFromObject(avatar);const h=Math.max(1.2,box.max.y-box.min.y);const hy=head?head.getWorldPosition(new THREE.Vector3()).y+.06:h-.13;return {h:Math.max(h,hy+.12),head:hy}}
 function frameFor(kind,m){const H=m.h;return {full:[H*.5,H*1.12],face:[m.head-.02,.6],head:[m.head-.01,.44],torso:[H*.69,H*.56],legs:[H*.32,H*.72],feet:[.1,.42],wrist:[H*.52,H*.5]}[kind]}
 function layout(){
  const w=stage.clientWidth||innerWidth,h=stage.clientHeight||innerHeight;
  renderer.setSize(w,h,false);camera.aspect=w/h;paintBackdrop(w,h);
  const mobile=w<820;
  // Centre the character in the space the panels leave free.
  // The free band: below the top bar, above the bottom row (desktop) or the rail over the sheet (phones).
  let cx=w/2,top=64,bottom=h-92;
  if(!mobile){const rail=dialog.querySelector('.st-rail').getBoundingClientRect(),panel=dialog.querySelector('.st-panel').getBoundingClientRect();cx=(rail.right+panel.left)/2}
  else{top=58;bottom=dialog.querySelector('.st-rail').getBoundingClientRect().top-6}
  const band=Math.max(160,bottom-top),cy=(top+bottom)/2;
  camera.setViewOffset(w,h,w/2-cx,h/2-cy,w,h);
  const [y,vh]=frameFor(view,{h:height,head:headY});
  const fit=h/band;
  const d=(vh*fit/2)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  camera.position.set(0,y+(view==='full'?.05:.01),d);camera.lookAt(0,y,0);camera.updateProjectionMatrix();
 }
 new ResizeObserver(()=>{if(dialog.open)layout()}).observe(stage);
 dialog.studioParts=()=>({renderer,scene,camera,preview});dialog.studioDebug=()=>({cam:camera.position.toArray().map(v=>+v.toFixed(2)),view:camera.view&&{...camera.view},preview:!!preview,height,headY,size:[stage.clientWidth,stage.clientHeight]});

 function drawPreview(){
  if(preview){scene.remove(preview);disposeAvatar(preview)}
  preview=createAvatar(look);preview.rotation.y=Number(look.turn)*Math.PI/180;scene.add(preview);
  const m=measure(preview);height=m.h;headY=m.head;layout();
 }
 // A look whose parts or preset are still downloading keeps the current character on screen, with a note, and is drawn
 // when they arrive (drawing a stand-in body made it look as if the wrong character had been picked).
 function updatePreview(){
  const token=++previewToken;
  if(partsReady(look)||!preview){$('studioLoading').hidden=true;drawPreview();if(partsReady(look))return}
  else $('studioLoading').hidden=false;
  ensureParts(look).then(()=>{if(token===previewToken){$('studioLoading').hidden=true;drawPreview()}})
 }
 let last=performance.now();
 function frameLoop(now){if(!dialog.open){looping=false;return}const dt=Math.min((now-last)/1000,.05);last=now;preview?.userData.mixer?.update(dt);renderer.render(scene,camera);requestAnimationFrame(frameLoop)}

 // Drag the stage to turn the character.
 let drag=null;
 stage.addEventListener('pointerdown',e=>{drag={x:e.clientX,turn:Number(look.turn)};stage.setPointerCapture(e.pointerId)});
 stage.addEventListener('pointermove',e=>{if(!drag)return;let t=drag.turn+(e.clientX-drag.x)*.6;t=((t+180)%360+360)%360-180;look.turn=Math.round(t);if(preview)preview.rotation.y=look.turn*Math.PI/180;$('studioTurn').value=look.turn});
 stage.addEventListener('pointerup',()=>{drag=null});stage.addEventListener('pointercancel',()=>{drag=null});
 $('studioTurn').oninput=()=>{look.turn=Number($('studioTurn').value);if(preview)preview.rotation.y=look.turn*Math.PI/180};

 // ---------------------------------------------------------------- picture cards, rendered from the guest's own avatar
 const T_W=168,T_H=210;
 // Pictures are drawn by the stage's own renderer (so shaders compile once), into a corner of its canvas, copied out,
 // and the stage is drawn again in the same task, so the corner never shows.
 const snapCanvas=document.createElement('canvas');snapCanvas.width=T_W;snapCanvas.height=T_H;const snapCtx=snapCanvas.getContext('2d');
 function snap(){
  // Off-screen, not read back from the visible canvas (that returned black pictures on some phones).
  return renderSnapshot(renderer,thumbScene,thumbCamera,T_W,T_H,1.5).toDataURL('image/webp',.85);
 }
 const thumbScene=new THREE.Scene();lights(thumbScene);
 const thumbCamera=new THREE.PerspectiveCamera(26,T_W/T_H,.05,30);
 const cache=new Map();let queue=[],busy=false;
 const thumbLook=l=>{const a=normalizeLook({...l});a.turn=0;return a};
 function thumb(l,frame,img){const a=thumbLook(l),key=frame+'|'+JSON.stringify(a);img.dataset.key=key;if(cache.has(key)){img.src=cache.get(key);img.classList.add('ready');return}img.classList.remove('ready');queue.push({key,look:a,frame,img});setTimeout(pump,0)}
 async function pump(){
  if(busy)return;busy=true;
  while(queue.length){
   const job=queue.shift();
   if(!job.img.isConnected||job.img.dataset.key!==job.key)continue;
   if(!cache.has(job.key))try{
    await ensureParts(job.look);
    const av=createAvatar(job.look);av.rotation.y=job.frame==='head'?-.35:-.3;av.userData.mixer?.setTime?.(0);av.userData.mixer?.update(0);thumbScene.add(av);
    const m=measure(av),[y,vh]=frameFor(job.frame,m);const d=(vh/2)/Math.tan(THREE.MathUtils.degToRad(thumbCamera.fov/2));
    thumbCamera.position.set(job.frame==='wrist'?.25:0,y+.02,d);thumbCamera.lookAt(job.frame==='wrist'?.12:0,y,0);
    if(!dialog.open){thumbScene.remove(av);disposeAvatar(av);break}
    const url=snap();
    thumbScene.remove(av);disposeAvatar(av);
    cache.set(job.key,url);if(cache.size>400)cache.delete(cache.keys().next().value);
   }catch(error){console.warn('Studio picture failed',job.frame,error);continue}
   if(job.img.dataset.key===job.key){job.img.src=cache.get(job.key);job.img.classList.add('ready')}
   await new Promise(r=>setTimeout(r,0));
  }
  busy=false;
 }

 // ---------------------------------------------------------------- history
 const snapshot=()=>({...look});
 function commit(before){past.push(before);if(past.length>60)past.shift();future=[];tools()}
 function tools(){$('studioUndo').disabled=!past.length;$('studioRedo').disabled=!future.length}
 function apply(next,{rebuild=true}={}){look=normalizeLook(next);$('studioTurn').value=look.turn;if(rebuild)updatePreview();render();identity()}
 function set(key,value){if(look[key]===value)return;const before=snapshot();apply({...look,[key]:value});commit(before)}
 $('studioUndo').onclick=()=>{if(!past.length)return;future.push(snapshot());apply(past.pop());tools()};
 $('studioRedo').onclick=()=>{if(!future.length)return;past.push(snapshot());apply(future.pop());tools()};
 $('studioReset').onclick=()=>{const before=snapshot();apply({model:look.model,turn:look.turn});commit(before);toast('Back to this body’s own look.')};
 const pick=a=>a[Math.floor(Math.random()*a.length)];
 function surprise(){
  const before=snapshot(),n={...look};
  n.skinTone=pick(skinOptions)[0];n.hairColor=pick(hairOptions)[0];n.build=pick(['slim','balanced','broad']);
  n.top=pick(TINTS)[0];n.bottom=pick(TINTS)[0];n.shoeColor=pick(TINTS)[0];
  if(isOriginal(look)){
   n.hairStyle=pick(['default','coils','straight','buzz']);n.facialHair=look.model==='a01'?pick(['default','none','stubble','moustache','goatee','boxed','full']):(Math.random()<.85?'none':pick(['stubble','moustache']));n.topStyle=pick(['tee','knit','quarterzip','sleeveless','vneck','dress','mididress']);
   n.bottomStyle=pick(['trousers','wide','slim','shorts','skirt','mini']);n.outer=pick(['none','none','jacket','zip','leather','harrington','overcoat','cardigan']);
   n.shoes=pick(['original','sneakers','boots']);n.headwear=Math.random()<.65?'none':pick(['wrap','cap','fedora','newsboy']);
   n.eyewear=Math.random()<.7?'none':pick(['optical','sun']);n.bag=Math.random()<.75?'none':'crossbody';
   n.topPrint=Math.random()<.2?'wax':'plain';n.bottomPrint='plain';
   for(const [k] of FACE_SLIDERS)n[k]=Math.round((Math.random()-.5)*100)/100;
  }
  apply(n);commit(before);
 }
 $('studioShuffle').onclick=$('studioSurprise').onclick=surprise;

 // ---------------------------------------------------------------- identity card
 let idTimer=0;
 function identity(){
  $('studioName').textContent=getGuest?.()?.name||'Your character';
  $('studioBody').textContent=(isOriginal(look)?`Original body · ${look.model.toUpperCase()}`:'Preset character')+` · ${look.build}`;
  clearTimeout(idTimer);idTimer=setTimeout(()=>thumb(look,'head',$('studioFace')),120);
 }

 // ---------------------------------------------------------------- rail and panel
 const rail=$('studioRail');
 for(const cat of CATS){const b=document.createElement('button');b.type='button';b.dataset.cat=cat.id;b.innerHTML=`${ICON[cat.id]}<span>${cat.label}</span>`;b.onclick=()=>{current=cat;chip=0;if(autoView)setView(cat.view||'full',true);render()};rail.append(b)}
 for(const b of dialog.querySelectorAll('.st-tabs button'))b.onclick=()=>{autoView=b.dataset.view==='full';setView(b.dataset.view)};
 function setView(v,auto=false){view=v;if(!auto)autoView=v==='full';for(const b of dialog.querySelectorAll('.st-tabs button')){const on=b.dataset.view===v;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)}layout()}

 function cards(section,host){
  const grid=document.createElement('div');grid.className='st-grid';
  for(const [value,label] of section.options){
   const why=disabledReason(section.key,value,look);
   const b=document.createElement('button');b.type='button';b.className='st-opt';b.disabled=!!why;b.title=why||label;
   const on=look[section.key]===value;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);
   const img=document.createElement('img');img.alt='';const cap=document.createElement('span');cap.textContent=label;
   b.append(img,cap);if(why){const w=document.createElement('em');w.textContent=why;b.append(w)}
   b.onclick=()=>set(section.key,value);grid.append(b);
   if(section.key==='model'){img.src=`assets/characters/thumbs/${value}.webp`;img.onload=()=>img.classList.add('ready')}   // pre-rendered: opening the studio no longer loads every preset
   else thumb({...look,[section.key]:value},section.frame,img);
  }
  host.append(grid);
 }
 function swatches(section,host){
  const row=document.createElement('div');row.className='st-swatches';
  const why=disabledReason(section.key,null,look);
  for(const [value,label,given] of section.swatch){
   const colour=given??(/^#/.test(value)?value:null);
   const b=document.createElement('button');b.type='button';b.className='st-swatch'+(colour?'':' own');b.title=label;b.setAttribute('aria-label',label);b.disabled=!!why;
   if(colour)b.style.setProperty('--c',colour);const on=look[section.key]===value;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);
   b.onclick=()=>set(section.key,value);row.append(b);
  }
  host.append(row);const name=document.createElement('p');name.className='st-caption';name.textContent=why||section.swatch.find(([v])=>v===look[section.key])?.[1]||'';host.append(name);
 }
 function tints(section,host){
  const row=document.createElement('div');row.className='st-swatches';
  for(const [value,label] of TINTS){const b=document.createElement('button');b.type='button';b.className='st-swatch'+(value==='#ffffff'?' own':'');b.title=label;b.setAttribute('aria-label',label);if(value!=='#ffffff')b.style.setProperty('--c',value);const on=look[section.key].toLowerCase()===value;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.onclick=()=>set(section.key,value);row.append(b)}
  const custom=document.createElement('label');custom.className='st-swatch st-custom';custom.title='Any colour';const input=document.createElement('input');input.type='color';input.value=look[section.key];input.setAttribute('aria-label',section.label+': any colour');
  let before=null;input.oninput=()=>{before??=snapshot();look[section.key]=input.value;updatePreview()};input.onchange=()=>{const b=before||snapshot();before=null;apply({...look,[section.key]:input.value});commit(b)};
  custom.append(input);if(!TINTS.some(([v])=>v===look[section.key].toLowerCase())){custom.classList.add('on');custom.style.setProperty('--c',look[section.key])}row.append(custom);host.append(row);
 }
 function sliders(section,host){
  const orig=isOriginal(look);
  for(const [key,label,lo,hi] of section.sliders){
   const box=document.createElement('div');box.className='st-slider';
   const v=Number(look[key])||0;
   box.innerHTML=`<div class="st-slider-head"><b>${label}</b><output>${v===0?'Own':(v>0?hi:lo)+' '+Math.round(Math.abs(v)*100)+'%'}</output></div><input type="range" min="-1" max="1" step=".05" aria-label="${label}: ${lo} to ${hi}"><div class="st-ends"><span>${lo}</span><span>${hi}</span></div>`;
   const input=box.querySelector('input'),out=box.querySelector('output');input.value=v;input.disabled=!orig;
   let before=null;
   input.oninput=()=>{before??=snapshot();let x=Number(input.value);if(Math.abs(x)<.06)x=0;look[key]=x;setFace(preview,look);out.textContent=x===0?'Own':(x>0?hi:lo)+' '+Math.round(Math.abs(x)*100)+'%';input.style.setProperty('--p',(x+1)*50+'%');clearTimeout(idTimer);idTimer=setTimeout(()=>thumb(look,'head',$('studioFace')),250)};
   input.onchange=()=>{const b=before||snapshot();before=null;apply({...look},{rebuild:false});commit(b)};
   input.style.setProperty('--p',(v+1)*50+'%');
   box.ondblclick=()=>{const b=snapshot();look[key]=0;setFace(preview,look);apply({...look},{rebuild:false});commit(b)};
   host.append(box);
  }
  if(!section.reset)return;
  const reset=document.createElement('button');reset.type='button';reset.className='st-link';reset.textContent='Reset the face';reset.disabled=!orig;
  reset.onclick=()=>{const b=snapshot();const n={...look};for(const [k] of FACE_SLIDERS)n[k]=0;apply(n,{rebuild:false});setFace(preview,look);commit(b)};host.append(reset);
 }
 function section(sec,host){
  if(sec.label&&!current.chips){const h=document.createElement('h4');h.textContent=sec.label;host.append(h)}
  if(sec.options)cards(sec,host);else if(sec.swatch)swatches(sec,host);else if(sec.tint)tints(sec,host);else if(sec.sliders)sliders(sec,host);
  else if(sec.groups)for(const g of sec.groups){const h=document.createElement('h4');h.textContent=g.label;host.append(h);cards(g,host)}
 }
 function render(){
  for(const b of rail.children){const on=b.dataset.cat===current.id;b.classList.toggle('on',on);b.setAttribute('aria-current',on?'true':'false')}
  $('studioTitle').textContent=current.label;$('studioNote').textContent=categoryNote(current,look);
  const chips=$('studioChips'),body=$('studioOptions');chips.replaceChildren();
  const scroll=body.scrollTop;body.replaceChildren();
  if(current.chips){
   current.sections.forEach((sec,i)=>{const b=document.createElement('button');b.type='button';b.textContent=sec.label;b.classList.toggle('on',i===chip);b.onclick=()=>{chip=i;render()};chips.append(b)});
   section(current.sections[chip],body);
  }else current.sections.forEach(sec=>section(sec,body));
  chips.hidden=!current.chips;body.scrollTop=scroll;
 }

 // ---------------------------------------------------------------- open, save, close
 function openDesigner(entry=false){
  entryStep=entry;look=normalizeLook(look);past=[];future=[];tools();
  const back=$('studioBack');back.querySelector('b').textContent=entry?'Visit details':'Gallery';
  $('saveAvatar').textContent=entry?'Enter the gallery →':'Save my look';
  $('studioTurn').value=look.turn;current=CATS[0];chip=0;autoView=true;setView('full',true);
  borrow();render();identity();dialog.showModal();requestAnimationFrame(()=>{updatePreview();layout();if(!looping){looping=true;last=performance.now();requestAnimationFrame(frameLoop)}});
 }
 $('studioBack').onclick=()=>dialog.close();
 $('closeAvatarDesigner').onclick=()=>dialog.close();
 $('saveAvatar').onclick=()=>{look=normalizeLook(look);if(save('anansiAvatar',look)){savedLook={...look};const enter=entryStep;entryStep=false;dialog.close();if(enter)onEnter();else toast('Your look is saved in this browser.')}};
 dialog.addEventListener('close',()=>{giveBack();look={...savedLook};if(preview){scene.remove(preview);disposeAvatar(preview);preview=null}queue=[];if(entryStep){entryStep=false;$('welcome').showModal()}});
 dialog.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!/input/i.test(e.target.tagName)){e.preventDefault();(e.shiftKey?$('studioRedo'):$('studioUndo')).click()}});
 return {openDesigner,getLook:()=>({...look})};
}
