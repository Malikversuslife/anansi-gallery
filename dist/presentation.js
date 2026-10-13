import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { setupSocial } from './social-demo.js';
import { setupMusic } from './music.js';
import './placement-zones.js';
import {setupSeating} from './seating.js';
import {createArtworkLighting} from './artwork-lighting.js';
import {resolveWalk} from './visitor-navigation.js';
import {setupGalleryMenus} from './gallery-menus.js';
import {setupGalleryChat} from './gallery-chat.js';
import {setupVisitors} from './gallery-visitors.js';
import {setupGalleryHelp} from './gallery-help.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stored = (key,fallback) => {try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{toast('Browser storage is full or unavailable. Nothing was saved.');return false}}
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3200)}
const defaults={theme:'Museum quiet',settings:{name:'Anansi Gallery',email:'hello@anansi.gallery'},artists:[],works:[],shows:[],leads:[]};
const catalogue=window.anansiFrontend.normalize({...defaults,...stored('anansiData',defaults)});
if(stored('anansiData',null))save('anansiData',catalogue);
let guest=stored('anansiVisitor',{name:'Guest',color:'#347d78'}),started=false,selectedWork;
if(!guest.id){guest.id=crypto.randomUUID();save('anansiVisitor',guest)}
const isCurator=new URLSearchParams(location.search).get('mode')==='curator';
let social=null,seating=null,visitors=null;
$('lightingButton').hidden=!isCurator;$('musicButton').hidden=!isCurator;document.querySelector('.hud .admin').hidden=!isCurator;
document.querySelector('.brand small').textContent=isCurator?'CURATOR PREVIEW · LOCAL DEMO':'VISITOR MODE · PRESENTATION';
$('welcome').querySelector('button[type=submit]').textContent='Continue · choose your look →';
$('guestColor').parentElement.hidden=true;
$('welcome').querySelector('p').textContent='Choose your display name, then set your character and outfit before entering.';
const demoWorks=[0,1,2].map(i=>({name:`Tidal Intervals / ${i+1}`,artist:'Presentation collection',format:'Painting',price:'Demonstration work · not for sale',image:'assets/tidal-intervals.png',panel:i,demo:true,story:'One panel of a continuous coastal triptych, created as an AI-generated placeholder for this gallery presentation. Real artist submissions will replace these studies. The layers of indigo, sand and terracotta explore the changing rhythm of a tidal landscape.'}));
demoWorks.push({name:'Continuum',artist:'Anansi presentation study',format:'Sculpture',price:'Prototype · not for sale',demo:true,story:'An original looping bronze-form geometry study on a limestone plinth. The continuous form explores movement, repetition and balance. This is a modelled presentation object, not an artist submission or scan.'});
demoWorks.push({name:'Tidal Intervals · upstairs study',artist:'Presentation collection',format:'Painting',price:'Demo · not for sale',demo:true,panel:1,image:'assets/tidal-intervals.png',placement:'Upper west gallery',story:'A sample installation upstairs, using a panel of the presentation triptych. This illustrates the expanded exhibition space.'});
demoWorks.push({name:'Tidal Intervals · column study',artist:'Presentation collection',format:'Painting',price:'Demo · not for sale',demo:true,panel:0,image:'assets/tidal-intervals.png',placement:'Column · entrance face',story:'A sample painting mounted on a central column. Column faces can hold works at multiple heights; these are local presentation placeholders.'});
for(const [placement,panel] of [['Ground north wall',2],['Upper north wall',0],['Column 2 · entrance · ground',1],['Column 4 · east · upper',2],['Column 5 · west · ground',0],['East exhibition wall',1]])demoWorks.push({name:`Tidal Intervals · ${placement}`,artist:'Presentation collection',format:'Painting',price:'Demo · not for sale',demo:true,panel,image:'assets/tidal-intervals.png',placement,story:'A sample from the presentation triptych showing this architectural exhibition position. Curator placements can replace these samples.'});
const exhibitionFilter=new URLSearchParams(location.search).get('exhibition');
const localWorks=(catalogue.works||[]).filter(w=>w.placement!=='Storage / unplaced'&&window.anansiFrontend.visible(w,catalogue,isCurator)&&(!exhibitionFilter||w.showId===exhibitionFilter));
const works=exhibitionFilter?[...localWorks]:[...demoWorks,...localWorks];
demoWorks.forEach((work,index)=>work.id=index<3?'demo-panel-'+index:index===3?'demo-sculpture':'demo-placement-'+index);
const installations=new Map();
const mobile=matchMedia('(max-width:650px)').matches;
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.15:1.5));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
$('scene').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#c8dce6');
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.08,180);camera.rotation.order='YXZ';
const hemisphere=new THREE.HemisphereLight('#f0f5ff','#a09581',1.3);scene.add(hemisphere);
const sun=new THREE.DirectionalLight('#fff0d9',2.4);sun.position.set(-20,24,9);sun.target.position.set(0,0,-3);scene.add(sun,sun.target);
sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-23,right:23,top:25,bottom:-25,near:1,far:80});sun.shadow.normalBias=.025;
const pmrem=new THREE.PMREMGenerator(renderer),roomEnvironment=new RoomEnvironment();
const environment=pmrem.fromScene(roomEnvironment,.03);scene.environment=environment.texture;scene.environmentIntensity=.3;roomEnvironment.dispose();pmrem.dispose();
const grounds=[],colliders=[],targets=[],blinds=[],lamps=[];
const textures=new THREE.TextureLoader();
const coast=textures.load('assets/coastal-panorama.jpg');coast.colorSpace=THREE.SRGBColorSpace;
const scenery=new THREE.MeshBasicMaterial({map:coast,side:THREE.DoubleSide,toneMapped:false});
for(const [x,z,rotation] of [[-48,0,Math.PI/2],[48,0,-Math.PI/2],[0,-55,0],[0,55,Math.PI]]){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(130,43.34),scenery);mesh.position.set(x,1.7,z);mesh.rotation.y=rotation;scene.add(mesh)}
const draco=new DRACOLoader();draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/gltf/');
const model=await new GLTFLoader().setDRACOLoader(draco).loadAsync('assets/anansi-exhibition.glb',event=>{if(event.total)$('loadMessage').textContent=`Loading gallery · ${Math.round(event.loaded/event.total*100)}%`});
draco.dispose();
scene.add(model.scene);model.scene.updateMatrixWorld(true);
const neutralWalls=[],blindNodes=[];
model.scene.traverse(obj=>{
  if(!obj.isMesh)return;
  const data=obj.userData;
  obj.receiveShadow=true;obj.castShadow=true;
  for(const material of (Array.isArray(obj.material)?obj.material:[obj.material])){
    if(material.transmission>0){material.transmission=0;material.transparent=true;material.opacity=.12;material.depthWrite=false;obj.castShadow=false}
    if(material.map)material.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    if(material.name==='Warm white micro-textured plaster'&&!neutralWalls.includes(material))neutralWalls.push(material);
  }
  if(data.role==='floor'){
    const replace=material=>material.name==='Honed limestone floor'?new THREE.MeshPhysicalMaterial({name:'Polished gallery tiles',color:material.color,map:material.map,roughness:.12,metalness:.035,clearcoat:.6,clearcoatRoughness:.1}):material;
    obj.material=Array.isArray(obj.material)?obj.material.map(replace):replace(obj.material);
  }
  if(data.role==='floor')grounds.push(obj);
  if(data.role==='collision'&&!(exhibitionFilter&&Number.isInteger(data.workIndex)))colliders.push(obj);
  if(Number.isInteger(data.workIndex)){obj.userData.work=demoWorks[data.workIndex];if(exhibitionFilter)obj.visible=false;else targets.push(obj)}
  if(data.blindSide){
    blindNodes.push(obj);
  }
});
for(let i=0;i<4&&!exhibitionFilter;i++){
 const meshes=targets.filter(obj=>obj.userData.work===demoWorks[i]),box=new THREE.Box3();meshes.forEach(obj=>box.union(new THREE.Box3().setFromObject(obj)));
 installations.set(demoWorks[i],{position:box.getCenter(new THREE.Vector3()),rotation:0});
}
for(const obj of blindNodes){
    const data=obj.userData;
    // Rebase baked world-space geometry into browser coordinates, then move its origin to the cassette.
    const geometry=obj.geometry.clone().applyMatrix4(obj.matrixWorld),top=data.blindTop,height=data.blindHeight;
    const origin=data.blindKind==='hem'?top-height:top;
    geometry.translate(0,-origin,0);obj.removeFromParent();obj.geometry=geometry;obj.position.set(0,origin,0);obj.quaternion.identity();obj.scale.set(1,1,1);scene.add(obj);
    blinds.push({mesh:obj,side:data.blindSide,kind:data.blindKind,top,height});
}
function spot(position,target,power,angle){const light=new THREE.SpotLight('#ffe8c6',power,18,angle,.55,2);light.position.fromArray(position);light.target.position.fromArray(target);scene.add(light,light.target);lamps.push({light,power})}
spot([-8.6,4,-5.9],[-8.6,2.18,-7.82],180,Math.PI/3);
spot([-3.6,6.5,-4.9],[-2.4,1.7,-6.2],140,Math.PI/5);
if(!mobile)spot([-1.2,5.8,-7.3],[-2.4,1.8,-6.2],90,Math.PI/5);

