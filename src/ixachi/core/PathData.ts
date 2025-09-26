// src/ixachi/core/PathData.ts
import * as THREE from 'three';

/**
 * Contiene la información inmutable y compartible de una curva.
 * Actúa como un "plano" que múltiples seguidores pueden usar.
 */
export class PathData {
    public readonly curve: THREE.CatmullRomCurve3;
    public readonly totalLength: number;

    constructor(points: THREE.Vector3[], isClosedLoop: boolean = false) {
        if (points.length < 2) {
            throw new Error("PathData requiere al menos 2 puntos.");
        }
        this.curve = new THREE.CatmullRomCurve3(points, isClosedLoop, 'catmullrom', 0.5);
        this.totalLength = this.curve.getLength();
        console.log(`🌀 [PathData] Creado un nuevo camino con ${points.length} puntos y una longitud de ${this.totalLength.toFixed(2)}.`);
    }
}