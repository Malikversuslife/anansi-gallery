import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
const lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
export function sampleCamera(progress,mobile=false){
 const points=[{p:0,eye:mobile?[3,2.4,14]:[0,2.4,14],look:mobile?[6,3,-4]:[0,3,-6],fov:mobile?65:55},{p:.38,eye:[-.9,2.25,3.5],look:[-4.8,2.5,-7.8],fov:mobile?65:53},{p:.72,eye:[-6.7,2.25,-3.8],look:[-8.6,2.18,-7.82],fov:mobile?65:48},{p:1,eye:[-8.6,2.2,-5.7],look:[-8.6,2.18,-7.82],fov:mobile?66:44}];
 const p=Math.max(0,Math.min(1,Number(progress)||0));let a=points[0],b=points[1];for(let i=1;i<points.length;i++)if(p>=points[i-1].p&&p<=points[i].p){a=points[i-1];b=points[i];break}const t=smooth((p-a.p)/(b.p-a.p));return {eye:a.eye.map((v,i)=>lerp(v,b.eye[i],t)),look:a.look.map((v,i)=>lerp(v,b.look[i],t)),fov:lerp(a.fov,b.fov,t)};
}
function disposeTree(root){const materials=new Set(),textures=new Set(),geometry=new Set();root.traverse(object=>{if(object.geometry)geometry.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value)}});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose())}
export async function createCinematicGallery(container){
 let disposed=false,enabled=true,inView=true,frame=0,target=0,current=0,invalid=true;
 const mobile=matchMedia('(max-width:650px)').matches;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1:1.35));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#cddcde');const camera=new THREE.PerspectiveCamera(55,1,.08,180);scene.add(new THREE.HemisphereLight('#eef5ff','#a49b87',1.3));
 const sun=new THREE.DirectionalLight('#fff1da',2.4);sun.position.set(-20,24,9);sun.target.position.set(0,0,-3);sun.castShadow=!mobile;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-23,right:23,top:25,bottom:-25,near:1,far:80});sun.shadow.normalBias=.025;scene.add(sun,sun.target);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.03);scene.environment=environment.texture;scene.environmentIntensity=.45;room.dispose();pmrem.dispose();
 const decoder=new DRACOLoader();decoder.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/gltf/');
 let reflector=null;
 const resize=()=>{if(disposed)return;const {width,height}=container.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();invalid=true;schedule()};
 const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0};
 function schedule(){if(!disposed&&enabled&&inView&&!document.hidden&&!frame)frame=requestAnimationFrame(draw)}
 function draw(){frame=0;if(disposed||!enabled||!inView||document.hidden)return;current+= (target-current)*.14;if(Math.abs(current-target)<.00015)current=target;const pose=sampleCamera(current,container.clientWidth<650);camera.position.fromArray(pose.eye);camera.lookAt(new THREE.Vector3().fromArray(pose.look));camera.fov=pose.fov;camera.updateProjectionMatrix();renderer.render(scene,camera);renderer.domElement.dataset.progress=current.toFixed(3);renderer.domElement.dataset.cameraPosition=pose.eye.map(n=>n.toFixed(3)).join(',');renderer.domElement.dataset.renderCount=String(Number(renderer.domElement.dataset.renderCount||0)+1);invalid=false;if(current!==target)schedule()}
 const onVisibility=()=>{if(document.hidden)stop();else {invalid=true;schedule()}};
 const onLost=event=>{event.preventDefault();stop();container.dispatchEvent(new Event('cinema-failed'))};
 const observation=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(!inView)stop();else if(invalid||current!==target)schedule()},{rootMargin:'80px'});
 const dispose=()=>{if(disposed)return;disposed=true;stop();observation.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);renderer.domElement.removeEventListener('webglcontextlost',onLost);reflector?.getRenderTarget().dispose();disposeTree(scene);environment.dispose();renderer.dispose();renderer.domElement.remove();decoder.dispose()};
 try{
  const model=await new GLTFLoader().setDRACOLoader(decoder).loadAsync('assets/anansi-exhibition.glb');scene.add(model.scene);model.scene.updateMatrixWorld(true);
  const replaced=new Set();
  model.scene.traverse(obj=>{
   if(!obj.isMesh)return;obj.castShadow=true;obj.receiveShadow=true;
   const adapt=material=>{
    if(material.name.includes('AI-generated presentation artwork')){replaced.add(material);return new THREE.MeshBasicMaterial({name:material.name,map:material.map,color:material.color,side:material.side,toneMapped:false})}
    if(material.transmission>0){material.transmission=0;material.transparent=true;material.opacity=.10;material.depthWrite=false;obj.castShadow=false}
    if(material.map)material.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    if(material.name==='Honed limestone floor'){material.roughness=.16;material.metalness=.08}return material;
   };
   obj.material=Array.isArray(obj.material)?obj.material.map(adapt):adapt(obj.material);
  });replaced.forEach(material=>material.dispose());
  const coast=await new THREE.TextureLoader().loadAsync('assets/coastal-panorama.jpg');coast.colorSpace=THREE.SRGBColorSpace;const scenery=new THREE.MeshBasicMaterial({map:coast,side:THREE.DoubleSide,toneMapped:false});for(const [x,z,rotation] of [[-48,0,Math.PI/2],[48,0,-Math.PI/2],[0,-55,0],[0,55,Math.PI]]){const plane=new THREE.Mesh(new THREE.PlaneGeometry(130,43.34),scenery);plane.position.set(x,1.7,z);plane.rotation.y=rotation;scene.add(plane)}
  for(const x of [-10.1,-8.6,-7.1]){const lamp=new THREE.SpotLight('#ffe9cf',160,14,Math.PI/5,.6,2);lamp.position.set(x,4.9,-5.7);lamp.target.position.set(x,2.18,-7.82);scene.add(lamp,lamp.target)}
  if(!mobile){reflector=new Reflector(new THREE.PlaneGeometry(23.7,33.7),{color:0xc8c5bd,textureWidth:512,textureHeight:384,clipBias:.003,multisample:0});reflector.rotation.x=-Math.PI/2;reflector.position.y=.012;scene.add(reflector)}
  decoder.dispose();container.append(renderer.domElement);renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Scroll-directed view through Anansi’s gallery');renderer.domElement.dataset.mode='cinematic';renderer.domElement.addEventListener('webglcontextlost',onLost);window.addEventListener('resize',resize);document.addEventListener('visibilitychange',onVisibility);observation.observe(container);resize();
  return {setProgress(p){target=Math.max(0,Math.min(1,p));if(target!==current||invalid)schedule()},setEnabled(value){enabled=value;if(enabled){invalid=true;schedule()}else stop()},dispose};
 }catch(error){dispose();throw error}
}
