// Original, schematic water-reuse facilities. Geometry is illustrative, not engineering documentation.
export function buildScene(stage) {
  const {THREE, mesh, box, cylinder, beam, group, material} = stage;
  const root = group();
  root.name = 'Qingyuan water reuse works';
  const C = {ground:'#9daea3',base:'#82988e',lawn:'#7d9b74',road:'#7f9698',walk:'#c1cec5',wall:'#d6e2dc',coping:'#eef2e9',steel:'#668984',rail:'#b5c8c0',water:'#3b899d',pipe:'#416f82',dark:'#3f635f',glass:'#4b7887',roof:'#6d8b89',amber:'#b47528'};
  const waterMat = material(C.water,{roughness:.23,metalness:.12,transparent:true,opacity:.84,depthWrite:false});
  const tubeGeometry = new THREE.SphereGeometry(.1,6,4);
  const units = {};
  const selections = {};
  function entity(id, p) {const g=group(p,root);g.name=id;units[id]=g;return g;}
  function link(a,b,r,role,parent=root){return beam(a,b,r,role,parent);}
  function route(points,r=.34,role=C.pipe,parent=root) {
    points.slice(1).forEach((p,i)=>link(points[i],p,r,role,parent));
    points.slice(1,-1).forEach(p=>mesh(new THREE.SphereGeometry(r,10,8),role,p,parent));
  }
  function rail(a,b,parent=root,postCount=5) {
    const topA=[a[0],a[1]+1.08,a[2]], topB=[b[0],b[1]+1.08,b[2]];
    link(topA,topB,.055,C.rail,parent);
    link([a[0],a[1]+.55,a[2]],[b[0],b[1]+.55,b[2]],.038,C.rail,parent);
    for(let i=0;i<=postCount;i++){const t=i/postCount,p=a.map((v,k)=>v+(b[k]-v)*t);link(p,[p[0],p[1]+1.08,p[2]],.05,C.rail,parent);}
  }
  function torus(radius,tube,pos,role,parent=root,horizontal=true) {
    const o=mesh(new THREE.TorusGeometry(radius,tube,6,64),role,pos,parent);
    if(horizontal)o.rotation.x=-Math.PI/2;
    return o;
  }
  function annulus(outer,inner,height,y,parent,role=C.wall) {
    const s=new THREE.Shape();s.absarc(0,0,outer,0,Math.PI*2,false);
    const h=new THREE.Path();h.absarc(0,0,inner,0,Math.PI*2,true);s.holes.push(h);
    const g=new THREE.ExtrudeGeometry(s,{depth:height,bevelEnabled:false,curveSegments:64});
    g.rotateX(-Math.PI/2);return mesh(g,role,[0,y,0],parent);
  }
  function ringRails(radius,y,parent,posts=48) {
    torus(radius,.055,[0,y+1.05,0],C.rail,parent);
    torus(radius,.04,[0,y+.52,0],C.rail,parent);
    for(let i=0;i<posts;i++){const t=i/posts*Math.PI*2,x=Math.cos(t)*radius,z=Math.sin(t)*radius;link([x,y,z],[x,y+1.05,z],.052,C.rail,parent);}
  }
  function lineLoop(points,color,parent=root) {
    const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));
    const l=new THREE.LineLoop(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}));parent.add(l);return l;
  }
  function arrow(pos,dir,parent=root) {
    const o=mesh(new THREE.ConeGeometry(.52,1.15,3),C.pipe,pos,parent);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...dir).normalize());
  }
  function flange(pos,axis,parent=root) {
    const o=cylinder(.52,.15,pos,C.steel,parent);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...axis));
  }
  function valve(pos,parent=root) {
    cylinder(.47,.75,[pos[0],pos[1]+.13,pos[2]],C.dark,parent);
    link([pos[0],pos[1]+.4,pos[2]],[pos[0],pos[1]+1.22,pos[2]],.075,C.steel,parent);
    torus(.51,.065,[pos[0],pos[1]+1.25,pos[2]],C.dark,parent);
    link([pos[0]-.46,pos[1]+1.25,pos[2]],[pos[0]+.46,pos[1]+1.25,pos[2]],.035,C.dark,parent);
    link([pos[0],pos[1]+1.25,pos[2]-.46],[pos[0],pos[1]+1.25,pos[2]+.46],.035,C.dark,parent);
  }

  // The site is deliberately finite: curbs, grass strips, perimeter access and cross-access.
  box([100,.9,70],[0,-.6,0],C.base,root);
  box([98,.18,68],[0,-.06,0],C.ground,root);
  box([92,.12,5],[0,.08,29],C.road,root);
  box([92,.12,4],[0,.08,-29],C.road,root);
  box([4,.12,54],[-44,.08,0],C.road,root);
  box([4,.12,54],[44,.08,0],C.road,root);
  box([82,.12,3],[0,.09,10.5],C.road,root);
  for(const z of [-32,32])box([94,.2,.3],[0,.1,z],C.walk,root);
  for(const x of [-47,47])box([.3,.2,64],[x,.1,0],C.walk,root);
  for(let x=-38;x<=38;x+=6)box([2,.03,.1],[x,.16,29],C.coping,root);
  for(let z=-22;z<=23;z+=6)for(const x of [-44,44])box([.1,.03,2],[x,.16,z],C.coping,root);
  box([29,.12,9],[-24,.12,18],C.lawn,root);
  box([9,.12,19],[-3,.12,19],C.lawn,root);
  box([23,.12,6],[27,.12,-26],C.lawn,root);
  box([2,.17,20],[-5,.2,18],C.walk,root);
  box([35,.16,2],[-24,.21,13.3],C.walk,root);
  box([3,.16,8],[24,.21,26],C.walk,root);
  // Trees stay along the road rather than hiding the process equipment.
  for(const [x,z,s] of [[-39,-25,.8],[-31,-25,.7],[-22,-25,.85],[-12,-25,.7],[31,-26,.8],[39,-26,.7],[-39,17,.85],[-32,20,.9],[-24,20,.75],[-16,20,.85],[-2,23,.85],[3,17,.7],[39,5,.75],[-40,3,.65]]) {
    const t=stage.tree(x,z,s);root.attach(t);
    cylinder(1.35*s,.1,[x,.2,z],'#c0d0b9',root);
  }
  // Small service lamps provide a useful scale cue without competing with the facilities.
  for(const [x,z] of [[-39,26],[4,26],[39,26],[-39,-26],[39,-20]]) {
    link([x,.1,z],[x,4.8,z],.07,C.dark);
    link([x,4.8,z],[x+1,4.8,z],.07,C.dark);
    box([1.1,.15,.45],[x+.8,4.8,z],C.coping,root);
  }

  // W01: four open aeration channels, structural dividers, exposed crosswalk and diffuser grids.
  const aeration=entity('W01',[-24,0,-8]);
  box([32,.45,31],[0,.35,0],C.walk,aeration);
  box([28.8,.35,27.8],[0,.65,0],'#bbc9c6',aeration);
  const wallY=1.75, wallH=2.15;
  box([29.2,wallH,.45],[0,wallY,-13.8],C.wall,aeration);
  box([29.2,wallH,.45],[0,wallY,13.8],C.wall,aeration);
  for(let i=0;i<=4;i++){
    const x=-14.4+i*7.2;
    box([.42,wallH,27.8],[x,wallY,0],C.wall,aeration);
    box([.7,.16,28.4],[x,2.9,0],C.coping,aeration);
  }
  for(const z of [-13.8,13.8])box([29.6,.16,.75],[0,2.9,z],C.coping,aeration);
  const bubbleMatrix=new THREE.Object3D();
  const bubbles=new THREE.InstancedMesh(tubeGeometry,material('#d7f0ee',{transparent:true,opacity:.85}),160);
  bubbles.castShadow=false;bubbles.receiveShadow=false;aeration.add(bubbles);
  let bi=0;
  for(let lane=0;lane<4;lane++){
    const x=-10.8+lane*7.2;
    box([6.72,.05,27.1],[x,1.93,0],waterMat,aeration);
    // Main air line feeds paired diffuser laterals. Visible through translucent water.
    link([x,1.1,-12],[x,1.1,12],.095,'#749b9c',aeration);
    for(let k=0;k<8;k++){
      const z=-11+k*3.15;
      link([x-2.3,1.1,z],[x+2.3,1.1,z],.065,'#93bab9',aeration);
      for(let n=0;n<5;n++){
        bubbleMatrix.position.set(x-1.9+n*.95,1.98+((k+n)%3)*.045,z+.2*((n+k)%2));
        bubbleMatrix.scale.set(1, .45, 1);bubbleMatrix.updateMatrix();bubbles.setMatrixAt(bi++,bubbleMatrix.matrix);
      }
    }
  }
  bubbles.instanceMatrix.needsUpdate=true;
  // A main crosswalk spans all channels, with column supports and two-height guard rails.
  box([30.4,.26,1.65],[0,3.14,1.7],C.coping,aeration);
  for(const x of [-14.4,-7.2,0,7.2,14.4])box([.45,2.3,.55],[x,1.85,1.7],C.wall,aeration);
  rail([-15.1,3.29,.94],[15.1,3.29,.94],aeration,12);
  rail([-15.1,3.29,2.46],[15.1,3.29,2.46],aeration,12);
  rail([-14.7,3,-14.1],[14.7,3,-14.1],aeration,12);
  rail([-14.7,3,14.1],[14.7,3,14.1],aeration,12);
  rail([-14.7,3,-14.1],[-14.7,3,14.1],aeration,12);
  rail([14.7,3,-14.1],[14.7,3,14.1],aeration,12);
  // Walkway access stairs, each tread a genuine level change.
  for(let i=0;i<7;i++)box([2.2,.22+i*.43,.62],[-12,.22+(i*.43)/2,17.2-i*.58],C.walk,aeration);
  route([[15.4,1.15,-10],[16.3,1.15,-10],[16.3,2.65,-10],[16.3,2.65,10]],.19,C.steel,aeration);
  for(const z of [-9,-3,3,9])route([[16.3,2.65,z],[14.4,2.65,z],[14.4,1.13,z]],.12,C.steel,aeration);

  // W02: thin annular wall, water surface, central feedwell and a radial scraper bridge.
  const clarifier=entity('W02',[12,0,-9]);
  cylinder(13.7,.35,[0,.35,0],C.walk,clarifier);
  cylinder(12.6,.28,[0,.6,0],'#bdcfca',clarifier);
  annulus(12.65,12.12,2.42,.72,clarifier);
  annulus(12.87,11.98,.18,3.14,clarifier,C.coping);
  cylinder(12.09,.06,[0,2.42,0],waterMat,clarifier);
  // Subtle concentric water traces stay below the bridge instead of becoming a glowing target.
  for(const r of [5.7,8.5,10.6])torus(r,.027,[0,2.48,0],'#a4ced2',clarifier);
  annulus(2.03,1.74,1.25,2.1,clarifier,C.wall);
  cylinder(.65,3.75,[0,2.33,0],C.wall,clarifier);
  cylinder(2.17,.23,[0,4.11,0],C.coping,clarifier);
  ringRails(12.68,3.26,clarifier,44);
  // Radial walkway to the perimeter drive, with triangulated understructure.
  box([12.5,.23,1.42],[6.25,3.9,0],C.coping,clarifier);
  for(const z of [-.53,.53]){
    link([.5,3.54,z],[12.3,3.54,z],.075,C.dark,clarifier);
    for(let i=0;i<6;i++){
      const x=.6+i*1.92;
      link([x,3.53,z],[x+.96,3.0,z],.055,C.steel,clarifier);
      link([x+.96,3.0,z],[x+1.92,3.53,z],.055,C.steel,clarifier);
    }
  }
  rail([1.7,4.03,-.68],[12.55,4.03,-.68],clarifier,7);
  rail([1.7,4.03,.68],[12.55,4.03,.68],clarifier,7);
  box([1.6,.85,1.2],[0,4.62,0],C.steel,clarifier);
  link([0,1.1,0],[0,3.9,0],.12,C.dark,clarifier);
  link([0,1.13,0],[10.8,1.13,0],.11,C.dark,clarifier);
  box([1.5,.45,1.3],[12.2,3.68,0],C.dark,clarifier);
  // A localized sampling/instrument cabinet carries the review indication.
  // The mechanical drive stays neutral: a water-quality record does not imply motor failure.
  box([1.3,.72,1.08],[12.2,4.2,0],C.steel,clarifier);
  box([1.15,.2,1.2],[13.5,.65,2.8],C.walk,clarifier);
  link([13.5,.7,2.8],[13.5,2.05,2.8],.09,C.steel,clarifier);
  box([.95,1.2,.68],[13.5,2.4,2.8],C.wall,clarifier);
  const reviewCover=box([.71,.62,.055],[13.5,2.45,3.17],C.amber,clarifier);
  cylinder(.1,.18,[13.5,3.09,2.8],C.amber,clarifier,{emissive:C.amber,emissiveIntensity:.12});
  route([[12.25,1.5,2.8],[13.5,1.5,2.8],[13.5,2,2.8]],.055,C.steel,clarifier);
  for(let i=0;i<6;i++)box([1.8,.2+i*.57,.62],[16-i*.43,.2+i*.285,0],C.walk,clarifier);
  box([1.4,.18,1.8],[13.3,3.24,0],C.coping,clarifier);

  // W03: a gabled pump building, window bays, service entry, manifold, pump motors and valves.
  const pump=entity('W03',[24,0,18]);
  box([25,.35,16],[0,.35,0],C.walk,pump);
  box([22,7,12],[0,4.02,0],C.wall,pump);
  box([22.4,.3,12.4],[0,.73,0],'#c4d1cd',pump);
  box([22.4,.23,12.4],[0,7.55,0],C.coping,pump);
  // The gable is built as a closed prism rather than a box pretending to be a roof.
  const roofShape=new THREE.Shape();roofShape.moveTo(-6.8,0);roofShape.lineTo(0,3);roofShape.lineTo(6.8,0);roofShape.closePath();
  const roofGeo=new THREE.ExtrudeGeometry(roofShape,{depth:23.8,bevelEnabled:false,steps:1});
  roofGeo.rotateY(Math.PI/2);mesh(roofGeo,C.roof,[-11.9,7.67,0],pump);
  link([-12,10.7,0],[12,10.7,0],.11,C.coping,pump);
  for(const z of [-6.85,6.85])link([-12,7.7,z],[12,7.7,z],.12,C.coping,pump);
  for(const x of [-7.5,-2.6,2.6,7.5]){
    box([3.45,2.25,.12],[x,4.65,6.07],C.dark,pump);
    box([3.12,1.95,.13],[x,4.65,6.15],C.glass,pump,{roughness:.29,metalness:.18});
    box([.09,2.03,.16],[x,4.65,6.24],C.coping,pump);
    box([3.25,.09,.17],[x,4.65,6.24],C.coping,pump);
  }
  for(const z of [-3.4,.5,3.8]){
    box([.14,1.8,2.3],[11.08,4.8,z],C.dark,pump);
    box([.15,1.53,2.02],[11.16,4.8,z],C.glass,pump,{roughness:.3});
  }
  box([2.15,3.15,.13],[-7,2.45,6.22],C.dark,pump);
  box([1.8,2.86,.14],[-7,2.45,6.31],'#9aafaa',pump);
  box([.1,.15,.12],[-6.43,2.4,6.45],C.rail,pump);
  box([3,.16,1.45],[-7,.78,6.8],C.coping,pump);
  for(const x of [-5,4]){
    cylinder(.35,1.1,[x,9.54,-2.5],C.steel,pump);
    cylinder(.56,.18,[x,10.15,-2.5],C.coping,pump);
  }
  // Exterior motor/pump skids share a manifold, all individually legible from the camera.
  for(const z of [-3.5,0,3.5]){
    box([2.5,.25,2.2],[13.3,.65,z],C.walk,pump);
    cylinder(.56,1.45,[13.3,1.5,z],C.steel,pump);
    cylinder(.72,.26,[13.3,2.31,z],C.dark,pump);
    for(let k=0;k<4;k++)torus(.58,.04,[13.3,1.25+k*.2,z],C.dark,pump);
    route([[11.1,1.3,z],[13.3,1.3,z],[15,1.3,z]],.23,C.pipe,pump);
    flange([14.3,1.3,z],[1,0,0],pump);
  }
  route([[15,1.3,-4],[15,1.3,5.5]],.34,C.pipe,pump);
  valve([15,1.3,5],pump);

  // Process routing: aeration -> clarification -> reclaimed water pumping, with measured supports.
  route([[-9.6,1.18,-9],[-1,1.18,-9]],.42);
  route([[24.6,1.18,-9],[33,1.18,-9],[33,1.18,7.8],[33,4.8,7.8],[33,4.8,13.2],[30,4.8,13.2],[30,2.15,12.1]],.4);
  route([[39,1.3,23.5],[41,1.3,23.5],[41,1.3,28]],.35);
  for(const p of [[-6,1.18,-9],[28,1.18,-9],[33,1.18,-2],[33,1.18,6]])flange(p,p[0]===33?[0,0,1]:[1,0,0]);
  for(const p of [[-5,1.24,-9],[33,1.24,1],[41,1.35,26]])arrow(p,p[0]===-5?[1,0,0]:[0,0,1]);
  for(const [x,z] of [[-7,-9],[-2,-9],[28,-9],[33,-6],[33,3],[41,25.5]])box([.95,.85,.8],[x,.54,z],C.wall,root);
  valve([28,1.18,-9]);
  for(const x of [32.35,33.65])link([x,.4,7.8],[x,4.45,7.8],.085,C.steel);
  link([32.3,4.45,7.8],[33.7,4.45,7.8],.1,C.steel);
  // A small air blower shelter is subordinate to the main aeration basin.
  box([5.6,.3,7],[-4.9,.4,-19.7],C.walk,root);
  for(const z of [-21.3,-18.2]){
    box([2.8,1.35,1.9],[-4.9,1.2,z],C.steel,root);
    for(let i=0;i<5;i++)box([.07,.85,1.95],[-6+i*.45,1.2,z],C.dark,root);
  }
  box([6.2,.22,7.4],[-4.9,3.35,-19.7],C.coping,root);
  for(const x of [-7.5,-2.3])for(const z of [-22.6,-16.8])link([x,.4,z],[x,3.3,z],.07,C.steel);
  route([[-4.9,1.4,-19.7],[-8.6,1.4,-19.7],[-7.7,2.65,-18]],.17,C.steel);

  // Selection uses a ground outline plus reversible lightness separation; semantic amber stays invariant.
  selections.W01=lineLoop([[-40,.48,-23.8],[-8,.48,-23.8],[-8,.48,7.8],[-40,.48,7.8]],'#4c8997');
  selections.W02=torus(13.6,.085,[12,.56,-9],'#4c8997');
  selections.W03=lineLoop([[11.4,.56,9.8],[40,.56,9.8],[40,.56,26.2],[11.4,.56,26.2]],'#4c8997');
  Object.entries(units).forEach(([id,g])=>g.traverse(o=>{o.userData.entityId=id;}));
  reviewCover.userData.reviewRequired=true;
  const semanticAmber=new THREE.Color(C.amber);
  const focusEntity=stage.entityFocus(units,{inactive:.58,active:1,preserve:o=>o.material.color?.equals(semanticAmber)});
  let current='W02';
  function select(id){
    if(!Object.hasOwn(selections,id))return false;
    current=id;for(const [key,o]of Object.entries(selections))o.visible=key===id;
    focusEntity(id);
    stage.render();return true;
  }
  select(current);
  let meshCount=0;root.traverse(o=>{if(o.isMesh)meshCount++;});
  return {
    anchors:[{id:'W01',point:[-24,4.8,-8],label:'曝气区'},{id:'W02',point:[12,5.3,-9],label:'二号澄清池'},{id:'W03',point:[24,10.9,18],label:'回用泵房'}],
    select,
    meta:{title:'清源再生水厂',original:true,schematic:true,meshCount,entityIds:['W01','W02','W03'],reviewRequired:['W02'],flow:['W01','W02','W03'],materialDirection:'off-white concrete, blue-grey steel, water blue, amber sampling cabinet panel only',references:['N10128-20d909e70a33a6c7734e.jpg','N11439-1ede429231bbd83ba61a.jpg'],referenceBoundary:'Only the elevated oblique camera, lightness hierarchy and localized material separation were studied; geometry and layout are newly constructed.',engineeringBoundary:'Illustrative facility geometry; not an as-built layout or engineering control model.'},
    recommendedCamera:[82,70,95],recommendedTarget:[0,1,0],recommendedSpan:88
  };
}
