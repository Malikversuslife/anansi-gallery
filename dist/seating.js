import * as THREE from 'three';
import {createAvatar,seatedPose,defaultLook} from './real-characters.js';
export function setupSeating({scene,camera,targets,toast,setView}){
 const seats=[{x:-6.35,owner:null},{x:-5.5,owner:null},{x:-4.65,owner:'Demo guest'}];let selected=null;
 const dialog=document.createElement('dialog');dialog.id='seating';const panel=document.createElement('div');panel.className='panel';dialog.append(panel);document.body.append(dialog);
 const stand=document.createElement('button');stand.id='standButton';stand.className='pill';stand.textContent='Stand up';stand.hidden=true;document.querySelector('.hud').append(stand);
 const open=document.createElement('button');open.id='seatingButton';open.className='pill';open.textContent='Seating';document.querySelector('.hud').append(open);
 function standUp(){if(selected===null)return;seats[selected].owner=null;selected=null;stand.hidden=true;setView([-5.5,1.7,-4.7],0,'By the viewing bench');toast('You stood up. The seat is vacant again.');sync()}
 function sit(index){if(seats[index].owner){toast('That seat is occupied. Choose a vacant seat.');return}if(selected!==null)seats[selected].owner=null;selected=index;seats[index].owner='You';stand.hidden=false;setView([seats[index].x,1.31,-6.80],Math.atan2(seats[index].x+8.6,1.02),'Seated · viewing bench');dialog.close();toast('You are seated. Drag to look; stand up before walking.');sync()}
 function sync(){
  panel.replaceChildren();const close=document.createElement('button');close.className='close';close.textContent='×';close.setAttribute('aria-label','Close seating');close.onclick=()=>dialog.close();panel.append(close);
  const back=document.createElement('button');back.type='button';back.className='btn dialog-back';back.textContent='← Back to gallery';back.onclick=()=>dialog.close();panel.append(back);
  const title=document.createElement('h2');title.textContent='The viewing bench';panel.append(title);
  const note=document.createElement('p');note.textContent='Choose a vacant seat. Occupancy here is local presentation state; the third seat has a fictional demo guest, not a live visitor.';panel.append(note);
  seats.forEach((seat,index)=>{const button=document.createElement('button');button.className='btn collection-work';button.textContent=`Seat ${index+1} · ${seat.owner||'Vacant — sit here'}`;button.disabled=Boolean(seat.owner);button.onclick=()=>sit(index);panel.append(button)});
  const approach=document.createElement('button');approach.className='btn';approach.textContent='Approach the bench';approach.onclick=()=>{if(selected!==null)standUp();setView([-5.5,1.7,-4.7],0,'By the viewing bench');dialog.close()};panel.append(approach);
 }
 seats.forEach((seat,index)=>{const hit=new THREE.Mesh(new THREE.BoxGeometry(.80,.22,.72),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hit.position.set(seat.x,.51,-6.9);hit.userData.seat=index;scene.add(hit);targets.push(hit)});
 const occupant=seatedPose(createAvatar({...defaultLook,model:'male'}));occupant.position.x=seats[2].x;occupant.position.z=-6.90;occupant.rotation.y=Math.PI;scene.add(occupant);
 function request(index){sync();dialog.showModal();if(seats[index]?.owner)toast('This seat is occupied. Select a vacant seat.');}
 open.onclick=()=>request(0);stand.onclick=standUp;sync();
 return {request,isSeated:()=>selected!==null,standUp,release:standUp,seats};
}
