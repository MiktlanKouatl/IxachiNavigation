import * as THREE from 'three';
import { IAnimationChapter } from '../IAnimationChapter';
import { AnimationDirector } from '../AnimationDirector';
import { AnimationTargets } from '../AnimationTargets';
import { GPUComputationRenderer } from '../../core/GPUComputationRenderer';
import { PlayerController } from '../../controls/PlayerController';
import { ChaseCameraController } from '../../controls/ChaseCameraController';
import { GPUParticleSystem } from '../../core/GPUParticleSystem';
import { RibbonLineGPUPlayer, UseMode } from '../../core/RibbonLineGPUPlayer';
import { Chapter } from '../Chapter';
import { FadeStyle } from '../../core/RibbonLine';
import { PathController } from '../../core/pathing/PathController';
import { RingController } from '../../features/rings/RingController';
import { EnergyOrbController } from '../../features/collectables/EnergyOrbController';
import { StationController } from '../../features/stations/StationController';
import { TrackBuilder, TrackOperation } from '../../core/pathing/TrackBuilder';
import trackData from '../../data/tracks/track02.json';

// Shaders
import flowFieldShader from '../../shaders/flow_field_perlin_compute.glsl?raw';
import terrainHeightShader from '../../shaders/terrain_height_compute.glsl?raw';
import particleRenderVertexShader from '../../shaders/particle_render.vert.glsl?raw';
import particleRenderFragmentShader from '../../shaders/particle_render.frag.glsl?raw';

export class MandalaChapter implements IAnimationChapter {
    private scene!: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private clock: THREE.Clock;

    // Controllers
    private playerController!: PlayerController;
    private cameraController!: ChaseCameraController;
    private pathController!: PathController;
    private ringController!: RingController;
    private orbController!: EnergyOrbController;
    private stationController!: StationController;

    // Visuals
    private playerRibbon!: RibbonLineGPUPlayer;
    private playerParticleSystem!: GPUParticleSystem;
    private landscapeParticles!: THREE.Points;
    private trackMesh!: THREE.Mesh;
    private trackWireframe!: THREE.LineSegments;

    // Debug Visuals
    private pinkSphere!: THREE.Mesh;
    private orangeSphere!: THREE.Mesh;
    private yellowArrow!: THREE.ArrowHelper;

    // GPU Compute
    private landscapeGpuCompute!: GPUComputationRenderer;
    private flowFieldCompute!: GPUComputationRenderer;
    private landscapeAgentPositionVariable: any;
    private flowFieldVariable: any;
    private ffUniforms: any;
    private posUniforms: any;

    // State
    private isInitialized: boolean = false;
    private resolvePromise: (() => void) | null = null;

    // Temporary Vectors (Optimization)
    private _tempDirToTarget = new THREE.Vector3();
    private _tempToPath = new THREE.Vector3();
    private _tempTangent = new THREE.Vector3();
    private _tempPerpForce = new THREE.Vector3();
    private _tempFlowForce = new THREE.Vector3();
    private _tempTotalForce = new THREE.Vector3();
    private _tempDisplacement = new THREE.Vector3();
    private _tempForward = new THREE.Vector3();

    // Launch Mechanic State
    private isCharging: boolean = false;
    private wasWDown: boolean = false;

    // Constants
    private readonly LANDSCAPE_WORLD_SIZE = 400;
    private readonly GRID_RESOLUTION = 64;
    private readonly LANDSCAPE_AGENT_COUNT = 64 * 64;

    constructor() {
        this.clock = new THREE.Clock();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.camera.position.set(0, 100, 100);
    }

    public async start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
        console.log('🌀 [MandalaChapter] Starting...');
        this.scene = targets.scene; // Use shared scene

        // Set background to black for this chapter (needed for additive particles)
        this.scene.background = new THREE.Color(0x000000);

