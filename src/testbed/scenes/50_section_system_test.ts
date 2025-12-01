import * as THREE from 'three';
import { PathData } from '../../core/pathing/PathData';
import { PathController } from '../../core/pathing/PathController';
import { CatmullRomCurve3 } from 'three';
import { WaypointContentManager } from '../../features/waypoint/WaypointContentManager';
import { ElementFactory } from '../../features/waypoint/ElementFactory';
import { SectionBuilder } from '../../features/sections/SectionBuilder';
import { SectionRegistry } from '../../features/sections/SectionRegistry';
import { WaypointContentData } from '../../features/waypoint/types/WaypointContentData';

export class Scene50_SectionSystemTest {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;

    private pathData: PathData | null = null;
    private pathController: PathController | null = null;
    private waypointContentManager: WaypointContentManager | null = null;
    private elementFactory: ElementFactory | null = null;
    private clock: THREE.Clock = new THREE.Clock();
    private simulatorProgress: number = 0;
    private simulatorSpeed: number = 0.05; // Speed of the simulator
    private isSimulating: boolean = true;

    // Visuals
    private ribbonMesh: THREE.Mesh | null = null;
    private simulatorMesh: THREE.Mesh | null = null;

    private renderer: THREE.WebGLRenderer;

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    public async init(): Promise<void> {
        console.log('[Scene50] Initializing Section System Test...');

        // 1. Create Path and Controller
        this.createPath();

        // 2. Initialize Managers
        this.elementFactory = new ElementFactory(this.scene);

        if (this.pathController) {
            this.waypointContentManager = new WaypointContentManager(this.scene, this.pathController);
        }

        // 3. Define and Register Sections
        this.registerSections();

        // 4. Create Waypoints using Sections
        this.createWaypoints();

        // 5. Setup Simulator Visuals
        this.createSimulatorVisuals();

        // 6. Setup Camera
        this.camera.position.set(0, 50, 50);
        this.camera.lookAt(0, 0, 0);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        // Start Loop
        this.animate();
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }

    private createPath(): void {
        const points = [
            new THREE.Vector3(-50, 0, -50),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(50, 0, 50),
            new THREE.Vector3(100, 0, 0),
            new THREE.Vector3(50, 0, -50)
        ];
        const curve = new CatmullRomCurve3(points);

        // Initialize PathController with the curve
        // Note: PathController expects CurvePath but we pass Curve (which works if casted or compatible)
        // We cast to any to avoid strict type mismatch if CurvePath is expected
        this.pathController = new PathController(curve as any);
        this.pathData = this.pathController.getPathData();

        // Visual Ribbon
        const geometry = new THREE.TubeGeometry(curve, 100, 2, 8, false);
        const material = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
        this.ribbonMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.ribbonMesh);
    }

    private registerSections(): void {
        console.log('[Scene50] Registering Sections...');

        // Section 1: Welcome Sign (Triggered Animation)
        const welcomeSection = new SectionBuilder('welcome_section')
            .addScreen('main')
            .addText('title', 'WELCOME', { x: 0, y: 5, z: 0 }, { fontSize: 2, color: '#00ff00' })
            .setAnimationMode('trigger', 'reverse')
            .addAnimation({
                targetId: 'title',
                method: 'from',
                props: { y: 10, opacity: 0 },
                duration: 1
            })
            .build();

        SectionRegistry.register(welcomeSection);

        // Section 2: Hazard Warning (Scrubbing Animation)
        const hazardSection = new SectionBuilder('hazard_section')
            .addScreen('main')
            .addModel('cube', 'cube', { x: 0, y: 2, z: 0 }, { scale: 1, color: '#ff0000' }) // Using primitive cube for test
            .setAnimationMode('scrub')
            .addAnimation({
                targetId: 'cube',
                props: { scale: 3, rotationY: Math.PI * 2 },
                duration: 1 // Full duration of the waypoint range
            })
            .build();

        SectionRegistry.register(hazardSection);
    }

    private createWaypoints(): void {
        console.log('[Scene50] Creating Waypoints...');

        // Waypoint 1: Uses Welcome Section at start
        const wp1: WaypointContentData = {
            id: 'wp_start',
            trackProgress: 0.1,
            disappearProgress: 0.2,
            sectionId: 'welcome_section'
        };
        this.waypointContentManager?.addWaypoint(wp1);

        // Waypoint 2: Uses Hazard Section in middle
        const wp2: WaypointContentData = {
            id: 'wp_hazard',
            trackProgress: 0.4,
            disappearProgress: 0.6,
            sectionId: 'hazard_section'
        };
        this.waypointContentManager?.addWaypoint(wp2);

        // Waypoint 3: Reuses Welcome Section at end
        const wp3: WaypointContentData = {
            id: 'wp_end',
            trackProgress: 0.8,
            disappearProgress: 0.9,
            sectionId: 'welcome_section'
        };
        this.waypointContentManager?.addWaypoint(wp3);
    }

    private createSimulatorVisuals(): void {
        const geometry = new THREE.SphereGeometry(1, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.simulatorMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.simulatorMesh);
    }

    public update(): void {
        const dt = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        if (this.isSimulating && this.pathData && this.pathController) {
            this.simulatorProgress += this.simulatorSpeed * dt;
            if (this.simulatorProgress > 1) this.simulatorProgress = 0;

            // Update Simulator Position
            // Use pathController or direct curve access
            const point = this.pathController.getPointAt(this.simulatorProgress);
            if (this.simulatorMesh) {
                this.simulatorMesh.position.copy(point);
            }

            // Update Waypoint Manager
            this.waypointContentManager?.update(dt, time, this.simulatorProgress);
        }
    }

    public dispose(): void {
        console.log('[Scene50] Disposing...');
        this.waypointContentManager?.dispose();
        SectionRegistry.clear();
    }

    public getScene(): THREE.Scene {
        return this.scene;
    }

    public getCamera(): THREE.Camera {
        return this.camera;
    }
}
