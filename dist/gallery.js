import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = id => document.getElementById(id);
const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function stored(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
let catalogue = stored('anansiData', {theme:'Museum quiet',settings:{name:'Anansi Gallery',email:'hello@anansi.gallery'},artists:[],works:[],shows:[],leads:[]});
const demoWorks = [
  {name:'The architecture of looking',artist:'Anansi Studio',price:'Exhibition study',format:'Painting',image:'assets/gallery-hero.png',story:'An architectural study for the imagined Anansi gallery. Daylight, concrete and a sweeping stair create a space for unhurried looking.',placement:'North wall',demo:true},
  {name:'Quiet orbit',artist:'Anansi Studio',price:'Exhibition study',format:'Sculpture',story:'A sculptural study of balance and motion, presented on an atrium plinth.',placement:'Atrium plinth',demo:true}
];
const works = (catalogue.works?.length ? catalogue.works : demoWorks).map((w,i)=>({...w, galleryIndex:i}));
if (!works.some(w=>w.format==='Sculpture')) works.push(demoWorks[1]);
let guest = stored('anansiVisitor', {name:'Guest',color:'#347d78'});
let selectedWork, chatPerson, conversation = [], started = false;
function toast(message) { $('toast').textContent=message; $('toast').style.display='block'; clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('toast').style.display='none',2600); }

