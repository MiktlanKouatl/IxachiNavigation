
import * as THREE from 'three';
import { PathData } from './PathData';

export class PathController {
    public pathData: PathData;
    public pathCurve: THREE.CatmullRomCurve3;

    constructor() {
        this.createPath();
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

    public getCurve(): THREE.CatmullRomCurve3 {
        return this.pathCurve;
    }

    public getPointAt(t: number): THREE.Vector3 {
        return this.pathCurve.getPointAt(t);
    }

    public getTangentAt(t: number): THREE.Vector3 {
        return this.pathCurve.getTangentAt(t);
    }
}
