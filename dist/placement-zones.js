// One architectural registry shared by curator options and browser installation.
(() => {
 const zones={};
 const wall=(name,slots,rotation=0,width=1.35,height=1.55)=>zones[name]={kind:'wall',slots,rotation,width,height};
 const north=[-10.4,-8.2,-6,6,8.2,10.4];
 wall('North wall',north.map(x=>[x,2.15,-16.79]));
 wall('Ground north wall',north.map(x=>[x,2.15,-16.79]));
 wall('Upper north wall',Array.from({length:11},(_,i)=>[-10.5+i*2.1,6.35,-16.79]));
 wall('Upper rear bridge',Array.from({length:11},(_,i)=>[-10.5+i*2.1,6.35,-16.79]));
 wall('South wall',north.map(x=>[x,2.15,16.79]),Math.PI);
 for(const side of ['west','east']){
  const x=side==='west'?-11.4:11.4,rotation=side==='west'?Math.PI/2:-Math.PI/2;
  wall(side==='west'?'West wall':'East wall',Array.from({length:6},(_,i)=>[x,2.15,1-i*2.4]),rotation);
  const name=`Upper ${side} gallery`;wall(name,Array.from({length:12},(_,i)=>[x,6.35,10-i*2]),rotation);zones[name].backing=true;
 }
 wall('Painting room reverse wall',[[-10.1,2.18,-8.17],[-8.6,2.18,-8.17],[-7.1,2.18,-8.17]],Math.PI);
 // These central partition faces are solid; wall works need no glazed backing.
 wall('East exhibition wall',[[8.8,2.18,-7.80],[10.8,2.18,-7.80]]);
 const columns=[{x:-3.2,z:-1,w:1.55,d:1.25},{x:-3.2,z:-11,w:1.1,d:1.05},{x:-10,z:-2,w:.7,d:.7},{x:-10,z:-12,w:.7,d:.7},{x:10,z:-2,w:.7,d:.7},{x:10,z:-12,w:.7,d:.7}];
 const faces={entrance:{dx:0,dz:1,rotation:0},rear:{dx:0,dz:-1,rotation:Math.PI},west:{dx:-1,dz:0,rotation:-Math.PI/2},east:{dx:1,dz:0,rotation:Math.PI/2}};
 columns.forEach((c,i)=>{
  for(const floor of ['ground','upper'])for(const [face,f] of Object.entries(faces)){
   const name=`Column ${i+1} · ${face} · ${floor}`;
   wall(name,[[c.x+f.dx*(c.w/2+.04),floor==='upper'?6.20:2.05,c.z+f.dz*(c.d/2+.04)]],f.rotation,Math.min(c.w,c.d)-.12,1.1);
   zones[name].column=i+1;
  }
 });
 // Legacy labels map to all six actual piers at visitor-level heights.
 for(const [face,f] of Object.entries(faces))wall(`Column · ${face==='entrance'?'entrance':face} face`,columns.map(c=>[c.x+f.dx*(c.w/2+.04),2.05,c.z+f.dz*(c.d/2+.04)]),f.rotation,.52,1.1);
 zones['Atrium plinth']={kind:'plinth',slots:Array.from({length:4},(_,i)=>[1.8,0,-8-i*2.1])};
 zones['Window plinth']={kind:'plinth',slots:Array.from({length:4},(_,i)=>[8.2,0,-8-i*2.1])};
 window.anansiPlacementZones=zones;
 window.anansiPlacementLabels=[...Object.keys(zones).filter(name=>name!=='North wall'&&name!=='Upper rear bridge'&&!name.startsWith('Column ·')),'Storage / unplaced'];
})();
