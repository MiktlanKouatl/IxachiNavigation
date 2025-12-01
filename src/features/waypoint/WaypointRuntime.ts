import * as THREE from 'three';
import { WaypointContentData, ScreenData } from './types/WaypointContentData';
import { IBehaviorModule } from './types/IBehaviorModule';
import { ElementFactory } from './ElementFactory';
import { EventEmitter } from '../../core/EventEmitter';
import { PathController } from '../../core/pathing/PathController';
import { WaypointAnimationManager } from './WaypointAnimationManager';
import { SectionRegistry } from '../sections/SectionRegistry';

/**
 * Manages the runtime lifecycle of a SINGLE active waypoint.
 * Handles its anchor, elements, screens, and behavior updates.
 */
export class WaypointRuntime {
    public id: string;
    public data: WaypointContentData;
    public active: boolean = false;

    private scene: THREE.Scene;
    private pathController: PathController;
    private anchor: THREE.Group;
    private elementFactory: ElementFactory;
    private activeBehaviors: IBehaviorModule[] = [];
    private animationManager: WaypointAnimationManager | null = null;

    private currentScreenIndex: number = -1;
    private activeScreen: ScreenData | null = null;
    private currentScreenId: string | null = null;
    private createdElements: Map<string, THREE.Object3D> = new Map();

    // Resolved data (either from section or inline)
    private screens: ScreenData[] = [];
    private animationConfig?: WaypointAnimationConfig;

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

        // Resolve content (Section vs Inline)
        if (this.data.sectionId) {
            const section = SectionRegistry.get(this.data.sectionId);
            if (section) {
                this.screens = section.screens;
                this.animationConfig = section.animations;
            } else {
                console.warn(`[WaypointRuntime] Section '${this.data.sectionId}' not found. Fallback to inline data.`);
                this.screens = this.data.screens || [];
                this.animationConfig = this.data.animations;
            }
        } else {
            this.screens = this.data.screens || [];
            this.animationConfig = this.data.animations;
        }

        // Create anchor for this specific waypoint
        this.anchor = new THREE.Object3D();
        this.scene.add(this.anchor);

        // Create a dedicated factory for this waypoint's elements
        this.elementFactory = new ElementFactory(this.anchor, onLogicAction);

        // Initialize
        this.activate();
    }

    public activate(): void {
        this.active = true;
        this.anchor.visible = true;
        console.log(`[WaypointRuntime] Activating ${this.id}`);

        // Load initial screen (if any)
        if (this.screens.length > 0) {
            this.showScreen(this.screens[0].id);
        }

        // Initialize Animation Manager
        if (this.animationConfig) {
            // Pass the map of created objects to the animation manager
            const objectsMap = this.elementFactory.getElementMap();
            // We need to filter or scope this map to only objects created by THIS waypoint?
            // Currently ElementFactory map is global or per-session? 
            // ElementFactory seems to be shared. 
            // Ideally we should only pass the objects belonging to this waypoint.
            // But for now, passing the global map works if IDs are unique.

            // Better approach: filter createdElements by this waypoint's elements
            // But createdElements is private to this class and populated in showScreen -> createElements
            // So we need to ensure elements are created BEFORE initializing animation manager.

            // Since showScreen is called above, elements for the first screen are created.
            // However, animations might target elements in other screens? 
            // Assuming single screen for now or that all animatable elements are present.

            // Let's use the local createdElements map if possible, but ElementFactory creates them.
            // We need to capture them. 

            // Actually, ElementFactory adds to the scene/anchor. 
            // We need a way to get the specific objects for this waypoint.
            // Let's rely on unique IDs for now as per current design.

            this.animationManager = new WaypointAnimationManager(this.animationConfig, objectsMap);
            this.animationManager.enter();
        }
    }

    public update(deltaTime: number, time: number, trackProgress: number): void {
        // Keep anchor pinned to the track (optional, usually static for a waypoint, but good if we want it to move)
        // For now, we assume waypoints are static on the track, so we might not need to update position every frame
        // UNLESS we want it to slide with the player? No, waypoints are usually fixed.
        // BUT, the original code updated it every frame. Let's keep it for safety or if we add "moving waypoints".

        if (this.data.behavior === 'follow_player') {
            this.updateAnchorPosition(trackProgress);
        } else {
            // Ensure it stays at its start position (in case it was moved or just initialized)
            // We can optimize this by checking a dirty flag, but for now this ensures correctness.
            this.updateAnchorPosition(this.data.trackProgress);
        }

        this.activeBehaviors.forEach(b => b.update(deltaTime, time));

        // Update Animation Manager
        if (this.animationManager) {
            // Calculate local progress (0.0 to 1.0) within the waypoint's range
            const range = this.data.disappearProgress - this.data.trackProgress;
            if (range > 0) {
                const localProgress = (trackProgress - this.data.trackProgress) / range;
                this.animationManager.update(localProgress);
            }
        }

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

    private showScreen(screenId: string): void {
        const screen = this.screens.find(s => s.id === screenId);
        if (!screen) {
            console.warn(`[WaypointRuntime] Screen '${screenId}' not found.`);
            return;
        }

        console.log(`[WaypointRuntime:${this.id}] Transitioning to Screen '${screenId}'.`);

        // Clear previous elements if any (simple approach for now)
        // Ideally we should dispose them properly
        if (this.activeScreen) {
            const elementsToDispose = this.activeScreen.elements;
            this.elementFactory.disposeElements(elementsToDispose);
        }

        this.activeScreen = screen;
        this.currentScreenId = screenId;
        this.loadScreenElements(screen);
    }

    private playNextScreen(): void {
        this.currentScreenIndex++;
        const nextScreen = this.screens[this.currentScreenIndex];

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

        // Dispose animation manager
        if (this.animationManager) {
            this.animationManager.exit(); // Trigger exit animation if any
            this.animationManager.dispose();
            this.animationManager = null;
        }

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
