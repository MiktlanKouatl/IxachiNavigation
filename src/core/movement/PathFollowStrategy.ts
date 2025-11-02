import * as THREE from 'three';
import { IMovementStrategy } from './IMovementStrategy';
import { PathFollower } from '../pathing/PathFollower';

/**
 * A movement strategy that makes the target follow a PathFollower.
 */
export class PathFollowStrategy implements IMovementStrategy {
    private pathFollower: PathFollower;

    constructor(pathFollower: PathFollower) {
        this.pathFollower = pathFollower;
        console.log('🛤️ [PathFollowStrategy] Instantiated.');
    }

    public update(target: THREE.Object3D, deltaTime: number): void {
        // The PathFollower is updated separately by the chapter, 
        // so here we just sync the target's position.
        target.position.copy(this.pathFollower.position);
    }
}
