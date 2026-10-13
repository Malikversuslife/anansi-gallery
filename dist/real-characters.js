import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {skinOptions,hairOptions,prepareAppearance,applyAppearance} from './avatar-appearance.js';
export const characterOptions=[['female','Tied-back hair · tailored jacket'],['male','Short hair · denim jacket'],['bob','Dark bob · sleeveless tunic'],['polo','Short brown hair · polo & shorts'],['curls','Curly hair · hooded jacket'],['covered','Head covering · flowing outfit']];
export const defaultLook={model:'female',skinTone:'original',hairColor:'original',top:'#ffffff',bottom:'#ffffff',shoeColor:'#ffffff',accessoryColor:'#bfa374',shoes:'original',eyewear:'none',earrings:'none',watch:'none',build:'balanced',turn:0};
export function normalizeLook(look={}){
 const a={...defaultLook,...look};if(!characterOptions.some(([key])=>key===a.model))a.model='female';
 for(const key of ['top','bottom','shoeColor','accessoryColor'])if(!/^#[0-9a-f]{6}$/i.test(a[key]))a[key]=defaultLook[key];
 for(const [key,values] of [['shoes',['original','sneakers','boots']],['eyewear',['none','optical','sun']],['earrings',['none','hoops']],['watch',['none','watch']],['build',['slim','balanced','broad']]])if(!values.includes(a[key]))a[key]=defaultLook[key];
 for(const [key,options] of [['skinTone',skinOptions],['hairColor',hairOptions]])if(!options.some(([value])=>value===a[key]))a[key]='original';
 if(a.model==='covered')a.earrings='none';if(a.model==='female')a.shoes='original';a.turn=Math.max(-180,Math.min(180,Number(a.turn)||0));return a;
}
const library=new Map();
export async function loadCharacters(){
 const draco=new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/gltf/');
 const loader=new GLTFLoader().setDRACOLoader(draco);
 try{await Promise.all([...characterOptions.map(([key])=>key),'footwear-sneakers','footwear-boots'].map(async key=>{
  const asset=await loader.loadAsync(`assets/characters/${key}.glb`);
  asset.scene.traverse(obj=>{if(obj.isMesh)for(const material of Array.isArray(obj.material)?obj.material:[obj.material])prepareAppearance(material,key)});
  library.set(key,asset);
 }))}finally{draco.dispose()}
}
export function createAvatar(look={}){
 const a=normalizeLook(look),key=a.model,source=library.get(key);
 if(!source)throw new Error('The detailed character models are not ready.');
 const group=clone(source.scene),owned=new Map();
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
 wrapper.userData.model=key;return wrapper;
}
export function disposeAvatar(avatar){avatar?.userData.dispose?.()}
export function seatedPose(avatar){
 if(avatar.userData.mixer)avatar.userData.mixer.timeScale=0;avatar.updateMatrixWorld(true);
 const bones=new Map();avatar.traverse(o=>{if(o.isBone)bones.set(o.name.replaceAll('_',' '),o)});
 function point(b){return b.getWorldPosition(new THREE.Vector3())}
 function aim(name,childName,direction){const bone=bones.get(name),child=bones.get(childName);if(!bone||!child)return;const current=point(child).sub(point(bone)).normalize(),desired=new THREE.Vector3(...direction).normalize(),delta=new THREE.Quaternion().setFromUnitVectors(current,desired),world=bone.getWorldQuaternion(new THREE.Quaternion());const local=world.clone().invert().multiply(delta).multiply(world);bone.quaternion.multiply(local);avatar.updateMatrixWorld(true)}
 for(const side of ['L','R']){aim(`Bip01 ${side} Thigh`,`Bip01 ${side} Calf`,[0,-.22,1]);aim(`Bip01 ${side} Calf`,`Bip01 ${side} Foot`,[0,-1,0])}
 // Align the pelvis to the real bench seat, leaving the thigh supported.
 const pelvis=bones.get('Bip01 Pelvis');if(pelvis)avatar.position.y+=.62-point(pelvis).y;
 return avatar;
}
