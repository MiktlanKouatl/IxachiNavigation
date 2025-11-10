// src/ixachi/utils/ModelPathExtractor.ts

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelPathExtractor {
    private loader: GLTFLoader;

    constructor() {
        this.loader = new GLTFLoader();
    }

    public async extractPaths(url: string, scale: number = 50): Promise<THREE.Vector3[][]> {
        return new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                console.log('✅ [ModelExtractor] Modelo GLB cargado:', gltf);
                const allPaths: THREE.Vector3[][] = [];

                // Recorremos la escena del GLTF para encontrar nuestras mallas de caminos
                gltf.scene.traverse((child) => {
                    console.log(`[Inspector] Objeto encontrado -> Nombre: "${child.name}", Tipo: "${child.type}"`);

                    // Buscamos objetos que sean Meshes y cuyo nombre comience con "Path"
                    // ¡Esta convención de nombres es clave! En Blender, nombra tus caminos "Path_01", "Path_02", etc.
                    if (child instanceof THREE.Mesh && child.name.startsWith('Path')) {
                        console.log(`🔍 [ModelExtractor] Encontrado el camino: ${child.name}`);
                        
                        const points: THREE.Vector3[] = [];
                        const positionAttribute = child.geometry.attributes.position;

                        // Extraemos los vértices del BufferAttribute
                        for (let i = 0; i < positionAttribute.count; i++) {
                            const vertex = new THREE.Vector3();
                            vertex.fromBufferAttribute(positionAttribute, i);
                            points.push(vertex);
                        }

                        if (points.length > 0) {
                            allPaths.push(points);
                        }
                    }
                });

                if (allPaths.length > 0) {
                    const centeredAndScaledPaths = this.centerAndScale(allPaths, scale);
                    resolve(centeredAndScaledPaths);
                } else {
                    console.error('❌ [ModelExtractor] No se encontraron objetos con el nombre "Path" en el archivo .glb');
                    reject('No se encontraron caminos válidos en el modelo.');
                }

            }, undefined, (error) => {
                console.error('❌ [ModelExtractor] Error al cargar el archivo .glb:', error);
                reject(error);
            });
        });
    }
    
    // Esta función es similar a la del SVGParser, para asegurar que el modelo esté centrado y escalado.
    private centerAndScale(allPaths: THREE.Vector3[][], scale: number): THREE.Vector3[][] {
        const boundingBox = new THREE.Box3();
        allPaths.forEach(path => {
            path.forEach(point => {
                boundingBox.expandByPoint(point);
            });
        });

        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = scale / maxDim;

        return allPaths.map(path => 
            path.map(point => {
                return point.sub(center).multiplyScalar(scaleFactor);
            })
        );
    }
}