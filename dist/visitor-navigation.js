// Geometry-independent movement policy. The renderer supplies floor and wall
// queries; tests can exercise the same policy without WebGL or browser state.
export const visitorRadius=.24;
export function resolveWalk(position,dx,dz,{sampleHeight,isBlocked,radius=visitorRadius}){
 let current={...position};
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
 function attempt(xStep,zStep){
  if(Math.hypot(xStep,zStep)<1e-8)return false;
  const x=current.x+xStep,z=current.z+zStep;
  if(x-radius<-11.7||x+radius>11.7||z-radius<-16.8||z+radius>16.8)return false;
  if(isBlocked(current,xStep,zStep,radius))return false;
  const y=sampleHeight(x,z,current.y);
  if(y===null||!Number.isFinite(y)||Math.abs(y-current.y)>.36)return false;
  // Require a footprint, not just one point, to keep visitors away from the
  // atrium void and balcony edges. Neighbouring stair treads are supported.
  for(const [ox,oz] of [[radius,0],[-radius,0],[0,radius],[0,-radius]]){
   const support=sampleHeight(x+ox,z+oz,y);
   if(support===null||!Number.isFinite(support)||Math.abs(support-y)>.36)return false;
  }
  current={x,y,z};return true;
 }
 for(let i=0;i<steps;i++){
  const sx=dx/steps,sz=dz/steps;
  if(!attempt(sx,sz)){attempt(sx,0);attempt(0,sz)}
 }
 return current;
}