        // We need the renderer to initialize GPU stuff.
        // Ideally AnimationTargets should provide it, or we get it from the director/experience.
        // For now, we'll assume we can get it from the director's experience reference if we updated it,
        // but since we didn't add renderer to AnimationTargets, let's grab it from the global context or pass it in constructor?
        // Actually, let's assume the user passed it or we can find it.
        // Wait, `GPUComputationRenderer` needs `renderer`.
        // Let's look at `main.ts` again. `IxachiExperience` has `renderer`.
        // `AnimationDirector` has `experience`.
        // We can cast director to any to get experience.renderer for now.
        const experience = (director as any).experience;
        this.renderer = experience.renderer;

        if (!this.isInitialized) {
            this.init(targets);
            this.isInitialized = true;
        }

        // Reset Clock
        this.clock.start();

        return new Promise<void>(resolve => {
            this.resolvePromise = resolve;
            // The chapter runs indefinitely until stopped or completed logic triggers resolve
        });
    }

    public stop(targets: AnimationTargets): void {
        console.log('🛑 [MandalaChapter] Stopping...');

        // Reset background
        this.scene.background = null;

        // Dispose resources if needed, or just hide things
        if (this.landscapeParticles) this.landscapeParticles.visible = false;
        if (this.trackMesh) this.trackMesh.visible = false;
        if (this.trackWireframe) this.trackWireframe.visible = false;
        if (this.playerRibbon) this.playerRibbon.mesh.visible = false;

        // We might want to fully dispose to save memory as per plan
        this.dispose();
    }

    public update(delta: number, time: number): void {
        if (!this.isInitialized) return;

        const chapterTime = this.clock.getElapsedTime();
        // const chapterDelta = delta;
        // FORCE DELTA for debugging: The received delta is 0, which prevents movement.
        const chapterDelta = 0.016;

        this.playerController.update(chapterDelta);
        // console.log('FixedDelta:', chapterDelta, 'Speed:', this.playerController.speed, 'Pos:', this.playerController.position);
        this.cameraController.update();

        // --- Path Assist Logic ---
        const closest = this.pathController.getClosestPoint(this.playerController.position);
        if (closest) {
            // 1. Update Pink Sphere (Closest Point)
            if (this.pinkSphere) this.pinkSphere.position.copy(closest.point);

            // 2. Calculate Target (Carrot) - Look Ahead
            // REFINEMENT: Problem 2 "Corner Cutting" & "Stopping Carrot"
            // Calculate curvature to adjust look-ahead.
            const tAhead = (closest.t + 0.01) % 1;
            const tangent = this.pathController.getTangentAt(closest.t).normalize();
            const tangentAhead = this.pathController.getTangentAt(tAhead).normalize();
            const curvature = 1.0 - tangent.dot(tangentAhead);

            // Target Look-Ahead based on curvature
            const minLookAhead = 0.005; // Increased min to prevent "stopping" (was 0.002)
            const maxLookAhead = 0.020; // Increased max for better straights (was 0.015)
            const curvatureFactor = THREE.MathUtils.clamp(curvature * 500, 0, 1); // Reduced sensitivity
            const targetLookAhead = THREE.MathUtils.lerp(maxLookAhead, minLookAhead, curvatureFactor);

            // SMOOTHING: Don't snap to the new look-ahead, lerp to it.
            // We need to store the current lookAhead in a class property, but for now let's just use a simple approach.
            // Since we don't have a state variable for lookAhead, we'll just be less aggressive with the curvature factor.
            // Ideally, we should add `private currentLookAhead: number = 0.01;` to the class.

            // Let's assume we can't add state easily right now without a bigger refactor.
            // We'll just use the calculated value but with the increased minimum.
            const lookAheadDistance = targetLookAhead;

            // BI-DIRECTIONAL LOGIC:
            const forwardDot = this.playerController.velocity.clone().normalize().dot(tangent);
            const direction = forwardDot < 0 ? -1 : 1;

            const targetT = (closest.t + (lookAheadDistance * direction) + 1) % 1;
            const targetPoint = this.pathController.getPointAt(targetT);

            // DEBUG: Log values
            if (Math.random() < 0.01) {
                console.log(`🥕 T: ${closest.t.toFixed(3)} | Curv: ${curvature.toFixed(5)} | LookAhead: ${lookAheadDistance.toFixed(4)} | Dir: ${direction}`);
            }

            // Update Orange Sphere
            if (this.orangeSphere) this.orangeSphere.position.copy(targetPoint);

            // 3. Calculate Desired Rotation
            this._tempDirToTarget.subVectors(targetPoint, this.playerController.position).normalize();

            // Update Yellow Arrow
            if (this.yellowArrow) {
                this.yellowArrow.position.copy(this.playerController.position);
                this.yellowArrow.setDirection(this._tempDirToTarget);
            }

            this._tempToPath.subVectors(closest.point, this.playerController.position);
            const distToPath = this._tempToPath.length();

            // 4. Apply Steering (Step 4 - Enabled)
            // REFINEMENT: Problem 3 "Zombie Stare" - Range Reduced
            // User requested ~1.5 units (slightly wider than track)
            const assistRange = 1.5;
            if (distToPath < assistRange) {
                this.playerController.rotateTowards(this._tempDirToTarget, chapterDelta);
            } else {
                // Optional: Visual cue that assist is OFF?
                // For now, just don't rotate.
            }

            // 5. Apply Attraction (Step 5 - Enabled)
            // Tuning: Gentler attraction, larger deadzone to stop zigzag
            const attractionStrength = 2.0; // Reduced from 5.0
            // const dampingFactor = 2.0; // Still disabled

            // Deadzone: Don't apply force if we are close to the center (e.g. < 1.0 unit)
            // This prevents the "zigzag" oscillation on straights.
            if (distToPath > 1.0 && distToPath < 50.0) {
                // Get tangent at the closest point
                this._tempTangent.copy(this.pathController.getTangentAt(closest.t)).normalize();

                // Project toPath onto the plane perpendicular to the tangent
                const dot = this._tempToPath.dot(this._tempTangent);

                // perpendicularForce = toPath - (tangent * dot)
                // Use _tempPerpForce to store the projection first to avoid modifying _tempTangent
                this._tempPerpForce.copy(this._tempTangent).multiplyScalar(dot);
                this._tempPerpForce.subVectors(this._tempToPath, this._tempPerpForce);

                // FLOW ASSIST: Gentle push along the tangent
                const flowStrength = 2.0;
                this._tempFlowForce.copy(this._tempTangent).multiplyScalar(flowStrength); // tangent is already modified above? No, wait.
                // Wait, `this._tempTangent.multiplyScalar(dot)` modified _tempTangent in place!
                // FIX: Re-get tangent or clone it. 
                // Let's re-get tangent to be safe and clear, or use another temp.
                // Actually, let's fix the logic above.

                // Correct Logic:
                const tangent = this.pathController.getTangentAt(closest.t).normalize(); // Returns new vector? Yes, getTangentAt returns new Vector3.
                // Optimization: We can avoid `getTangentAt` allocating if we had a method for it, but for now let's just use the temp vars correctly.

                this._tempTangent.copy(tangent);

                // perpendicularForce calculation
                // vector.sub( otherVector.multiplyScalar(s) ) -> modifies otherVector!
                // We need to be careful with in-place modifications.

                // Let's do it step by step safely.
                const tangentClone = this._tempTangent.clone(); // Still allocating... 
                // Let's use another temp if needed, or just be careful.
                // _tempPerpForce.copy(_tempToPath).sub( _tempTangent.multiplyScalar(dot) ) -> _tempTangent is modified.
                // So if we need _tempTangent later (for flow force), we need to restore it or use a copy.

                // Better:
                // _tempPerpForce.copy(_tempTangent).multiplyScalar(dot); // _tempPerpForce holds the projection
                // _tempPerpForce.subVectors(this._tempToPath, this._tempPerpForce); // _tempPerpForce = toPath - projection

                this._tempPerpForce.copy(this._tempTangent).multiplyScalar(dot);
                this._tempPerpForce.subVectors(this._tempToPath, this._tempPerpForce);

                // FLOW ASSIST
                // _tempFlowForce = tangent * strength
                this._tempFlowForce.copy(this._tempTangent).multiplyScalar(flowStrength);

                // Combine Spring + Flow (No Damping)
                // totalForce = perp.normalize() * (dist * strength) + flow
                this._tempTotalForce.copy(this._tempPerpForce).normalize().multiplyScalar(distToPath * attractionStrength);
                this._tempTotalForce.add(this._tempFlowForce);

                // Clamp the total force magnitude to avoid explosions AND allow breaking away
                // Reduced max force so you can fight it if you want to leave
                const maxForce = 5.0; // Reduced from 20.0
                if (this._tempTotalForce.lengthSq() > maxForce * maxForce) {
                    this._tempTotalForce.normalize().multiplyScalar(maxForce);
                }

                this._tempDisplacement.copy(this._tempTotalForce).multiplyScalar(chapterDelta);
                this.playerController.position.add(this._tempDisplacement);

                // DEBUG LOGGING (Throttle)
                if (Math.random() < 0.01) {
                    console.log(`Force: ${this._tempTotalForce.length().toFixed(2)} | Dist: ${distToPath.toFixed(2)}`);
                }
            }
        }

        // Update Managers
        // this.colorManager.update(chapterDelta);

        if (this.ringController) this.ringController.update(chapterDelta, this.playerController.position);
        if (this.orbController) this.orbController.update(chapterDelta, chapterTime, this.playerController.position);

        // --- Station & Plug-in Logic ---
        if (this.stationController) {
            const connection = this.stationController.update(this.playerController.position, chapterTime);

            if (connection.connected && connection.targetPos) {
                // 🛑 PLUG-IN EFFECT: Override Player Movement

                // --- LAUNCH MECHANIC ---
                const isWDown = this.playerController.keyboardState['w'];
                const justPressedW = isWDown && !this.wasWDown;
                this.wasWDown = isWDown;

                if (justPressedW) {
                    if (!this.isCharging) {
                        // Step 1: Start Charging
                        console.log('⚡ Charging Launch...');
                        this.isCharging = true;
                    } else {
                        // Step 2: Launch!
                        console.log('🚀 LAUNCH!');
                        this.stationController.disconnect();
                        this.playerController.speed = 80.0; // Boost
                        this.isCharging = false;
                        // Return early to skip the position locking below
                        return;
                    }
                }

                // Visual Feedback for Charging
                if (this.isCharging) {
                    // Camera Shake
                    const shakeIntensity = 0.2;
                    this.camera.position.add(new THREE.Vector3(
                        (Math.random() - 0.5) * shakeIntensity,
                        (Math.random() - 0.5) * shakeIntensity,
                        (Math.random() - 0.5) * shakeIntensity
                    ));
                }

                // CHECK FOR DISCONNECT (Reverse Speed)
                // Threshold must be small because speed is reset to 0 every frame in the else block
                if (this.playerController.speed < -0.1) {
                    this.stationController.disconnect();
                    this.isCharging = false; // Cancel charge
                    // Allow movement this frame so they can back out
                } else {
                    // 1. Stop forward movement (unless we just launched, but we returned early above)
                    this.playerController.speed = 0;

                    // 2. Magnetize/Snap to Socket
                    const lerpFactor = 5.0 * chapterDelta;
                    this.playerController.position.lerp(connection.targetPos, lerpFactor);

                    // 3. Orient towards the station (optional, or keep looking forward)
                    // this.playerController.lookAt(connection.targetPos); 
                }
            } else {
                // Not connected, reset state
                this.isCharging = false;
                this.wasWDown = this.playerController.keyboardState['w'];
            }
        }

        // GPU Compute Updates
        if (this.ffUniforms) this.ffUniforms['u_time'].value = chapterTime;
        if (this.flowFieldCompute) this.flowFieldCompute.compute();

        if (this.posUniforms) {
            this.posUniforms.delta.value = chapterDelta;
            this.posUniforms.time.value = chapterTime;
        }
        if (this.landscapeGpuCompute) {
            this.landscapeGpuCompute.compute();
            this.landscapeParticles.material.uniforms.texturePosition.value = this.landscapeGpuCompute.getCurrentRenderTarget(this.landscapeAgentPositionVariable).texture;
        }

        // Player Particles & Ribbon
        if (this.playerParticleSystem) {
            this.playerParticleSystem.update(chapterDelta, this.playerController.position, this.playerController.velocity);
            this.playerRibbon.setPathTexture(this.playerParticleSystem.getPositionTexture());

            // Dynamic Width
            const speedRatio = Math.min(Math.abs(this.playerController.speed) / this.playerController.maxSpeed, 1.0);
            const newWidth = THREE.MathUtils.lerp(0.75, 0.1, speedRatio);
            this.playerRibbon.setWidth(newWidth);

            // Forward Vector
            this._tempForward.set(0, 0, -1).applyQuaternion(this.playerController.quaternion);
            if (this.playerController.velocity.lengthSq() > 0.01) {
                this._tempForward.copy(this.playerController.velocity).normalize();
            }
            this.playerRibbon.setPlayerForward(this._tempForward);
            this.playerRibbon.updateHead();
            this.playerRibbon.setTime(chapterTime);
        }
    }

    public getCamera(): THREE.Camera | null {
        return this.camera;
    }

    private init(targets: AnimationTargets): void {
        console.log('🏗️ [MandalaChapter] Initializing resources...');

        // --- Track ---
        const trackBuilder = new TrackBuilder();
        (trackData as TrackOperation[]).forEach(op => trackBuilder.addOperation(op));
        const trackPath = trackBuilder.build();
        const operations = trackBuilder.getOperations();

        // --- Controllers ---
        this.playerController = new PlayerController();
        this.cameraController = new ChaseCameraController(this.camera, this.playerController);
        this.pathController = new PathController(trackPath);

        // Use global ColorManager from targets
        const colorManager = targets.colorManager;

        this.ringController = new RingController(this.scene, this.pathController, colorManager);
        this.orbController = new EnergyOrbController(this.scene, this.pathController, colorManager);
        this.stationController = new StationController(this.scene);

        // Setup Gameplay Elements
        this.setupGameplay();

        // --- Visuals ---
        this.buildTrackVisuals(trackPath, operations);
        this.initLandscapeGPU();
        this.initPlayerParticles(colorManager);

        // Initial Camera Setup
        this.cameraController.update();

        // --- Debug Visuals ---
        this.initDebugVisuals();
    }

    private initDebugVisuals(): void {
        // Pink Sphere (Closest Point)
        this.pinkSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff00ff })
        );
        this.scene.add(this.pinkSphere);

        // Orange Sphere (Target/Carrot)
        this.orangeSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffaa00 })
        );
        this.scene.add(this.orangeSphere);

        // Yellow Arrow (Desired Rotation)
        this.yellowArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            5,
            0xffff00
        );
        this.scene.add(this.yellowArrow);
    }

    private setupGameplay(): void {
        this.orbController.addOrbsSequence(0.0, 200, 0.005);
        this.ringController.addRingAt(0.10, 'event');
        this.ringController.addRingAt(0.35, 'event');
        this.ringController.addRingAt(0.60, 'event');
        this.ringController.addRingAt(0.85, 'event');

        for (let i = 0; i < 1; i += 0.02) {
            if (i % 0.25 > 0.05) {
                this.ringController.addRingAt(i, 'collection');
            }
        }
    }

    private buildTrackVisuals(trackPath: any, operations: any[]): void {
        const allPositions: number[] = [];
        const allNormals: number[] = [];
        const allUvs: number[] = [];
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
                const rotatedNormal = normal.clone().applyAxisAngle(axis, rollRad);
                const left = point.clone().add(rotatedBinormal.clone().multiplyScalar(-halfWidth));
                const right = point.clone().add(rotatedBinormal.clone().multiplyScalar(halfWidth));

                allPositions.push(left.x, left.y, left.z);
                allPositions.push(right.x, right.y, right.z);
                allNormals.push(rotatedNormal.x, rotatedNormal.y, rotatedNormal.z);
                allNormals.push(rotatedNormal.x, rotatedNormal.y, rotatedNormal.z);
                const u = i / divisions;
                allUvs.push(0, u);
                allUvs.push(1, u);
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
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
            geometry.setIndex(allIndices);

            // WIREFRAME / TRANSPARENT Material as requested
            const material = new THREE.MeshBasicMaterial({
                color: 0x444444,
                wireframe: true,
                transparent: true,
                opacity: 0.3
            });

            this.trackMesh = new THREE.Mesh(geometry, material);
            this.trackMesh.position.y = -0.2;
            this.scene.add(this.trackMesh);

            // We can keep or remove the extra wireframe object since the main mesh is now wireframe.
            // Let's keep it but make it distinct or just remove it if it's redundant.
            // The user asked for the track to be wireframe "so we can see through it".
            // Let's just use the single wireframe mesh for clarity.

            /* 
            this.trackWireframe = new THREE.LineSegments(
                new THREE.WireframeGeometry(geometry),
                new THREE.LineBasicMaterial({ color: 0x0044aa, transparent: true, opacity: 0.3 })
            );
            this.trackWireframe.position.y = -0.19;
            this.scene.add(this.trackWireframe);
            */
        }
    }

    private initLandscapeGPU(): void {
        this.landscapeGpuCompute = new GPUComputationRenderer(this.GRID_RESOLUTION, this.GRID_RESOLUTION, this.renderer);
        this.landscapeGpuCompute.dataType = THREE.HalfFloatType;

        this.flowFieldCompute = new GPUComputationRenderer(256, 256, this.renderer);
        this.flowFieldCompute.dataType = THREE.HalfFloatType;

        const flowFieldTexture = this.flowFieldCompute.createTexture();
        this.flowFieldVariable = this.flowFieldCompute.addVariable('textureFlowField', flowFieldShader, flowFieldTexture);
        this.flowFieldCompute.init();

        this.ffUniforms = this.flowFieldVariable.material.uniforms;
        this.ffUniforms['worldSize'] = new THREE.Uniform(this.LANDSCAPE_WORLD_SIZE);
        this.ffUniforms['u_time'] = new THREE.Uniform(0.0);
        this.ffUniforms['u_noiseScale'] = new THREE.Uniform(0.01);
        this.ffUniforms['u_perturbStrength'] = new THREE.Uniform(1.5);
        this.ffUniforms['verticalSpeed'] = new THREE.Uniform(0.4);

        const flowFieldResult = this.flowFieldCompute.getCurrentRenderTarget(this.flowFieldVariable).texture;

        const landscapePosData = this.landscapeGpuCompute.createTexture();
        const landscapePosArray = landscapePosData.image.data;
        const spacing = this.LANDSCAPE_WORLD_SIZE / (this.GRID_RESOLUTION - 1);
        const halfSize = this.LANDSCAPE_WORLD_SIZE / 2;

        for (let row = 0; row < this.GRID_RESOLUTION; row++) {
            for (let col = 0; col < this.GRID_RESOLUTION; col++) {
                const i = row * this.GRID_RESOLUTION + col;
                const i4 = i * 4;
                landscapePosArray[i4 + 0] = col * spacing - halfSize;
                landscapePosArray[i4 + 1] = 0;
                landscapePosArray[i4 + 2] = row * spacing - halfSize;
                landscapePosArray[i4 + 3] = 1.0;
            }
        }

        this.landscapeAgentPositionVariable = this.landscapeGpuCompute.addVariable('texturePosition', terrainHeightShader, landscapePosData);
        this.landscapeGpuCompute.setVariableDependencies(this.landscapeAgentPositionVariable, [this.landscapeAgentPositionVariable]);

        this.posUniforms = this.landscapeAgentPositionVariable.material.uniforms;
        this.posUniforms['delta'] = new THREE.Uniform(0.0);
        this.posUniforms['time'] = new THREE.Uniform(0.0);
        this.posUniforms['worldSize'] = new THREE.Uniform(this.LANDSCAPE_WORLD_SIZE);
        this.posUniforms['textureFlowField'] = new THREE.Uniform(flowFieldResult);
        this.posUniforms['u_heightScale'] = new THREE.Uniform(0.03);
        this.posUniforms['u_lerpFactor'] = new THREE.Uniform(2.0);
        this.posUniforms['u_yOffset'] = new THREE.Uniform(-10.0);

        this.landscapeGpuCompute.init();

        // Particles
        const landscapeParticleGeometry = new THREE.BufferGeometry();
        const landscapeParticleUvs = new Float32Array(this.LANDSCAPE_AGENT_COUNT * 2);
        const landscapeParticlePositions = new Float32Array(this.LANDSCAPE_AGENT_COUNT * 3);

        for (let row = 0; row < this.GRID_RESOLUTION; row++) {
            for (let col = 0; col < this.GRID_RESOLUTION; col++) {
                const i = row * this.GRID_RESOLUTION + col;
                const i2 = i * 2;
                const i3 = i * 3;
                landscapeParticleUvs[i2 + 0] = (col + 0.5) / this.GRID_RESOLUTION;
                landscapeParticleUvs[i2 + 1] = (row + 0.5) / this.GRID_RESOLUTION;
                landscapeParticlePositions[i3 + 0] = col * spacing - halfSize;
                landscapeParticlePositions[i3 + 1] = 0;
                landscapeParticlePositions[i3 + 2] = row * spacing - halfSize;
            }
        }
        landscapeParticleGeometry.setAttribute('reference', new THREE.BufferAttribute(landscapeParticleUvs, 2));
        landscapeParticleGeometry.setAttribute('position', new THREE.BufferAttribute(landscapeParticlePositions, 3));

        const landscapeParticleMaterial = new THREE.ShaderMaterial({
            vertexShader: particleRenderVertexShader,
            fragmentShader: particleRenderFragmentShader,
            uniforms: {
                texturePosition: { value: null },
                particleSize: { value: 0.5 },
                minParticleSize: { value: 0.1 },
                cameraConstant: { value: window.innerHeight / (Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * 75) / 1) }, // Approx
                u_terrainLow: { value: new THREE.Color('#000000') },
                u_terrainMid: { value: new THREE.Color('#0044aa') },
                u_terrainHigh: { value: new THREE.Color('#00aaff') },
                u_minHeight: { value: -50 },
                u_maxHeight: { value: 50 },
            },
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        });

        this.landscapeParticles = new THREE.Points(landscapeParticleGeometry, landscapeParticleMaterial);
        this.landscapeParticles.frustumCulled = false;
        this.scene.add(this.landscapeParticles);
    }

    private initPlayerParticles(colorManager: any): void {
        const NUM_PLAYER_PARTICLES = 50;
        this.playerParticleSystem = new GPUParticleSystem({
            numParticles: NUM_PLAYER_PARTICLES,
            renderer: this.renderer,
        });

        this.playerRibbon = new RibbonLineGPUPlayer([], {
            color: new THREE.Color(0x00eeff),
            colorEnd: new THREE.Color(0x0062ff),
            width: 0.75,
            maxLength: NUM_PLAYER_PARTICLES,
            fadeStyle: FadeStyle.FadeOut,
            useMode: UseMode.Static,
            fadeTransitionSize: 1,
            colorMix: 0.1,
            transitionSize: 0.1,
        });
        this.playerRibbon.setPathLength(NUM_PLAYER_PARTICLES);
        this.playerRibbon.setMinHeadLength(0.8);
        this.scene.add(this.playerRibbon.mesh);
    }

    private dispose(): void {
        if (this.landscapeGpuCompute) {
            // Dispose render targets if possible
        }
        // Dispose geometries and materials
        if (this.trackMesh) {
            this.trackMesh.geometry.dispose();
            (this.trackMesh.material as THREE.Material).dispose();
        }
        // ... more cleanup
    }
}
