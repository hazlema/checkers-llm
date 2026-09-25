import * as THREE from 'three';
import {disposeObject} from './resources';
import {coords, squareAt, type Game, type Move, type Piece} from './game';

const material=(color:number,metalness=0,roughness=.65)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const steel=material(0xa9bdc3,.78,.3), darkSteel=material(0x34454b,.7,.38), gold=material(0xc9ad68,.7,.32), black=material(0x111c20);
const red=material(0xa93638), blue=material(0x3569a4), leather=material(0x302c2b);
const sharedMaterials=new Set<THREE.Material>([steel,darkSteel,gold,black,red,blue,leather]);
const retire=(object:THREE.Group)=>{object.removeFromParent();disposeObject(object,sharedMaterials);};
const cell=1.1;
function glowTexture(){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.translate(64,64);ctx.strokeStyle='#64ff9b';ctx.shadowColor='#39ff85';ctx.shadowBlur=17;ctx.lineWidth=3;ctx.beginPath();octagon(88).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.stroke();ctx.stroke();return new THREE.CanvasTexture(canvas);}
const point=(square:string)=>{const[x,y]=coords(square);return new THREE.Vector3((x-3.5)*cell,.21,(3.5-y)*cell);};
const octagon=(size:number)=>{const a=size/2,b=a*.67;return [new THREE.Vector2(-b,-a),new THREE.Vector2(b,-a),new THREE.Vector2(a,-b),new THREE.Vector2(a,b),new THREE.Vector2(b,a),new THREE.Vector2(-b,a),new THREE.Vector2(-a,b),new THREE.Vector2(-a,-b)];};
function prism(size:number,height:number){const shape=new THREE.Shape(octagon(size));const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1});geo.rotateX(-Math.PI/2);return geo;}
function mesh(geo:THREE.BufferGeometry,mat:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent:THREE.Object3D,mat:THREE.Material,w:number,h:number,d:number,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z);}
function label(text:string,color='#a4ac9e',size=64){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.font=`${size}px Georgia`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,64,64);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));sprite.scale.set(.3,.3,1);return sprite;}
function sealTexture(){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=160;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#d6ba73';ctx.beginPath();ctx.moveTo(24,22);ctx.lineTo(104,22);ctx.lineTo(96,94);ctx.lineTo(64,133);ctx.lineTo(32,94);ctx.closePath();ctx.lineWidth=7;ctx.strokeStyle='#d6ba73';ctx.stroke();ctx.fillRect(59,38,10,65);ctx.fillRect(42,53,44,9);ctx.beginPath();ctx.moveTo(48,38);ctx.lineTo(44,20);ctx.lineTo(60,31);ctx.lineTo(64,13);ctx.lineTo(71,31);ctx.lineTo(87,20);ctx.lineTo(81,38);ctx.closePath();ctx.fill();return new THREE.CanvasTexture(canvas);}
const seal=sealTexture();
function knight(piece:Piece){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const coat=piece.side==='red'?red:blue;
 // Forged boots, greaves and articulated armored knees.
 for(const x of [-.14,.14]){
  box(body,leather,.18,.13,.3,x,.09,.05);
  mesh(new THREE.CylinderGeometry(.072,.095,.29,6),steel,body,x,.28,0);
  mesh(new THREE.SphereGeometry(.103,8,6),steel,body,x,.44,.035);
 }
 mesh(new THREE.CylinderGeometry(.2,.31,.39,8),coat,body,0,.54,0);
 const breast=mesh(new THREE.SphereGeometry(1,8,6),steel,body,0,.78,0);breast.scale.set(.25,.29,.17);
 box(body,gold,.48,.052,.34,0,.61,0);
 box(body,coat,.22,.35,.02,0,.73,.168);
 const badge=mesh(new THREE.PlaneGeometry(.17,.23),new THREE.MeshStandardMaterial({map:seal,transparent:true,metalness:.35,roughness:.5}),body,0,.74,.184);badge.castShadow=false;
 const cape=box(body,coat,.45,.66,.035,0,.65,-.21);cape.rotation.x=-.12;
 mesh(new THREE.CylinderGeometry(.11,.12,.12,8),darkSteel,body,0,1.02,0);
 const helmet=mesh(new THREE.SphereGeometry(.205,8,6),steel,body,0,1.16,0);helmet.scale.y=1.15;
 box(body,darkSteel,.33,.15,.075,0,1.14,.16);
 box(body,steel,.32,.055,.09,0,1.19,.19);
 box(body,steel,.045,.22,.08,0,1.14,.205);
 for(const x of [-.11,-.055,.055,.11])box(body,black,.013,.045,.005,x,1.1,.203);
 const plume=mesh(new THREE.SphereGeometry(.11,6,5),coat,body,0,1.41,-.035);plume.scale.set(.55,1.5,1.4);
 for(const x of [-.31,.31]){
  const shoulder=mesh(new THREE.SphereGeometry(.15,8,6),steel,body,x,.91,0);shoulder.scale.set(1,.75,1.1);
  mesh(new THREE.CylinderGeometry(.065,.08,.26,6),darkSteel,body,x,.72,.015);
  mesh(new THREE.SphereGeometry(.095,8,6),steel,body,x,.59,.06);
 }
 // Kite shield and royal seal.
 const shieldShape=new THREE.Shape();shieldShape.moveTo(-.21,.22);shieldShape.lineTo(.21,.22);shieldShape.lineTo(.18,-.11);shieldShape.lineTo(0,-.32);shieldShape.lineTo(-.18,-.11);shieldShape.closePath();
 const shieldGeo=new THREE.ExtrudeGeometry(shieldShape,{depth:.045,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:1,steps:1});
 const shield=new THREE.Group();shield.position.set(-.34,.68,.18);shield.rotation.y=-.15;body.add(shield);
 mesh(shieldGeo,gold,shield);const face=mesh(shieldGeo,coat,shield,0,0,.025);face.scale.set(.9,.9,1);
 mesh(new THREE.PlaneGeometry(.3,.38),new THREE.MeshStandardMaterial({map:seal,transparent:true,metalness:.45,roughness:.5}),shield,0,-.01,.085);
 const sword=new THREE.Group();sword.position.set(.34,.64,.08);sword.rotation.z=-.2;body.add(sword);
 box(sword,leather,.05,.18,.055,0,0,0);box(sword,gold,.23,.045,.07,0,.10,0);
 const blade=mesh(new THREE.ConeGeometry(.048,.64,4),steel,sword,0,.43,0);blade.scale.z=.4;
 mesh(new THREE.SphereGeometry(.049,6,4),gold,sword,0,-.11,0);
 const crown=new THREE.Group();crown.position.y=1.35;body.add(crown);
 mesh(new THREE.CylinderGeometry(.225,.21,.105,8,1,true),gold,crown);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh(new THREE.ConeGeometry(.055,.16,4),gold,crown,Math.cos(a)*.21,.095,Math.sin(a)*.21);}
 crown.visible=piece.king;
 root.rotation.y=piece.side==='red'?.22:-.45;
 root.userData={square:piece.square,body,sword,cape,crown,phase:Math.random()*6,target:point(piece.square),moving:false};
 root.position.copy(point(piece.square));return root;
}

