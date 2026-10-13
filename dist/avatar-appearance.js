import * as THREE from 'three';

export const skinOptions=[['original','Original complexion'],['porcelain','Light · neutral'],['sand','Light · warm'],['honey','Medium · golden'],['umber','Deep · warm'],['espresso','Very deep · neutral']];
export const hairOptions=[['original','Original hair colour'],['black','Soft black'],['brown','Dark brown'],['chestnut','Chestnut'],['auburn','Auburn'],['blonde','Dark blonde'],['silver','Silver']];
const skinColours={porcelain:'#d9b5a0',sand:'#c79572',honey:'#a66e48',umber:'#75472f',espresso:'#4f3328'};
const hairColours={black:'#221e1c',brown:'#38251b',chestnut:'#65412b',auburn:'#793c27',blonde:'#aa8550',silver:'#94918a'};

// These atlas guides follow the existing hairlines; they are not demographic labels.
// Coordinates use image space (top-left origin). Skin/strand colour refines the edges.
const hairlines={
 female:[[0,.45],[.17,.44],[.20,.33],[.28,.30],[.33,.21],[.41,.17],[.52,.105],[.62,.18],[.68,.22],[.72,.30],[.80,.32],[.84,.44],[1,.45]],
 male:[[0,.44],[.18,.44],[.22,.31],[.29,.29],[.36,.20],[.45,.11],[.55,.11],[.65,.20],[.71,.29],[.78,.31],[.83,.44],[1,.44]],
 bob:[[0,.59],[.24,.59],[.29,.49],[.31,.35],[.39,.25],[.51,.17],[.59,.18],[.64,.29],[.67,.45],[.76,.59],[1,.59]],
 polo:[[0,.44],[.18,.44],[.23,.35],[.29,.30],[.35,.18],[.44,.17],[.55,.14],[.64,.17],[.71,.30],[.77,.35],[.83,.44],[1,.44]],
 curls:[[0,.43],[.18,.43],[.23,.31],[.29,.29],[.35,.17],[.42,.145],[.52,.12],[.62,.16],[.68,.22],[.72,.30],[.77,.34],[.83,.44],[1,.44]]
};
const cached=new WeakMap();
const atlases=new Map();
function ramp(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
function ellipse(x,y,cx,cy,rx,ry){return 1-ramp(.8,1.2,Math.hypot((x-cx)/rx,(y-cy)/ry))}

export function prepareAppearance(material,model){
 if(cached.has(material))return cached.get(material);
 const region=material.name.match(/_(head|body|opacity)$/)?.[1]||(/^outfit_(top|bottom)$/.test(material.name)?'body':null);
 if(!region||!material.map)return null;
 const atlasKey=model+'/'+region;
 if(atlases.has(atlasKey)){const result=atlases.get(atlasKey);cached.set(material,result);return result}
 const image=material.map.image,w=image.width,h=image.height;
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,w,h).data;
 const guide=document.createElement('canvas');guide.width=w;guide.height=h;
 const gc=guide.getContext('2d',{willReadFrequently:true});
 if(region==='head'&&hairlines[model]){
  gc.fillStyle='white';gc.beginPath();gc.moveTo(0,0);gc.lineTo(w,0);
  for(const [x,y] of [...hairlines[model]].reverse())gc.lineTo(x*w,y*h);
  gc.closePath();gc.fill();
  if(model==='female')gc.fillRect(.5*w,.81*h,.5*w,.19*h);
  if(model==='bob')gc.fillRect(.4*w,.84*h,.6*w,.16*h);
 }
 const guidePixels=gc.getImageData(0,0,w,h).data;
 const data=new Uint8Array(w*h*4),sums=[0,0,0];let weight=0;
 for(let p=0;p<w*h;p++){
  const i=p*4,x=(p%w)/w,y=Math.floor(p/w)/h,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
  const warm=ramp(2,8,r-g)*ramp(0,5,g-b),visible=ramp(8,25,r);
  let skin=0,hair=0;
  if(region==='head'){
   const hairGuide=guidePixels[i]/255;
   const low={female:85,male:55,bob:65,polo:80,curls:65,covered:55}[model];
   hair=hairGuide*(1-ramp(low,low+55,r)*warm)*visible;
   skin=(y<.84?1:0)*(1-hairGuide)*warm*visible;
   // Keep lips, eye openings, eyebrows, jewellery, teeth and the eye atlas untouched.
   const features=ellipse(x,y,.5,.405,.047,.013);
   skin*=1-features;
   if(model==='curls')skin*=ramp(55,105,r); // Preserve baked-in facial hair.
   if(model==='female')skin*=1-Math.max(ellipse(x,y,.254,.385,.014,.014),ellipse(x,y,.746,.385,.014,.014));
  }else if(region==='body'){
   // Some garment primitives include bare neckline triangles. Restrict the atlas
   // to exposed areas so tan trousers and leather never become skin coloured.
   const outer=x<.25||x>.75;
   const exposed={
    female:((x<.19||x>.81)&&y<.27)||(x>.443&&x<.557&&y>.448&&y<.535),
    male:outer&&y>.825,
    bob:((x<.19||x>.81)&&y<.27)||(y>.28&&y<.535)||((x>.18&&x<.32||x>.68&&x<.82)&&y>.16&&y<.28),
    polo:((x<.32||x>.68)&&((y>.25&&y<.46)||(y>.62&&y<.88)))||(outer&&y>.86),
    curls:outer&&y>.825,
    covered:((x<.2||x>.8)&&y<.24)||((x>.17&&x<.32||x>.68&&x<.83)&&y>.135&&y<.30)
   }[model];
   skin=exposed?warm*visible:0;
  }
  else if(model!=='covered')hair=visible;
  data[i]=Math.round(255*skin);data[i+1]=Math.round(255*hair);data[i+3]=255;
  if(skin>.85){sums[0]+=r;sums[1]+=g;sums[2]+=b;weight++}
 }
 const mask=new THREE.DataTexture(data,w,h);mask.flipY=material.map.flipY;
 mask.minFilter=THREE.LinearMipmapLinearFilter;mask.magFilter=THREE.LinearFilter;mask.generateMipmaps=true;
 mask.wrapS=material.map.wrapS;mask.wrapT=material.map.wrapT;mask.needsUpdate=true;
 const reference=new THREE.Color().setRGB(...sums.map(v=>weight?v/weight/255:.5),THREE.SRGBColorSpace);
 const result={mask,reference,model};cached.set(material,result);atlases.set(atlasKey,result);return result;
}

