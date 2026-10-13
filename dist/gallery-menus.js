export function setupGalleryMenus({getName,onOpen=()=>{}}){
 const hud=document.querySelector('.hud'),actions=document.createElement('div');actions.id='visitorActions';actions.className='visitor-actions';
 const toggle=document.createElement('button');toggle.className='pill mobile-menu-toggle';toggle.id='visitorMenuButton';toggle.setAttribute('aria-controls',actions.id);toggle.setAttribute('aria-expanded','false');
 const name=document.createElement('span');name.id='mobileVisitorName';const icon=document.createElement('i');icon.className='hgi-stroke hgi-menu-01';icon.setAttribute('aria-hidden','true');const arrow=document.createElement('span');arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');toggle.append(name,icon,arrow);
 for(const child of [...hud.children])if(!child.classList.contains('brand')&&child.id!=='chatNotifications')actions.append(child);
 hud.append(toggle,actions);
 const tour=document.querySelector('.tour'),travel=document.createElement('div');travel.className='travel-menu';
 const travelToggle=document.createElement('button');travelToggle.className='pill mobile-menu-toggle';travelToggle.id='travelMenuButton';travelToggle.textContent='Go to… ⌄';travelToggle.setAttribute('aria-controls','galleryDestinations');travelToggle.setAttribute('aria-expanded','false');tour.id='galleryDestinations';tour.before(travel);travel.append(travelToggle,tour);
 function close(){actions.classList.remove('open');tour.classList.remove('open');toggle.setAttribute('aria-expanded','false');travelToggle.setAttribute('aria-expanded','false')}
 function flip(panel,button){const opening=!panel.classList.contains('open');close();if(opening){onOpen();panel.classList.add('open');button.setAttribute('aria-expanded','true')}}
 toggle.onclick=()=>flip(actions,toggle);travelToggle.onclick=()=>flip(tour,travelToggle);
 actions.addEventListener('click',event=>{if(event.target.closest('button,a'))close()});tour.addEventListener('click',event=>{if(event.target.closest('button'))close()});
 document.addEventListener('pointerdown',event=>{if(!hud.contains(event.target)&&!travel.contains(event.target))close()});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&(actions.classList.contains('open')||tour.classList.contains('open'))){const opener=tour.classList.contains('open')?travelToggle:toggle;close();opener.focus()}});
 const breakpoint=matchMedia('(max-width:650px)');breakpoint.addEventListener('change',close);
 function refresh(){name.textContent=getName();toggle.setAttribute('aria-label',getName()+', gallery menu')}
 refresh();new MutationObserver(refresh).observe(document.getElementById('avatarButton'),{childList:true,subtree:true});
}
