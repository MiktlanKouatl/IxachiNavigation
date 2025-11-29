import * as THREE from 'three';
import { WaypointContentData, ScreenData } from './types/WaypointContentData';
import { IBehaviorModule } from './types/IBehaviorModule';
import { ElementFactory } from './ElementFactory';
import { EventEmitter } from '../../core/EventEmitter';
import { PathController } from '../../core/pathing/PathController';

/**
 * Manages the runtime lifecycle of a SINGLE active waypoint.
 * Handles its anchor, elements, screens, and behavior updates.
 */
export class WaypointRuntime {
    public id: string;
    public data: WaypointContentData;

    private scene: THREE.Scene;
    private pathController: PathController;
    private anchor: THREE.Object3D;
    private elementFactory: ElementFactory;
    private activeBehaviors: IBehaviorModule[] = [];

    private currentScreenIndex: number = -1;
    private activeScreen: ScreenData | null = null;

    constructor(
        scene: THREE.Scene,
        pathController: PathController,
        data: WaypointContentData,
        onLogicAction: EventEmitter
    ) {
        this.scene = scene;
        this.pathController = pathController;
        this.data = data;
        this.id = data.id;

        // Create anchor for this specific waypoint
        this.anchor = new THREE.Object3D();
        this.scene.add(this.anchor);

        // Create a dedicated factory for this waypoint's elements
        this.elementFactory = new ElementFactory(this.anchor, onLogicAction);

        // Initialize
        this.activate();
    }

    private activate(): void {
        console.log(`[WaypointRuntime] Activating ${this.id}`);
        this.updateAnchorPosition(this.data.trackProgress);
        this.anchor.visible = true;
        this.playNextScreen();
    }

    public update(deltaTime: number, time: number, trackProgress: number): void {
        // Keep anchor pinned to the track (optional, usually static for a waypoint, but good if we want it to move)
        // For now, we assume waypoints are static on the track, so we might not need to update position every frame
        // UNLESS we want it to slide with the player? No, waypoints are usually fixed.
        // BUT, the original code updated it every frame. Let's keep it for safety or if we add "moving waypoints".
        this.updateAnchorPosition(this.data.trackProgress);

        this.activeBehaviors.forEach(b => b.update(deltaTime, time));

        // Debug info
        // console.log(`[WaypointRuntime:${this.id}] Children: ${this.anchor.children.length}`);
    }

    private updateAnchorPosition(progress: number): void {
        const point = this.pathController.getPointAt(progress);
        const tangent = this.pathController.getTangentAt(progress);

        this.anchor.position.copy(point);

        const m = new THREE.Matrix4();
        m.lookAt(point, point.clone().add(tangent), new THREE.Vector3(0, 1, 0));
        this.anchor.rotation.setFromRotationMatrix(m);
    }

    private playNextScreen(): void {
        this.currentScreenIndex++;
        const nextScreen = this.data.screens[this.currentScreenIndex];

        if (nextScreen) {
            this.activeScreen = nextScreen;
            console.log(`[WaypointRuntime:${this.id}] Transitioning to Screen '${nextScreen.id}'.`);
            this.loadScreenElements(nextScreen);
        }
    }

    private loadScreenElements(screen: ScreenData): void {
        screen.elements.forEach(data => {
            const element = this.elementFactory.createElement(data);

            if (data.type === 'logic') {
                const behaviorModule = element as IBehaviorModule;
                if (data.targetElementIds) {
                    const targetObjects = this.elementFactory.getSceneObjectsByIds(data.targetElementIds);
                    behaviorModule.init(data.config, targetObjects);
                } else {
                    behaviorModule.init(data.config, []);
                }
                this.activeBehaviors.push(behaviorModule);
            }
        });
    }

    public dispose(): void {
        console.log(`[WaypointRuntime] Disposing ${this.id}`);

        // Dispose behaviors
        this.activeBehaviors.forEach(b => b.dispose());
        this.activeBehaviors = [];

        // Dispose elements
        if (this.activeScreen) {
            const elementsToDispose = this.activeScreen.elements; // Only current screen for now
            this.elementFactory.disposeElements(elementsToDispose);
        }

        // Remove anchor
        this.scene.remove(this.anchor);

        // We don't dispose the factory itself, but we should ensure it cleans up references
    }
}
