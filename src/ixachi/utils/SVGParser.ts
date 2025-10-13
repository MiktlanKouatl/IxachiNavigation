// src/ixachi/utils/SVGParser.ts

import * as THREE from 'three';
import { SVGLoader, SVGResult, ShapePath } from 'three/examples/jsm/loaders/SVGLoader.js';

export class SVGParser {
    //

    constructor() {
        //
    }

    public parse(data: SVGResult): THREE.Vector3[][] {
        console.log("📄 [SVGParser] Datos SVG recibidos:", data);
        const allPathsPoints: THREE.Vector3[][] = [];
        
        // CORRECCIÓN: Usamos data.paths que es un array de ShapePath
        const paths: ShapePath[] = data.paths;
        console.log(`🔍 [SVGParser] Se encontraron ${paths.length} trazados (ShapePath) en el SVG.`);

        // Iteramos sobre cada ShapePath.
        for (let i = 0; i < paths.length; i++) {
            const path: ShapePath = paths[i];
            const currentPathPoints: THREE.Vector3[] = [];

            // Un ShapePath puede contener múltiples sub-trazados (agujeros, etc.).
            const subPaths = path.toShapes(true); // true para buscar sub-trazados.

            // Iteramos sobre cada forma generada desde el ShapePath.
            subPaths.forEach((shape) => {
                // Obtenemos los puntos de la forma principal.
                const shapePoints = shape.getPoints();
                shapePoints.forEach(point => {
                    currentPathPoints.push(new THREE.Vector3(point.x, point.y, 0));
                });
            });
            
            if (currentPathPoints.length > 0) {
                console.log(`✅ [SVGParser] Trazado ${i + 1} procesado con ${currentPathPoints.length} puntos.`);
                allPathsPoints.push(currentPathPoints);
            } else {
                console.warn(`⚠️ [SVGParser] El trazado ${i + 1} no generó puntos.`);
            }
        }

        if (allPathsPoints.length > 0) {
            console.log("🎉 [SVGParser] ¡Parseo completado! Centrando y escalando los trazados.");
            return this.centerAndScale(allPathsPoints, -40);
        } else {
            console.error("❌ [SVGParser] No se pudo extraer ningún trazado. Revisa el archivo SVG.");
            return [];
        }
    }
    
    // La función centerAndScale sigue siendo la misma.
    private centerAndScale(allPaths: THREE.Vector3[][], scale: number = 2): THREE.Vector3[][] {
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
        const maxDim = Math.max(size.x, size.y);
        const scaleFactor = scale / maxDim;

        return allPaths.map(path => 
            path.map(point => {
                return point.sub(center).multiplyScalar(scaleFactor);
            })
        );
    }
}