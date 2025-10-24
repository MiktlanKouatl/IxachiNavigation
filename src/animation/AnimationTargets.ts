import * as THREE from 'three';
import { PathFollower } from "../core/pathing/PathFollower";
import { RibbonLine } from '../core/RibbonLine';
import { ProgressUI } from '../ui/ProgressUI';

/**
 * Defines the shared object of all animatable targets in the experience.
 * This object is passed to each animation chapter.
 */
export interface AnimationTargets {
    camera: THREE.PerspectiveCamera;
    hostFollower: PathFollower;
    hostSourceObject: THREE.Object3D;
    hostRibbon: RibbonLine; // Added hostRibbon
    progressCircle: RibbonLine;
    progressUI: ProgressUI;
}
