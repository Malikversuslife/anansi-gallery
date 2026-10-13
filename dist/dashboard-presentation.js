(() => {
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}}
  function mount(){
    document.querySelectorAll('a[href="gallery.html"]').forEach(link=>{link.href='gallery.html?mode=curator'});
    const map=document.querySelector('#placement .gallery-map');if(map&&!map.dataset.updated){map.dataset.updated='true';map.querySelector('p').textContent='North walls support both floors. All six numbered columns have ground and upper faces. Select the precise surface beside each artwork; sculptures use plinth zones. New installations receive focused art lights.';const north=map.querySelector('.north');if(north)north.textContent='NORTH · BOTH FLOORS'}
    const page=document.getElementById('theme');if(!page?.children.length||document.getElementById('demoAtmosphereCard'))return;
    const card=document.createElement('section');card.className='card';card.id='demoAtmosphereCard';card.style.marginTop='20px';
    card.innerHTML='<div class="eyebrow">PRESENTATION MODE</div><h2>Lighting, blinds & music</h2><p>Saved on this browser only. Open the gallery to preview changes.</p><div class="settings-grid"><label>LIGHTING PRESET<select id="adminLightPreset"><option value="daylight">Daylight</option><option value="balanced">Balanced</option><option value="exhibition">Exhibition</option></select></label><label>SPOTIFY PLAYLIST LINK<input id="adminSpotify" type="url" placeholder="https://open.spotify.com/playlist/…"></label></div><p><button class="btn primary" id="saveAtmosphere">Save presentation atmosphere</button> <a class="btn" href="gallery.html">Preview gallery</a></p><p>For local audio files, use Music inside the gallery. Spotify uses an external player; it is not an account connection.</p>';
    page.append(card);const preset=document.getElementById('adminLightPreset'),spotify=document.getElementById('adminSpotify');preset.value=read('anansiAtmosphere',{}).preset||'balanced';spotify.value=read('anansiMusic',{}).spotify||'';
    document.getElementById('saveAtmosphere').onclick=()=>{
      const values={daylight:{west:0,east:0,day:1,art:.3},balanced:{west:.55,east:.55,day:.65,art:1},exhibition:{west:1,east:1,day:.08,art:1.5}};
      const link=spotify.value.trim();if(link){try{const url=new URL(link);if(url.hostname!=='open.spotify.com'||!/^\/(playlist|album|track)\/[A-Za-z0-9]+\/?$/.test(url.pathname))throw Error()}catch{toast('Use a valid Spotify playlist, album or track link.');return}}
      try{localStorage.setItem('anansiAtmosphere',JSON.stringify({...values[preset.value],preset:preset.value}));localStorage.setItem('anansiMusic',JSON.stringify({spotify:link}));toast('Presentation atmosphere saved.')}catch{toast('Browser storage is unavailable.')}
    };
  }
  new MutationObserver(mount).observe(document.querySelector('.content'),{childList:true,subtree:true});mount();
})();