const scene = new THREE.Scene();
scene.background = new THREE.Color('#d5e5ed');
scene.fog = new THREE.Fog('#d5e5ed',70,180);
const mobile = matchMedia('(max-width:650px)').matches;
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.75)); renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
const environment=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
const environmentTarget=pmrem.fromScene(environment,.04);
scene.environment=environmentTarget.texture;scene.environmentIntensity=.45;
environment.dispose();pmrem.dispose();
$('scene').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,150);
camera.position.set(0,1.7,13); camera.rotation.order='YXZ';
scene.add(new THREE.HemisphereLight('#e6f2ff','#948578',.8));
const sun = new THREE.DirectionalLight('#fff0d5',3.2); sun.position.set(-38,14,12);sun.target.position.set(0,0,-5);scene.add(sun.target);sun.castShadow=true;
sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048); Object.assign(sun.shadow.camera,{left:-30,right:30,top:26,bottom:-26,near:1,far:100});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun);
// Small deterministic surface maps keep materials detailed without large downloads.
function surfaceTexture(tiles=false){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512);let seed=3721;
  for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=tiles?220+(seed%13):224+(seed%18);pixels.data[i]=n;pixels.data[i+1]=n-2;pixels.data[i+2]=n-6;pixels.data[i+3]=255;}
  ctx.putImageData(pixels,0,0);
  if(tiles){ctx.strokeStyle='#b8b6af';ctx.lineWidth=1;ctx.strokeRect(.5,.5,511,511);}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(tiles?15:3,tiles?22:3);t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;
}
const concreteMap=surfaceTexture(),floorMap=surfaceTexture(true);
const concrete=new THREE.MeshStandardMaterial({color:'#eeece5',map:concreteMap,bumpMap:concreteMap,bumpScale:.015,roughness:.82});
const white=new THREE.MeshStandardMaterial({color:'#f5f2e9',roughness:.78});
const floor=new THREE.MeshPhysicalMaterial({color:'#eee9df',map:floorMap,roughness:.3,metalness:0,clearcoat:.25,clearcoatRoughness:.38});
const metal=new THREE.MeshStandardMaterial({color:'#323b3b',roughness:.3,metalness:.8});
const glass=new THREE.MeshPhysicalMaterial({color:'#edf6f6',transparent:true,opacity:.12,roughness:.08,metalness:.1,depthWrite:false,side:THREE.DoubleSide});
const dark=new THREE.MeshStandardMaterial({color:'#536862',roughness:.55});
const colliders=[], targets=[];
function box(w,h,d,x,y,z,mat=white,collision=false) {
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=mat!==glass;m.receiveShadow=true;scene.add(m);
  if(collision)colliders.push({minX:x-w/2-.35,maxX:x+w/2+.35,minZ:z-d/2-.35,maxZ:z+d/2+.35,minY:y-h/2,maxY:y+h/2});
  return m;
}
// Double-height atrium with glazed frontage, deep painting wing and upper balcony.
box(30,.3,44,0,-.18,-5,floor); box(30,.4,44,0,8.1,-5,white);
// Side boundaries are glass; movement bounds keep guests inside the building.
box(30,8,.3,0,4,-27,white,true);
for(let z=-26;z<=16;z+=3){box(.065,7.7,.11,-14.72,3.85,z,metal);box(.065,7.7,.11,14.72,3.85,z,metal);}
box(.04,7.5,41,-14.7,3.8,-5,glass);box(.04,7.5,41,14.7,3.8,-5,glass);
for(const x of [-14.72,14.72]){box(.09,.075,44,x,.1,-5,metal);box(.09,.075,44,x,4.2,-5,metal);box(.09,.075,44,x,7.7,-5,metal);box(.45,.15,44,x,.04,-5,concrete);}
for(const x of [-10,-3,10]){box(.85,8,.85,x,4,-5,concrete,true);box(.85,8,.85,x,4,-19,concrete,true);}
box(30,.35,5,0,4.25,-24,concrete); box(4,.35,36,-12.7,4.25,-3,concrete); box(4,.35,36,12.7,4.25,-3,concrete);
box(30,1.1,.05,0,4.9,-21.5,glass);box(.05,1.1,36,-10.7,4.9,-3,glass);
// Leave an opening in the east balustrade where the staircase meets its landing.
box(.05,1.1,17,10.7,4.9,-12.5,glass);box(.05,1.1,13,10.7,4.9,8.5,glass);
box(.04,.04,36,-10.7,5.48,-3,metal);box(.04,.04,17,10.7,5.48,-12.5,metal);box(.04,.04,13,10.7,5.48,8.5,metal);
for(const x of [-10.7,10.7])for(let z=-21;z<=15;z+=3){if(x>0&&z>-4&&z<2)continue;box(.035,1.1,.035,x,4.92,z,metal);}
box(30,.04,.04,0,5.48,-21.5,metal);
for(const x of [-14.45,14.45])box(.06,.12,44,x,.12,-5,white);
// Dividing walls leave generous passages into the exhibition rooms.
box(8,3.6,.25,-10,1.8,-10,white,true);box(5,3.6,.25,12.5,1.8,-10,white,true);
box(.25,3.6,8,-7,1.8,-18,white,true);
// Sweeping, sculptural stair with a navigable centre line.
const stairCentre=new THREE.Vector3(8,0,-1),stairStart=Math.PI/2,stairSweep=Math.PI*1.5;
function curvedBand(inner,outer,start,end,low,high,segments,material){
  const vertices=[],indices=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments,a=start+(end-start)*t;
    for(const [r,y] of [[inner,low(t)],[outer,low(t)],[inner,high(t)],[outer,high(t)]])vertices.push(8+Math.cos(a)*r,y,-1+Math.sin(a)*r);
    if(i<segments){const b=i*4;for(const [a,c,d,e] of [[b,b+4,b+5,b+1],[b+2,b+3,b+7,b+6],[b,b+2,b+6,b+4],[b+1,b+5,b+7,b+3]])indices.push(a,c,d,a,d,e);}
  }
  indices.push(0,1,3,0,3,2);const endIndex=segments*4;indices.push(endIndex,endIndex+2,endIndex+3,endIndex,endIndex+3,endIndex+1);
  for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
