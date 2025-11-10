// src/ixachi/core/PathData.ts
import * as THREE from 'three';

/**
 * Contiene la información inmutable y compartible de una o más curvas.
 * Actúa como un "plano" que múltiples seguidores pueden usar.
 */
export class PathData {
    public readonly curves: THREE.CatmullRomCurve3[];
    public readonly totalLength: number;

    constructor(paths: THREE.Vector3[][], isClosedLoop: boolean = false) {
        if (paths.length === 0 || paths.some(p => p.length < 2)) {
            throw new Error("PathData requiere al menos un camino con 2 o más puntos.");
        }

        this.curves = paths.map(points => new THREE.CatmullRomCurve3(points, isClosedLoop, 'catmullrom', 0.5));
        this.totalLength = this.curves.reduce((sum, curve) => sum + curve.getLength(), 0);

        console.log(`🌀 [PathData] Creado un nuevo PathData con ${this.curves.length} camino(s) y una longitud total de ${this.totalLength.toFixed(2)}.`);
    }
}