import * as THREE from 'three';
import {createAvatar,defaultLook,loadCharacters,disposeAvatar,characterOptions,normalizeLook} from './real-characters.js';
import {skinOptions,hairOptions} from './avatar-appearance.js';

export async function setupSocial({scene,camera,renderer,stored,save,toast,getGuest,onEnter,getPhotoContext=()=>({exhibition:'Exhibition not assigned'}),photoWorks=[],getPhotoPose}){
  const $=id=>document.getElementById(id);
  await loadCharacters();
  const fields=$('avatarDesigner').querySelector('.fields');
  fields.replaceChildren();
  function options(id,items){for(const [value,text] of items){const option=document.createElement('option');option.value=value;option.textContent=text;$(id).append(option)}}
  const footwearOptions=[['original','Original fitted footwear'],['sneakers','Textured low-top sneakers'],['boots','Textured tall leather boots']];
  for(const [key,title,items] of [['model','FACE, HAIRSTYLE & FITTED OUTFIT',characterOptions],['skinTone','SKIN TONE',skinOptions],['hairColor','HAIR COLOUR',hairOptions],['build','BUILD · SUBTLE WIDTH ADJUSTMENT',[['slim','Slim'],['balanced','Balanced'],['broad','Broad']]],['eyewear','EYEWEAR',[['none','No glasses'],['optical','Fine-rim glasses'],['sun','Sunglasses']]],['earrings','EARRINGS',[['none','No earrings'],['hoops','Small hoops']]],['watch','WRIST ACCESSORY',[['none','No wrist accessory'],['watch','Metal bracelet']]],['shoes','FOOTWEAR',footwearOptions]]){const label=document.createElement('label');label.textContent=title;const select=document.createElement('select');select.id='look_'+key;label.append(select);fields.append(label);options(select.id,items)}
  for(const [key,title,type] of [['top','TOP / OUTERWEAR TINT','color'],['bottom','LOWER OUTFIT TINT','color'],['shoeColor','FOOTWEAR TINT','color'],['accessoryColor','ACCESSORY COLOUR','color'],['turn','TURN CHARACTER','range']]){const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');input.id='look_'+key;input.type=type;if(type==='range'){input.min=-180;input.max=180}label.append(input);fields.append(label)}
  const original=document.createElement('button');original.className='btn';original.type='button';original.textContent='Original outfit colours';fields.append(original);
  const originalAppearance=document.createElement('button');originalAppearance.className='btn';originalAppearance.type='button';originalAppearance.textContent='Original skin & hair';fields.append(originalAppearance);
  $('avatarDesigner').querySelector('.note').textContent='Skin tone and hair colour are independent of the six fitted presets. Facial detail and original textures are retained. Hairstyles, facial-hair shapes and garment cuts still belong to each preset; build is a subtle width adjustment, not a fitted body type. Saved on this device only.';
  const fitNote=document.createElement('p');fitNote.className='note';fields.after(fitNote);
  const previous=stored('anansiAvatar',{});let look=normalizeLook(previous.model?previous:{model:previous.body==='masculine'?'male':'female'}),preview,entryStep=false;
  let savedLook={...look};
  const backLook=document.createElement('button');backLook.type='button';backLook.className='btn dialog-back';backLook.textContent='← Back to gallery';backLook.onclick=()=>$('avatarDesigner').close();$('avatarDesigner').querySelector('.panel').prepend(backLook);
  const previewScene=new THREE.Scene();previewScene.background=new THREE.Color('#e9f0ed');previewScene.add(new THREE.HemisphereLight('#ffffff','#9b8a73',2));
  const light=new THREE.DirectionalLight('#ffffff',3);light.position.set(2,3,4);previewScene.add(light);
  const previewCamera=new THREE.PerspectiveCamera(36,300/340,.1,20);previewCamera.position.set(0,1.15,3.3);previewCamera.lookAt(0,.96,0);
  const previewRenderer=new THREE.WebGLRenderer({antialias:true});previewRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));previewRenderer.setSize(300,340);$('avatarPreview').append(previewRenderer.domElement);
  previewRenderer.toneMapping=THREE.ACESFilmicToneMapping;
  function updatePreview(){if(preview){previewScene.remove(preview);disposeAvatar(preview)}preview=createAvatar(look);preview.rotation.y=Number(look.turn)*Math.PI/180-.15;previewScene.add(preview);previewRenderer.render(previewScene,previewCamera)}
  const controls=['model','skinTone','hairColor','top','bottom','shoeColor','accessoryColor','shoes','eyewear','earrings','watch','build','turn'];
  function loadFields(){look=normalizeLook(look);for(const key of controls)$('look_'+key).value=look[key];$('look_hairColor').disabled=look.model==='covered';$('look_earrings').disabled=look.model==='covered';$('look_shoes').disabled=look.model==='female';fitNote.textContent=look.model==='covered'?'Hair colour is unavailable with this head covering. Skin-tone changes do not recolour its fabric.':look.model==='female'?'This tailored outfit has integrated tall boots. Choose another fitted outfit to swap footwear.':'Footwear uses textured modelled shoe assets. Original colours preserve their leather, fabric and stitching details.';updatePreview()}
  function openDesigner(entry=false){entryStep=entry;backLook.textContent=entry?'← Back to visit details':'← Back to gallery';$('saveAvatar').textContent=entry?'Enter the gallery →':'Save my look';loadFields();$('avatarDesigner').showModal()}
  $('customAvatar').onclick=()=>openDesigner(false);
  $('closeAvatarDesigner').onclick=()=>$('avatarDesigner').close();
  for(const key of controls)$('look_'+key).oninput=()=>{look[key]=$('look_'+key).value;if(key==='model'||key==='shoes')loadFields();else updatePreview()};
  $('saveAvatar').onclick=()=>{look=normalizeLook(look);if(save('anansiAvatar',look)){savedLook={...look};const enter=entryStep;entryStep=false;$('avatarDesigner').close();if(enter)onEnter();else toast('Your look is saved in this browser.')}};
  $('avatarDesigner').addEventListener('close',()=>{look={...savedLook};if(entryStep){entryStep=false;$('welcome').showModal()}});
  original.onclick=()=>{look.top='#ffffff';look.bottom='#ffffff';look.shoeColor='#ffffff';loadFields()};
  originalAppearance.onclick=()=>{look.skinTone='original';look.hairColor='original';loadFields()};
  const closeUp=document.createElement('button');closeUp.className='btn';closeUp.type='button';closeUp.textContent='View face detail';const feetView=document.createElement('button');feetView.className='btn';feetView.type='button';feetView.textContent='View footwear';$('avatarPreview').append(closeUp,feetView);let viewMode='full';
  function focus(mode){viewMode=viewMode===mode?'full':mode;const face=viewMode==='face',feet=viewMode==='feet';previewCamera.position.set(0,face?1.58:feet?.32:1.15,face?.95:feet?1.05:3.3);previewCamera.lookAt(0,face?1.57:feet?.13:.96,0);closeUp.textContent=face?'View full outfit':'View face detail';feetView.textContent=feet?'View full outfit':'View footwear'}
  closeUp.onclick=()=>focus('face');feetView.onclick=()=>focus('feet');
  let last=performance.now();previewRenderer.setAnimationLoop(now=>{const dt=Math.min((now-last)/1000,.05);last=now;if($('avatarDesigner').open){preview?.userData.mixer?.update(dt);previewRenderer.render(previewScene,previewCamera)}});
  updatePreview();
  const photoGroup=new THREE.Group();scene.add(photoGroup);
  if(photoWorks.length){$('photoWork').replaceChildren();photoWorks.forEach((work,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=work.name;$('photoWork').append(option)})}
  let savedCamera=null,photoUrl=null;
  function clearPeople(){for(const child of [...photoGroup.children]){disposeAvatar(child);photoGroup.remove(child)}}
  function compose(){
    clearPeople();const subject=$('photoWork').value,companion=$('photoCompanion').value;
    let x,z;const pose=getPhotoPose?.(subject);
    if(getPhotoPose&&!pose){toast('No safe photo position for this work. Choose another work.');$('takePhoto').disabled=true;return}$('takePhoto').disabled=false;
    if(pose){camera.position.fromArray(pose.camera);camera.lookAt(...pose.target);const you=createAvatar(look);you.position.fromArray(pose.people[0]);photoGroup.add(you);if(companion!=='solo'&&pose.people[1]){const other=createAvatar({...defaultLook,model:companion==='artist'?'male':'female',top:companion==='artist'?'#c8a48a':'#bfc6e1'});other.position.fromArray(pose.people[1]);photoGroup.add(other)}else if(companion!=='solo')toast('This narrow position supports a solo photo only.');for(const person of photoGroup.children)person.lookAt(camera.position.x,person.position.y,camera.position.z);photoUrl=null;$('downloadPhoto').hidden=true;$('photoPreview').hidden=true;return}
    if(subject==='sculpture'){x=-2.4;z=-6.2;camera.position.set(-1.2,1.7,-2.1);camera.lookAt(-2.4,1.35,-6.2)}
    else{x=[-10.1,-8.6,-7.1][Number(subject)];z=-7.82;camera.position.set(x+1.2,1.7,z+4.9);camera.lookAt(x,1.5,z)}
    const you=createAvatar(look);you.position.set(subject==='sculpture'?x-1:x-.48,0,subject==='sculpture'?z+.55:z+1.8);photoGroup.add(you);
    if(companion!=='solo'){const other=createAvatar({...defaultLook,model:companion==='artist'?'male':'female',top:companion==='artist'?'#c8a48a':'#bfc6e1'});other.position.set(subject==='sculpture'?x+1:x+.65,0,subject==='sculpture'?z+.55:z+1.8);photoGroup.add(other)}
    for(const person of photoGroup.children)person.lookAt(camera.position.x,0,camera.position.z);
    photoUrl=null;$('downloadPhoto').hidden=true;$('photoPreview').hidden=true;
  }
  $('photoButton').onclick=()=>{savedCamera={position:camera.position.clone(),quaternion:camera.quaternion.clone()};compose();$('photoBooth').showModal()};
  $('photoWork').onchange=$('photoCompanion').onchange=compose;
  $('closePhoto').onclick=()=>$('photoBooth').close();
  $('photoBooth').addEventListener('close',()=>{clearPeople();if(savedCamera){camera.position.copy(savedCamera.position);camera.quaternion.copy(savedCamera.quaternion);savedCamera=null}});
  $('takePhoto').onclick=()=>{try{
    const output=document.createElement('canvas');output.width=1200;output.height=1450;
    const ctx=output.getContext('2d');ctx.fillStyle='#fcfaf3';ctx.fillRect(0,0,1200,1450);
    // Render a square photograph rather than cropping the narrow phone viewport.
    const viewport=renderer.getSize(new THREE.Vector2()),aspect=camera.aspect;
    try{renderer.setSize(1060,1060,false);camera.aspect=1;camera.updateProjectionMatrix();renderer.render(scene,camera);const source=renderer.domElement;ctx.drawImage(source,0,0,source.width,source.height,70,70,1060,1060)}finally{renderer.setSize(viewport.x,viewport.y,false);camera.aspect=aspect;camera.updateProjectionMatrix();renderer.render(scene,camera)}
    ctx.fillStyle='#263e37';ctx.font='38px sans-serif';ctx.fillText('anansi',70,1185);
    ctx.font='30px sans-serif';ctx.fillText('a place for things that remain',70,1230);
    const context=getPhotoContext($('photoWork').value);
    ctx.font='28px sans-serif';let title='Exhibition: '+String(context.exhibition||'Exhibition not assigned'),lines=[];
    while(title&&lines.length<2){let line='';while(title&&ctx.measureText(line+title[0]).width<=1060){line+=title[0];title=title.slice(1)}if(lines.length===1&&title){while(ctx.measureText(line+'…').width>1060)line=line.slice(0,-1);line+='…';title=''}lines.push(line)}
    lines.forEach((line,index)=>ctx.fillText(line,70,1280+index*34));
    ctx.font='24px sans-serif';ctx.fillText(getGuest().name+' · '+new Date().toLocaleDateString('en-GB'),70,1360);
    ctx.font='20px sans-serif';ctx.fillStyle='#67756e';ctx.fillText('Presentation keepsake · demo avatars / not real visitors',70,1410);
    photoUrl=output.toDataURL('image/png');$('photoPreview').src=photoUrl;$('photoPreview').hidden=false;$('downloadPhoto').href=photoUrl;$('downloadPhoto').download='anansi-polaroid.png';$('downloadPhoto').hidden=false;
    }catch{toast('This photograph could not be exported. Try light quality or another artwork.');$('downloadPhoto').hidden=true}
  };
  return {openDesigner,getLook:()=>({...look}),update:dt=>photoGroup.children.forEach(p=>p.userData.mixer?.update(dt))};
}