export class Battlefield {
 private renderer:THREE.WebGLRenderer;
 private scene=new THREE.Scene();
 private camera=new THREE.OrthographicCamera(-7,7,7,-7,.1,100);
 private soldiers=new Map<string,THREE.Group>();
 private tiles=new Map<string,THREE.Mesh>();
 private rims=new Map<string,THREE.Mesh>();
 private markers=new THREE.Group();
 private destinations=new Set<string>();
 private raycaster=new THREE.Raycaster();
 private pointer=new THREE.Vector2();
 private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 private angle=.66;private zoom=1;private previous=0;private lastTime=0;
 private dead: {object:THREE.Group;time:number}[]=[];
 private frame=0;
 constructor(private host:HTMLElement,private onSelect:(square:string)=>void){
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.renderer.setClearColor(0x000000,0);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.4;
  this.renderer.domElement.setAttribute('aria-label','Isometric battlefield. Select a soldier, then a highlighted destination. Scroll to zoom; middle-button drag to rotate. Keyboard moves are available below.');this.renderer.domElement.setAttribute('role','img');
  host.append(this.renderer.domElement);
  this.scene.add(new THREE.HemisphereLight(0xc2dbe7,0x25363a,2.8));
  const sun=new THREE.DirectionalLight(0xffe5ae,4);sun.position.set(-4,10,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.normalBias=.04;sun.shadow.bias=-.0005;this.scene.add(sun);
  const rim=new THREE.DirectionalLight(0x759ebf,3);rim.position.set(6,5,-7);this.scene.add(rim);
  const board=new THREE.Group();this.scene.add(board);
  box(board,material(0x1a292b,.25),9.25,.3,9.25,0,-.27,0);
  box(board,material(0x636653,.45),9.34,.07,9.34,0,-.09,0);
  box(board,material(0x263c3c,.1),9.2,.13,9.2,0,0,0);
  for(const x of [-4.63,4.63])for(const z of [-4.63,4.63]){mesh(new THREE.CylinderGeometry(.13,.13,.13,8),gold,board,x,-.07,z);}
  const tileGeo=prism(1.045,.11);
  const rimShape=new THREE.Shape(octagon(1.045));rimShape.holes.push(new THREE.Path(octagon(.998).reverse()));
  const rimGeo=new THREE.ShapeGeometry(rimShape);rimGeo.rotateX(-Math.PI/2);const glow=glowTexture();
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
   const sq=squareAt(x,y),p=point(sq),dark=(x+y)%2===0;
   const tile=mesh(tileGeo,material(dark?0x334d4b:0x80908a,.22,.7),board,p.x,.09,p.z);tile.userData.square=sq;this.tiles.set(sq,tile);
   const edge=mesh(rimGeo,new THREE.MeshBasicMaterial({color:0x40f587,toneMapped:false}),board,p.x,.229,p.z);
   const halo=mesh(new THREE.PlaneGeometry(1.48,1.48),new THREE.MeshBasicMaterial({map:glow,transparent:true,opacity:.6,toneMapped:false,depthWrite:false,blending:THREE.AdditiveBlending}),edge,0,.003,0);halo.rotation.x=-Math.PI/2;halo.castShadow=false;edge.castShadow=false;edge.visible=false;this.rims.set(sq,edge);
  }
  for(let i=0;i<8;i++){
   const letter=label(String.fromCharCode(97+i));letter.position.set((i-3.5)*cell,.16,4.62);board.add(letter);
   const rank=label(String(i+1));rank.position.set(-4.62,.16,(3.5-i)*cell);board.add(rank);
  }
  this.scene.add(this.markers);
  const shadowPlane=mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.2}),this.scene,0,-.6,0);shadowPlane.rotation.x=-Math.PI/2;shadowPlane.castShadow=false;
  const canvas=this.renderer.domElement;
  canvas.title='Scroll to zoom · Middle-button drag to rotate';
  let drag: {id:number;x:number}|null=null;
  const endDrag=()=>{
   const id=drag?.id;drag=null;canvas.style.cursor='';
   if(id!==undefined&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  };
  canvas.addEventListener('wheel',e=>{
   if(e.ctrlKey)return; // Preserve the browser's accessibility zoom gesture.
   e.preventDefault();
   const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?this.host.clientHeight:1);
   this.changeZoom(THREE.MathUtils.clamp(-pixels*.001,-.15,.15));
  },{passive:false});
  canvas.addEventListener('pointermove',e=>{
   if(!drag||e.pointerId!==drag.id)return;
   if(!(e.buttons&4)){endDrag();return;}
   this.angle-=(e.clientX-drag.x)*.008;
   drag.x=e.clientX;this.positionCamera();
  });
  canvas.addEventListener('pointerup',e=>{if(e.pointerId===drag?.id)endDrag();});
  canvas.addEventListener('pointercancel',e=>{if(e.pointerId===drag?.id)endDrag();});
  canvas.addEventListener('lostpointercapture',endDrag);
  window.addEventListener('blur',endDrag);
  canvas.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
  canvas.addEventListener('pointerdown',e=>{
   if(e.button===1){
    e.preventDefault();endDrag();drag={id:e.pointerId,x:e.clientX};
    canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';return;
   }
   if(e.button!==0||drag)return;

   const bounds=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
   // Highlighted ground remains clickable even behind a neighboring sword or helmet.
   const ground=this.raycaster.intersectObjects([...this.tiles.values()],false)[0]?.object.userData.square;
   if(ground&&this.destinations.has(ground)){this.onSelect(ground);return;}
   const hits=this.raycaster.intersectObjects([...this.soldiers.values(),...this.tiles.values()],true);
   for(const hit of hits){let obj:THREE.Object3D|null=hit.object;while(obj&&!obj.userData.square)obj=obj.parent;if(obj?.userData.square){this.onSelect(obj.userData.square);break;}}
  });
  new ResizeObserver(()=>this.resize()).observe(host);this.resize();this.animate(0);
 }
 private resize(){const width=this.host.clientWidth,height=this.host.clientHeight;this.renderer.setSize(width,height);const aspect=width/height;const vertical=Math.max(11.7,13.6/aspect)/this.zoom;this.camera.left=-vertical*aspect/2;this.camera.right=vertical*aspect/2;this.camera.top=vertical/2;this.camera.bottom=-vertical/2;this.camera.updateProjectionMatrix();this.positionCamera();}
 private positionCamera(){this.camera.position.set(Math.sin(this.angle)*16,16,Math.cos(this.angle)*16);this.camera.lookAt(0,.2,0);}
 rotate(){this.angle+=Math.PI/2;this.positionCamera();}
 changeZoom(delta:number){this.zoom=THREE.MathUtils.clamp(this.zoom+delta,.8,1.35);this.resize();}
 update(game:Game,selected:string|null,moves:Move[]){
  this.destinations=new Set(moves.filter(m=>m.from===selected).map(m=>m.to));
  const present=new Set(game.pieces.map(p=>p.id));
  for(const [id,object] of this.soldiers)if(!present.has(id)){this.dead.push({object,time:performance.now()});this.soldiers.delete(id);}
  const reset=game.history.length===0&&this.previous>0;
  if(reset){for(const object of this.soldiers.values())retire(object);this.soldiers.clear();for(const d of this.dead)retire(d.object);this.dead=[];}
  for(const p of game.pieces){let obj=this.soldiers.get(p.id);if(!obj){obj=knight(p);this.soldiers.set(p.id,obj);this.scene.add(obj);}obj.userData.target=point(p.square);obj.userData.square=p.square;obj.userData.crown.visible=p.king;if(this.reduced)obj.position.copy(obj.userData.target);}
  this.previous=game.history.length;
  for(const [sq,edge]of this.rims){edge.visible=game.pieces.some(p=>p.square===sq);const mat=edge.material as THREE.MeshBasicMaterial;mat.color.setHex(sq===selected?0xc4ffa1:0x40f587);}
  for(const object of [...this.markers.children]){this.markers.remove(object);if(object instanceof THREE.Mesh){object.geometry.dispose();(object.material as THREE.Material).dispose();}}
  for(const move of moves.filter(m=>m.from===selected)){
   const target=point(move.to),ring=mesh(new THREE.RingGeometry(.24,.30,32),new THREE.MeshBasicMaterial({color:0xf0d28b,side:THREE.DoubleSide,transparent:true,opacity:.9}),this.markers,target.x,.24,target.z);ring.rotation.x=-Math.PI/2;
   const dot=mesh(new THREE.CircleGeometry(.08,16),new THREE.MeshBasicMaterial({color:0xf0d28b,side:THREE.DoubleSide}),this.markers,target.x,.25,target.z);dot.rotation.x=-Math.PI/2;
  }
  if(selected){const p=point(selected),ring=mesh(new THREE.RingGeometry(.43,.47,8),new THREE.MeshBasicMaterial({color:0xf1d68e,side:THREE.DoubleSide}),this.markers,p.x,.24,p.z);ring.rotation.x=-Math.PI/2;ring.rotation.z=Math.PI/8;}
 }
 private animate=(time:number)=>{
  this.frame=requestAnimationFrame(this.animate);const dt=Math.min((time-this.lastTime)/1000,.05);this.lastTime=time;
  for(const obj of this.soldiers.values()){
   const u=obj.userData,distance=obj.position.distanceTo(u.target);obj.position.lerp(u.target,1-Math.exp(-dt*8));
   if(!this.reduced){u.body.position.y=distance>.03?Math.abs(Math.sin(time*.016))*.11:Math.sin(time*.002+u.phase)*.015;u.body.rotation.z=distance>.03?Math.sin(time*.012)*.07:Math.sin(time*.0015+u.phase)*.012;u.sword.rotation.x=distance>.03?Math.sin(time*.015)*.5:Math.sin(time*.002+u.phase)*.06;u.cape.rotation.x=-.12+Math.sin(time*.002+u.phase)*.045;}
  }
  this.dead=this.dead.filter(d=>{const t=(time-d.time)/600;if(t>1||this.reduced){retire(d.object);return false;}d.object.rotation.z=t*1.5;d.object.position.y=.2-t*.4;d.object.scale.setScalar(1-t);return true;});
  this.renderer.render(this.scene,this.camera);
 };
}
