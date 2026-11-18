import * as THREE from 'three';
import {createAvatar,defaultLook,loadCharacters,disposeAvatar,a01Trial,ensureParts} from './real-characters.js';
import {setupStudio} from './designer-studio.js';

export async function setupSocial({scene,camera,renderer,stored,save,toast,getGuest,onEnter,getPhotoContext=()=>({exhibition:'Exhibition not assigned'}),photoWorks=[],getPhotoPose}){
  const $=id=>document.getElementById(id);
  await loadCharacters();
  // The look designer is the full-screen studio (designer-studio.js); this file keeps the photo booth.
  const studio=setupStudio({stored,save,toast,getGuest,onEnter});
  const getLook=()=>studio.getLook();
  $('customAvatar').onclick=()=>studio.openDesigner(false);
  const photoGroup=new THREE.Group();scene.add(photoGroup);
  if(photoWorks.length){$('photoWork').replaceChildren();photoWorks.forEach((work,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=work.name;$('photoWork').append(option)})}
  let savedCamera=null,photoUrl=null;
  function clearPeople(){for(const child of [...photoGroup.children]){disposeAvatar(child);photoGroup.remove(child)}}
  function compose(){
    clearPeople();const subject=$('photoWork').value,companion=$('photoCompanion').value;
    let x,z;const pose=getPhotoPose?.(subject);
    if(getPhotoPose&&!pose){toast('No safe photo position for this work. Choose another work.');$('takePhoto').disabled=true;return}$('takePhoto').disabled=false;
    if(pose){camera.position.fromArray(pose.camera);camera.lookAt(...pose.target);const you=createAvatar(getLook());you.position.fromArray(pose.people[0]);photoGroup.add(you);if(companion!=='solo'&&pose.people[1]){const other=createAvatar({...defaultLook,model:companion==='artist'?(a01Trial?'a01':'male'):'female',top:companion==='artist'&&!a01Trial?'#c8a48a':companion==='artist'?'#ffffff':'#bfc6e1'});other.position.fromArray(pose.people[1]);photoGroup.add(other)}else if(companion!=='solo')toast('This narrow position supports a solo photo only.');for(const person of photoGroup.children)person.lookAt(camera.position.x,person.position.y,camera.position.z);photoUrl=null;$('downloadPhoto').hidden=true;$('photoPreview').hidden=true;return}
    if(subject==='sculpture'){x=-2.4;z=-6.2;camera.position.set(-1.2,1.7,-2.1);camera.lookAt(-2.4,1.35,-6.2)}
    else{x=[-10.1,-8.6,-7.1][Number(subject)];z=-7.82;camera.position.set(x+1.2,1.7,z+4.9);camera.lookAt(x,1.5,z)}
    const you=createAvatar(getLook());you.position.set(subject==='sculpture'?x-1:x-.48,0,subject==='sculpture'?z+.55:z+1.8);photoGroup.add(you);
    if(companion!=='solo'){const other=createAvatar({...defaultLook,model:companion==='artist'?'male':'female',top:companion==='artist'?'#c8a48a':'#bfc6e1'});other.position.set(subject==='sculpture'?x+1:x+.65,0,subject==='sculpture'?z+.55:z+1.8);photoGroup.add(other)}
    for(const person of photoGroup.children)person.lookAt(camera.position.x,0,camera.position.z);
    photoUrl=null;$('downloadPhoto').hidden=true;$('photoPreview').hidden=true;
  }
  $('photoButton').onclick=async()=>{await ensureParts(getLook());savedCamera={position:camera.position.clone(),quaternion:camera.quaternion.clone()};compose();$('photoBooth').showModal()};
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
  return {openDesigner:studio.openDesigner,getLook,update:dt=>photoGroup.children.forEach(p=>p.userData.mixer?.update(dt))};
}