export function applyAppearance(copy,original,look){
 const prepared=cached.get(original);if(!prepared)return;
 const skin=skinColours[look.skinTone],hair=hairColours[look.hairColor];
 // Use one calibration for the whole person. Independently normalizing the
 // lighter palm/chest atlas creates a visible head/body seam on darker tones.
 const base=atlases.get(prepared.model+'/head')?.reference||prepared.reference;
 const target=skin?new THREE.Color(skin):base;
 const gain=new THREE.Color(target.r/Math.max(.01,base.r),target.g/Math.max(.01,base.g),target.b/Math.max(.01,base.b));
 copy.onBeforeCompile=shader=>{
  shader.uniforms.anansiMask={value:prepared.mask};
  shader.uniforms.anansiSkinGain={value:gain};
  shader.uniforms.anansiHair={value:hair?new THREE.Color(hair):new THREE.Color()};
  shader.uniforms.anansiHairEnabled={value:hair?1:0};
  shader.fragmentShader='uniform sampler2D anansiMask;\nuniform vec3 anansiSkinGain;\nuniform vec3 anansiHair;\nuniform float anansiHairEnabled;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   #ifdef USE_MAP
    vec2 appearanceMask=texture2D(anansiMask,vMapUv).rg;
    vec3 skinBase=sampledDiffuseColor.rgb;
    #if defined(USE_COLOR_ALPHA)
     skinBase*=vColor.rgb;
    #elif defined(USE_COLOR)
     skinBase*=vColor;
    #endif
    diffuseColor.rgb=mix(diffuseColor.rgb,skinBase*anansiSkinGain,appearanceMask.r);
    float strandShade=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))/.035,.25,2.2);
    diffuseColor.rgb=mix(diffuseColor.rgb,anansiHair*strandShade,appearanceMask.g*anansiHairEnabled);
   #endif`);
 };
 copy.customProgramCacheKey=()=> 'anansi-appearance-v2';
}
