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

    private waypointContentManager!: WaypointContentManager;

    private progressMarker!: THREE.Mesh;
    private trackLine!: THREE.Line;

    private waypointContentEditorUI!: WaypointContentEditorUI;
    private waypoints: WaypointContentData[] = [];
    private masterProgress: number = 0;

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

        // Create Progress Marker
        this.createProgressMarker();

        // Setup Waypoint Content Manager
        this.setupWaypointContentManager();



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


    }

    private createProgressMarker(): void {
        const geometry = new THREE.BoxGeometry(2, 2, 4);
        const material = new THREE.MeshStandardMaterial({ color: 0x00aaff });
        this.progressMarker = new THREE.Mesh(geometry, material);
        this.scene.add(this.progressMarker);

        // Position marker at start
        this.updateMarkerPosition(0);
    }

    private setupWaypointContentManager(): void {
        this.waypointContentManager = new WaypointContentManager(this.scene, this.pathController);
    }

    private addWaypoint(): void {
        const newWaypoint: WaypointContentData = {
            id: `waypoint_${this.waypoints.length}`,
            trackProgress: this.masterProgress,
            disappearProgress: this.masterProgress + 0.1, // Default disappear after 10% of the track
            screens: [
                {
                    id: `screen_${this.waypoints.length}`,
                    trigger: 'manual',
                    elements: [
                        {
                            id: `text_${this.waypoints.length}`,
                            type: 'text',
                            content: 'New Waypoint',
                            transform: {
                                position: { x: 0, y: 5, z: 0 },
                                rotation: { x: 0, y: 0, z: 0 },
                                scale: { x: 1, y: 1, z: 1 }
                            }
                        }
                    ],
                    enterTransition: { type: 'fade', duration: 0.5, easing: 'power2.out' },
                    exitTransition: { type: 'fade', duration: 0.5, easing: 'power2.in' }
                }
            ]
        };

        this.waypoints.push(newWaypoint);
        this.waypointContentManager.addWaypoint(newWaypoint);
        this.waypointContentManager.currentlyEditingId = newWaypoint.id;

        // Update editor to point to the new waypoint
        if (this.waypointContentEditorUI) {
            this.waypointContentEditorUI.destroy();
        }
        this.waypointContentEditorUI = new WaypointContentEditorUI(newWaypoint, this.waypointContentManager);
    }

    private setupGUI(): void {
        const params = {
            masterProgress: this.masterProgress,
            addWaypoint: () => this.addWaypoint(),
            resetPosition: () => {
                this.masterProgress = 0;
                this.updateMarkerPosition(0);
                this.gui.controllers[0].setValue(0);
            }
        };

        this.gui.add(params, 'masterProgress', 0, 1, 0.001).name('Master Progress').onChange((value: number) => {
            this.masterProgress = value;
            this.updateMarkerPosition(value);
        });

        this.gui.add(params, 'resetPosition').name('Reset Position');

        this.gui.add(params, 'addWaypoint').name('Add Waypoint');
    }

    private updateMarkerPosition(progress: number): void {
        const point = this.pathController.getPointAt(progress);
        this.progressMarker.position.copy(point);
        const tangent = this.pathController.getTangentAt(progress);
        this.progressMarker.lookAt(point.add(tangent));
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        const deltaTime = this.clock.getDelta();

        // Update camera to look at the center of the scene
        this.camera.lookAt(0, 0, 0);

        // Update Waypoint Content Manager
        this.waypointContentManager.update(deltaTime, this.clock.elapsedTime, this.masterProgress);

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


