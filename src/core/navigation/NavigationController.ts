import * as THREE from 'three';
import { PathData } from '../pathing/PathData';
import { PathFollower } from '../pathing/PathFollower';
import { ScrollData } from '../../managers/ScrollManager';
import { NavigationIntersection, NavigationChoice } from './NavigationModel';
import { EventEmitter } from '../EventEmitter';

export enum NavigationState {
    NAVIGATING,
    AT_INTERSECTION,
}

interface NavigationOptions {
    scrollSensitivity?: number;
    intersectionThreshold?: number;
}

export class NavigationController extends EventEmitter {
    private cameraTarget: THREE.Object3D;
    private lookAtTarget: THREE.Object3D;
    private pathFollower: PathFollower | null = null;
    private progress: number = 0;
    private scrollSensitivity: number;
    private intersectionThreshold: number;

    // Navigation Map
    private paths: Map<string, PathData> = new Map();
    private intersections: Map<string, NavigationIntersection[]> = new Map();
    private currentPathId: string | null = null;
    private activeIntersection: NavigationIntersection | null = null;

    public state: NavigationState = NavigationState.NAVIGATING;

    constructor(cameraTarget: THREE.Object3D, lookAtTarget: THREE.Object3D, options: NavigationOptions = {}) {
        super();
        this.cameraTarget = cameraTarget;
        this.lookAtTarget = lookAtTarget;
        this.scrollSensitivity = options.scrollSensitivity ?? 0.0001;
        this.intersectionThreshold = options.intersectionThreshold ?? 0.02;
    }

    public addPath(id: string, path: PathData, intersections: NavigationIntersection[] = []): void {
        this.paths.set(id, path);
        if (intersections.length > 0) {
            this.intersections.set(id, intersections);
        }
    }

    public setPath(pathId: string, initialProgress: number = 0): void {
        const path = this.paths.get(pathId);
        if (!path) {
            console.error(`[NavigationController] Path with id '${pathId}' not found.`);
            return;
        }
        this.currentPathId = pathId;
        this.pathFollower = new PathFollower(path, { loop: path.curve.closed });
        this.progress = initialProgress;
        this.pathFollower.seek(this.progress);
        this.state = NavigationState.NAVIGATING;
        this.activeIntersection = null;
        this.update();
        console.log(`🗺️ [NavigationController] Set path to '${pathId}'.`);
    }

    public handleScroll(scrollData: ScrollData): void {
        if (!this.pathFollower) return;

        if (this.state === NavigationState.NAVIGATING) {
            // Invert Y-axis: scrolling down (positive deltaY) should move forward (increase progress)
            const deltaProgress = -scrollData.deltaY * this.scrollSensitivity;
            this.progress += deltaProgress;
            this.progress = Math.max(0, Math.min(1, this.progress)); // Clamp
            this.pathFollower.seek(this.progress);
            this.checkForIntersection();
        } else if (this.state === NavigationState.AT_INTERSECTION) {
            // Use horizontal scroll for choices
            if (Math.abs(scrollData.deltaX) > Math.abs(scrollData.deltaY)) {
                // Invert X-axis: positive deltaX (scrolling right) should be 'right'
                const direction = scrollData.deltaX > 0 ? 'right' : 'left';
                this.makeChoice(direction);
            }
        }
    }

    private checkForIntersection(): void {
        const pathIntersections = this.intersections.get(this.currentPathId!);
        if (!pathIntersections) return;

        for (const intersection of pathIntersections) {
            const dist = Math.abs(this.progress - intersection.progress);
            if (dist < (intersection.threshold ?? this.intersectionThreshold)) {
                this.state = NavigationState.AT_INTERSECTION;
                this.activeIntersection = intersection;
                this.emit('intersectionReached', intersection);
                console.log('📍 [NavigationController] Reached intersection.');
                return;
            }
        }
    }

    private makeChoice(direction: 'left' | 'right'): void {
        if (!this.activeIntersection) return;

        const choice = this.activeIntersection.choices.find(c => c.direction === direction);
        if (choice) {
            console.log(`chose: ${direction}`);
            this.emit('transitionRequested', choice.transitionChapterId, choice.targetPathId);
            this.activeIntersection = null;
            // State will be reset when setPath is called after transition
        }
    }

    public update(): void {
        if (!this.pathFollower) return;

        // Logic to exit intersection state if we scroll away
        if (this.state === NavigationState.AT_INTERSECTION && this.activeIntersection) {
            const dist = Math.abs(this.progress - this.activeIntersection.progress);
            if (dist > (this.activeIntersection.threshold ?? this.intersectionThreshold)) {
                console.log('🗺️ [NavigationController] Left intersection.');
                this.state = NavigationState.NAVIGATING;
                this.activeIntersection = null;
                this.emit('intersectionExited');
            }
        }

        const newPosition = this.pathFollower.getPosition();
        this.cameraTarget.position.copy(newPosition);

        const lookAheadProgress = (this.progress + 0.01) % 1;
        const target = this.pathFollower.pathData.curve.getPointAt(lookAheadProgress);
        this.lookAtTarget.position.copy(target);
    }
}
