import { IAnimationChapter } from "../../animation/IAnimationChapter";
import { AnimationDirector } from "../../animation/AnimationDirector";
import { AnimationTargets } from "../../animation/AnimationTargets";
import * as THREE from 'three';
import { gsap } from 'gsap';
import { PlayerController } from "../../controls/PlayerController";

export class CreativeUniverseChapterTest implements IAnimationChapter {
    private scene: THREE.Scene | null = null;
    private camera: THREE.Camera | null = null;
    private playerController: PlayerController | null = null;
    private animationFrameId: number | null = null;
    private playerDebugMesh: THREE.Object3D | null = null;
        private cameraRig: THREE.Object3D | null = null; // The new camera rig
        private logoContainer: THREE.Group | null = null;
        private clock: THREE.Clock = new THREE.Clock();
        private frameCounter: number = 0;
    
    
        public start(director: AnimationDirector, targets: AnimationTargets): Promise<void> {
            return new Promise(resolve => {
                console.log('🌌 CreativeUniverseChapterTest with Free-Flight Controller started');
                this.scene = targets.scene;
                this.camera = targets.camera;
    
                // --- Camera Intro Animation ---
                const cameraPivot = new THREE.Group();
                this.scene.add(cameraPivot);
                cameraPivot.add(this.camera);
                this.camera.position.set(0, 0, 20);
                cameraPivot.rotation.set(0, 0, 0);
    
                gsap.to(cameraPivot.rotation, {
                    x: Math.PI / 2,
                    duration: 4.0,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        console.log('Intro animation finished. Initializing free-flight controls.');
                        this.scene?.attach(this.camera!); 
                        this.scene?.remove(cameraPivot);
                        this.startInteractiveSession();
                        resolve();
                    }
                });
            });
        }
    
        private startInteractiveSession(): void {
            if (!this.scene || !this.camera) return;
    
            // Add a starfield for visual reference
            const starGeometry = new THREE.BufferGeometry();
            const starVertices = [];
            for (let i = 0; i < 10000; i++) {
                const x = THREE.MathUtils.randFloatSpread(2000);
                const y = THREE.MathUtils.randFloatSpread(2000);
                const z = THREE.MathUtils.randFloatSpread(2000);
                starVertices.push(x, y, z);
            }
            starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
            const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.0 });
            const stars = new THREE.Points(starGeometry, starMaterial);
            this.scene.add(stars);
    
            // 1. Create the player controller
            this.playerController = new PlayerController();
            this.playerController.position.set(0, 2, -10); // Start a bit further back
    
            // 2. Create and configure the Camera Rig
            this.cameraRig = new THREE.Object3D();
            this.cameraRig.position.copy(this.playerController.position);
            this.cameraRig.quaternion.copy(this.playerController.orientation);
            this.scene.add(this.cameraRig);
    
            // 3. Parent the camera to the rig and set its local offset
            this.cameraRig.add(this.camera);
            this.camera.position.set(0, 4, 14); // Offset from the rig
            this.camera.lookAt(this.cameraRig.position); // Look at the center of the rig
    
            // Create a debug mesh to visualize the controller's orientation
            this.playerDebugMesh = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 3),
                new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true })
            );
            const axesHelper = new THREE.AxesHelper(5);
            this.playerDebugMesh.add(axesHelper);
            this.scene.add(this.playerDebugMesh);
    
            // 4. Start the update loop
            this.clock.start();
            console.log("Time, P.x, P.z, P.qy, P.qw, R.x, R.z, R.qy, R.qw"); // Log header
    
            const update = () => {
                const deltaTime = this.clock.getDelta();
                this.playerController?.update(deltaTime);
    
                if (this.playerDebugMesh && this.playerController) {
                    this.playerDebugMesh.position.copy(this.playerController.position);
                    this.playerDebugMesh.quaternion.copy(this.playerController.orientation);
                }
    
                this.updateChaseCamera(deltaTime);
                this.animationFrameId = requestAnimationFrame(update);
            };
            update();
        }
    
        private updateChaseCamera(deltaTime: number): void {
            if (!this.cameraRig || !this.playerController) return;
    
            const positionDamping = 5.0;
            const rotationDamping = 4.0;
    
            // Smoothly move the rig to the player's position
            this.cameraRig.position.lerp(
                this.playerController.position, 
                1.0 - Math.exp(-positionDamping * deltaTime)
            );
    
            // Smoothly rotate the rig to the player's orientation
            this.cameraRig.quaternion.slerp(
                this.playerController.orientation, 
                1.0 - Math.exp(-rotationDamping * deltaTime)
            );
    
            // --- SEQUENTIAL LOGGING ---
            this.frameCounter++;
            if (this.frameCounter % 10 === 0) { // Log every 10 frames
                const p = this.playerController.position;
                const pq = this.playerController.orientation;
                const r = this.cameraRig.position;
                const rq = this.cameraRig.quaternion;
                
                const log = [
                    this.clock.getElapsedTime().toFixed(2),
                    p.x.toFixed(2), p.z.toFixed(2),
                    pq.y.toFixed(2), pq.w.toFixed(2),
                    r.x.toFixed(2), r.z.toFixed(2),
                    rq.y.toFixed(2), rq.w.toFixed(2)
                ].join(', ');
        
                console.log(log);
            }
        }
    
        public stop(): void {
            console.log('Stopping CreativeUniverseChapterTest');
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
            this.playerController?.dispose();
            // Clean up scene objects
            if (this.scene) {
                if (this.playerDebugMesh) this.scene.remove(this.playerDebugMesh);
                if (this.cameraRig) {
                    // Before removing the rig, re-parent the camera to the scene
                    // to avoid it being disposed along with the rig.
                    this.scene.attach(this.camera!);
                    this.scene.remove(this.cameraRig);
                }
                if (this.logoContainer) this.scene.remove(this.logoContainer);
            }
        }
    }
