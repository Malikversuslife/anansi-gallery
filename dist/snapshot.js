// Pictures from a scene that work on every device: render into an off-screen target, read the pixels back, and apply
// the renderer's tone mapping (ACES filmic) and sRGB encoding here, as the screen pass would. Reading the WebGL canvas
// itself returns blank or black images on some phones once the drawing buffer is not preserved.
import * as THREE from 'three';

// Lookup tables: half floats to numbers, and linear 0..1 to 8-bit sRGB (a photo is over a million pixels).
let HALF = null;
const SRGB = new Uint8ClampedArray(4097);
for (let i = 0; i <= 4096; i++) { const c = i/4096; SRGB[i] = Math.round(255*(c <= .0031308 ? 12.92*c : 1.055*Math.pow(c, 1/2.4)-.055)) }
const enc = c => SRGB[c <= 0 ? 0 : c >= 1 ? 4096 : (c*4096+.5)|0];
function aces(r, g, b, exposure) {
  const k = exposure/.6;
  r *= k; g *= k; b *= k;
  const x = .59719*r+.35458*g+.04823*b, y = .07600*r+.90834*g+.01566*b, z = .02840*r+.13383*g+.83777*b;
  const fit = v => (v*(v+.0245786)-.000090537)/(v*(.983729*v+.4329510)+.238081);
  const fx = fit(x), fy = fit(y), fz = fit(z);
  return [1.60475*fx-.53108*fy-.07367*fz, -.10208*fx+1.10813*fy-.00605*fz, -.00327*fx-.07276*fy+1.07602*fz];
}

// Returns a 2D canvas of w x h. `scale` renders larger and shrinks, which smooths edges (the target has no MSAA).
export function snapshot(renderer, scene, camera, w, h, scale = 2) {
  const W = Math.round(w*scale), H = Math.round(h*scale);
  // Half floats keep highlights above 1 for the tone mapping; devices that can't read them back get 8-bit.
  const half = !!renderer.capabilities.textureTypeReadable?.(THREE.HalfFloatType);
  const rt = new THREE.WebGLRenderTarget(W, H, {type: half ? THREE.HalfFloatType : THREE.UnsignedByteType});
  const px = half ? new Uint16Array(W*H*4) : new Uint8Array(W*H*4);
  const previous = renderer.getRenderTarget();
  try {
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
  } finally { renderer.setRenderTarget(previous); rt.dispose() }
  if (half && !HALF) { HALF = new Float32Array(65536); for (let i = 0; i < 65536; i++) HALF[i] = THREE.DataUtils.fromHalfFloat(i) }
  const toFloat = half ? v => HALF[v] : v => v/255;
  const tone = renderer.toneMapping === THREE.ACESFilmicToneMapping, exposure = renderer.toneMappingExposure;
  const big = document.createElement('canvas'); big.width = W; big.height = H;
  const ctx = big.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) {
    const src = (H-1-y)*W*4, dst = y*W*4;       // the target's rows run bottom to top
    for (let x = 0; x < W*4; x += 4) {
      let r = toFloat(px[src+x]), g = toFloat(px[src+x+1]), b = toFloat(px[src+x+2]);
      const a = Math.min(1, toFloat(px[src+x+3]));
      if (tone) [r, g, b] = aces(r, g, b, exposure);
      d[dst+x] = enc(r); d[dst+x+1] = enc(g); d[dst+x+2] = enc(b);
      d[dst+x+3] = 255*a;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (scale === 1) return big;
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const o = out.getContext('2d'); o.imageSmoothingQuality = 'high'; o.drawImage(big, 0, 0, w, h);
  return out;
}
