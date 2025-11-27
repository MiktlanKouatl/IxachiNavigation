import * as THREE from 'three';
import { TrackBuilder } from '../../core/pathing/TrackBuilder';
import { PathController } from '../../core/pathing/PathController';
import { PathFollower } from '../../core/pathing/PathFollower';
import { WaypointContentManager } from '../../features/waypoint/WaypointContentManager';
import { WaypointContentData } from '../../features/waypoint/types/WaypointContentData';
import GUI from 'lil-gui';
import { WaypointContentEditorUI } from '../../ui/WaypointContentEditorUI';

/**
 * Scene 49: Waypoint Content Builder Test
 * 
 * Esta escena prueba el sistema de Waypoint Content Builder con:
 * - Un track simple con 4 elementos de contenido
 * - Elementos placeholder (cubos de colores)
 * - Triggers automáticos basados en progreso del track
 */
export class Scene49_WaypointContentBuilderTest {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;
    private gui: GUI;

    private trackBuilder!: TrackBuilder;
    private pathController!: PathController;
    private pathFollower!: PathFollower;
    private waypointContentManager!: WaypointContentManager;

    private player!: THREE.Mesh;
    private trackLine!: THREE.Line;

    private waypointContentEditorUI!: WaypointContentEditorUI;
    private speed: number = 0.05; // Velocidad de movimiento del jugador

    constructor() {
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 50, 100);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        // Build Track
        this.buildTrack();

        // Create Player
        this.createPlayer();

        // Setup Waypoint Content Manager
        this.setupWaypointContentManager();

        // Initialize WaypointContentEditorUI
        const testWaypointContents: WaypointContentData[] = [
            {
                id: 'editable_zone',
                trackProgress: 0.1, // Initial value
                screens: [
                    {
                        id: 'editor_screen',
                        trigger: 'manual', // Will be activated manually for editing
                        elements: [
                            {
                                id: 'editor_text_element',
                                type: 'text',
                                content: 'Hello Waypoint!',
                                transform: {
                                    position: { x: 0, y: 10, z: 0 },
                                    rotation: { x: 0, y: 0, z: 0 },
                                    scale: { x: 1, y: 1, z: 1 }
                                }
                            }
                        ],
                        enterTransition: { type: 'fade', duration: 0.5, easing: 'power2.out' },
                        exitTransition: { type: 'fade', duration: 0.5, easing: 'power2.in' }
                    }
                ]
            }
        ];
        this.waypointContentManager.loadSections(testWaypointContents); // Load the editable one

        // Editor for a single Waypoint Content
        const editableWaypointContent = testWaypointContents[0];
        this.waypointContentEditorUI = new WaypointContentEditorUI(editableWaypointContent, (updatedData) => {
            console.log('Waypoint Content Updated from Editor:', updatedData);
            // This is where you would typically trigger an update in the WaypointContentManager
            // For now, the WaypointContentManager will pick up changes on its next update cycle.
        });

        // GUI
        this.gui = new GUI();
        this.setupGUI();

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Start animation
        this.animate();
    }

    private buildTrack(): void {
        this.trackBuilder = new TrackBuilder();

        // Build a simple track with 4 zones
        this.trackBuilder
            .setStart(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1))
            .addOperation({ type: 'straight', length: 50 })
            .addSectionTrigger('zone_1') // Trigger at ~25% of track
            .addOperation({ type: 'turn', angle: 90, radius: 30 })
            .addSectionTrigger('zone_2') // Trigger at ~50% of track
            .addOperation({ type: 'straight', length: 50 })
            .addSectionTrigger('zone_3') // Trigger at ~75% of track
            .addOperation({ type: 'turn', angle: 90, radius: 30 })
            .addOperation({ type: 'straight', length: 50 })
            .addOperation({ type: 'turn', angle: 90, radius: 30 })
            .addOperation({ type: 'straight', length: 50 })
            .addOperation({ type: 'turn', angle: 90, radius: 30 });

        const curvePath = this.trackBuilder.build();
        this.pathController = new PathController(curvePath);

        // Visualize the track
        const points = curvePath.getPoints(200);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
        this.trackLine = new THREE.Line(geometry, material);
        this.scene.add(this.trackLine);

        // Visualize waypoint content triggers
        const triggers = this.trackBuilder.getSectionTriggers();
        console.log('[Scene49] Waypoint Content Triggers:', triggers);

        triggers.forEach(trigger => {
            const point = this.pathController.getPointAt(trigger.progress);
            const markerGeometry = new THREE.SphereGeometry(2, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.copy(point);
            this.scene.add(marker);
        });

        // PathFollower
        this.pathFollower = new PathFollower(this.pathController.getPathData());
    }

    private createPlayer(): void {
        const geometry = new THREE.BoxGeometry(2, 2, 4);
        const material = new THREE.MeshStandardMaterial({ color: 0x00aaff });
        this.player = new THREE.Mesh(geometry, material);
        this.scene.add(this.player);

        // Position player at start
        this.player.position.copy(this.pathFollower.position);
    }

    private setupWaypointContentManager(): void {
        this.waypointContentManager = new WaypointContentManager(this.scene, this.pathController);
    }

    private setupGUI(): void {
        const params = {
            speed: this.speed,
            resetPosition: () => {
                this.pathFollower.seek(0);
                this.player.position.copy(this.pathFollower.position);
            }
        };

        this.gui.add(params, 'speed', 0, 0.2).onChange((value: number) => {
            this.speed = value;
        });

        this.gui.add(params, 'resetPosition').name('Reset Position');
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        const deltaTime = this.clock.getDelta();

        // Update path follower
        this.pathFollower.update(deltaTime);
        this.player.position.copy(this.pathFollower.position);

        // Update camera to follow player
        this.camera.position.x = this.player.position.x;
        this.camera.position.z = this.player.position.z + 50;
        this.camera.lookAt(this.player.position);

        // Update Waypoint Content Manager
        const trackProgress = this.pathFollower.progress;
        this.waypointContentManager.update(deltaTime, this.clock.elapsedTime, trackProgress);

        this.renderer.render(this.scene, this.camera);
    };

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public dispose(): void {
        this.waypointContentEditorUI.destroy();
        this.gui.destroy();
        this.renderer.dispose();
        document.body.removeChild(this.renderer.domElement);
    }
}


