import * as THREE from 'three';
import { IAnimationChapter } from '../IAnimationChapter';
import { AnimationDirector } from '../AnimationDirector';
import { AnimationTargets } from '../AnimationTargets';
import { PlayerController } from '../../controls/PlayerController';
import { ChaseCameraController } from '../../controls/ChaseCameraController';
import { PathController } from '../../core/pathing/PathController';
import { TrackBuilder, TrackOperation } from '../../core/pathing/TrackBuilder';
import trackData from '../../data/tracks/track02.json';

export class FlowAssistTestChapter implements IAnimationChapter {
    private scene!: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private clock: THREE.Clock;

    // Controllers
    private playerController!: PlayerController;
    private cameraController!: ChaseCameraController;
    private pathController!: PathController;

    // Visuals
    private trackMesh!: THREE.Mesh;

    // Debug Visuals
    private pinkSphere!: THREE.Mesh;
    private orangeSphere!: THREE.Mesh;
    private yellowArrow!: THREE.ArrowHelper;

    // Optimization Temps
    private _tempDirToTarget = new THREE.Vector3();
    private _tempToPath = new THREE.Vector3();
    private _tempTangent = new THREE.Vector3();
    private _tempPerpForce = new THREE.Vector3();
    private _tempFlowForce = new THREE.Vector3();
    private _tempTotalForce = new THREE.Vector3();
    private _tempDisplacement = new THREE.Vector3();

    private isInitialized: boolean = false;

    constructor() {
        this.clock = new THREE.Clock();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.camera.position.set(0, 100, 100);
    }

    public async start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
        console.log('🧪 [FlowAssistTestChapter] Starting Testbed...');
        this.scene = targets.scene;
        this.scene.background = new THREE.Color(0x111111); // Dark grey background

        if (!this.isInitialized) {
            this.init(targets);
            this.isInitialized = true;
        }

