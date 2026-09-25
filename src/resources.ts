import {Mesh, type Object3D, type Material, type BufferGeometry} from 'three';
/** Dispose owned mesh resources, preserving shared materials and their textures. */
export function disposeObject(root:Object3D, shared:ReadonlySet<Material>){
 const geometries=new Set<BufferGeometry>(),materials=new Set<Material>();
 root.traverse(object=>{if(object instanceof Mesh){geometries.add(object.geometry);for(const mat of Array.isArray(object.material)?object.material:[object.material])if(!shared.has(mat))materials.add(mat);}});
 geometries.forEach(geometry=>geometry.dispose());materials.forEach(mat=>mat.dispose());
}