// Existing curator uploads stay local and are installed on the selected wall/plinth.
const uploadGroup=new THREE.Group();scene.add(uploadGroup);
const artworkLighting=createArtworkLighting({scene,camera,mobile,stored,save});
const occupiedSlots=new Set(),placementZones=window.anansiPlacementZones;
async function installLocal(work,index){
  const group=new THREE.Group();uploadGroup.add(group);
  const wall=work.placement||'North wall';
  const zone=placementZones[wall],key=position=>`${position.join(',')}:${zone.rotation||0}`;
  const slot=zone?.slots.findIndex(position=>!occupiedSlots.has(key(position)))??-1;
  if(!zone||slot<0||(work.format==='Sculpture')!==(zone.kind==='plinth')){work.notInstalled=true;uploadGroup.remove(group);return}
  occupiedSlots.add(key(zone.slots[slot]));
  if(work.format==='Sculpture'){
    group.position.fromArray(zone.slots[slot]);
    const pedestal=new THREE.Mesh(new THREE.BoxGeometry(.9,.65,.9),new THREE.MeshStandardMaterial({color:'#c8c0b1',roughness:.7}));pedestal.position.y=.325;group.add(pedestal);
    const proxy=new THREE.Mesh(new THREE.TorusKnotGeometry(.42,.08,64,10),new THREE.MeshStandardMaterial({color:'#9b6943',metalness:.75,roughness:.4}));proxy.position.y=1.25;group.add(proxy);
    work.proxy=true;
    if(work.assetKey){const decoder=new DRACOLoader();decoder.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/gltf/');try{const file=await window.anansiAssets.get(work.assetKey);if(!file)throw Error('Model not found on this device');const asset=await new GLTFLoader().setDRACOLoader(decoder).parseAsync(await file.arrayBuffer(),'');const object=asset.scene;object.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3());if(!Number.isFinite(size.length())||size.length()===0)throw Error('Empty model');const scale=1.6/Math.max(size.x,size.y,size.z);object.scale.multiplyScalar(scale);object.updateMatrixWorld(true);const scaled=new THREE.Box3().setFromObject(object),center=scaled.getCenter(new THREE.Vector3());object.position.add(new THREE.Vector3(-center.x,.67-scaled.min.y,-center.z));group.remove(proxy);proxy.geometry.dispose();proxy.material.dispose();group.add(object);work.proxy=false}catch(error){toast(work.name+': model unavailable; showing a clearly labelled placeholder.');work.assetError=error.message}finally{decoder.dispose()}}
  }else{
    const rotation=zone.rotation,frameWidth=zone.width,frameHeight=zone.height;
    group.position.fromArray(zone.slots[slot]);
    group.rotation.y=rotation;
    if(zone.backing){
      // The promenade perimeter is glazed: provide an actual exhibition panel,
      // rather than letting the painting appear to float against a window.
      const backing=new THREE.Mesh(new THREE.BoxGeometry(1.8,3.5,.12),new THREE.MeshStandardMaterial({color:'#e1ddd3',roughness:.85}));backing.position.set(0,-.3,-.10);backing.userData.backing=true;group.add(backing);colliders.push(backing);
    }
    const frame=new THREE.Mesh(new THREE.BoxGeometry(frameWidth,frameHeight,.06),new THREE.MeshStandardMaterial({color:'#41362c',roughness:.5}));group.add(frame);
    const material=new THREE.MeshStandardMaterial({color:'#ddd3bc',roughness:.8});
    const image=new THREE.Mesh(new THREE.PlaneGeometry(frameWidth-.1,frameHeight-.1),material);image.position.z=.035;group.add(image);
    if(work.image)textures.load(work.image,t=>{t.colorSpace=THREE.SRGBColorSpace;const aspect=t.image.width/t.image.height/(Number.isInteger(work.panel)?3:1),width=Math.min(frameWidth-.1,(frameHeight-.1)*aspect),height=width/aspect;image.geometry.dispose();image.geometry=new THREE.PlaneGeometry(width,height);frame.geometry.dispose();frame.geometry=new THREE.BoxGeometry(width+.1,height+.1,.06);if(Number.isInteger(work.panel)){t.repeat.x=1/3;t.offset.x=work.panel/3}material.map=t;material.color.set('white');material.needsUpdate=true},undefined,()=>toast('An uploaded artwork image could not load.'));
    const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=200;const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#f5f1e8';ctx.fillRect(0,0,512,200);ctx.fillStyle='#34453c';ctx.font='24px sans-serif';
    const letters=Array.from(String(work.name||'Untitled work'));let line='',row=0;
    for(const letter of letters){if(ctx.measureText(line+letter).width>460){ctx.fillText(line,24,42+row*30);row++;line='';if(row>=3)break}line+=letter}if(row<3)ctx.fillText(line,24,42+row*30);else ctx.fillText('…',24,132);
    ctx.font='18px sans-serif';let artist=String(work.artist||'Unassigned');while(ctx.measureText(artist).width>440)artist=artist.slice(0,-1);ctx.fillText(artist+(artist!==String(work.artist||'Unassigned')?'…':''),24,176);
    const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;
    const label=new THREE.Mesh(new THREE.PlaneGeometry(frameWidth*.65,frameWidth*.65*200/512),new THREE.MeshBasicMaterial({map:labelTexture,toneMapped:false}));label.position.set(0,-frameHeight/2-.23,.04);group.add(label);
  }
  group.updateMatrixWorld(true);
  group.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;if(!obj.userData.backing){obj.userData.work=work;targets.push(obj)}if(work.format==='Sculpture')colliders.push(obj)}});
  work.installedZone=wall;
  work.notInstalled=false;
  installations.set(work,{position:group.position.clone().add(new THREE.Vector3(0,work.format==='Sculpture'?1.3:0,0)),rotation:group.rotation.y});
  artworkLighting.add(work,{position:group.position,rotation:group.rotation.y,sculpture:work.format==='Sculpture'});
}
for(const work of localWorks)await installLocal(work);if(!exhibitionFilter)for(const work of demoWorks.slice(4))await installLocal(work);

