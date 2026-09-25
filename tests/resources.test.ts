import {expect,test} from 'bun:test';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {disposeObject} from '../src/resources';
test('retiring a soldier disposes its geometry and unique materials once, preserving shared armor',()=>{
 const root=new Group(),geometry=new BoxGeometry(),shared=new MeshBasicMaterial(),unique=new MeshBasicMaterial();
 root.add(new Mesh(geometry,shared),new Mesh(geometry,unique));
 let geometries=0,materials=0,sharedDisposals=0;
 geometry.addEventListener('dispose',()=>geometries++);unique.addEventListener('dispose',()=>materials++);shared.addEventListener('dispose',()=>sharedDisposals++);
 disposeObject(root,new Set([shared]));expect(geometries).toBe(1);expect(materials).toBe(1);expect(sharedDisposals).toBe(0);
});
