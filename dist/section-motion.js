const clamp=value=>Math.max(0,Math.min(1,value));
export function sectionProgress(top,height,stageHeight,offset=90){return clamp((offset-top)/Math.max(1,height-stageHeight))}
export function createSectionMotion(main,{enabled=true}={}){
 const container=main.firstElementChild,feature=container?.querySelector('.section:has(.feature)'),manifesto=container?.querySelector('.manifesto'),collection=container?.querySelector('.section:has(.work-grid)'),closing=container?.querySelector('.visit-section');
 if(!feature||!manifesto||!collection||!closing)return {setEnabled(){},destroy(){}};
 let active=false,destroyed=false,frame=0;
 const targets=[];
 function stage(section,className){section.classList.add(className);const inner=document.createElement('div');inner.className='section-stage';while(section.firstChild)inner.append(section.firstChild);section.append(inner);targets.push({section,inner});return inner}
 stage(feature,'exhibition-motion');stage(manifesto,'statement-motion');stage(closing,'closing-motion');collection.classList.add('collection-motion');
 const statement=manifesto.querySelector('h2'),lines=statement.innerText.split('\n');statement.replaceChildren();let wordIndex=0;
 for(const line of lines){const lineNode=document.createElement('span');lineNode.className='statement-line';for(const word of line.trim().split(/\s+/)){const span=document.createElement('span');span.className='statement-word';span.textContent=word;span.style.setProperty('--word-index',wordIndex++);lineNode.append(span,document.createTextNode(' '))}statement.append(lineNode)}
 const words=[...statement.querySelectorAll('.statement-word')];
 const closingImage=closing.querySelector('img');closingImage.classList.add('closing-image');
 const closingText=closing.querySelector('.section-stage>div');closingText.classList.add('closing-copy');
 const cards=[...collection.querySelectorAll('.work-card')];cards.forEach((card,i)=>{card.classList.add('motion-card');card.style.setProperty('--card-delay',`${i*85}ms`)});
 const artists=buildArtists();closing.before(artists);const artistFrame=artists.querySelector('.artist-preview');
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('is-revealed')}),{threshold:.08,rootMargin:'60px'});cards.forEach(card=>observer.observe(card));
 function update(){frame=0;if(destroyed||!active||document.hidden)return;
  for(const {section,inner} of targets){const rect=section.getBoundingClientRect(),p=sectionProgress(rect.top,section.offsetHeight,inner.offsetHeight,section===closing?0:90);section.dataset.motionProgress=p.toFixed(3);section.style.setProperty('--section-progress',p);if(section===manifesto)words.forEach((word,i)=>word.style.opacity=String(.25+.75*clamp((p*1.25-i/words.length)*5)))}
  const rect=collection.getBoundingClientRect(),p=clamp((innerHeight-rect.top)/(innerHeight+rect.height));collection.dataset.motionProgress=p.toFixed(3);cards.forEach((card,i)=>card.style.setProperty('--card-drift',`${((p-.5)*[18,-14,10][i%3]).toFixed(2)}px`));
  const artistsRect=artists.getBoundingClientRect(),ap=clamp((innerHeight-artistsRect.top)/(innerHeight+artistsRect.height));artistFrame.style.setProperty('--preview-drift',`${((ap-.5)*20).toFixed(2)}px`);
 }
 function schedule(){if(!destroyed&&active&&!document.hidden&&!frame)frame=requestAnimationFrame(update)}
 function setEnabled(value){active=!!value;container.classList.toggle('section-motion-on',active);if(!active){if(frame)cancelAnimationFrame(frame);frame=0;words.forEach(w=>w.style.opacity='1');cards.forEach(card=>{card.classList.add('is-revealed');card.style.setProperty('--card-drift','0px')});artistFrame.style.setProperty('--preview-drift','0px')}else schedule()}
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);document.addEventListener('visibilitychange',schedule);setEnabled(enabled);
 return {setEnabled,destroy(){destroyed=true;if(frame)cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);document.removeEventListener('visibilitychange',schedule)}};
}
function buildArtists(){
 const data=window.anansiFrontend.normalize(window.anansiFrontend.read()||{artists:[],works:[],shows:[]}),works=data.works.filter(w=>w.placement!=='Storage / unplaced'&&window.anansiFrontend.visible(w,data));
 const entries=[{id:'demo-collection',name:'Anansi presentation collection',note:'Illustrative collection · not a real artist',work:{name:'Tidal Intervals / 1',panel:0}},...data.artists.filter(a=>works.some(w=>w.artistId===a.id||w.artist===a.name)).map(a=>({id:a.id,name:a.name,note:'Published works from the curator roster',work:works.find(w=>w.artistId===a.id||w.artist===a.name)}))];
 const section=document.createElement('section');section.className='section artist-motion';section.setAttribute('aria-labelledby','homeArtistsTitle');section.innerHTML='<div class="section-heading"><div><p class="eyebrow">The voices behind the works</p><h2 id="homeArtistsTitle">Behind every work.</h2></div><a class="text-link" href="#artists">All artists ↗</a></div><div class="artist-motion-grid"><div class="artist-motion-list"></div><figure class="artist-preview"><a class="artist-preview-inner"></a><figcaption></figcaption></figure></div><p class="local-note">Artwork previews stand in for portraits until artist photographs are supplied.</p>';
 const list=section.querySelector('.artist-motion-list'),imageLink=section.querySelector('.artist-preview-inner'),caption=section.querySelector('figcaption');let selected;
 function select(entry){if(selected===entry)return;selected=entry;imageLink.href='#artist/'+encodeURIComponent(entry.id);imageLink.setAttribute('aria-label','Explore '+entry.name);imageLink.replaceChildren();const picture=document.createElement('div');picture.className='art-image';
  if(Number.isInteger(entry.work?.panel)){picture.classList.add('panel');picture.style.backgroundPosition=`${entry.work.panel*50}% center`;picture.setAttribute('role','img');picture.setAttribute('aria-label',entry.work.name)}
  else if(entry.work?.image&&/^(data:image\/(png|jpeg|webp);base64,|https?:\/\/|assets\/)/i.test(entry.work.image)){const image=document.createElement('img');image.src=entry.work.image;image.alt=entry.work.name;image.loading='lazy';image.onerror=()=>{picture.textContent='Image unavailable on this device.';image.remove()};picture.append(image)}
  else{picture.classList.add('art-placeholder');picture.textContent=entry.work?.format==='Sculpture'?'3D sculpture · view the model in the gallery':'Artwork image not supplied'}
  imageLink.append(picture);caption.textContent=(entry.work?.name||'Selected works')+' · '+entry.name;section.dataset.artistId=entry.id;list.querySelectorAll('a').forEach(link=>link.classList.toggle('is-active',link.dataset.artistId===entry.id));
 }
 entries.forEach((entry,i)=>{const link=document.createElement('a');link.className='artist-motion-row';link.href='#artist/'+encodeURIComponent(entry.id);link.dataset.artistId=entry.id;const number=document.createElement('span');number.className='artist-number';number.textContent=String(i+1).padStart(2,'0');const text=document.createElement('div'),name=document.createElement('h3'),note=document.createElement('p'),arrow=document.createElement('span');name.textContent=entry.name;note.textContent=entry.note;arrow.className='arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');text.append(name,note);link.append(number,text,arrow);link.onmouseenter=link.onfocus=()=>select(entry);list.append(link)});select(entries[0]);return section;
}