const reflectedFloor=new Reflector(new THREE.PlaneGeometry(23.7,33.7),{color:0xc8c5bd,textureWidth:mobile?384:768,textureHeight:mobile?256:512,clipBias:.003,multisample:0});
reflectedFloor.rotation.x=-Math.PI/2;reflectedFloor.position.y=.007;
reflectedFloor.material.transparent=true;reflectedFloor.material.depthWrite=false;
reflectedFloor.material.fragmentShader=reflectedFloor.material.fragmentShader.replace('blendOverlay( base.rgb, color ), 1.0','blendOverlay( base.rgb, color ), 0.30');
reflectedFloor.visible=!mobile;scene.add(reflectedFloor);
const reflectionLabel=document.createElement('label');reflectionLabel.textContent='ENHANCED FLOOR REFLECTIONS ';const reflectionToggle=document.createElement('input');reflectionToggle.type='checkbox';reflectionToggle.checked=!mobile;reflectionToggle.onchange=()=>{if(isCurator)reflectedFloor.visible=reflectionToggle.checked};reflectionLabel.append(reflectionToggle);
$('lighting').querySelector('.fields').append(reflectionLabel);

const presets={daylight:{west:0,east:0,day:1,art:.3},balanced:{west:.55,east:.55,day:.65,art:1},exhibition:{west:1,east:1,day:.08,art:1.5}};
let atmosphere={...presets.balanced},desired={...atmosphere};
function applyPreset(name,persist=true){if(!presets[name])return;desired={...presets[name]};$('lightPreset').value=name;syncRanges();if(persist)save('anansiAtmosphere',{...desired,preset:name})}
function syncRanges(){for(const side of ['west','east']){$(side+'Blind').value=Math.round(desired[side]*100);$(side+'Value').textContent=Math.round(desired[side]*100)+'%'}}
const savedAtmosphere=stored('anansiAtmosphere',null);
if(savedAtmosphere){for(const key of ['west','east','day','art']){const number=Number(savedAtmosphere[key]);if(Number.isFinite(number))desired[key]=THREE.MathUtils.clamp(number,0,key==='art'?2:1)}$('lightPreset').value=savedAtmosphere.preset||'balanced';syncRanges()}
else if(catalogue.theme==='Nocturne')applyPreset('exhibition',false);
else syncRanges();
function theme(name){neutralWalls.forEach(material=>material.color.set(name==='Earth room'?'#d5b995':name==='Nocturne'?'#797871':'#e7e3d9'))}
theme(catalogue.theme);
$('lightPreset').onchange=()=>{if(isCurator)applyPreset($('lightPreset').value)};
for(const side of ['west','east'])$(side+'Blind').oninput=()=>{if(!isCurator)return;desired[side]=Number($(side+'Blind').value)/100;syncRanges();save('anansiAtmosphere',{...desired,preset:$('lightPreset').value})};
$('lightingButton').onclick=()=>{if(isCurator)$('lighting').showModal()};$('closeLighting').onclick=()=>$('lighting').close();
window.addEventListener('storage',event=>{if(event.key==='anansiAtmosphere'){const state=stored('anansiAtmosphere',null);if(state){desired={...state};syncRanges()}}if(event.key==='anansiData'){theme(stored('anansiData',{}).theme);toast('Catalogue updated. Reload to install changed artwork placements.')}});

