
import * as THREE from 'three';
import { PathData } from './PathData';
import { SpatialGrid } from './SpatialGrid';

export class PathController {
    public pathData!: PathData;
    public pathCurve!: THREE.Curve<THREE.Vector3>; // Relaxed type

    private sampledPoints: { point: THREE.Vector3, t: number }[] = [];
    private spatialGrid: SpatialGrid<{ t: number }>;

    constructor(customCurve?: THREE.CurvePath<THREE.Vector3>) {
        this.spatialGrid = new SpatialGrid(20); // Cell size 20

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

        // Use getPointAt to ensure uniform distribution along the path (arc-length parameterization)
        // This prevents points from bunching up or being sparse on different curve types.

        this.sampledPoints = [];
        this.spatialGrid.clear(); // Clear grid before refilling

        for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const point = this.pathCurve.getPointAt(t);

            const item = { point: point, t: t };
            this.sampledPoints.push(item);

            // Add to Spatial Grid
            this.spatialGrid.add(point, { t: t });
        }

        console.log(`🛣️ PathController: Sampled ${this.sampledPoints.length} points using getPointAt.`);

        // Ensure pathData is also set if not already
        if (!this.pathData) {
            // If pathData was not set by createPath (e.g., customCurve was provided),
            // we can use the sampled points to initialize it.
            this.pathData = new PathData([this.sampledPoints.map(s => s.point)], true);
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
        // [OPTIMIZED] Spatial Grid Search (O(1))
        const nearbyItems = this.spatialGrid.getNearby(position);

        // Fallback to full search if grid returns nothing (e.g. player fell off map far away)
        // or if the grid cell size is too small and we are between cells (though 3x3 check handles this).
        const searchCandidates = nearbyItems.length > 0 ? nearbyItems : this.sampledPoints.map(p => ({ position: p.point, data: { t: p.t } }));

        let minDistanceSq = Infinity;
        let bestItem: { position: THREE.Vector3, data: { t: number } } | null = null;

        for (const item of searchCandidates) {
            const distSq = item.position.distanceToSquared(position);
            if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                bestItem = item;
            }
        }

        if (bestItem) {
            return { point: bestItem.position, t: bestItem.data.t };
        }

        // Should never happen if sampledPoints is not empty
        return this.sampledPoints[0];
    }
}
