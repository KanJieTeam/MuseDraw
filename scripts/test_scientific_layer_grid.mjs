import assert from 'node:assert/strict';
import {test} from 'node:test';
import {scientificMotif} from '../skills/musedraw/scripts/engine/scientific-motifs.mjs';
import {pathCommands} from '../skills/musedraw/scripts/engine/drawio.mjs';

const base={id:'stack',type:'scientific',kind:'layers',x:35,y:40,w:420,h:240,separation:18,
  layers:[{label:'Cover',fill:'soft'},{label:'Conductive mesh',fill:'warm',pattern:'grid'},{label:'Base',fill:'neutral'}]};
const gridParts=out=>out.paths.filter(part=>part.id.includes('-grid-'));
const close=(a,b,tolerance=.03)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

test('grid uses only native independent lines inside the selected projected top face',()=>{
  for(const projection of [[64,-30],[-64,-30],[64,30],[-64,30],[0,-30],[0,30]]){
    const input={...structuredClone(base),projection},saved=structuredClone(input);
    const out=scientificMotif(input,{}),grid=gridParts(out);
    assert.deepEqual(input,saved);assert.equal(grid.length,11);
    const [dx,dy]=projection,faceW=base.w-Math.abs(dx),left=base.x+(dx<0?-dx:0);
    const thickness=(base.h-base.layers.length*Math.abs(dy)-base.separation*(base.layers.length-1))/base.layers.length;
    const stride=thickness+Math.abs(dy)+base.separation;
    const top=base.y+(dy<0?-dy:0)+stride;
    for(const part of grid){
      assert.equal(part.nativeModule,'stack');assert.equal(part.fill,'none');assert.equal(part.width,.55);
      assert.match(part.d,/^M[^<>]+L[^<>]+$/);assert.doesNotMatch(part.d,/image|pattern|url|NaN|Infinity/i);
      const commands=pathCommands(part.d);assert.deepEqual(commands.map(c=>c[0]),['move','line']);
      for(const [,x,y] of commands){
        const v=(y-top)/dy,u=(x-left-v*dx)/faceW;
        assert.ok(u>0&&u<1,`u=${u}`);assert.ok(v>0&&v<1,`v=${v}`);
      }
      const [,x1,y1]=commands[0],[,x2,y2]=commands[1];
      if(part.id.includes('-grid-u-'))close((x2-x1)*dy-(y2-y1)*dx,0,1.5);
      else close(y1,y2);
    }
    assert.equal(new Set(out.paths.map(p=>p.id)).size,out.paths.length);
    assert.equal(out.nodes.filter(n=>n.id!=='stack').length,3);
    assert.equal(out.edges.length,0);
    const fronts=out.nodes.filter(n=>n.id!=='stack');
    for(const [i,layer] of base.layers.entries()){
      const front=fronts.find(n=>n.id===`stack-layer-${i}`),faceY=base.y+(dy<0?-dy:0)+i*stride;
      close(front.x,left+(dy>=0?dx:0));close(front.y,faceY+(dy>=0?dy:0));close(front.h,thickness);
      close(out.texts.find(t=>t.text===layer.label).y,front.y+front.h/2+16*.35);
      const boxTop=faceY+Math.min(0,dy),boxBottom=front.y+front.h;
      if(i===0)close(boxTop,base.y);
      if(i===base.layers.length-1)close(boxBottom,base.y+base.h);
      if(i>0)close(boxTop-(base.y+(i-1)*stride+Math.abs(dy)+thickness),base.separation);
    }
    for(const gridPath of grid)for(const fraction of [.1,.5,.9]){
      const c=pathCommands(gridPath.d),x=c[0][1]+fraction*(c[1][1]-c[0][1]),y=c[0][2]+fraction*(c[1][2]-c[0][2]);
      assert.ok(fronts.every(front=>x<front.x||x>front.x+front.w||y<front.y||y>front.y+front.h),'no later opaque front may cover a grid sample');
    }
  }
});

test('omitting pattern keeps the established solid layers and does not invent mesh',()=>{
  const input=structuredClone(base);delete input.layers[1].pattern;
  const saved=structuredClone(input),out=scientificMotif(input,{});
  assert.deepEqual(input,saved);assert.equal(gridParts(out).length,0);
  assert.equal(out.paths.length,base.layers.length*2);
  assert.deepEqual(out.nodes.filter(n=>n.id!=='stack').map(n=>n.id),['stack-layer-2','stack-layer-1','stack-layer-0']);
});

test('pattern validation fails early and does not change formula or laminate support',()=>{
  for(const pattern of [null,false,{},'stripes','GRID','']){
    const input=structuredClone(base);input.layers[1].pattern=pattern;
    assert.throws(()=>scientificMotif(input,{}),/layer pattern must be grid/);
  }
  assert.throws(()=>scientificMotif({...base,projection:[64,0]},{}),/nonzero vertical projection/);
  assert.throws(()=>scientificMotif({...base,h:80,projection:[48,28]},{}),/does not fit/);
  const formula=scientificMotif({id:'f',type:'scientific',kind:'formula',x:0,y:0,w:100,h:80,runs:[{text:'x',sub:'i'}]},{});
  assert.ok(formula.texts.some(t=>t.text==='i'));
  const laminate=scientificMotif({id:'l',type:'scientific',kind:'laminate',x:0,y:0,w:300,h:200,layers:[{id:'a',fill:'soft'},{id:'b',fill:'warm'}],states:[{id:'rest',label:'Rest',deflection:0},{id:'press',label:'Press',deflection:.2}]},{});
  assert.ok(laminate.paths.some(p=>p.id==='l-state-press-layer-a'));
});
