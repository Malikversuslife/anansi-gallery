import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export const defaultLook={body:'neutral',skin:'#bd8e69',hair:'#30251f',hairStyle:'curly',outfit:'casual',top:'#347d78',bottom:'#35454b',accessory:'none',build:'balanced',facialHair:'none',shoes:'sneakers'};
// Modular adult-proportioned study: interchangeable anatomy and fitted clothing.
export function createAvatar(look={}){
 const a={...defaultLook,...look},g=new THREE.Group(),female=a.body==='feminine',male=a.body==='masculine';
 const mat=(color,r=.8)=>new THREE.MeshStandardMaterial({color,roughness:r});
 const skin=new THREE.MeshPhysicalMaterial({color:a.skin,roughness:.48,clearcoat:.08}),hair=mat(a.hair),top=mat(a.top,.9),bottom=mat(a.bottom,.9),white=mat('#e9e5db'),dark=mat('#252428'),lip=mat('#815049');
 const mesh=(geo,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o};
 const oval=(m,x,y,z,sx,sy,sz)=>{const o=mesh(new THREE.SphereGeometry(1,24,16),m,x,y,z);o.scale.set(sx,sy,sz);return o};
 const segment=(m,p,q,r1,r2)=>{p=new THREE.Vector3(...p);q=new THREE.Vector3(...q);const d=q.clone().sub(p),o=mesh(new THREE.CylinderGeometry(r2,r1,d.length(),16),m,...p.clone().add(q).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o};
 const profile=(points,m,depth=.72)=>{const o=mesh(new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),32),m);o.scale.z=depth;return o};
 const curve=(pts,m,r=.005)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),20,r,8,false),m);
 const shoulder=male?.235:female?.195:.215,hip=female?.18:.16,dress=a.outfit==='dress',skirt=a.outfit==='skirt',formal=a.outfit==='formal',coat=a.outfit==='coat';
 for(const s of [-1,1]){
  const x=s*.105,k=x+s*.01,leg=dress||skirt?skin:bottom;
  segment(leg,[x,.84,0],[k,.46,.016],.075,.055);oval(leg,k,.46,.016,.056,.06,.058);segment(leg,[k,.46,.016],[x,.10,0],.053,.039);
  const shoe=a.shoes==='sneakers'?white:dark;mesh(new RoundedBoxGeometry(.13,.095,.255,3,.025),shoe,x,.057,.06);mesh(new RoundedBoxGeometry(.137,.024,.264,2,.008),dark,x,.018,.06);
  if(a.shoes==='boots')segment(dark,[x,.075,0],[x,.24,0],.047,.054);
 }
 profile([[0,.78],[hip,.78],[hip+.015,.88],[hip,.96],[.13,1.02],[0,1.03]],dress?top:bottom);
 profile([[0,.89],[hip,.89],[female?.137:.16,1.03],[female?.155:.19,1.18],[shoulder,1.31],[.16,1.37],[.06,1.4],[0,1.4]],top,.67);
 for(const s of [-1,1]){
  const p=[s*shoulder,1.315,0],e=[s*(shoulder+.05),1.06,.025],w=[s*(shoulder+.07),.835,.08],sleeve=formal||coat?top:skin;
  oval(top,...p,.073,.081,.075);segment(top,p,[s*(shoulder+.035),1.17,.012],.069,.054);segment(sleeve,[s*(shoulder+.035),1.17,.012],e,.054,.043);oval(sleeve,...e,.044,.05,.046);segment(sleeve,e,w,.044,.032);
  oval(skin,s*(shoulder+.07),.79,.085,.038,.058,.023);oval(skin,s*(shoulder+.045),.8,.105,.015,.031,.018);
 }
 if(dress||skirt)profile([[0,.49],[.245,.49],[.235,.54],[.195,.74],[hip+.01,.9],[.15,.96],[0,.96]],dress?top:bottom);
 if(coat)profile([[0,.70],[.20,.70],[.19,.97],[.18,1.14],[0,1.14]],top);
 if(formal||coat){mesh(new RoundedBoxGeometry(.09,.31,.015,2,.01),white,0,1.23,.132);for(const s of [-1,1]){const lapel=mesh(new RoundedBoxGeometry(.06,.29,.018,2,.007),top,s*.07,1.23,.15);lapel.rotation.z=-s*.28}for(const y of [1.12,1.04,.96])oval(dark,.018,y,.135,.008,.008,.006)}
 segment(skin,[0,1.36,0],[0,1.49,0],.052,.046);
 oval(skin,0,1.605,-.007,female?.104:.111,.139,.10);oval(skin,0,1.532,.025,female?.076:.09,.08,.075);oval(skin,0,1.488,.046,.053,.035,.041);
 const iris=mat('#55412e',.4);
 for(const s of [-1,1]){
  oval(skin,s*.107,1.588,-.002,.022,.037,.017);oval(skin,s*.063,1.564,.072,.041,.034,.029);
  oval(white,s*.044,1.619,.090,.023,.010,.009);oval(iris,s*.044,1.619,.100,.007,.007,.003);oval(dark,s*.044,1.619,.103,.0035,.0045,.002);oval(white,s*.042,1.622,.105,.0018,.0018,.001);
  curve([[s*.021,1.648,.087],[s*.043,1.655,.096],[s*.068,1.648,.084]],hair,.004);
 }
 oval(skin,0,1.592,.09,.014,.032,.016);oval(skin,0,1.567,.108,.019,.014,.022);curve([[-.024,1.535,.097],[0,1.532,.107],[.024,1.535,.097]],lip,.004);
 if(a.facialHair==='beard'){oval(hair,0,1.492,.057,.052,.037,.027);for(const x of [-.069,.069])oval(hair,x,1.514,.036,.021,.04,.024)}
 if(a.facialHair!=='none')curve([[-.026,1.546,.101],[0,1.55,.108],[.026,1.546,.101]],hair,.005);
 if(a.hairStyle!=='none'){
  const scalp=mesh(new THREE.SphereGeometry(.117,28,18,0,Math.PI*2,0,Math.PI*.49),hair,0,1.622,-.012);scalp.scale.set(1,1.12,.95);
  if(a.hairStyle==='short')for(let i=0;i<18;i++){const x=-.095+i*.011;curve([[x,1.69,.06],[x+.008,1.743,0],[x,1.70,-.07]],hair,.003)}
  if(a.hairStyle==='curly')for(let ring=0;ring<3;ring++)for(let i=0;i<12;i++){const angle=i*Math.PI/6+ring*.24;oval(hair,Math.cos(angle)*(.075-ring*.022),1.718+ring*.025,Math.sin(angle)*(.073-ring*.023)-.01,.028,.026,.027)}
  if(a.hairStyle==='locs')for(let i=0;i<15;i++){const t=i*Math.PI*2/15,x=Math.cos(t)*.109,z=Math.sin(t)*.09-.02;curve([[x*.75,1.735,z*.75],[x,1.69,z],[x*1.03,z>.025?1.62:1.43,z-.015]],hair,.011)}
  if(a.hairStyle==='bob'||a.hairStyle==='long')for(let i=0;i<22;i++){const t=.23+i*(Math.PI*2-.46)/21,x=Math.sin(t)*.112,z=Math.cos(t)*-.10-.023;curve([[x*.75,1.72,z*.8],[x*1.08,1.59,z],[x*.95,a.hairStyle==='long'?1.26:1.47,z-.005]],hair,.012)}
  if(a.hairStyle==='bun'){oval(hair,0,1.726,-.07,.074,.06,.075);oval(hair,0,1.724,-.146,.062,.062,.059)}
 }
 if(a.accessory==='glasses'){for(const x of [-.044,.044]){const rim=mesh(new THREE.TorusGeometry(.029,.003,8,24),dark,x,1.619,.108);rim.scale.y=.72}curve([[-.014,1.62,.11],[0,1.627,.113],[.014,1.62,.11]],dark,.0025);for(const s of [-1,1])curve([[s*.074,1.62,.10],[s*.107,1.62,0]],dark,.0025)}
 if(a.accessory==='cap'){mesh(new THREE.SphereGeometry(.124,24,12,0,Math.PI*2,0,Math.PI*.5),top,0,1.68,-.01);oval(top,0,1.68,.099,.108,.009,.093)}
 g.scale.x=a.build==='slim'?.89:a.build==='broad'?1.13:1;g.userData={characterStudy:true,rigged:false};return g;
}
