/* A real model-driven entrance. Render only while visible and motion is enabled. */
import {createCinematicGallery} from './cinematic-gallery.js';
export async function createHeroGallery(container){
 const scene=await createCinematicGallery(container);
 let enabled=true,visible=false,disposed=false,frame=0,last=0,elapsed=0;
 const stop=()=>{cancelAnimationFrame(frame);frame=0;last=0};
 function schedule(){if(!disposed&&enabled&&visible&&!document.hidden&&!frame)frame=requestAnimationFrame(draw)}
 function draw(now){frame=0;if(!enabled||!visible||document.hidden||disposed)return;
  if(!last)last=now;
  if(now-last>=1000/30){elapsed+=Math.min(now-last,100);last=now;const progress=.10+.09*Math.sin(elapsed/9000);scene.setProgress(progress)}
  schedule();
 }
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;scene.setEnabled(enabled&&visible&&!document.hidden);if(visible)schedule();else stop()});observer.observe(container);
 const visibility=()=>{scene.setEnabled(enabled&&visible&&!document.hidden);if(document.hidden)stop();else schedule()};document.addEventListener('visibilitychange',visibility);
 container.querySelector('canvas').setAttribute('aria-label','A moving camera view of Anansi’s actual virtual gallery');
 return {setEnabled(value){enabled=value;scene.setEnabled(enabled&&visible&&!document.hidden);if(enabled)schedule();else stop()},dispose(){disposed=true;stop();observer.disconnect();document.removeEventListener('visibilitychange',visibility);scene.dispose()}};
}
