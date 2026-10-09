import * as THREE from 'three';

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
scene.background = new THREE.Color('#dbe9ec');
scene.fog = new THREE.Fog('#dbe9ec',45,110);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75)); renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.35;
$('scene').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,150);
camera.position.set(0,1.7,13); camera.rotation.order='YXZ';
scene.add(new THREE.HemisphereLight('#eef7ff','#afaaa0',2.1));
const sun = new THREE.DirectionalLight('#fff3df',3.8); sun.position.set(-15,25,10); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:80}); sun.shadow.bias=-.0003; scene.add(sun);
const concrete=new THREE.MeshStandardMaterial({color:'#dfdfd7',roughness:.7});
const white=new THREE.MeshStandardMaterial({color:'#f1f0e9',roughness:.6});
const floor=new THREE.MeshStandardMaterial({color:'#d4d8d4',roughness:.32,metalness:.05});
const metal=new THREE.MeshStandardMaterial({color:'#616e6d',roughness:.35,metalness:.6});
const glass=new THREE.MeshPhysicalMaterial({color:'#b5d6df',transparent:true,opacity:.13,roughness:.05,depthWrite:false});
const dark=new THREE.MeshStandardMaterial({color:'#536862',roughness:.55});
const colliders=[], targets=[];
function box(w,h,d,x,y,z,mat=white,collision=false) {
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);
  if(collision)colliders.push({minX:x-w/2-.35,maxX:x+w/2+.35,minZ:z-d/2-.35,maxZ:z+d/2+.35,minY:y-h/2,maxY:y+h/2});
  return m;
}
// Double-height atrium with glazed frontage, deep painting wing and upper balcony.
box(30,.3,44,0,-.18,-5,floor); box(30,.25,44,0,8,-5,white);
// Side boundaries are glass; movement bounds keep guests inside the building.
box(30,8,.3,0,4,-27,white,true);
for(let z=-24;z<=14;z+=6){box(.07,7.5,.08,-14.72,3.8,z,metal);box(.07,7.5,.08,14.72,3.8,z,metal);}
box(.04,7.5,41,-14.7,3.8,-5,glass);box(.04,7.5,41,14.7,3.8,-5,glass);
for(const x of [-10,-3,10]){box(.85,8,.85,x,4,-5,concrete,true);box(.85,8,.85,x,4,-19,concrete,true);}
box(30,.35,5,0,4.25,-24,concrete); box(4,.35,36,-12.7,4.25,-3,concrete); box(4,.35,14,12.7,4.25,-18,concrete);
box(30,1.1,.05,0,4.9,-21.5,glass);box(.05,1.1,36,-10.7,4.9,-3,glass);
for(let z=-23;z<=13;z+=4)box(.05,1.2,.05,-10.7,4.9,z,metal);
// Dividing walls leave generous passages into the exhibition rooms.
box(8,3.6,.25,-10,1.8,-10,white,true);box(5,3.6,.25,12.5,1.8,-10,white,true);
box(.25,3.6,8,-7,1.8,-18,white,true);
// Sweeping, sculptural stair with a navigable centre line.
const stairCentre=new THREE.Vector3(8,0,2);
for(let i=0;i<30;i++){
  const angle=-Math.PI/2+i/29*Math.PI*1.3, radius=3.6;
  const x=stairCentre.x+Math.cos(angle)*radius,z=stairCentre.z+Math.sin(angle)*radius,y=(i+1)/30*4.25;
  const step=box(2.5,.14,.62,x,y,z,concrete);step.rotation.y=-angle;
}
function stairParapet(radius){
  const vertices=[],indices=[];
  for(let i=0;i<=90;i++){const t=i/90,angle=-Math.PI/2+t*Math.PI*1.3;for(const h of [0,.95])vertices.push(8+Math.cos(angle)*radius,t*4.25+h,2+Math.sin(angle)*radius);if(i<90){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const parapet=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#eeeae0',roughness:.6,side:THREE.DoubleSide}));parapet.castShadow=true;scene.add(parapet);
}
stairParapet(4.8);stairParapet(2.4);
box(4,.3,5,10.7,4.25,-3.5,concrete);
// Track lights and understated benches.
for(const x of [-8,0,8]){box(.06,.06,35,x,7.65,-5,metal);for(let z=-20;z<=10;z+=6){box(.12,.22,.25,x,7.48,z,dark);const light=new THREE.PointLight('#fff5db',8,11,2);light.position.set(x,5.8,z);scene.add(light);}}
box(3,.45,.8,-1,.4,-6,concrete,true);box(3,.45,.8,-10,.4,-23,concrete,true);
// Landscape beyond the glazing, imagined from the coastal view in the reference.
box(160,.08,160,0,-.55,-15,new THREE.MeshStandardMaterial({color:'#a7bab0',roughness:1}));
box(160,.04,85,0,-.49,70,new THREE.MeshStandardMaterial({color:'#94bcc9',roughness:.2}));
for(let i=0;i<14;i++){const g=new THREE.Mesh(new THREE.ConeGeometry(3+i%3,8,7),new THREE.MeshStandardMaterial({color:'#94a797',roughness:1}));g.position.set((i<7?-1:1)*(24+i%7*5),3,-15-i%7*5);scene.add(g);}

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
  const frame=new THREE.Mesh(new THREE.BoxGeometry(2.3,2.7,.12),dark);group.add(frame);
  const mat=new THREE.MeshStandardMaterial({color:'#eee7da',roughness:.8});
  const art=new THREE.Mesh(new THREE.PlaneGeometry(2.12,2.52),mat);art.position.z=.07;group.add(art);
  if(work.image){textureLoader.load(work.image,t=>{t.colorSpace=THREE.SRGBColorSpace;mat.map=t;mat.color.set('white');mat.needsUpdate=true;},undefined,()=>{});}
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
const rooms={atrium:{position:[0,1.7,13],yaw:0,label:'The entrance atrium'},paintings:{position:[0,1.7,-19],yaw:0,label:'The painting room'},sculptures:{position:[2,1.7,-9],yaw:0,label:'The sculpture court'},upper:{position:[-12,6,-16],yaw:-Math.PI/2,label:'The upper gallery'}};
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
let previous=performance.now();
renderer.setAnimationLoop(now=>{
  const dt=Math.min((now-previous)/1000,.05);previous=now;
  if(started&&!document.querySelector('dialog[open]')){
    let f=(keys.has('w')||keys.has('arrowup')||keys.has('forward')?1:0)-(keys.has('s')||keys.has('arrowdown')||keys.has('backward')?1:0);
    let r=(keys.has('d')||keys.has('arrowright')||keys.has('right')?1:0)-(keys.has('a')||keys.has('arrowleft')||keys.has('left')?1:0);
    const norm=Math.hypot(f,r)||1,speed=3.1*dt/norm;const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*r)*speed,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*r)*speed;
    if(!blocked(camera.position.x+dx,camera.position.z,camera.position.y))camera.position.x+=dx;
    if(!blocked(camera.position.x,camera.position.z+dz,camera.position.y))camera.position.z+=dz;
    if(camera.position.y>5.7 && !(camera.position.x<-10.4 || camera.position.z<-21 || (camera.position.x>10.5 && camera.position.z<-1))){camera.position.x-=dx;camera.position.z-=dz;}
    // Follow the curved staircase while inside its walking band.
    const sx=camera.position.x-8,sz=camera.position.z-2,rad=Math.hypot(sx,sz);
    let angle=Math.atan2(sz,sx);if(angle<-Math.PI/2)angle+=Math.PI*2;
    if(rad>2.5&&rad<4.7&&angle>=-Math.PI/2&&angle<=Math.PI*.8)camera.position.y=1.7+(angle+Math.PI/2)/(Math.PI*1.3)*4.25;
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
