import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {stat} from 'node:fs/promises';
import {LayoutError} from './callout-layout.mjs';

export async function createBrowserMeasurer({playwright,browser,fontSize,fontFamily,scene,annotations}) {
  const candidate=resolve(playwright),isFile=await stat(candidate).then(s=>s.isFile(),()=>false);
  const module=await import(isFile || playwright.includes('/') || playwright.includes('\\') ? pathToFileURL(candidate).href : playwright);
  const chromium=module.chromium || module.default?.chromium;
  const instance=await chromium.launch({headless:true,...(browser?{executablePath:browser}:{})});
  try {
    const page=await instance.newPage();
    const info=await page.evaluate(async ({scene,fontSize,fontFamily,annotations})=>{
      const doc=new DOMParser().parseFromString(scene.nativeSvg,'image/svg+xml'), root=doc.documentElement;
      if(doc.querySelector('parsererror') || root.localName!=='svg') throw new Error('Malformed SVG');
      if(Number(root.getAttribute('width'))!==scene.size[0] || Number(root.getAttribute('height'))!==scene.size[1] || root.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number).join(',')!==[0,0,...scene.size].join(',') || root.getAttribute('data-theme')!==scene.theme) throw new Error('SVG width/height/viewBox/data-theme must match scene');
      const ids=[...doc.querySelectorAll('[id]')].map(n=>n.id);
      if(new Set(ids).size!==ids.length) throw new Error('Duplicate SVG id');
      const generated=['callouts',...annotations.flatMap(a=>[`callout-group-${a.id}`])];
      if(ids.some(id=>generated.includes(id) || annotations.some(a=>id.startsWith(`callout-text-${a.id}-`)))) throw new Error('SVG id collides with generated callout id');
      await document.fonts.ready;
      const canvas=document.createElement('canvas'); globalThis.calloutContext=canvas.getContext('2d');
      calloutContext.font=`${fontSize}px ${fontFamily}`;
      if(!calloutContext.font.includes(`${fontSize}px`)) throw new Error('Invalid CSS font family or size; canvas did not accept requested font');
      if(!document.fonts.check(calloutContext.font)) throw new Error('Font not ready');
      return {requestedFont:fontFamily,resolvedCanvasFont:calloutContext.font,userAgent:navigator.userAgent};
    },{scene,fontSize,fontFamily,annotations});
    const cache=new Map();
    const measure=async text=>{
      if(!cache.has(text)) cache.set(text,await page.evaluate(text=>{
        const m=calloutContext.measureText(text);
        return {left:Math.min(0,-m.actualBoundingBoxLeft),right:Math.max(m.width,m.actualBoundingBoxRight),ascent:Math.max(m.fontBoundingBoxAscent || 0,m.actualBoundingBoxAscent),descent:Math.max(m.fontBoundingBoxDescent || 0,m.actualBoundingBoxDescent)};
      },text));
      return cache.get(text);
    };
    return {measure,info,close:()=>instance.close()};
  } catch(error) { await instance.close(); throw new LayoutError('BROWSER',error.message); }
}
