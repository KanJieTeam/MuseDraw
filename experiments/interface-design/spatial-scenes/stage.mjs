import * as THREE from './vendor/three.module.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
export {THREE};

// Rendering only. Business data, chart marks and labels remain outside the scene.
export function createStage(host,{theme='dark',camera=[82,70,95],target=[0,0,0],span=100}={}){
 const dark=theme==='dark';
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=dark?1.15:.78;
 host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','原创三维设施示意');
 const scene=new THREE.Scene();
 const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(new RoomEnvironment(),.04);
 scene.environment=env.texture;scene.environmentIntensity=dark?.45:.45;
 const view=new THREE.OrthographicCamera(-100,100,60,-60,.1,1000);view.position.set(...camera);view.lookAt(...target);
 scene.add(new THREE.HemisphereLight(dark?0xc9def5:0xf2fbff,dark?0x182333:0x869781,dark?1.1:1.1));
 const key=new THREE.DirectionalLight(dark?0xd9e8ff:0xfff7e8,dark?4.2:3);key.position.set(-45,85,35);key.castShadow=true;
 Object.assign(key.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:240});key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.0003;key.shadow.normalBias=.06;key.shadow.radius=3;scene.add(key);
 const rim=new THREE.DirectionalLight(dark?0x698fbe:0xd8ecf4,dark?2.4:1);rim.position.set(65,25,-40);scene.add(rim);
 const palette=dark?{concrete:'#283643',ground:'#142331',metal:'#c3ced6',darkmetal:'#344859',white:'#c5d1d9',water:'#15313e',glass:'#387e9d',blue:'#567dae',container:'#6e82a2',accent:'#e5b268',tree:'#47645e',road:'#1b2633'}:{concrete:'#d2ddda',ground:'#c4d0c7',metal:'#dfe9e7',darkmetal:'#657f7d',white:'#edf1e8',water:'#488d96',glass:'#8ab9c1',blue:'#799dab',container:'#9cb4b0',accent:'#be8341',tree:'#718d70',road:'#bac4c4'};
 const cache=new Map();
 function material(role='metal',opts={}){const color=palette[role]||role;const k=color+JSON.stringify(opts);if(!cache.has(k))cache.set(k,new THREE.MeshStandardMaterial({color,roughness:role==='water'?.21:.65,metalness:role==='metal'?.4:role==='water'?.22:.05,...opts}));return cache.get(k);}
 function mesh(geometry,role='metal',position=[0,0,0],parent=scene,opts={}){const o=new THREE.Mesh(geometry,typeof role==='string'?material(role,opts):role);o.position.set(...position);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(size,position,role='metal',parent=scene,opts={}){return mesh(new THREE.BoxGeometry(...size),role,position,parent,opts);}
 function cylinder(radius,height,position,role='metal',parent=scene,opts={}){return mesh(new THREE.CylinderGeometry(radius,radius,height,40),role,position,parent,opts);}
 function beam(a,b,r=.12,role='metal',parent=scene){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const o=mesh(new THREE.CylinderGeometry(r,r,d.length(),6),role,av.clone().add(bv).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
 function pipe(points,r=.35,role='blue',parent=scene){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),40,r,8,false),role,[0,0,0],parent);}
 function group(position=[0,0,0],parent=scene){const g=new THREE.Group();g.position.set(...position);parent.add(g);return g;}
 function ring(radius,y,position,role='metal',tube=.12,parent=scene){const o=mesh(new THREE.TorusGeometry(radius,tube,6,64),role,[position[0],y,position[2]],parent);o.rotation.x=-Math.PI/2;return o;}
 function tree(x,z,scale=1){const g=group([x,0,z]);cylinder(.12*scale,1.8*scale,[0,.9*scale,0],'darkmetal',g);mesh(new THREE.IcosahedronGeometry(1.1*scale,1),'tree',[0,2.1*scale,0],g);return g;}
 function markLine(a,b,color='white',width=.06){return beam(a,b,width,color);}
 // Own per-entity materials before changing lightness; shared caches must stay untouched.
 function entityFocus(entities,{inactive=.78,active=1,preserve=()=>false}={}){
  const records=[];
  for(const [id,entity]of Object.entries(entities)){
   const owned=new Map();
   entity.traverse(o=>{if(!o.isMesh||Array.isArray(o.material)||preserve(o))return;
    const original=o.material;if(!owned.has(original))owned.set(original,original.clone());
    o.material=owned.get(original);
   });
   for(const m of owned.values())records.push({id,material:m,base:m.color.clone()});
  }
  return id=>{if(!Object.hasOwn(entities,id))return false;for(const r of records)r.material.color.copy(r.base).multiplyScalar(r.id===id?active:inactive);render();return true;};
 }
 function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);const ratio=w/h;const visibleHeight=span*Math.max(1,1.8/ratio);view.left=-visibleHeight*ratio/2;view.right=visibleHeight*ratio/2;view.top=visibleHeight/2;view.bottom=-visibleHeight/2;view.updateProjectionMatrix();render();}
 function render(){renderer.render(scene,view);}
 function project(point){const p=new THREE.Vector3(...point).project(view);return{x:(p.x*.5+.5)*host.clientWidth,y:(-.5*p.y+.5)*host.clientHeight,visible:p.z>-1&&p.z<1};}
 function fit(points,padding=1.15){const bbox=new THREE.Box3();for(const p of points)bbox.expandByPoint(new THREE.Vector3(...p));const center=bbox.getCenter(new THREE.Vector3());const offset=view.position.clone().sub(new THREE.Vector3(...target));view.position.copy(center).add(offset);view.lookAt(center);render();}
 const ro=new ResizeObserver(resize);ro.observe(host);
 return{THREE,scene,renderer,camera:view,palette,material,mesh,box,cylinder,beam,pipe,group,ring,tree,markLine,render,resize,project,fit,entityFocus,setSpan(value){span=value;resize();},dispose(){ro.disconnect();renderer.dispose();env.dispose();pmrem.dispose();}};
}
