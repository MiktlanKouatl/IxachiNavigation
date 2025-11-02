import * as THREE from 'three';
import { PathFollower } from "../core/pathing/PathFollower";
import { RibbonLine } from '../core/RibbonLine';
import { ProgressUI } from '../ui/ProgressUI';
import { MovementController } from '../core/movement/MovementController';

/**
 * A collection of all objects that can be animated by the chapters.
 */
export interface AnimationTargets {
    // Core camera and scene
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;

    // Virtual camera targets for smooth movement
    cameraTarget: THREE.Object3D;
    lookAtTarget: THREE.Object3D;

    // Main animatable objects
    hostFollower: PathFollower;
    hostSourceObject: THREE.Object3D;
    hostRibbon: RibbonLine;
    movementController: MovementController;
    enableDrawing: () => void;

    // UI elements
    progressCircle: RibbonLine;
    progressUI: ProgressUI;
}
