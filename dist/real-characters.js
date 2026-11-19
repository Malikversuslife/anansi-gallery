import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {skinOptions,hairOptions,prepareAppearance,applyAppearance,forgetAppearance,skinColourFor,hairColourFor} from './avatar-appearance.js';
// The original bodies, A01 (male) and A02 (female), assembled from parts. On for every visitor (owner, 2026-11-18);
// ?a01=0 leaves them out (presets only).
// Without it this file behaves as in source/dist.
export const a01Trial=new URLSearchParams(location.search).get('a01')!=='0';
export const characterOptions=[['female','Tied-back hair · tailored jacket'],['male','Short hair · denim jacket'],['bob','Dark bob · sleeveless tunic'],['polo','Short brown hair · polo & shorts'],['curls','Curly hair · hooded jacket'],['covered','Head covering · flowing outfit']];
export const defaultLook={model:a01Trial?'a02':'female',skinTone:'original',hairColor:'original',top:'#ffffff',bottom:'#ffffff',shoeColor:'#ffffff',accessoryColor:'#bfa374',shoes:'original',eyewear:'none',earrings:'none',watch:'none',build:'balanced',outer:'jacket',topStyle:'tee',bottomStyle:'trousers',topPrint:'plain',bottomPrint:'plain',headwear:'none',hairStyle:'default',facialHair:'default',bag:'none',faceShape:0,jaw:0,chin:0,cheeks:0,nose:0,noseLength:0,lips:0,mouth:0,eyes:0,eyeSpacing:0,lipColor:'original',turn:0};
// Face sliders, -1..1: each drives one of a pair of face morphs (original bodies only).
export const FACE_SLIDERS=[['faceShape','face_angular','face_soft'],['jaw','jaw_wide','jaw_narrow'],['chin','chin_strong','chin_soft'],['cheeks','cheeks_high','cheeks_flat'],['nose','nose_wide','nose_narrow'],['noseLength','noselen_long','noselen_short'],['lips','lips_full','lips_thin'],['mouth','mouth_wide','mouth_narrow'],['eyes','eyes_large','eyes_small'],['eyeSpacing','spacing_wide','spacing_close']];
export function normalizeLook(look={}){
 const a={...defaultLook,...look};if(!characterOptions.some(([key])=>key===a.model))a.model='female';
 for(const key of ['top','bottom','shoeColor','accessoryColor'])if(!/^#[0-9a-f]{6}$/i.test(a[key]))a[key]=defaultLook[key];
 for(const [key,values] of [['shoes',['original','sneakers','boots','court','workboots','kneeboots','sandals','heelboots','none']],['outer',['jacket','zip','leather','harrington','overcoat','cardigan','blazer','longcoat','bomber','shearling','none']],['bag',['none','crossbody','hobo']],['topStyle',['tee','knit','quarterzip','sleeveless','dress','vneck','mididress','turtleneck','offshoulder']],['bottomStyle',['trousers','shorts','wide','skirt','mini','slim','pencil','jeans']],['topPrint',['plain','wax']],['bottomPrint',['plain','wax']],['headwear',['none','wrap','cap','fedora','newsboy','beret']],['hairStyle',['default','coils','straight','buzz']],['facialHair',['default','none','stubble','moustache','goatee','boxed','full']],['eyewear',['none','optical','sun']],['earrings',['none','hoops','links']],['watch',['none','watch']],['build',['slim','balanced','broad']]])if(!values.includes(a[key]))a[key]=defaultLook[key];
 for(const [key,options] of [['skinTone',skinOptions],['hairColor',hairOptions]])if(!options.some(([value])=>value===a[key]))a[key]='original';
 // Original bodies are assembled from parts: outer layer, footwear (loafers or barefoot) and earrings are independent slots.
 if(ORIGINALS[a.model]){if(!['original','sneakers','boots','court','workboots','kneeboots','sandals','heelboots','none'].includes(a.shoes))a.shoes='original'}else{a.headwear='none';a.bag='none';if(!['original','sneakers','boots'].includes(a.shoes))a.shoes='original';if(a.earrings==='links')a.earrings='hoops';a.outer='jacket'}if(a.model==='covered')a.earrings='none';if(a.model==='female')a.shoes='original';a.turn=Math.max(-180,Math.min(180,Number(a.turn)||0));if(!ORIGINALS[a.model]||!/^#[0-9a-f]{6}$/i.test(a.lipColor))a.lipColor='original';for(const [key] of FACE_SLIDERS)a[key]=ORIGINALS[a.model]?Math.round(Math.max(-1,Math.min(1,Number(a[key])||0))*100)/100:0;return a;
}
if(a01Trial)characterOptions.push(['a01','Original body · A01'],['a02','Original body · A02']);
const library=new Map();
// Both bodies share material names. Each has its own painted skin, so each tint starts from its own base colour.
const ORIGINALS={a01:{skin:'#64412f',hair:'#1a1412'},a02:{skin:'#a06748',hair:'#1a1412'}};
// Explicit mapping: A01 has its own material names, and three pose clips of which only one may play at a time.
// Lip colour: the skin's colour attribute carries a lip mask (red channel, from the split); the shader mixes the chosen
// colour in there, keeping the painted texture's light and shade.
function lipShader(copy,hex){
 const lip={value:new THREE.Color(hex)};
 copy.onBeforeCompile=sh=>{
  sh.uniforms.lipColor=lip;
  sh.vertexShader=sh.vertexShader.replace('#include <common>',`#include <common>
attribute vec4 lipMask;
varying float vLip;`).replace('#include <begin_vertex>',`#include <begin_vertex>
vLip=lipMask.r;`);
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform vec3 lipColor;
varying float vLip;`).replace('#include <map_fragment>',`#include <map_fragment>
{float m=smoothstep(.12,.7,vLip);float l=dot(diffuseColor.rgb,vec3(.299,.587,.114));diffuseColor.rgb=mix(diffuseColor.rgb,lipColor*(.55+1.2*l),.82*m);}`);
 };
 copy.customProgramCacheKey=()=>'anansi-lip';
}
function a01Tint(copy,a,base){
 const name=copy.name;
 // The skin's colour attribute is the lip mask, not a colour: GLTFLoader would multiply the skin by it.
 if(name.startsWith('A01 Skin'))copy.vertexColors=false;
 if(name.startsWith('A01 Skin')&&/^#[0-9a-f]{6}$/i.test(a.lipColor||''))lipShader(copy,a.lipColor);
 const gain=(target,base)=>{const t=new THREE.Color(target),b=new THREE.Color(base);return new THREE.Color(t.r/b.r,t.g/b.g,t.b/b.b)};
 // White means "original colours", as with the presets. Any other choice replaces the garment colour; fabric detail stays.
 const replace=hex=>{if(hex.toLowerCase()!=='#ffffff')copy.color.set(hex)};
 // Wax print: an original repeating pattern, replacing the fabric colour of the top or the bottoms.
 if((a.topPrint==='wax'&&/^A01 (Tee|Knit|Quarter-zip \| charcoal|Sleeveless top|Dress|V-neck blouse|Midi dress|Turtleneck \| knit|Off-shoulder dress \| knit)/.test(name))||(a.bottomPrint==='wax'&&/^A01 (Trousers|Shorts|Wide trousers \| navy|Skirt|Mini skirt|Slim trousers|Pencil skirt \| wool|Jeans \| denim)/.test(name))){copy.map=waxTexture();copy.color.set('#ffffff');return}
 if(name.startsWith('A01 Headwrap')){copy.map=waxTexture();copy.color.set('#ffffff');return}
 if(name.startsWith('A01 Jacket | ink')||name.startsWith('A01 Zip jacket | olive')||name.startsWith('A01 Leather jacket | black')||name.startsWith('A01 Harrington | red')||name.startsWith('A01 Overcoat | camel')||name.startsWith('A01 Dress')||name.startsWith('A01 Midi dress')||name.startsWith('A01 Cardigan | oat')||/^A01 (Turtleneck \| knit|Blazer \| wool|Long coat \| (wool|skirt)|Bomber \| suede|Shearling jacket \| leather|Off-shoulder dress \| knit)/.test(name))replace(a.top);
 else if(name.startsWith('A01 Skirt')||name.startsWith('A01 Mini skirt')||name.startsWith('A01 Slim trousers')||name.startsWith('A01 Pencil skirt | wool')||name.startsWith('A01 Jeans | denim'))replace(a.bottom);
 else if(name.startsWith('A01 Ankle boots | black')||name.startsWith('A01 Court sneakers | leather')||name.startsWith('A01 Work boots | nubuck')||name.startsWith('A01 Knee boots | leather')||name.startsWith('A01 Heeled sandals | leather')||name.startsWith('A01 Heeled boots | leather'))replace(a.shoeColor);
 else if(name.startsWith('A01 Wide trousers | navy'))replace(a.bottom);
 else if(name.startsWith('A01 Watch | steel'))copy.color.set(a.accessoryColor);
 else if(name.startsWith('A01 Shorts'))replace(a.bottom);
 else if(name.startsWith('A01 Trainers | canvas'))replace(a.shoeColor);
 else if(name.startsWith('A01 Trousers'))replace(a.bottom);
 else if(name.startsWith('A01 Loafers | oxblood'))replace(a.shoeColor);
 else if(name.startsWith('A01 Earring'))copy.color.set(a.accessoryColor);
 else if(name.startsWith('A01 Skin')&&skinColourFor(a.skinTone))copy.color.multiply(gain(skinColourFor(a.skinTone),base.skin));
 else if((name.startsWith('A01 Hair')||name.startsWith('A01 Brows')||name.startsWith('A01 Facial hair'))&&hairColourFor(a.hairColor))copy.color.multiply(gain(hairColourFor(a.hairColor),base.hair));
}
// An original wax-print-style pattern (not a copy of any existing cloth): ochre medallions ringed in cream on
// indigo, with teal petals and small cream dots between them. Drawn once, tiled across the garment's UVs.
let wax=null;
function waxTexture(){
 if(wax)return wax;
 const S=512,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
 g.fillStyle='#1d3557';g.fillRect(0,0,S,S);
 const cell=S/4;
 for(let r=0;r<5;r++)for(let q=-1;q<5;q++){
  const x=q*cell+(r%2?cell/2:0)+cell/2,y=r*cell;
  for(let k=0;k<8;k++){const a=k*Math.PI/4;g.fillStyle='#2a9d8f';g.beginPath();g.ellipse(x+Math.cos(a)*50,y+Math.sin(a)*50,13,6,a,0,Math.PI*2);g.fill()}
  g.fillStyle='#e0a526';g.beginPath();g.arc(x,y,38,0,Math.PI*2);g.fill();
  g.strokeStyle='#f4e9d0';g.lineWidth=7;g.beginPath();g.arc(x,y,25,0,Math.PI*2);g.stroke();
  g.fillStyle='#b4432b';g.beginPath();g.arc(x,y,11,0,Math.PI*2);g.fill();
  g.fillStyle='#f4e9d0';for(const [dx,dy] of [[cell/2,cell/2],[-cell/2,cell/2]]){g.beginPath();g.arc(x+dx*.5,y+dy*.5,4,0,Math.PI*2);g.fill()}
 }
 wax=new THREE.CanvasTexture(c);wax.colorSpace=THREE.SRGBColorSpace;wax.wrapS=wax.wrapT=THREE.RepeatWrapping;wax.repeat.set(6,6);wax.anisotropy=4;
 return wax;
}
// Heels: after every animation update, each foot turns about the ankle (toes down) by the shoe's angle, the toes turn
// back flat, and the hips rise until the balls of the feet are on the floor again (not when seated). The bones are put
// back before the next update, so nothing builds up whether or not a clip drives them.
function heelPose(wrapper,group,deg){
 if(!deg)return;
 const bones={};group.traverse(o=>{if(o.isBone)bones[o.name]=o});
 const pel=bones.pelvis,feet=['l','r'].map(s=>[bones['foot_'+s],bones['ball_'+s]]);
 if(!pel||feet.some(([f,b])=>!f||!b))return;
 const mixer=wrapper.userData.mixer,update=mixer.update.bind(mixer),th=deg*Math.PI/180,tracked=[pel,...feet.flat()];
 const qp=new THREE.Quaternion(),qr=new THREE.Quaternion(),qa=new THREE.Quaternion(),axis=new THREE.Vector3(),v=new THREE.Vector3();
 let saved=null;
 function turn(bone,ang){bone.parent.getWorldQuaternion(qp);qr.setFromAxisAngle(axis,ang);bone.quaternion.premultiply(qp.clone().invert().multiply(qr).multiply(qp));bone.updateMatrixWorld(true)}
 function apply(){
  saved=tracked.map(b=>[b.position.clone(),b.quaternion.clone()]);
  wrapper.updateMatrixWorld(true);wrapper.getWorldQuaternion(qa);axis.set(1,0,0).applyQuaternion(qa);
  let drop=0;
  for(const [foot,ball] of feet){const before=ball.getWorldPosition(v).y;turn(foot,th);turn(ball,-th);drop=Math.max(drop,before-ball.getWorldPosition(v).y)}
  if(!wrapper.userData.seated&&drop>0){const p=pel.getWorldPosition(new THREE.Vector3()),a1=pel.parent.worldToLocal(p.clone()),a2=pel.parent.worldToLocal(p.clone().add(new THREE.Vector3(0,drop,0)));pel.position.add(a2.sub(a1));pel.updateMatrixWorld(true)}
 }
 mixer.update=dt=>{if(saved)tracked.forEach((b,i)=>{b.position.copy(saved[i][0]);b.quaternion.copy(saved[i][1])});const r=update(dt);apply();return r};
 wrapper.userData.heel=deg;
}
function a01Pose(wrapper,clipName){
 const {mixer,clips}=wrapper.userData;mixer.stopAllAction();
 mixer.clipAction(clips.find(c=>c.name===clipName)).play();mixer.update(0);wrapper.updateMatrixWorld(true);
}
// Parts: each original body has a manifest, a body file (skin pieces, eyes, brows, animation clips) and one file per part.
// Every part is skinned to the same skeleton and re-bound to the body's bones by name.
const PARTS_DIR='assets/characters/parts/';
const parts=new Map();
// On demand: at start each original body loads its manifest, its body and only the parts its default outfit uses.
// Any other part is fetched the first time a look asks for it (see ensureParts); until then createAvatar falls back
// to a loaded style in that slot, so it never waits. The loader stays open for these later fetches.
let partsLoader=null;
function getPartsLoader(){
 if(!partsLoader){const draco=new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/gltf/');partsLoader=new GLTFLoader().setDRACOLoader(draco)}
 return partsLoader;
}
function neededFiles(set,a){
 const choice=partChoice(a,set.manifest);
 return [...new Set(Object.entries(choice).map(([slot,id])=>set.manifest.slots[slot]?.find(e=>e.id===id)?.file).filter(Boolean))];
}
// Phones and tablets get smaller textures: iPhone Safari gives a page little graphics memory, and running out of it
// lost the 3D context (the page restarted, then drew characters black). Shrunk once, before anything reads them.
const SMALL_GPU=matchMedia('(max-width:819px),(pointer:coarse)').matches;
function shrinkTextures(root,max){
 if(!SMALL_GPU)return;
 const seen=new Set();
 root.traverse(o=>{if(!o.isMesh)return;for(const m of [].concat(o.material))for(const k of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','specularMap']){
  const t=m[k];if(!t||seen.has(t))continue;seen.add(t);const img=t.image,w=img?.width,h=img?.height;
  if(!w||!h||Math.max(w,h)<=max)continue;
  const k2=max/Math.max(w,h),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k2));c.height=Math.max(1,Math.round(h*k2));
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);img.close?.();t.image=c;t.needsUpdate=true}});
}
function freeSkeletons(root){const seen=new Set();root.traverse(o=>{if(o.isSkinnedMesh&&o.skeleton&&!seen.has(o.skeleton)){seen.add(o.skeleton);o.skeleton.dispose()}})}
function disposeAsset(root){
 const textures=new Set();
 root.traverse(o=>{if(!o.isMesh)return;o.geometry?.dispose();for(const m of [].concat(o.material)){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose()}});
 textures.forEach(t=>t.dispose());
}
function fetchPart(set,key,file){
 if(set.files.has(file))return Promise.resolve();
 if(!set.pending.has(file))set.pending.set(file,getPartsLoader().loadAsync(`${PARTS_DIR}${key}/${file}?v=18`).then(g=>{shrinkTextures(g.scene,1024);mergeAlike(g.scene);set.files.set(file,g);set.pending.delete(file);window.a01TrialPartsFetched=(window.a01TrialPartsFetched||0)+1},e=>{set.pending.delete(file);console.warn('Avatar part failed to load:',file,e)}));
 return set.pending.get(file);
}
async function loadParts(key){
 const manifest=await (await fetch(`${PARTS_DIR}${key}/manifest.json?v=18`)).json();
 const body=await getPartsLoader().loadAsync(`${PARTS_DIR}${key}/body.glb?v=18`);
 shrinkTextures(body.scene,1024);   // the skin is 2048 on desktop
 mergeSkin(body.scene);
 // The skin's colour attribute is the lip mask: rename it so nothing treats it as vertex colour.
 body.scene.traverse(o=>{const g=o.geometry;if(o.userData?.anansi_skin_ranges&&g?.attributes.color){g.setAttribute('lipMask',g.attributes.color);g.deleteAttribute('color')}});
 mergeAlike(body.scene);   // eyes (whites, iris, pupil) become one draw call; the brows' finish is too different to join them
 const set={manifest,body,files:new Map(),pending:new Map(),skinCache:new Map()};
 parts.set(key,set);
 await Promise.all(neededFiles(set,normalizeLook({...defaultLook,model:key})).map(f=>fetchPart(set,key,f)));
}
// True when every part this look needs is already loaded (always true for the presets).
export function partsReady(look={}){
 const a=normalizeLook(look),set=parts.get(a.model);
 if(!presetsNeeded(a).every(k=>library.has(k)))return false;
 return !set||neededFiles(set,a).every(f=>set.files.has(f));
}
// Loads every part this look needs; resolves when they are all in.
export async function ensureParts(look={}){
 const a=normalizeLook(look),set=parts.get(a.model);
 await Promise.all(presetsNeeded(a).map(loadPreset));
 if(set)await Promise.all(neededFiles(set,a).map(f=>fetchPart(set,a.model,f)));
}
// The skin comes in pieces, each tagged with the parts ("slot:style") that cover it. They are merged into one mesh,
// and each avatar draws only the pieces its outfit leaves visible: one draw call, however many styles exist.
function mergeSkin(scene){
 const pieces=[];scene.traverse(o=>{if(o.isSkinnedMesh&&'anansi_hidden_by' in o.userData)pieces.push(o)});
 if(pieces.length<2)return;
 const merged=mergeGeometries(pieces.map(p=>p.geometry),true);
 if(!merged){console.warn('Skin pieces could not be merged; drawing them separately.');return}
 const ranges=merged.groups.map((g,i)=>({start:g.start,count:g.count,hiddenBy:(pieces[i].userData.anansi_hidden_by||'').split(',').filter(Boolean)}));
 // mergeGeometries drops morphTargetsRelative; glTF morphs are offsets, so without it the skin collapses on slim/broad.
 merged.morphTargetsRelative=pieces[0].geometry.morphTargetsRelative;
 merged.clearGroups();merged.computeBoundingSphere();
 const first=pieces[0],mesh=new THREE.SkinnedMesh(merged,first.material);
 mesh.name='A01 Skin';mesh.userData={anansi_skin_ranges:ranges};
 mesh.position.copy(first.position);mesh.quaternion.copy(first.quaternion);mesh.scale.copy(first.scale);
 mesh.morphTargetDictionary={...first.morphTargetDictionary};mesh.morphTargetInfluences=new Array(first.morphTargetInfluences.length).fill(0);
 first.parent.add(mesh);mesh.bind(first.skeleton,first.bindMatrix);
 for(const p of pieces)p.parent.remove(p);
}
// Draw calls: inside one part file, opaque meshes whose materials look alike (both non-metal or both metal, roughness
// within .45) are merged into a single mesh, one draw call. Each vertex keeps its source material's colour as a vertex
// colour, worked out per avatar after tinting (coloredGeometry). Transparent and cut-out materials (lenses, hair
// strands), metal details next to cloth (zips, clasps, watch case) and the coat's seated-hidden skirt stay separate.
const mergedInfo=new WeakMap();
function sameSkin(a,b){
 if(a.skeleton!==b.skeleton&&(a.skeleton.bones.length!==b.skeleton.bones.length||a.skeleton.bones.some((bn,i)=>bn.name!==b.skeleton.bones[i].name)))return false;
 if(!a.bindMatrix.equals(b.bindMatrix))return false;
 const ka=Object.keys(a.morphTargetDictionary||{}).sort().join(),kb=Object.keys(b.morphTargetDictionary||{}).sort().join();
 return ka===kb;
}
function alike(a,b){
 const ma=a.material,mb=b.material;
 return Math.abs((ma.metalness||0)-(mb.metalness||0))<=.3&&Math.abs((ma.roughness??1)-(mb.roughness??1))<=.45&&sameSkin(a,b);
}
function plainGeometry(mesh,morphOrder){
 // Same attribute set and array types for every source, so they can be merged (Draco may decode them differently).
 const src=mesh.geometry,n=src.attributes.position.count,g=new THREE.BufferGeometry();
 const copy=(attr,size,Arr)=>{const out=new Arr(n*size),get=['getX','getY','getZ','getW'];for(let i=0;i<n;i++)for(let k=0;k<size;k++)out[i*size+k]=attr?attr[get[k]](i):0;return new THREE.BufferAttribute(out,size)};
 g.setAttribute('position',copy(src.attributes.position,3,Float32Array));
 g.setAttribute('normal',copy(src.attributes.normal,3,Float32Array));
 g.setAttribute('uv',copy(src.attributes.uv,2,Float32Array));
 g.setAttribute('skinIndex',copy(src.attributes.skinIndex,4,Uint16Array));
 g.setAttribute('skinWeight',copy(src.attributes.skinWeight,4,Float32Array));
 if(morphOrder.length){
  const dict=mesh.morphTargetDictionary;
  g.morphAttributes.position=morphOrder.map(name=>copy(src.morphAttributes.position[dict[name]],3,Float32Array));
  g.morphTargetsRelative=src.morphTargetsRelative;
 }
 g.setIndex(src.index?new THREE.BufferAttribute(Uint32Array.from(src.index.array),1):null);
 if(!src.index){const idx=new Uint32Array(n);for(let i=0;i<n;i++)idx[i]=i;g.setIndex(new THREE.BufferAttribute(idx,1))}
 return g;
}
function mergeAlike(scene){
 const candidates=[];
 scene.traverse(o=>{if(o.isSkinnedMesh&&!o.userData.anansi_skin_ranges&&!o.userData.anansi_hide_seated&&!('anansi_hidden_by' in o.userData)
  &&!Array.isArray(o.material)&&!o.material.transparent&&!(o.material.alphaTest>0))candidates.push(o)});
 const tris=o=>o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count;
 const left=candidates.sort((x,y)=>tris(y)-tris(x));
 let saved=0;
 while(left.length){
  const main=left.shift(),group=[main];
  // Small details (under 15% of the main mesh: zips, clasps, buckles, a watch dial) join whatever their finish; at
  // gallery distance a zip's metallic sheen doesn't show, but its draw call costs the same as a jacket's.
  for(let i=0;i<left.length;)if(alike(main,left[i])||(tris(left[i])<.15*tris(main)&&sameSkin(main,left[i])))group.push(...left.splice(i,1));else i++;
  if(group.length<2)continue;
  const morphOrder=Object.keys(main.morphTargetDictionary||{}).sort((x,y)=>main.morphTargetDictionary[x]-main.morphTargetDictionary[y]);
  const merged=mergeGeometries(group.map(o=>plainGeometry(o,morphOrder)),false);
  if(!merged){console.warn('Could not merge part meshes',group.map(o=>o.name));continue}
  merged.morphTargetsRelative=main.geometry.morphTargetsRelative;   // mergeGeometries drops it (see mergeSkin)
  merged.computeBoundingSphere();
  let at=0;const sources=group.map(o=>{const count=o.geometry.attributes.position.count,s={material:o.material,start:at,count};at+=count;return s});
  const mesh=new THREE.SkinnedMesh(merged,main.material);
  mesh.name=main.name;mesh.userData={...main.userData};
  mesh.position.copy(main.position);mesh.quaternion.copy(main.quaternion);mesh.scale.copy(main.scale);
  if(morphOrder.length){mesh.morphTargetDictionary=Object.fromEntries(morphOrder.map((k,i)=>[k,i]));mesh.morphTargetInfluences=new Array(morphOrder.length).fill(0)}
  main.parent.add(mesh);mesh.bind(main.skeleton,main.bindMatrix);
  for(const o of group)o.parent.remove(o);
  mergedInfo.set(merged,{sources,cache:new Map()});
  saved+=group.length-1;
 }
 return saved;
}
// The merged mesh's colours for one set of tinted materials: shares every attribute but its own colour buffer, cached
// per colour combination (so repeated looks don't allocate again).
function coloredGeometry(src,info,colors){
 const key=colors.map(c=>c.getHexString()).join('');
 if(info.cache.has(key))return info.cache.get(key);
 const g=new THREE.BufferGeometry();for(const [k,v] of Object.entries(src.attributes))g.setAttribute(k,v);
 g.morphAttributes=src.morphAttributes;g.morphTargetsRelative=src.morphTargetsRelative;g.setIndex(src.index);g.boundingSphere=src.boundingSphere;
 const col=new Float32Array(src.attributes.position.count*3);
 info.sources.forEach((s,i)=>{const c=colors[i];for(let v=s.start;v<s.start+s.count;v++){col[v*3]=c.r;col[v*3+1]=c.g;col[v*3+2]=c.b}});
 g.setAttribute('color',new THREE.BufferAttribute(col,3));
 info.cache.set(key,g);return g;
}
// One index buffer per visible-piece pattern, shared by every avatar wearing that pattern (attributes are shared too).
function skinGeometry(set,src,ranges,worn){
 const vis=ranges.map(r=>!r.hiddenBy.some(k=>worn.has(k))),key=vis.map(Number).join('');
 if(set.skinCache.has(key))return set.skinCache.get(key);
 const g=new THREE.BufferGeometry();for(const [k,v] of Object.entries(src.attributes))g.setAttribute(k,v);
 g.morphAttributes=src.morphAttributes;g.morphTargetsRelative=src.morphTargetsRelative;
 const idx=src.index.array;let total=0;ranges.forEach((r,i)=>{if(vis[i])total+=r.count});
 const out=new idx.constructor(total);let at=0;ranges.forEach((r,i)=>{if(vis[i]){out.set(idx.subarray(r.start,r.start+r.count),at);at+=r.count}});
 g.setIndex(new THREE.BufferAttribute(out,1));g.boundingSphere=src.boundingSphere;
 set.skinCache.set(key,g);return g;
}
// Which part fills each slot for this look. Slots not in the look use the body's first (only) style.
function partChoice(a,manifest){
 const ids=slot=>(manifest.slots[slot]||[]).filter(e=>e.file).map(e=>e.id);
 const pick=(slot,want)=>ids(slot).includes(want)?want:ids(slot)[0];
 return {hair:pick('hair',a.hairStyle==='default'?manifest.defaults?.hair:a.hairStyle),top:pick('top',a.topStyle),bottoms:pick('bottoms',a.bottomStyle),
  outer:a.outer==='none'?'none':pick('outer',a.outer),
  shoes:a.shoes==='none'?'none':pick('shoes',{sneakers:'trainers',original:'loafers'}[a.shoes]||a.shoes),
  earrings:a.earrings==='none'?'none':pick('earrings',a.earrings==='links'?'links':ids('earrings').find(i=>i!=='links')),
  headwear:a.headwear==='none'?'none':pick('headwear',a.headwear),
  eyewear:a.eyewear==='none'?'none':pick('eyewear',a.eyewear),
  wrist:a.watch==='none'?'none':pick('wrist','watch'),
  bag:a.bag==='none'?'none':pick('bag',a.bag),
  // Facial hair: 'default' is the body's own (A01's goatee, none for A02).
  facialhair:(()=>{const want=a.facialHair==='default'?(manifest.defaults?.facialhair||'none'):a.facialHair;return want==='none'||!ids('facialhair').includes(want)?'none':want})()};
}
function createA01(a){
 const set=parts.get(a.model),group=clone(set.body.scene),owned=new Map(),bones=new Map();
 group.traverse(o=>{if(o.isBone)bones.set(o.name,o)});
 const choice=partChoice(a,set.manifest);
 // A part not loaded yet: fetch it, and meanwhile wear a loaded style in that slot (or nothing, if the slot is optional).
 const missing=[];
 for(const [slot,id] of Object.entries(choice)){
  const entry=set.manifest.slots[slot]?.find(e=>e.id===id);if(!entry?.file||set.files.has(entry.file))continue;
  missing.push(entry.file);fetchPart(set,a.model,entry.file);
  const stand=set.manifest.slots[slot].find(e=>e.file&&set.files.has(e.file));
  choice[slot]=stand&&['hair','top','bottoms'].includes(slot)?stand.id:'none';
 }
 const worn=new Set(Object.entries(choice).filter(([,id])=>id!=='none').map(([slot,id])=>`${slot}:${id}`));
 let host=null;group.traverse(o=>{if(!host&&o.isSkinnedMesh)host=o.parent});
 // A part can hide whole slots while it's worn: the headwrap covers all the hair.
 const hiddenSlots=new Set(Object.entries(choice).flatMap(([slot,id])=>set.manifest.slots[slot]?.find(e=>e.id===id)?.hides||[]));
 // A hidden slot is not worn: its part is skipped, and it no longer hides the skin beneath it (a dress replaces the bottoms).
 for(const k of [...worn])if(hiddenSlots.has(k.split(':')[0]))worn.delete(k);
 for(const [slot,id] of Object.entries(choice)){
  if(hiddenSlots.has(slot))continue;
  const entry=set.manifest.slots[slot]?.find(e=>e.id===id);if(!entry?.file)continue;
  set.files.get(entry.file).scene.traverse(o=>{if(!o.isSkinnedMesh)return;
   const m=o.clone();m.bind(new THREE.Skeleton(o.skeleton.bones.map(b=>bones.get(b.name)),o.skeleton.boneInverses),o.bindMatrix);
   m.userData.slot=slot;host.add(m)});
 }
 group.traverse(o=>{if(o.userData?.anansi_skin_ranges)o.geometry=skinGeometry(set,o.geometry,o.userData.anansi_skin_ranges,worn)});
 const morphs={slim:'build_slim',broad:'build_broad'};
 group.traverse(obj=>{if(!obj.isMesh)return;obj.castShadow=true;obj.receiveShadow=true;
  // Skin under a worn garment is hidden, so it can never show through.
  const hiddenBy=(obj.userData.anansi_hidden_by||'').split(',').filter(Boolean);if(hiddenBy.some(s=>worn.has(s)))obj.visible=false;
  if(obj.morphTargetDictionary){obj.morphTargetInfluences.fill(0);const k=obj.morphTargetDictionary[morphs[a.build]];if(k!==undefined)obj.morphTargetInfluences[k]=1;faceMorphs(obj,a)}
  const tint=material=>{if(!owned.has(material)){const copy=material.clone();a01Tint(copy,a,ORIGINALS[a.model]);owned.set(material,copy)}return owned.get(material)};
  const info=mergedInfo.get(obj.geometry);
  if(info){
   // A merged mesh: each source keeps its own (tinted) colour as vertex colours; the main material's map, normal map
   // and finish apply to all of them.
   const colors=info.sources.map(s=>tint(s.material).color);
   obj.geometry=coloredGeometry(obj.geometry,info,colors);
   const m=tint(info.sources[0].material).clone();m.color.setRGB(1,1,1);m.vertexColors=true;owned.set(Symbol(),m);
   obj.material=m;return;
  }
  obj.material=Array.isArray(obj.material)?obj.material.map(tint):tint(obj.material)});
 const wrapper=new THREE.Group();wrapper.add(group);
 const mixer=new THREE.AnimationMixer(group);wrapper.userData={mixer,clips:set.body.animations,model:a.model,a01:true,parts:choice,partsPending:missing};
 // A slow looping idle, paused for visitors who ask for reduced motion. Each A01 starts at its own point in the loop.
 heelPose(wrapper,group,set.manifest.slots.shoes?.find(e=>e.id===choice.shoes)?.heel);
 a01Pose(wrapper,'A01_Idle');
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)mixer.timeScale=0;else mixer.setTime(Math.random()*6);
 // Each skinned part has its own skeleton, and each skeleton its own bone texture on the GPU: free them with the
 // avatar (leaving them made every rebuild leak about 17 textures, and the iPhone ran out of graphics memory).
 wrapper.userData.dispose=()=>{mixer.stopAllAction();mixer.uncacheRoot(group);owned.forEach(m=>m.dispose());freeSkeletons(group)};
 return wrapper;
}
// Presets load on demand (each is 1-2.5 MB and about 28 MB of textures on the GPU; phones ran out of memory when all six
// and both footwear sets loaded at start). Only what the room shows at start is loaded then.
const presetPending=new Map();
function loadPreset(key){
 if(library.has(key))return Promise.resolve();
 if(!presetPending.has(key))presetPending.set(key,getPartsLoader().loadAsync(`assets/characters/${key}.glb`).then(asset=>{
  shrinkTextures(asset.scene,512);
  asset.scene.traverse(obj=>{if(obj.isMesh)for(const material of Array.isArray(obj.material)?obj.material:[obj.material])prepareAppearance(material,key)});
  library.set(key,asset);presetPending.delete(key);presetLastUsed.set(key,performance.now());setTimeout(releasePresets,21000);
 }));
 return presetPending.get(key);
}
// Presets nobody is wearing are released (oldest first), keeping a few on desktop and none on phones; Mira's stays.
const presetUsers=new Map(),presetLastUsed=new Map();
function presetUse(key,delta){presetUsers.set(key,Math.max(0,(presetUsers.get(key)||0)+delta));presetLastUsed.set(key,performance.now())}
function releasePresets(){
 // A preset loaded or worn in the last 20 seconds stays: one that has only just arrived has no wearer yet (releasing
 // it then made every preset fall back to A02 on phones).
 const now=performance.now();
 const spare=[...library.keys()].filter(k=>!ORIGINALS[k]&&k!=='bob'&&!(presetUsers.get(k)>0)&&now-(presetLastUsed.get(k)||0)>20000).sort((a,b)=>(presetLastUsed.get(a)||0)-(presetLastUsed.get(b)||0));
 const keep=SMALL_GPU?0:3;
 for(const k of spare.slice(0,Math.max(0,spare.length-keep))){disposeAsset(library.get(k).scene);forgetAppearance(k);library.delete(k)}
}
function presetsNeeded(a){
 if(ORIGINALS[a.model])return [];
 return [a.model,...(a.shoes==='sneakers'||a.shoes==='boots'?['footwear-'+a.shoes]:[])];
}
export async function loadCharacters(){
 let saved={};try{saved=JSON.parse(localStorage.getItem('anansiAvatar')||'{}')}catch{}
 const start=new Set(['bob',...(a01Trial?[]:['female','male']),...(saved.model?presetsNeeded(normalizeLook(saved)):[])]);
 try{await Promise.all([...start].map(loadPreset));
 if(a01Trial){const started=performance.now();await Promise.all(Object.keys(ORIGINALS).map(key=>loadParts(key)));window.a01TrialLoadMs=Math.round(performance.now()-started);
  // (the private-trial badge was removed when the original bodies went live)
 }
 }finally{}
}
export function createAvatar(look={}){
 const a=normalizeLook(look),key=a.model,source=library.get(key);
 if(ORIGINALS[key]&&parts.has(key))return createA01(a);
 if(!source){
  // Not loaded yet: start it, and meanwhile wear a body that is (callers redraw when ensureParts resolves).
  loadPreset(key);
  const stand=['a02','a01','female','bob'].find(k=>ORIGINALS[k]?parts.has(k):library.has(k));
  if(!stand)throw new Error('The detailed character models are not ready.');
  const avatar=createAvatar({...a,model:stand});avatar.userData.partsPending=['preset:'+key];return avatar;
 }
 const group=clone(source.scene),owned=new Map();
 const users=[key,...(a.shoes==='sneakers'||a.shoes==='boots'?['footwear-'+a.shoes]:[])];users.forEach(k=>presetUse(k,1));
 group.traverse(obj=>{
  const name=obj.name;
  if(name.startsWith('accessory_'))obj.visible=name.startsWith('accessory_'+a.eyewear)||name.startsWith('accessory_'+a.earrings)||name.startsWith('accessory_'+a.watch);
  if(name.startsWith('shoe_'))obj.visible=false;
  if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;
  const original=Array.isArray(obj.material)?obj.material:[obj.material];if(original.every(m=>m.name.startsWith('outfit_shoes')))obj.visible=a.shoes==='original';
  const tint=material=>{if(!owned.has(material)){const copy=material.clone();applyAppearance(copy,material,a);if(copy.name.startsWith('outfit_top'))copy.color.set(a.top);if(copy.name.startsWith('outfit_bottom_extension'))copy.color.multiply(new THREE.Color(a.bottom));else if(copy.name.startsWith('outfit_bottom'))copy.color.set(a.bottom);if(copy.name.startsWith('outfit_shoes')||copy.name.startsWith('footwear_color'))copy.color.multiply(new THREE.Color(a.shoeColor));if(copy.name.startsWith('accessory_metal')||copy.name.startsWith('accessory_frame'))copy.color.set(a.accessoryColor);if(copy.name.includes('opacity')){copy.alphaTest=.45;copy.transparent=false;copy.side=THREE.DoubleSide}owned.set(material,copy)}return owned.get(material)};obj.material=Array.isArray(obj.material)?obj.material.map(tint):tint(obj.material)
 }});
 const wrapper=new THREE.Group();wrapper.add(group);wrapper.scale.x=a.build==='slim'?.96:a.build==='broad'?1.04:1;
 wrapper.userData.dispose=()=>owned.forEach(m=>m.dispose());
 if(source.animations.length){const mixer=new THREE.AnimationMixer(group);source.animations.forEach(clip=>mixer.clipAction(clip).play());mixer.update(0);wrapper.userData.mixer=mixer;wrapper.userData.dispose=()=>{mixer.stopAllAction();mixer.uncacheRoot(group);owned.forEach(m=>m.dispose())}}
 if(a.shoes!=='original'){
  const shoeSource=library.get('footwear-'+a.shoes);wrapper.updateMatrixWorld(true);
  const bones=new Map();group.traverse(o=>{if(o.isBone)bones.set(o.name.replaceAll('_',' '),o)});
  for(const [side,key] of [['L','left'],['R','right']]){
   const bone=bones.get(`Bip01 ${side} Foot`),template=shoeSource?.scene.getObjectByName('foot_'+key);if(!bone||!template)continue;
   const item=template.clone(true);item.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const tint=m=>{if(!owned.has(m)){const copy=m.clone();copy.color.multiply(new THREE.Color(a.shoeColor));owned.set(m,copy)}return owned.get(m)};o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material)}});
   shoeSource.scene.updateMatrixWorld(true);const point=bone.getWorldPosition(new THREE.Vector3()),bottom=new THREE.Box3().setFromObject(template).min.y;point.y=wrapper.getWorldPosition(new THREE.Vector3()).y-bottom*wrapper.getWorldScale(new THREE.Vector3()).y;
   const desired=wrapper.matrixWorld.clone().setPosition(point);item.matrix.copy(bone.matrixWorld.clone().invert().multiply(desired));item.matrixAutoUpdate=false;bone.add(item);
  }
 }
 const dispose=wrapper.userData.dispose;let released=false;
 wrapper.userData.dispose=()=>{dispose?.();freeSkeletons(group);if(!released){released=true;users.forEach(k=>presetUse(k,-1));setTimeout(releasePresets,21000)}};
 wrapper.userData.model=key;return wrapper;
}
// Some morph pairs read subtly at gallery distance; the slider's ends drive them harder (morphs are linear).
const FACE_GAIN={mouth:1.6,eyeSpacing:1.8};
function faceMorphs(obj,a){const d=obj.morphTargetDictionary;if(!d)return;for(const [key,pos,neg] of FACE_SLIDERS){const v=(Number(a[key])||0)*(FACE_GAIN[key]||1);if(d[pos]!==undefined)obj.morphTargetInfluences[d[pos]]=Math.max(0,v);if(d[neg]!==undefined)obj.morphTargetInfluences[d[neg]]=Math.max(0,-v)}}
// Change only the face of an existing avatar (cheap: no rebuild), e.g. while a slider is dragged.
export function setFace(avatar,look){const a=normalizeLook(look);avatar?.traverse(o=>{if(o.isMesh)faceMorphs(o,a)})}
export function disposeAvatar(avatar){avatar?.userData.dispose?.()}
const BENCH_TOP=.54,A01_HIP_OVER_SEAT=.082,A01_FOOT_HEIGHT=.083;
// The clip was built for a .458 m seat. On the real bench the hips rise, so the thighs slope down to keep the feet on the floor.
function a01SeatOnBench(avatar){
 a01Pose(avatar,'A01_Seated');avatar.userData.mixer.timeScale=0;avatar.traverse(o=>{if(o.userData?.anansi_hide_seated)o.visible=false});
 const bones=new Map();avatar.traverse(o=>{if(o.isBone)bones.set(o.name,o)});
 const at=name=>bones.get(name).getWorldPosition(new THREE.Vector3());
 avatar.position.y+=BENCH_TOP+A01_HIP_OVER_SEAT-at('thigh_l').y;avatar.updateMatrixWorld(true);
 const aim=(name,child,direction,keep)=>{const bone=bones.get(name),current=at(child).sub(at(name)).normalize(),wanted=new THREE.Vector3(...direction).normalize(),delta=new THREE.Quaternion().setFromUnitVectors(current,wanted),world=bone.getWorldQuaternion(new THREE.Quaternion());bone.quaternion.multiply(world.clone().invert().multiply(delta).multiply(world));avatar.updateMatrixWorld(true);if(keep){const target=keep.quat,now=keep.bone.parent.getWorldQuaternion(new THREE.Quaternion());keep.bone.quaternion.copy(now.invert().multiply(target));avatar.updateMatrixWorld(true)}};
 for(const [side,s] of [['l',1],['r',-1]]){
  const foot=bones.get('foot_'+side),keep={bone:foot,quat:foot.getWorldQuaternion(new THREE.Quaternion())};
  // Find the slope that puts the foot on the floor.
  let low=0,high=.6;for(let i=0;i<10;i++){const slope=(low+high)/2;aim('thigh_'+side,'calf_'+side,[s*.06,-slope,1]);aim('calf_'+side,'foot_'+side,[s*.01,-1,-.04],keep);if(at('foot_'+side).y>A01_FOOT_HEIGHT)low=slope;else high=slope}
  // Hands rest on the thighs rather than floating above them.
  aim('lowerarm_'+side,'hand_'+side,[-s*.16,-.86,1]);
 }
 return avatar;
}
export function seatedPose(avatar){
 if(avatar.userData.a01){avatar.userData.seated=true;return a01SeatOnBench(avatar)}
 if(avatar.userData.mixer)avatar.userData.mixer.timeScale=0;avatar.updateMatrixWorld(true);
 const bones=new Map();avatar.traverse(o=>{if(o.isBone)bones.set(o.name.replaceAll('_',' '),o)});
 function point(b){return b.getWorldPosition(new THREE.Vector3())}
 function aim(name,childName,direction){const bone=bones.get(name),child=bones.get(childName);if(!bone||!child)return;const current=point(child).sub(point(bone)).normalize(),desired=new THREE.Vector3(...direction).normalize(),delta=new THREE.Quaternion().setFromUnitVectors(current,desired),world=bone.getWorldQuaternion(new THREE.Quaternion());const local=world.clone().invert().multiply(delta).multiply(world);bone.quaternion.multiply(local);avatar.updateMatrixWorld(true)}
 for(const side of ['L','R']){aim(`Bip01 ${side} Thigh`,`Bip01 ${side} Calf`,[0,-.22,1]);aim(`Bip01 ${side} Calf`,`Bip01 ${side} Foot`,[0,-1,0])}
 // Align the pelvis to the real bench seat, leaving the thigh supported.
 const pelvis=bones.get('Bip01 Pelvis');if(pelvis)avatar.position.y+=.62-point(pelvis).y;
 return avatar;
}
