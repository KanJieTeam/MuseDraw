// Original, asset-free port geometry. Coordinates: x along quay, z towards sea.
// The quantities represented by containers are illustrative, never business counts.
export function buildScene(stage) {
  const {THREE,scene,mesh,box,cylinder,beam,group,material}=stage;
  const root=group(); root.name='Hailan west container terminal';
  const colors={blue:'#668bb0',pale:'#bbcbd4',steel:'#aabfc9',dark:'#263f50',amber:'#dcb16d'};
  const buckets=new Map();
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();
  const unitBox=new THREE.BoxGeometry(1,1,1);
  const unitBeam=new THREE.CylinderGeometry(1,1,1,6);
  const unitCylinder=new THREE.CylinderGeometry(1,1,1,12);

  function instance(kind,size,position,role='metal',rotation=[0,0,0],tint=null) {
    const key=kind+'|'+role;
    if(!buckets.has(key))buckets.set(key,{kind,role,items:[]});
    buckets.get(key).items.push({size,position,rotation,tint});
  }
  function ib(size,pos,role='metal',tint=null){instance('box',size,pos,role,[0,0,0],tint);}
  function ic(radius,height,pos,role='metal',rotation=[0,0,0]){instance('cylinder',[radius,height,radius],pos,role,rotation);}
  function strut(a,b,r=.07,role='white'){
    const pa=new THREE.Vector3(...a),pb=new THREE.Vector3(...b),dir=pb.clone().sub(pa);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
    const key='beam|'+role;
    if(!buckets.has(key))buckets.set(key,{kind:'beam',role,items:[]});
    buckets.get(key).items.push({size:[r,dir.length(),r],position:pa.add(pb).multiplyScalar(.5).toArray(),quaternion:q});
  }
  function flush(){
    for(const b of buckets.values()){
      const geo=b.kind==='box'?unitBox:b.kind==='beam'?unitBeam:unitCylinder;
      const mat=material(b.role,b.role==='#ffffff'?{roughness:.83,metalness:.16}:{});
      const instanced=new THREE.InstancedMesh(geo,mat,b.items.length);
      instanced.name=`port ${b.kind} ${b.role} ×${b.items.length}`;
      b.items.forEach((it,i)=>{
        dummy.position.set(...it.position);dummy.scale.set(...it.size);
        if(it.quaternion)dummy.quaternion.copy(it.quaternion);else dummy.rotation.set(...it.rotation);
        dummy.updateMatrix();instanced.setMatrixAt(i,dummy.matrix);
        if(it.tint)instanced.setColorAt(i,color.set(it.tint));
      });
      instanced.castShadow=true;instanced.receiveShadow=true;instanced.instanceMatrix.needsUpdate=true;
      if(instanced.instanceColor)instanced.instanceColor.needsUpdate=true;
      instanced.computeBoundingSphere();root.add(instanced);
    }
  }
  // Solid terminal platform. Water occupies the foreground band, about 28% of plan area.
  box([112,1.5,44],[0,-.79,-13],'ground',root);
  box([112,.33,43.6],[0,.07,-13.1],'concrete',root);
  const water=box([116,.22,17.8],[0,-.94,17.8],'water',root,{roughness:.23,metalness:.26});
  water.name='foreground sheltered harbor water';water.castShadow=false;
  box([112,1.6,.9],[0,-.57,9.25],'darkmetal',root);
  box([112,.23,.65],[0,.36,8.88],'white',root);
  // Seawall joints, rubber fenders and mooring bollards.
  for(let x=-54;x<=54;x+=4){
    ib([.05,1.4,.04],[x,-.53,9.73],'#516b78');
    ib([.42,1.1,.34],[x,-.27,9.93],'#172b39');
    if(x%8===-6||x%8===2){ic(.17,.36,[x,.64,8.32],'darkmetal');ib([.7,.16,.31],[x,.84,8.32],'metal');}
  }
  // Slightly broken wavelets: subtle physical surfaces, not luminous animated routes.
  for(let i=0;i<29;i++){
    const x=-54+(i*17.73)%108,z=22.0+(i%4)*1.35;
    ib([1.1+(i%3)*.4,.012,.055],[x,-.813,z],'#254754');
  }
  // Rear and apron roads, wheel lanes and reserved lay-bys.
  box([111,.035,4.7],[0,.26,-26.3],'road',root);
  box([111,.035,4.5],[0,.26,-2.6],'road',root);
  for(const x of [-18.4,17.8])box([4.4,.04,29.8],[x,.26,-12.9],'road',root);
  for(let x=-53;x<54;x+=3.3){ib([1.65,.025,.075],[x,.296,-26.3],'white');ib([1.65,.025,.075],[x,.296,-2.6],'white');}
  for(const x of [-18.4,17.8])for(let z=-23;z<0;z+=3.2)ib([.07,.026,1.5],[x,.3,z],'white');
  for(const z of [-28.55,-24.05,-4.8,-.35])ib([111,.028,.07],[0,.3,z],'#91a4aa');
  for(let x=-54;x<55;x+=4.2)for(const z of [-22.4,-5.7]){
    ib([.05,.027,1.1],[x,.3,z],'#697f8b');
  }
  // Twin crane rails run continuously parallel to the apron, with sleepers.
  for(const z of [1.5,7.3]){
    ib([111,.16,.15],[0,.41,z],'metal');
    for(let x=-54;x<54;x+=1.6)ib([.25,.09,.8],[x,.31,z],'darkmetal');
  }

  // Container ribs are real small geometry. Instancing keeps thousands of parts cheap.
  const boxColors=['#6889a6','#7e9bb3','#536f8d','#a2b3bd','#658596','#90a5ad'];
  let containerCount=0;
  function containerAt(x,y,z,index=0,orientation=0){
    const L=3.6,H=1.45,W=1.43;
    const tint=boxColors[(index+boxColors.length)%boxColors.length];
    instance('box',[L,H,W],[x,y+H/2,z],'#ffffff',[0,orientation,0],tint);
    // This model uses x-aligned containers; all side ribs remain in that direction.
    for(let r=-1.5;r<=1.51;r+=.5){
      ib([.045,H-.16,.032],[x+r,y+H/2,z+W/2+.018],'#526c80');
      ib([.045,H-.16,.032],[x+r,y+H/2,z-W/2-.018],'#526c80');
      ib([.045,.035,W-.13],[x+r,y+H+.014,z],'#9aadb9');
    }
    // End frame and twin locking bars, visible from the chosen east-facing camera.
    for(const rz of [-.27,.27])ib([.034,H-.18,.032],[x+L/2+.021,y+H/2,z+rz],'#b2bfc6');
    containerCount++;
  }
  // Unequal stack heights, intentional transverse aisles and open transfer ends.
  const zoneXs=[-36,0,36];
  zoneXs.forEach((cx,zone)=>{
    for(let bed=0;bed<2;bed++){
      const cz=-18.7+bed*9.0;
      box([28.3,.12,5.8],[cx,.32,cz],'darkmetal',root);
      for(let col=0;col<7;col++)for(let row=0;row<3;row++){
        const tiers=2+((col+row+zone+bed)%3===0?1:0)+((col===3&&row===1)?1:0);
        for(let tier=0;tier<tiers;tier++)containerAt(cx-11.4+col*3.8,.41+tier*1.49,cz-1.57+row*1.57,col+row+zone);
      }
      for(let col=0;col<8;col++)ib([.06,.03,6.8],[cx-13.2+col*3.8,.34,cz],'#6a8490');
    }
  });

  // Rear utility sheds: pitched roofs, loading doors, facade ribs and roof vents.
  function warehouse(x,width){
    const g=group([x,0,-32],root);
    box([width,3.0,5.5],[0,1.75,0],'#536c7b',g);
    const shape=new THREE.Shape();shape.moveTo(-3,0);shape.lineTo(0,1.35);shape.lineTo(3,0);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false});
    // Local extrusion is along x; the roof cross section is in z/y.
    geo.rotateY(Math.PI/2);mesh(geo,'#8296a1',[-width/2,3.23,0],g);
    for(let i=-width/2+1.4;i<width/2;i+=3.7){
      box([2.9,2.1,.08],[i,1.41,2.8],'darkmetal',g);
      for(let h=.6;h<2.4;h+=.32)box([2.7,.035,.04],[i,h,2.86],'#6c8290',g);
    }
    for(let i=-width/2+.9;i<width/2;i+=1.9)box([.04,2.8,.05],[i,1.8,2.82],'#8b9eaa',g);
    box([2.3,.55,1],[0,4.24,0],'metal',g);
    return g;
  }
  warehouse(-37,26);warehouse(-2,25);warehouse(34,26);

  // Rubber-tyred yard gantries bridge entire stack beds, smaller than ship-to-shore cranes.
  function yardGantry(x,z){
    for(const dx of [-2.2,2.2])for(const dz of [-3.75,3.75]){
      strut([x+dx,.8,z+dz],[x+dx,7.6,z+dz],.17,'#99afc2');
      ic(.46,.36,[x+dx,.67,z+dz],'#192c3a',[Math.PI/2,0,0]);
      strut([x+dx,.9,z+dz],[x+dx,5.1,z-dz],.075,'metal');
    }
    ib([5.1,.48,8.5],[x,7.6,z],'blue');
    ib([3.2,.34,.9],[x,7.1,z+.5],'metal');
    for(const dx of [-1.3,1.3])strut([x+dx,7,z+.3],[x+dx,5.7,z+.3],.028,'darkmetal');
    ib([3.0,.23,1.2],[x,5.65,z+.3],'#a2b4c1');
  }
  yardGantry(-42,-18.7);yardGantry(7,-9.7);yardGantry(39,-18.7);

  const berthDefs=[
    {id:'B01',x:-36,length:33.5,width:8.0,color:'#5d809c',cranes:[-48,-40,-32,-24],stackCols:6},
    {id:'B02',x:0,length:31.5,width:7.9,color:'#708eaa',cranes:[-7,6],stackCols:6},
    {id:'B03',x:35.7,length:29.2,width:7.5,color:'#587e9a',cranes:[27,35.5,44],stackCols:5}
  ];
  const berthHighlights=[];
  const vesselFocus=[];

  function hullShape(L,W,inset=0){
    const a=L/2-inset,b=W/2-inset,s=new THREE.Shape();
    s.moveTo(-a+1.25,-b);s.lineTo(a-3.8,-b);
    s.quadraticCurveTo(a-1.1,-b+.15,a,0);s.quadraticCurveTo(a-1.1,b-.15,a-3.8,b);
    s.lineTo(-a+1.25,b);s.quadraticCurveTo(-a,b,-a,b-1.1);
    s.lineTo(-a,-b+1.1);s.quadraticCurveTo(-a,-b,-a+1.25,-b);s.closePath();return s;
  }
  function extrudedHull(s,depth,bevel=.13){
    const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1,curveSegments:10});
    geo.rotateX(Math.PI/2);return geo;
  }
  function ship(b){
    const g=group([b.x,0,15.7],root),L=b.length,W=b.width;
    g.name=b.id+' container vessel';
    const hullMaterial=material(b.color,{metalness:.32,roughness:.47}).clone();
    const hull=mesh(extrudedHull(hullShape(L,W),2.8,.22),hullMaterial,[0,1.95,0],g);
    vesselFocus.push({id:b.id,hull,material:hullMaterial,base:new THREE.Color(b.color)});
    mesh(extrudedHull(hullShape(L,W,.08),.34,.05),'#253c4c',[0,.0,0],g);
    mesh(extrudedHull(hullShape(L,W,.28),.22,.06),'#a7bac6',[0,2.1,0],g);
    mesh(new THREE.SphereGeometry(.65,16,12),'#53758e',[L/2-.6,-.6,0],g).scale.set(1.9,.65,1);
    // Lower bridge, boat deck, navigation bridge and roof have different footprints.
    const stern=-L/2+3.6;
    box([4.6,2.35,W-1.0],[stern,3.34,0],'#8fa8ba',g);
    box([3.95,1.55,W-1.4],[stern-.25,5.28,0],'white',g);
    box([3.25,1.25,W-.3],[stern-.2,6.68,0],'#b8c9d3',g);
    box([3.7,.26,W+.1],[stern-.2,7.45,0],'metal',g);
    box([3.0,.55,.055],[stern-.1,6.85,W/2-.12],'glass',g,{emissive:'#1b3846',emissiveIntensity:.22});
    box([.055,.55,W-.75],[stern+1.45,6.85,0],'glass',g);
    box([.055,.55,W-.75],[stern-1.84,6.85,0],'glass',g);
    for(let x=stern-1.3;x<stern+1.3;x+=.6)box([.055,.62,.09],[x,6.85,W/2-.07],'white',g);
    // Exhaust casing, mast, radar crosspiece and navigation aerials.
    box([1.1,2.4,1.1],[stern-1,7.9,-1.45],'darkmetal',g);
    box([1.2,.38,1.2],[stern-1,9.16,-1.45],b.id==='B02'?'accent':'blue',g);
    cylinder(.12,3.9,[stern-.1,9.35,0],'white',g);
    box([2.7,.12,.16],[stern-.1,10.45,0],'white',g);
    cylinder(.08,1.1,[stern+1.0,10.7,.45],'metal',g);
    // Lifeboat and davit occupy the visible starboard flank.
    const boat=mesh(new THREE.SphereGeometry(.56,12,8),'white',[stern+.1,4.65,W/2+.15],g);boat.scale.set(2.4,.65,.67);
    beam([stern-.8,4.6,W/2],[stern-.8,5.55,W/2+.2],.06,'metal',g);
    beam([stern+.8,4.6,W/2],[stern+.8,5.55,W/2+.2],.06,'metal',g);
    // Railings: thin tubes, posts and bow chains; all modeled in actual 3D.
    for(const z of [-W/2+.17,W/2-.17]){
      beam([-L/2+1.4,2.78,z],[L/2-4.1,2.78,z],.035,'metal',g);
      for(let x=-L/2+1.5;x<L/2-3.7;x+=2.1)beam([x,2.1,z],[x,2.8,z],.028,'metal',g);
    }
    beam([L/2-4.1,2.78,-W/2+.17],[L/2-.55,2.78,0],.035,'metal',g);
    beam([L/2-4.1,2.78,W/2-.17],[L/2-.55,2.78,0],.035,'metal',g);
    for(const z of [-1.05,1.05]){
      cylinder(.27,.43,[L/2-2.8,2.38,z],'darkmetal',g);
      cylinder(.4,.13,[L/2-2.8,2.65,z],'metal',g);
    }
    // Deck holds, unequal tiered blocks and narrow service walkways.
    for(let col=0;col<b.stackCols;col++){
      const px=-L/2+7.9+col*3.7;
      box([3.52,.18,W-1],[px,2.27,0],'darkmetal',g);
      for(let row=0;row<4;row++){
        const tiers=2+((col+row+Number(b.id.slice(-1)))%4===0?1:0);
        for(let tier=0;tier<tiers;tier++)containerAt(b.x+px,2.38+tier*1.49,15.7-2.3+row*1.53,col+row+Number(b.id.slice(-1)));
      }
    }
    // Two crossed mooring lines connect each end to bollards on the continuous quay.
    for(const sign of [-1,1]){
      strut([b.x+sign*(L/2-2.2),2.5,12.1],[b.x+sign*(L/2+.6),.66,8.5],.037,'#8a9eaa');
      strut([b.x+sign*(L/2-3.0),2.5,12.1],[b.x+sign*(L/2-5.0),.66,8.5],.032,'#718996');
    }
    const stripMat=material(b.id==='B02'?'accent':'blue',{roughness:.5,emissive:b.id==='B02'?'#785329':'#2c4a67',emissiveIntensity:.1}).clone();
    const strip=mesh(new THREE.BoxGeometry(L-1,.08,.26),stripMat,[b.x,.55,8.83],root);
    const indicator=mesh(new THREE.BoxGeometry(2.0,.14,.7),stripMat,[b.x,.55,7.8],root);
    berthHighlights.push({id:b.id,material:stripMat,strip,indicator});
    return g;
  }

  // Ship-to-shore cranes: four bogies, portal legs, diagonal braces, backreach,
  // twin boom trusses, cable-stayed mast, trolley, hoist wires and suspended spreader.
  function quayCrane(x,index,id){
    const y0=.55,top=13.6;
    const frame=id==='B02'?'#90aabd':'#6b859c';
    const secondary=id==='B02'?'#6b879d':'#506b83';
    const lift=(id==='B01'&&index%2===0)?2.8:(id==='B03'&&index===1)?3.2:0;
    const boomY=z=>top+Math.max(0,(z-7.3)/(25.2-7.3))*lift;
    for(const dx of [-1.65,1.65])for(const z of [1.5,7.3]){
      ib([1.28,.53,.8],[x+dx,.71,z],'darkmetal');
      for(const wx of [-.36,.36])ic(.32,.26,[x+dx+wx,.58,z],'#172938',[Math.PI/2,0,0]);
      strut([x+dx,y0+.5,z],[x+dx*.75,top,z],.18,frame);
      strut([x+dx,y0+1.6,z],[x-dx*.75,top-.8,z],.075,secondary);
    }
    for(const z of [1.5,7.3])strut([x-1.6,10.8,z],[x+1.6,10.8,z],.16,frame);
    for(const dx of [-1.24,1.24]){
      strut([x+dx,top,1.5],[x+dx,top,7.3],.22,frame);
      strut([x+dx,3.1,1.5],[x+dx,9.5,7.3],.09,frame);
      // Two boom chords and repeated Warren trusses.
      strut([x+dx,top,-6.4],[x+dx,top,7.3],.16,frame);
      strut([x+dx,top,7.3],[x+dx,boomY(25.2),25.2],.16,frame);
      strut([x+dx,top+1.25,-6.4],[x+dx,top+1.25,7.3],.105,frame);
      strut([x+dx,top+1.25,7.3],[x+dx,boomY(25.2)+1.25,25.2],.105,frame);
      for(let i=0;i<8;i++){
        const z=-6.4+i*3.95;
        strut([x+dx,boomY(z)+(i%2?1.25:0),z],[x+dx,boomY(z+3.95)+(i%2?0:1.25),z+3.95],.065,secondary);
      }
      strut([x+dx,top+1.2,4.9],[x+dx,20.2,3.3],.13,frame);
      strut([x+dx,20.2,3.3],[x+dx,boomY(23.8)+1.2,23.8],.043,secondary);
      strut([x+dx,20.2,3.3],[x+dx,top+1.2,-5.9],.043,secondary);
    }
    for(const z of [-6.4,1.5,7.3,13,19,25.2])strut([x-1.25,boomY(z)+.2,z],[x+1.25,boomY(z)+.2,z],.07,secondary);
    strut([x-1.25,20.2,3.3],[x+1.25,20.2,3.3],.11,frame);
    ib([2.6,1.8,3.5],[x,top+.8,-4.0],'#698aa4');
    ib([1.5,1.5,1.65],[x+1.7,top-.8,6.4],frame);
    ib([.045,.8,1.36],[x+2.48,top-.68,6.4],'glass');
    ib([2.3,.7,2.0],[x,boomY(15.4)-.45,15.4],'darkmetal');
    const dropY=8.0+(index%3)*.55;
    for(const dx of [-.85,.85])for(const dz of [-.6,.6])strut([x+dx,boomY(15.4)-.8,15.4+dz],[x+dx,dropY,15.4+dz],.023,'darkmetal');
    ib([2.5,.26,1.65],[x,dropY,15.4],frame);
    for(const dx of [-1.1,1.1])ib([.22,.5,.2],[x+dx,dropY-.2,15.4],'darkmetal');
    // Access stair stringers and landings, clearly separate from primary bracing.
    strut([x-1.9,1.2,1.1],[x-1.9,5.9,4.0],.055,secondary);
    strut([x-1.9,5.9,4.0],[x-1.9,10.6,1.1],.055,secondary);
    for(let step=0;step<13;step++)ib([.55,.06,.3],[x-1.9,1.3+step*.36,1.2+step*.22],secondary);
    for(let step=0;step<13;step++)ib([.55,.06,.3],[x-1.9,6+step*.36,3.9-step*.22],secondary);
    ib([.65,.13,1.1],[x-1.9,6.0,4.0],frame);
    ic(.17,.27,[x,20.6,3.3],id==='B02'?'accent':'blue');
  }
  berthDefs.forEach(b=>{ship(b);b.cranes.forEach((x,i)=>quayCrane(x,i,b.id));});

  // Tractor trailers, wheel hubs, cab glazing and distinct chassis are visible at close range.
  function truck(x,z,heading=0,loaded=true){
    const g=group([x,.31,z],root);g.rotation.y=heading;
    box([5.3,.3,1.25],[0,.75,0],'darkmetal',g);
    box([1.5,1.3,1.45],[2.3,1.5,0],'white',g);
    box([.045,.62,1.2],[3.08,1.75,0],'glass',g);
    box([1.04,.6,.04],[2.4,1.77,.75],'glass',g);
    box([1.04,.6,.04],[2.4,1.77,-.75],'glass',g);
    box([1.6,.16,1.55],[2.3,2.22,0],'metal',g);
    for(const ax of [-2,-1.2,2.25])for(const side of [-.76,.76]){
      const tyre=mesh(new THREE.CylinderGeometry(.38,.38,.22,14),'#142431',[ax,.59,side],g);tyre.rotation.x=Math.PI/2;
      const hub=mesh(new THREE.CylinderGeometry(.19,.19,.24,12),'metal',[ax,.59,side],g);hub.rotation.x=Math.PI/2;
    }
    box([4.0,.18,1.48],[-.8,1.03,0],'#849cab',g);
    if(loaded){box([3.6,1.45,1.43],[-.8,1.83,0],'blue',g);for(let i=-2.3;i<.9;i+=.5)box([.045,1.29,.025],[i,1.83,.73],'#405f7a',g);}
    for(const z0 of [-.52,.52])box([.035,.19,.23],[3.09,1.25,z0],'white',g,{emissive:'#afc4cb',emissiveIntensity:.35});
  }
  truck(-43,-2.5,0);truck(-8,-2.5,Math.PI);truck(30,-2.5,0,false);truck(9,-26.3,Math.PI);

  // Lighting masts without extra light sources; illumination remains owned by stage.
  for(const x of [-51,-20,18,51])for(const z of [-29.2,-5.1]){
    ic(.24,.7,[x,.66,z],'darkmetal');ic(.08,8.6,[x,5.0,z],'metal');
    strut([x,9.25,z],[x+1.15,9.25,z],.055,'metal');
    ib([.9,.16,.45],[x+1.15,9.25,z],'white');
    const lamp=box([.7,.035,.3],[x+1.15,9.14,z],'#c7d7df',root,{emissive:'#b0c7d4',emissiveIntensity:.6});lamp.castShadow=false;
  }
  // Small utility cluster gives the back corner a distinctive silhouette.
  for(const x of [49.6,52.3]){cylinder(1.0,2.9,[x,1.79,-32.3],'white',root);cylinder(1.06,.14,[x,3.3,-32.3],'metal',root);}
  box([4.8,.7,2.8],[50.9,.5,-32.3],'concrete',root);
  for(let i=0;i<6;i++)ib([.1,.9,1.3],[47.5+i*.9,.85,-29.8],'darkmetal');
  flush();

  function select(id){
    if(!berthDefs.some(b=>b.id===id))return;
    for(const h of berthHighlights){
      const active=h.id===id;
      h.material.emissiveIntensity=active?.48:.06;
      h.strip.scale.z=active?1.45:1;
      h.indicator.scale.x=active?1.35:1;
    }
    for(const vessel of vesselFocus){
      const active=vessel.id===id;
      vessel.material.color.copy(vessel.base).multiplyScalar(active?1.28:.63);
      vessel.material.emissive.set('#000000');
    }
    stage.render?.();
  }
  select('B02');
  return {
    anchors:berthDefs.map(b=>({id:b.id,point:[b.x,3.2,20.6],label:b.id.slice(1)+'泊位'})),
    select,
    recommendedCamera:[30,85,125],recommendedTarget:[0,2.5,-1.0],recommendedSpan:81,
    meta:{
      title:'海岚港 · 连续岸线夜航作业区',original:true,externalAssets:false,
      referencesViewed:['outputs/design-library/assets/collected/N11444-fdc70cc7164ebf08d3dd.jpg','outputs/easyv-originals-20261025/harbor/large.png'],
      composition:'原创连续岸线；后方堆场与仓库、9台岸桥和3艘不同尺度的集装箱船；前方水域约占平面28%。非参考截图的布局或模型复刻。',
      geometry:'曲面挤出船体、叠层船桥、真实箱体棱与波纹、桁架吊臂/拉索/吊具、门架轮组/阶梯、龙门吊、集卡与小灯具；重复构件采用InstancedMesh。',
      entities:['B01','B02','B03'],containerModelCount:containerCount,
      quantities:'模型箱体数量仅表达堆场密度，不映射自然箱业务计数。岸桥数量与原3泊位实体一致：4+2+3=9。',
      selection:'对应船壳保持原蓝色并适度提亮，其他船壳回到较深蓝；同时增强对应岸线短条。无全船警报色、无全场发光；B02少量琥珀仅代表待引航确认。',
      axes:{shoreline:'x',inland:'negative z',water:'positive z',groundY:0},
      nominalBounds:{x:[-58,58],z:[-35,27]},
      viewingBoundary:'由根任务统一检查真实WebGL渲染、场景遮挡、构图与标签；此模块不添加UI、灯光或相机控制。'
    }
  };
}
