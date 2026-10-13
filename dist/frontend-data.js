(() => {
 const id=()=>crypto.randomUUID();
 function read(){try{return JSON.parse(localStorage.getItem('anansiData')||'null')}catch{return null}}
 function normalize(data){data.artists??=[];data.works??=[];data.shows??=[];data.leads??=[];data.settings??={name:'Anansi Gallery',email:''};
  for(const records of [data.artists,data.works,data.shows,data.leads])for(const record of records)record.id??=id();
  for(const artist of data.artists)artist.works=data.works.filter(work=>work.artistId===artist.id||(!work.artistId&&work.artist===artist.name)).length;
  for(const work of data.works){work.artistId??=data.artists.find(a=>a.name===work.artist)?.id||null;work.showId??=data.shows.find(s=>s.title===work.show)?.id||null}
  for(const show of data.shows)show.works=data.works.filter(work=>work.showId===show.id||(!work.showId&&work.show===show.title)).length;
  return data;
 }
 function visible(work,data,curator=false){const show=data.shows?.find(s=>s.id===work.showId||s.title===work.show);return !show||curator||show.status!=='Draft'}
 window.anansiFrontend={id,read,normalize,visible};
})();