// Continuous structural soffit, wedge-shaped treads and thick sculptural parapets.
curvedBand(2.4,4.8,stairStart,stairStart+stairSweep,t=>t*4.25-.24,t=>t*4.25,96,concrete);
for(let i=0;i<36;i++){const start=stairStart+i/36*stairSweep,end=start+stairSweep/36,top=(i+1)/36*4.25;curvedBand(2.4,4.8,start,end,()=>top-.15,()=>top,3,white);}
for(const radius of [2.4,4.8])curvedBand(radius-.065,radius+.065,stairStart,stairStart+stairSweep,t=>t*4.25,t=>t*4.25+1.02,96,white);
box(3.5,.35,2.4,12,4.25,-1,concrete);
// Track lights and understated benches.
for(const x of [-8,0,8]){box(.045,.045,35,x,7.65,-5,metal);for(let z=-20;z<=10;z+=6){const head=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.22,12),metal);head.position.set(x,7.48,z);scene.add(head);}}
for(const x of [-9,6])for(const z of [-23,-14,-3]){const light=new THREE.SpotLight('#ffe4b4',36,15,Math.PI/5,.65,2);light.position.set(x,7.4,z);light.target.position.set(x,1.8,z-2);scene.add(light,light.target);}
const wood=new THREE.MeshStandardMaterial({color:'#8b6242',roughness:.55});
for(const [x,z] of [[-1,-6],[-10,-23]]){box(3,.18,.8,x,.5,z,wood,true);for(const offset of [-1,1])box(.12,.45,.6,x+offset,.23,z,metal);}
// Expansion joints, balcony fascia and ceiling reveals add human-scale detail.
for(let z=-24;z<=15;z+=6)box(29.3,.008,.014,0,-.025,z,new THREE.MeshStandardMaterial({color:'#a6a39b',roughness:1}));
for(const x of [-10.67,10.67])box(.035,.06,36,x,4.12,-3,metal);
for(const x of [-10,-3,10])for(const z of [-5,-19])box(.89,.09,.89,x,.035,z,concrete);
// Landscape beyond the glazing, imagined from the coastal view in the reference.
box(250,.08,250,0,-.55,-15,new THREE.MeshStandardMaterial({color:'#9da58a',roughness:1}));
box(230,.05,13,0,-.49,31,new THREE.MeshStandardMaterial({color:'#d8cbb0',roughness:1}));
const waterMap=surfaceTexture();waterMap.repeat.set(70,35);
box(250,.04,130,0,-.46,99,new THREE.MeshPhysicalMaterial({color:'#5a9daa',roughness:.22,metalness:.2,bumpMap:waterMap,bumpScale:.035}));
const foliageMaterials=['#526d4e','#70835d','#87926b'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
for(let i=0;i<18;i++){
  const x=(i<9?-1:1)*(22+i%9*3.5),z=-25+i%9*5;
  box(.32,3.2,.32,x,1,z,wood);
  for(let j=0;j<5;j++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.8+(i%3)*.25,1),foliageMaterials[(i+j)%3]);crown.position.set(x+Math.cos(j*2.4)*1.1,3.5+(j%3)*.7,z+Math.sin(j*2.4));crown.scale.set(1,1.15,1);crown.castShadow=true;scene.add(crown);}
}