        this.clock.start();
        return new Promise<void>(() => { }); // Run forever
    }

    public stop(targets: AnimationTargets): void {
        console.log('🛑 [FlowAssistTestChapter] Stopping...');
        this.scene.background = null;
        if (this.trackMesh) this.trackMesh.visible = false;
        // Cleanup if needed
    }

    public update(delta: number, time: number): void {
        if (!this.isInitialized) return;

        // Force fixed delta for consistent physics testing
        const chapterDelta = 0.016;

        this.playerController.update(chapterDelta);
        this.cameraController.update();

        // --- Flow Assist Logic (Testbed Version) ---
        const closest = this.pathController.getClosestPoint(this.playerController.position);
        if (closest) {
            // 1. Update Pink Sphere (Closest Point)
            if (this.pinkSphere) this.pinkSphere.position.copy(closest.point);

            // 2. Calculate Target (Carrot)
            // Tuning: LookAhead
            const lookAheadDistance = 0.015;

            // Bi-directional support
            // Calculate forward direction relative to path tangent
            const tangent = this.pathController.getTangentAt(closest.t).normalize();
            const forwardDot = this.playerController.velocity.clone().normalize().dot(tangent);
            const direction = forwardDot < 0 ? -1 : 1;

            const targetT = (closest.t + (lookAheadDistance * direction) + 1) % 1;
            const targetPoint = this.pathController.getPointAt(targetT);

            if (this.orangeSphere) this.orangeSphere.position.copy(targetPoint);

            // 3. Rotation Assist - STEP 3 ACTIVE
            this._tempDirToTarget.subVectors(targetPoint, this.playerController.position).normalize();
            if (this.yellowArrow) {
                this.yellowArrow.position.copy(this.playerController.position);
                this.yellowArrow.setDirection(this._tempDirToTarget);
            }

            this._tempToPath.subVectors(closest.point, this.playerController.position);
            const distToPath = this._tempToPath.length();

            // Assist Range - INCREASED for stability testing
            // Was 2.0, which is too strict if the player drifts slightly.
            if (distToPath < 15.0) {
                this.playerController.rotateTowards(this._tempDirToTarget, chapterDelta);
            }

            // 4. Forces (Flow Only) - STEP 5 ACTIVE
            // We are SKIPPING Attraction (Perpendicular Force) for now as per user request.
            if (distToPath > 0.5 && distToPath < 50.0) {
                this._tempTangent.copy(tangent);

                /* SKIPPING ATTRACTION
                // Project toPath onto plane perpendicular to tangent
                const dot = this._tempToPath.dot(this._tempTangent);
                this._tempPerpForce.copy(this._tempTangent).multiplyScalar(dot);
                this._tempPerpForce.subVectors(this._tempToPath, this._tempPerpForce);
                const attractionStrength = 5.0; 
                this._tempTotalForce.copy(this._tempPerpForce).normalize().multiplyScalar(distToPath * attractionStrength);
                */

                // Reset Total Force since we skipped attraction
                this._tempTotalForce.set(0, 0, 0);

                // Flow Strength (Forward Push)
                const flowStrength = 2.0;
                this._tempFlowForce.copy(this._tempTangent).multiplyScalar(flowStrength * direction);

                // Add Flow
                this._tempTotalForce.add(this._tempFlowForce);

                // Clamp
                const maxForce = 10.0;
                if (this._tempTotalForce.lengthSq() > maxForce * maxForce) {
                    this._tempTotalForce.normalize().multiplyScalar(maxForce);
                }

                this._tempDisplacement.copy(this._tempTotalForce).multiplyScalar(chapterDelta);
                this.playerController.position.add(this._tempDisplacement);
            }
        }
    }

    public getCamera(): THREE.Camera | null {
        return this.camera;
    }

    private init(targets: AnimationTargets): void {
        // Track
        const trackBuilder = new TrackBuilder();
        (trackData as TrackOperation[]).forEach(op => trackBuilder.addOperation(op));
        const trackPath = trackBuilder.build();
        const operations = trackBuilder.getOperations();

        // Controllers
        this.playerController = new PlayerController();
        this.cameraController = new ChaseCameraController(this.camera, this.playerController);
        this.pathController = new PathController(trackPath);

        // Visuals
        this.buildTrackVisuals(trackPath, operations);
        this.initDebugVisuals();
    }

    private initDebugVisuals(): void {
        this.pinkSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
        this.scene.add(this.pinkSphere);

        this.orangeSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
        this.scene.add(this.orangeSphere);

        this.yellowArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 5, 0xffff00);
        this.scene.add(this.yellowArrow);
    }

    private buildTrackVisuals(trackPath: any, operations: any[]): void {
        // ... Copied minimal visual logic ...
        // For testbed, just a simple tube or line is enough, but let's reuse the wireframe logic
        // Actually, let's just use a simple TubeGeometry for speed if possible, or copy the logic.
        // Copying logic for consistency with main chapter.

        const allPositions: number[] = [];
        const allIndices: number[] = [];
        let vertexOffset = 0;
        const curves = trackPath.curves;
        const roadWidth = 12;

        const addSegmentMesh = (curve: THREE.Curve<THREE.Vector3>, op: TrackOperation) => {
            const divisions = Math.max(2, Math.floor(curve.getLength() / 2));
            const points = curve.getPoints(divisions);
            const frenetFrames = curve.computeFrenetFrames(divisions, false);
            const rollRad = THREE.MathUtils.DEG2RAD * (op.roll || 0);
            const halfWidth = roadWidth / 2;

            for (let i = 0; i <= divisions; i++) {
                const point = points[i];
                const tangent = frenetFrames.tangents[i];
                const normal = frenetFrames.normals[i];
                const binormal = frenetFrames.binormals[i];
                const axis = tangent.clone().normalize();
                const rotatedBinormal = binormal.clone().applyAxisAngle(axis, rollRad);
                const left = point.clone().add(rotatedBinormal.clone().multiplyScalar(-halfWidth));
                const right = point.clone().add(rotatedBinormal.clone().multiplyScalar(halfWidth));

                allPositions.push(left.x, left.y, left.z);
                allPositions.push(right.x, right.y, right.z);

                if (i < divisions) {
                    const a = vertexOffset + i * 2;
                    const b = vertexOffset + i * 2 + 1;
                    const c = vertexOffset + (i + 1) * 2;
                    const d = vertexOffset + (i + 1) * 2 + 1;
                    allIndices.push(a, b, d);
                    allIndices.push(a, d, c);
                }
            }
            vertexOffset += (divisions + 1) * 2;
        };

        for (let i = 0; i < curves.length; i++) {
            addSegmentMesh(curves[i], operations[i] || {});
        }

        if (allPositions.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
            geometry.setIndex(allIndices);

            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.2
            });

            this.trackMesh = new THREE.Mesh(geometry, material);
            this.scene.add(this.trackMesh);
        }
    }
}
