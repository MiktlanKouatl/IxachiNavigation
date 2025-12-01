import * as THREE from 'three';
import { WaypointContentData } from './types/WaypointContentData';
import { EventEmitter } from '../../core/EventEmitter';
import { PathController } from '../../core/pathing/PathController';
import { WaypointRuntime } from './WaypointRuntime';

/**
 * Clase central que gestiona la carga, activación, y el ciclo de vida 
 * de los Waypoint Content y las Screens. Es el motor en tiempo de ejecución.
 * 
 * [REFACTORED] Now supports multiple concurrent waypoints via WaypointRuntime.
 */
export class WaypointContentManager {
    // Evento que se dispara cuando una interacción de un nodo de lógica ocurre
    public onLogicAction = new EventEmitter();

    private scene: THREE.Scene;
    private pathController: PathController;
    private allSections: Map<string, WaypointContentData> = new Map();

    // Map of active runtimes: ID -> Runtime Instance
    private activeWaypoints: Map<string, WaypointRuntime> = new Map();

    public currentlyEditingId: string | null = null;
    private markerGroup: THREE.Group = new THREE.Group();
    private markers: Map<string, THREE.Object3D> = new Map();

    constructor(scene: THREE.Scene, pathController: PathController) {
        this.scene = scene;
        this.pathController = pathController;
        this.scene.add(this.markerGroup);
    }

    /**
     * Carga el JSON con la configuración de todos los elementos de contenido.
     */
    public loadWaypoints(waypointContents: WaypointContentData[]): void {
        waypointContents.forEach(waypointContent => {
            this.addWaypoint(waypointContent);
        });
        console.log(`[WaypointContentManager] Cargados ${waypointContents.length} elementos de contenido.`);
    }

    public addWaypoint(waypointContent: WaypointContentData): void {
        this.allSections.set(waypointContent.id, waypointContent);
        this.createMarker(waypointContent);
    }

    private createMarker(waypoint: WaypointContentData): void {
        const markerGeometry = new THREE.SphereGeometry(1, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);

        const point = this.pathController.getPointAt(waypoint.trackProgress);
        marker.position.copy(point);
        marker.userData.waypointId = waypoint.id;

        this.markerGroup.add(marker);
        this.markers.set(waypoint.id, marker);
    }

    private forceShowEditing: boolean = false;

    /**
     * Activa el modo edición para un waypoint específico.
     * Esto fuerza la visualización del contenido independientemente del progreso del track.
     */
    public startEditing(id: string): void {
        this.currentlyEditingId = id;
        this.forceShowEditing = true;

        // In edit mode, we clear everything else and just show this one
        this.disposeAll();

        const waypoint = this.allSections.get(id);
        if (waypoint) {
            this.activateWaypoint(waypoint);
        }
    }

    /**
     * Activa el modo simulación.
     * El contenido solo se mostrará si el progreso del track está dentro del rango.
     */
    public startSimulation(): void {
        this.forceShowEditing = false;
        // We don't necessarily need to clear everything, the update loop will handle it
    }

    private previousProgress: number = -1;

    /**
     * Bucle principal: verifica triggers y actualiza lógica.
     */
    public update(deltaTime: number, time: number, trackProgress: number): void {
        if (this.previousProgress === -1) {
            this.previousProgress = trackProgress;
        }

        // EDIT MODE LOGIC
        if (this.forceShowEditing && this.currentlyEditingId) {
            const runtime = this.activeWaypoints.get(this.currentlyEditingId);
            if (runtime) {
                runtime.update(deltaTime, time, trackProgress);
            } else {
                // Should be active but isn't (maybe just switched to edit mode)
                const waypoint = this.allSections.get(this.currentlyEditingId);
                if (waypoint) {
                    this.activateWaypoint(waypoint);
                }
            }
            return;
        }

        // SIMULATION MODE LOGIC
        // Check ALL waypoints to see if they should be active
        for (const waypointContent of this.allSections.values()) {
            const isInRange = trackProgress >= waypointContent.trackProgress && trackProgress < waypointContent.disappearProgress;
            const isActive = this.activeWaypoints.has(waypointContent.id);

            if (isInRange) {
                if (!isActive) {
                    // Enter range -> Activate
                    this.activateWaypoint(waypointContent);
                } else {
                    // Already active -> Update
                    const runtime = this.activeWaypoints.get(waypointContent.id);
                    runtime?.update(deltaTime, time, trackProgress);
                }
            } else {
                if (isActive) {
                    // Exit range -> Dispose
                    this.disposeWaypoint(waypointContent.id);
                }
            }
        }

        this.previousProgress = trackProgress;
    }

    private activateWaypoint(data: WaypointContentData): void {
        if (this.activeWaypoints.has(data.id)) return;

        const runtime = new WaypointRuntime(this.scene, this.pathController, data, this.onLogicAction);
        this.activeWaypoints.set(data.id, runtime);
    }

    private disposeWaypoint(id: string): void {
        const runtime = this.activeWaypoints.get(id);
        if (runtime) {
            runtime.dispose();
            this.activeWaypoints.delete(id);
        }
    }

    public disposeAll(): void {
        this.activeWaypoints.forEach(runtime => runtime.dispose());
        this.activeWaypoints.clear();
    }

    public dispose(): void {
        this.disposeAll();
        this.scene.remove(this.markerGroup);
        this.markers.clear();
    }

    public updateWaypoint(waypointData: WaypointContentData): void {
        if (!this.allSections.has(waypointData.id)) return;
        this.allSections.set(waypointData.id, waypointData);

        // If it's active, we might need to refresh it. 
        // For simplicity, let's just dispose and let the next update loop recreate it if in range.
        if (this.activeWaypoints.has(waypointData.id)) {
            this.disposeWaypoint(waypointData.id);
        }

        const marker = this.markers.get(waypointData.id);
        if (marker) {
            const point = this.pathController.getPointAt(waypointData.trackProgress);
            marker.position.copy(point);
        }
    }

    public getMarkers(): THREE.Object3D[] {
        return this.markerGroup.children;
    }
}