const rooms={atrium:{position:[0,1.7,15.5],yaw:0,label:'The entrance atrium'},paintings:{position:[-5.5,1.7,-1.9],yaw:0,label:'Tidal Intervals'},sculptures:{position:[-.3,1.7,-2.3],yaw:.49,label:'Continuum'},upper:{position:[-10.5,5.985,14],yaw:.15,label:'The upper promenade'}};
rooms.north={position:[-8.2,1.7,-12.6],yaw:0,label:'North wall · ground floor'};rooms.upperNorth={position:[-10.3,5.985,-14.1],yaw:0,label:'North wall · upper floor'};
rooms.stairs={position:[2.2,1.7,1.5],yaw:-Math.PI/2,label:'At the staircase'};
for(const [key,name] of [['north','North · ground'],['upperNorth','North · upper'],['stairs','Staircase']]){const button=document.createElement('button');button.dataset.room=key;button.textContent=name;document.querySelector('.tour').append(button)}
let yaw=0,pitch=0,drag=false,moved=0,lastX=0,lastY=0,footHeight=0;
const keys=new Set();
function setView(position,angle,label){camera.position.fromArray(position);footHeight=position[1]-1.7;yaw=angle;pitch=0;camera.rotation.set(pitch,yaw,0);camera.updateMatrixWorld();$('roomName').textContent=label;keys.clear();drag=false}
function visitRoom(key){seating?.release();const room=rooms[key];setView(room.position,room.yaw,room.label);document.querySelectorAll('[data-room]').forEach(button=>button.classList.toggle('active',button.dataset.room===key))}
visitRoom('atrium');document.querySelectorAll('[data-room]').forEach(button=>button.onclick=()=>visitRoom(button.dataset.room));
const canvas=renderer.domElement,raycaster=new THREE.Raycaster();
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();keys.clear();renderer.setAnimationLoop(null);$('loading').style.display='grid';$('loadMessage').textContent='The graphics session stopped. Retry loading or continue in the lightweight gallery.'});
canvas.addEventListener('pointerdown',event=>{if(document.querySelector('dialog[open]'))return;drag=true;moved=0;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture(event.pointerId)});
canvas.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-lastX,dy=event.clientY-lastY;moved+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-1.2,1.2);lastX=event.clientX;lastY=event.clientY;camera.rotation.set(pitch,yaw,0)});
canvas.addEventListener('pointerup',event=>{if(!drag)return;drag=false;if(moved<8)selectAt(event.clientX,event.clientY)});canvas.addEventListener('pointercancel',()=>drag=false);
function pickAt(x,y){
 if(!started||document.querySelector('dialog[open],.visitor-actions.open,.tour.open'))return null;
 camera.updateMatrixWorld();raycaster.far=8;raycaster.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1),camera);
 const hit=raycaster.intersectObjects(targets,false)[0];if(!hit)return null;
 const barrier=raycaster.intersectObjects(colliders,false)[0];
 // A pedestal or bench may itself be both the target and the obstacle.
 const ownBench=Number.isInteger(hit.object.userData.seat)&&barrier?.object.name.includes('Natural smoked oak')&&hit.distance-barrier.distance<.6;
 if(barrier&&barrier.object!==hit.object&&barrier.distance<hit.distance-.08&&!ownBench)return null;
 return hit;
}
function selectAt(x,y){const hit=pickAt(x,y);if(hit){keys.clear();if(Number.isInteger(hit.object.userData.seat))seating?.request(hit.object.userData.seat);else if(hit.object.userData.visitor)visitors?.open(hit.object.userData.visitor);else if(hit.object.userData.work)openWork(hit.object.userData.work)}}
document.addEventListener('keydown',event=>{if(document.querySelector('dialog[open],.visitor-actions.open,.tour.open')||event.target.closest('input,select,textarea,[contenteditable="true"]'))return;if(event.target.closest('button,a')&&[' ','Enter'].includes(event.key))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(event.key))event.preventDefault();keys.add(event.key.toLowerCase());if(event.key.toLowerCase()==='e')selectAt(innerWidth/2,innerHeight/2)});
document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();drag=false});
document.querySelectorAll('[data-move]').forEach(button=>{button.onpointerdown=event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys.add(button.dataset.move)};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>keys.delete(button.dataset.move)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();drag=false}});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('close',()=>keys.clear());
const floorRay=new THREE.Raycaster(),wallRay=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),walkDirection=new THREE.Vector3();
function sampleHeight(x,z,feet){
 floorRay.set(new THREE.Vector3(x,feet+.37,z),down);floorRay.far=.75;
 const hit=floorRay.intersectObjects(grounds,false).find(hit=>hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y>.6);
 return hit?hit.point.y:null;
}
function isBlocked(position,dx,dz,radius){
 const length=Math.hypot(dx,dz);walkDirection.set(dx,0,dz).normalize();
 const side=new THREE.Vector3(-walkDirection.z,0,walkDirection.x);
 for(const offset of [-radius,0,radius])for(const height of [.48,1,1.55]){
  wallRay.set(new THREE.Vector3(position.x+side.x*offset,position.y+height,position.z+side.z*offset),walkDirection);wallRay.far=length+radius;
  if(wallRay.intersectObjects(colliders,false).length)return true;
 }
 return false;
}
function walk(dx,dz,dt){
 const next=resolveWalk({x:camera.position.x,y:footHeight,z:camera.position.z},dx,dz,{sampleHeight,isBlocked});
 camera.position.x=next.x;camera.position.z=next.z;footHeight=next.y;
 camera.position.y=THREE.MathUtils.damp(camera.position.y,footHeight+1.7,14,dt);
}
const interact=document.createElement('button');interact.id='interactButton';interact.className='pill scene-interaction';interact.hidden=true;interact.onclick=()=>selectAt(innerWidth/2,innerHeight/2);document.body.append(interact);
const floorStatus=document.createElement('span');floorStatus.id='floorStatus';floorStatus.className='floor-status';document.querySelector('.caption').append(floorStatus);
let interactionTime=0;
let previous=performance.now();
renderer.setAnimationLoop(now=>{
  const dt=Math.min((now-previous)/1000,.05);previous=now;
  for(const key of ['west','east','day','art'])atmosphere[key]=THREE.MathUtils.damp(atmosphere[key],desired[key],3,dt);
  for(const blind of blinds){const value=atmosphere[blind.side];if(blind.kind==='fabric')blind.mesh.scale.y=Math.max(.001,value);else blind.mesh.position.y=blind.top-blind.height*value}
  sun.intensity=2.4*atmosphere.day;hemisphere.intensity=.12+1.3*atmosphere.day;scene.environmentIntensity=.08+.3*atmosphere.day;
  lamps.forEach(({light,power})=>light.intensity=power*atmosphere.art);
  artworkLighting.update(dt,atmosphere.art);
  social?.update(dt);
  visitors?.update(dt);
  if(started&&!seating?.isSeated()&&!document.querySelector('dialog[open],.visitor-actions.open,.tour.open')){
    const f=(keys.has('w')||keys.has('arrowup')||keys.has('forward')?1:0)-(keys.has('s')||keys.has('arrowdown')||keys.has('backward')?1:0);
    const r=(keys.has('d')||keys.has('arrowright')||keys.has('right')?1:0)-(keys.has('a')||keys.has('arrowleft')||keys.has('left')?1:0);
    const speed=2.5*dt/(Math.hypot(f,r)||1);walk((-Math.sin(yaw)*f+Math.cos(yaw)*r)*speed,(-Math.cos(yaw)*f-Math.sin(yaw)*r)*speed,dt);
  }
  interactionTime+=dt;if(interactionTime>.15){interactionTime=0;const hit=pickAt(innerWidth/2,innerHeight/2);interact.hidden=!hit;interact.textContent=hit?(Number.isInteger(hit.object.userData.seat)?'View seating':hit.object.userData.visitor?`Meet ${hit.object.userData.visitor.artist}`:`View ${hit.object.userData.work?.name||'artwork'}`):'';canvas.style.cursor=hit?'pointer':'grab';floorStatus.textContent=seating?.isSeated()?'Seated':footHeight>3.9?'Upper floor':footHeight>.3?'Staircase':'Ground floor';canvas.dataset.cameraPosition=camera.position.toArray().map(n=>n.toFixed(3)).join(',')}
  renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

function viewWork(work){
 const installation=installations.get(work);if(!installation)return;
 const target=installation.position,normal=new THREE.Vector3(Math.sin(installation.rotation),0,Math.cos(installation.rotation));
 const floor=target.y>4?4.285:0;
 for(const distance of (work.format==='Sculpture'?[3.2,4,2.4]:[1.8,2.4,3,1.2]))for(const offset of [0,.7,-.7]){
  const x=target.x+normal.x*distance+normal.z*offset,z=target.z+normal.z*distance-normal.x*offset;
  const y=sampleHeight(x,z,floor);if(y===null||Math.abs(y-floor)>.1)continue;
  const position={x,y,z};if([[.001,0],[-.001,0],[0,.001],[0,-.001]].some(([dx,dz])=>isBlocked(position,dx,dz,.3)))continue;
  if([[-.24,0],[.24,0],[0,-.24],[0,.24]].some(([dx,dz])=>{const support=sampleHeight(x+dx,z+dz,y);return support===null||Math.abs(support-y)>.1}))continue;
  seating?.release();$('detail').close();setView([x,y+1.7,z],Math.atan2(-(target.x-x),-(target.z-z)),work.name);
  pitch=THREE.MathUtils.clamp(Math.atan2(target.y-camera.position.y,Math.hypot(target.x-x,target.z-z)),-1.2,1.2);camera.rotation.set(pitch,yaw,0);
  document.querySelectorAll('[data-room]').forEach(button=>button.classList.remove('active'));toast('Click the work, or press E, to read its story.');return;
 }
 toast('No safe viewing position is available for this work. Its details remain here.');
}
function openWork(work){
  selectedWork=work;const savedList=stored('anansiSavedWorks',[]),saved=savedList.includes(work.id)||savedList.includes(work.name);
  let image=work.image?`<img src="${esc(work.image)}" alt="${esc(work.name)}">`:'A three-dimensional sculpture study';
  if(Number.isInteger(work.panel))image=`<div class="triptych-crop"><img src="${esc(work.image)}" alt="${esc(work.name)}" style="transform:translateX(-${work.panel*100/3}%)"></div>`;
  $('detailContent').innerHTML=`<button class="close" id="closeDetail" aria-label="Close artwork details">×</button><div class="eyebrow">${work.demo?'PRESENTATION WORK':'CURATOR CATALOGUE'}</div><h2>${esc(work.name)}</h2><p>${esc(work.artist)}</p><div class="art-image">${image}</div><div class="meta"><span>${esc(work.format)}</span><span>${esc(work.price||'Price on request')}</span></div><p class="story">${esc(work.story||'No artist story has been added yet.')}</p>${work.proxy?'<p class="note">Sculpture coverage is a filename only in this demo. The displayed form is a proxy, not the uploaded artwork.</p>':''}<p class="note">Presentation mode: enquiries stay in this browser. No purchase or real message is sent.</p><div class="actions"><button class="btn" id="saveWork">${saved?'Saved ✓':'Save work'}</button><button class="btn" id="artistChat">Demo artist chat</button><button class="btn primary" id="enquire">Express interest</button></div>`;
  $('closeDetail').onclick=()=>$('detail').close();$('saveWork').onclick=()=>{const list=stored('anansiSavedWorks',[]),exists=list.includes(work.id)||list.includes(work.name),next=exists?list.filter(key=>key!==work.name&&key!==work.id):[...list,work.id];if(save('anansiSavedWorks',next)){$('saveWork').textContent=exists?'Save work':'Saved ✓';toast(exists?'Work removed from your saved list.':'Work saved in this browser.')}};
  if(work.proxy)$('detailContent').querySelector('.note').textContent='This is a sculpture placeholder, not the artist’s model. Add a self-contained GLB on this device, or reload where the model was stored.';
  const navigation=document.createElement('div');navigation.className='actions';
  const back=document.createElement('button');back.className='btn';back.textContent='← Back to works';back.onclick=()=>{$('detail').close();showCollection()};navigation.append(back);
  if(installations.has(work)){const view=document.createElement('button');view.className='btn';view.textContent='View in gallery';view.onclick=()=>viewWork(work);navigation.append(view)}
  $('detailContent').append(navigation);
  if(work.notInstalled){const note=document.createElement('p');note.className='note';note.textContent='Catalogue entry only: the chosen position is full, unknown, or incompatible with the artwork type. The curator must choose another position.';$('detailContent').querySelector('h2').after(note)}
  if(isCurator&&artworkLighting.has(work)){const label=document.createElement('label');label.className='curator-light-control';label.textContent='CURATOR · INDIVIDUAL ART LIGHT';const range=document.createElement('input');range.type='range';range.min=0;range.max=200;range.value=String(Math.round(artworkLighting.level(work)*100));const value=document.createElement('span');value.textContent=range.value+'%';range.oninput=()=>{artworkLighting.set(work,Number(range.value)/100);value.textContent=range.value+'%'};label.append(range,value);$('detailContent').append(label)}
  $('enquire').onclick=()=>{$('detail').close();$('interestTitle').textContent='Interest in '+work.name;$('collectorName').value=guest.name;$('interest').showModal()};
  $('artistChat').onclick=()=>{$('detail').close();galleryChat.start(work)};
  $('detail').showModal();
}
$('collectorEmail').parentElement.remove();$('collectorName').parentElement.firstChild.textContent='DISPLAY NAME (NOT YOUR LEGAL NAME)';$('interest').querySelector('.note').textContent='No contact details required. This demo saves interest on this browser only; private curator replies need the live backend.';
$('interestForm').onsubmit=event=>{event.preventDefault();const name=$('collectorName').value.trim();if(!name){$('collectorName').setCustomValidity('Enter a display name.');$('collectorName').reportValidity();return}const data={...defaults,...stored('anansiData',catalogue)};data.leads=data.leads||[];data.leads.push({id:crypto.randomUUID(),visitorId:guest.id,name,workId:selectedWork.id||selectedWork.name,interest:selectedWork.name,message:$('collectorMessage').value.trim(),status:'New',demo:true});if(save('anansiData',data)){$('interest').close();toast('Interest saved without contact details. The curator can read the local enquiry.')}};$('collectorName').oninput=()=>$('collectorName').setCustomValidity('');
$('entryForm').onsubmit=event=>{event.preventDefault();const name=$('guestName').value.trim();if(!name){$('guestName').setCustomValidity('Please enter a display name.');$('guestName').reportValidity();return}guest={...guest,name,color:$('guestColor').value};if(!save('anansiVisitor',guest))return;$('avatarButton').textContent=name;$('welcome').close();social.openDesigner(true)};$('guestName').oninput=()=>$('guestName').setCustomValidity('');
$('avatarButton').onclick=()=>{$('guestName').value=guest.name==='Guest'?'':guest.name;$('welcome').showModal()};
function showCollection(){$('detailContent').innerHTML='<button class="close" id="closeDetail" aria-label="Close collection">×</button><button class="btn dialog-back" id="collectionBack">← Back to gallery</button><div class="eyebrow">PRESENTATION COLLECTION</div><h2>Works in this gallery</h2><p>Choose a work to read its story, save it, or find it in the gallery.</p>'+works.map((work,index)=>`<button class="btn collection-work" data-work="${index}"><span>${esc(work.name)}<small>${esc(work.artist)} · ${installations.has(work)?'On display':'Catalogue only'}</small></span><span aria-hidden="true">→</span></button>`).join('');$('collectionBack').onclick=()=>$('detail').close();$('closeDetail').onclick=()=>$('detail').close();$('detailContent').querySelectorAll('[data-work]').forEach(button=>button.onclick=()=>{$('detail').close();openWork(works[Number(button.dataset.work)])});$('detail').showModal()}
$('worksButton').onclick=showCollection;
$('loadMessage').textContent='Preparing your character models…';
const photoWorks=works.filter(work=>installations.has(work));
function photoPose(subject){const work=photoWorks[Number(subject)],installation=installations.get(work);if(!installation)return null;const t=installation.position,n=new THREE.Vector3(Math.sin(installation.rotation),0,Math.cos(installation.rotation)),floor=t.y>4?4.285:0;
 for(const distance of [4,3.2,2.4]){const x=t.x+n.x*distance,z=t.z+n.z*distance;if(sampleHeight(x,z,floor)===null||isBlocked({x,y:floor,z},.001,0,.3)||isBlocked({x,y:floor,z},-.001,0,.3)||isBlocked({x,y:floor,z},0,.001,.3)||isBlocked({x,y:floor,z},0,-.001,.3))continue;
  const people=[-.55,.55].map(offset=>[t.x+n.x*.85+n.z*offset,floor,t.z+n.z*.85-n.x*offset]).filter(([px,py,pz])=>sampleHeight(px,pz,py)!==null&&!isBlocked({x:px,y:py,z:pz},.001,0,.24)&&!isBlocked({x:px,y:py,z:pz},0,.001,.24));if(!people.length)continue;return {camera:[x,floor+1.4,z],target:[t.x,floor+1.25,t.z],people}}
 return null;
}
social=await setupSocial({scene,camera,renderer,stored,save,toast,getGuest:()=>guest,photoWorks,getPhotoPose:photoPose,getPhotoContext:subject=>{const work=photoWorks[Number(subject)],show=catalogue.shows.find(s=>s.id===work?.showId||s.title===work?.show);return {exhibition:show?.title||work?.show||(work?.demo&&work?.format==='Painting'?'Tidal Intervals':'Exhibition not assigned')}},onEnter:()=>{started=true;toast('Welcome, '+guest.name+'. Your gallery look is ready.')}});
seating=setupSeating({scene,camera,targets,toast,setView});
const galleryChat=setupGalleryChat({getGuest:()=>guest,toast,stored,save});
visitors=setupVisitors({scene,targets,chat:galleryChat,toast});
setupMusic({stored,save,toast,isCurator});
setupGalleryHelp({stored,save,onQuality:quality=>{const light=quality==='light';renderer.setPixelRatio(light?.8:Math.min(devicePixelRatio,mobile?1.15:1.5));renderer.shadowMap.enabled=!light;reflectedFloor.visible=!light&&!mobile;reflectionToggle.checked=reflectedFloor.visible;renderer.setSize(innerWidth,innerHeight)}});
setupGalleryMenus({getName:()=>guest.name,onOpen:()=>keys.clear()});
for(const id of ['photoBooth','lighting','music','interest']){const button=document.createElement('button');button.type='button';button.className='btn dialog-back';button.textContent=id==='interest'?'← Back to artwork':'← Back to gallery';button.onclick=()=>{$(id).close();if(id==='interest'&&selectedWork)openWork(selectedWork)};$(id).querySelector('.panel').prepend(button)}
$('loading').style.display='none';$('guestName').value=guest.name==='Guest'?'':guest.name;$('guestColor').value=guest.color;$('welcome').showModal();
// Read-only diagnostics for verification; no accounts or network writes involved.
window.anansiDiagnostics=()=>({modelLoaded:true,meshes:renderer.info.render.calls,triangles:renderer.info.render.triangles,works:works.length,blinds:blinds.length,floors:grounds.length,colliders:colliders.length,camera:camera.position.toArray(),atmosphere:{...atmosphere},presentationOnly:true});
canvas.dataset.modelLoaded='true';canvas.dataset.blinds=String(blinds.length);canvas.dataset.floors=String(grounds.length);canvas.dataset.colliders=String(colliders.length);
canvas.dataset.artLights=String(artworkLighting.count());document.body.dataset.galleryRole=isCurator?'curator-preview':'visitor';
