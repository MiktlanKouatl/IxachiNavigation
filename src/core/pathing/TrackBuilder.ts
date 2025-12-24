import * as THREE from 'three';

export type TrackOperationType = 'straight' | 'turn' | 'ramp' | 'move' | 'section_trigger';

export interface TrackOperation {
    type: TrackOperationType;
    // Common
    id?: string;
    sectionId?: string; // For section_trigger
    // Straight / Ramp
    length?: number;
    heightChange?: number; // For Ramp and Turn (Helix)
    // Turn
    angle?: number; // Degrees. Positive = Left, Negative = Right (or vice versa, we'll define)
    radius?: number;
    roll?: number; // Banking angle in degrees. Positive = Bank Left, Negative = Bank Right
    // Move (Jump to position)
    position?: THREE.Vector3;
    direction?: THREE.Vector3;
    // Metadata
    particleSector?: string; // 'full', 'bed', 'roof', etc.
}

export interface SectionTrigger {
    id: string;
    progress: number; // 0.0 to 1.0
}

export class TrackBuilder {
    private operations: TrackOperation[] = [];
    private currentPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    private currentDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1); // Default forward -Z

    private startPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    private startDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);

    private calculatedTriggers: SectionTrigger[] = [];

    constructor() { }

    public setStart(position: THREE.Vector3, direction: THREE.Vector3): TrackBuilder {
        this.startPosition.copy(position);
        this.startDirection.copy(direction).normalize();
        return this;
    }

    public addOperation(op: TrackOperation): TrackBuilder {
        this.operations.push(op);
        return this;
    }

    public addSectionTrigger(sectionId: string): TrackBuilder {
        this.operations.push({ type: 'section_trigger', sectionId });
        return this;
    }

    public undo(): TrackBuilder {
        this.operations.pop();
        return this;
    }

    public clear(): TrackBuilder {
        this.operations = [];
        this.resetState();
        return this;
    }

    public getOperations(): TrackOperation[] {
        return [...this.operations];
    }

    public getSectionTriggers(): SectionTrigger[] {
        return this.calculatedTriggers;
    }

    private resetState() {
        this.currentPosition.copy(this.startPosition);
        this.currentDirection.copy(this.startDirection);
    }

    public build(): THREE.CurvePath<THREE.Vector3> {
        this.resetState();
        const curvePath = new THREE.CurvePath<THREE.Vector3>();
        this.calculatedTriggers = [];

        // Temporary storage for triggers with absolute length
        const tempTriggers: { id: string, length: number }[] = [];
        let currentLength = 0;

        for (const op of this.operations) {
            let addedCurve: THREE.Curve<THREE.Vector3> | null = null;

            switch (op.type) {
                case 'straight':
                    addedCurve = this.buildStraight(curvePath, op);
                    break;
                case 'turn':
                    addedCurve = this.buildTurn(curvePath, op);
                    break;
                case 'ramp':
                    addedCurve = this.buildRamp(curvePath, op);
                    break;
                case 'move':
                    if (op.position) this.currentPosition.copy(op.position);
                    if (op.direction) this.currentDirection.copy(op.direction).normalize();
                    break;
                case 'section_trigger':
                    if (op.sectionId) {
                        tempTriggers.push({ id: op.sectionId, length: currentLength });
                    }
                    break;
            }

            if (addedCurve) {
                currentLength += addedCurve.getLength();
            }
        }

        // Normalize triggers
        const totalLength = currentLength; // curvePath.getLength() should match this
        if (totalLength > 0) {
            this.calculatedTriggers = tempTriggers.map(t => ({
                id: t.id,
                progress: t.length / totalLength
            }));
        }

        return curvePath;
    }

    private buildStraight(path: THREE.CurvePath<THREE.Vector3>, op: TrackOperation): THREE.Curve<THREE.Vector3> {
        const length = op.length || 10;
        const start = this.currentPosition.clone();
        const end = this.currentPosition.clone().add(this.currentDirection.clone().multiplyScalar(length));

        const line = new THREE.LineCurve3(start, end);
        // @ts-ignore
        line.userData = op;
        path.add(line);

        // Update state
        this.currentPosition.copy(end);
        return line;
    }

    private buildRamp(path: THREE.CurvePath<THREE.Vector3>, op: TrackOperation): THREE.Curve<THREE.Vector3> {
        const length = op.length || 10;
        const height = op.heightChange || 0;

        const start = this.currentPosition.clone();

        // Horizontal displacement
        const displacement = this.currentDirection.clone().multiplyScalar(length);
        // Vertical displacement
        displacement.y += height;

        const end = start.clone().add(displacement);

        const line = new THREE.LineCurve3(start, end);
        // @ts-ignore
        line.userData = op;
        path.add(line);

        // Update state
        this.currentPosition.copy(end);
        // Direction technically changes in 3D, but for "slot car" logic on a map, 
        // we often keep the 2D projected direction or update the 3D one.

        // FOR VISUAL EDITOR STABILITY: Keep direction flat.
        // The ramp goes up, but the "Turtle" heading remains flat.
        // No change to currentDirection needed for a straight ramp!
        // It enters flat, it leaves flat (just higher).
        return line;
    }

    private buildTurn(path: THREE.CurvePath<THREE.Vector3>, op: TrackOperation): THREE.Curve<THREE.Vector3> {
        const angleDeg = op.angle || 90;
        const radius = op.radius || 20;
        const angleRad = THREE.MathUtils.DEG2RAD * angleDeg;

        // 1. Find the center of rotation
        // If angle is positive (Left Turn), center is to the Left.
        // Left vector = Up x Forward
        const up = new THREE.Vector3(0, 1, 0);
        // Forward = (0,0,-1). Up = (0,1,0). Right = (-1, 0, 0) -> Wait. (0,0,-1)x(0,1,0) = (1,0,0) which is +X (Right).
        // So Right is +X.

        const rightDir = new THREE.Vector3().crossVectors(this.currentDirection, up).normalize();
        const leftDir = rightDir.clone().negate();

        let centerToStartDir: THREE.Vector3;
        let turnCenter: THREE.Vector3;
        let isLeft = angleDeg > 0;

        if (isLeft) {
            // Center is to the Left
            centerToStartDir = rightDir.clone(); // Vector FROM Center TO Start
            turnCenter = this.currentPosition.clone().add(leftDir.clone().multiplyScalar(radius));
        } else {
            // Center is to the Right
            centerToStartDir = leftDir.clone(); // Vector FROM Center TO Start
            turnCenter = this.currentPosition.clone().add(rightDir.clone().multiplyScalar(radius));
        }

        // 2. Create the curve
        // Calculate start angle
        const startAngle = Math.atan2(centerToStartDir.z, centerToStartDir.x);

        let endAngle: number;
        let clockwise: boolean;

        if (isLeft) {
            endAngle = startAngle - Math.abs(angleRad);
            clockwise = true;
        } else {
            endAngle = startAngle + Math.abs(angleRad);
            clockwise = false;
        }

        const curve2D = new THREE.EllipseCurve(
            turnCenter.x, turnCenter.z, // ax, ay (Center X, Z)
            radius, radius,             // xRadius, yRadius
            startAngle, endAngle,       // aStartAngle, aEndAngle
            clockwise,                  // aClockwise
            0                           // aRotation
        );

        // Convert 2D points to 3D LineCurve or Spline
        // For now, let's sample it into a CatmullRomCurve3 to be safe and compatible with everything.
        const precisePoints = curve2D.getPoints(Math.max(5, Math.abs(angleDeg) / 5));

        // Apply height change linearly
        const heightChange = op.heightChange || 0;
        const totalPoints = precisePoints.length;

        const precisePoints3D = precisePoints.map((p, i) => {
            const progress = i / (totalPoints - 1);
            const y = this.currentPosition.y + (heightChange * progress);
            return new THREE.Vector3(p.x, y, p.y);
        });

        const arcCurve = new THREE.CatmullRomCurve3(precisePoints3D, false, 'catmullrom', 0.0); // tension 0 for straight lines? No.
        // @ts-ignore
        arcCurve.userData = op;

        path.add(arcCurve);

        // Update State
        const lastPoint = precisePoints3D[precisePoints3D.length - 1];
        this.currentPosition.copy(lastPoint);

        // Update Direction
        // Rotate the current direction by the angle
        const axis = new THREE.Vector3(0, 1, 0);
        this.currentDirection.applyAxisAngle(axis, angleRad);

        // If there was a height change, the direction vector also needs to pitch up/down?
        // FOR VISUAL EDITOR STABILITY: We DO NOT propagate pitch to the next segment.
        // The "Turtle" stays flat on the XZ plane, and height is just an offset.
        // This ensures that changing the height of one segment does not rotate the entire future track.

        /*
        if (heightChange !== 0) {
            const arcLength = Math.abs(angleRad * radius);
            const slopeAngle = Math.atan2(heightChange, arcLength);
            // Rotate around the Right vector (Cross product of Up and Dir)
            const right = new THREE.Vector3().crossVectors(this.currentDirection, new THREE.Vector3(0, 1, 0)).normalize();
            this.currentDirection.applyAxisAngle(right, slopeAngle);
        }
        */

        this.currentDirection.normalize();
        return arcCurve;
    }
}