const textureLoader=new THREE.TextureLoader();
function label(text,x,y,z,rotation=0){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#f6f6ef';ctx.fillRect(0,0,512,128);ctx.fillStyle='#3b4943';ctx.font='24px sans-serif';ctx.fillText(text.slice(0,35),20,48);ctx.fillStyle='#85928b';ctx.font='15px sans-serif';ctx.fillText('ANANSI · SELECT TO EXPLORE',20,82);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.38),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas)}));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);
}
function addPainting(work,index){
  const wall=work.placement||'North wall'; let x,y=2,z,rotation=0;
  if(wall==='West wall'){x=-14.48;z=-13-index*3;rotation=Math.PI/2;}
  else if(wall==='East wall'){x=14.48;z=-14-index*3;rotation=-Math.PI/2;}
  else if(wall==='South wall'){x=-10+index*4;z=-10.18;rotation=Math.PI;}
  else {x=-11+(index%6)*4;z=-26.78;}
  const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=rotation;scene.add(group);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(2.3,2.7,.12),metal);frame.castShadow=true;frame.receiveShadow=true;group.add(frame);
  const mount=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.6),white);mount.position.z=.065;group.add(mount);
  const mat=new THREE.MeshStandardMaterial({color:'#eee7da',roughness:.8});
  const art=new THREE.Mesh(new THREE.PlaneGeometry(2.12,2.52),mat);art.position.z=.072;group.add(art);
  if(work.image){textureLoader.load(work.image,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());const aspect=t.image.width/t.image.height,width=Math.min(2.12,2.52*aspect),height=width/aspect;art.scale.set(width/2.12,height/2.52,1);frame.scale.set((width+.18)/2.3,(height+.18)/2.7,1);mount.scale.set((width+.1)/2.2,(height+.1)/2.6,1);mat.map=t;mat.color.set('white');mat.needsUpdate=true;},undefined,()=>{});}
  else{label('Image awaiting upload',x,y,z+.1,rotation);}
  frame.userData.work=work;art.userData.work=work;targets.push(frame,art);
  label(work.name,x,.45,z+.13,rotation);
}
function addSculpture(work,index){
  const x=work.placement==='Window plinth'?11:1+index*4,z=-15;
  const plinth=box(1.6,.85,1.6,x,.425,z,white,true);
  const sculpture=new THREE.Mesh(new THREE.TorusKnotGeometry(.62,.14,96,14),new THREE.MeshStandardMaterial({color:'#b99769',metalness:.6,roughness:.32}));
  sculpture.position.set(x,1.55,z);sculpture.castShadow=true;sculpture.userData.work=work;scene.add(sculpture);targets.push(sculpture);
  label(work.name,x,.7,z+.82);plinth.userData.work=work;targets.push(plinth);
}
works.forEach((w,i)=>w.format==='Sculpture'?addSculpture(w,i):addPainting(w,i));

