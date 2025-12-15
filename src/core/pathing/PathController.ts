
import * as THREE from 'three';
import { PathData } from './PathData';

export class PathController {
    public pathData!: PathData;
    public pathCurve!: THREE.Curve<THREE.Vector3>; // Relaxed type

    private sampledPoints: { point: THREE.Vector3, t: number }[] = [];

    constructor(customCurve?: THREE.CurvePath<THREE.Vector3>) {
        if (customCurve) {
            this.pathCurve = customCurve as unknown as THREE.CatmullRomCurve3;
        } else {
            this.createPath();
        }

        // Always sample points for efficient lookups
        this.samplePathPoints();
    }

    private createPath(): void {
        const pathPoints: THREE.Vector3[] = [
            new THREE.Vector3(-100, 0, 0),
            new THREE.Vector3(0, 0, 100),
            new THREE.Vector3(100, 0, 0),
            new THREE.Vector3(0, 0, -100),
        ];

        this.pathCurve = new THREE.CatmullRomCurve3(pathPoints, true, 'catmullrom', 0.5);
        // pathData is created in samplePathPoints now if needed, or we keep it for legacy
        // But let's keep the logic consistent.
        const divisions = 200;
        const points = this.pathCurve.getPoints(divisions);
        this.pathData = new PathData([points], true);
    }

    private samplePathPoints(): void {
        const divisions = 2000; // High resolution for accuracy
        const points = this.pathCurve.getPoints(divisions);

        console.log(`🛣️ PathController: Sampling path. Divisions: ${divisions}, Points: ${points.length}`);

        this.sampledPoints = [];
        for (let i = 0; i < points.length; i++) {
            // If points.length > divisions + 1, then t will be > 1.
            // We should normalize t based on the actual number of points.
            const t = i / (points.length - 1);
            this.sampledPoints.push({
                point: points[i],
                t: t
            });
        }

        // Ensure pathData is also set if not already
        if (!this.pathData) {
            this.pathData = new PathData([points], true);
        }
    }

    public getPathData(): PathData {
        return this.pathData;
    }

    public getCurve(): THREE.Curve<THREE.Vector3> {
        return this.pathCurve;
    }

    public getPointAt(t: number): THREE.Vector3 {
        // Handle wrapping for closed loops
        const wrappedT = (t % 1 + 1) % 1;
        return this.pathCurve.getPointAt(wrappedT);
    }

    public getTangentAt(t: number): THREE.Vector3 {
        const wrappedT = (t % 1 + 1) % 1;
        return this.pathCurve.getTangentAt(wrappedT);
    }

    public getClosestPoint(position: THREE.Vector3): { point: THREE.Vector3, t: number } {
        let minDistanceSq = Infinity;
        let closestIndex = -1;

        // 1. Coarse search through sampled points
        for (let i = 0; i < this.sampledPoints.length; i++) {
            const distSq = this.sampledPoints[i].point.distanceToSquared(position);
            if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                closestIndex = i;
            }
        }

        // 2. Fine-tune (optional, but good for smoothness)
        // For now, returning the sampled point is usually "good enough" if resolution is high (2000 points)
        // To make it perfectly smooth, we could project onto the line segment of neighbors.

        return this.sampledPoints[closestIndex];
    }
}
