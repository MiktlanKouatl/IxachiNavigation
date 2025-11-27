
import * as THREE from 'three';
import { PathData } from './PathData';

export class PathController {
    public pathData: PathData;
    public pathCurve: THREE.Curve<THREE.Vector3>; // Relaxed type

    constructor(customCurve?: THREE.CurvePath<THREE.Vector3>) {
        if (customCurve) {
            this.pathCurve = customCurve as THREE.CatmullRomCurve3; // Cast or handle generic CurvePath
            // Note: CurvePath doesn't have all CatmullRom methods, but usually we just need getPointAt.
            // If we strictly need CatmullRom, we might need to sample the custom curve into points and create one.
            // For now, let's assume the custom curve is compatible or we wrap it.

            // Actually, TrackBuilder returns CurvePath.
            // PathController expects CatmullRomCurve3 in the type definition above (line 7).
            // We should relax the type to THREE.Curve<THREE.Vector3> or CurvePath.
        } else {
            this.createPath();
        }

        // If we passed a custom curve, we need to init pathData
        if (customCurve) {
            const divisions = 2000; // Higher res for long tracks
            const points = this.pathCurve.getPoints(divisions);
            this.pathData = new PathData([points], true);
        }
    }

    private createPath(): void {
        const pathPoints: THREE.Vector3[] = [
            new THREE.Vector3(-100, 0, 0),
            new THREE.Vector3(0, 0, 100),
            new THREE.Vector3(100, 0, 0),
            new THREE.Vector3(0, 0, -100),
        ];

        this.pathCurve = new THREE.CatmullRomCurve3(pathPoints, true, 'catmullrom', 0.5);
        const divisions = 200;
        const points = this.pathCurve.getPoints(divisions);
        this.pathData = new PathData([points], true);
    }

    public getPathData(): PathData {
        return this.pathData;
    }

    public getCurve(): THREE.Curve<THREE.Vector3> {
        return this.pathCurve;
    }

    public getPointAt(t: number): THREE.Vector3 {
        return this.pathCurve.getPointAt(t);
    }

    public getTangentAt(t: number): THREE.Vector3 {
        return this.pathCurve.getTangentAt(t);
    }
}