const people=[
 {name:'Amaka',role:'Artist · demo',color:'#b27c62',position:[-2,-16],reply:'Thanks for taking a look. For this demonstration, imagine we are talking about the materials and the story behind the work.'},
 {name:'Tomi',role:'Collector · demo',color:'#65789c',position:[3,-4],reply:'I love how the daylight changes the room. Which piece caught your attention?'},
 {name:'Nneka',role:'Visitor · demo',color:'#b6a25f',position:[-6,-22],reply:'I am taking my time with the exhibition. It is lovely to meet another visitor here.'}
];
function avatar(person){
  const group=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:person.color,roughness:.75});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.23,.6,4,8),mat);body.position.y=.95;group.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.2,14,10),new THREE.MeshStandardMaterial({color:'#cfbba0'}));head.position.y=1.55;group.add(head);
  for(const x of [-.12,.12]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.5,8),mat);leg.position.set(x,.28,0);group.add(leg);}
  group.position.set(person.position[0],0,person.position[1]);scene.add(group);group.traverse(m=>{if(m.isMesh){m.castShadow=true;m.userData.person=person;targets.push(m);}});person.mesh=group;
}
people.forEach(avatar);
const rooms={atrium:{position:[0,1.7,13],yaw:0,label:'The entrance atrium'},paintings:{position:[0,1.7,-19],yaw:0,label:'The painting room'},sculptures:{position:[2,1.7,-9],yaw:0,label:'The sculpture court'},upper:{position:[-12,6.125,-16],yaw:-Math.PI/2,label:'The upper gallery'}};
let yaw=0,pitch=0,drag=false,lastX,lastY,moved=0,keys=new Set();
function visitRoom(key){const r=rooms[key];camera.position.fromArray(r.position);yaw=r.yaw;pitch=0;camera.rotation.set(pitch,yaw,0);$('roomName').textContent=r.label;document.querySelectorAll('[data-room]').forEach(b=>b.classList.toggle('active',b.dataset.room===key));}
document.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>visitRoom(b.dataset.room));
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;moved=0;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;moved+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.004;pitch=Math.max(-1,Math.min(1,pitch-dy*.003));lastX=e.clientX;lastY=e.clientY;camera.rotation.set(pitch,yaw,0)});
canvas.addEventListener('pointerup',e=>{drag=false;if(moved<8)selectAt(e.clientX,e.clientY)});
canvas.addEventListener('pointercancel',()=>drag=false);
const raycaster=new THREE.Raycaster();
function selectAt(x,y){if(!started)return;raycaster.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1),camera);const hit=raycaster.intersectObjects(targets).find(h=>h.distance<22);if(!hit)return;if(hit.object.userData.work)openWork(hit.object.userData.work);else if(hit.object.userData.person){const p=hit.object.userData.person;if(camera.position.distanceTo(p.mesh.position)>5){toast('Walk a little closer to say hello.');return}startChat(p);}}
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='e')selectAt(innerWidth/2,innerHeight/2)});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
document.querySelectorAll('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.move)};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.move)});
function blocked(x,z,y){if(x<-14||x>14||z<-26||z>15)return true;return colliders.some(c=>y>c.minY&&y<c.maxY&&x>c.minX&&x<c.maxX&&z>c.minZ&&z<c.maxZ)}
function walkingHeight(x,z,current){
  const radius=Math.hypot(x-stairCentre.x,z-stairCentre.z);let angle=Math.atan2(z-stairCentre.z,x-stairCentre.x);if(angle<0)angle+=Math.PI*2;
  if(radius>2.65&&radius<4.55&&angle>=stairStart&&angle<=stairStart+stairSweep){const height=1.7+(angle-stairStart)/stairSweep*4.25;return Math.abs(height-current)<.38?height:null;}
  if(current>3){if(x<-11||z<-21.9||x>11)return Math.abs(current-6.125)<.38?6.125:null;return null;}
  return current<2.08?1.7:null;
}
function walk(dx,dz){const x=camera.position.x+dx,z=camera.position.z+dz,height=walkingHeight(x,z,camera.position.y);if(height!==null&&!blocked(x,z,height))camera.position.set(x,height,z);}
let previous=performance.now();
renderer.setAnimationLoop(now=>{
  const dt=Math.min((now-previous)/1000,.05);previous=now;
  if(started&&!document.querySelector('dialog[open]')){
    let f=(keys.has('w')||keys.has('arrowup')||keys.has('forward')?1:0)-(keys.has('s')||keys.has('arrowdown')||keys.has('backward')?1:0);
    let r=(keys.has('d')||keys.has('arrowright')||keys.has('right')?1:0)-(keys.has('a')||keys.has('arrowleft')||keys.has('left')?1:0);
    const norm=Math.hypot(f,r)||1,speed=3.1*dt/norm;const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*r)*speed,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*r)*speed;
    walk(dx,0);walk(0,dz);
    const nearby=people.find(p=>camera.position.distanceTo(p.mesh.position)<4);
    $('hint').textContent=nearby?'Near '+nearby.name+' · click their avatar to say hello':'Drag to look · WASD / arrows to walk · click artwork · E to inspect';
  }
  people.forEach((p,i)=>{p.mesh.position.x=p.position[0]+Math.sin(now*.00015+i)*.55;p.mesh.position.z=p.position[1]+Math.cos(now*.00015+i)*.3;p.mesh.rotation.y=Math.sin(now*.00015+i)*.6;});
  renderer.render(scene,camera);
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

function openWork(work){
  selectedWork=work;
  const image=work.image?'<img src="'+esc(work.image)+'" alt="'+esc(work.name)+'">':work.format==='Sculpture'?'Sculpture study · 3D model upload coming later':'Artwork image awaiting upload';
  const saved=stored('anansiSavedWorks',[]).includes(work.name);
  $('detailContent').innerHTML='<button class="close" id="closeDetail" aria-label="Close artwork details">×</button><div class="eyebrow">'+(work.demo?'PRESENTATION STUDY':'THE COLLECTION')+'</div><h2>'+esc(work.name)+'</h2><p>'+esc(work.artist)+'</p><div class="art-image">'+image+'</div><div class="meta"><span>'+esc(work.format||'Painting')+'</span><span>'+esc(work.price||'Price on request')+'</span><span>'+esc(work.status||'Exhibition study')+'</span></div><p class="story">'+esc(work.story||'The artist’s story will appear here when it is added to the catalogue.')+'</p><div class="actions"><button class="btn" id="saveWork">'+(saved?'Saved ✓':'Save work')+'</button><button class="btn" id="artistChat">Talk to the artist</button><button class="btn primary" id="enquire">Express interest</button></div>';
  $('closeDetail').onclick=()=>$('detail').close();$('saveWork').onclick=()=>{let list=stored('anansiSavedWorks',[]);if(!list.includes(work.name))list.push(work.name);localStorage.setItem('anansiSavedWorks',JSON.stringify(list));$('saveWork').textContent='Saved ✓';toast('Work saved to your visit.')};
  $('artistChat').onclick=()=>{ $('detail').close();startChat({name:work.artist,role:'Artist conversation · demo',reply:'Thank you for your interest in '+work.name+'. This is a simulated artist conversation for the presentation.'})};
  $('enquire').onclick=()=>{$('detail').close();$('interestTitle').textContent='Interest in '+work.name;$('collectorName').value=guest.name;$('interest').showModal()};
  $('detail').showModal();
}
function startChat(person){chatPerson=person;conversation=[];$('chatName').textContent=person.name;$('chatSubtitle').textContent=person.role;appendMessage(person.name,'Hello! Welcome to the gallery.');$('chat').showModal();}
function appendMessage(author,message,you=false){conversation.push({author,message,you});const node=document.createElement('div');node.className='message'+(you?' you':'');const who=document.createElement('small');who.textContent=author;node.append(who,document.createTextNode(message));$('messages').append(node);$('messages').scrollTop=$('messages').scrollHeight;}
$('closeChat').onclick=()=>$('chat').close();$('chat').addEventListener('close',()=>$('messages').replaceChildren());
$('chatForm').onsubmit=e=>{e.preventDefault();const message=$('chatInput').value.trim();if(!message)return;appendMessage(guest.name,message,true);$('chatInput').value='';appendMessage(chatPerson.name,chatPerson.reply)};
$('interestForm').onsubmit=e=>{e.preventDefault();const d=stored('anansiData',catalogue);d.leads=d.leads||[];d.leads.push({name:$('collectorName').value.trim(),email:$('collectorEmail').value.trim(),interest:selectedWork.name,message:$('collectorMessage').value.trim(),status:'New'});localStorage.setItem('anansiData',JSON.stringify(d));$('interest').close();toast('Interest saved for the curator in this browser.')};
$('entryForm').onsubmit=e=>{e.preventDefault();guest={name:$('guestName').value.trim(),color:$('guestColor').value};localStorage.setItem('anansiVisitor',JSON.stringify(guest));$('avatarButton').textContent=guest.name;$('avatarButton').style.borderColor=guest.color;$('welcome').close();started=true;toast('Welcome, '+guest.name+'. Take your time.')};
$('avatarButton').onclick=()=>{$('guestName').value=guest.name==='Guest'?'':guest.name;$('guestColor').value=guest.color;$('welcome').showModal()};
$('worksButton').onclick=()=>{ $('detailContent').innerHTML='<button class="close" id="closeDetail" aria-label="Close collection">×</button><div class="eyebrow">THE COLLECTION</div><h2>Works in this gallery</h2><p>Select a work to read its story or leave your interest.</p>'+works.map((w,i)=>'<button class="btn" style="display:flex;width:100%;margin-top:9px;justify-content:space-between" data-work="'+i+'">'+esc(w.name)+' <span>→</span></button>').join('');$('closeDetail').onclick=()=>$('detail').close();$('detailContent').querySelectorAll('[data-work]').forEach(b=>b.onclick=()=>{$('detail').close();openWork(works[Number(b.dataset.work)])});$('detail').showModal()};
$('loading').style.display='none';$('guestName').value=guest.name==='Guest'?'':guest.name;$('guestColor').value=guest.color;$('welcome').showModal();
