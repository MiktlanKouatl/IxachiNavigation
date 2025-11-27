import * as THREE from 'three';
import { IMovementStrategy } from './IMovementStrategy';

/**
 * Manages and executes the active movement strategy.
 */
export class MovementController {
    private activeStrategy: IMovementStrategy | null = null;
    private currentForward: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
    private _tempPos: THREE.Vector3 = new THREE.Vector3();
    private _tempDiff: THREE.Vector3 = new THREE.Vector3();

    /**
     * Sets or changes the active movement strategy.
     * @param strategy The new strategy to use.
     */
    public setStrategy(strategy: IMovementStrategy | null): void {
        this.activeStrategy = strategy;
        console.log(`🧠 [MovementController] Strategy set to: ${strategy?.constructor.name || 'null'}`);
    }

    public getActiveStrategy(): IMovementStrategy | null {
        return this.activeStrategy;
    }

    public getForwardVector(): THREE.Vector3 {
        return this.currentForward;
    }

    /**
     * Executes the update method of the active strategy, if one is set.
     * @param target The object to be moved.
     * @param deltaTime Time since the last frame.
     * @param elapsedTime Total time elapsed.
     */
    public update(target: THREE.Object3D, deltaTime: number, elapsedTime: number): void {
        if (this.activeStrategy) {
            // 1. Capture position BEFORE update
            this._tempPos.copy(target.position);

            // 2. Run strategy
            this.activeStrategy.update(target, deltaTime, elapsedTime);

            // 3. Calculate displacement
            this._tempDiff.subVectors(target.position, this._tempPos);

            // 4. If moved enough, update forward vector
            if (this._tempDiff.lengthSq() > 0.000001) {
                this.currentForward.copy(this._tempDiff).normalize();
            }
        }
    }
}
