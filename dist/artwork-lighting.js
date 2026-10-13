import * as THREE from 'three';
export function createArtworkLighting({scene,camera,mobile,stored,save}){
 const entries=[],pool=[];let timer=0,settings=stored('anansiArtworkLighting',{}),active=[];
 const metal=new THREE.MeshStandardMaterial({color:'#343a36',roughness:.4,metalness:.7}),lens=new THREE.MeshBasicMaterial({color:'#fff1d8'});
 const key=work=>`${work.name}|${work.artist}|${work.placement||'model'}`;
 const level=work=>THREE.MathUtils.clamp(Number(settings[key(work)]??1)||0,0,2);
 for(let i=0;i<(mobile?4:8);i++){const light=new THREE.SpotLight('#ffe8cf',0,9,.48,.65,2);light.castShadow=i<(mobile?1:2);light.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);light.shadow.camera.near=.1;light.shadow.camera.far=9;light.shadow.normalBias=.015;scene.add(light,light.target);pool.push(light)}
 function add(work,{position,rotation=0,sculpture=false}){
  const normal=new THREE.Vector3(Math.sin(rotation),0,Math.cos(rotation));
  const target=position.clone();if(sculpture)target.y+=1.25;
  const source=target.clone().addScaledVector(normal,sculpture?1.3:.85);source.y+=sculpture?2.4:1.55;
  const fixture=new THREE.Group();fixture.position.copy(source);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.055,.065,.18,16),metal);body.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),target.clone().sub(source).normalize());fixture.add(body);
  const face=new THREE.Mesh(new THREE.CircleGeometry(.046,16),lens);face.position.copy(target.clone().sub(source).normalize().multiplyScalar(.092));face.lookAt(target.clone().sub(source));fixture.add(face);
  if(!sculpture){const arm=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.77,8),metal);arm.position.copy(normal.clone().multiplyScalar(-.385));arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);fixture.add(arm)}
  else{const length=8.18-source.y;if(length>0){const wire=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,length,6),metal);wire.position.set(0,length/2,0);fixture.add(wire)}}
  scene.add(fixture);entries.push({work,target,source,face});timer=1;
 }
 function update(dt,factor){timer+=dt;if(timer>.35){timer=0;const direction=camera.getWorldDirection(new THREE.Vector3());active=[...entries].sort((a,b)=>{const score=e=>{const delta=e.target.clone().sub(camera.position);return delta.length()+(delta.normalize().dot(direction)<-.15?14:0)};return score(a)-score(b)}).slice(0,pool.length)}
  pool.forEach((light,i)=>{const entry=active[i];if(!entry){light.intensity=0;return}light.position.copy(entry.source);light.target.position.copy(entry.target);light.intensity=60*factor*level(entry.work)});
  entries.forEach(entry=>entry.face.visible=level(entry.work)>0&&factor>.05);
 }
 window.addEventListener('storage',event=>{if(event.key==='anansiArtworkLighting')settings=stored('anansiArtworkLighting',{})});
 return {add,update,has:work=>entries.some(e=>e.work===work),level,set:(work,value)=>{const next={...settings,[key(work)]:THREE.MathUtils.clamp(value,0,2)};if(save('anansiArtworkLighting',next))settings=next},count:()=>entries.length};
}
